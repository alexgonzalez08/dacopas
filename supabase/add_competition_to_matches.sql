-- Agrega soporte de competición a partidos
alter table matches
  add column if not exists competition_id integer,
  add column if not exists competition_name text not null default 'FIFA World Cup';

-- Actualizar filas existentes con los valores de API-Football (World Cup = 1)
update matches
  set competition_id = 1,
      competition_name = 'FIFA World Cup'
  where competition_id is null;
