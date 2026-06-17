'use client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import PostInteractionsGeneric from './post-interactions-generic'

type StatsEntry = {
  rank: number
  label: string
  sublabel?: string
  value: string
  valueLabel?: string
}

type StatsBlock = {
  title: string
  emoji: string
  entries: StatsEntry[]
}

export type StatsPostMetadata = {
  blocks: StatsBlock[]
}

type Props = {
  post: {
    id: string
    user_id: string
    created_at: string
    metadata: StatsPostMetadata | null
    post_reactions?: { id: string; emoji: string; user_id: string; profiles?: { username: string } | null }[]
    post_comments?: { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }[]
  }
  userId: string
  userAvatarUrl?: string | null
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']
const RANK_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-500']

function StatsBlock({ block }: { block: StatsBlock }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <span>{block.emoji}</span>
        {block.title}
      </p>
      <div className="space-y-1.5">
        {block.entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
              entry.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-slate-700/40'
            }`}
          >
            <span className="text-lg w-6 text-center shrink-0">{RANK_MEDALS[entry.rank - 1]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${RANK_COLORS[entry.rank - 1]}`}>
                {entry.label}
              </p>
              {entry.sublabel && (
                <p className="text-xs text-slate-500 truncate">{entry.sublabel}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className={`text-sm font-bold ${RANK_COLORS[entry.rank - 1]}`}>{entry.value}</span>
              {entry.valueLabel && (
                <span className="text-xs text-slate-500 ml-1">{entry.valueLabel}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatsPostCard({ post, userId, userAvatarUrl }: Props) {
  const blocks = post.metadata?.blocks ?? []

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">📊</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Estadísticas Dacopas</p>
          <p suppressHydrationWarning className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 space-y-5">
        {blocks.map((block, i) => (
          <StatsBlock key={i} block={block} />
        ))}
      </div>

      {/* Interactions */}
      <PostInteractionsGeneric
        postId={post.id}
        userId={userId}
        userAvatarUrl={userAvatarUrl}
        postOwnerId={post.user_id}
        postOwnerUsername="Dacopas"
        initialReactions={post.post_reactions ?? []}
        initialComments={post.post_comments ?? []}
        table="post"
        systemMode
      />
    </div>
  )
}
