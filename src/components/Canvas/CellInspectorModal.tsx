'use client';

import React, { useRef, useEffect } from 'react';
import { CanvasCell, NORMALIZED_COORD_SPACE } from '@/types/canvas';
import { X, User, Calendar, MapPin, Share2, Check, ZoomIn, Sparkles } from 'lucide-react';

interface CellInspectorModalProps {
  cell: CanvasCell;
  onClose: () => void;
  onZoomIntoCell: (x: number, y: number) => void;
  onClaimNeighbor?: (x: number, y: number) => void;
}

export const CellInspectorModal: React.FC<CellInspectorModalProps> = ({
  cell,
  onClose,
  onZoomIntoCell,
  onClaimNeighbor,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = cell.vector_data?.bg || '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const scale = size / NORMALIZED_COORD_SPACE;

    // Render strokes safely
    if (cell.vector_data?.strokes) {
      for (const stroke of cell.vector_data.strokes) {
        if (!stroke || !stroke.points || stroke.points.length === 0) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = Math.max(1, (stroke.width || 4) * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const first = stroke.points[0];
        if (!first) continue;
        ctx.moveTo(first.x * scale, first.y * scale);
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          if (pt) {
            ctx.lineTo(pt.x * scale, pt.y * scale);
          }
        }
        ctx.stroke();
      }
    }

    // Render texts
    if (cell.vector_data?.texts) {
      for (const textItem of cell.vector_data.texts) {
        if (!textItem || !textItem.text) continue;
        const fontSize = Math.max(12, (textItem.size || 18) * scale);
        ctx.font = `700 ${fontSize}px var(--font-pixel), monospace`;
        ctx.fillStyle = textItem.color || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textItem.text, (textItem.x || 0) * scale, (textItem.y || 0) * scale);
      }
    }
  }, [cell]);

  const handleShare = () => {
    const url = `${window.location.origin}/#${cell.x},${cell.y}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = cell.created_at
    ? new Date(cell.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Baru saja';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border-3 border-black shadow-[8px_8px_0px_#000000] text-black flex flex-col overflow-hidden">
        {/* Header - Yellow Pixel Banner */}
        <div className="bg-[#fbbf24] border-b-2 border-black p-3 sm:p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 border-2 border-black shadow-[1px_1px_0px_#000000]"
              style={{ backgroundColor: cell.dominant_color }}
            />
            <h3 className="font-pixel text-xs font-bold text-black flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-black" />
              SLOT ({cell.x}, {cell.y})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-white hover:bg-[#f87171] hover:text-white transition-colors shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* 1:1 Vector Preview */}
          <div className="relative aspect-square w-full border-3 border-black shadow-[4px_4px_0px_#000000] bg-white flex items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              width={384}
              height={384}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-white border border-black text-[9px] font-pixel text-black shadow-[1px_1px_0px_#000000]">
              1:1 Vektor
            </div>
          </div>

          {/* Details & Quote */}
          <div className="flex flex-col gap-2">
            {cell.message_text ? (
              <div className="p-3 bg-slate-50 border-2 border-black text-xs font-mono text-black shadow-[2px_2px_0px_#000000]">
                &ldquo;{cell.message_text}&rdquo;
              </div>
            ) : (
              <div className="text-[10px] font-pixel text-slate-500 italic">Tanpa kutipan teks</div>
            )}

            <div className="flex items-center justify-between text-[10px] font-pixel text-slate-600 pt-1 border-t border-slate-300">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-black" />
                <span className="text-black font-bold">{cell.author_name || 'Anon'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-black" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onZoomIntoCell(cell.x, cell.y)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black font-pixel text-[10px] font-bold text-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Zoom Mikro
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 border-2 border-black font-pixel text-[10px] font-bold text-black shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>
          </div>

          {onClaimNeighbor && (
            <button
              onClick={() => onClaimNeighbor(cell.x + 1, cell.y)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-amber-100 border-2 border-black font-pixel text-[10px] font-bold text-black shadow-[2px_2px_0px_#000000] cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Klaim slot di sebelah ({cell.x + 1}, {cell.y})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

