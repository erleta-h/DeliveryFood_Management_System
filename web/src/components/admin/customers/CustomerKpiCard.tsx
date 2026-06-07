import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  hint?: ReactNode
  icon: ReactNode
  tone: string
}

export function CustomerKpiCard({ label, value, hint, icon, tone }: Props) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint ? <div className="mt-0.5 text-xs text-gray-400">{hint}</div> : null}
    </div>
  )
}
