'use client';

import React, { useState } from 'react';
import {
  Home,
  HelpCircle,
  Search,
  PlusCircle,
  Tv,
  Eye,
  Layers,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { LodMode, MICRO_LOD_THRESHOLD, CanvasCell } from '@/types/canvas';
import { INITIAL_SPAWN_X, INITIAL_SPAWN_Y } from '@/lib/seed-data';

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onResetView?: (x: number, y: number) => void;
  selectedCell: { x: number; y: number } | null;
  selectedCellData?: CanvasCell | null;
  onInspectCell?: (cell: CanvasCell) => void;
  cursorCell: { x: number; y: number } | null;
  cellSize: number;
  lodMode: LodMode;
  isLive: boolean;
  totalClaimed: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenSearch,
  onOpenHelp,
  onResetView,
  selectedCell,
  selectedCellData,
  onInspectCell,
  cursorCell,
  cellSize,
  lodMode,
  isLive,
  totalClaimed,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!cursorCell) return;
    const text = `${cursorCell.x}, ${cursorCell.y}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const zoomPercent = Math.round((cellSize / MICRO_LOD_THRESHOLD) * 100);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-1.5 sm:p-3.5 flex items-center justify-between gap-1 sm:gap-2 overflow-x-hidden">
      {/* Left Info Group (1 Single Compact Row: Logo + POS + LOD + Slot Count) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Compact PixelCraft Logo */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white border-2 border-black px-1.5 py-1 sm:px-2 shadow-[2px_2px_0px_#000000]">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#fbbf24] border border-black flex items-center justify-center shadow-[1px_1px_0px_#000000]">
            <Tv className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-black" />
          </div>
          <span className="font-pixel text-[9px] sm:text-xs font-bold tracking-wider text-black">
            PixelCraft
          </span>
        </div>

        {/* POS Coordinate Box */}
        <div className="pointer-events-auto flex items-center gap-1 px-1.5 py-1 sm:px-2 bg-white border-2 border-black text-black text-xs font-mono shadow-[2px_2px_0px_#000000]">
          <span className="bg-[#fbbf24] px-0.5 sm:px-1 py-0.2 border border-black text-[7px] sm:text-[8px] font-pixel font-bold">
            POS
          </span>
          <span className="font-pixel text-[8px] sm:text-[10px] font-bold">
            {cursorCell ? `X:${cursorCell.x} Y:${cursorCell.y}` : 'X:--- Y:---'}
          </span>
          {cursorCell && (
            <button
              onClick={handleCopy}
              title="Salin Koordinat"
              className="p-0.5 hover:bg-slate-200 transition-colors text-black cursor-pointer"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>

        {/* LOD Mode Badge */}
        <div
          className={`pointer-events-auto hidden md:flex items-center gap-1 px-2 py-1 border-2 border-black text-[9px] font-pixel font-bold shadow-[2px_2px_0px_#000000] ${
            lodMode === 'micro'
              ? 'bg-[#fbbf24] text-black'
              : 'bg-white text-black'
          }`}
        >
          {lodMode === 'micro' ? (
            <>
              <Eye className="w-3 h-3 text-black" />
              <span>MIKRO</span>
            </>
          ) : (
            <>
              <Layers className="w-3 h-3 text-black" />
              <span>MAKRO ({zoomPercent}%)</span>
            </>
          )}
        </div>

        {/* Claimed Slots Count Badge */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-1 px-2 py-1 bg-[#f87171] text-white border-2 border-black text-[9px] font-pixel font-bold shadow-[2px_2px_0px_#000000]">
          <Radio className={`w-2.5 h-2.5 ${isLive ? 'text-yellow-200 animate-pulse' : 'text-white'}`} />
          <span>{totalClaimed.toLocaleString()} Slot</span>
        </div>
      </div>

      {/* Right Navigation Group */}
      <div className="pointer-events-auto flex items-center -space-x-[2px] shadow-[2px_2px_0px_#000000]">
        {/* Home Button */}
        <button
          onClick={() => onResetView && onResetView(INITIAL_SPAWN_X, INITIAL_SPAWN_Y)}
          title="Ke Pusat Canvas (Home)"
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Home className="w-3 h-3" />
          <span className="hidden md:inline">Home</span>
        </button>

        {/* Claim / Create or Inspect Button */}
        {selectedCellData ? (
          <button
            onClick={() => onInspectCell && onInspectCell(selectedCellData)}
            title="Lihat Detail Karya Slot Ini"
            className="flex items-center gap-1 px-2 py-1 sm:px-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer shadow-[1px_1px_0px_#000000]"
          >
            <Eye className="w-3 h-3 text-amber-600" />
            <span className="sm:hidden">Lihat</span>
            <span className="hidden sm:inline">
              Lihat ({selectedCell?.x}, {selectedCell?.y})
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenCreate}
            title={selectedCell ? `Klaim Slot (${selectedCell.x}, ${selectedCell.y})` : 'Klaim Slot Baru'}
            className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 text-black border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer ${
              selectedCell ? 'bg-[#fbbf24] hover:bg-[#f59e0b] shadow-[2px_2px_0px_#000000]' : 'bg-white hover:bg-slate-100 shadow-[1px_1px_0px_#000000]'
            }`}
          >
            <PlusCircle className={`w-3 h-3 ${selectedCell ? 'text-black' : 'text-amber-600'}`} />
            <span className="sm:hidden">Klaim</span>
            <span className="hidden sm:inline">
              {selectedCell ? `Klaim (${selectedCell.x}, ${selectedCell.y})` : 'Klaim'}
            </span>
          </button>
        )}

        {/* Teleport / Search Button */}
        <button
          onClick={onOpenSearch}
          title="Cari Pesan atau Teleport Koordinat"
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3" />
          <span className="hidden md:inline">Teleport</span>
        </button>

        {/* Help / Guide Button */}
        <button
          onClick={onOpenHelp}
          title="Panduan Aplikasi"
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          <span className="hidden md:inline">About</span>
        </button>
      </div>
    </header>
  );
};
