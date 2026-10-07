import type { ReactNode } from 'react'
import { Card } from '../ui/card'
import { AccountSection } from '../account/AccountSection'

export function AdminStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-4 py-3.5 sm:p-4">
      <p className="label-mono">{label}</p>
      <p className="num mt-2 text-[24px] font-medium leading-none text-text-primary lg:text-[26px]">{value}</p>
      {hint && <p className="mt-1.5 font-body text-[12px] text-text-faint">{hint}</p>}
    </Card>
  )
}

export function AdminStatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 4 }) {
  return (
    <div className={columns === 4 ? 'grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3' : 'grid grid-cols-2 gap-2.5 lg:gap-3'}>{children}</div>
  )
}

export function AdminStatSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AccountSection title={title}>
      <AdminStatGrid columns={2}>{children}</AdminStatGrid>
    </AccountSection>
  )
}
