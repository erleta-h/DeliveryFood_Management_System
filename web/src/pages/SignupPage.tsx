import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { getSignupAddressPrefill, loadDeliveryLocation } from '../lib/deliveryLocationStorage'

import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
  customerShellBg,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function SignupPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fromLanding, setFromLanding] = useState(false)

  useEffect(() => {
    const saved = loadDeliveryLocation()
    if (!saved) return
    const p = getSignupAddressPrefill(saved)
    let applied = false
    if (p.line1) {
      setLine1(p.line1)
      applied = true
    }
    if (p.city) {
      setCity(p.city)
      applied = true
    }
    if (p.postalCode) {
      setPostalCode(p.postalCode)
      applied = true
    }
    if (applied) setFromLanding(true)
  }, [])

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
    const phoneTrim = phone.trim()
    const phoneDigits = phoneTrim.replace(/\D/g, '').length
    if (phoneDigits < 8) {
      setError('Numri i telefonit duhet të ketë të paktën 8 shifra (p.sh. +383 44 123 456).')
      return
    }
    setBusy(true)
    const r = await register({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phoneTrim,
      line1: line1.trim(),
      city: city.trim(),
      postalCode: postalCode.trim() || undefined,
    })
    setBusy(false)
    if (r.ok) navigate('/app', { replace: true })
    else setError(r.error ?? 'Regjistrimi dështoi.')
  }

  return (
    <div className={`${customerShellBg} relative`}>
      <header className="absolute left-0 right-0 top-0 z-10 px-4 pt-5 sm:px-8 sm:pt-7">
        <BrandLogo />
      </header>
      <div className="mx-auto min-h-screen max-w-lg px-4 pb-10 pt-24">
        <Link
          to="/"
          className={`${customerBtnGhost} mb-6 inline-flex w-fit items-center justify-center text-sm`}
        >
          ← Kthehu në ballinë
        </Link>

        <section className={`${customerCard} animate-auth-panel-in`}>
          <h1 className="text-2xl font-bold text-zinc-100">Krijo llogari</h1>
          <p className={customerPanelSubtitle}>
            Të dhënat ruhen në bazën SQL Server përmes API-së; mbas regjistrimit merr një sesion JWT.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="su-fn" className={customerLabelSm}>
                  Emri
                </label>
                <input
                  id="su-fn"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={customerField}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="su-ln" className={customerLabelSm}>
                  Mbiemri
                </label>
                <input
                  id="su-ln"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={customerField}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="su-email" className={customerLabelSm}>
                Email
              </label>
              <input
                id="su-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={customerField}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="su-phone" className={customerLabelSm}>
                Numri i telefonit
              </label>
              <input
                id="su-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={customerField}
                autoComplete="tel"
                placeholder="p.sh. +383 44 123 456"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Nevojitet që restoranti / dërgesa të mund t’ju kontaktojnë për porosinë.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="su-pw" className={customerLabelSm}>
                  Fjalëkalimi
                </label>
                <input
                  id="su-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={customerField}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="su-pw2" className={customerLabelSm}>
                  Përsërite fjalëkalimin
                </label>
                <input
                  id="su-pw2"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={customerField}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className={customerCardMuted}>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                Adresa & qyteti
              </p>
              {fromLanding ? (
                <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
                  Adresa u plotësua nga vendi që zgjodhe në ballinë (hartë ose kërkim). Mund ta
                  ndryshosh para regjistrimit.
                </p>
              ) : null}
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="su-line1" className={customerLabelSm}>
                    Adresa (rruga, numri)
                  </label>
                  <input
                    id="su-line1"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className={customerField}
                    autoComplete="street-address"
                    placeholder="p.sh. Rruga Dëshmorët e Kombit 15"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="su-city" className={customerLabelSm}>
                      Qyteti
                    </label>
                    <input
                      id="su-city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={customerField}
                      autoComplete="address-level2"
                      placeholder="p.sh. Prishtinë"
                    />
                  </div>
                  <div>
                    <label htmlFor="su-post" className={customerLabelSm}>
                      Kodi postar (opsional)
                    </label>
                    <input
                      id="su-post"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className={customerField}
                      autoComplete="postal-code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={`${customerBtnPrimary} w-full`}>
              {busy ? 'Duke u regjistruar…' : 'Regjistrohu'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Ke tashmë llogari?{' '}
            <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
              Hyr këtu
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
