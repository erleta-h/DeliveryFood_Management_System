import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  PartnerCountryPicker,
  PartnerIconInput,
  PartnerIconSelect,
  PartnerMessageField,
  PartnerSubmitButton,
  partnerIcons,
} from '../components/partner/PartnerApplyFields'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import { customerPanelSubtitle, customerShellBg } from '../lib/customerTheme'
import { submitPartnerApplication } from './../lib/partnerApi'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.05] text-lg leading-none text-zinc-200 transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400/30'

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

  if (done) {
    return (
      <div className={`${customerShellBg} relative min-h-screen px-4 pb-16 pt-6 sm:px-8`}>
        <Link
          to="/"
          className={`${backIconBtnClass} absolute left-4 top-5 z-10 sm:left-8 sm:top-7`}
          aria-label="Kthehu te ballina"
        >
          ←
        </Link>
        <header className="mx-auto mb-10 flex justify-center pt-1">
          <BrandLogo />
        </header>
        <section className="mx-auto max-w-lg rounded-2xl border border-white/[0.1] bg-[#222636]/80 p-8 text-center text-zinc-100 shadow-[0_20px_56px_-12px_rgba(15,18,30,0.55)] backdrop-blur-md">
          <h1 className="text-2xl font-bold text-zinc-100">Faleminderit!</h1>
          <p className={`${customerPanelSubtitle} mx-auto max-w-md`}>
            Aplikimi u regjistrua. Ekipi ynë do të shqyrtojë të dhënat dhe do t’ju kontaktojë për hapat e
            radhës — përfshirë kontratën dhe hapjen e aksesit në panelin e partnerit. Nuk krijohet llogari
            derisa të finalizohet procesi.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className={`${customerShellBg} relative min-h-screen px-4 pb-20 pt-6 sm:px-8`}>
      <Link
        to="/"
        className={`${backIconBtnClass} absolute left-4 top-5 z-10 sm:left-8 sm:top-7`}
        aria-label="Kthehu te ballina"
      >
        ←
      </Link>
      <header className="mx-auto mb-8 flex justify-center pt-1">
        <BrandLogo />
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start">
        <div className="hidden lg:block">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">
            Për biznese të çdo madhësie
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight text-zinc-50">
            Rritemi bashkë
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-zinc-400">
            Listo restorantin te FoodDelivery dhe arrij klientë të rinj. Kjo është aplikim fillimor —
            pa llogari ende. Pas miratimit, të ndihmojmë me onboarding dhe menunë.
          </p>
          <p className="mt-6 text-sm">
            <Link
              to="/partner/login"
              className="font-semibold text-amber-400/95 underline-offset-4 hover:text-amber-300 hover:underline"
            >
              Ke tashmë kontratë? Hyr
            </Link>
          </p>
        </div>

        <section className="mx-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#1c2030]/90 p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] sm:p-7 lg:mx-0">
          <h1 className="text-xl font-bold text-zinc-100 lg:hidden">Bëhu partner</h1>
          <p className={`${customerPanelSubtitle} lg:hidden`}>
            Plotëso formularin. Nuk krijohet llogari derisa të kontaktojmë dhe të finalizohet marrëveshja.
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
    </div>
  )
}
