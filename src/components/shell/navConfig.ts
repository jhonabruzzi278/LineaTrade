import { BarChart3, GraduationCap, Home, NotebookPen, Newspaper, type LucideIcon } from 'lucide-react'

// Fuente única de la navegación del producto: 5 áreas. La barra lateral de
// escritorio y la barra inferior móvil leen esta misma estructura, así que
// rutas, etiquetas y estado activo nunca divergen entre las dos.
//
// `soon: true` reserva un lugar en el modelo para pantallas futuras; se ocultan
// hasta que exista una experiencia funcional.

export interface NavLeaf {
  label: string
  to: string
  soon?: boolean
  /** Rutas que también cuentan como "estoy aquí" (p. ej. detalle de un trade). */
  also?: string[]
}

export interface NavArea {
  key: 'inicio' | 'journal' | 'analisis' | 'noticias' | 'academia'
  label: string
  icon: LucideIcon
  to: string
  children?: NavLeaf[]
}

export const NAV_AREAS: NavArea[] = [
  { key: 'inicio', label: 'Inicio', icon: Home, to: '/dashboard' },
  {
    key: 'journal',
    label: 'Journal',
    icon: NotebookPen,
    to: '/historial',
    children: [
      { label: 'Historial', to: '/historial', also: ['/trades'] },
      { label: 'Nuevo trade', to: '/nuevo-trade' },
      { label: 'Checklist', to: '/checklist' },
    ],
  },
  {
    key: 'analisis',
    label: 'Análisis',
    icon: BarChart3,
    to: '/reporte',
    children: [
      { label: 'Reporte', to: '/reporte' },
      { label: 'Insights', to: '/insights' },
      { label: 'Coach IA', to: '/coach' },
      { label: 'Fondeo Tracker', to: '/fondeo' },
      { label: 'Simulador de fondeo', to: '/simulador' },
      { label: 'Linea Pilot', to: '/pilot' },
      { label: 'IA Trader', to: '/ia-trader' },
    ],
  },
  { key: 'noticias', label: 'Noticias', icon: Newspaper, to: '/noticias' },
  {
    key: 'academia',
    label: 'Academia',
    icon: GraduationCap,
    to: '/academia',
    children: [
      { label: 'Aula', to: '/academia', also: ['/academia/lecciones'] },
      { label: 'Glosario', to: '/academia/glosario' },
    ],
  },
]

/** Rutas de la zona "Cuenta" (viven bajo la pestaña Más en móvil). */
export const ACCOUNT_PATHS = ['/perfil', '/sistema', '/configuracion', '/planes', '/admin', '/mas']

export function visibleChildren(area: NavArea): NavLeaf[] {
  return (area.children ?? []).filter((leaf) => !leaf.soon)
}

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** ¿Esta hoja es la pantalla actual? El Glosario no debe activar "Aula". */
export function isLeafActive(pathname: string, leaf: NavLeaf, siblings: NavLeaf[]): boolean {
  const own = [leaf.to, ...(leaf.also ?? [])]
  const claimedBySibling = siblings.some((s) => s !== leaf && !s.soon && matches(pathname, s.to) && s.to.length > leaf.to.length)
  if (claimedBySibling) return false
  return own.some((p) => matches(pathname, p))
}

export function activeAreaKey(pathname: string): NavArea['key'] | 'mas' | null {
  if (ACCOUNT_PATHS.some((p) => matches(pathname, p))) return 'mas'
  for (const area of NAV_AREAS) {
    const leaves = area.children ?? []
    const paths = leaves.length ? leaves.flatMap((l) => [l.to, ...(l.also ?? [])]) : [area.to]
    if (paths.some((p) => matches(pathname, p))) return area.key
  }
  return null
}
