export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline rounded-sm bg-panel px-4 py-4">
      <p className="font-display text-[22px] text-text-primary">{value}</p>
      <p className="font-mono text-[11px] text-text-faint mt-1 tracking-wide">{label}</p>
    </div>
  )
}
