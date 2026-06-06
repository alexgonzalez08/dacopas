import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://anriytnlbikvcrucsqdo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucml5dG5sYmlrdmNydWNzcWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYxODg4NCwiZXhwIjoyMDk2MTk0ODg0fQ.L9ZDpkuDDOCaeC2Uoub5Rxl-oT__7Aykmxou4C_dHhM',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

console.log('📋 Ejecutá este SQL en Supabase Dashboard → SQL Editor:\n')
console.log(`
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null,
  platform text not null, -- 'android', 'ios', 'web'
  created_at timestamptz default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "users can manage own tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
`)
