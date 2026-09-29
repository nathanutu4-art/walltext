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
import { ControlsOverlay } from './ControlsOverlay';
import { CanvasMinimap } from './CanvasMinimap';
import { CellInspectorModal } from './CellInspectorModal';
import { CellEditorModal } from '../Editor/CellEditorModal';
import { TeleportSearchModal } from '../Search/TeleportSearchModal';
import { Navbar } from '../UI/Navbar';
import { HelpModal } from '../UI/HelpModal';
import { MapPin, Eye, PlusCircle, X } from 'lucide-react';

/**
 * Parse cell coordinates from URL Hash (#960,540, #x=960&y=540) or Query Search (?x=960&y=540, ?slot=960,540)
 */
function parseCoordinateFromUrl(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;

  // 1. Try URL search params (?x=960&y=540, ?slot=960,540, ?coord=960,540, ?cell=960,540)
  try {
    const params = new URLSearchParams(window.location.search);
    const qx = params.get('x');
    const qy = params.get('y');
    if (qx !== null && qy !== null) {
      const x = parseInt(qx, 10);
      const y = parseInt(qy, 10);
      if (!isNaN(x) && !isNaN(y) && x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        return { x, y };
      }
    }
    const slot = params.get('slot') || params.get('coord') || params.get('cell');
    if (slot) {
      const parts = slot.split(',');
      if (parts.length === 2) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
          return { x, y };
        }
      }
    }
  } catch {
    // Ignore error
  }

  // 2. Try URL hash (#960,540, #x=960&y=540)
  try {
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (rawHash) {
      if (rawHash.includes('=')) {
        const hashParams = new URLSearchParams(rawHash);
        const hx = hashParams.get('x');
        const hy = hashParams.get('y');
        if (hx !== null && hy !== null) {
          const x = parseInt(hx, 10);
          const y = parseInt(hy, 10);
          if (!isNaN(x) && !isNaN(y) && x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
            return { x, y };
          }
        }
      }
      // Direct comma separated #960,540
      const parts = rawHash.split(',');
      if (parts.length === 2) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
          return { x, y };
        }
      }
    }
  } catch {
    // Ignore error
  }

  return null;
}

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
  const [selectedCellData, setSelectedCellData] = useState<CanvasCell | null>(null);
  const [inspectedCell, setInspectedCell] = useState<CanvasCell | null>(null);
  const [editingCellCoord, setEditingCellCoord] = useState<{ x: number; y: number } | null>(null);

  // Sync selectedCellData whenever selectedCell changes
  useEffect(() => {
    if (!selectedCell) {
      setSelectedCellData(null);
      return;
    }
    const key = `${selectedCell.x},${selectedCell.y}`;
    const cached = cellsMapRef.current.get(key);
    if (cached) {
      setSelectedCellData(cached);
    } else {
      canvasStorage.getCellAt(selectedCell.x, selectedCell.y).then((dbCell) => {
        if (dbCell) {
          cellsMapRef.current.set(key, dbCell);
          setSelectedCellData(dbCell);
        } else {
          setSelectedCellData(null);
        }
      });
    }
  }, [selectedCell]);

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

  // Mobile Touch & Gesture Navigation Refs
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchInitialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchPanningRef = useRef(false);
  const touchMovedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapCoordRef = useRef<{ x: number; y: number } | null>(null);

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

  // Initialize canvas size and center on genesis tile (or URL coordinate if present)
  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      setViewport((prev) => {
        // If first initialization, center on URL coord if present, otherwise default origin
        if (prev.width === 0 && prev.height === 0) {
          const urlCoord = parseCoordinateFromUrl();
          const spawnX = urlCoord ? urlCoord.x : INITIAL_SPAWN_X;
          const spawnY = urlCoord ? urlCoord.y : INITIAL_SPAWN_Y;
          const initZoom = urlCoord ? 192 : 64;
          const initOffsetX = w / 2 - (spawnX + 0.5) * initZoom;
          const initOffsetY = h / 2 - (spawnY + 0.5) * initZoom;
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

  // Handle shared coordinate URL / Hash: navigate to coordinate and open preview modal
  useEffect(() => {
    let isCancelled = false;

    const handleUrlCoordinate = async () => {
      const coord = parseCoordinateFromUrl();
      if (!coord) return;

      setSelectedCell(coord);
      centerOnCell(coord.x, coord.y, 192);

      // Check local cache or fetch from storage
      const key = `${coord.x},${coord.y}`;
      let cell = cellsMapRef.current.get(key) || null;
      if (!cell) {
        cell = await canvasStorage.getCellAt(coord.x, coord.y);
      }

      if (isCancelled) return;

      if (cell) {
        cellsMapRef.current.set(key, cell);
        setAllCellsArray((prev) => {
          if (!prev.some((c) => c.x === cell!.x && c.y === cell!.y)) {
            return [...prev, cell!];
          }
          return prev;
        });
        setSelectedCellData(cell);
        setInspectedCell(cell);
        requestRepaint();
      } else {
        setSelectedCellData(null);
      }
    };

    handleUrlCoordinate();

    window.addEventListener('hashchange', handleUrlCoordinate);
    window.addEventListener('popstate', handleUrlCoordinate);

    return () => {
      isCancelled = true;
      window.removeEventListener('hashchange', handleUrlCoordinate);
      window.removeEventListener('popstate', handleUrlCoordinate);
    };
  }, [centerOnCell, requestRepaint]);

  // Repaint once fonts have finished loading
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        requestRepaint();
      });
    }
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

  // Mouse Pointer & Drag Handlers (Desktop only)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only handle mouse events here; touch is handled cleanly via TouchEvents
    if (e.pointerType !== 'mouse' || e.button !== 0) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { x: viewport.offsetX, y: viewport.offsetY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse') return;

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

    // Mouse Panning
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
    if (e.pointerType !== 'mouse') return;
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // If it was a click without dragging, handle slot selection / view detail
    if (!hasMovedRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cellCoord = CanvasRenderer.screenToCell(clickX, clickY, viewport);

      if (cellCoord) {
        setSelectedCell(cellCoord);
        // "untuk lihat detail bolehkan menggunakan mouse click"
        const existing = cellsMapRef.current.get(`${cellCoord.x},${cellCoord.y}`);
        if (existing) {
          setInspectedCell(existing);
        } else {
          canvasStorage.getCellAt(cellCoord.x, cellCoord.y).then((dbCell) => {
            if (dbCell) {
              cellsMapRef.current.set(`${dbCell.x},${dbCell.y}`, dbCell);
              setInspectedCell(dbCell);
            }
            requestRepaint();
          });
        }
        requestRepaint();
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

  // Dedicated Mobile Touch Handlers (Fluid 1-finger swipe, Hold, Double-tap, and 2-finger pinch)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // 2-Finger Pinch to Zoom
    if (e.touches.length === 2) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      isTouchPanningRef.current = false;
      touchMovedRef.current = true;
      isLongPressTriggeredRef.current = false;

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = viewport.cellSize;
      return;
    }

    // 1-Finger Navigation & Hold / Double-Tap detection
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      touchInitialOffsetRef.current = { x: viewport.offsetX, y: viewport.offsetY };
      isTouchPanningRef.current = true;
      touchMovedRef.current = false;
      isLongPressTriggeredRef.current = false;

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      // Start Hold (Long-Press) timer (~480ms)
      longPressTimerRef.current = setTimeout(() => {
        if (!touchMovedRef.current && canvasRef.current) {
          isLongPressTriggeredRef.current = true;
          const rect = canvasRef.current.getBoundingClientRect();
          const cellCoord = CanvasRenderer.screenToCell(
            touchStartPosRef.current.x - rect.left,
            touchStartPosRef.current.y - rect.top,
            viewport
          );

          if (cellCoord) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([40, 50, 40]);
            }
            setSelectedCell(cellCoord);
            const existing = cellsMapRef.current.get(`${cellCoord.x},${cellCoord.y}`);
            if (existing) {
              setInspectedCell(existing);
            } else {
              canvasStorage.getCellAt(cellCoord.x, cellCoord.y).then((dbCell) => {
                if (dbCell) {
                  cellsMapRef.current.set(`${dbCell.x},${dbCell.y}`, dbCell);
                  setInspectedCell(dbCell);
                } else {
                  setEditingCellCoord(cellCoord); // Hold on empty grid: Klaim!
                }
                requestRepaint();
              });
            }
            requestRepaint();
          }
        }
      }, 480);
    }
  };

  // Fluid 1-finger swipe and 2-finger pinch
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Multi-touch Pinch Zoom
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
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
      return;
    }

    // 1-Finger Fluid Pan (Zero delay, instant responsiveness)
    if (e.touches.length === 1 && isTouchPanningRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartPosRef.current.x;
      const deltaY = touch.clientY - touchStartPosRef.current.y;

      if (Math.hypot(deltaX, deltaY) > 8) {
        touchMovedRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      setViewport((prev) => ({
        ...prev,
        offsetX: touchInitialOffsetRef.current.x + deltaX,
        offsetY: touchInitialOffsetRef.current.y + deltaY,
      }));
      requestRepaint();
    }
  };

  // Touch End: Tap, Double-Tap, or Pan Finish
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    initialPinchDistRef.current = null;

    if (isLongPressTriggeredRef.current) {
      isTouchPanningRef.current = false;
      return;
    }

    // If tap without moving
    if (!touchMovedRef.current && canvasRef.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const cellCoord = CanvasRenderer.screenToCell(
        touch.clientX - rect.left,
        touch.clientY - rect.top,
        viewport
      );

      if (cellCoord) {
        const now = Date.now();
        const isDoubleTap =
          now - lastTapTimeRef.current < 350 &&
          lastTapCoordRef.current &&
          lastTapCoordRef.current.x === cellCoord.x &&
          lastTapCoordRef.current.y === cellCoord.y;

        if (isDoubleTap) {
          // Double Tap Action: Klaim on empty, or View on claimed!
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30);
          }
          setSelectedCell(cellCoord);
          const existing = cellsMapRef.current.get(`${cellCoord.x},${cellCoord.y}`);
          if (existing) {
            setInspectedCell(existing);
          } else {
            canvasStorage.getCellAt(cellCoord.x, cellCoord.y).then((dbCell) => {
              if (dbCell) {
                cellsMapRef.current.set(`${dbCell.x},${dbCell.y}`, dbCell);
                setInspectedCell(dbCell);
              } else {
                setEditingCellCoord(cellCoord); // Double tap on empty grid: Klaim!
              }
              requestRepaint();
            });
          }
          lastTapTimeRef.current = 0;
          lastTapCoordRef.current = null;
        } else {
          // Single Tap: Selects the grid
          setSelectedCell(cellCoord);
          lastTapTimeRef.current = now;
          lastTapCoordRef.current = cellCoord;
        }
        requestRepaint();
      }
    }

    isTouchPanningRef.current = false;
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isTouchPanningRef.current = false;
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
      {/* Top Navbar & Info Bar (Single 1 Row) */}
      <Navbar
        onOpenCreate={() => {
          const target = selectedCell || hoveredCell || { x: INITIAL_SPAWN_X, y: INITIAL_SPAWN_Y };
          setEditingCellCoord(target);
        }}
        onInspectCell={(cell) => setInspectedCell(cell)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetView={(x, y) => centerOnCell(x ?? INITIAL_SPAWN_X, y ?? INITIAL_SPAWN_Y, 52)}
        selectedCell={selectedCell}
        selectedCellData={selectedCellData}
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

      {/* Selected Cell Action Bar (Floating at bottom center, elevated above bottom controls on mobile) */}
      {selectedCell && (
        <div className="absolute bottom-[22vh] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 bg-white border-2 sm:border-3 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] sm:shadow-[5px_5px_0px_#000000] text-black animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[92vw] sm:max-w-none">
          {/* Top row / Header on mobile: Coordinates + Close button */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:py-1 bg-slate-100 border border-black font-pixel text-[9px] sm:text-[10px] font-bold shrink-0">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>SLOT ({selectedCell.x}, {selectedCell.y})</span>
            </div>

            {/* Mobile close button on top right of the card */}
            <button
              onClick={() => {
                setSelectedCell(null);
                requestRepaint();
              }}
              title="Tutup Seleksi"
              className="sm:hidden p-1 hover:bg-slate-200 border border-black cursor-pointer text-slate-700 hover:text-black transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action content: Claim or Inspect */}
          {selectedCellData ? (
            <div className="flex items-center justify-between w-full sm:w-auto gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 border border-black shadow-[1px_1px_0px_#000000] shrink-0"
                  style={{ backgroundColor: CanvasRenderer.getCellDominantColor(selectedCellData) }}
                />
                <span className="font-mono text-xs font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[140px]">
                  {selectedCellData.author_name || 'Anon'}
                </span>
              </div>
              <button
                onClick={() => setInspectedCell(selectedCellData)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-black" />
                <span>Lihat Detail</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0">
              <span className="font-pixel text-[9px] text-emerald-700 font-bold px-1 sm:inline">
                [Tersedia]
              </span>
              <button
                onClick={() => setEditingCellCoord(selectedCell)}
                className="flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black font-pixel text-[10px] sm:text-[11px] font-bold shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-black" />
                <span>Klaim Slot Ini</span>
              </button>
            </div>
          )}

          {/* Desktop close button */}
          <button
            onClick={() => {
              setSelectedCell(null);
              requestRepaint();
            }}
            title="Tutup Seleksi"
            className="hidden sm:block p-1 hover:bg-slate-200 border border-transparent hover:border-black cursor-pointer text-slate-500 hover:text-black transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cell Inspector Modal (When clicking existing claimed cell) */}
      {inspectedCell && (
        <CellInspectorModal
          cell={inspectedCell}
          onClose={() => {
            setInspectedCell(null);
            if (typeof window !== 'undefined' && window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
          onZoomIntoCell={(x, y) => {
            centerOnCell(x, y, 256);
            setInspectedCell(null);
            if (typeof window !== 'undefined' && window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
          onClaimNeighbor={(nx, ny) => {
            setInspectedCell(null);
            setEditingCellCoord({ x: nx, y: ny });
            if (typeof window !== 'undefined' && window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
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
              centerOnCell(newCell.x, newCell.y, 256);
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
            centerOnCell(x, y, 192);
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
