'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ViewportState, CanvasCell, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/canvas';
import { CanvasRenderer } from '@/lib/canvas-renderer';
import { Compass, Minimize2 } from 'lucide-react';

interface CanvasMinimapProps {
  viewport: ViewportState;
  cells: CanvasCell[];
  onTeleportToCell: (x: number, y: number) => void;
}

export const CanvasMinimap: React.FC<CanvasMinimapProps> = ({
  viewport,
  cells,
  onTeleportToCell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Internal buffer resolution (16:9 aspect ratio matching 1920x1080)
  const minimapWidth = 160;
  const minimapHeight = 90;

  useEffect(() => {
    if (isCollapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear white paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);

    // Subtle grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(minimapWidth / 2, 0);
    ctx.lineTo(minimapWidth / 2, minimapHeight);
    ctx.moveTo(0, minimapHeight / 2);
    ctx.lineTo(minimapWidth, minimapHeight / 2);
    ctx.stroke();

    // Scale from 1920x1080 to 160x90
    const scaleX = minimapWidth / CANVAS_WIDTH;
    const scaleY = minimapHeight / CANVAS_HEIGHT;

    // Draw claimed cells as colored pixel dots
    for (const cell of cells) {
      const mx = cell.x * scaleX;
      const my = cell.y * scaleY;
      ctx.fillStyle = CanvasRenderer.getCellDominantColor(cell);
      ctx.fillRect(Math.floor(mx), Math.floor(my), 2, 2);
    }

    // Draw current camera viewport box (Retro black frame with yellow tint)
    const { offsetX, offsetY, cellSize, width, height } = viewport;
    const camX1 = (-offsetX / cellSize) * scaleX;
    const camY1 = (-offsetY / cellSize) * scaleY;
    const camW = (width / cellSize) * scaleX;
    const camH = (height / cellSize) * scaleY;

    ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.fillRect(camX1, camY1, Math.max(4, camW), Math.max(4, camH));

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(camX1, camY1, Math.max(4, camW), Math.max(4, camH));
  }, [viewport, cells, isCollapsed]);

  const handleInteraction = (clientX: number, clientY: number, target: HTMLCanvasElement) => {
    const rect = target.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const clickY = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const cellX = Math.round((clickX / rect.width) * CANVAS_WIDTH);
    const cellY = Math.round((clickY / rect.height) * CANVAS_HEIGHT);

    onTeleportToCell(
      Math.max(0, Math.min(CANVAS_WIDTH - 1, cellX)),
      Math.max(0, Math.min(CANVAS_HEIGHT - 1, cellY))
    );
  };

  if (isCollapsed) {
    return (
      <div className="absolute bottom-[18vh] sm:bottom-5 right-3 sm:right-5 z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Buka Radar Peta"
          className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-2 border-black shadow-[3px_3px_0px_#000000] font-pixel text-[9px] font-bold active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-black" />
          <span>RADAR</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-[18vh] sm:bottom-5 right-3 sm:right-5 z-20">
      <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000000] sm:shadow-[4px_4px_0px_#000000] overflow-hidden">
        {/* Yellow Header Ribbon */}
        <div className="bg-[#fbbf24] border-b-2 border-black px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center justify-between text-[8px] sm:text-[9px] font-pixel text-black font-bold select-none">
          <span className="flex items-center gap-1">
            <Compass className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" /> RADAR
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[7px] sm:text-[8px] text-slate-800 hidden min-[380px]:inline">1920x1080</span>
            <button
              onClick={() => setIsCollapsed(true)}
              title="Kecilkan Radar"
              className="p-0.5 hover:bg-black/15 border border-transparent hover:border-black cursor-pointer ml-1 leading-none"
            >
              <Minimize2 className="w-2.5 h-2.5 text-black" />
            </button>
          </div>
        </div>
        <div className="relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={minimapWidth}
            height={minimapHeight}
            className="w-[124px] h-[70px] sm:w-[160px] sm:h-[90px] block cursor-crosshair touch-none select-none"
            onClick={(e) => handleInteraction(e.clientX, e.clientY, e.currentTarget)}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (e.touches[0]) handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              if (e.touches[0]) handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
            }}
            title="Ketuk atau geser untuk berpindah posisi kamera"
          />
        </div>
      </div>
    </div>
  );
};
