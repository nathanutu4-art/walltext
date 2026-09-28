import {
  CanvasCell,
  ViewportState,
  BoundingBox,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MICRO_LOD_THRESHOLD,
  NORMALIZED_COORD_SPACE,
} from '@/types/canvas';

export class CanvasRenderer {
  /**
   * Calculate visible cell range within the current viewport
   */
  public static calculateVisibleBounds(viewport: ViewportState): BoundingBox {
    const { offsetX, offsetY, cellSize, width, height } = viewport;

    const minX = Math.max(0, Math.floor(-offsetX / cellSize));
    const maxX = Math.min(CANVAS_WIDTH - 1, Math.ceil((width - offsetX) / cellSize));
    const minY = Math.max(0, Math.floor(-offsetY / cellSize));
    const maxY = Math.min(CANVAS_HEIGHT - 1, Math.ceil((height - offsetY) / cellSize));

    return { minX, maxX, minY, maxY };
  }

  /**
   * Main render function for the infinite canvas with Retro PixelCraft aesthetic
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    cells: Map<string, CanvasCell>,
    hoveredCell: { x: number; y: number } | null,
    selectedCell: { x: number; y: number } | null
  ) {
    const { offsetX, offsetY, cellSize, width, height } = viewport;
    const isMicro = cellSize >= MICRO_LOD_THRESHOLD;

    // 1. Clear full canvas viewport with white paper tone
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Draw ambient background grid pattern
    this.renderAmbientBackgroundGrid(ctx, width, height);

    // 2. Draw canvas world boundary (1920 x 1080 canvas)
    const worldStartX = offsetX;
    const worldStartY = offsetY;
    const worldWidth = CANVAS_WIDTH * cellSize;
    const worldHeight = CANVAS_HEIGHT * cellSize;

    // Neo-brutalist hard black drop shadow under the world canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(worldStartX + 6, worldStartY + 6, worldWidth, worldHeight);

    // Canvas world background (pure crisp white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(worldStartX, worldStartY, worldWidth, worldHeight);

    // 3. Grid Lines on the canvas
    if (cellSize >= 8) {
      this.renderGrid(ctx, viewport);
    }

    // 4. Render Cells (Dynamic Viewport Culling)
    const bounds = this.calculateVisibleBounds(viewport);

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const key = `${x},${y}`;
        const cell = cells.get(key);
        if (!cell) continue;

        const screenX = x * cellSize + offsetX;
        const screenY = y * cellSize + offsetY;

        if (isMicro) {
          // Mode Mikro: Full vector render
          this.renderMicroCell(ctx, cell, screenX, screenY, cellSize);
        } else {
          // Mode Makro: 1 dominant color block
          this.renderMacroCell(ctx, cell, screenX, screenY, cellSize);
        }
      }
    }

    // 5. Draw Canvas World Outer Border (Heavy Neo-brutalist Black)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.min(6, Math.max(3, cellSize / 6));
    ctx.strokeRect(worldStartX, worldStartY, worldWidth, worldHeight);

    // 6. Draw Selected Cell Marker (Yellow Accent with Black Border)
    if (selectedCell) {
      const { x, y } = selectedCell;
      if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        const selScreenX = x * cellSize + offsetX;
        const selScreenY = y * cellSize + offsetY;
        const renderSize = Math.max(cellSize, 4);

        // Semi-transparent yellow fill
        ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.fillRect(selScreenX, selScreenY, renderSize, renderSize);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2.5, cellSize * 0.06);
        ctx.strokeRect(selScreenX, selScreenY, renderSize, renderSize);

        // Pixel corners in global yellow
        if (cellSize >= 14) {
          const cornerLen = Math.min(8, Math.max(3, cellSize * 0.25));
          ctx.fillStyle = '#fbbf24';
          // Top-left
          ctx.fillRect(selScreenX - 2, selScreenY - 2, cornerLen, 3);
          ctx.fillRect(selScreenX - 2, selScreenY - 2, 3, cornerLen);
          // Top-right
          ctx.fillRect(selScreenX + cellSize - cornerLen + 2, selScreenY - 2, cornerLen, 3);
          ctx.fillRect(selScreenX + cellSize - 1, selScreenY - 2, 3, cornerLen);
          // Bottom-left
          ctx.fillRect(selScreenX - 2, selScreenY + cellSize - 1, cornerLen, 3);
          ctx.fillRect(selScreenX - 2, selScreenY + cellSize - cornerLen + 2, 3, cornerLen);
          // Bottom-right
          ctx.fillRect(selScreenX + cellSize - cornerLen + 2, selScreenY + cellSize - 1, cornerLen, 3);
          ctx.fillRect(selScreenX + cellSize - 1, selScreenY + cellSize - cornerLen + 2, 3, cornerLen);
        }
      }
    }

    // 7. Draw Hovered Cell Cursor (Rectangle & Yellow following global UI color #fbbf24)
    if (hoveredCell && (!selectedCell || hoveredCell.x !== selectedCell.x || hoveredCell.y !== selectedCell.y)) {
      const { x, y } = hoveredCell;
      if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        const hovScreenX = x * cellSize + offsetX;
        const hovScreenY = y * cellSize + offsetY;
        const renderSize = Math.max(cellSize, 4);

        // Vibrant yellow rectangle fill following global UI color (#fbbf24)
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fillRect(hovScreenX, hovScreenY, renderSize, renderSize);

        // Bold black neo-brutalist border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, cellSize * 0.05);
        ctx.strokeRect(hovScreenX, hovScreenY, renderSize, renderSize);

        // Retro yellow corner accents if cell is large enough
        if (cellSize >= 14) {
          const cornerLen = Math.min(8, Math.max(3, cellSize * 0.25));
          ctx.fillStyle = '#fbbf24';
          // Top-left
          ctx.fillRect(hovScreenX, hovScreenY, cornerLen, 2.5);
          ctx.fillRect(hovScreenX, hovScreenY, 2.5, cornerLen);
          // Top-right
          ctx.fillRect(hovScreenX + cellSize - cornerLen, hovScreenY, cornerLen, 2.5);
          ctx.fillRect(hovScreenX + cellSize - 2.5, hovScreenY, 2.5, cornerLen);
          // Bottom-left
          ctx.fillRect(hovScreenX, hovScreenY + cellSize - 2.5, cornerLen, 2.5);
          ctx.fillRect(hovScreenX, hovScreenY + cellSize - cornerLen, 2.5, cornerLen);
          // Bottom-right
          ctx.fillRect(hovScreenX + cellSize - cornerLen, hovScreenY + cellSize - 2.5, cornerLen, 2.5);
          ctx.fillRect(hovScreenX + cellSize - 2.5, hovScreenY + cellSize - cornerLen, 2.5, cornerLen);
        }
      }
    }
  }

  /**
   * Subtle ambient grid on full screen
   */
  private static renderAmbientBackgroundGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = 24;
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = 0; y <= height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render grid lines within the visible screen
   */
  private static renderGrid(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const { offsetX, offsetY, cellSize, width, height } = viewport;
    const bounds = this.calculateVisibleBounds(viewport);

    ctx.save();
    ctx.beginPath();

    // Subtle graph-paper grid lines
    ctx.strokeStyle = cellSize >= 20 ? '#cbd5e1' : '#e2e8f0';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = bounds.minX; x <= bounds.maxX + 1; x++) {
      const screenX = Math.round(x * cellSize + offsetX) + 0.5;
      const startY = Math.max(0, bounds.minY * cellSize + offsetY);
      const endY = Math.min(height, (bounds.maxY + 1) * cellSize + offsetY);
      ctx.moveTo(screenX, startY);
      ctx.lineTo(screenX, endY);
    }

    // Horizontal lines
    for (let y = bounds.minY; y <= bounds.maxY + 1; y++) {
      const screenY = Math.round(y * cellSize + offsetY) + 0.5;
      const startX = Math.max(0, bounds.minX * cellSize + offsetX);
      const endX = Math.min(width, (bounds.maxX + 1) * cellSize + offsetX);
      ctx.moveTo(startX, screenY);
      ctx.lineTo(endX, screenY);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Calculate the true dominant color of a cell (warna terbanyak pada canvas).
   * Analyzes background, strokes, and texts area weights.
   */
  public static getCellDominantColor(cell: CanvasCell): string {
    if (cell.vector_data) {
      const bg = cell.vector_data.bg || '#ffffff';
      const strokes = cell.vector_data.strokes || [];
      const texts = cell.vector_data.texts || [];

      if (strokes.length === 0 && texts.length === 0) {
        return bg;
      }

      // Track area in 256x256 space (total 65536 units)
      const colorAreas: Record<string, number> = {};
      const totalArea = 256 * 256;
      let drawnArea = 0;

      // Strokes area estimation
      for (const stroke of strokes) {
        if (!stroke || !stroke.points || stroke.points.length === 0) continue;
        const color = stroke.color || '#000000';
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
        const strokeArea = len * w;
        colorAreas[color] = (colorAreas[color] || 0) + strokeArea;
        drawnArea += strokeArea;
      }

      // Texts area estimation
      for (const t of texts) {
        if (!t || !t.text) continue;
        const color = t.color || '#000000';
        const sz = t.size || 20;
        const textLen = t.text.replace(/\s/g, '').length;
        const textArea = textLen * sz * sz * 0.45;
        colorAreas[color] = (colorAreas[color] || 0) + textArea;
        drawnArea += textArea;
      }

      // Remaining area is filled by the background color
      const remainingBg = Math.max(0, totalArea - drawnArea);
      colorAreas[bg] = (colorAreas[bg] || 0) + remainingBg;

      let topColor = bg;
      let maxArea = -1;
      for (const [col, area] of Object.entries(colorAreas)) {
        if (area > maxArea) {
          maxArea = area;
          topColor = col;
        }
      }
      return topColor;
    }

    return cell.dominant_color || '#fbbf24';
  }

  /**
   * Mode Makro: Render 1 solid dominant color block with retro pixel border
   */
  private static renderMacroCell(
    ctx: CanvasRenderingContext2D,
    cell: CanvasCell,
    screenX: number,
    screenY: number,
    cellSize: number
  ) {
    const dominantColor = this.getCellDominantColor(cell);
    ctx.fillStyle = dominantColor;
    ctx.fillRect(screenX, screenY, cellSize, cellSize);

    // Solid outline if size is moderately visible
    if (cellSize >= 14) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, cellSize, cellSize);
    }
  }

  /**
   * Mode Mikro: Sharp vector rendering with retro styling
   */
  private static renderMicroCell(
    ctx: CanvasRenderingContext2D,
    cell: CanvasCell,
    screenX: number,
    screenY: number,
    cellSize: number
  ) {
    ctx.save();

    // 1. Clip to cell boundary
    ctx.beginPath();
    ctx.rect(screenX, screenY, cellSize, cellSize);
    ctx.clip();

    // 2. Cell Background
    ctx.fillStyle = cell.vector_data?.bg || '#ffffff';
    ctx.fillRect(screenX, screenY, cellSize, cellSize);

    const scale = cellSize / NORMALIZED_COORD_SPACE;

    // 3. Render Vector Strokes
    if (cell.vector_data?.strokes && cell.vector_data.strokes.length > 0) {
      for (const stroke of cell.vector_data.strokes) {
        if (!stroke || !stroke.points || stroke.points.length === 0) continue;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = Math.max(1, (stroke.width || 4) * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const firstPt = stroke.points[0];
        if (!firstPt) continue;
        const startX = screenX + firstPt.x * scale;
        const startY = screenY + firstPt.y * scale;
        ctx.moveTo(startX, startY);

        if (stroke.points.length === 1) {
          ctx.lineTo(startX + 0.1, startY + 0.1);
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            if (pt) {
              ctx.lineTo(screenX + pt.x * scale, screenY + pt.y * scale);
            }
          }
        }

        ctx.stroke();
      }
    }

    // 4. Render Vector Texts (with multi-line and retro font support)
    if (cell.vector_data?.texts && cell.vector_data.texts.length > 0) {
      for (const textItem of cell.vector_data.texts) {
        if (!textItem || !textItem.text) continue;

        const rawFontSize = (textItem.size || 22) * scale;
        const fontSize = Math.max(5, rawFontSize);
        const fontFace = textItem.font === 'pixel'
          ? '"Press Start 2P", monospace'
          : textItem.font === 'vt323'
          ? '"VT323", monospace'
          : textItem.font === 'monospace'
          ? 'monospace'
          : textItem.font === 'serif'
          ? 'serif'
          : textItem.font || 'sans-serif';

        ctx.font = `700 ${fontSize}px ${fontFace}`;
        ctx.fillStyle = textItem.color || '#000000';
        ctx.textAlign = textItem.align || 'center';
        ctx.textBaseline = 'middle';

        const tx = screenX + (textItem.x || 0) * scale;
        const ty = screenY + (textItem.y || 0) * scale;

        const lines = textItem.text.split('\n');
        const lineHeight = fontSize * 1.3;
        const totalHeight = lines.length * lineHeight;
        const startY = ty - totalHeight / 2 + lineHeight / 2;

        lines.forEach((line, idx) => {
          ctx.fillText(line, tx, startY + idx * lineHeight);
        });
      }
    } else if (cell.message_text) {
      // Fallback for legacy or text-only cells
      const fontSize = Math.max(5, 22 * scale);
      ctx.font = `700 ${fontSize}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = cell.message_text.split('\n');
      const lineHeight = fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const startY = screenY + cellSize / 2 - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, idx) => {
        ctx.fillText(line, screenX + cellSize / 2, startY + idx * lineHeight);
      });
    }

    ctx.restore();

    // 5. Solid black border around micro cell
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenX, screenY, cellSize, cellSize);
  }

  /**
   * Screen coordinate to Canvas Cell coordinate
   */
  public static screenToCell(
    screenX: number,
    screenY: number,
    viewport: ViewportState
  ): { x: number; y: number } | null {
    const { offsetX, offsetY, cellSize } = viewport;
    const cellX = Math.floor((screenX - offsetX) / cellSize);
    const cellY = Math.floor((screenY - offsetY) / cellSize);

    if (cellX < 0 || cellX >= CANVAS_WIDTH || cellY < 0 || cellY >= CANVAS_HEIGHT) {
      return null;
    }

    return { x: cellX, y: cellY };
  }

  /**
   * Cell coordinate to Screen center coordinate
   */
  public static cellToScreen(
    cellX: number,
    cellY: number,
    viewport: ViewportState
  ): { x: number; y: number } {
    const { offsetX, offsetY, cellSize } = viewport;
    return {
      x: cellX * cellSize + offsetX + cellSize / 2,
      y: cellY * cellSize + offsetY + cellSize / 2,
    };
  }
}
