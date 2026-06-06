-- Permitir a usuarios actualizar su propia fila en league_members (para left_at)
CREATE POLICY "league_members_update_own" ON league_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Eliminar política recursiva si existe
DROP POLICY IF EXISTS "league_members_update_admin" ON league_members;
