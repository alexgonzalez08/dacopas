-- Soporte de predicción de campeón para competencias round_robin (Premier League, La Liga)
-- + separación del puntaje de campeón del puntaje principal (opt-in por torneo, ver
-- add_champion_prediction_toggle.sql para la columna leagues.champion_prediction_enabled).

-- 1. Relajar champion_predictions: en formato liga solo se llena champion_team
-- (no hay finalista, marcador ni penales — no existe "la final" en todos-contra-todos)
alter table champion_predictions alter column finalist_team drop not null;
alter table champion_predictions alter column champion_score drop not null;
alter table champion_predictions alter column runner_up_score drop not null;
alter table champion_predictions drop constraint if exists champion_predictions_check;
alter table champion_predictions add constraint champion_predictions_check
  check (finalist_team is null or champion_team <> finalist_team);

-- 2. Separar puntaje de campeón del puntaje principal (ranking del torneo)
alter table league_points add column if not exists champion_points integer default 0;

-- Opt-in por torneo (admin decide si su torneo tiene predicción de campeón). Default true
-- preserva el comportamiento actual de los torneos existentes. Los torneos del Mundial no
-- pueden desactivarlo (regla aplicada en la UI, ver edit-league.tsx) — el Mundial ya está
-- por terminar y desactivar rompería expectativas de usuarios que ya predijeron.
alter table leagues add column if not exists champion_prediction_enabled boolean not null default true;

-- 3. calculate_champion_points: rama knockout (existente, ahora escribe en champion_points
-- y respeta champion_prediction_enabled) + rama round_robin nueva (campeón = líder de tabla
-- una vez que terminó toda la temporada, puntaje simple 8/0)
create or replace function calculate_champion_points(p_competition_name text)
returns void language plpgsql security definer as $$
declare
  v_final record;
  v_champion text;
  v_runner_up text;
  v_champion_score integer;
  v_runner_up_score integer;
  v_went_to_penalties boolean;
  v_is_knockout boolean;
  v_total integer;
  v_finished integer;
  v_rr_champion text;
begin
  select exists(
    select 1 from matches
    where coalesce(competition_name, 'FIFA World Cup') = p_competition_name and stage = 'final'
  ) into v_is_knockout;

  if v_is_knockout then
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

    with pred as (
      select
        cp.user_id,
        case
          when cp.champion_score > cp.runner_up_score then cp.champion_team
          when cp.runner_up_score > cp.champion_score then cp.finalist_team
          when cp.penalty_winner = 'runner_up' then cp.finalist_team
          else cp.champion_team
        end as pred_champion,
        case
          when cp.champion_score > cp.runner_up_score then cp.finalist_team
          when cp.runner_up_score > cp.champion_score then cp.champion_team
          when cp.penalty_winner = 'runner_up' then cp.champion_team
          else cp.finalist_team
        end as pred_runner_up,
        (cp.champion_score = cp.runner_up_score) as predicted_tie,
        (cp.champion_score = v_champion_score and cp.runner_up_score = v_runner_up_score) as score_exact
      from champion_predictions cp
      where coalesce(cp.competition_name, 'FIFA World Cup') = p_competition_name
        and cp.status = 'locked'
        and cp.points_calculated = false
    ),
    pred_points as (
      select
        p.user_id,
        (p.pred_champion = v_champion) as champion_correct,
        (p.pred_champion = v_champion and p.pred_runner_up = v_runner_up) as finalists_correct,
        p.score_exact,
        (p.pred_champion = v_champion and v_went_to_penalties and p.predicted_tie) as penalty_bonus
      from pred p
    ),
    scored as (
      select
        pp.user_id,
        case
          when not pp.champion_correct then 0
          when pp.finalists_correct and pp.score_exact and pp.penalty_bonus then 15
          when pp.finalists_correct and pp.score_exact then 12
          when pp.finalists_correct and pp.penalty_bonus then 10
          when pp.finalists_correct then 8
          when pp.score_exact and pp.penalty_bonus then 5
          when pp.score_exact then 3
          when pp.penalty_bonus then 2
          else 1
        end as pts
      from pred_points pp
    )
    insert into league_points (user_id, league_id, champion_points)
    select s.user_id, lm.league_id, s.pts
    from scored s
    join league_members lm on lm.user_id = s.user_id and lm.left_at is null
    join leagues l on l.id = lm.league_id
      and coalesce(l.competition_name, 'FIFA World Cup') = p_competition_name
      and l.champion_prediction_enabled = true
    on conflict (user_id, league_id) do update
      set champion_points = league_points.champion_points + excluded.champion_points, updated_at = now();

    update champion_predictions
    set points_calculated = true, updated_at = now()
    where coalesce(competition_name, 'FIFA World Cup') = p_competition_name
      and status = 'locked' and points_calculated = false;

  else
    -- Round_robin: solo liquida cuando terminó toda la temporada
    select count(*), count(*) filter (where status = 'finished')
    into v_total, v_finished
    from matches
    where coalesce(competition_name, 'FIFA World Cup') = p_competition_name;

    if v_total = 0 or v_finished < v_total then return; end if;

    with team_matches as (
      select home_team as team, home_score as gf, away_score as ga from matches
        where coalesce(competition_name, 'FIFA World Cup') = p_competition_name and status = 'finished'
      union all
      select away_team as team, away_score as gf, home_score as ga from matches
        where coalesce(competition_name, 'FIFA World Cup') = p_competition_name and status = 'finished'
    ),
    team_points as (
      select team,
        sum(case when gf > ga then 3 when gf = ga then 1 else 0 end) as pts,
        sum(gf - ga) as gd,
        sum(gf) as gf
      from team_matches
      group by team
    )
    select team into v_rr_champion from team_points order by pts desc, gd desc, gf desc limit 1;

    if v_rr_champion is null then return; end if;

    insert into league_points (user_id, league_id, champion_points)
    select cp.user_id, lm.league_id,
      case when cp.champion_team = v_rr_champion then 8 else 0 end
    from champion_predictions cp
    join league_members lm on lm.user_id = cp.user_id and lm.left_at is null
    join leagues l on l.id = lm.league_id
      and coalesce(l.competition_name, 'FIFA World Cup') = p_competition_name
      and l.champion_prediction_enabled = true
    where coalesce(cp.competition_name, 'FIFA World Cup') = p_competition_name
      and cp.status = 'locked'
      and cp.points_calculated = false
    on conflict (user_id, league_id) do update
      set champion_points = league_points.champion_points + excluded.champion_points, updated_at = now();

    update champion_predictions
    set points_calculated = true, updated_at = now()
    where coalesce(competition_name, 'FIFA World Cup') = p_competition_name
      and status = 'locked' and points_calculated = false;
  end if;
end;
$$;

-- 4. sync_champion_predictions: bloqueo a mitad de temporada para round_robin
-- (además del bloqueo existente 15 min antes de la primera semifinal para knockout),
-- y liquidación cuando termina toda la temporada de una competencia round_robin.
create or replace function sync_champion_predictions()
returns void language plpgsql security definer as $$
declare
  comp record;
begin
  update champion_predictions cp
  set status = 'locked', updated_at = now()
  where cp.status = 'draft'
    and (
      (
        select count(*) >= 2 and min(m.match_date) <= now() + interval '15 minutes'
        from matches m
        where m.stage = 'semi' and coalesce(m.competition_name, 'FIFA World Cup') = cp.competition_name
      )
      or (
        select min(m2.match_date) <= now()
        from matches m2
        where coalesce(m2.competition_name, 'FIFA World Cup') = cp.competition_name
          and m2.matchday = (
            select ceil(max(matchday) / 2.0)::int from matches
            where coalesce(competition_name, 'FIFA World Cup') = cp.competition_name and matchday is not null
          )
      )
    );

  for comp in
    select distinct coalesce(competition_name, 'FIFA World Cup') as competition_name
    from matches where stage = 'final' and status = 'finished' and home_score is not null
    union
    select coalesce(competition_name, 'FIFA World Cup') as competition_name
    from matches
    where matchday is not null
    group by coalesce(competition_name, 'FIFA World Cup')
    having count(*) filter (where status <> 'finished') = 0
  loop
    perform calculate_champion_points(comp.competition_name);
  end loop;
end;
$$;
