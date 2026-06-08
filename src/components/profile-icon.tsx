export default function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* manga izquierda */}
      <path d="M5 18 L20 32 L20 52 L8 52 L8 18 Z"/>
      {/* manga derecha */}
      <path d="M95 18 L80 32 L80 52 L92 52 L92 18 Z"/>
      {/* cuerpo */}
      <path d="M20 32 L20 92 L80 92 L80 32"/>
      {/* cuello V */}
      <path d="M38 14 Q50 28 62 14"/>
      {/* hombro izquierdo */}
      <path d="M8 18 Q23 10 38 14"/>
      {/* hombro derecho */}
      <path d="M92 18 Q77 10 62 14"/>
      {/* número 10 */}
      <text x="50" y="72" textAnchor="middle" fontSize="22" fontWeight="700" stroke="currentColor" fill="currentColor" fontFamily="sans-serif" strokeWidth="0">10</text>
    </svg>
  )
}
