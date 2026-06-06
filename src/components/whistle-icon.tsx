export default function WhistleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cuerpo del silbato */}
      <path d="M5 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" />
      {/* Boquilla */}
      <path d="M13 12h6l1-4H13" />
      {/* Bolita interior */}
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* Cadena */}
      <path d="M7 8 Q6 5 9 4" strokeLinecap="round" />
    </svg>
  )
}
