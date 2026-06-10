-- Renombrar notified_45min → notified_1h y agregar notified_start
alter table matches rename column notified_45min to notified_1h;
alter table matches add column if not exists notified_start boolean not null default false;
