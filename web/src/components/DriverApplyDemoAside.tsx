import { Link } from 'react-router-dom'
import { ClockIcon } from './landing/landingIcons'

const FEATURES = [
  {
    icon: (
      <ClockIcon className="h-5 w-5" />
    ),
    title: 'Orar fleksibil',
    sub: 'Punon kur të përshtatet ty.',
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2.25" />
      </svg>
    ),
    title: 'Porosi afër teje',
    sub: 'Porosi në zonën tënde.',
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" strokeLinecap="round" />
      </svg>
    ),
    title: 'Pagesa javore',
    sub: 'Përfitimet e grumbulluara.',
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 12a8 8 0 0 1 16 0v4H4v-4Z" strokeLinejoin="round" />
        <path d="M8 16v2a2 2 0 0 0 4 0v-2M12 8V5" strokeLinecap="round" />
      </svg>
    ),
    title: 'Mbështetje 24/7',
    sub: 'Ekipi ynë të ndihmon.',
  },
] as const

const STEPS = [
  { n: 1, title: 'Plotëso aplikimin', body: 'Dërgo të dhënat dhe dokumentet për shqyrtim.' },
  { n: 2, title: 'Shqyrtimi nga admini', body: 'Verifikojmë dokumentet dhe mjetin tënd.' },
  { n: 3, title: 'Aktivizo llogarinë', body: 'Merr email me link aktivizimi dhe krijo fjalëkalimin.' },
  { n: 4, title: 'Fillo të pranosh porosi', body: 'Hyr në panel dhe prano porositë e caktuara.' },
] as const

const REQUIREMENTS = [
  'Të paktën 18 vjeç',
  'Patentë e vlefshme',
  'Android ose iPhone',
  'Mjet transporti (motor, biçikletë, veturë)',
] as const

type Props = { className?: string }

export function DriverApplyDemoAside({ className = '' }: Props) {
  return (
    <aside className={`relative ${className}`} aria-labelledby="driver-apply-heading">
      <p className="animate-auth-hero-caption-in text-xs font-semibold uppercase tracking-[0.14em] text-sky-400">
        Bëhu shofer
      </p>
      <h1
        id="driver-apply-heading"
        className="animate-auth-stagger-in mt-3 text-[2.15rem] font-extrabold leading-[1.12] tracking-tight text-white xl:text-[2.45rem]"
        style={{ animationDelay: '0.48s' }}
      >
        Fillo të dorëzosh porosi me{' '}
        <span className="text-[#ffc107]">FoodDelivery</span>
      </h1>
      <p
        className="animate-auth-stagger-in mt-4 max-w-md text-base leading-relaxed text-zinc-400"
        style={{ animationDelay: '0.56s' }}
      >
        Fitoni duke dorëzuar porosi në kohën tuaj të lirë. Aplikimi zgjat pak minuta — llogaria aktivizohet pas
        miratimit.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {FEATURES.map(({ icon, title, sub }, index) => (
          <div
            key={title}
            className="animate-auth-stagger-in rounded-xl border border-white/[0.06] bg-[#141824]/45 p-3.5 backdrop-blur-sm"
            style={{ animationDelay: `${0.64 + index * 0.06}s` }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-300">
              {icon}
            </span>
            <p className="mt-2.5 text-sm font-semibold text-zinc-100">{title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="animate-auth-stagger-in mt-8" style={{ animationDelay: '0.9s' }}>
        <p className="text-sm font-semibold text-zinc-200">Rrjedha e aplikimit</p>
        <ol className="relative mt-4 space-y-0">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative flex gap-4 pb-7 last:pb-0">
              {i < STEPS.length - 1 ? (
                <div
                  className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-sky-500/45 to-sky-500/10"
                  aria-hidden
                />
              ) : null}
              <div
                className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-200 ring-2 ring-sky-500/35"
                aria-hidden
              >
                {s.n}
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-zinc-100">{s.title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div
        className="animate-auth-stagger-in mt-6 flex gap-3 rounded-xl border border-[#ffc107]/25 bg-[#ffc107]/5 px-4 py-3"
        style={{ animationDelay: '1.05s' }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffc107]/15 text-[#ffc107]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4Z" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-sm leading-relaxed text-zinc-400">
          <span className="font-semibold text-[#ffc107]">Këshillë: </span>
          pas miratimit merrni email me link aktivizimi; vetëm atëherë krijoni fjalëkalimin dhe hyni në panel.
        </p>
      </div>

      <div
        className="animate-auth-stagger-in mt-5 rounded-2xl border border-white/[0.08] bg-[#141824]/55 p-5 backdrop-blur-sm"
        style={{ animationDelay: '1.12s' }}
      >
        <p className="text-sm font-semibold text-zinc-200">Kërkesat minimale</p>
        <ul className="mt-3 space-y-2">
          {REQUIREMENTS.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
              <span className="mt-0.5 text-emerald-400" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="animate-auth-stagger-in mt-6 text-sm text-zinc-500" style={{ animationDelay: '1.2s' }}>
        Ke tashmë llogari deliver?{' '}
        <Link to="/driver/login" className="font-semibold text-sky-400 hover:text-sky-300">
          Hyr
        </Link>
      </p>
    </aside>
  )
}

export const driverApplyShellBg =
  'relative min-h-screen overflow-x-clip antialiased font-sans text-zinc-200/95 bg-[#0a0c10] [background-image:radial-gradient(ellipse_80%_50%_at_15%_20%,rgba(56,189,248,0.07)_0%,transparent_55%),radial-gradient(ellipse_70%_45%_at_85%_75%,rgba(56,189,248,0.05)_0%,transparent_50%),linear-gradient(180deg,#0b0e14_0%,#0a0c12_48%,#080a0f_100%)]'
