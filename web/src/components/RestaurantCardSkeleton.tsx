export function RestaurantCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1e2438]/60 ${
        compact ? 'w-[14rem] shrink-0' : 'w-full'
      }`}
    >
      <div className={`bg-white/[0.06] ${compact ? 'aspect-[4/3]' : 'aspect-[16/9]'}`} />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-3/4 rounded bg-white/[0.08]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
        <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
      </div>
    </div>
  )
}
