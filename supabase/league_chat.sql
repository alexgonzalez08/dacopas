-- league_chat_messages
create table if not exists league_chat_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists league_chat_messages_league_id_created_at
  on league_chat_messages (league_id, created_at desc);

alter table league_chat_messages enable row level security;

-- Solo miembros activos pueden leer el chat de su torneo
create policy "chat_select" on league_chat_messages for select using (
  exists (
    select 1 from league_members
    where league_id = league_chat_messages.league_id
      and user_id = auth.uid()
      and left_at is null
  )
);

-- Solo miembros activos pueden escribir en su torneo
create policy "chat_insert" on league_chat_messages for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from league_members
    where league_id = league_chat_messages.league_id
      and user_id = auth.uid()
      and left_at is null
  )
);

-- Realtime
alter publication supabase_realtime add table league_chat_messages;
