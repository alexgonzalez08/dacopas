-- Agregar columna role a league_members
ALTER TABLE league_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'participant'
  CHECK (role IN ('admin', 'moderator', 'participant'));

-- Asignar rol admin a los creadores de cada torneo (datos existentes)
UPDATE league_members lm
SET role = 'admin'
FROM leagues l
WHERE lm.league_id = l.id AND lm.user_id = l.created_by;
