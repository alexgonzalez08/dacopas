import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://anriytnlbikvcrucsqdo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucml5dG5sYmlrdmNydWNzcWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYxODg4NCwiZXhwIjoyMDk2MTk0ODg0fQ.L9ZDpkuDDOCaeC2Uoub5Rxl-oT__7Aykmxou4C_dHhM',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

console.log('📋 Ejecutá este SQL en Supabase Dashboard → SQL Editor:\n')
console.log(`
-- Agregar política de DELETE para que usuarios puedan eliminar sus propias notificaciones
drop policy if exists "users can delete own notifications" on public.notifications;
create policy "users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);
`)
