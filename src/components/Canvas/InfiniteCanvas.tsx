'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ViewportState,
  CanvasCell,
  LodMode,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MICRO_LOD_THRESHOLD,
  MIN_ZOOM,
  MAX_ZOOM,
} from '@/types/canvas';
import { CanvasRenderer } from '@/lib/canvas-renderer';
import { canvasStorage } from '@/lib/storage';
import { INITIAL_SPAWN_X, INITIAL_SPAWN_Y } from '@/lib/seed-data';
import { CoordinateHud } from './CoordinateHud';
import { ControlsOverlay } from './ControlsOverlay';
import { CanvasMinimap } from './CanvasMinimap';
import { CellInspectorModal } from './CellInspectorModal';
import { CellEditorModal } from '../Editor/CellEditorModal';
import { TeleportSearchModal } from '../Search/TeleportSearchModal';
import { Navbar } from '../UI/Navbar';
import { HelpModal } from '../UI/HelpModal';

export const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport State
  const [viewport, setViewport] = useState<ViewportState>({
    offsetX: 0,
    offsetY: 0,
    cellSize: 48, // Start in Micro LOD around origin
    width: 0,
    height: 0,
  });

  // Cells memory cache (indexed by "x,y")
  const cellsMapRef = useRef<Map<string, CanvasCell>>(new Map());
  const [allCellsArray, setAllCellsArray] = useState<CanvasCell[]>([]);
  const [totalClaimed, setTotalClaimed] = useState(0);

  // Interaction State
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [inspectedCell, setInspectedCell] = useState<CanvasCell | null>(null);
  const [editingCellCoord, setEditingCellCoord] = useState<{ x: number; y: number } | null>(null);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Panning & dragging internals
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Pinch zoom internals for touch devices
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(48);

  // Dirty flag for requestAnimationFrame render loop
  const needsRenderRef = useRef(true);

  // Fetch debouncing timer
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger repaint
  const requestRepaint = useCallback(() => {
    needsRenderRef.current = true;
  }, []);

  // Center camera on specific cell (X, Y)
  const centerOnCell = useCallback(
    (cellX: number, cellY: number, targetCellSize?: number) => {
      setViewport((prev) => {
        const nextCellSize = targetCellSize ?? prev.cellSize;
        const newOffsetX = prev.width / 2 - (cellX + 0.5) * nextCellSize;
        const newOffsetY = prev.height / 2 - (cellY + 0.5) * nextCellSize;
        return {
          ...prev,
          cellSize: nextCellSize,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        };
      });
      requestRepaint();
    },
    [requestRepaint]
  );

  // Initialize canvas size and center on genesis tile
  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      setViewport((prev) => {
        // If first initialization, center on origin
        if (prev.width === 0 && prev.height === 0) {
          const initZoom = 52;
          const initOffsetX = w / 2 - (INITIAL_SPAWN_X + 0.5) * initZoom;
          const initOffsetY = h / 2 - (INITIAL_SPAWN_Y + 0.5) * initZoom;
          return {
            offsetX: initOffsetX,
            offsetY: initOffsetY,
            cellSize: initZoom,
            width: w,
            height: h,
          };
        }
        return { ...prev, width: w, height: h };
      });

      requestRepaint();
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [requestRepaint]);

  // Load and subscribe to cells
  useEffect(() => {
    canvasStorage.init();

    // Load initial batch around origin
    const loadInitial = async () => {
      const initialBounds = {
        minX: INITIAL_SPAWN_X - 100,
        maxX: INITIAL_SPAWN_X + 100,
        minY: INITIAL_SPAWN_Y - 100,
        maxY: INITIAL_SPAWN_Y + 100,
      };
      const initialCells = await canvasStorage.getCellsInBounds(initialBounds);
      initialCells.forEach((c) => {
        cellsMapRef.current.set(`${c.x},${c.y}`, c);
      });
      setAllCellsArray(Array.from(cellsMapRef.current.values()));
      const count = await canvasStorage.fetchTotalClaimedCount();
      setTotalClaimed(count);
      requestRepaint();
    };
    loadInitial();

    // Subscribe to Realtime CDC
    const unsubscribe = canvasStorage.subscribeToChanges(async (newCell) => {
      cellsMapRef.current.set(`${newCell.x},${newCell.y}`, newCell);
      setAllCellsArray(Array.from(cellsMapRef.current.values()));
      const count = await canvasStorage.fetchTotalClaimedCount();
      setTotalClaimed(count);
      requestRepaint();
    });

    return () => {
      unsubscribe();
    };
  }, [requestRepaint]);

  // Viewport Culling & Fetching (Debounced 150ms per PRD 3.2)
  const fetchViewportCells = useCallback(() => {
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }

    fetchDebounceTimerRef.current = setTimeout(async () => {
      const bounds = CanvasRenderer.calculateVisibleBounds(viewport);
      // Expand bounds slightly for smooth scrolling buffer
      const buffer = 10;
      const bufferedBounds = {
        minX: Math.max(0, bounds.minX - buffer),
        maxX: Math.min(CANVAS_WIDTH - 1, bounds.maxX + buffer),
        minY: Math.max(0, bounds.minY - buffer),
        maxY: Math.min(CANVAS_HEIGHT - 1, bounds.maxY + buffer),
      };

      const fetched = await canvasStorage.getCellsInBounds(bufferedBounds);
      let hasNew = false;
      fetched.forEach((c) => {
        const key = `${c.x},${c.y}`;
        if (!cellsMapRef.current.has(key)) {
          cellsMapRef.current.set(key, c);
          hasNew = true;
        }
      });

      if (hasNew) {
        setAllCellsArray(Array.from(cellsMapRef.current.values()));
        requestRepaint();
      }
    }, 150);
  }, [viewport, requestRepaint]);

  useEffect(() => {
    fetchViewportCells();
  }, [viewport.offsetX, viewport.offsetY, viewport.cellSize, fetchViewportCells]);

  // Main Render Loop (60 FPS with requestAnimationFrame)
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      if (needsRenderRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== viewport.width * dpr || canvas.height !== viewport.height * dpr) {
              canvas.width = viewport.width * dpr;
              canvas.height = viewport.height * dpr;
            }

            ctx.save();
            ctx.scale(dpr, dpr);
            CanvasRenderer.render(
              ctx,
              viewport,
              cellsMapRef.current,
              hoveredCell,
              selectedCell
            );
            ctx.restore();
          }
        }
        needsRenderRef.current = false;
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [viewport, hoveredCell, selectedCell]);

  // Pointer & Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only drag with left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { x: viewport.offsetX, y: viewport.offsetY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect cell under cursor
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cellCoord = CanvasRenderer.screenToCell(mouseX, mouseY, viewport);

    if (
      !hoveredCell ||
      !cellCoord ||
      hoveredCell.x !== cellCoord.x ||
      hoveredCell.y !== cellCoord.y
    ) {
      setHoveredCell(cellCoord);
      requestRepaint();
    }

    // Panning
    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      if (Math.hypot(deltaX, deltaY) > 4) {
        hasMovedRef.current = true;
      }

      setViewport((prev) => ({
        ...prev,
        offsetX: initialOffsetRef.current.x + deltaX,
        offsetY: initialOffsetRef.current.y + deltaY,
      }));
      requestRepaint();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // If it was a click without dragging, handle slot interaction
    if (!hasMovedRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cellCoord = CanvasRenderer.screenToCell(clickX, clickY, viewport);

      if (cellCoord) {
        setSelectedCell(cellCoord);
        const existing = cellsMapRef.current.get(`${cellCoord.x},${cellCoord.y}`);
        if (existing) {
          setInspectedCell(existing);
          requestRepaint();
        } else {
          canvasStorage.getCellAt(cellCoord.x, cellCoord.y).then((dbCell) => {
            if (dbCell) {
              cellsMapRef.current.set(`${dbCell.x},${dbCell.y}`, dbCell);
              setInspectedCell(dbCell);
            } else {
              setEditingCellCoord(cellCoord);
            }
            requestRepaint();
          });
        }
      }
    }
  };

  // Cursor-Centric Zoom via Mouse Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom multiplier
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

    setViewport((prev) => {
      const newCellSize = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.cellSize * zoomFactor));
      if (newCellSize === prev.cellSize) return prev;

      // Keep cell under cursor at same screen position
      const newOffsetX = mouseX - (mouseX - prev.offsetX) * (newCellSize / prev.cellSize);
      const newOffsetY = mouseY - (mouseY - prev.offsetY) * (newCellSize / prev.cellSize);

      return {
        ...prev,
        cellSize: newCellSize,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });

    requestRepaint();
  };

  // Touch Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = viewport.cellSize;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      setViewport((prev) => {
        const newCellSize = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, initialPinchZoomRef.current * factor)
        );
        const newOffsetX = midX - (midX - prev.offsetX) * (newCellSize / prev.cellSize);
        const newOffsetY = midY - (midY - prev.offsetY) * (newCellSize / prev.cellSize);

        return {
          ...prev,
          cellSize: newCellSize,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        };
      });
      requestRepaint();
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  // Zoom Button Controls
  const handleZoomIn = () => {
    setViewport((prev) => {
      const newCellSize = Math.min(MAX_ZOOM, prev.cellSize * 1.35);
      const midX = prev.width / 2;
      const midY = prev.height / 2;
      const newOffsetX = midX - (midX - prev.offsetX) * (newCellSize / prev.cellSize);
      const newOffsetY = midY - (midY - prev.offsetY) * (newCellSize / prev.cellSize);
      return { ...prev, cellSize: newCellSize, offsetX: newOffsetX, offsetY: newOffsetY };
    });
    requestRepaint();
  };

  const handleZoomOut = () => {
    setViewport((prev) => {
      const newCellSize = Math.max(MIN_ZOOM, prev.cellSize * 0.74);
      const midX = prev.width / 2;
      const midY = prev.height / 2;
      const newOffsetX = midX - (midX - prev.offsetX) * (newCellSize / prev.cellSize);
      const newOffsetY = midY - (midY - prev.offsetY) * (newCellSize / prev.cellSize);
      return { ...prev, cellSize: newCellSize, offsetX: newOffsetX, offsetY: newOffsetY };
    });
    requestRepaint();
  };

  // Keyboard Navigation Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCellCoord || inspectedCell || isSearchOpen || isHelpOpen) return;

      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === 'h' || e.key === 'H') {
        centerOnCell(INITIAL_SPAWN_X, INITIAL_SPAWN_Y);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCellCoord, inspectedCell, isSearchOpen, isHelpOpen, centerOnCell]);

  const lodMode: LodMode = viewport.cellSize >= MICRO_LOD_THRESHOLD ? 'micro' : 'macro';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white select-none">
      {/* Top Navbar */}
      <Navbar
        onOpenCreate={() => {
          const target = selectedCell || hoveredCell || { x: INITIAL_SPAWN_X, y: INITIAL_SPAWN_Y };
          setEditingCellCoord(target);
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetView={(x, y) => centerOnCell(x ?? INITIAL_SPAWN_X, y ?? INITIAL_SPAWN_Y, 52)}
        selectedCell={selectedCell}
        totalClaimed={totalClaimed}
      />

      {/* Coordinate & LOD HUD */}
      <CoordinateHud
        cursorCell={hoveredCell}
        cellSize={viewport.cellSize}
        lodMode={lodMode}
        isLive={canvasStorage.getIsSupabaseActive()}
        totalClaimed={totalClaimed}
      />

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full block cursor-canvas-rect"
      />

      {/* Floating Controls Overlay (Zoom, Center, Fullscreen) */}
      <ControlsOverlay
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={(x, y) => centerOnCell(x ?? INITIAL_SPAWN_X, y ?? INITIAL_SPAWN_Y, 52)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Minimap Radar */}
      <CanvasMinimap
        viewport={viewport}
        cells={allCellsArray}
        onTeleportToCell={(x, y) => centerOnCell(x, y)}
      />

      {/* Cell Inspector Modal (When clicking existing claimed cell) */}
      {inspectedCell && (
        <CellInspectorModal
          cell={inspectedCell}
          onClose={() => setInspectedCell(null)}
          onZoomIntoCell={(x, y) => {
            centerOnCell(x, y, 96);
            setInspectedCell(null);
          }}
          onClaimNeighbor={(nx, ny) => {
            setInspectedCell(null);
            setEditingCellCoord({ x: nx, y: ny });
          }}
        />
      )}

      {/* 1:1 Page Editor Modal (When claiming / drawing on slot) */}
      {editingCellCoord && (
        <CellEditorModal
          coord={editingCellCoord}
          onClose={() => setEditingCellCoord(null)}
          onSave={async (newCell) => {
            const res = await canvasStorage.saveCell(newCell);
            if (res.success) {
              cellsMapRef.current.set(`${newCell.x},${newCell.y}`, newCell);
              setAllCellsArray(Array.from(cellsMapRef.current.values()));
              const count = await canvasStorage.fetchTotalClaimedCount();
              setTotalClaimed(count);
              setSelectedCell({ x: newCell.x, y: newCell.y });
              centerOnCell(newCell.x, newCell.y, 64);
              requestRepaint();
            }
            return res;
          }}
        />
      )}

      {/* Teleport & Search Modal */}
      {isSearchOpen && (
        <TeleportSearchModal
          onClose={() => setIsSearchOpen(false)}
          onTeleport={(x, y) => {
            centerOnCell(x, y, 64);
            setSelectedCell({ x, y });
          }}
        />
      )}

      {/* Help & Guide Modal */}
      {isHelpOpen && (
        <HelpModal
          onClose={() => setIsHelpOpen(false)}
          isSupabaseConfigured={canvasStorage.getIsSupabaseActive()}
        />
      )}
    </div>
  );
};
