import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/authApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function KitchenAccountPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!token) return
    if (next !== confirm) {
      setErr('Fjalëkalimet e rinj nuk përputhen.')
      return
    }
    setBusy(true)
    const r = await changePassword(token, current, next)
    setBusy(false)
    if (r.ok) {
      setCurrent('')
      setNext('')
      setConfirm('')
      setMsg(
        'Fjalëkalimi u përditësua. Nëse keni «mbaj mend» në pajisje të tjera, duhet hyrje përsëri me fjalëkalimin e ri.',
      )
    } else {
      const m = r.error
      if (/\b401\b/.test(m) || m.toLowerCase().includes('unauthorized')) {
        setErr('Sesioni skadoi. Duhet të dalësh dhe të hysh përsëri.')
      } else setErr(m)
    }
  }

  function onReauth() {
    logout()
    void navigate('/partner/login', { replace: true })
  }

  if (!token || !user) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <div className="mb-4">
        <Link
          to="/kitchen"
          className="text-sm text-amber-400/90 hover:text-amber-300"
        >
          ← Porositë
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Llogaria e stafit</h1>
      <p className={customerPanelSubtitle}>
        Përdoret e njëjta hyrje si për panelin e porosive (email i stafit). Nevojitet fjalëkalimi aktual për ta ndryshuar.
      </p>

      <p className="mt-4 text-sm text-zinc-400">
        <span className="text-zinc-500">Email:</span> {user.email}
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-4">
        <div>
          <label htmlFor="ka-current" className={customerLabelSm}>
            Fjalëkalimi aktual
          </label>
          <input
            id="ka-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={customerField}
            required
          />
        </div>
        <div>
          <label htmlFor="ka-new" className={customerLabelSm}>
            Fjalëkalim i ri (min. 6 karaktere)
          </label>
          <input
            id="ka-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={customerField}
            required
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="ka-confirm" className={customerLabelSm}>
            Përsërite fjalëkalimin e ri
          </label>
          <input
            id="ka-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={customerField}
            required
            minLength={6}
          />
        </div>
        {err ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <p>{err}</p>
            {err.startsWith('Sesioni skadoi') ? (
              <button type="button" className={`${customerBtnGhost} mt-2 text-xs`} onClick={() => onReauth()}>
                Hyr përsëri
              </button>
            ) : null}
          </div>
        ) : null}
        {msg ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {msg}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className={customerBtnPrimary}>
          {busy ? 'Duke ruajtur…' : 'Ruaj fjalëkalimin e ri'}
        </button>
      </form>
    </section>
  )
}
