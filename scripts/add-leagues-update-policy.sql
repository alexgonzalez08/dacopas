-- Permitir al creador del torneo actualizar sus datos
CREATE POLICY "leagues_update" ON leagues
  FOR UPDATE USING (auth.uid() = created_by);
