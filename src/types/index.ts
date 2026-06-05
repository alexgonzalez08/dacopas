export type Profile = {
  id: string
  username: string
  created_at: string
}

export type Match = {
  id: number
  external_id: string | null
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  match_date: string
  stage: 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'
  group_name: string | null
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
}

export type League = {
  id: string
  name: string
  code: string
  created_by: string
  created_at: string
}

export type LeagueMember = {
  league_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}

export type Prediction = {
  id: string
  user_id: string
  match_id: number
  home_score: number
  away_score: number
  status: 'draft' | 'locked'
  created_at: string
  updated_at: string
}

export type LeaguePoints = {
  user_id: string
  league_id: string
  points: number
  exact_results: number
  correct_winner: number
  profiles?: Profile
}

export type LeaderboardEntry = LeaguePoints & {
  profiles: Profile
  rank: number
}
