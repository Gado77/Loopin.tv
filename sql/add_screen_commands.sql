-- ============================================
-- CREATE SCREEN_COMMANDS TABLE
-- ============================================
-- Stores remote commands to be executed by Android players
-- Commands: refresh, restart, update_playlist

CREATE TABLE IF NOT EXISTS screen_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    command VARCHAR(50) NOT NULL,
    payload TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_screen_commands_screen_id ON screen_commands(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_commands_status ON screen_commands(status);

-- Enable RLS
ALTER TABLE screen_commands ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage commands for their own screens
CREATE POLICY "Users manage commands for their screens"
ON screen_commands FOR ALL
USING (
    screen_id IN (
        SELECT id FROM screens WHERE user_id = auth.uid()
    )
);

-- Policy: players can read their pending commands
CREATE POLICY "Players read pending commands"
ON screen_commands FOR SELECT
USING (
    screen_id IN (
        SELECT id FROM screens WHERE user_id = auth.uid()
    )
);
