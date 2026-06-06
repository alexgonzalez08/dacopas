-- Permitir a usuarios actualizar su propia fila en league_members (para left_at y role changes)
CREATE POLICY "league_members_update_own" ON league_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Permitir a admins actualizar roles de otros miembros de sus torneos
CREATE POLICY "league_members_update_admin" ON league_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM league_members admin_check
      WHERE admin_check.league_id = league_members.league_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role = 'admin'
        AND admin_check.left_at IS NULL
    )
  );
