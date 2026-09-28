'use client';

import React from 'react';
import { Plus, Minus, Home, Search, Maximize2, Minimize2 } from 'lucide-react';
import { INITIAL_SPAWN_X, INITIAL_SPAWN_Y } from '@/lib/seed-data';

interface ControlsOverlayProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: (x?: number, y?: number) => void;
  onOpenSearch: () => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenSearch,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="absolute bottom-5 left-5 z-20 flex flex-col gap-2">
      {/* Search / Teleport button */}
      <button
        onClick={onOpenSearch}
        title="Cari Pesan atau Teleport Koordinat (Ctrl+K)"
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#fbbf24] text-black border-2 border-black shadow-[3px_3px_0px_#000000] font-pixel text-[10px] font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer group"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Cari / Teleport</span>
        <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] bg-slate-100 border border-black font-mono">
          /
        </kbd>
      </button>

      {/* Floating Control Bar */}
      <div className="flex items-center bg-white border-2 border-black shadow-[4px_4px_0px_#000000] text-black -space-x-[2px]">
        <button
          onClick={onZoomIn}
          title="Zoom In (+)"
          className="p-2.5 hover:bg-[#fbbf24] border-r-2 border-black transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={onZoomOut}
          title="Zoom Out (-)"
          className="p-2.5 hover:bg-[#fbbf24] border-r-2 border-black transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => onResetView(INITIAL_SPAWN_X, INITIAL_SPAWN_Y)}
          title="Kembali ke Pusat Genesis (960, 540)"
          className="p-2.5 hover:bg-[#fbbf24] border-r-2 border-black transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
          className="p-2.5 hover:bg-[#fbbf24] transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
