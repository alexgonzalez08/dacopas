export default function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* cabeza figura de atrás */}
      <circle cx="35" cy="26" r="13"/>
      {/* cabeza figura de adelante */}
      <circle cx="57" cy="19" r="15"/>
      {/* cuerpo unificado */}
      <path d="M14 105 C14 75 24 62 38 60 L60 60 C76 62 86 75 86 105"/>
      {/* brazo izquierdo */}
      <path d="M38 60 C28 58 16 58 13 68"/>
      {/* brazo derecho */}
      <path d="M60 60 C70 58 82 56 86 66"/>
      {/* + agregar amigo */}
      <line x1="97" y1="6" x2="97" y2="22"/>
      <line x1="89" y1="14" x2="105" y2="14"/>
    </svg>
  )
}
