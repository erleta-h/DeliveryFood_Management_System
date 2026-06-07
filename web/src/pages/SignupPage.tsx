import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { BagIcon, LocationPinLargeIcon, ScooterIcon } from '../components/landing/landingIcons'
import { DeliveryLocationMapDialog } from '../components/DeliveryLocationMapDialog'
import { LocateIcon, PinIcon } from '../components/DeliveryAddressSection'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import {
  getSignupAddressPrefill,
  loadDeliveryLocation,
  saveDeliveryLocation,
  type StoredDeliveryLocation,
} from '../lib/deliveryLocationStorage'
import { KOSOVO_CITIES } from '../lib/kosovoCities'
import { reverseGeocode, searchAddress } from '../lib/nominatim'
import {
  landingBtnGold,
  landingGlassCard,
  landingShellBg,
  landingTextGold,
  LANDING_IMAGES,
} from '../lib/landingTheme'
import { useAuthStore } from '../store/authStore'

const fieldLabel = 'text-sm font-medium text-zinc-300'

const fieldShell =
  'mt-1 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161922]/80 px-3 py-2.5 transition focus-within:border-[#ffc107]/25 focus-within:ring-1 focus-within:ring-[#ffc107]/10'

const fieldInput =
  'mt-1 w-full rounded-xl border border-white/[0.08] bg-[#161922]/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#ffc107]/25 focus:ring-1 focus:ring-[#ffc107]/10'

const addressBar =
  'mt-1 flex h-11 items-center gap-1 rounded-xl border border-white/[0.08] bg-[#161922]/80 pl-1 pr-1 transition focus-within:border-[#ffc107]/25 focus-within:ring-1 focus-within:ring-[#ffc107]/10'

const CITY_OPTIONS = KOSOVO_CITIES.filter(
  (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
)

const SIGNUP_HERO_FEATURES = [
  { Icon: ScooterIcon, title: 'Dërgesë e shpejtë', sub: 'Në kohë reale' },
  { Icon: LocationPinLargeIcon, title: 'Adresa të ruajtura', sub: 'Porosit më shpejt' },
  { Icon: BagIcon, title: 'Porosi të lehta', sub: 'Riadhdos porositë e tua' },
] as const

function applyPrefill(saved: StoredDeliveryLocation) {
  const p = getSignupAddressPrefill(saved)
  return { line1: p.line1, city: p.city, postalCode: p.postalCode, lat: saved.lat, lng: saved.lng }
}

export default function SignupPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState(KOSOVO_CITIES[0]?.name ?? 'Prishtinë')
  const [postalCode, setPostalCode] = useState('')
  const [marker, setMarker] = useState<[number, number] | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const saved = loadDeliveryLocation()
    if (!saved) return
    const p = applyPrefill(saved)
    if (p.line1) setLine1(p.line1)
    if (p.city) setCity(p.city)
    if (p.postalCode) setPostalCode(p.postalCode)
    setMarker([p.lat, p.lng])
  }, [])

  function onMapSaved(loc: StoredDeliveryLocation) {
    const p = applyPrefill(loc)
    if (p.line1) setLine1(p.line1)
    if (p.city) setCity(p.city)
    if (p.postalCode) setPostalCode(p.postalCode)
    setMarker([loc.lat, loc.lng])
    setGeoHint(null)
  }

  function onLocate() {
    if (!navigator.geolocation) {
      setGeoHint('Shfletuesi nuk mbështet vendndodhjen.')
      return
    }
    setGeoHint(null)
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setMarker([latitude, longitude])
        const name = await reverseGeocode(latitude, longitude)
        setGeoBusy(false)
        if (name) {
          saveDeliveryLocation({ address: name, lat: latitude, lng: longitude, city })
          onMapSaved({ address: name, lat: latitude, lng: longitude, city })
        } else {
          setGeoHint('Nuk u gjet adresa. Provo hartën.')
        }
      },
      () => {
        setGeoBusy(false)
        setGeoHint('Lejo vendndodhjen ose zgjidh me hartë.')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  async function searchAddressLine() {
    if (!line1.trim()) return
    setGeoHint(null)
    setGeoBusy(true)
    const hit = await searchAddress(`${line1.trim()}, ${city}, Kosovo`)
    setGeoBusy(false)
    if (!hit) {
      setGeoHint('Nuk u gjet. Provo hartën ose shkruaj më saktë.')
      return
    }
    saveDeliveryLocation({ address: hit.displayName, lat: hit.lat, lng: hit.lon, city })
    onMapSaved({ address: hit.displayName, lat: hit.lat, lng: hit.lon, city })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
      return
    }
    if (password !== confirm) {
      setError('Fjalëkalimet nuk përputhen.')
      return
    }
    if (!line1.trim() || !city.trim()) {
      setError('Plotëso adresën dhe qytetin.')
      return
    }
    const phoneErr = validatePhoneField(phone)
    if (phoneErr) {
      setError(phoneErr)
      return
    }
    setBusy(true)
    const r = await register({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      city: city.trim(),
      postalCode: postalCode.trim() || undefined,
    })
    setBusy(false)
    if (r.ok) navigate('/app', { replace: true })
    else setError(r.error ?? 'Regjistrimi dështoi.')
  }

  return (
    <div className={`${landingShellBg} min-h-screen`}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col overflow-x-clip px-6 lg:px-10">
        <header className="shrink-0 pt-8 lg:pt-10">
          <BrandLogo withIcon />
        </header>

        <div className="grid flex-1 items-start gap-10 pb-12 pt-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8 lg:pb-16 lg:pt-10 xl:gap-10">
          <div className="relative z-10 w-full lg:self-start">
            <section
              className={`${landingGlassCard} animate-auth-panel-in w-full max-w-md bg-[#141824]/55 p-7 shadow-[0_16px_48px_-28px_rgba(0,0,0,0.55)] sm:p-8`}
            >
            <h1 className="text-2xl font-bold text-white sm:text-[1.65rem]">Krijo llogari</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Ruaj adresën, ndiq porositë dhe porosit më shpejt herën tjetër.
            </p>

            <form onSubmit={onSubmit} className="auth-form mt-6 space-y-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="su-fn" className={fieldLabel}>
                    Emri
                  </label>
                  <input
                    id="su-fn"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldInput}
                    autoComplete="given-name"
                    placeholder="Shkruaj emrin"
                  />
                </div>
                <div>
                  <label htmlFor="su-ln" className={fieldLabel}>
                    Mbiemri
                  </label>
                  <input
                    id="su-ln"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldInput}
                    autoComplete="family-name"
                    placeholder="Shkruaj mbiemrin"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="su-email" className={fieldLabel}>
                  Email
                </label>
                <div className={fieldShell}>
                  <span className="text-zinc-500" aria-hidden>
                    ✉
                  </span>
                  <input
                    id="su-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    placeholder="email@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <PhoneInputField
                id="su-phone"
                variant="landing"
                label="Telefoni"
                required
                hideExample
                value={phone}
                onChange={setPhone}
              />
              <div>
                <label htmlFor="su-pw" className={fieldLabel}>
                  Fjalëkalimi
                </label>
                <div className={fieldShell}>
                  <input
                    id="su-pw"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    autoComplete="new-password"
                    placeholder="Fjalëkalimi yt"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300"
                    aria-label={showPw ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="su-pw2" className={fieldLabel}>
                  Përsërit fjalëkalimin
                </label>
                <div className={fieldShell}>
                  <input
                    id="su-pw2"
                    type={showPw2 ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    autoComplete="new-password"
                    placeholder="Përsërit fjalëkalimin"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300"
                    aria-label={showPw2 ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showPw2 ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="space-y-3.5 pt-1">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <PinIcon className="h-4 w-4 shrink-0 text-[#ffc107]" aria-hidden />
                  Adresa e dorëzimit
                </p>

                <div>
                  <label htmlFor="su-line1" className={fieldLabel}>
                    Adresa
                  </label>
                  <div className={addressBar}>
                    <button
                      type="button"
                      onClick={() => {
                        setGeoHint(null)
                        setMapOpen(true)
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.04] hover:text-[#ffc107]"
                      title="Hap hartën"
                      aria-label="Hap hartën"
                    >
                      <PinIcon className="h-[18px] w-[18px]" />
                    </button>
                    <input
                      id="su-line1"
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void searchAddressLine()
                        }
                      }}
                      className="min-w-0 flex-1 bg-transparent px-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                      autoComplete="street-address"
                      placeholder="Rruga, numri, lagjja…"
                    />
                    <button
                      type="button"
                      onClick={onLocate}
                      disabled={geoBusy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.04] hover:text-sky-400 disabled:opacity-40"
                      title="Vendndodhja ime"
                      aria-label="Vendndodhja ime"
                    >
                      <LocateIcon className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  {geoHint ? (
                    <p className="mt-1.5 text-xs text-amber-200/75">{geoHint}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Harta ose GPS e plotësojnë automatikisht.
                    </p>
                  )}
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="su-city" className={fieldLabel}>
                      Qyteti
                    </label>
                    <select id="su-city" required value={city} onChange={(e) => setCity(e.target.value)} className={`${fieldInput} cursor-pointer`}>
                      {CITY_OPTIONS.map((c) => (
                        <option key={c.name} value={c.name} className="bg-[#161922]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="su-post" className={fieldLabel}>
                      Kodi postar{' '}
                      <span className="font-normal text-zinc-500">(opsional)</span>
                    </label>
                    <input
                      id="su-post"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className={fieldInput}
                      autoComplete="postal-code"
                      placeholder="11000"
                    />
                  </div>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200/95">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy} className={`${landingBtnGold} mt-0.5 w-full py-3`}>
                {busy ? 'Duke u regjistruar…' : 'Krijo llogari →'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Ke llogari?{' '}
              <Link to="/login" className={`font-semibold ${landingTextGold} hover:text-amber-300`}>
                Hyr këtu
              </Link>
            </p>
          </section>
        </div>

        <div className="pointer-events-none relative hidden min-w-0 overflow-visible lg:block lg:-mr-6 xl:-mr-10">
          <div className="animate-auth-hero-in relative flex justify-center overflow-visible">
            <div
              className="pointer-events-none absolute right-0 top-6 z-0 h-52 w-52 rounded-full bg-[#ff9f0a]/20 blur-[80px] xl:top-4 xl:h-64 xl:w-64"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/4 top-1/3 z-0 h-32 w-32 rounded-full bg-amber-500/10 blur-[60px]"
              aria-hidden
            />
            <img
              src={LANDING_IMAGES.hero}
              alt=""
              className="relative z-[1] w-[128%] max-w-none object-contain object-center xl:w-[138%]"
              style={{
                maxHeight: 'min(58vh, 34rem)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.75) 24%, black 38%, black 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.75) 24%, black 38%, black 100%)',
              }}
            />
          </div>

          <div className="animate-auth-hero-caption-in relative z-10 max-w-xl pt-10 xl:pt-12">
            <p className="text-[1.85rem] font-extrabold leading-[1.12] tracking-tight text-white xl:text-[2.35rem]">
              Porosia jote,{' '}
              <span className={landingTextGold}>më afër se kurrë.</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 xl:text-[0.95rem]">
              Ushqimi yt i preferuar, vetëm disa klikime larg.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-5 xl:mt-12 xl:gap-7">
              {SIGNUP_HERO_FEATURES.map(({ Icon, title, sub }) => (
                <div key={title} className="flex flex-col gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141824]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-12 xl:w-12">
                    <Icon className="h-5 w-5 text-[#ffc107] xl:h-[1.35rem] xl:w-[1.35rem]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-snug text-white">{title}</p>
                    <p className="mt-1 text-xs leading-snug text-zinc-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      <DeliveryLocationMapDialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        city={city}
        seedPosition={marker ?? undefined}
        onAfterSave={onMapSaved}
        title="Zgjedh adresën në hartë"
        description="Kliko ose zhvendos pikën. Ruaj — fushat e adresës plotësohen automatikisht."
      />
    </div>
  )
}
