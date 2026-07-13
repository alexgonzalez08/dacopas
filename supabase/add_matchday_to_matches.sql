-- Número de fecha/jornada para competencias de formato todos-contra-todos
-- (Premier League, La Liga). No aplica a partidos de formato knockout (queda null).
alter table matches add column if not exists matchday integer;
