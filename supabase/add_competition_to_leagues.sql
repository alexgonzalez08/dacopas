-- Agrega soporte de competición a torneos
alter table leagues
  add column if not exists competition_id integer,
  add column if not exists competition_name text not null default 'Mundial 2026';
