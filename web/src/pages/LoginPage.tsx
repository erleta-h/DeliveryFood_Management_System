import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import DriverLoginPage from './DriverLoginPage'
import { BrandLogo } from '../components/BrandLogo'
import { landingBtnGold, landingGlassCard, landingShellBg, landingTextGold, LANDING_IMAGES } from '../lib/landingTheme'
import { canAccessAdminPanel, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { useAuthStore } from '../store/authStore'
import {
  clearStaffCustomerAppMode,
  enableStaffCustomerAppMode,
} from '../lib/staffCustomerApp'

function loginSubtitle(next: string | null): string {
  if (next === 'admin') return 'Hyrje për administrimin e platformës.'
  if (next === 'driver') return 'Hyrje për llogarinë e deliverit.'
  return 'Hyr në llogarinë tënde dhe porosit ushqimin tënd të preferuar.'
}

function loginTitle(next: string | null): string {
  if (next === 'admin') return 'Paneli i platformës'
  return 'Mirë se erdhe përsëri! 👋'
}

const inputWrap =
  'mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-[#161922]/90 px-3 py-2.5 focus-within:border-[#ffc107]/35 focus-within:ring-2 focus-within:ring-[#ffc107]/10'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isDriverLogin =
    searchParams.get('next') === 'driver' || location.pathname === '/driver/login'

  if (isDriverLogin) {
    return <DriverLoginPage />
  }

  const next = searchParams.get('next')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await login(email.trim(), password)
    setBusy(false)
    if (r.ok) {
      const t = useAuthStore.getState().token
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

      if (t && hasRestaurantStaffRole(t) && !wantClientApp) {
        clearStaffCustomerAppMode()
        navigate('/kitchen', { replace: true })
        return
      }

      if (t && wantKitchen && hasRestaurantStaffRole(t)) {
        clearStaffCustomerAppMode()
        navigate('/kitchen', { replace: true })
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
    } else setError(r.error ?? 'Hyrja dështoi.')
  }

  return (
    <div className={`${landingShellBg} min-h-screen`}>
      <header className="absolute left-0 right-0 top-0 z-20 px-6 pt-6 lg:px-10 lg:pt-8">
        <BrandLogo withIcon />
      </header>

      <div className="relative mx-auto grid min-h-screen max-w-7xl overflow-x-clip lg:grid-cols-2 lg:items-center lg:gap-6 xl:gap-10">
        <div className="relative z-10 flex flex-col justify-center px-6 pb-12 pt-24 lg:px-10 lg:py-16">
          <section className={`${landingGlassCard} animate-auth-panel-in w-full max-w-md p-7 sm:p-8`}>
            <h1 className="text-2xl font-bold text-white sm:text-[1.65rem]">{loginTitle(next)}</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{loginSubtitle(next)}</p>

            <form onSubmit={onSubmit} className="auth-form mt-7 space-y-5">
              <div>
                <label htmlFor="login-email" className="text-sm font-medium text-zinc-300">
                  Email
                </label>
                <div className={inputWrap}>
                  <span className="text-zinc-500" aria-hidden>
                    ✉
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-sm font-medium text-zinc-300">
                  Fjalëkalimi
                </label>
                <div className={inputWrap}>
                  <span className="text-zinc-500" aria-hidden>
                    🔒
                  </span>
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    placeholder="Fjalëkalimi yt"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="shrink-0 text-zinc-500 transition hover:text-zinc-300"
                    aria-label={showPw ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#ffc107]"
                />
                Më mbaj të kyçur
              </label>

              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className={`${landingBtnGold} w-full py-3`}>
                {busy ? 'Duke u kyçur…' : 'Hyr në llogari →'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-zinc-500">
              Nuk ke llogari?{' '}
              <Link to="/signup" className={`font-semibold ${landingTextGold} hover:text-amber-300`}>
                Regjistrohu
              </Link>
            </p>
          </section>
        </div>

        <div className="pointer-events-none relative hidden lg:block lg:-mr-8 lg:min-h-[28rem] xl:-mr-12 xl:min-h-[32rem]">
          <div className="animate-auth-hero-in absolute inset-0 overflow-visible">
            <img
              src={LANDING_IMAGES.hero}
              alt=""
              className="absolute right-0 top-1/2 w-[118%] max-w-none max-h-[30rem] -translate-y-1/2 object-contain object-right xl:max-h-[36rem] xl:w-[125%]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 14%, rgba(0,0,0,0.85) 30%, black 48%, black 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 14%, rgba(0,0,0,0.85) 30%, black 48%, black 100%)',
              }}
            />
          </div>
          <p className="animate-auth-hero-caption-in absolute bottom-10 right-6 z-10 max-w-md text-right text-3xl font-extrabold leading-tight text-white xl:bottom-14 xl:right-10 xl:text-4xl">
            Porosia jote,{' '}
            <span className={landingTextGold}>më afër se kurrë.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
