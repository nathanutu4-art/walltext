'use client';

import React from 'react';
import { LodMode, MICRO_LOD_THRESHOLD } from '@/types/canvas';
import { Eye, Layers, Copy, Check, Radio } from 'lucide-react';

interface CoordinateHudProps {
  cursorCell: { x: number; y: number } | null;
  cellSize: number;
  lodMode: LodMode;
  isLive: boolean;
  totalClaimed: number;
  onCopyCoord?: (text: string) => void;
}

export const CoordinateHud: React.FC<CoordinateHudProps> = ({
  cursorCell,
  cellSize,
  lodMode,
  isLive,
  totalClaimed,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!cursorCell) return;
    const text = `${cursorCell.x}, ${cursorCell.y}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const zoomPercent = Math.round((cellSize / MICRO_LOD_THRESHOLD) * 100);

  return (
    <div className="absolute top-18 sm:top-20 left-3 sm:left-5 z-20 flex flex-wrap items-center gap-2 pointer-events-none select-none">
      {/* Coordinate Box (Neo-Brutalist) */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black text-black text-xs font-mono shadow-[3px_3px_0px_#000000] pointer-events-auto">
        <span className="bg-[#fbbf24] px-1 py-0.5 border border-black text-[9px] font-pixel font-bold">
          POS
        </span>
        <span className="font-pixel text-[10px] font-bold">
          {cursorCell ? `X:${cursorCell.x} Y:${cursorCell.y}` : 'X:--- Y:---'}
        </span>
        {cursorCell && (
          <button
            onClick={handleCopy}
            title="Salin Koordinat"
            className="p-0.5 hover:bg-slate-200 transition-colors text-black cursor-pointer border border-transparent hover:border-black"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* LOD Mode Badge */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black text-[10px] font-pixel font-bold shadow-[3px_3px_0px_#000000] pointer-events-auto ${
          lodMode === 'micro'
            ? 'bg-[#fbbf24] text-black'
            : 'bg-white text-black'
        }`}
      >
        {lodMode === 'micro' ? (
          <>
            <Eye className="w-3 h-3 text-black" />
            <span>MODE MIKRO</span>
          </>
        ) : (
          <>
            <Layers className="w-3 h-3 text-black" />
            <span>MODE MAKRO ({zoomPercent}%)</span>
          </>
        )}
      </div>

      {/* Claimed Slots Count Badge (Coral Red like "20+ Projects" in reference image) */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f87171] text-white border-2 border-black text-[10px] font-pixel font-bold shadow-[3px_3px_0px_#000000] pointer-events-auto">
        <Radio className={`w-3 h-3 ${isLive ? 'text-yellow-200 animate-pulse' : 'text-white'}`} />
        <span>{totalClaimed.toLocaleString()} Slot Terisi</span>
      </div>
    </div>
  );
};
