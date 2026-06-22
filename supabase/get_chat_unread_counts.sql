-- Reemplaza N queries secuenciales por una sola query agregada.
-- Llamar con: supabase.rpc('get_chat_unread_counts', { p_user_id: '<uuid>' })
CREATE OR REPLACE FUNCTION get_chat_unread_counts(p_user_id uuid)
RETURNS TABLE(league_id uuid, unread_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $func$
  SELECT
    m.league_id,
    COUNT(*) AS unread_count
  FROM league_chat_messages m
  INNER JOIN league_members lm
    ON lm.league_id = m.league_id
    AND lm.user_id = p_user_id
    AND lm.left_at IS NULL
  LEFT JOIN league_chat_reads r
    ON r.league_id = m.league_id
    AND r.user_id = p_user_id
  WHERE m.user_id != p_user_id
    AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
  GROUP BY m.league_id
  HAVING COUNT(*) > 0;
$func$;
