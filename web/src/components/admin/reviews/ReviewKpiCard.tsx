import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: ReactNode
  iconWrapClass?: string
}

export function ReviewKpiCard({ label, value, icon, trend, iconWrapClass = 'bg-violet-100 text-violet-700' }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>
          {trend ? <div className="mt-2 text-xs font-medium">{trend}</div> : null}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>
          {icon}
        </span>
      </div>
    </div>
  )
}

function IconBubbleStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c.5 2.2 2.1 3.8 4.3 4.3-2.2.5-3.8 2.1-4.3 4.3-.5-2.2-2.1-3.8-4.3-4.3C9.9 6.8 11.5 5.2 12 3Z"
        fill="currentColor"
        opacity=".25"
      />
      <path
        d="M8 14c.4 1.6 1.6 2.8 3.2 3.2-1.6.4-2.8 1.6-3.2 3.2-.4-1.6-1.6-2.8-3.2-3.2 1.6-.4 2.8-1.6 3.2-3.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.1 6.6.6-5 4.3 1.5 6.4L12 16.8 6 19.4l1.5-6.4-5-4.3 6.6-.6L12 2z" />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 21V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 15a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c5 0 9.3 3 11 7-1 2.2-2.8 4-5 5.1" />
      <path d="M6.1 6.1C3.8 7.6 2.2 9.9 1 12c1.7 4 6 7 11 7 1.1 0 2.1-.1 3.1-.4" />
    </svg>
  )
}

export const reviewKpiIcons = {
  total: <IconBubbleStar />,
  average: <IconStar />,
  reported: <IconFlag />,
  hidden: <IconEyeOff />,
}
