import { CanvasCell, BoundingBox } from '@/types/canvas';
import { supabase, isSupabaseConfigured } from './supabase';
import { SEED_CELLS } from './seed-data';

const STORAGE_KEY = 'pixelverse_cells_v1';
const BROADCAST_CHANNEL_NAME = 'pixelverse_canvas_broadcast';

class CanvasStorageService {
  private localCells: Map<string, CanvasCell> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private changeListeners: Set<(cell: CanvasCell) => void> = new Set();
  private isInitialized = false;
  private totalCountCache: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'CELL_ADDED') {
            const cell = event.data.cell as CanvasCell;
            this.setLocalCell(cell);
            this.notifyListeners(cell);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported in this environment', err);
      }
    }
  }

  private cellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private setLocalCell(cell: CanvasCell) {
    this.localCells.set(this.cellKey(cell.x, cell.y), cell);
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // When Supabase is configured, Supabase is the single source of truth!
    // We intentionally DO NOT load stale localStorage or offline placeholders into memory.
    if (this.getIsSupabaseActive()) {
      // Clear legacy localStorage cache so stale offline slots don't linger
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
      return;
    }

    // Pure Offline Mode: load from LocalStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CanvasCell[] = JSON.parse(stored);
        parsed.forEach((c) => this.setLocalCell(c));
      }
    } catch (err) {
      console.warn('Failed to read from localStorage:', err);
    }

    // Pure Offline Mode: preload starter seed cells if empty
    SEED_CELLS.forEach((seed) => {
      const key = this.cellKey(seed.x, seed.y);
      if (!this.localCells.has(key)) {
        this.setLocalCell(seed);
      }
    });

    this.persistLocal();
  }

  private persistLocal() {
    if (typeof window === 'undefined' || this.getIsSupabaseActive()) return;
    try {
      const all = Array.from(this.localCells.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Failed to persist to localStorage:', err);
    }
  }

  public getIsSupabaseActive(): boolean {
    return isSupabaseConfigured && supabase !== null;
  }

  public subscribeToChanges(callback: (cell: CanvasCell) => void): () => void {
    this.changeListeners.add(callback);

    let supabaseUnsubscribe: (() => void) | null = null;

    const client = supabase;
    if (this.getIsSupabaseActive() && client) {
      const channel = client
        .channel('public:canvas_cells')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'canvas_cells' },
          (payload) => {
            const newCell = payload.new as CanvasCell;
            if (newCell) {
              this.setLocalCell(newCell);
              if (this.totalCountCache !== null) {
                this.totalCountCache += 1;
              }
              this.notifyListeners(newCell);
            }
          }
        )
        .subscribe();

      supabaseUnsubscribe = () => {
        client.removeChannel(channel);
      };
    }

    return () => {
      this.changeListeners.delete(callback);
      if (supabaseUnsubscribe) {
        supabaseUnsubscribe();
      }
    };
  }

  private notifyListeners(cell: CanvasCell) {
    this.changeListeners.forEach((fn) => {
      try {
        fn(cell);
      } catch (err) {
        console.error('Error in cell change listener:', err);
      }
    });
  }

  /**
   * Fetch cells within the viewport bounding box
   */
  public async getCellsInBounds(bounds: BoundingBox): Promise<CanvasCell[]> {
    this.init();

    if (this.getIsSupabaseActive() && supabase) {
      try {
        const { data, error } = await supabase
          .from('canvas_cells')
          .select('*')
          .gte('x', bounds.minX)
          .lte('x', bounds.maxX)
          .gte('y', bounds.minY)
          .lte('y', bounds.maxY)
          .limit(2000);

        if (!error && data) {
          data.forEach((c: CanvasCell) => this.setLocalCell(c));
          return data as CanvasCell[];
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
      }
      return [];
    }

    // Local / In-memory fallback (only used in pure offline mode)
    const result: CanvasCell[] = [];
    for (const cell of this.localCells.values()) {
      if (
        cell.x >= bounds.minX &&
        cell.x <= bounds.maxX &&
        cell.y >= bounds.minY &&
        cell.y <= bounds.maxY
      ) {
        result.push(cell);
      }
    }
    return result;
  }

  /**
   * Get single cell at coordinate (X, Y)
   */
  public async getCellAt(x: number, y: number): Promise<CanvasCell | null> {
    this.init();
    const key = this.cellKey(x, y);

    if (this.getIsSupabaseActive() && supabase) {
      if (this.localCells.has(key)) {
        return this.localCells.get(key) || null;
      }

      try {
        const { data, error } = await supabase
          .from('canvas_cells')
          .select('*')
          .eq('x', x)
          .eq('y', y)
          .maybeSingle();

        if (!error && data) {
          this.setLocalCell(data as CanvasCell);
          return data as CanvasCell;
        }
      } catch (err) {
        console.warn('Supabase getCellAt error:', err);
      }

      return null;
    }

    return this.localCells.get(key) || null;
  }

  /**
   * Claim and create a new cell at coordinate (X, Y)
   */
  public async saveCell(cell: CanvasCell): Promise<{ success: boolean; error?: string }> {
    this.init();
    const key = this.cellKey(cell.x, cell.y);

    if (this.getIsSupabaseActive() && supabase) {
      try {
        const { error } = await supabase.from('canvas_cells').insert({
          x: cell.x,
          y: cell.y,
          dominant_color: cell.dominant_color,
          vector_data: cell.vector_data,
          message_text: cell.message_text || null,
          author_name: cell.author_name || 'Anon Explorer',
        });

        if (error) {
          if (error.code === '23505') {
            return { success: false, error: `Koordinat (${cell.x}, ${cell.y}) sudah terisi di database!` };
          }
          return { success: false, error: error.message };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menyimpan ke database Supabase';
        return { success: false, error: message };
      }
    } else {
      // Pure Offline mode check
      if (this.localCells.has(key)) {
        return { success: false, error: `Koordinat (${cell.x}, ${cell.y}) sudah terisi!` };
      }
    }

    // Save to memory cache
    const finalCell: CanvasCell = {
      ...cell,
      created_at: cell.created_at || new Date().toISOString(),
    };
    this.setLocalCell(finalCell);
    if (this.totalCountCache !== null) {
      this.totalCountCache += 1;
    }

    // If pure offline mode, persist and broadcast
    if (!this.getIsSupabaseActive()) {
      this.persistLocal();
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'CELL_ADDED', cell: finalCell });
        } catch (e) {
          console.warn('Broadcast failed:', e);
        }
      }
    }

    // Notify listeners
    this.notifyListeners(finalCell);
    return { success: true };
  }

  /**
   * Search cells by message text or coordinate
   */
  public async searchCells(query: string): Promise<CanvasCell[]> {
    this.init();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    // Check if query is coordinate like "960, 540" or "960 540"
    const coordMatch = trimmed.match(/^(\d+)[,\s]+(\d+)$/);
    if (coordMatch) {
      const qx = parseInt(coordMatch[1], 10);
      const qy = parseInt(coordMatch[2], 10);
      const match = await this.getCellAt(qx, qy);
      return match ? [match] : [];
    }

    if (this.getIsSupabaseActive() && supabase) {
      try {
        const { data, error } = await supabase
          .from('canvas_cells')
          .select('*')
          .ilike('message_text', `%${trimmed}%`)
          .limit(25);

        if (!error && data) {
          data.forEach((c: CanvasCell) => this.setLocalCell(c));
          return data as CanvasCell[];
        }
      } catch (err) {
        console.warn('Supabase search failed:', err);
      }
      return [];
    }

    // Local search in offline mode
    const results: CanvasCell[] = [];
    for (const cell of this.localCells.values()) {
      if (cell.message_text && cell.message_text.toLowerCase().includes(trimmed)) {
        results.push(cell);
      } else if (cell.author_name && cell.author_name.toLowerCase().includes(trimmed)) {
        results.push(cell);
      }
      if (results.length >= 25) break;
    }

    return results;
  }

  /**
   * Fetch real-time count of claimed cells from Supabase or memory
   */
  public async fetchTotalClaimedCount(): Promise<number> {
    this.init();

    if (this.getIsSupabaseActive() && supabase) {
      try {
        const { count, error } = await supabase
          .from('canvas_cells')
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          this.totalCountCache = count;
          return count;
        }
      } catch (err) {
        console.warn('Failed to fetch count from Supabase:', err);
      }
    }

    const fallback = this.localCells.size;
    this.totalCountCache = fallback;
    return fallback;
  }

  /**
   * Synchronous cached count
   */
  public getTotalClaimedCount(): number {
    this.init();
    return this.totalCountCache ?? this.localCells.size;
  }
}

export const canvasStorage = new CanvasStorageService();
