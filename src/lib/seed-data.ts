import { CanvasCell } from '@/types/canvas';

// Origin centered for 1920 x 1080 canvas
export const INITIAL_SPAWN_X = 960;
export const INITIAL_SPAWN_Y = 540;

export const SEED_CELLS: CanvasCell[] = [
  // 1. Center Genesis Tile
  {
    x: 960,
    y: 540,
    dominant_color: '#3b82f6',
    vector_data: {
      bg: '#0f172a',
      strokes: [
        // Star / Sparkle doodle in center
        {
          color: '#60a5fa',
          width: 3,
          points: [
            { x: 128, y: 40 },
            { x: 128, y: 216 },
          ],
        },
        {
          color: '#60a5fa',
          width: 3,
          points: [
            { x: 40, y: 128 },
            { x: 216, y: 128 },
          ],
        },
        {
          color: '#38bdf8',
          width: 2,
          points: [
            { x: 64, y: 64 },
            { x: 192, y: 192 },
          ],
        },
        {
          color: '#38bdf8',
          width: 2,
          points: [
            { x: 192, y: 64 },
            { x: 64, y: 192 },
          ],
        },
      ],
      texts: [
        {
          text: 'PIXELVERSE',
          x: 128,
          y: 70,
          size: 18,
          color: '#38bdf8',
          font: 'sans-serif',
        },
        {
          text: 'ORIGIN (960, 540)',
          x: 128,
          y: 185,
          size: 11,
          color: '#94a3b8',
          font: 'monospace',
        },
      ],
    },
    message_text: 'Welcome to PixelVerse! The genesis tile at (960, 540). Leave your mark on the 1920x1080 canvas.',
    author_name: 'Genesis Architect',
    created_at: '2026-09-28T00:00:00.000Z',
  },

  // 2. Neon Heart (961, 540)
  {
    x: 961,
    y: 540,
    dominant_color: '#ec4899',
    vector_data: {
      bg: '#18081f',
      strokes: [
        {
          color: '#f43f5e',
          width: 4,
          points: [
            { x: 128, y: 90 },
            { x: 100, y: 60 },
            { x: 60, y: 70 },
            { x: 50, y: 110 },
            { x: 128, y: 195 },
            { x: 206, y: 110 },
            { x: 196, y: 70 },
            { x: 156, y: 60 },
            { x: 128, y: 90 },
          ],
        },
        {
          color: '#fda4af',
          width: 2,
          points: [
            { x: 75, y: 85 },
            { x: 68, y: 105 },
          ],
        },
      ],
      texts: [
        {
          text: 'HELLO WORLD <3',
          x: 128,
          y: 220,
          size: 13,
          color: '#fb7185',
          font: 'monospace',
        },
      ],
    },
    message_text: 'Created with love by community doodlers.',
    author_name: 'CyberPainter',
    created_at: '2026-09-28T01:15:00.000Z',
  },

  // 3. Emerald Forest / Tree (959, 540)
  {
    x: 959,
    y: 540,
    dominant_color: '#10b981',
    vector_data: {
      bg: '#022c22',
      strokes: [
        {
          color: '#78350f',
          width: 6,
          points: [
            { x: 128, y: 140 },
            { x: 128, y: 220 },
          ],
        },
        {
          color: '#10b981',
          width: 4,
          points: [
            { x: 128, y: 50 },
            { x: 80, y: 110 },
            { x: 176, y: 110 },
            { x: 128, y: 50 },
          ],
        },
        {
          color: '#34d399',
          width: 4,
          points: [
            { x: 128, y: 90 },
            { x: 60, y: 160 },
            { x: 196, y: 160 },
            { x: 128, y: 90 },
          ],
        },
      ],
      texts: [
        {
          text: 'PLANT A SEED',
          x: 128,
          y: 235,
          size: 11,
          color: '#6ee7b7',
          font: 'sans-serif',
        },
      ],
    },
    message_text: 'Grow your ideas step by step.',
    author_name: 'NatureLover',
    created_at: '2026-09-28T02:00:00.000Z',
  },

  // 4. Cyber Matrix / Code (960, 539)
  {
    x: 960,
    y: 539,
    dominant_color: '#06b6d4',
    vector_data: {
      bg: '#042f2e',
      strokes: [
        {
          color: '#0d9488',
          width: 2,
          points: [
            { x: 30, y: 40 },
            { x: 226, y: 40 },
          ],
        },
        {
          color: '#0d9488',
          width: 2,
          points: [
            { x: 30, y: 216 },
            { x: 226, y: 216 },
          ],
        },
      ],
      texts: [
        {
          text: 'const canvas = {',
          x: 128,
          y: 85,
          size: 13,
          color: '#22d3ee',
          font: 'monospace',
        },
        {
          text: '  scale: 1920x1080,',
          x: 128,
          y: 125,
          size: 12,
          color: '#a5f3fc',
          font: 'monospace',
        },
        {
          text: '  fps: 60, lod: true',
          x: 128,
          y: 155,
          size: 12,
          color: '#a5f3fc',
          font: 'monospace',
        },
        {
          text: '}; // FHD universe',
          x: 128,
          y: 185,
          size: 13,
          color: '#22d3ee',
          font: 'monospace',
        },
      ],
    },
    message_text: 'The infinite canvas engine running in crisp 1920x1080 resolution.',
    author_name: 'Dev01',
    created_at: '2026-09-28T02:30:00.000Z',
  },

  // 5. Sun / Golden Dawn (960, 541)
  {
    x: 960,
    y: 541,
    dominant_color: '#f59e0b',
    vector_data: {
      bg: '#1c1917',
      strokes: [
        {
          color: '#fbbf24',
          width: 5,
          points: [
            { x: 128, y: 80 },
            { x: 160, y: 92 },
            { x: 176, y: 124 },
            { x: 160, y: 156 },
            { x: 128, y: 168 },
            { x: 96, y: 156 },
            { x: 80, y: 124 },
            { x: 96, y: 92 },
            { x: 128, y: 80 },
          ],
        },
        { color: '#f59e0b', width: 3, points: [{ x: 128, y: 55 }, { x: 128, y: 70 }] },
        { color: '#f59e0b', width: 3, points: [{ x: 128, y: 178 }, { x: 128, y: 193 }] },
        { color: '#f59e0b', width: 3, points: [{ x: 55, y: 124 }, { x: 70, y: 124 }] },
        { color: '#f59e0b', width: 3, points: [{ x: 186, y: 124 }, { x: 201, y: 124 }] },
      ],
      texts: [
        {
          text: 'DAWN OF AN ERA',
          x: 128,
          y: 220,
          size: 12,
          color: '#fde68a',
          font: 'sans-serif',
        },
      ],
    },
    message_text: 'Every morning brings 2.07 million new possibilities.',
    author_name: 'SolarWanderer',
    created_at: '2026-09-28T03:00:00.000Z',
  },

  // 6. Purple Portal (961, 541)
  {
    x: 961,
    y: 541,
    dominant_color: '#a855f7',
    vector_data: {
      bg: '#1e1035',
      strokes: [
        {
          color: '#c084fc',
          width: 4,
          points: [
            { x: 70, y: 70 },
            { x: 186, y: 70 },
            { x: 186, y: 186 },
            { x: 70, y: 186 },
            { x: 70, y: 70 },
          ],
        },
        {
          color: '#e879f9',
          width: 2,
          points: [
            { x: 90, y: 90 },
            { x: 166, y: 90 },
            { x: 166, y: 166 },
            { x: 90, y: 166 },
            { x: 90, y: 90 },
          ],
        },
      ],
      texts: [
        {
          text: 'PORTAL TO VOID',
          x: 128,
          y: 132,
          size: 11,
          color: '#f0abfc',
          font: 'sans-serif',
        },
      ],
    },
    message_text: 'Step in if you dare.',
    author_name: 'VoidWalker',
    created_at: '2026-09-28T03:20:00.000Z',
  },

  // 7. Chill Cat (959, 539)
  {
    x: 959,
    y: 539,
    dominant_color: '#f97316',
    vector_data: {
      bg: '#271b14',
      strokes: [
        {
          color: '#fb923c',
          width: 3,
          points: [
            { x: 80, y: 100 },
            { x: 70, y: 60 },
            { x: 100, y: 80 },
            { x: 156, y: 80 },
            { x: 186, y: 60 },
            { x: 176, y: 100 },
            { x: 186, y: 160 },
            { x: 70, y: 160 },
            { x: 80, y: 100 },
          ],
        },
        { color: '#fdba74', width: 2, points: [{ x: 50, y: 130 }, { x: 80, y: 132 }] },
        { color: '#fdba74', width: 2, points: [{ x: 50, y: 145 }, { x: 80, y: 142 }] },
        { color: '#fdba74', width: 2, points: [{ x: 176, y: 132 }, { x: 206, y: 130 }] },
        { color: '#fdba74', width: 2, points: [{ x: 176, y: 142 }, { x: 206, y: 145 }] },
      ],
      texts: [
        {
          text: '=^.^= MEOW',
          x: 128,
          y: 200,
          size: 14,
          color: '#ffedd5',
          font: 'monospace',
        },
      ],
    },
    message_text: 'Just a chill cat chilling in coordinate space.',
    author_name: 'NekoSan',
    created_at: '2026-09-28T03:45:00.000Z',
  },

  // 8. Danger Zone Skull (962, 540)
  {
    x: 962,
    y: 540,
    dominant_color: '#ef4444',
    vector_data: {
      bg: '#1f1315',
      strokes: [
        {
          color: '#f87171',
          width: 3,
          points: [
            { x: 90, y: 80 },
            { x: 166, y: 80 },
            { x: 180, y: 130 },
            { x: 155, y: 175 },
            { x: 101, y: 175 },
            { x: 76, y: 130 },
            { x: 90, y: 80 },
          ],
        },
      ],
      texts: [
        {
          text: 'DANGER ZONE',
          x: 128,
          y: 215,
          size: 12,
          color: '#fca5a5',
          font: 'monospace',
        },
      ],
    },
    message_text: 'Turn back or claim your plot!',
    author_name: 'RogueOne',
    created_at: '2026-09-28T04:10:00.000Z',
  },

  // 9. Inspiring quote (958, 540)
  {
    x: 958,
    y: 540,
    dominant_color: '#8b5cf6',
    vector_data: {
      bg: '#170f2e',
      strokes: [
        {
          color: '#a78bfa',
          width: 2,
          points: [
            { x: 40, y: 60 },
            { x: 216, y: 60 },
          ],
        },
        {
          color: '#a78bfa',
          width: 2,
          points: [
            { x: 40, y: 196 },
            { x: 216, y: 196 },
          ],
        },
      ],
      texts: [
        {
          text: '"Small steps create',
          x: 128,
          y: 105,
          size: 13,
          color: '#c4b5fd',
          font: 'sans-serif',
        },
        {
          text: 'infinite worlds."',
          x: 128,
          y: 145,
          size: 14,
          color: '#ede9fe',
          font: 'sans-serif',
        },
      ],
    },
    message_text: 'Small steps create infinite worlds. Write your chapter here.',
    author_name: 'PhilosopherCat',
    created_at: '2026-09-28T04:30:00.000Z',
  },
];
