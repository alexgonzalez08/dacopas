export default function TorneosIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 115"
      fill="none"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* pelota de fútbol */}
      <circle cx="50" cy="18" r="14"/>
      <path d="M50 4 L50 10 M42 7 L46 13 M58 7 L54 13"/>
      <path d="M36 18 L43 18 M57 18 L64 18"/>
      <path d="M39 27 L44 22 M61 27 L56 22"/>
      {/* copa */}
      <path d="M35 32 Q32 50 38 58 Q44 64 50 65 Q56 64 62 58 Q68 50 65 32 Z"/>
      {/* asas */}
      <path d="M35 36 Q24 38 26 50 Q28 58 35 56"/>
      <path d="M65 36 Q76 38 74 50 Q72 58 65 56"/>
      {/* tallo */}
      <line x1="50" y1="65" x2="50" y2="78"/>
      {/* base */}
      <path d="M38 78 Q38 84 50 84 Q62 84 62 78 Z"/>
      {/* pie */}
      <line x1="34" y1="88" x2="66" y2="88"/>
    </svg>
  )
}
