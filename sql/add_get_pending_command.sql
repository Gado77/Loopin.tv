-- ============================================
-- CREATE GET_PENDING_COMMAND FUNCTION
-- ============================================
-- RPC function that returns the first pending command for a screen
-- Returns NULL if no pending commands exist

CREATE OR REPLACE FUNCTION get_pending_command(screen_uuid_param UUID)
RETURNS TABLE (
    id UUID,
    command VARCHAR,
    payload TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.id, sc.command, sc.payload
    FROM screen_commands sc
    WHERE sc.screen_id = screen_uuid_param
      AND sc.executed_at IS NULL
      AND sc.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY sc.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql
STABLE
SECURITY DEFINER;
