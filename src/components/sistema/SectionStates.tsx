import { Card } from '../ui/card'

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-[10px] bg-panel-2" />
      ))}
    </div>
  )
}

export function EmptyList({ title, hint }: { title: string; hint: string }) {
  return (
    <Card tone="dashed" className="text-center">
      <p className="font-body text-[15px] font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm font-body text-[13px] text-text-faint">{hint}</p>
    </Card>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="font-body text-[13px] text-loss">
      {message}
    </p>
  )
}
