export interface StrokePoint {
  x: number; // Normalized 0-255
  y: number; // Normalized 0-255
}

export interface CanvasStroke {
  color: string;
  width: number; // Relative thickness (1-10)
  points: StrokePoint[];
}

export interface CanvasText {
  text: string;
  x: number; // Normalized 0-255
  y: number; // Normalized 0-255
  size: number; // Font size scale
  color: string;
  font?: string;
  align?: 'left' | 'center' | 'right';
}

export interface VectorData {
  bg: string;
  strokes: CanvasStroke[];
  texts: CanvasText[];
}

export interface CanvasCell {
  x: number; // 0 to 1919
  y: number; // 0 to 1079
  dominant_color: string; // e.g. '#6366f1'
  vector_data: VectorData;
  message_text?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at?: string;
}

export type LodMode = 'macro' | 'micro';

export interface ViewportState {
  offsetX: number; // Canvas translation in px
  offsetY: number;
  cellSize: number; // Zoom level in px per cell (e.g. 2 to 256)
  width: number;
  height: number;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Resized Canvas Dimensions (1920 x 1080 = 2,073,600 slots)
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_SIZE = CANVAS_WIDTH; // Backwards compatible alias
export const MICRO_LOD_THRESHOLD = 32; // Zoom >= 32px per cell triggers Micro LOD
export const MIN_ZOOM = 2; // Min cell size in px
export const MAX_ZOOM = 768; // Max cell size in px (allows deep zoom to inspect details)
export const NORMALIZED_COORD_SPACE = 256; // 0-255 normalized coordinate space inside each 1:1 cell
