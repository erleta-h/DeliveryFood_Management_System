import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { BagIcon, ClockIcon, ShopIcon } from '../components/landing/landingIcons'
import {
  PartnerCountryPicker,
  PartnerIconInput,
  PartnerIconSelect,
  PartnerMessageField,
  PartnerSubmitButton,
  partnerIcons,
} from '../components/partner/PartnerApplyFields'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import { customerPanelSubtitle } from '../lib/customerTheme'
import { landingBtnGold, landingGlassCard, landingTextGold, LANDING_IMAGES } from '../lib/landingTheme'
import { submitPartnerApplication } from './../lib/partnerApi'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[#161922]/80 text-lg leading-none text-zinc-200 transition hover:border-[#ffc107]/30 hover:bg-[#ffc107]/10 hover:text-amber-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#ffc107]/20'

const PARTNER_BENEFITS: { icon: ReactNode; text: string }[] = [
  { icon: <ShopIcon className="h-[1.15rem] w-[1.15rem]" />, text: 'Shfaq restorantin në platformë' },
  { icon: <BagIcon className="h-[1.15rem] w-[1.15rem]" />, text: 'Prano porosi nga klientët' },
  { icon: partnerIcons.card, text: 'Menaxho menunë dhe çmimet' },
  { icon: <ClockIcon className="h-[1.15rem] w-[1.15rem]" />, text: 'Ndiq porositë në kohë reale' },
]

const PARTNER_STEPS = [
  { n: 1, title: 'Shqyrtojmë', sub: 'Aplikimin tënd' },
  { n: 2, title: 'Të kontaktojmë', sub: 'Për detajet' },
  { n: 3, title: 'Hapim llogarinë', sub: 'Pas kontratës' },
  { n: 4, title: 'Filloni', sub: 'Të pranoni porosi' },
] as const

function PartnerApplyBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="animate-auth-hero-in absolute inset-0">
        <img
          src={LANDING_IMAGES.partnerApplyBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[78%_center] opacity-[0.38] lg:opacity-[0.45]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c12] via-[#0a0c12]/90 via-[48%] to-[#0a0c12]/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12]/85 via-[#0a0c12]/20 to-[#0a0c12]/60" />
    </div>
  )
}

function PartnerApplyShell({ children, backTo = '/' }: { children: ReactNode; backTo?: string }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0a0c12] text-zinc-200/95 antialiased">
      <PartnerApplyBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-20 sm:px-8">
        <div className="relative mb-8 flex items-center justify-center pt-6 sm:mb-10 sm:pt-8">
          <Link
            to={backTo}
            className={`${backIconBtnClass} animate-site-nav absolute left-0 top-6 sm:top-8`}
            aria-label="Kthehu te ballina"
          >
            ←
          </Link>
          <div className="animate-site-logo-wrap">
            <BrandLogo withIcon />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function PartnerApplyLeftPanel({ onApplyClick }: { onApplyClick: () => void }) {
  return (
    <div className="relative order-2 hidden lg:block lg:order-1">
      <p className="animate-auth-hero-caption-in text-xs font-semibold uppercase tracking-[0.14em] text-[#ffc107]">
        Për restorante
      </p>
      <h1 className="animate-auth-stagger-in mt-3 text-[2.15rem] font-extrabold leading-[1.12] tracking-tight text-white xl:text-[2.45rem]" style={{ animationDelay: '0.48s' }}>
        Rrit biznesin me{' '}
        <span className={landingTextGold}>FoodDelivery</span>
      </h1>
      <p
        className="animate-auth-stagger-in mt-4 max-w-md text-base leading-relaxed text-zinc-400"
        style={{ animationDelay: '0.56s' }}
      >
        Listo restorantin, arrij klientë të rinj dhe menaxho porositë nga një panel i vetëm. Aplikimi
        është fillim — llogaria hapet pas miratimit dhe kontratës.
      </p>

      <ul className="mt-8 space-y-4">
        {PARTNER_BENEFITS.map(({ icon, text }, index) => (
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
        className="animate-auth-stagger-in mt-8 rounded-2xl border border-white/[0.08] bg-[#141824]/55 p-5 backdrop-blur-sm"
        style={{ animationDelay: '0.96s' }}
      >
        <p className="text-sm font-semibold text-zinc-200">Çka ndodh pas aplikimit?</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {PARTNER_STEPS.map((step, index) => (
            <div
              key={step.n}
              className="animate-auth-stagger-in text-center"
              style={{ animationDelay: `${1.04 + index * 0.06}s` }}
            >
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#ffc107]/15 text-xs font-bold text-[#ffc107]">
                {step.n}
              </span>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-zinc-200">{step.title}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{step.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onApplyClick}
        className={`${landingBtnGold} animate-auth-stagger-in mt-8 gap-2 px-6 py-3`}
        style={{ animationDelay: '1.28s' }}
      >
        <span className="opacity-90">{partnerIcons.user}</span>
        Apliko si partner
      </button>
      <p className="animate-auth-stagger-in mt-5 text-sm text-zinc-500" style={{ animationDelay: '1.36s' }}>
        Ke tashmë kontratë?{' '}
        <Link to="/partner/login" className={`font-semibold ${landingTextGold} hover:text-amber-300`}>
          Hyr
        </Link>
      </p>
    </div>
  )
}

const businessTypes = ['Restorant', 'Kafene / bar', 'Fast food', 'Tjetër']
const venueCounts = [
  { value: '1', label: '1 lokacion' },
  { value: '2-5', label: '2 – 5 lokacione' },
  { value: '6+', label: '6 ose më shumë' },
]

function buildOptionalMessage(businessNumber: string, message: string): string | undefined {
  const parts: string[] = []
  const nui = businessNumber.trim()
  const msg = message.trim()
  if (nui) parts.push(`NUI: ${nui}`)
  if (msg) parts.push(msg)
  return parts.length ? parts.join('\n\n') : undefined
}

export default function PartnerApplyPage() {
  const formRef = useRef<HTMLElement>(null)
  const [country, setCountry] = useState('Kosovë')
  const [businessType, setBusinessType] = useState(businessTypes[2])
  const [venueCountLabel, setVenueCountLabel] = useState(venueCounts[0].value)
  const [venueName, setVenueName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [contactFirstName, setContactFirstName] = useState('')
  const [contactLastName, setContactLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('Duhet të pranoni kushtet për të vazhduar.')
      return
    }
    const phoneErr = validatePhoneField(phone)
    if (phoneErr) {
      setError(phoneErr)
      return
    }
    setBusy(true)
    const r = await submitPartnerApplication({
      country,
      businessType,
      venueCountLabel,
      venueName: venueName.trim(),
      streetAddress: streetAddress.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      contactFirstName: contactFirstName.trim(),
      contactLastName: contactLastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: buildOptionalMessage(businessNumber, message),
    })
    setBusy(false)
    if (r.ok) setDone(true)
    else setError(r.message)
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (done) {
    return (
      <PartnerApplyShell>
        <section className={`${landingGlassCard} animate-auth-panel-in mx-auto max-w-lg p-8 text-center`}>
          <h1 className="text-2xl font-bold text-zinc-100">Faleminderit!</h1>
          <p className={`${customerPanelSubtitle} mx-auto max-w-md`}>
            Aplikimi u regjistrua. Ekipi ynë do të shqyrtojë të dhënat dhe do t’ju kontaktojë për hapat e
            radhës — përfshirë kontratën dhe hapjen e aksesit në panelin e partnerit. Nuk krijohet llogari
            derisa të finalizohet procesi.
          </p>
        </section>
      </PartnerApplyShell>
    )
  }

  return (
    <PartnerApplyShell>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-12">
        <PartnerApplyLeftPanel onApplyClick={scrollToForm} />

        <section
          id="partner-apply-form"
          ref={formRef}
          className="animate-auth-panel-in-delayed order-1 mx-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1c2030]/90 p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-7 lg:order-2 lg:mx-0"
        >
          <h1 className="animate-auth-stagger-in text-xl font-bold text-zinc-100 lg:hidden" style={{ animationDelay: '0.35s' }}>
            Bëhu partner
          </h1>
          <p className={`${customerPanelSubtitle} animate-auth-stagger-in lg:hidden`} style={{ animationDelay: '0.42s' }}>
            Plotëso formularin. Nuk krijohet llogari derisa të kontaktojmë dhe të finalizohet marrëveshja.
          </p>
          <p className="mb-4 text-sm text-zinc-500 lg:hidden">
            Ke tashmë kontratë?{' '}
            <Link to="/partner/login" className={`font-semibold ${landingTextGold} hover:text-amber-300`}>
              Hyr
            </Link>
          </p>
          <p className={`${customerPanelSubtitle} mb-6 hidden lg:block`}>
            Të dhënat shkojnë te ekipi ynë. Logimi në app për stafin krijohet vetëm pas hapave të
            miratimit.
          </p>

          <form onSubmit={onSubmit} className="partner-form space-y-4">
            <PartnerCountryPicker id="pa-country" value={country} onChange={setCountry} />

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <PartnerIconSelect
                id="pa-type"
                label="Lloji i biznesit"
                icon={partnerIcons.utensils}
                value={businessType}
                onChange={setBusinessType}
                required
              >
                {businessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </PartnerIconSelect>
              <PartnerIconSelect
                id="pa-venues"
                label="Sa lokacione keni?"
                icon={partnerIcons.mapPin}
                value={venueCountLabel}
                onChange={setVenueCountLabel}
                required
              >
                {venueCounts.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </PartnerIconSelect>
            </div>

            <PartnerIconInput
              id="pa-venue"
              label="Emri i biznesit"
              icon={partnerIcons.store}
              required
              value={venueName}
              onChange={setVenueName}
              placeholder="p.sh. OnBurger"
            />

            <PartnerIconInput
              id="pa-nui"
              label="Numri i biznesit / NUI"
              icon={partnerIcons.card}
              value={businessNumber}
              onChange={setBusinessNumber}
              placeholder="p.sh. 812345678"
            />

            <PartnerIconInput
              id="pa-street"
              label="Adresa"
              icon={partnerIcons.mapPin}
              required
              value={streetAddress}
              onChange={setStreetAddress}
              placeholder="Rruga B, Nr. 12"
              hint="p.sh. Rruga B, Nr. 12, Prishtinë"
            />

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <PartnerIconInput
                id="pa-post"
                label="Kodi postar"
                icon={partnerIcons.envelope}
                required
                value={postalCode}
                onChange={setPostalCode}
                placeholder="10000"
              />
              <PartnerIconInput
                id="pa-city"
                label="Qyteti"
                icon={partnerIcons.building}
                required
                value={city}
                onChange={setCity}
                placeholder="Prishtinë"
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <PartnerIconInput
                id="pa-fn"
                label="Emri i kontaktit"
                icon={partnerIcons.user}
                required
                value={contactFirstName}
                onChange={setContactFirstName}
                autoComplete="given-name"
              />
              <PartnerIconInput
                id="pa-ln"
                label="Mbiemri i kontaktit"
                icon={partnerIcons.user}
                required
                value={contactLastName}
                onChange={setContactLastName}
                autoComplete="family-name"
              />
            </div>

            <PhoneInputField
              id="pa-phone"
              className="min-w-0"
              variant="partner"
              label="Telefoni"
              required
              value={phone}
              onChange={setPhone}
            />

            <PartnerIconInput
              id="pa-email"
              label="Email"
              icon={partnerIcons.envelope}
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="onburger@gmail.com"
              autoComplete="email"
            />

            <PartnerMessageField
              id="pa-msg"
              value={message}
              onChange={setMessage}
            />

            <label className="flex cursor-pointer gap-3 text-left text-xs leading-relaxed text-zinc-400">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/10 text-amber-600"
              />
              <span>
                Duke klikuar «Dërgo aplikimin», konfirmoj se i kam lexuar kushtet e përgjithshme të
                shërbimit dhe politikën e privatësisë (version demo). Duhet të jeni 18+ për të vazhduar.
                Ky hap është vetëm aplikim — nuk hapet llogari derisa të na kontaktoni ju ose të ju
                kontaktojmë ne pas shqyrtimit.
              </span>
            </label>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <PartnerSubmitButton busy={busy} />
          </form>
        </section>
      </div>
    </PartnerApplyShell>
  )
}
