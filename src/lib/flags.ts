const FLAG_EMOJIS: Record<string, string> = {
  // Americas
  'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
  'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
  'Bolivia': '🇧🇴', 'Venezuela': '🇻🇪', 'Mexico': '🇲🇽', 'United States': '🇺🇸',
  'USA': '🇺🇸', 'Canada': '🇨🇦', 'Costa Rica': '🇨🇷', 'Panama': '🇵🇦',
  'Honduras': '🇭🇳', 'El Salvador': '🇸🇻', 'Jamaica': '🇯🇲', 'Trinidad and Tobago': '🇹🇹',
  // Europe
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Italy': '🇮🇹',
  'Croatia': '🇭🇷', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰', 'Austria': '🇦🇹',
  'Poland': '🇵🇱', 'Serbia': '🇷🇸', 'Hungary': '🇭🇺', 'Czechia': '🇨🇿',
  'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'Greece': '🇬🇷', 'Albania': '🇦🇱',
  'Slovenia': '🇸🇮', 'Georgia': '🇬🇪',
  // Africa
  'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Nigeria': '🇳🇬', 'Cameroon': '🇨🇲',
  'Ghana': '🇬🇭', 'Egypt': '🇪🇬', 'Tunisia': '🇹🇳', 'Algeria': '🇩🇿',
  'South Africa': '🇿🇦', 'Mali': '🇲🇱', 'DR Congo': '🇨🇩', "Côte d'Ivoire": '🇨🇮',
  // Asia
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷',
  'Australia': '🇦🇺', 'Qatar': '🇶🇦', 'China': '🇨🇳', 'Uzbekistan': '🇺🇿',
  'Iraq': '🇮🇶', 'Jordan': '🇯🇴', 'Indonesia': '🇮🇩',
  // Oceania
  'New Zealand': '🇳🇿',
}

export function getFlag(teamName: string, flagUrl?: string | null): { type: 'emoji' | 'img'; value: string } {
  if (flagUrl && flagUrl.startsWith('http')) return { type: 'img', value: flagUrl }
  const emoji = FLAG_EMOJIS[teamName]
  if (emoji) return { type: 'emoji', value: emoji }
  return { type: 'emoji', value: '🏳️' }
}
