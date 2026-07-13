-- Partidos de competencias round_robin (Premier League, La Liga) no tienen fase/grupo —
-- stage queda null para esos. La columna original era not null (solo Mundial existía).
alter table matches alter column stage drop not null;
