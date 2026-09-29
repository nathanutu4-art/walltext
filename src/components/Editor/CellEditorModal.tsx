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
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CellEditorModalProps {
  coord: { x: number; y: number };
  onClose: () => void;
  onSave: (cell: CanvasCell) => Promise<{ success: boolean; error?: string }>;
}

const BG_PRESETS = [
  { name: 'Crisp White', color: '#ffffff' },
  { name: 'Cosmic Dark', color: '#0f172a' },
  { name: 'Midnight', color: '#020617' },
  { name: 'Cyber Green', color: '#022c22' },
  { name: 'Deep Purple', color: '#1e1035' },
  { name: 'Warm Noir', color: '#1c1917' },
  { name: 'Crimson Night', color: '#2b0914' },
];

const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#fbbf24', // amber
  '#f43f5e', // rose
  '#34d399', // emerald
  '#38bdf8', // cyan
  '#c084fc', // purple
  '#fb923c', // orange
];

export const CellEditorModal: React.FC<CellEditorModalProps> = ({
  coord,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tools state
  const [activeTool, setActiveTool] = useState<'brush' | 'text' | 'eraser'>('brush');
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Vector data
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [texts, setTexts] = useState<CanvasText[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<CanvasStroke | null>(null);

  // Text Tool inputs & on-canvas draggable placement state
  const [inputText, setInputText] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(20);
  const [fontFamily, setFontFamily] = useState<string>('pixel');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number }>({ x: 128, y: 128 });
  const [editingTextIndex, setEditingTextIndex] = useState<number | null>(null);
  const isDraggingTextRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Metadata inputs
  const [messageCaption, setMessageCaption] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [dominantColor, setDominantColor] = useState<string>('#000000');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const CANVAS_DISPLAY_SIZE = 384; // 384x384px interactive display
  const scale = CANVAS_DISPLAY_SIZE / NORMALIZED_COORD_SPACE; // ~1.5

  const getResolvedFont = useCallback((font?: string) => {
    if (font === 'pixel') return '"Press Start 2P", monospace';
    if (font === 'vt323') return '"VT323", monospace';
    if (font === 'monospace') return 'monospace';
    if (font === 'serif') return 'serif';
    return font || 'sans-serif';
  }, []);

  // Synchronized text property updates for real-time reactivity
  const handleFontSizeChange = useCallback((newSize: number) => {
    const clamped = Math.max(10, Math.min(100, newSize));
    setFontSize(clamped);
    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        if (updated[editingTextIndex]) {
          updated[editingTextIndex] = {
            ...updated[editingTextIndex],
            size: clamped,
          };
        }
        return updated;
      });
    }
  }, [editingTextIndex]);

  const handleFontFamilyChange = useCallback((newFont: string) => {
    setFontFamily(newFont);
    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        if (updated[editingTextIndex]) {
          updated[editingTextIndex] = {
            ...updated[editingTextIndex],
            font: newFont,
          };
        }
        return updated;
      });
    }
  }, [editingTextIndex]);

  const handleTextColorChange = useCallback((newColor: string) => {
    setBrushColor(newColor);
    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        if (updated[editingTextIndex]) {
          updated[editingTextIndex] = {
            ...updated[editingTextIndex],
            color: newColor,
          };
        }
        return updated;
      });
    }
  }, [editingTextIndex]);

  const handleTextAlignChange = useCallback((newAlign: 'left' | 'center' | 'right') => {
    setTextAlign(newAlign);
    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        if (updated[editingTextIndex]) {
          updated[editingTextIndex] = {
            ...updated[editingTextIndex],
            align: newAlign,
          };
        }
        return updated;
      });
    }
  }, [editingTextIndex]);

  const handleInputTextChange = useCallback((val: string) => {
    setInputText(val);
    if (editingTextIndex !== null) {
      setTexts((prev) => {
        const updated = [...prev];
        if (updated[editingTextIndex]) {
          updated[editingTextIndex] = {
            ...updated[editingTextIndex],
            text: val,
          };
        }
        return updated;
      });
    }
  }, [editingTextIndex]);

  // Commit/Apply text onto the canvas at current pendingTextPos
  const applyPendingText = useCallback(() => {
    if (!inputText.trim()) {
      if (editingTextIndex !== null) {
        setTexts((prev) => prev.filter((_, i) => i !== editingTextIndex));
      }
      setEditingTextIndex(null);
      return;
    }

    const newTextItem: CanvasText = {
      text: inputText.trim(),
      x: pendingTextPos.x,
      y: pendingTextPos.y,
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
      setEditingTextIndex(null);
    } else {
      setTexts((prev) => [...prev, newTextItem]);
    }

    if (!messageCaption.trim()) {
      setMessageCaption(inputText.trim());
    }

    setEditingTextIndex(null);
    setInputText('');
  }, [
    inputText,
    pendingTextPos,
    fontSize,
    brushColor,
    fontFamily,
    textAlign,
    editingTextIndex,
    messageCaption,
  ]);

  const commitText = applyPendingText;

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
      if (editingTextIndex === idx) continue;

      const textItem = texts[idx];
      if (!textItem || !textItem.text) continue;

      const fSize = Math.max(8, (textItem.size || 22) * scale);
      const fFace = getResolvedFont(textItem.font);
      ctx.font = `700 ${fSize}px ${fFace}`;
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

      // Subtle dashed selection outline if Text tool is active
      if (activeTool === 'text') {
        let maxW = 0;
        lines.forEach((line) => {
          const w = ctx.measureText(line).width;
          if (w > maxW) maxW = w;
        });
        const pad = 4;
        let bx = tx - maxW / 2 - pad;
        if (textItem.align === 'left') bx = tx - pad;
        if (textItem.align === 'right') bx = tx - maxW - pad;
        const by = ty - totalHeight / 2 - pad;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(bx, by, maxW + pad * 2, totalHeight + pad * 2);
        ctx.restore();
      }
    }

    // Live Draggable Text on Canvas (when Text tool is active and textarea has text)
    if (activeTool === 'text' && inputText.trim()) {
      const displayText = inputText.trim();

      ctx.save();
      const fSize = Math.max(8, fontSize * scale);
      const fFace = getResolvedFont(fontFamily);
      ctx.font = `700 ${fSize}px ${fFace}`;
      ctx.fillStyle = brushColor;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';

      const lines = displayText.split('\n');
      const lineHeight = fSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const tx = pendingTextPos.x * scale;
      const ty = pendingTextPos.y * scale;
      const startY = ty - totalHeight / 2 + lineHeight / 2;

      let maxLineWidth = 0;
      lines.forEach((line) => {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      // Draw the text lines
      lines.forEach((line, i) => {
        ctx.fillText(line, tx, startY + i * lineHeight);
      });

      // Draw retro neo-brutalist interactive draggable bounding box
      const pad = 6;
      let boxX = tx - maxLineWidth / 2 - pad;
      if (textAlign === 'left') boxX = tx - pad;
      if (textAlign === 'right') boxX = tx - maxLineWidth - pad;
      const boxY = ty - totalHeight / 2 - pad;
      const boxW = maxLineWidth + pad * 2;
      const boxH = totalHeight + pad * 2;

      ctx.globalAlpha = 1.0;
      // Black outer frame
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Yellow dashed inner line
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // 4 Corner Handles (Retro Pixel Squares)
      const hSize = 5;
      const corners = [
        [boxX, boxY],
        [boxX + boxW, boxY],
        [boxX, boxY + boxH],
        [boxX + boxW, boxY + boxH],
      ];
      ctx.setLineDash([]);
      corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - hSize / 2, cy - hSize / 2, hSize, hSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - hSize / 2, cy - hSize / 2, hSize, hSize);
      });

      // Floating Coordinate / Drag Pill Tag on top
      const badgeText = `✥ GESER (${pendingTextPos.x}, ${pendingTextPos.y})`;
      ctx.font = '700 8px monospace';
      const badgeW = ctx.measureText(badgeText).width + 8;
      const badgeH = 13;
      const badgeX = Math.max(2, Math.min(CANVAS_DISPLAY_SIZE - badgeW - 2, boxX));
      const badgeY = Math.max(2, boxY - badgeH - 2);

      ctx.fillStyle = '#000000';
      ctx.fillRect(badgeX + 1, badgeY + 1, badgeW, badgeH);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + 4, badgeY + badgeH / 2);

      ctx.restore();
    }
  }, [
    bgColor,
    strokes,
    texts,
    scale,
    activeTool,
    pendingTextPos,
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

  // Dynamically compute the dominant brush or text color (excluding background)
  useEffect(() => {
    const colorWeights: Record<string, number> = {};

    // 1. Calculate weighted area of all drawn strokes
    for (const stroke of strokes) {
      if (!stroke || !stroke.points || stroke.points.length === 0) continue;
      const col = stroke.color;
      if (!col) continue;
      const w = stroke.width || 4;
      let len = 0;
      if (stroke.points.length === 1) {
        len = w;
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const p1 = stroke.points[i - 1];
          const p2 = stroke.points[i];
          if (p1 && p2) {
            len += Math.hypot(p2.x - p1.x, p2.y - p1.y);
          }
        }
      }
      const area = len * w;
      colorWeights[col] = (colorWeights[col] || 0) + area;
    }

    // 2. Calculate weighted area of all text elements
    for (const t of texts) {
      if (!t || !t.text) continue;
      const col = t.color;
      if (!col) continue;
      const sz = t.size || 20;
      const textChars = t.text.replace(/\s/g, '').length;
      const area = textChars * (sz * sz * 0.5);
      colorWeights[col] = (colorWeights[col] || 0) + area;
    }

    let topColor: string | null = null;
    let maxWeight = 0;
    for (const [col, weight] of Object.entries(colorWeights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        topColor = col;
      }
    }

    // Prioritize drawn brush/text dominant color, otherwise fallback to current brushColor (never background)
    if (topColor) {
      setDominantColor(topColor);
    } else {
      setDominantColor(brushColor);
    }
  }, [strokes, texts, brushColor]);

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
      // 1. Check if clicking on another text in texts list to select it
      const otherClickedIdx = texts.findIndex(
        (t, idx) => idx !== editingTextIndex && t && Math.hypot(t.x - pt.x, t.y - pt.y) < 26
      );

      if (otherClickedIdx >= 0) {
        // Select this text from the canvas to edit and adjust
        const t = texts[otherClickedIdx];
        setEditingTextIndex(otherClickedIdx);
        setInputText(t.text);
        setFontSize(t.size || 20);
        setFontFamily(t.font || 'pixel');
        setBrushColor(t.color || '#fbbf24');
        setTextAlign(t.align || 'center');
        setPendingTextPos({ x: t.x, y: t.y });
        isDraggingTextRef.current = true;
        dragOffsetRef.current = { x: pt.x - t.x, y: pt.y - t.y };
      } else if (inputText.trim()) {
        // Adjust the position of the currently selected/active text
        isDraggingTextRef.current = true;
        const distToCurrent = Math.hypot(pendingTextPos.x - pt.x, pendingTextPos.y - pt.y);
        if (distToCurrent < 45) {
          dragOffsetRef.current = { x: pt.x - pendingTextPos.x, y: pt.y - pendingTextPos.y };
        } else {
          setPendingTextPos(pt);
          dragOffsetRef.current = { x: 0, y: 0 };
        }
      } else {
        // If textarea is currently empty, set initial position for when user types
        setPendingTextPos(pt);
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      redrawCanvas();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e);

    if (activeTool === 'text') {
      if (isDraggingTextRef.current) {
        const nx = Math.max(8, Math.min(247, Math.round(pt.x - dragOffsetRef.current.x)));
        const ny = Math.max(8, Math.min(247, Math.round(pt.y - dragOffsetRef.current.y)));
        setPendingTextPos({ x: nx, y: ny });
      }
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
    if (activeTool === 'text') {
      isDraggingTextRef.current = false;
      return;
    }
    handlePointerUp();
  };

  const handlePointerUp = () => {
    if (activeTool === 'text') {
      isDraggingTextRef.current = false;
      return;
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white border-3 border-black shadow-[8px_8px_0px_#000000] text-black flex flex-col my-auto max-h-[94vh] overflow-y-auto">
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
                    ? 'cursor-move'
                    : 'cursor-editor-crosshair'
                }`}
              />

              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white border border-black text-[9px] font-pixel text-black shadow-[1px_1px_0px_#000000]">
                0-255 Vektor &bull; {estimatedSizeKb} KB
              </div>
            </div>

            {/* Text Tool Position Status (No on-canvas input) */}
            {activeTool === 'text' && (
              <div className="w-full max-w-[360px] bg-amber-50/80 border border-black p-1.5 flex items-center justify-between text-[9px] font-pixel text-slate-700 animate-in fade-in">
                <span className="flex items-center gap-1 font-bold text-black">
                  <Move className="w-3 h-3 text-amber-700" />
                  {inputText.trim() ? (
                    <span>Posisi di kanvas: ({pendingTextPos.x}, {pendingTextPos.y})</span>
                  ) : (
                    <span className="text-slate-500 font-normal">Ketik di kotak teks sebelah kanan</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPendingTextPos({ x: 128, y: 128 })}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-black font-bold text-[8px] cursor-pointer"
                    title="Pusatkan posisi di tengah kanvas"
                  >
                    Tengah
                  </button>
                  {editingTextIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTextIndex(null);
                        setInputText('');
                        setPendingTextPos({ x: 128, y: 128 });
                      }}
                      className="px-1.5 py-0.5 bg-white hover:bg-rose-100 text-rose-700 border border-black font-bold text-[8px] cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Actions below canvas */}
            <div className="flex items-center justify-between w-full max-w-[360px] px-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-[10px] text-slate-700 font-bold">MAKRO:</span>
                <span
                  className="w-4 h-4 border-2 border-black shadow-[1px_1px_0px_#000000] inline-block align-middle transition-colors"
                  style={{ backgroundColor: dominantColor }}
                  title={`Warna dominan Makro: ${dominantColor}`}
                />
                <span className="font-mono text-[9px] text-slate-600 font-bold uppercase">{dominantColor}</span>
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
                    <Type className="w-3 h-3 text-amber-600" /> Teks Pesan
                  </span>
                  <span className="text-[8px] font-pixel text-slate-500">
                    Atur posisi di kanvas
                  </span>
                </div>

                {editingTextIndex !== null && (
                  <div className="flex items-center justify-between bg-amber-100 border border-black p-1.5 text-[9px] font-pixel">
                    <span className="text-black font-bold flex items-center gap-1">
                      <Edit3 className="w-3 h-3 text-amber-700" /> Edit Teks #{editingTextIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTextIndex(null);
                        setInputText('');
                        setPendingTextPos({ x: 128, y: 128 });
                      }}
                      className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-black font-bold text-[8px] cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  </div>
                )}

                {/* Multi-line Textarea */}
                <textarea
                  rows={3}
                  placeholder="Ketik teks pesan Anda di sini...&#10;Mendukung multi-baris & teks panjang.&#10;Sentuh & seret langsung di kanvas untuk posisikan!"
                  value={inputText}
                  onChange={(e) => handleInputTextChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black text-xs text-black font-mono placeholder-slate-400 focus:outline-none focus:bg-amber-50 shadow-[1px_1px_0px_#000000] resize-y"
                />

                {/* Position Adjustment & Nudge D-Pad */}
                <div className="flex flex-col gap-1.5 p-2 bg-white border-2 border-black shadow-[1px_1px_0px_#000000]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-pixel text-[9px] text-black font-bold flex items-center gap-1">
                      <Move className="w-3 h-3 text-amber-600" /> Posisi Teks:
                    </span>
                    <span className="font-mono text-[9px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 border border-black">
                      X: {pendingTextPos.x} | Y: {pendingTextPos.y}
                    </span>
                  </div>

                  {/* Nudge Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-[8px] font-pixel text-slate-500">Geser Halus:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPendingTextPos((p) => ({ ...p, x: Math.max(8, p.x - 8) }))}
                        className="p-1 bg-white hover:bg-slate-100 border border-black font-bold text-xs cursor-pointer"
                        title="Geser Kiri (X-8)"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingTextPos((p) => ({ ...p, y: Math.max(8, p.y - 8) }))}
                        className="p-1 bg-white hover:bg-slate-100 border border-black font-bold text-xs cursor-pointer"
                        title="Geser Atas (Y-8)"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingTextPos((p) => ({ ...p, y: Math.min(247, p.y + 8) }))}
                        className="p-1 bg-white hover:bg-slate-100 border border-black font-bold text-xs cursor-pointer"
                        title="Geser Bawah (Y+8)"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingTextPos((p) => ({ ...p, x: Math.min(247, p.x + 8) }))}
                        className="p-1 bg-white hover:bg-slate-100 border border-black font-bold text-xs cursor-pointer"
                        title="Geser Kanan (X+8)"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingTextPos({ x: 128, y: 128 })}
                      className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-black border border-black font-pixel text-[8px] font-bold shadow-[1px_1px_0px_#000000] cursor-pointer"
                      title="Pusatkan tepat di tengah"
                    >
                      Pusat
                    </button>
                  </div>
                </div>

                {/* Apply Button in Sidebar */}
                <button
                  type="button"
                  onClick={applyPendingText}
                  disabled={!inputText.trim()}
                  className="w-full py-2 px-3 bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-40 border-2 border-black text-black font-pixel text-[10px] font-bold shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>{editingTextIndex !== null ? 'Perbarui Teks di Kanvas' : 'Terapkan Teks ke Kanvas'}</span>
                </button>

                {/* Typography Controls: Size with Slider & Presets */}
                <div className="flex flex-col gap-1.5 p-2 bg-white border-2 border-black shadow-[1px_1px_0px_#000000]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-pixel text-[9px] text-black font-bold flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-amber-600" /> Ukuran Teks:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFontSizeChange(fontSize - 2)}
                        disabled={fontSize <= 10}
                        className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-black font-bold text-xs cursor-pointer disabled:opacity-30"
                        title="Perkecil Ukuran"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-amber-700 min-w-[34px] text-center">
                        {fontSize}px
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFontSizeChange(fontSize + 2)}
                        disabled={fontSize >= 100}
                        className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-black font-bold text-xs cursor-pointer disabled:opacity-30"
                        title="Perbesar Ukuran"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Range Slider for Font Size */}
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="2"
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                    className="w-full accent-black h-2 bg-slate-200 rounded-none cursor-pointer"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {[
                      { label: 'Kecil', size: 14 },
                      { label: 'Sedang', size: 22 },
                      { label: 'Besar', size: 34 },
                      { label: 'Jumbo', size: 52 },
                      { label: 'Raksasa', size: 76 },
                    ].map((preset) => (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => handleFontSizeChange(preset.size)}
                        className={`py-0.5 px-1 border border-black font-pixel text-[8px] font-bold cursor-pointer transition-colors text-center ${
                          fontSize === preset.size
                            ? 'bg-[#fbbf24] text-black shadow-[1px_1px_0px_#000000]'
                            : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family Selector */}
                <div>
                  <label className="text-[9px] font-pixel text-slate-700 block mb-0.5 font-bold">
                    Gaya Font:
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border-2 border-black text-xs text-black font-mono shadow-[1px_1px_0px_#000000]"
                  >
                    <option value="pixel">Retro Pixel (Press Start)</option>
                    <option value="vt323">Arcade Mono (VT323)</option>
                    <option value="monospace">Clean Mono</option>
                    <option value="sans-serif">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                  </select>
                </div>

                {/* Alignment & Center Placement */}
                <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-pixel text-slate-600">Rata:</span>
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('left')}
                      className={`p-1 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer ${
                        textAlign === 'left' ? 'bg-[#fbbf24]' : 'bg-white'
                      }`}
                      title="Rata Kiri"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('center')}
                      className={`p-1 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer ${
                        textAlign === 'center' ? 'bg-[#fbbf24]' : 'bg-white'
                      }`}
                      title="Rata Tengah"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('right')}
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
                      setPendingTextPos({ x: 128, y: 128 });
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
                        onClick={() => handleTextColorChange(c)}
                        className={`w-6 h-6 border-2 border-black shadow-[1px_1px_0px_#000000] transition-transform ${
                          brushColor === c ? 'scale-115 ring-2 ring-black' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
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
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className="truncate max-w-[110px] font-bold"
                              style={{ color: t.color }}
                            >
                              {t.text.replace(/\n/g, ' ')}
                            </span>
                            <span className="text-[8px] bg-slate-100 border border-slate-300 px-1 py-0.2 text-slate-600 font-mono shrink-0">
                              {t.size || 20}px
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTool('text');
                                setEditingTextIndex(idx);
                                setInputText(t.text);
                                setFontSize(t.size || 20);
                                setFontFamily(t.font || 'pixel');
                                setBrushColor(t.color);
                                setTextAlign(t.align || 'center');
                                setPendingTextPos({ x: t.x, y: t.y });
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

