import type { ReactNode } from 'react'

import { Link } from 'react-router-dom'



type Props = {

  label: string

  value: string | number

  icon?: string

  hint?: ReactNode

  href?: string

  accent?: 'violet' | 'emerald' | 'amber' | 'sky'

}



const accentRing: Record<NonNullable<Props['accent']>, string> = {

  violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white',

  emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',

  amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',

  sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',

}



export function AdminStatCard({ label, value, icon, hint, href, accent = 'violet' }: Props) {

  const inner = (

    <div

      className={[

        'relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md',

        accentRing[accent],

      ].join(' ')}

    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>

          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>

          {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}

        </div>

        {icon ? (

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">

            {icon}

          </span>

        ) : null}

      </div>

    </div>

  )



  if (href) {

    return (

      <Link to={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">

        {inner}

      </Link>

    )

  }



  return inner

}


