import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { DriverApplyDemoAside, driverApplyShellBg } from './../components/DriverApplyDemoAside'
import {
  customerBtnPrimary,
  customerCard,
  customerFieldPartner,
  customerLabelForm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { LicensePlateInputField, validateLicensePlateField } from '../components/LicensePlateInputField'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import { submitDriverApplication } from './../lib/driverApi'

const backIconBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.05] text-lg leading-none text-zinc-200 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/30'

const DOC_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
const MAX_DOC_MB = 5

function fileLabel(file: File | null) {
  if (!file) return 'Zgjidh skedarin'
  const mb = file.size / (1024 * 1024)
  return `${file.name} (${mb < 0.1 ? '<0.1' : mb.toFixed(1)} MB)`
}

type DocFieldProps = {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
}

function DocField({ id, label, file, onChange }: DocFieldProps) {
  return (
    <div>
      <label className={customerLabelForm} htmlFor={id}>
        {label}
      </label>
      <label className="mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 transition hover:border-sky-400/25 hover:bg-sky-500/5">
        <span className="truncate">{fileLabel(file)}</span>
        <span className="shrink-0 text-xs text-sky-400/90">Ngarko</span>
        <input
          id={id}
          type="file"
          accept={DOC_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

export default function DriverApplyPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [message, setMessage] = useState('')
  const [identityDoc, setIdentityDoc] = useState<File | null>(null)
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null)
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function validateDoc(file: File | null, label: string): string | null {
    if (!file) return `Ngarko: ${label}.`
    if (file.size > MAX_DOC_MB * 1024 * 1024) return `${label} duhet të jetë maksimum ${MAX_DOC_MB} MB.`
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('Duhet të pranoni që të dhënat të përpunohen për shqyrtim.')
      return
    }
    const docErr =
      validateDoc(identityDoc, 'Letërnjoftimi') ??
      validateDoc(licenseDoc, 'Patenta') ??
      validateDoc(vehiclePhoto, 'Foto e mjetit')
    if (docErr) {
      setError(docErr)
      return
    }
    const phoneErr = validatePhoneField(phone)
    if (phoneErr) {
      setError(phoneErr)
      return
    }
    const plateErr = validateLicensePlateField(licensePlate)
    if (plateErr) {
      setError(plateErr)
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
      identityDocument: identityDoc!,
      licenseDocument: licenseDoc!,
      vehiclePhoto: vehiclePhoto!,
    })
    setBusy(false)
    if (r.ok) setDone(true)
    else setError(r.message)
  }

  if (done) {
    return (
      <div className={`${driverApplyShellBg} px-4 pb-16 pt-6 sm:px-8`}>
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
          <h1 className="text-2xl font-bold text-zinc-100">Aplikimi u dërgua me sukses.</h1>
          <p className={`${customerPanelSubtitle} mx-auto max-w-md`}>
            Do të njoftoheni me email pasi admini ta shqyrtojë aplikimin.
          </p>
          <Link to="/" className={`${customerBtnPrimary} mt-6 inline-block text-sm`}>
            Kthehu në ballinë
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className={`${driverApplyShellBg} px-4 pb-20 pt-6 sm:px-8`}>
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

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-12">
        <DriverApplyDemoAside className="order-2 lg:order-1" />
        <section className={`${customerCard} animate-auth-panel-in-delayed order-1 mx-auto w-full max-w-xl sm:max-w-2xl lg:order-2 lg:mx-0 lg:max-w-none`}>
          <h1 className="text-2xl font-bold text-zinc-100">Apliko si Deliver</h1>
          <p className={customerPanelSubtitle}>
            Plotëso të dhënat dhe ngarko dokumentet. Pas miratimit nga admini, merrni email me link aktivizimi për të
            krijuar fjalëkalimin.
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
            <PhoneInputField
              id="df-phone"
              variant="partner"
              label="Telefoni"
              required
              value={phone}
              onChange={setPhone}
              hint="Për t’ju kontaktuar gjatë shqyrtimit të aplikimit."
            />
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
                Mjeti
              </label>
              <input
                id="df-vehicle"
                className={customerFieldPartner}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="p.sh. motor, biçikletë, veturë"
                required
              />
            </div>
            <LicensePlateInputField
              id="df-plate"
              value={licensePlate}
              onChange={setLicensePlate}
            />
            <div>
              <label className={customerLabelForm} htmlFor="df-msg">
                Mesazh
              </label>
              <textarea
                id="df-msg"
                className={customerFieldPartner + ' min-h-[4.5rem] resize-y'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <fieldset className="space-y-3 rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-4">
              <legend className="px-1 text-sm font-semibold text-zinc-200">Dokumentet</legend>
              <p className="text-xs text-zinc-500">JPEG, PNG, WebP, GIF ose PDF — maksimum {MAX_DOC_MB} MB secili.</p>
              <DocField id="df-id-doc" label="Letërnjoftimi" file={identityDoc} onChange={setIdentityDoc} />
              <DocField id="df-license" label="Patenta" file={licenseDoc} onChange={setLicenseDoc} />
              <DocField id="df-vehicle-photo" label="Foto e mjetit" file={vehiclePhoto} onChange={setVehiclePhoto} />
            </fieldset>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <span>Pranoj që të dhënat dhe dokumentet të përdoren për të shqyrtuar aplikimin dhe për t’u kontaktuar.</span>
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
