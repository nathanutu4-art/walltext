'use client';

import React, { useRef, useEffect } from 'react';
import { ViewportState, CanvasCell, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/canvas';
import { CanvasRenderer } from '@/lib/canvas-renderer';
import { Compass } from 'lucide-react';

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
  // 16:9 aspect ratio matching 1920x1080
  const minimapWidth = 160;
  const minimapHeight = 90;

  useEffect(() => {
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
  }, [viewport, cells]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cellX = Math.round((clickX / minimapWidth) * CANVAS_WIDTH);
    const cellY = Math.round((clickY / minimapHeight) * CANVAS_HEIGHT);

    onTeleportToCell(
      Math.max(0, Math.min(CANVAS_WIDTH - 1, cellX)),
      Math.max(0, Math.min(CANVAS_HEIGHT - 1, cellY))
    );
  };

  return (
    <div className="hidden sm:block absolute bottom-5 right-5 z-20">
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000000] overflow-hidden">
        {/* Yellow Header Ribbon */}
        <div className="bg-[#fbbf24] border-b-2 border-black px-2 py-1 flex items-center justify-between text-[9px] font-pixel text-black font-bold">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-black" /> RADAR PETA
          </span>
          <span className="font-mono">1920x1080</span>
        </div>
        <div className="relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={minimapWidth}
            height={minimapHeight}
            onClick={handleMinimapClick}
            title="Klik untuk berpindah posisi kamera"
          />
        </div>
      </div>
    </div>
  );
};
