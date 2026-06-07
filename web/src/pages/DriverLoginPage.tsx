import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { canAccessAdminPanel, hasDriverRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'

function IconMail() {
  return (
    <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function IconEye({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/** Siluetë deliver — dekorim poshtë majtas */
function ScooterSilhouette() {
  return (
    <div
      className="animate-auth-stagger-in pointer-events-none absolute bottom-0 left-0 z-0 w-[min(420px,55vw)] opacity-[0.35]"
      style={{ animationDelay: '0.55s' }}
      aria-hidden
    >
      <svg viewBox="0 0 320 200" className="h-auto w-full text-zinc-950" fill="currentColor">
        <ellipse cx="70" cy="175" rx="28" ry="8" fill="currentColor" opacity="0.5" />
        <ellipse cx="220" cy="178" rx="32" ry="9" fill="currentColor" opacity="0.5" />
        <path d="M95 120h80l25 45H70l25-45z" />
        <circle cx="70" cy="165" r="22" />
        <circle cx="220" cy="168" r="24" />
        <path d="M120 90c20-35 55-55 90-45 15 40-5 75-35 95H120z" />
        <circle cx="255" cy="95" r="8" fill="#fbbf24" opacity="0.9" />
        <circle cx="40" cy="100" r="6" fill="#fef3c7" opacity="0.8" />
      </svg>
    </div>
  )
}

export default function DriverLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [email, setEmail] = useState(() => sessionStorage.getItem('fd_driver_login_email') ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(() => sessionStorage.getItem('fd_driver_remember') === '1')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await login(email.trim(), password)
    setBusy(false)
    if (r.ok) {
      if (remember) {
        sessionStorage.setItem('fd_driver_login_email', email.trim())
        sessionStorage.setItem('fd_driver_remember', '1')
      } else {
        sessionStorage.removeItem('fd_driver_login_email')
        sessionStorage.removeItem('fd_driver_remember')
      }

      const t = useAuthStore.getState().token
      if (t && canAccessAdminPanel(t)) {
        navigate('/admin', { replace: true })
        return
      }
      if (t && hasDriverRole(t)) {
        navigate('/driver', { replace: true })
        return
      }
      logout()
      setError(
        'Kjo llogari nuk është deliver i miratuar. Aktivizo llogarinë me linkun nga emaili ose apliko te /driver/apply.',
      )
      return
    }
    setError(r.error ?? 'Hyrja dështoi.')
  }

  const fieldWrap =
    'flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#141a28] px-3 py-2.5 focus-within:border-orange-500/40 focus-within:ring-1 focus-within:ring-orange-500/25'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c1018] text-zinc-200">
      {/* Sfond harte / grid */}
      <div className="animate-auth-hero-in pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1018]/20 via-transparent to-[#0c1018]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(249,115,22,0.08),transparent_55%)]" />
      </div>

      <ScooterSilhouette />

      <header className="absolute left-0 right-0 top-0 z-10 px-4 pt-5 sm:px-8 sm:pt-7">
        <BrandLogo entrance />
      </header>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-16 pt-24">
        <section className="animate-auth-panel-in-delayed rounded-2xl border border-white/[0.08] bg-[#151b2b]/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <h1
            className="animate-auth-stagger-in text-center text-2xl font-bold text-white"
            style={{ animationDelay: '0.38s' }}
          >
            Hyr në llogari
          </h1>
          <p
            className="animate-auth-stagger-in mt-1 text-center text-sm text-zinc-400"
            style={{ animationDelay: '0.46s' }}
          >
            Hyrje për deliverit e aprovuar.
          </p>

          <form onSubmit={onSubmit} className="auth-form mt-8 space-y-5 [--auth-autofill-bg:#141a28]">
            <div className="animate-auth-stagger-in" style={{ animationDelay: '0.54s' }}>
              <label htmlFor="drv-email" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <div className={`${fieldWrap} mt-1.5 transition-all duration-200`}>
                <IconMail />
                <input
                  id="drv-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@shembull.com"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="animate-auth-stagger-in" style={{ animationDelay: '0.62s' }}>
              <label htmlFor="drv-pw" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Fjalëkalimi
              </label>
              <div className={`${fieldWrap} mt-1.5 transition-all duration-200`}>
                <IconLock />
                <input
                  id="drv-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Fjalëkalimi juaj"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  className="shrink-0 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                >
                  <IconEye open={showPw} />
                </button>
              </div>
            </div>

            <label
              className="animate-auth-stagger-in flex cursor-pointer items-center gap-2 text-sm text-zinc-400"
              style={{ animationDelay: '0.7s' }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Më mbaj të kyçur
            </label>

            {error ? (
              <p className="animate-auth-stagger-in rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="animate-auth-stagger-in w-full rounded-lg bg-orange-500 py-3 text-sm font-bold text-zinc-950 shadow-[0_4px_24px_rgba(249,115,22,0.35)] transition hover:bg-orange-400 hover:shadow-[0_6px_28px_rgba(249,115,22,0.45)] active:scale-[0.99] disabled:opacity-50"
              style={{ animationDelay: '0.78s' }}
            >
              {busy ? 'Duke u kyçur…' : 'Hyr'}
            </button>
          </form>

          <div className="animate-auth-stagger-in relative my-6" style={{ animationDelay: '0.86s' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider text-zinc-500">
              <span className="bg-[#151b2b] px-3">ose</span>
            </div>
          </div>

          <Link
            to="/activate-account"
            className="animate-auth-stagger-in flex w-full items-center justify-center gap-2 rounded-lg border-2 border-orange-500/80 bg-transparent py-3 text-sm font-semibold text-orange-400 transition hover:bg-orange-500/10 active:scale-[0.99]"
            style={{ animationDelay: '0.94s' }}
          >
            <IconMail />
            Aktivizo llogarinë tuaj
          </Link>

          <div
            className="animate-auth-stagger-in mt-6 flex gap-3 rounded-xl border border-white/[0.06] bg-[#0f141f] px-3 py-3 text-xs leading-relaxed text-zinc-400"
            style={{ animationDelay: '1.02s' }}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-600 text-[10px] font-bold text-zinc-500">
              i
            </span>
            <p>
              <span className="font-medium text-zinc-300">Nuk e keni aktivizuar ende llogarinë?</span>
              <br />
              Kontrolloni emailin tuaj për linkun e aktivizimit.
            </p>
          </div>

          <p
            className="animate-auth-stagger-in mt-4 text-center text-xs text-zinc-500"
            style={{ animationDelay: '1.1s' }}
          >
            Nuk je deliver i miratuar?{' '}
            <Link to="/driver/apply" className="font-semibold text-orange-400 hover:text-orange-300">
              Apliko si Deliver
            </Link>
          </p>
        </section>
      </div>

      <footer
        className="animate-auth-stagger-in relative z-10 pb-6 text-center text-xs text-zinc-600"
        style={{ animationDelay: '1.18s' }}
      >
        © {new Date().getFullYear()} FoodDelivery. Të gjitha të drejtat e rezervuara.
      </footer>
    </div>
  )
}