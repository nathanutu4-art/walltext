'use client';

import React, { useState, useEffect } from 'react';
import { CanvasCell, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/canvas';
import { canvasStorage } from '@/lib/storage';
import {
  Search,
  X,
  Navigation,
  MapPin,
  Compass,
  ArrowRight,
} from 'lucide-react';

interface TeleportSearchModalProps {
  onClose: () => void;
  onTeleport: (x: number, y: number) => void;
}

export const TeleportSearchModal: React.FC<TeleportSearchModalProps> = ({
  onClose,
  onTeleport,
}) => {
  const [query, setQuery] = useState('');
  const [targetX, setTargetX] = useState<string>('960');
  const [targetY, setTargetY] = useState<string>('540');
  const [searchResults, setSearchResults] = useState<CanvasCell[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await canvasStorage.searchCells(query);
      setSearchResults(res);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleCoordinateTeleport = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(targetX, 10);
    const y = parseInt(targetY, 10);
    if (!isNaN(x) && !isNaN(y)) {
      const clampedX = Math.max(0, Math.min(CANVAS_WIDTH - 1, x));
      const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT - 1, y));
      onTeleport(clampedX, clampedY);
      onClose();
    }
  };

  const handleSelectResult = (x: number, y: number) => {
    onTeleport(x, y);
    onClose();
  };

  const QUICK_LANDMARKS = [
    { name: 'Genesis Origin', x: 960, y: 540, color: '#3b82f6' },
    { name: 'Neon Heart', x: 961, y: 540, color: '#ec4899' },
    { name: 'Emerald Tree', x: 959, y: 540, color: '#10b981' },
    { name: 'Golden Sun', x: 960, y: 541, color: '#f59e0b' },
    { name: 'Pojok Kiri (0,0)', x: 0, y: 0, color: '#64748b' },
    { name: 'Pojok Kanan Bawah', x: 1919, y: 1079, color: '#64748b' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white border-3 border-black shadow-[8px_8px_0px_#000000] text-black flex flex-col overflow-hidden">
        {/* Header - Yellow Pixel Banner */}
        <div className="bg-[#fbbf24] border-b-2 border-black p-3 sm:p-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-black" />
            <h3 className="font-pixel text-[11px] sm:text-xs font-bold text-black">TELEPORT & CARI PESAN</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-white hover:bg-[#f87171] hover:text-white transition-colors shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 overflow-y-auto">
          {/* Coordinate Jump Form */}
          <form
            onSubmit={handleCoordinateTeleport}
            className="flex flex-col gap-2 p-3 bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000000]"
          >
            <span className="text-[10px] font-pixel text-black flex items-center gap-1.5 font-bold">
              <Compass className="w-3 h-3 text-black" /> Lompat ke Koordinat (X: 0-1919, Y: 0-1079):
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border-2 border-black px-2.5 py-1 shadow-[1px_1px_0px_#000000]">
                <span className="text-[10px] font-pixel text-slate-500 mr-2">X:</span>
                <input
                  type="number"
                  min="0"
                  max={CANVAS_WIDTH - 1}
                  value={targetX}
                  onChange={(e) => setTargetX(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-black focus:outline-none"
                />
              </div>
              <div className="flex-1 flex items-center bg-white border-2 border-black px-2.5 py-1 shadow-[1px_1px_0px_#000000]">
                <span className="text-[10px] font-pixel text-slate-500 mr-2">Y:</span>
                <input
                  type="number"
                  min="0"
                  max={CANVAS_HEIGHT - 1}
                  value={targetY}
                  onChange={(e) => setTargetY(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-black focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black text-black font-pixel text-[10px] font-bold shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Lompat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Quick Landmarks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-pixel text-slate-700 font-bold">Lokasi Populer:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LANDMARKS.map((lm) => (
                <button
                  key={lm.name}
                  onClick={() => handleSelectResult(lm.x, lm.y)}
                  className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#fbbf24] border-2 border-black font-pixel text-[9px] text-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 border border-black inline-block" style={{ backgroundColor: lm.color }} />
                  <span>{lm.name}</span>
                  <span className="text-[8px] font-mono text-slate-500">({lm.x},{lm.y})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Full Text Search for Messages */}
          <div className="flex flex-col gap-2 pt-2 border-t-2 border-black">
            <span className="text-[10px] font-pixel text-black font-bold flex items-center gap-1">
              <Search className="w-3 h-3 text-black" /> Cari Isi Pesan / Pembuat:
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-black absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Contoh: 'welcome', 'cat', 'seed'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-black text-xs font-mono text-black placeholder-slate-400 focus:outline-none focus:bg-amber-50 shadow-[2px_2px_0px_#000000]"
              />
            </div>

            {/* Search Results List */}
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {isSearching && (
                <div className="text-[10px] font-pixel text-slate-500 py-2 text-center">Mencari...</div>
              )}
              {!isSearching && query.trim() && searchResults.length === 0 && (
                <div className="text-[10px] font-pixel text-slate-500 py-2 text-center">
                  Tidak ditemukan: &ldquo;{query}&rdquo;
                </div>
              )}
              {searchResults.map((cell) => (
                <div
                  key={`${cell.x},${cell.y}`}
                  onClick={() => handleSelectResult(cell.x, cell.y)}
                  className="flex items-center justify-between p-2 bg-white hover:bg-[#fbbf24] border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 border border-black shrink-0"
                      style={{ backgroundColor: cell.dominant_color }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-mono font-bold text-black truncate">
                        {cell.message_text || '(Doodle Tanpa Teks)'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">
                        oleh {cell.author_name || 'Anon'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-black font-bold shrink-0 ml-2">
                    <MapPin className="w-3 h-3 text-black" />
                    <span>({cell.x}, {cell.y})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
