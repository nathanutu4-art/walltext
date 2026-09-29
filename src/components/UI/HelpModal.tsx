'use client';

import React from 'react';
import { X, Layers, Eye, MousePointer, Sparkles, Database } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
  isSupabaseConfigured: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose, isSupabaseConfigured }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border-3 border-black shadow-[8px_8px_0px_#000000] text-black flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header - Yellow Pixel Banner */}
        <div className="bg-[#fbbf24] border-b-2 border-black p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-black" />
            <h3 className="font-pixel text-xs font-bold text-black">PANDUAN TEMBOK RATAPAN</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-white hover:bg-[#f87171] hover:text-white transition-colors shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-black">
          {/* Intro Box */}
          <div className="p-3 bg-amber-50 border-2 border-black shadow-[2px_2px_0px_#000000] flex gap-3">
            <span className="text-xl">👾</span>
            <div>
              <h4 className="font-pixel text-[10px] font-bold text-black mb-1">
                Kanvas 1920 x 1080 (2.07 Juta Slot)
              </h4>
              <p className="text-[11px] font-mono leading-relaxed text-slate-800">
                Tiap 1 koordinat (0-1919, 0-1079) adalah halaman 1:1 tempat Anda bisa menggambar doodle pixel art atau menulis pesan abadi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Macro Mode */}
            <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-pixel text-[10px] font-bold text-black">
                <Layers className="w-3.5 h-3.5" />
                <span>Mode Makro (Jauh)</span>
              </div>
              <p className="text-[10px] font-mono text-slate-700 leading-relaxed">
                Zoom &lt; 32px: Slot dirender sebagai 1 blok warna dominan. Memungkinkan melihat mural raksasa secara utuh pada 60 FPS.
              </p>
            </div>

            {/* Micro Mode */}
            <div className="p-3 bg-[#fbbf24] border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-pixel text-[10px] font-bold text-black">
                <Eye className="w-3.5 h-3.5" />
                <span>Mode Mikro (Dekat)</span>
              </div>
              <p className="text-[10px] font-mono text-black leading-relaxed">
                Zoom &ge; 32px: Seluruh goresan kuas, teks pesan, dan detail halaman 1:1 dirender tajam berbasis vektor native.
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="p-3 bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-pixel text-[10px] font-bold text-black">
              <MousePointer className="w-3.5 h-3.5" />
              <span>Cara Navigasi</span>
            </div>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-800">
              <li><strong>Geser (Pan):</strong> Klik-kiri & tahan lalu drag (desktop) atau sentuh & geser (HP).</li>
              <li><strong>Perbesar (Zoom):</strong> Putar scroll wheel mouse atau pinch layar sentuh.</li>
              <li><strong>Klaim Slot:</strong> Klik slot koordinat kosong untuk membuka Editor 1:1.</li>
              <li><strong>Inspeksi:</strong> Klik slot yang sudah terisi untuk melihat karya resolusi tinggi.</li>
            </ul>
          </div>

          {/* Supabase Status Note */}
          <div className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0px_#000000] text-[10px] font-pixel flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-black" />
              <span>Status:</span>
            </div>
            <span className={`px-2 py-0.5 border border-black font-bold ${
              isSupabaseConfigured
                ? 'bg-emerald-300 text-black'
                : 'bg-[#fbbf24] text-black'
            }`}>
              {isSupabaseConfigured ? 'Supabase Realtime' : 'Offline Multi-Tab'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black font-pixel text-[10px] font-bold shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            Mulai Eksplorasi
          </button>
        </div>
      </div>
    </div>
  );
};
