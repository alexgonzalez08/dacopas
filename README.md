# Mundial 2026 — Pronósticos

App para crear ligas privadas y predecir resultados del Mundial 2026.

## Setup

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
3. Copiar las credenciales:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role)

### 2. Football-data.org (resultados automáticos)

1. Registrarse en [football-data.org](https://www.football-data.org/client/register)
2. Copiar el API key en `FOOTBALL_API_KEY`

### 3. Variables de entorno

Editar `.env.local` con tus credenciales reales.

### 4. Correr en desarrollo

```bash
npm run dev
```

### 5. Sincronizar partidos

Una vez configurado, llamar al endpoint para traer los partidos desde la API:

```bash
curl -X POST http://localhost:3000/api/matches/sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Podés llamar este endpoint desde un cron (ej. cada 5 minutos durante el Mundial) para actualizar resultados automáticamente.

## Sistema de puntos

| Resultado | Puntos |
|-----------|--------|
| Resultado exacto (ej: 2-1) | 3 pts |
| Ganador o empate correcto | 1 pt |
| Incorrecto | 0 pts |

## Flujo

1. Usuario se registra → entra al dashboard
2. Crea una liga → obtiene un código de 6 caracteres
3. Comparte el código con amigos → ellos se unen
4. Todos ingresan sus pronósticos (editables hasta 1 hora antes de cada partido)
5. Los resultados se sincronizan automáticamente vía API
6. La tabla de posiciones se actualiza en tiempo real

## Migración de datos

Al usar Supabase (PostgreSQL), migrar datos es sencillo: `pg_dump` + `pg_restore` o exportar desde el panel de Supabase.
