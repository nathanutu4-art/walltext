-- ==========================================
-- PixelVerse / Infinite Message Canvas Schema
-- PostgreSQL / Supabase Schema Definition
-- ==========================================

-- 1. Main Canvas Cells Table
CREATE TABLE IF NOT EXISTS canvas_cells (
    x SMALLINT NOT NULL CHECK (x >= 0 AND x < 1920),
    y SMALLINT NOT NULL CHECK (y >= 0 AND y < 1080),
    dominant_color CHAR(7) NOT NULL,
    vector_data JSONB NOT NULL,
    message_text TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name VARCHAR(100) DEFAULT 'Anon Explorer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (x, y)
);

-- 2. Performance Indexes
-- Spatial composite index for fast viewport window queries:
CREATE INDEX IF NOT EXISTS idx_canvas_cells_viewport 
ON canvas_cells (x, y);

-- Full-Text Search index for finding messages across the 9-million-slot canvas:
CREATE INDEX IF NOT EXISTS idx_canvas_cells_fts 
ON canvas_cells USING gin(to_tsvector('simple', coalesce(message_text, '')));

-- 3. Row Level Security (RLS)
ALTER TABLE canvas_cells ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all cells
CREATE POLICY "Public Read Access" 
ON canvas_cells FOR SELECT 
USING (true);

-- Insert Once Policy: Only empty slots can be claimed
CREATE POLICY "Insert Once Policy" 
ON canvas_cells FOR INSERT 
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM canvas_cells existing 
        WHERE existing.x = canvas_cells.x AND existing.y = canvas_cells.y
    )
);

-- Optional update policy: Author can update their own cell
CREATE POLICY "Author Update Policy"
ON canvas_cells FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- 4. Enable Supabase Realtime CDC
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_cells;

-- 5. Helper Function: Optimized Viewport Bounding Box Query
CREATE OR REPLACE FUNCTION get_cells_in_viewport(
    min_x INT,
    max_x INT,
    min_y INT,
    max_y INT,
    cell_limit INT DEFAULT 2000
)
RETURNS SETOF canvas_cells
LANGUAGE sql
STABLE
AS $$
    SELECT * 
    FROM canvas_cells
    WHERE x >= min_x AND x <= max_x
      AND y >= min_y AND y <= max_y
    ORDER BY created_at DESC
    LIMIT cell_limit;
$$;
