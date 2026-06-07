import { getFlag } from '@/lib/flags'

export default function TeamFlag({
  name,
  flagUrl,
  size = 'sm',
  showName = true,
}: {
  name: string
  flagUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}) {
  const flag = getFlag(name, flagUrl)
  const imgSize = size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4'
  const emojiSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-base'

  return (
    <span className="inline-flex items-center gap-1.5">
      {flag.type === 'emoji' ? (
        <span className={emojiSize}>{flag.value}</span>
      ) : (
        <img src={flag.value} alt={name} className={`${imgSize} object-contain`} />
      )}
      {showName && <span>{name}</span>}
    </span>
  )
}
