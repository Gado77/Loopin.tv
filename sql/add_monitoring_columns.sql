-- ============================================
-- ADD MONITORING COLUMNS TO SCREENS TABLE
-- ============================================
-- This adds columns to track what content is currently playing
-- and system health metrics from the Android player

ALTER TABLE screens
ADD COLUMN IF NOT EXISTS current_content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS cache_used_mb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS playlist_items_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_content_change TIMESTAMPTZ DEFAULT NOW();
