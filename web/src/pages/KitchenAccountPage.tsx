import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/authApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
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
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const mustChangePassword = user?.mustChangePassword === true
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  useEffect(() => {
    if (mustChangePassword) setShowPasswordSection(true)
  }, [mustChangePassword])

  function openPasswordSection() {
    setSuccessBanner(null)
    setErr(null)
    setShowPasswordSection(true)
  }

  function togglePasswordSection() {
    setShowPasswordSection((prev) => {
      const next = !prev
      if (next) {
        setSuccessBanner(null)
      } else {
        setErr(null)
      }
      return next
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
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
      await refreshUser()
      setErr(null)
      setShowPasswordSection(false)
      setSuccessBanner(
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
          to="/kitchen/orders"
          className="text-sm text-amber-400/90 hover:text-amber-300"
        >
          ← Porositë
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Llogaria e stafit</h1>
      <p className={customerPanelSubtitle}>
        Përdoret e njëjta hyrje si për panelin e porosive (email i stafit). Për të ndryshuar fjalëkalimin hap seksionin{' '}
        <span className="text-zinc-300">Siguria e llogarisë</span> ose lidhjen më poshtë.
      </p>

      {user.mustChangePassword ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
        >
          <p className="font-semibold text-amber-100">Ndrysho fjalëkalimin e parë</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Llogaria u krijua me fjalëkalim të caktuar nga platforma. Hap formularin më poshtë dhe vendos një fjalëkalim tënd
            — pastaj do të mund të përdorësh menunë dhe porositë.
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-zinc-400">
        <span className="text-zinc-500">Email:</span> {user.email}
      </p>
      {!mustChangePassword ? (
        <p className="mt-2">
          <button
            type="button"
            onClick={openPasswordSection}
            className="text-sm font-medium text-amber-400/90 underline-offset-2 hover:text-amber-300 hover:underline"
          >
            Ndrysho fjalëkalimin
          </button>
        </p>
      ) : null}

      {successBanner ? (
        <p className="mt-4 max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {successBanner}
        </p>
      ) : null}

      {!mustChangePassword ? (
        <button
          type="button"
          onClick={togglePasswordSection}
          className="mt-6 flex w-full max-w-md items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
        >
          Siguria e llogarisë
          <span className="text-zinc-500">{showPasswordSection ? '▲' : '▼'}</span>
        </button>
      ) : null}

      {showPasswordSection ? (
        <form onSubmit={onSubmit} className={`${customerCardMuted} mt-3 max-w-md space-y-4 p-4`}>
          <p className="text-xs text-zinc-500">
            Nevojitet fjalëkalimi aktual (ose i caktuar nga platforma, nëse është hera e parë).
          </p>
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
          <button type="submit" disabled={busy} className={customerBtnPrimary}>
            {busy ? 'Duke ruajtur…' : 'Ruaj fjalëkalimin e ri'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
