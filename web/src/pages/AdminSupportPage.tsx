import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminAudit, type AdminAuditListResult } from '../lib/adminApi'
import { ADMIN_SECTIONS } from '../lib/adminNav'
import { customerBtnGhost, customerCardMuted } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AdminSupportPage() {
  const token = useAuthStore((s) => s.token)
  const def = ADMIN_SECTIONS.support
  const [data, setData] = useState<AdminAuditListResult | null>(null)

  useEffect(() => {
    if (!token) return
    void fetchAdminAudit(token, { page: 1, pageSize: 12 }).then(setData)
  }, [token])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-3xl" aria-hidden>
          {def.icon}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">{def.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{def.intro}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/users" className={customerBtnGhost}>
          Klientët
        </Link>
        <Link to="/admin/orders" className={customerBtnGhost}>
          Porositë
        </Link>
        <Link to="/admin/security" className={customerBtnGhost}>
          Audit
        </Link>
      </div>

      <section className={`${customerCardMuted} p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/80">
          Aktiviteti së fundmi (audit)
        </h2>
        {!data ? (
          <p className="mt-4 text-sm text-zinc-500">Duke ngarkuar…</p>
        ) : data.items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Nuk ka hyra ende.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            {data.items.map((a) => (
              <li key={a.id} className="border-b border-white/5 pb-2">
                <span className="text-zinc-500">
                  {new Date(a.createdAt).toLocaleString('sq-AL')}
                </span>{' '}
                <span className="text-zinc-100">{a.action}</span> · {a.entity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${customerCardMuted} p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/80">
          Rrjedha e planifikuar
        </h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-400 marker:text-violet-400">
          {def.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
