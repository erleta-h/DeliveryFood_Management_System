import type { ReactNode } from 'react'
import { AdminIcon } from './adminIcons'

type Props = {
  title: string
  intro?: ReactNode
  /** Badge pranë titullit (p.sh. SOS) */
  titleBadge?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
  fill?: boolean
}

export function AdminPageShell({ title, intro, titleBadge, actions, filters, children, fill }: Props) {
  return (
    <div className={fill ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      <div className="shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {titleBadge}
                <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
              </div>
              {intro ? (
                <div className="mt-1.5 max-w-3xl text-sm leading-relaxed text-gray-500">{intro}</div>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>
        {filters ? (
          <div className="bg-gray-50/60 px-4 py-3.5 sm:px-6">{filters}</div>
        ) : null}
      </div>

      {fill ? (
        <div className="min-h-0 flex-1">{children}</div>
      ) : (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">{children}</div>
      )}
    </div>
  )
}

export function AdminFilterField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block text-xs font-medium text-gray-500 ${className ?? ''}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export function AdminFilterInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 ${className ?? ''}`}
      {...props}
    />
  )
}

export function AdminFilterSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 ${className ?? ''}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  placeholder?: string
}) {
  return (
    <div className="relative">
      <AdminIcon
        name="search"
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <AdminFilterInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="pl-9 min-w-[200px] sm:min-w-[240px]"
      />
    </div>
  )
}
