-- Agregar columna left_at para soft-delete al abandonar torneo
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ NULL;

-- Actualizar calculate_match_points para no dar puntos a usuarios que abandonaron
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
  join league_members lm on lm.user_id = pp.user_id AND lm.left_at IS NULL
  on conflict (user_id, league_id) do update
    set points = league_points.points + excluded.points,
        exact_results = league_points.exact_results + excluded.exact_results,
        correct_winner = league_points.correct_winner + excluded.correct_winner,
        updated_at = now();
end;
$$;
