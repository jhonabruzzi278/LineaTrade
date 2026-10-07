import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { glossaryById } from '../../data/glossary'

interface TermDefinitionProps {
  termId: string
  children?: ReactNode
}

// Término subrayado con su definición. Se abre al tocarlo/enfocarlo (móvil y
// teclado) y al pasar el cursor; Escape o tocar fuera lo cierra. Si el ID no
// existe en el glosario, cae a texto plano en vez de romper la lección.
export function TermDefinition({ termId, children }: TermDefinitionProps) {
  const term = glossaryById.get(termId)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && event.target instanceof Node && !wrapperRef.current.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!term) return <>{children}</>

  return (
    <span
      ref={wrapperRef}
      className="relative inline"
      onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen(true)}
        className="cursor-help border-b border-dashed border-steel text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children ?? term.term}
      </button>
      {open && (
        <span
          id={popoverId}
          role="note"
          className="absolute top-full left-0 z-20 mt-2 block w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-hairline bg-panel-2 p-3.5 text-left font-body text-[13px] leading-relaxed text-text-muted shadow-elevated"
        >
          <span className="block font-bold text-text-primary">{term.term}</span>
          <span className="mt-1 block">{term.definition}</span>
          <Link to={`/academia/glosario#${term.id}`} className="mt-2 inline-block font-bold text-steel hover:underline">
            Ver en el Glosario →
          </Link>
        </span>
      )}
    </span>
  )
}
