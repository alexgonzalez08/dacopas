import Link from 'next/link'

type Props = {
  username: string
  fullName?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showAlias?: boolean
  linkable?: boolean
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function UserAvatar({
  username,
  fullName,
  avatarUrl,
  size = 'md',
  showName = false,
  showAlias = false,
  linkable = true,
}: Props) {
  const displayName = fullName || username
  const sizeClass = sizes[size]

  const avatar = (
    <div className={`${sizeClass} rounded-full overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-slate-300 uppercase shrink-0`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        : displayName?.[0] ?? '?'
      }
    </div>
  )

  const nameEl = showName && (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-white leading-tight truncate">{displayName}</p>
      {showAlias && fullName && (
        <p className="text-xs text-slate-500 truncate">@{username}</p>
      )}
    </div>
  )

  const inner = (
    <div className="flex items-center gap-2">
      {avatar}
      {nameEl}
    </div>
  )

  if (!linkable) return inner

  return (
    <Link href={`/profile/${username}`} className="flex items-center gap-2 hover:opacity-80 transition">
      {avatar}
      {nameEl}
    </Link>
  )
}
