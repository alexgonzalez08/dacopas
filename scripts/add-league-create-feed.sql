-- Permitir insertar feed_events desde el cliente (para league_create)
-- Verificar si ya existe política de insert en feed_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feed_events' AND policyname = 'feed_events_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "feed_events_insert" ON feed_events FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
