import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { DriverApplyDemoAside } from './../components/DriverApplyDemoAside'
import {
  customerBtnPrimary,
  customerCard,
  customerFieldPartner,
  customerLabelForm,
  customerPanelSubtitle,
  customerShellBg,
} from '../lib/customerTheme'
import { submitDriverApplication } from './../lib/driverApi'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.05] text-lg leading-none text-zinc-200 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/30'

export default function DriverApplyPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('Duhet të pranoni që të dhënat të përpunohen për shqyrtim.')
      return
    }
    setBusy(true)
    const r = await submitDriverApplication({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      vehicleType: vehicleType.trim(),
      licensePlate: licensePlate.trim() || undefined,
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
            Aplikimi u regjistrua. Pas verifikimit, administratori hap llogarinë me rol Deliver — nuk mund të hysh derisa
            të miratohet.
          </p>
          <Link to="/" className={`${customerBtnPrimary} mt-6 inline-block text-sm`}>
            Kthehu në ballinë
          </Link>
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

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-start lg:gap-10">
        <DriverApplyDemoAside className="order-2 lg:order-1" />
        <section className={`${customerCard} order-1 mx-auto w-full max-w-xl lg:order-2 lg:mx-0 lg:max-w-none`}>
        <h1 className="text-2xl font-bold text-zinc-100">Apliko si Deliver</h1>
        <p className={customerPanelSubtitle}>
          Plotëso të dhënat. Email duhet të jetë unik — pas miratimit merrni fjalëkalim fillestar nga admini.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={customerLabelForm} htmlFor="df-name">
                Emri
              </label>
              <input
                id="df-name"
                className={customerFieldPartner}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={customerLabelForm} htmlFor="df-last">
                Mbiemri
              </label>
              <input
                id="df-last"
                className={customerFieldPartner}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className={customerLabelForm} htmlFor="df-phone">
              Telefon
            </label>
            <input
              id="df-phone"
              className={customerFieldPartner}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
          </div>
          <div>
            <label className={customerLabelForm} htmlFor="df-email">
              Email
            </label>
            <input
              id="df-email"
              type="email"
              className={customerFieldPartner}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className={customerLabelForm} htmlFor="df-vehicle">
              Mjeti (p.sh. motor, biçikletë, veturë)
            </label>
            <input
              id="df-vehicle"
              className={customerFieldPartner}
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={customerLabelForm} htmlFor="df-plate">
              Targa (opsionale)
            </label>
            <input
              id="df-plate"
              className={customerFieldPartner}
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
            />
          </div>
          <div>
            <label className={customerLabelForm} htmlFor="df-msg">
              Mesazh (opsionale)
            </label>
            <textarea
              id="df-msg"
              className={customerFieldPartner + ' min-h-[4.5rem] resize-y'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>Pranoj që të dhënat të përdoren për të shqyrtuar aplikimin dhe për t’u kontaktuar.</span>
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button type="submit" disabled={busy} className={customerBtnPrimary + ' w-full sm:w-auto'}>
            {busy ? 'Duke dërguar…' : 'Dërgo aplikimin'}
          </button>
        </form>
      </section>
      </div>
    </div>
  )
}
