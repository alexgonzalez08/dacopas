-- Agregar columna is_system a user_posts
alter table user_posts add column if not exists is_system boolean not null default false;

-- Tabla para posts de sistema ocultados por el usuario
create table if not exists dismissed_posts (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references user_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Insertar post de reglas del juego desde dacopas_admin
insert into user_posts (user_id, content, visibility, is_system)
select
  id,
  '📋 **Reglas del juego — Dacopas**

¡Bienvenidos al Mundial 2026! Aquí te explicamos cómo funciona el sistema de puntos:

🎯 **Marcador exacto** → 3 puntos
(Incluye empates exactos, ej: predecís 1-1 y termina 1-1)

✅ **Ganador correcto** → 1 punto
(Acertás quién gana pero no el marcador exacto)

✅ **Empate no exacto** → 1 punto
(Predecís empate pero no el marcador exacto)

⚠️ Los puntos se aplican **globalmente** en todos los torneos en los que participás.

⏱️ Los pronósticos se **bloquean 15 minutos** antes del inicio de cada partido.

¡Mucha suerte a todos! 🏆',
  'public',
  true
from profiles
where username = 'dacopas_admin'
limit 1;
