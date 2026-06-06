type Props = {
  usesCount: number
  maxUses: number | null
}

export function CouponUsesProgress({ usesCount, maxUses }: Props) {
  if (maxUses == null || maxUses <= 0) {
    return <span className="tabular-nums text-gray-700">{usesCount}</span>
  }

  const pct = Math.min(100, Math.round((usesCount / maxUses) * 100))
  const barTone =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-violet-500'

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
        <span className="tabular-nums">
          {usesCount} / {maxUses}
        </span>
        <span className="tabular-nums text-gray-400">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
