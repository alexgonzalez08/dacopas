import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://anriytnlbikvcrucsqdo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucml5dG5sYmlrdmNydWNzcWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYxODg4NCwiZXhwIjoyMDk2MTk0ODg0fQ.L9ZDpkuDDOCaeC2Uoub5Rxl-oT__7Aykmxou4C_dHhM',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Crear tabla notifications via SQL
const { error } = await supabase.rpc('exec_sql', {
  sql: `
    create table if not exists public.notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references public.profiles(id) on delete cascade not null,
      from_user_id uuid references public.profiles(id) on delete cascade,
      type text not null,
      read boolean default false,
      metadata jsonb default '{}',
      created_at timestamptz default now()
    );
    create index if not exists notifications_user_id_idx on public.notifications(user_id);
    create index if not exists notifications_read_idx on public.notifications(user_id, read);
    alter table public.notifications enable row level security;
    drop policy if exists "users can read own notifications" on public.notifications;
    create policy "users can read own notifications"
      on public.notifications for select
      using (auth.uid() = user_id);
    drop policy if exists "users can insert notifications" on public.notifications;
    create policy "users can insert notifications"
      on public.notifications for insert
      with check (true);
    drop policy if exists "users can update own notifications" on public.notifications;
    create policy "users can update own notifications"
      on public.notifications for update
      using (auth.uid() = user_id);
  `
})

if (error) {
  console.error('❌ Error creando tabla:', error.message)
  console.log('\n📋 Ejecutá este SQL manualmente en Supabase Dashboard > SQL Editor:\n')
  console.log(`
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  from_user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);
alter table public.notifications enable row level security;
create policy "users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);
create policy "users can insert notifications"
  on public.notifications for insert
  with check (true);
create policy "users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);
  `)
} else {
  console.log('✅ Tabla notifications creada correctamente')
}
