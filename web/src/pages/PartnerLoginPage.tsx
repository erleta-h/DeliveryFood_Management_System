import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { ClockIcon } from '../components/landing/landingIcons'
import { partnerIcons } from '../components/partner/PartnerApplyFields'
import { hasRestaurantStaffRole } from '../lib/jwtRoles'
import { landingBtnGold, landingGlassCard, landingTextGold, LANDING_IMAGES } from '../lib/landingTheme'
import { useAuthStore } from '../store/authStore'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[#161922]/80 text-lg leading-none text-zinc-200 transition hover:border-[#ffc107]/30 hover:bg-[#ffc107]/10 hover:text-amber-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#ffc107]/20'

const inputWrap =
  'mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-[#161922]/90 px-3 py-2.5 focus-within:border-[#ffc107]/35 focus-within:ring-2 focus-within:ring-[#ffc107]/10'

const PARTNER_LOGIN_FEATURES: { icon: ReactNode; text: string }[] = [
  { icon: <ClockIcon className="h-[1.15rem] w-[1.15rem]" />, text: 'Menaxho porositë në kohë reale' },
  {
    icon: (
      <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" strokeLinecap="round" />
      </svg>
    ),
    text: 'Përditëso statusin e porosive',
  },
  {
    icon: (
      <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 19V5M4 19h16M8 15v-3M12 15V9M16 15V11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    text: 'Shiko historikun dhe performancën',
  },
]

function PartnerLoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="animate-auth-hero-in absolute inset-0 scale-105">
        <img
          src={LANDING_IMAGES.partnerLoginBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.52] lg:opacity-[0.58]"
        />
      </div>
      <div className="absolute inset-0 bg-[#0a0c12]/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_45%,#0a0c12_0%,#0a0c12/88_42%,transparent_72%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12]/75 via-transparent to-[#0a0c12]/45" />
    </div>
  )
}

function PartnerLoginLeftPanel() {
  return (
    <div className="relative hidden lg:block lg:max-w-md lg:pt-4 xl:max-w-lg">
      <p className="animate-auth-hero-caption-in text-xs font-semibold uppercase tracking-[0.14em] text-[#ffc107]">
        Për restorante partner
      </p>
      <h1
        className="animate-auth-stagger-in mt-3 text-[2.15rem] font-extrabold leading-[1.12] tracking-tight text-white xl:text-[2.45rem]"
        style={{ animationDelay: '0.48s' }}
      >
        Paneli i{' '}
        <span className={landingTextGold}>restorantit</span>
      </h1>
      <p
        className="animate-auth-stagger-in mt-4 text-base leading-relaxed text-zinc-400"
        style={{ animationDelay: '0.56s' }}
      >
        Ky panel është për restorantet e miratuara nga FoodDelivery — menaxho porositë, statusin dhe stafin
        pas kontratës.
      </p>

      <ul className="mt-8 space-y-4">
        {PARTNER_LOGIN_FEATURES.map(({ icon, text }, index) => (
          <li
            key={text}
            className="animate-auth-stagger-in flex items-center gap-3.5"
            style={{ animationDelay: `${0.64 + index * 0.07}s` }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffc107]/25 bg-[#ffc107]/10 text-[#ffc107]">
              {icon}
            </span>
            <span className="text-sm font-medium text-zinc-200">{text}</span>
          </li>
        ))}
      </ul>

      <div
        className="animate-auth-stagger-in mt-8 flex gap-3 rounded-2xl border border-white/[0.08] bg-[#141824]/55 p-4 backdrop-blur-sm"
        style={{ animationDelay: '0.88s' }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffc107]/10 text-[#ffc107]">
          <svg className="h-[1.1rem] w-[1.1rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4Z" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-sm leading-relaxed text-zinc-400">
          Aksesi jepet vetëm pas miratimit të aplikimit dhe nënshkrimit të kontratës. Nëse sapo ke aplikuar,
          prit udhëzimet nga ekipi ynë.
        </p>
      </div>
    </div>
  )
}

export default function PartnerLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
    <div className="relative min-h-screen overflow-x-clip bg-[#0a0c12] text-zinc-200/95 antialiased">
      <PartnerLoginBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 sm:px-8">
        <header className="relative flex shrink-0 items-center justify-between pt-6 sm:pt-8">
          <Link to="/" className={`${backIconBtnClass} animate-site-nav`} aria-label="Kthehu te ballina">
            ←
          </Link>
          <div className="animate-site-logo-wrap absolute left-1/2 -translate-x-1/2">
            <BrandLogo withIcon />
          </div>
          <div className="w-10" aria-hidden />
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-2 lg:gap-12 lg:py-12">
          <PartnerLoginLeftPanel />

          <section className={`${landingGlassCard} animate-auth-panel-in-delayed mx-auto w-full max-w-md bg-[#1c2030]/92 p-7 sm:p-8 lg:mx-0 lg:ml-auto`}>
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-[#ffc107]/25 bg-[#ffc107]/10 text-[#ffc107]">
              {partnerIcons.store}
            </div>
            <h2 className="text-2xl font-bold text-white">Hyrja e partnerit</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Përdor kredencialet që ke marrë pas onboarding-ut dhe kontratës.
            </p>

            <form onSubmit={onSubmit} className="auth-form mt-7 space-y-5">
              <div>
                <label htmlFor="partner-login-email" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email (nga onboarding)
                </label>
                <div className={inputWrap}>
                  <span className="text-zinc-500" aria-hidden>
                    {partnerIcons.envelope}
                  </span>
                  <input
                    id="partner-login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    placeholder="partneri@restoranti.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="partner-login-password" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Fjalëkalimi
                </label>
                <div className={inputWrap}>
                  <span className="text-zinc-500" aria-hidden>
                    🔒
                  </span>
                  <input
                    id="partner-login-password"
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

              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className={`${landingBtnGold} w-full py-3`}>
                {busy ? 'Duke u kyçur…' : 'Hyr në panelin e restorantit →'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-zinc-500">
              Ende nuk ke kontratë?{' '}
              <Link to="/partner/apply" className={`font-semibold ${landingTextGold} hover:text-amber-300`}>
                Apliko si partner
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
