// Iconos de trazo fino (stroke=currentColor), mismo lenguaje visual que el
// wordmark de <Nav/>/<AppHeader/> — a diferencia del pack relleno de TradeIcons.tsx,
// estos son para controles pequeños (dropzone de foto, borrar en Sistema). Los
// iconos de navegación que vivían acá murieron con <BottomNav/> — la navegación
// actual (<AppFloatingNav/>) usa lucide-react, como pide el componente FloatingNav.

interface IconProps {
  className?: string
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="14" r="3.5" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a1 1 0 0 1-1 .9H8.8a1 1 0 0 1-1-.9L7 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
