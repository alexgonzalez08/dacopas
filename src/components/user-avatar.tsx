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

const sizePx = { sm: 28, md: 36, lg: 48 }
const textSize = { sm: '11px', md: '13px', lg: '16px' }

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
  const px = sizePx[size]

  const avatar = (
    <div
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      className="rounded-full overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-slate-300 uppercase shrink-0"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{ width: px, height: px, minWidth: px, minHeight: px }}
          className="object-cover block"
        />
      ) : (
        <span style={{ fontSize: textSize[size], lineHeight: 1 }}>
          {displayName?.[0] ?? '?'}
        </span>
      )}
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
    <div className="inline-flex items-center gap-2 shrink-0">
      {avatar}
      {nameEl}
    </div>
  )

  if (!linkable) return inner

  return (
    <Link href={`/profile/${username}`} className="inline-flex items-center gap-2 hover:opacity-80 transition shrink-0">
      {avatar}
      {nameEl}
    </Link>
  )
}
