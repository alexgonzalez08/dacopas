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
