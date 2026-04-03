-- ============================================
-- CREATE PLAYER_LOGS TABLE
-- ============================================
-- Stores detailed events from Android players
-- Events: start, error, cache_clear, command_received, content_change

CREATE TABLE IF NOT EXISTS player_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster filtering by screen and date
CREATE INDEX IF NOT EXISTS idx_player_logs_screen_id ON player_logs(screen_id);
CREATE INDEX IF NOT EXISTS idx_player_logs_created_at ON player_logs(created_at DESC);

-- Enable RLS
ALTER TABLE player_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users can read logs only for their screens
CREATE POLICY "Users read logs for their screens"
ON player_logs FOR SELECT
USING (
    screen_id IN (
        SELECT id FROM screens WHERE user_id = auth.uid()
    )
);

-- Note: Inserting logs usually happens via Service Role or public access if configured.
-- For this project, players use the Service Role/Anon key for now (as seen in OkHttp headers).
CREATE POLICY "Anon can insert logs"
ON player_logs FOR INSERT
WITH CHECK (true);
