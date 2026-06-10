-- ============================================================
-- DACOPAS - Schema completo (dev/staging)
-- ============================================================

-- PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  welcome_seen boolean default false,
  leagues_info_seen boolean default false,
  created_at timestamptz default now()
);

-- MATCHES
create table matches (
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
create table leagues (
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
create table league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'participant',
  joined_at timestamptz default now(),
  left_at timestamptz,
  primary key (league_id, user_id)
);

-- PREDICTIONS
create table predictions (
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
create table league_points (
  user_id uuid references profiles(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,
  points integer default 0,
  exact_results integer default 0,
  correct_winner integer default 0,
  updated_at timestamptz default now(),
  primary key (user_id, league_id)
);

-- FRIENDSHIPS
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

-- NOTIFICATIONS
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  from_user_id uuid references profiles(id) on delete set null,
  type text not null,
  metadata jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- PUSH TOKENS
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null,
  subscription text,
  created_at timestamptz default now(),
  unique (user_id, token)
);

-- FEED EVENTS
create table feed_events (
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
create table feed_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (event_id, user_id, emoji)
);

-- FEED COMMENTS
create table feed_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- USER POSTS
create table user_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz default now()
);

-- POST REACTIONS
create table post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references user_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (post_id, user_id, emoji)
);

-- POST COMMENTS
create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references user_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- LEAGUE CHAT MESSAGES
create table league_chat_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- LEAGUE CHAT READS
create table league_chat_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  league_id uuid not null references leagues(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

-- PASSWORD RESET TOKENS
create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- REPORTS
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  target_id text not null,
  reason text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index league_chat_messages_league_id_created_at on league_chat_messages (league_id, created_at desc);
create index notifications_user_id_created_at on notifications (user_id, created_at desc);
create index feed_events_user_id_created_at on feed_events (user_id, created_at desc);
create index friendships_requester_id on friendships (requester_id);
create index friendships_addressee_id on friendships (addressee_id);

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

-- Profiles
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Matches
create policy "matches_read" on matches for select using (true);

-- Leagues
create policy "leagues_read" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
  or created_by = auth.uid()
);
create policy "leagues_insert" on leagues for insert with check (auth.uid() = created_by);
create policy "leagues_update" on leagues for update using (auth.uid() = created_by);

-- League members
create policy "league_members_read" on league_members for select using (
  user_id = auth.uid() or
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);
create policy "league_members_insert" on league_members for insert with check (auth.uid() = user_id);

-- Predictions
create policy "predictions_read" on predictions for select using (true);
create policy "predictions_insert" on predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on predictions for update using (auth.uid() = user_id);

-- League points
create policy "league_points_read" on league_points for select using (true);

-- Friendships
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
create policy "notifications_read" on notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on notifications for update using (auth.uid() = user_id);

-- Push tokens
create policy "push_tokens_read" on push_tokens for select using (auth.uid() = user_id);
create policy "push_tokens_insert" on push_tokens for insert with check (auth.uid() = user_id);
create policy "push_tokens_delete" on push_tokens for delete using (auth.uid() = user_id);

-- Feed events
create policy "feed_events_read" on feed_events for select using (true);
create policy "feed_events_insert" on feed_events for insert with check (auth.uid() = user_id);

-- Feed reactions
create policy "feed_reactions_read" on feed_reactions for select using (true);
create policy "feed_reactions_insert" on feed_reactions for insert with check (auth.uid() = user_id);
create policy "feed_reactions_delete" on feed_reactions for delete using (auth.uid() = user_id);

-- Feed comments
create policy "feed_comments_read" on feed_comments for select using (true);
create policy "feed_comments_insert" on feed_comments for insert with check (auth.uid() = user_id);

-- User posts
create policy "user_posts_read" on user_posts for select using (true);
create policy "user_posts_insert" on user_posts for insert with check (auth.uid() = user_id);
create policy "user_posts_delete" on user_posts for delete using (auth.uid() = user_id);

-- Post reactions
create policy "post_reactions_read" on post_reactions for select using (true);
create policy "post_reactions_insert" on post_reactions for insert with check (auth.uid() = user_id);
create policy "post_reactions_delete" on post_reactions for delete using (auth.uid() = user_id);

-- Post comments
create policy "post_comments_read" on post_comments for select using (true);
create policy "post_comments_insert" on post_comments for insert with check (auth.uid() = user_id);

-- League chat
create policy "chat_select" on league_chat_messages for select using (
  exists (select 1 from league_members where league_id = league_chat_messages.league_id and user_id = auth.uid() and left_at is null)
);
create policy "chat_insert" on league_chat_messages for insert with check (
  auth.uid() = user_id and
  exists (select 1 from league_members where league_id = league_chat_messages.league_id and user_id = auth.uid() and left_at is null)
);

create policy "reads_select" on league_chat_reads for select using (auth.uid() = user_id);
create policy "reads_upsert" on league_chat_reads for insert with check (auth.uid() = user_id);
create policy "reads_update" on league_chat_reads for update using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table league_chat_messages;
alter publication supabase_realtime add table notifications;

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
