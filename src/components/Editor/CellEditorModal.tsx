'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  CanvasStroke,
  CanvasText,
  VectorData,
  CanvasCell,
  NORMALIZED_COORD_SPACE,
} from '@/types/canvas';
import {
  X,
  Paintbrush,
  Type,
  Eraser,
  RotateCcw,
  Sparkles,
  Palette,
  Send,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  Trash2,
  Edit3,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CellEditorModalProps {
  coord: { x: number; y: number };
  onClose: () => void;
  onSave: (cell: CanvasCell) => Promise<{ success: boolean; error?: string }>;
}

const BG_PRESETS = [
  { name: 'Cosmic Dark', color: '#0f172a' },
  { name: 'Midnight', color: '#020617' },
  { name: 'Cyber Green', color: '#022c22' },
  { name: 'Deep Purple', color: '#1e1035' },
  { name: 'Warm Noir', color: '#1c1917' },
  { name: 'Crimson Night', color: '#2b0914' },
  { name: 'Crisp White', color: '#f8fafc' },
];

const COLOR_PRESETS = [
  '#ffffff',
  '#38bdf8', // cyan
  '#34d399', // emerald
  '#f43f5e', // rose
  '#fbbf24', // amber
  '#c084fc', // purple
  '#fb923c', // orange
  '#0f172a', // dark
];

export const CellEditorModal: React.FC<CellEditorModalProps> = ({
  coord,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tools state
  const [activeTool, setActiveTool] = useState<'brush' | 'text' | 'eraser'>('brush');
  const [brushColor, setBrushColor] = useState<string>('#38bdf8');
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [bgColor, setBgColor] = useState<string>('#0f172a');

  // Vector data
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [texts, setTexts] = useState<CanvasText[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<CanvasStroke | null>(null);

  // Text Tool inputs & on-canvas direct writing state
  const [inputText, setInputText] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<string>('pixel');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [onCanvasTextPos, setOnCanvasTextPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverTextPos, setHoverTextPos] = useState<{ x: number; y: number } | null>(null);
  const [editingTextIndex, setEditingTextIndex] = useState<number | null>(null);

  // Metadata inputs
  const [messageCaption, setMessageCaption] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [dominantColor, setDominantColor] = useState<string>('#38bdf8');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const CANVAS_DISPLAY_SIZE = 384; // 384x384px interactive display
  const scale = CANVAS_DISPLAY_SIZE / NORMALIZED_COORD_SPACE; // ~1.5

  const getResolvedFont = useCallback((font?: string) => {
    if (font === 'pixel') return 'var(--font-pixel), monospace';
    if (font === 'vt323') return 'var(--font-mono-pixel), monospace';
    if (font === 'monospace') return 'monospace';
    if (font === 'serif') return 'serif';
    return font || 'sans-serif';
  }, []);

  // Commit text from in-place on-canvas editor or sidebar
  const commitText = useCallback(() => {
    if (!inputText.trim()) {
      if (editingTextIndex !== null) {
        setTexts((prev) => prev.filter((_, i) => i !== editingTextIndex));
      }
      setOnCanvasTextPos(null);
      setEditingTextIndex(null);
      return;
    }

    const pos = onCanvasTextPos || { x: 128, y: 128 };
    const newTextItem: CanvasText = {
      text: inputText.trim(),
      x: pos.x,
      y: pos.y,
      size: fontSize,
      color: brushColor,
      font: fontFamily,
      align: textAlign,
    };

    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        updated[editingTextIndex] = newTextItem;
        return updated;
      });
    } else {
      setTexts((prev) => [...prev, newTextItem]);
    }

    if (!messageCaption.trim()) {
      setMessageCaption(inputText.trim());
    }

    setOnCanvasTextPos(null);
    setEditingTextIndex(null);
    setInputText('');
  }, [
    inputText,
    onCanvasTextPos,
    fontSize,
    brushColor,
    fontFamily,
    textAlign,
    editingTextIndex,
    messageCaption,
  ]);

  // Re-draw editor canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_DISPLAY_SIZE, CANVAS_DISPLAY_SIZE);

    // Draw all completed strokes safely
    for (const stroke of strokes) {
      if (!stroke || !stroke.points || stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = (stroke.width || 4) * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const first = stroke.points[0];
      if (!first) continue;
      ctx.moveTo(first.x * scale, first.y * scale);
      if (stroke.points.length === 1) {
        ctx.lineTo(first.x * scale + 0.1, first.y * scale + 0.1);
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          if (pt) {
            ctx.lineTo(pt.x * scale, pt.y * scale);
          }
        }
      }
      ctx.stroke();
    }

    // Draw current active stroke
    if (
      currentStrokeRef.current &&
      currentStrokeRef.current.points &&
      currentStrokeRef.current.points.length > 0
    ) {
      const cur = currentStrokeRef.current;
      ctx.beginPath();
      ctx.strokeStyle = cur.color || '#ffffff';
      ctx.lineWidth = (cur.width || 4) * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const first = cur.points[0];
      if (first) {
        ctx.moveTo(first.x * scale, first.y * scale);
        for (let i = 1; i < cur.points.length; i++) {
          const pt = cur.points[i];
          if (pt) {
            ctx.lineTo(pt.x * scale, pt.y * scale);
          }
        }
        ctx.stroke();
      }
    }

    // Draw all texts safely with multi-line support
    for (let idx = 0; idx < texts.length; idx++) {
      if (editingTextIndex === idx && onCanvasTextPos) continue;

      const textItem = texts[idx];
      if (!textItem || !textItem.text) continue;

      const fSize = Math.max(8, (textItem.size || 18) * scale);
      const fFace = getResolvedFont(textItem.font);
      ctx.font = `700 ${fSize}px ${fFace}, system-ui`;
      ctx.fillStyle = textItem.color || '#ffffff';
      ctx.textAlign = textItem.align || 'center';
      ctx.textBaseline = 'middle';

      const lines = textItem.text.split('\n');
      const lineHeight = fSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const tx = (textItem.x || 0) * scale;
      const ty = (textItem.y || 0) * scale;
      const startY = ty - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, tx, startY + i * lineHeight);
      });
    }

    // Live Hover Ghost Preview (when Text tool is active and no active in-place editor)
    if (
      activeTool === 'text' &&
      hoverTextPos &&
      !onCanvasTextPos &&
      inputText.trim()
    ) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      const fSize = Math.max(8, fontSize * scale);
      const fFace = getResolvedFont(fontFamily);
      ctx.font = `700 ${fSize}px ${fFace}, system-ui`;
      ctx.fillStyle = brushColor;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';

      const lines = inputText.split('\n');
      const lineHeight = fSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const tx = hoverTextPos.x * scale;
      const ty = hoverTextPos.y * scale;
      const startY = ty - totalHeight / 2 + lineHeight / 2;

      // Dashed yellow bounding box
      let maxLineWidth = 0;
      lines.forEach((line) => {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      const pad = 6;
      let boxX = tx - maxLineWidth / 2 - pad;
      if (textAlign === 'left') boxX = tx - pad;
      if (textAlign === 'right') boxX = tx - maxLineWidth - pad;
      const boxY = ty - totalHeight / 2 - pad;

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(boxX, boxY, maxLineWidth + pad * 2, totalHeight + pad * 2);

      lines.forEach((line, i) => {
        ctx.fillText(line, tx, startY + i * lineHeight);
      });

      ctx.restore();
    }
  }, [
    bgColor,
    strokes,
    texts,
    scale,
    activeTool,
    hoverTextPos,
    onCanvasTextPos,
    inputText,
    fontSize,
    fontFamily,
    brushColor,
    textAlign,
    editingTextIndex,
    getResolvedFont,
  ]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Update macro dominant color candidate whenever colors change
  useEffect(() => {
    const valid = strokes.filter((s) => s && s.color);
    if (valid.length > 0) {
      setDominantColor(valid[valid.length - 1].color);
    } else {
      setDominantColor(bgColor === '#0f172a' ? '#38bdf8' : bgColor);
    }
  }, [strokes, bgColor]);

  // Pointer event coordinate mapping (Normalized 0..255)
  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(255, Math.round((rawX / rect.width) * 255)));
    const normY = Math.max(0, Math.min(255, Math.round((rawY / rect.height) * 255)));
    return { x: normX, y: normY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e);

    if (activeTool === 'brush') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      currentStrokeRef.current = {
        color: brushColor,
        width: brushWidth,
        points: [pt],
      };
      redrawCanvas();
    } else if (activeTool === 'eraser') {
      e.currentTarget.setPointerCapture(e.pointerId);
      eraseNearbyStrokes(pt.x, pt.y);
    } else if (activeTool === 'text') {
      // Check if clicking near an existing text item to edit
      const clickedIdx = texts.findIndex(
        (t) => t && Math.hypot(t.x - pt.x, t.y - pt.y) < 22
      );

      if (clickedIdx >= 0) {
        const t = texts[clickedIdx];
        setEditingTextIndex(clickedIdx);
        setInputText(t.text);
        setFontSize(t.size || 18);
        setFontFamily(t.font || 'pixel');
        setBrushColor(t.color || '#fbbf24');
        setTextAlign(t.align || 'center');
        setOnCanvasTextPos({ x: t.x, y: t.y });
      } else {
        // Open on-canvas text editor at clicked coordinate
        setEditingTextIndex(null);
        setOnCanvasTextPos(pt);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e);

    if (activeTool === 'text') {
      setHoverTextPos(pt);
      return;
    }

    if (!isDrawing && activeTool !== 'eraser') return;

    if (activeTool === 'brush' && currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pt);
      redrawCanvas();
    } else if (activeTool === 'eraser' && (e.buttons === 1 || e.pressure > 0)) {
      eraseNearbyStrokes(pt.x, pt.y);
    }
  };

  const handlePointerLeave = () => {
    handlePointerUp();
    if (activeTool === 'text') {
      setHoverTextPos(null);
    }
  };

  const handlePointerUp = () => {
    // CRITICAL: Capture finished stroke synchronously in a local const
    // before clearing currentStrokeRef.current!
    if (
      activeTool === 'brush' &&
      currentStrokeRef.current &&
      currentStrokeRef.current.points &&
      currentStrokeRef.current.points.length > 0
    ) {
      const finishedStroke: CanvasStroke = {
        color: currentStrokeRef.current.color,
        width: currentStrokeRef.current.width,
        points: [...currentStrokeRef.current.points],
      };
      setStrokes((prev) => [...prev.filter((s) => s && s.points), finishedStroke]);
      currentStrokeRef.current = null;
    }
    setIsDrawing(false);
  };

  const eraseNearbyStrokes = (x: number, y: number) => {
    const threshold = 15; // Normalized distance
    setStrokes((prev) =>
      prev.filter((st) => {
        if (!st || !st.points) return false;
        return !st.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) < threshold
        );
      })
    );
    setTexts((prev) =>
      prev.filter((t) => t && Math.hypot(t.x - x, t.y - y) > threshold + 10)
    );
  };

  const handleReset = () => {
    currentStrokeRef.current = null;
    setStrokes([]);
    setTexts([]);
  };

  // Estimate payload size in KB
  const vectorData: VectorData = {
    bg: bgColor,
    strokes: strokes.filter((s) => s && s.points && s.points.length > 0),
    texts: texts.filter((t) => t && t.text),
  };
  const estimatedSizeKb = (
    new Blob([JSON.stringify(vectorData)]).size / 1024
  ).toFixed(2);

  const handleSubmit = async () => {
    if (strokes.length === 0 && texts.length === 0 && !messageCaption.trim()) {
      setErrorMessage('Silakan gambar goresan atau tambahkan teks pesan!');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const effectiveMessage =
      messageCaption.trim() ||
      texts.map((t) => t.text).filter(Boolean).join('\n') ||
      null;

    const cellPayload: CanvasCell = {
      x: coord.x,
      y: coord.y,
      dominant_color: dominantColor,
      vector_data: vectorData,
      message_text: effectiveMessage,
      author_name: authorName.trim() || 'Anon Explorer',
      created_at: new Date().toISOString(),
    };

    const res = await onSave(cellPayload);
    setIsSaving(false);

    if (res.success) {
      // Fire celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [dominantColor, '#38bdf8', '#34d399', '#f43f5e', '#fbbf24'],
      });
      onClose();
    } else {
      setErrorMessage(res.error || 'Gagal menyimpan karya.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border-3 border-black shadow-[8px_8px_0px_#000000] text-black flex flex-col my-auto overflow-hidden">
        {/* Header - Yellow Pixel Banner from Reference */}
        <div className="bg-[#fbbf24] border-b-2 border-black p-3.5 sm:p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-pixel font-bold text-black flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black" />
              EDITOR 1:1 &bull; SLOT ({coord.x}, {coord.y})
            </h2>
            <p className="text-[10px] font-mono text-black/80 mt-0.5">
              Buat karya doodle atau tinggalkan pesan abadi pada kanvas 1920x1080.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-white hover:bg-[#f87171] hover:text-white transition-colors shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="m-4 p-2.5 bg-[#f87171] border-2 border-black text-white text-[10px] font-pixel shadow-[2px_2px_0px_#000000]">
            {errorMessage}
          </div>
        )}

        {/* Workspace: Canvas + Controls */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* 1:1 Canvas Interactive Container */}
          <div className="md:col-span-7 flex flex-col items-center gap-2">
            <div className="relative border-3 border-black shadow-[5px_5px_0px_#000000] bg-white touch-none">
              <canvas
                ref={canvasRef}
                width={CANVAS_DISPLAY_SIZE}
                height={CANVAS_DISPLAY_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className={`w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] ${
                  activeTool === 'brush'
                    ? 'cursor-editor-crosshair'
                    : activeTool === 'text'
                    ? 'cursor-text'
                    : 'cursor-editor-crosshair'
                }`}
              />

              {/* Floating On-Canvas Direct Writing Editor */}
              {activeTool === 'text' && onCanvasTextPos && (
                <div
                  className="absolute z-20 flex flex-col items-center pointer-events-auto"
                  style={{
                    left: `${(onCanvasTextPos.x / 255) * 100}%`,
                    top: `${(onCanvasTextPos.y / 255) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    maxWidth: '92%',
                  }}
                >
                  <div className="bg-white/95 backdrop-blur-xs border-2 border-black shadow-[4px_4px_0px_#000000] p-2 flex flex-col gap-1.5 min-w-[220px]">
                    <div className="flex items-center justify-between text-[9px] font-pixel text-black font-bold pb-1 border-b border-black">
                      <span className="flex items-center gap-1">
                        <Type className="w-3 h-3 text-amber-600" />
                        {editingTextIndex !== null ? 'Edit Teks Kanvas' : 'Tulis di Kanvas'}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        POS: {onCanvasTextPos.x}, {onCanvasTextPos.y}
                      </span>
                    </div>

                    {/* Direct Textarea on canvas */}
                    <textarea
                      autoFocus
                      rows={3}
                      placeholder="Ketik langsung di sini... (Shift+Enter: baris baru)"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          commitText();
                        } else if (e.key === 'Escape') {
                          setOnCanvasTextPos(null);
                          setEditingTextIndex(null);
                        }
                      }}
                      style={{
                        color: brushColor,
                        fontFamily: getResolvedFont(fontFamily),
                        fontSize: `${Math.max(11, fontSize)}px`,
                        textAlign: textAlign,
                      }}
                      className="w-full bg-slate-900/95 text-white p-2 border border-black focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold placeholder-slate-400 text-xs resize-y"
                    />

                    {/* Buttons: Commit / Cancel / Delete */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {editingTextIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setTexts((prev) => prev.filter((_, i) => i !== editingTextIndex));
                            setOnCanvasTextPos(null);
                            setEditingTextIndex(null);
                            setInputText('');
                          }}
                          className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white font-pixel text-[9px] border border-black shadow-[1px_1px_0px_#000000] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Hapus
                        </button>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setOnCanvasTextPos(null);
                            setEditingTextIndex(null);
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-black font-pixel text-[9px] border border-black shadow-[1px_1px_0px_#000000] cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={commitText}
                          className="px-2.5 py-1 bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-pixel text-[9px] font-bold border border-black shadow-[1px_1px_0px_#000000] flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-2.5 h-2.5" /> Selesai
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white border border-black text-[9px] font-pixel text-black shadow-[1px_1px_0px_#000000]">
                0-255 Vektor &bull; {estimatedSizeKb} KB
              </div>
            </div>

            {/* Canvas Actions below canvas */}
            <div className="flex items-center justify-between w-full max-w-[360px] px-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-[10px] text-slate-700">MAKRO:</span>
                <span
                  className="w-4 h-4 border-2 border-black shadow-[1px_1px_0px_#000000] inline-block align-middle"
                  style={{ backgroundColor: dominantColor }}
                  title="Warna dominan yang tampil saat zoom Makro"
                />
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 font-pixel text-[10px] text-rose-600 hover:text-black hover:underline transition-colors cursor-pointer"
                title="Hapus semua goresan"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Kanvas
              </button>
            </div>
          </div>

          {/* Tools & Palette Panel */}
          <div className="md:col-span-5 flex flex-col gap-3.5">
            {/* Tool Selector Tabs */}
            <div className="flex -space-x-[2px] shadow-[3px_3px_0px_#000000]">
              <button
                onClick={() => setActiveTool('brush')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 border-2 border-black font-pixel text-[10px] font-bold transition-all cursor-pointer ${
                  activeTool === 'brush'
                    ? 'bg-[#fbbf24] text-black'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                <Paintbrush className="w-3 h-3" /> Kuas
              </button>
              <button
                onClick={() => setActiveTool('text')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 border-2 border-black font-pixel text-[10px] font-bold transition-all cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-[#fbbf24] text-black'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                <Type className="w-3 h-3" /> Teks
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 border-2 border-black font-pixel text-[10px] font-bold transition-all cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-[#fbbf24] text-black'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                <Eraser className="w-3 h-3" /> Hapus
              </button>
            </div>

            {/* Brush Controls */}
            {activeTool === 'brush' && (
              <div className="flex flex-col gap-2 p-3 bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center justify-between text-xs text-black">
                  <span className="flex items-center gap-1 font-pixel text-[10px] font-bold">
                    <Sliders className="w-3 h-3 text-black" /> Ketebalan:
                  </span>
                  <span className="font-pixel text-[10px] text-amber-700">{brushWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-full accent-black h-2 bg-slate-300 rounded-none cursor-pointer"
                />

                {/* Color Palette */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] font-pixel text-slate-700 flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Warna Kuas:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-6 h-6 border-2 border-black shadow-[1px_1px_0px_#000000] transition-transform ${
                          brushColor === c ? 'scale-115 ring-2 ring-black' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      title="Warna kustom"
                      className="w-6 h-6 border-2 border-black cursor-pointer bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Text Tool Controls */}
            {activeTool === 'text' && (
              <div className="flex flex-col gap-2.5 p-3 bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] text-black font-bold flex items-center gap-1">
                    <Type className="w-3 h-3 text-amber-600" /> Teks Pesan (Multi-baris)
                  </span>
                  <span className="text-[8px] font-pixel text-slate-500">
                    Klik kanvas untuk menulis
                  </span>
                </div>

                {/* Multi-line Textarea */}
                <textarea
                  rows={3}
                  placeholder="Ketik teks pesan Anda di sini...&#10;Mendukung multi-baris & teks panjang.&#10;Klik langsung di kanvas untuk menempatkan!"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black text-xs text-black font-mono placeholder-slate-400 focus:outline-none focus:bg-amber-50 shadow-[1px_1px_0px_#000000] resize-y"
                />

                {/* Typography Controls: Size & Font */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] font-pixel text-slate-700 block mb-0.5">Ukuran Teks</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full px-1.5 py-1 bg-white border-2 border-black text-[11px] text-black font-mono shadow-[1px_1px_0px_#000000]"
                    >
                      <option value={10}>10px Mikro</option>
                      <option value={14}>14px Kecil</option>
                      <option value={18}>18px Sedang</option>
                      <option value={24}>24px Besar</option>
                      <option value={32}>32px Ekstra</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-pixel text-slate-700 block mb-0.5">Gaya Font</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-1.5 py-1 bg-white border-2 border-black text-[11px] text-black font-mono shadow-[1px_1px_0px_#000000]"
                    >
                      <option value="pixel">Retro Pixel (Press Start)</option>
                      <option value="vt323">Arcade Mono (VT323)</option>
                      <option value="monospace">Clean Mono</option>
                      <option value="sans-serif">Modern Sans</option>
                      <option value="serif">Classic Serif</option>
                    </select>
                  </div>
                </div>

                {/* Alignment & Center Placement */}
                <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-pixel text-slate-600">Rata:</span>
                    <button
                      type="button"
                      onClick={() => setTextAlign('left')}
                      className={`p-1 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer ${
                        textAlign === 'left' ? 'bg-[#fbbf24]' : 'bg-white'
                      }`}
                      title="Rata Kiri"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign('center')}
                      className={`p-1 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer ${
                        textAlign === 'center' ? 'bg-[#fbbf24]' : 'bg-white'
                      }`}
                      title="Rata Tengah"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign('right')}
                      className={`p-1 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer ${
                        textAlign === 'right' ? 'bg-[#fbbf24]' : 'bg-white'
                      }`}
                      title="Rata Kanan"
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOnCanvasTextPos({ x: 128, y: 128 });
                      setEditingTextIndex(null);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-black border border-black font-pixel text-[9px] font-bold shadow-[1px_1px_0px_#000000] cursor-pointer"
                  >
                    Tulis di Tengah
                  </button>
                </div>

                {/* Color Palette for Text */}
                <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-pixel text-slate-700 flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Warna Teks:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-6 h-6 border-2 border-black shadow-[1px_1px_0px_#000000] transition-transform ${
                          brushColor === c ? 'scale-115 ring-2 ring-black' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      title="Warna kustom"
                      className="w-6 h-6 border-2 border-black cursor-pointer bg-transparent p-0"
                    />
                  </div>
                </div>

                {/* Placed Texts List */}
                {texts.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-slate-300">
                    <span className="text-[9px] font-pixel text-slate-700 font-bold">
                      Teks di Kanvas ({texts.length}):
                    </span>
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                      {texts.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white border border-black p-1 text-[10px] font-mono shadow-[1px_1px_0px_#000000]"
                        >
                          <span
                            className="truncate max-w-[130px] font-bold"
                            style={{ color: t.color }}
                          >
                            {t.text.replace(/\n/g, ' ')}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTextIndex(idx);
                                setInputText(t.text);
                                setFontSize(t.size);
                                setFontFamily(t.font || 'pixel');
                                setBrushColor(t.color);
                                setTextAlign(t.align || 'center');
                                setOnCanvasTextPos({ x: t.x, y: t.y });
                              }}
                              className="p-0.5 hover:bg-slate-200 border border-transparent hover:border-black cursor-pointer"
                              title="Edit Teks"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTexts((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-0.5 hover:bg-rose-100 border border-transparent hover:border-black cursor-pointer text-rose-600"
                              title="Hapus Teks"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Background Palette */}
            <div className="flex flex-col gap-1 p-2.5 bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000000]">
              <span className="font-pixel text-[10px] text-black font-bold">Warna Latar Halaman:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {BG_PRESETS.map((bg) => (
                  <button
                    key={bg.color}
                    onClick={() => setBgColor(bg.color)}
                    title={bg.name}
                    className={`w-6 h-6 border-2 border-black shadow-[1px_1px_0px_#000000] transition-transform ${
                      bgColor === bg.color ? 'scale-115 ring-2 ring-black' : ''
                    }`}
                    style={{ backgroundColor: bg.color }}
                  />
                ))}
              </div>
            </div>

            {/* Metadata: Message & Author */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="font-pixel text-[9px] text-slate-700 font-bold block mb-1">
                  Kutipan Pesan (Searchable)
                </label>
                <textarea
                  rows={2}
                  placeholder="Kutipan pesan pencarian (otomatis terisi dari teks kanvas jika kosong)..."
                  value={messageCaption}
                  onChange={(e) => setMessageCaption(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black text-xs text-black font-mono placeholder-slate-400 focus:outline-none focus:bg-amber-50 shadow-[1px_1px_0px_#000000] resize-y"
                />
              </div>

              <div>
                <label className="font-pixel text-[9px] text-slate-700 font-bold block mb-1">Nama Pembuat</label>
                <input
                  type="text"
                  placeholder="Nama / Alias Anda (opsional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black text-xs text-black font-mono placeholder-slate-400 focus:outline-none focus:bg-amber-50 shadow-[1px_1px_0px_#000000]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t-2 border-black flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-white hover:bg-slate-200 border-2 border-black text-black font-pixel text-[10px] font-bold shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black text-black font-pixel text-[11px] font-bold shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Klaim & Publikasikan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

