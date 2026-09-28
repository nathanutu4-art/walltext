'use client';

import React from 'react';
import {
  Home,
  HelpCircle,
  Search,
  PlusCircle,
  Tv,
} from 'lucide-react';
import { INITIAL_SPAWN_X, INITIAL_SPAWN_Y } from '@/lib/seed-data';

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onResetView?: (x: number, y: number) => void;
  selectedCell: { x: number; y: number } | null;
  totalClaimed: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenSearch,
  onOpenHelp,
  onResetView,
  selectedCell,
  totalClaimed,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-5 flex items-center justify-between">
      {/* Brand: Retro Computer Monitor Icon + PixelCraft Title */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-white border-2 border-black px-3.5 py-2 shadow-[3px_3px_0px_#000000]">
        {/* Pixel Monitor Icon */}
        <div className="w-6 h-6 bg-[#fbbf24] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000000]">
          <Tv className="w-3.5 h-3.5 text-black" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs sm:text-sm font-bold tracking-wider text-black">
              PixelCraft
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-600 hidden sm:inline">
            Infinite Message Canvas &bull; {totalClaimed} karya
          </span>
        </div>
      </div>

      {/* Right Navigation Group (Exactly matching the Reference Image) */}
      <div className="pointer-events-auto flex items-center -space-x-[2px] shadow-[3px_3px_0px_#000000]">
        {/* Home Button (Active / Yellow style from reference) */}
        <button
          onClick={() => onResetView && onResetView(INITIAL_SPAWN_X, INITIAL_SPAWN_Y)}
          title="Ke Pusat Canvas (Home)"
          className="flex items-center gap-1.5 px-3 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-2 border-black font-pixel text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Home</span>
        </button>

        {/* Claim / Create Button (Works) */}
        <button
          onClick={onOpenCreate}
          title="Klaim Slot / Buat Karya Baru"
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[11px] font-bold transition-colors cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">
            {selectedCell ? `Klaim (${selectedCell.x}, ${selectedCell.y})` : 'Klaim'}
          </span>
        </button>

        {/* Teleport / Search Button (Blog / Search) */}
        <button
          onClick={onOpenSearch}
          title="Cari Pesan atau Teleport Koordinat"
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Teleport</span>
        </button>

        {/* Help / Guide Button (About) */}
        <button
          onClick={onOpenHelp}
          title="Panduan Aplikasi"
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-black border-2 border-black font-pixel text-[11px] font-bold transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">About</span>
        </button>
      </div>
    </header>
  );
};
