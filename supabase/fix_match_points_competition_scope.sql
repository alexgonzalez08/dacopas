-- Corrige calculate_match_points: hoy reparte puntos a TODAS las ligas del
-- usuario sin filtrar por competencia. No se nota con una sola competencia
-- activa (Mundial), pero rompe el puntaje en cuanto haya una segunda.
create or replace function calculate_match_points(p_match_id integer)
returns void language plpgsql security definer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_actual_winner text;
  v_competition_id integer;
  v_competition_name text;
begin
  select home_score, away_score, competition_id, competition_name
    into v_home_score, v_away_score, v_competition_id, v_competition_name
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
        -- Marcador exacto (incluye empate exacto): 3 puntos
        when p.home_score = v_home_score and p.away_score = v_away_score then 3
        -- Ganador correcto o empate no exacto: 1 punto
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
  join leagues l on l.id = lm.league_id
  where
    -- Coinciden por competition_id cuando ambos lados lo tienen seteado
    (v_competition_id is not null and l.competition_id = v_competition_id)
    -- Si falta el id en cualquiera de los dos lados, fallback por nombre
    -- (cubre ligas creadas antes de que el selector de competencia guarde competition_id)
    or (
      (v_competition_id is null or l.competition_id is null)
      and coalesce(l.competition_name, 'FIFA World Cup') = coalesce(v_competition_name, 'FIFA World Cup')
    )
  on conflict (user_id, league_id) do update
    set points = league_points.points + excluded.points,
        exact_results = league_points.exact_results + excluded.exact_results,
        correct_winner = league_points.correct_winner + excluded.correct_winner,
        updated_at = now();
end;
$$;
