-- Tabla para trackear último mensaje leído por usuario por torneo
create table if not exists league_chat_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  league_id uuid not null references leagues(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

alter table league_chat_reads enable row level security;

create policy "reads_select" on league_chat_reads for select using (auth.uid() = user_id);
create policy "reads_upsert" on league_chat_reads for insert with check (auth.uid() = user_id);
create policy "reads_update" on league_chat_reads for update using (auth.uid() = user_id);
