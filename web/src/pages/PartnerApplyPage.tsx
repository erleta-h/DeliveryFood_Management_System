import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  customerBtnPrimary,
  customerCard,
  customerFieldPartner,
  customerLabelForm,
  customerPanelSubtitle,
  customerSelect,
  customerShellBg,
} from '../lib/customerTheme'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.05] text-lg leading-none text-zinc-200 transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400/30'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import { submitPartnerApplication } from './../lib/partnerApi'

const countries = ['Kosovë', 'Shqipëri', 'Maqedoni e Veriut', 'Tjetër']
const businessTypes = ['Restorant', 'Kafene / bar', 'Fast food', 'Tjetër']
const venueCounts = [
  { value: '1', label: '1 lokacion' },
  { value: '2-5', label: '2 – 5 lokacione' },
  { value: '6+', label: '6 ose më shumë' },
]

export default function PartnerApplyPage() {
  const [country, setCountry] = useState(countries[0])
  const [businessType, setBusinessType] = useState(businessTypes[0])
  const [venueCountLabel, setVenueCountLabel] = useState(venueCounts[0].value)
  const [venueName, setVenueName] = useState('')
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
      venueName,
      streetAddress,
      postalCode,
      city,
      contactFirstName,
      contactLastName,
      phone,
      email,
      message: message.trim() || undefined,
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
        <section className={`${customerCard} mx-auto max-w-lg text-center`}>
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

      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-start">
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

        <section className={`${customerCard} !p-5 sm:!p-7`}>
          <h1 className="text-xl font-bold text-zinc-100 lg:hidden">Bëhu partner</h1>
          <p className={`${customerPanelSubtitle} lg:hidden`}>
            Plotëso formularin. Nuk krijohet llogari derisa të kontaktojmë dhe të finalizohet marrëveshja.
          </p>
          <p className={`${customerPanelSubtitle} mb-6 hidden lg:block`}>
            Të dhënat shkojnë te ekipi ynë. Logimi në app për stafin krijohet vetëm pas hapave të
            miratimit.
          </p>

          <form onSubmit={onSubmit} className="partner-form space-y-5">
            <div className="min-w-0">
              <label htmlFor="pa-country" className={customerLabelForm}>
                Vendi
              </label>
              <select
                id="pa-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={customerSelect}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="pa-type" className={customerLabelForm}>
                  Lloji i biznesit
                </label>
                <select
                  id="pa-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className={customerSelect}
                >
                  {businessTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="pa-venues" className={customerLabelForm}>
                  Sa lokacione keni?
                </label>
                <select
                  id="pa-venues"
                  value={venueCountLabel}
                  onChange={(e) => setVenueCountLabel(e.target.value)}
                  className={customerSelect}
                >
                  {venueCounts.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="pa-venue" className={customerLabelForm}>
                Emri i lokacionit / biznesit
              </label>
              <input
                id="pa-venue"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className={customerFieldPartner}
                placeholder="p.sh. Pizzeria Napoli"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="pa-street" className={customerLabelForm}>
                Adresa (rruga)
              </label>
              <input
                id="pa-street"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className={customerFieldPartner}
                placeholder="Rruga, numri"
              />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="pa-post" className={customerLabelForm}>
                  Kodi postar
                </label>
                <input
                  id="pa-post"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={customerFieldPartner}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="pa-city" className={customerLabelForm}>
                  Qyteti
                </label>
                <input
                  id="pa-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={customerFieldPartner}
                  placeholder="p.sh. Prishtinë"
                />
              </div>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="pa-fn" className={customerLabelForm}>
                  Emri
                </label>
                <input
                  id="pa-fn"
                  required
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  className={customerFieldPartner}
                  autoComplete="given-name"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="pa-ln" className={customerLabelForm}>
                  Mbiemri
                </label>
                <input
                  id="pa-ln"
                  required
                  value={contactLastName}
                  onChange={(e) => setContactLastName(e.target.value)}
                  className={customerFieldPartner}
                  autoComplete="family-name"
                />
              </div>
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
            <div className="min-w-0">
              <label htmlFor="pa-email" className={customerLabelForm}>
                Email
              </label>
              <input
                id="pa-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={customerFieldPartner}
                autoComplete="email"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="pa-msg" className={customerLabelForm}>
                Mesazh (opsional)
              </label>
              <textarea
                id="pa-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${customerFieldPartner} min-h-[88px]`}
                placeholder="Çfarë dëshironi të na tregoni?"
              />
            </div>
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

            <button type="submit" disabled={busy} className={`${customerBtnPrimary} w-full`}>
              {busy ? 'Duke dërguar…' : 'Dërgo aplikimin'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
