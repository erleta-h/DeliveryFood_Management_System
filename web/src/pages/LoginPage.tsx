import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { canAccessAdminPanel, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'
import {
  clearStaffCustomerAppMode,
  enableStaffCustomerAppMode,
} from '../lib/staffCustomerApp'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
    if (r.ok) {
      const t = useAuthStore.getState().token
      const next = searchParams.get('next')
      const wantAdmin = next === 'admin'
      const wantKitchen = next === 'kitchen'
      const wantClientApp = next === 'app' || next === 'customer'

      if (t && canAccessAdminPanel(t)) {
        navigate('/admin', { replace: true })
        return
      }
      if (wantAdmin) {
        logout()
        setError(
          'Kjo llogari nuk ka akses në panelin e platformës (Admin ose Support). Përdor kredencialet e duhura ose hap /login pa parametër për hyrje klient.',
        )
        return
      }

      const wantDriver = next === 'driver'
      if (wantDriver && t && !hasDriverRole(t)) {
        logout()
        setError(
          'Kjo llogari nuk ka rol Deliver (Driver). Apliko te /driver/apply ose përdor emailin e miratuar.',
        )
        return
      }

      /** Stafi i restorantit → paneli i porosive, përveç kur kërkohet qartë aplikacioni klient (`?next=app|customer`). */
      if (t && hasRestaurantStaffRole(t) && !wantClientApp) {
        clearStaffCustomerAppMode()
        navigate('/kitchen/orders', { replace: true })
        return
      }

      if (t && wantKitchen && hasRestaurantStaffRole(t)) {
        clearStaffCustomerAppMode()
        navigate('/kitchen/orders', { replace: true })
        return
      }
      if (t && wantClientApp && hasRestaurantStaffRole(t)) {
        enableStaffCustomerAppMode()
        navigate('/app', { replace: true })
        return
      }
      if (t && wantDriver && hasDriverRole(t)) {
        navigate('/driver', { replace: true })
        return
      }
      if (t && hasDriverRole(t) && !canAccessAdminPanel(t)) {
        navigate('/driver', { replace: true })
        return
      }
      navigate('/app', { replace: true })
    }
    else setError(r.error ?? 'Hyrja dështoi.')
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
          ← Kthehu në ballinë
        </Link>

        <section className={`${customerCard} animate-auth-panel-in`}>
          <h1 className="text-2xl font-bold text-zinc-100">Hyr në llogari</h1>
          <p className={customerPanelSubtitle}>
            {searchParams.get('next') === 'admin'
              ? 'Hyr si administrator: vendos email dhe fjalëkalim të llogarisë që ka rol Admin në sistem.'
              : searchParams.get('next') === 'driver'
                ? 'Hyr me llogarinë e miratuar si Deliver (Driver). Nëse je kyçur si klient, përdor kredencialet e Deliver ose dil dhe hy përsëri.'
                : 'Përdor emailin dhe fjalëkalimin. Stafi i restorantit çohet te paneli i kuzhinës; për hyrje si klient me të njëjtën llogari përdor /login?next=app.'}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className={customerLabelSm}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={customerField}
                placeholder="emri@shembull.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className={customerLabelSm}>
                Fjalëkalimi
              </label>
              <input
                id="login-password"
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
              {busy ? 'Duke u kyçur…' : 'Hyr'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Nuk ke llogari?{' '}
            <Link to="/signup" className="font-semibold text-amber-400 hover:text-amber-300">
              Regjistruhu
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
