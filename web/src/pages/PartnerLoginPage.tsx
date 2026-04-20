import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
  customerShellBg,
} from '../lib/customerTheme'
import { hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

export default function PartnerLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await login(email.trim(), password)
    setBusy(false)
    if (!r.ok) {
      setError(r.error ?? 'Hyrja dështoi.')
      return
    }

    const t = useAuthStore.getState().token
    if (!t || !hasRestaurantStaffRole(t)) {
      logout()
      setError(
        'Këto kredenciale nuk kanë akses në panelin e restorantit. Kontrollo emailin dhe fjalëkalimin, ose prit udhëzimet nga ne nëse sapo ke marrë llogarinë.',
      )
      return
    }

    navigate('/kitchen', { replace: true })
  }

  return (
    <div className={`${customerShellBg} relative`}>
      <header className="absolute left-0 right-0 top-0 z-10 px-4 pt-5 sm:px-8 sm:pt-7">
        <BrandLogo />
      </header>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-12 pt-24">
        <Link
          to="/"
          className={`${customerBtnGhost} mb-6 inline-flex w-fit items-center justify-center text-sm`}
        >
          ← Ballina
        </Link>

        <section className={`${customerCard} animate-auth-panel-in`}>
          <h1 className="text-2xl font-bold text-zinc-100">Hyrja e partnerit</h1>
          <p className={customerPanelSubtitle}>
            Pasi të keni <strong className="font-medium text-zinc-300">nënshkruar kontratën</strong>, ekipi ynë
            ju krijon llogarinë e stafit dhe ju dërgon <strong className="font-medium text-zinc-300">email + fjalëkalim</strong>{' '}
            (ose ju udhëzojmë për fjalëkalimin e parë). Kjo faqe është vetëm për panelin e porosive të restorantit.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="partner-login-email" className={customerLabelSm}>
                Email (nga onboarding)
              </label>
              <input
                id="partner-login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={customerField}
                placeholder="partneri@restoranti.com"
              />
            </div>
            <div>
              <label htmlFor="partner-login-password" className={customerLabelSm}>
                Fjalëkalimi
              </label>
              <input
                id="partner-login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={customerField}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={`${customerBtnPrimary} w-full`}>
              {busy ? 'Duke u kyçur…' : 'Hyr në panelin e restorantit'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Ende nuk ke kontratë?{' '}
            <Link to="/partner" className="font-semibold text-amber-400 hover:text-amber-300">
              Apliko si partner
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
