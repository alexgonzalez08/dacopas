-- ============================================================
-- DACOPAS - Schema idempotente para staging
-- Se puede correr sobre una DB existente sin errores.
-- ============================================================

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  welcome_seen boolean default false,
  leagues_info_seen boolean default false,
  created_at timestamptz default now()
);

-- MATCHES
create table if not exists matches (
  id serial primary key,
  external_id text unique,
  home_team text not null,
  away_team text not null,
  home_team_flag text,
  away_team_flag text,
  match_date timestamptz not null,
  stage text not null,
  group_name text,
  status text default 'scheduled',
  home_score integer,
  away_score integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LEAGUES
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  image_url text,
  description text,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- LEAGUE MEMBERS
create table if not exists league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'participant',
  joined_at timestamptz default now(),
  left_at timestamptz,
  primary key (league_id, user_id)
);

-- PREDICTIONS
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  match_id integer references matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, match_id)
);

-- LEAGUE POINTS
create table if not exists league_points (
  user_id uuid references profiles(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,
  points integer default 0,
  exact_results integer default 0,
  correct_winner integer default 0,
  updated_at timestamptz default now(),
  primary key (user_id, league_id)
);

-- FRIENDSHIPS
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

-- NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  from_user_id uuid references profiles(id) on delete set null,
  type text not null,
  metadata jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- PUSH TOKENS
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null,
  subscription text,
  created_at timestamptz default now(),
  unique (user_id, token)
);

-- FEED EVENTS
create table if not exists feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  league_id uuid references leagues(id) on delete cascade,
  match_id integer references matches(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz default now()
);

-- FEED REACTIONS
create table if not exists feed_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (event_id, user_id, emoji)
);

-- FEED COMMENTS
create table if not exists feed_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- USER POSTS
create table if not exists user_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz default now()
);

-- POST REACTIONS
create table if not exists post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references user_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (post_id, user_id, emoji)
);

-- POST COMMENTS
create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references user_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- LEAGUE CHAT MESSAGES
create table if not exists league_chat_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- LEAGUE CHAT READS
create table if not exists league_chat_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  league_id uuid not null references leagues(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

-- PASSWORD RESET TOKENS
create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- REPORTS
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  target_id text not null,
  reason text,
  created_at timestamptz default now()
);

-- ============================================================
-- COLUMNAS NUEVAS (agrega si no existen)
-- ============================================================
alter table matches add column if not exists notify_1h_sent boolean default false;
alter table matches add column if not exists notify_24h_sent boolean default false;
alter table matches add column if not exists tournament text;
alter table predictions add column if not exists tournament text;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists league_chat_messages_league_id_created_at on league_chat_messages (league_id, created_at desc);
create index if not exists notifications_user_id_created_at on notifications (user_id, created_at desc);
create index if not exists feed_events_user_id_created_at on feed_events (user_id, created_at desc);
create index if not exists friendships_requester_id on friendships (requester_id);
create index if not exists friendships_addressee_id on friendships (addressee_id);

-- ============================================================
-- RLS
-- ============================================================
alter table profiles enable row level security;
alter table matches enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table predictions enable row level security;
alter table league_points enable row level security;
alter table friendships enable row level security;
alter table notifications enable row level security;
alter table push_tokens enable row level security;
alter table feed_events enable row level security;
alter table feed_reactions enable row level security;
alter table feed_comments enable row level security;
alter table user_posts enable row level security;
alter table post_reactions enable row level security;
alter table post_comments enable row level security;
alter table league_chat_messages enable row level security;
alter table league_chat_reads enable row level security;
alter table password_reset_tokens enable row level security;
alter table reports enable row level security;

-- ============================================================
-- POLICIES (drop + recreate para idempotencia)
-- ============================================================

-- Profiles
drop policy if exists "profiles_read" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Matches
drop policy if exists "matches_read" on matches;
create policy "matches_read" on matches for select using (true);

-- Leagues
drop policy if exists "leagues_read" on leagues;
drop policy if exists "leagues_insert" on leagues;
drop policy if exists "leagues_update" on leagues;
create policy "leagues_read" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
  or created_by = auth.uid()
);
create policy "leagues_insert" on leagues for insert with check (auth.uid() = created_by);
create policy "leagues_update" on leagues for update using (auth.uid() = created_by);

-- League members
drop policy if exists "league_members_read" on league_members;
drop policy if exists "league_members_insert" on league_members;
create policy "league_members_read" on league_members for select using (
  user_id = auth.uid() or
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);
create policy "league_members_insert" on league_members for insert with check (auth.uid() = user_id);

-- Predictions
drop policy if exists "predictions_read" on predictions;
drop policy if exists "predictions_insert" on predictions;
drop policy if exists "predictions_update" on predictions;
create policy "predictions_read" on predictions for select using (true);
create policy "predictions_insert" on predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on predictions for update using (auth.uid() = user_id);

-- League points
drop policy if exists "league_points_read" on league_points;
create policy "league_points_read" on league_points for select using (true);

-- Friendships
drop policy if exists "friendships_read" on friendships;
drop policy if exists "friendships_insert" on friendships;
drop policy if exists "friendships_update" on friendships;
drop policy if exists "friendships_delete" on friendships;
create policy "friendships_read" on friendships for select using (
  auth.uid() = requester_id or auth.uid() = addressee_id
);
create policy "friendships_insert" on friendships for insert with check (auth.uid() = requester_id);
create policy "friendships_update" on friendships for update using (
  auth.uid() = requester_id or auth.uid() = addressee_id
);
create policy "friendships_delete" on friendships for delete using (
  auth.uid() = requester_id or auth.uid() = addressee_id
);

-- Notifications
drop policy if exists "notifications_read" on notifications;
drop policy if exists "notifications_update" on notifications;
create policy "notifications_read" on notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on notifications for update using (auth.uid() = user_id);

-- Push tokens
drop policy if exists "push_tokens_read" on push_tokens;
drop policy if exists "push_tokens_insert" on push_tokens;
drop policy if exists "push_tokens_delete" on push_tokens;
create policy "push_tokens_read" on push_tokens for select using (auth.uid() = user_id);
create policy "push_tokens_insert" on push_tokens for insert with check (auth.uid() = user_id);
create policy "push_tokens_delete" on push_tokens for delete using (auth.uid() = user_id);

-- Feed events
drop policy if exists "feed_events_read" on feed_events;
drop policy if exists "feed_events_insert" on feed_events;
create policy "feed_events_read" on feed_events for select using (true);
create policy "feed_events_insert" on feed_events for insert with check (auth.uid() = user_id);

-- Feed reactions
drop policy if exists "feed_reactions_read" on feed_reactions;
drop policy if exists "feed_reactions_insert" on feed_reactions;
drop policy if exists "feed_reactions_delete" on feed_reactions;
create policy "feed_reactions_read" on feed_reactions for select using (true);
create policy "feed_reactions_insert" on feed_reactions for insert with check (auth.uid() = user_id);
create policy "feed_reactions_delete" on feed_reactions for delete using (auth.uid() = user_id);

-- Feed comments
drop policy if exists "feed_comments_read" on feed_comments;
drop policy if exists "feed_comments_insert" on feed_comments;
create policy "feed_comments_read" on feed_comments for select using (true);
create policy "feed_comments_insert" on feed_comments for insert with check (auth.uid() = user_id);

-- User posts
drop policy if exists "user_posts_read" on user_posts;
drop policy if exists "user_posts_insert" on user_posts;
drop policy if exists "user_posts_delete" on user_posts;
create policy "user_posts_read" on user_posts for select using (true);
create policy "user_posts_insert" on user_posts for insert with check (auth.uid() = user_id);
create policy "user_posts_delete" on user_posts for delete using (auth.uid() = user_id);

-- Post reactions
drop policy if exists "post_reactions_read" on post_reactions;
drop policy if exists "post_reactions_insert" on post_reactions;
drop policy if exists "post_reactions_delete" on post_reactions;
create policy "post_reactions_read" on post_reactions for select using (true);
create policy "post_reactions_insert" on post_reactions for insert with check (auth.uid() = user_id);
create policy "post_reactions_delete" on post_reactions for delete using (auth.uid() = user_id);

-- Post comments
drop policy if exists "post_comments_read" on post_comments;
drop policy if exists "post_comments_insert" on post_comments;
create policy "post_comments_read" on post_comments for select using (true);
create policy "post_comments_insert" on post_comments for insert with check (auth.uid() = user_id);

-- League chat
drop policy if exists "chat_select" on league_chat_messages;
drop policy if exists "chat_insert" on league_chat_messages;
create policy "chat_select" on league_chat_messages for select using (
  exists (select 1 from league_members where league_id = league_chat_messages.league_id and user_id = auth.uid() and left_at is null)
);
create policy "chat_insert" on league_chat_messages for insert with check (
  auth.uid() = user_id and
  exists (select 1 from league_members where league_id = league_chat_messages.league_id and user_id = auth.uid() and left_at is null)
);

drop policy if exists "reads_select" on league_chat_reads;
drop policy if exists "reads_upsert" on league_chat_reads;
drop policy if exists "reads_update" on league_chat_reads;
create policy "reads_select" on league_chat_reads for select using (auth.uid() = user_id);
create policy "reads_upsert" on league_chat_reads for insert with check (auth.uid() = user_id);
create policy "reads_update" on league_chat_reads for update using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table league_chat_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- FUNCTION: calculate points after match result
-- ============================================================
create or replace function calculate_match_points(p_match_id integer)
returns void language plpgsql security definer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_actual_winner text;
begin
  select home_score, away_score into v_home_score, v_away_score
  from matches where id = p_match_id;

  if v_home_score is null then return; end if;

  v_actual_winner := case
    when v_home_score > v_away_score then 'home'
    when v_away_score > v_home_score then 'away'
    else 'draw'
  end;

  with pred_points as (
    select
      p.user_id,
      case
        when p.home_score = v_home_score and p.away_score = v_away_score then 3
        when case
          when p.home_score > p.away_score then 'home'
          when p.away_score > p.home_score then 'away'
          else 'draw'
        end = v_actual_winner then 1
        else 0
      end as pts,
      case when p.home_score = v_home_score and p.away_score = v_away_score then 1 else 0 end as exact,
      case
        when case
          when p.home_score > p.away_score then 'home'
          when p.away_score > p.home_score then 'away'
          else 'draw'
        end = v_actual_winner and not (p.home_score = v_home_score and p.away_score = v_away_score) then 1
        else 0
      end as winner_only
    from predictions p
    where p.match_id = p_match_id and p.status = 'locked'
  )
  insert into league_points (user_id, league_id, points, exact_results, correct_winner)
  select pp.user_id, lm.league_id, pp.pts, pp.exact, pp.winner_only
  from pred_points pp
  join league_members lm on lm.user_id = pp.user_id and lm.left_at is null
  on conflict (user_id, league_id) do update
    set points = league_points.points + excluded.points,
        exact_results = league_points.exact_results + excluded.exact_results,
        correct_winner = league_points.correct_winner + excluded.correct_winner,
        updated_at = now();
end;
$$;

-- ============================================================
-- Predicción de Campeón, Finalistas y Marcador de la Final
-- ============================================================
-- Predicción anticipada de campeón, finalistas y marcador de la final
create table if not exists champion_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  competition_name text not null default 'FIFA World Cup',
  champion_team text not null,
  finalist_team text not null,       -- el otro finalista (no el campeón)
  champion_score integer not null,
  runner_up_score integer not null,
  penalty_winner text,               -- 'champion' | 'runner_up' | null
  status text not null default 'draft',   -- 'draft' | 'locked'
  points_calculated boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, competition_name),
  check (champion_team <> finalist_team)
);

alter table champion_predictions enable row level security;

drop policy if exists "champion_predictions_read" on champion_predictions;
create policy "champion_predictions_read" on champion_predictions for select using (true);

drop policy if exists "champion_predictions_insert" on champion_predictions;
create policy "champion_predictions_insert" on champion_predictions for insert with check (auth.uid() = user_id);

drop policy if exists "champion_predictions_update" on champion_predictions;
create policy "champion_predictions_update" on champion_predictions for update using (auth.uid() = user_id);

-- Calcula y suma puntos de campeón para una competición cuya final ya finalizó
create or replace function calculate_champion_points(p_competition_name text)
returns void language plpgsql security definer as $$
declare
  v_final record;
  v_champion text;
  v_runner_up text;
  v_champion_score integer;
  v_runner_up_score integer;
  v_went_to_penalties boolean;
begin
  select home_team, away_team, home_score, away_score, penalty_home, penalty_away
  into v_final
  from matches
  where stage = 'final' and coalesce(competition_name, 'FIFA World Cup') = p_competition_name
    and status = 'finished' and home_score is not null
  limit 1;

  if not found then return; end if;

  if v_final.home_score > v_final.away_score then
    v_champion := v_final.home_team; v_runner_up := v_final.away_team;
    v_champion_score := v_final.home_score; v_runner_up_score := v_final.away_score;
    v_went_to_penalties := false;
  elsif v_final.away_score > v_final.home_score then
    v_champion := v_final.away_team; v_runner_up := v_final.home_team;
    v_champion_score := v_final.away_score; v_runner_up_score := v_final.home_score;
    v_went_to_penalties := false;
  else
    v_went_to_penalties := true;
    v_champion_score := v_final.home_score; v_runner_up_score := v_final.away_score;
    if coalesce(v_final.penalty_home, 0) > coalesce(v_final.penalty_away, 0) then
      v_champion := v_final.home_team; v_runner_up := v_final.away_team;
    else
      v_champion := v_final.away_team; v_runner_up := v_final.home_team;
    end if;
  end if;

  with pred_points as (
    select
      cp.user_id,
      case
        when cp.champion_team = v_champion and cp.finalist_team = v_runner_up
          and cp.champion_score = v_champion_score and cp.runner_up_score = v_runner_up_score
          and (not v_went_to_penalties or cp.penalty_winner = 'champion') then 12
        when cp.champion_team = v_champion and cp.finalist_team = v_runner_up
          and cp.champion_score = v_champion_score and cp.runner_up_score = v_runner_up_score then 10
        when cp.champion_team = v_champion and cp.finalist_team = v_runner_up then 8
        when cp.champion_team = v_champion then 5
        -- Acertó los 2 finalistas pero invertidos (marcó como campeón al subcampeón real)
        when cp.finalist_team = v_champion and cp.champion_team = v_runner_up then 1
        else 0
      end as pts
    from champion_predictions cp
    where coalesce(cp.competition_name, 'FIFA World Cup') = p_competition_name
      and cp.status = 'locked'
      and cp.points_calculated = false
  )
  insert into league_points (user_id, league_id, points)
  select pp.user_id, lm.league_id, pp.pts
  from pred_points pp
  join league_members lm on lm.user_id = pp.user_id and lm.left_at is null
  on conflict (user_id, league_id) do update
    set points = league_points.points + excluded.points, updated_at = now();

  update champion_predictions
  set points_calculated = true, updated_at = now()
  where coalesce(competition_name, 'FIFA World Cup') = p_competition_name
    and status = 'locked' and points_calculated = false;
end;
$$;

-- Llamado desde el cron: bloquea cuando hay 4 semifinalistas y liquida puntos si la final terminó
create or replace function sync_champion_predictions()
returns void language plpgsql security definer as $$
declare
  comp record;
begin
  update champion_predictions cp
  set status = 'locked', updated_at = now()
  where cp.status = 'draft'
    and (
      select count(*) from matches m
      where m.stage = 'semi' and coalesce(m.competition_name, 'FIFA World Cup') = cp.competition_name
    ) >= 2;

  for comp in
    select distinct coalesce(competition_name, 'FIFA World Cup') as competition_name
    from matches where stage = 'final' and status = 'finished' and home_score is not null
  loop
    perform calculate_champion_points(comp.competition_name);
  end loop;
end;
$$;
