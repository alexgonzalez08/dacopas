-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

-- Matches (pre-loaded + synced from API)
create table matches (
  id serial primary key,
  external_id text unique,
  home_team text not null,
  away_team text not null,
  home_team_flag text,
  away_team_flag text,
  match_date timestamptz not null,
  stage text not null, -- 'group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'
  group_name text,
  status text default 'scheduled', -- 'scheduled', 'live', 'finished'
  home_score integer,
  away_score integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- League members
create table league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- Predictions (global per user per match, not per league)
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  match_id integer references matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  status text default 'draft', -- 'draft', 'locked'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, match_id)
);

-- Points per user per league (materialized for performance)
create table league_points (
  user_id uuid references profiles(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,
  points integer default 0,
  exact_results integer default 0,
  correct_winner integer default 0,
  updated_at timestamptz default now(),
  primary key (user_id, league_id)
);

-- RLS policies
alter table profiles enable row level security;
alter table matches enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table predictions enable row level security;
alter table league_points enable row level security;

-- Profiles: everyone can read, only owner can update
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Matches: everyone can read
create policy "matches_read" on matches for select using (true);
-- Service role can insert/update (for API sync)

-- Leagues: members can read their leagues
create policy "leagues_read" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
  or created_by = auth.uid()
);
create policy "leagues_insert" on leagues for insert with check (auth.uid() = created_by);

-- League members: members can see their leagues
create policy "league_members_read" on league_members for select using (
  user_id = auth.uid() or
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);
create policy "league_members_insert" on league_members for insert with check (auth.uid() = user_id);

-- Predictions: everyone can read, only owner can write
create policy "predictions_read" on predictions for select using (true);
create policy "predictions_insert" on predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on predictions for update using (auth.uid() = user_id);

-- League points: everyone can read
create policy "league_points_read" on league_points for select using (true);

-- Function: auto-lock predictions 1 hour before match
create or replace function lock_predictions_before_match()
returns void language plpgsql security definer as $$
begin
  update predictions p
  set status = 'locked'
  from matches m
  where p.match_id = m.id
    and p.status = 'draft'
    and m.match_date <= now() + interval '1 hour';
end;
$$;

-- Function: calculate points after match result
create or replace function calculate_match_points(p_match_id integer)
returns void language plpgsql security definer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_actual_winner text; -- 'home', 'away', 'draw'
begin
  select home_score, away_score into v_home_score, v_away_score
  from matches where id = p_match_id;

  if v_home_score is null then return; end if;

  v_actual_winner := case
    when v_home_score > v_away_score then 'home'
    when v_away_score > v_home_score then 'away'
    else 'draw'
  end;

  -- Calculate points for each prediction of this match
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
  join league_members lm on lm.user_id = pp.user_id
  on conflict (user_id, league_id) do update
    set points = league_points.points + excluded.points,
        exact_results = league_points.exact_results + excluded.exact_results,
        correct_winner = league_points.correct_winner + excluded.correct_winner,
        updated_at = now();
end;
$$;

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
