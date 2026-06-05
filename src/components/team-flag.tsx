import { getFlag } from '@/lib/flags'

export default function TeamFlag({
  name,
  flagUrl,
  size = 'sm',
}: {
  name: string
  flagUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const flag = getFlag(name, flagUrl)
  const imgSize = size === 'md' ? 'w-6 h-6' : 'w-4 h-4'

  return (
    <span className="inline-flex items-center gap-1.5">
      {flag.type === 'emoji' ? (
        <span>{flag.value}</span>
      ) : (
        <img src={flag.value} alt={name} className={`${imgSize} object-contain`} />
      )}
      <span>{name}</span>
    </span>
  )
}
