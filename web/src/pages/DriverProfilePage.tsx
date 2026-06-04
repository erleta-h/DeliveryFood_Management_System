import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/authApi'
import { customerBtnGhost, customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'
import {
  fetchDriverAccount,
  patchDriverAccount,
  type DriverAccountProfile,
} from '../lib/driverApi'
import { PhoneInputField, validatePhoneField } from '../components/PhoneInputField'
import { useAuthStore } from '../store/authStore'

function initials(first: string, last: string) {
  const a = first.trim()[0] ?? ''
  const b = last.trim()[0] ?? ''
  return (a + b).toUpperCase() || '?'
}

function fmtMoney(n: number) {
  return `${n.toFixed(2)} €`
}

export default function DriverProfilePage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword === true)
  const logout = useAuthStore((s) => s.logout)
  const [acc, setAcc] = useState<DriverAccountProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [contactSuccessBanner, setContactSuccessBanner] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(true)
  const [saving, setSaving] = useState(false)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwSuccessBanner, setPwSuccessBanner] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setErr(null)
    setLoading(true)
    try {
      const a = await fetchDriverAccount(token)
      setAcc(a)
      setPhone(a.phone ?? '')
      setLine1(a.line1 ?? '')
      setCity(a.city ?? '')
      setPostal(a.postalCode ?? '')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Gabim')
      setAcc(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (mustChangePassword) setShowPw(true)
  }, [mustChangePassword])

  async function onSaveContact(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    const phoneErr = validatePhoneField(phone)
    if (phoneErr) {
      setSaveMsg(phoneErr)
      return
    }
    setSaveMsg(null)
    setSaving(true)
    const r = await patchDriverAccount(token, {
      phone: phone.trim(),
      line1: line1.trim(),
      city: city.trim(),
      postalCode: postal.trim() || undefined,
    })
    setSaving(false)
    if (r.ok) {
      setAcc(r.profile)
      setSaveMsg(null)
      setContactSuccessBanner('Të dhënat u ruajtën.')
      setShowContact(false)
    } else setSaveMsg(r.message)
  }

  function toggleContactPanel() {
    setShowContact((prev) => {
      const next = !prev
      if (next) setContactSuccessBanner(null)
      else setSaveMsg(null)
      return next
    })
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setPwMsg(null)
    const r = await changePassword(token, curPw, newPw)
    if (r.ok) {
      setCurPw('')
      setNewPw('')
      setShowPw(false)
      setPwSuccessBanner('Fjalëkalimi u ndryshua. Hyr përsëri me fjalëkalimin e ri.')
      await logout()
      void navigate('/login', { replace: true })
    } else setPwMsg(r.error)
  }

  function toggleSecurityPanel() {
    setShowPw((prev) => {
      const next = !prev
      if (next) setPwSuccessBanner(null)
      else setPwMsg(null)
      return next
    })
  }

  const verified = acc?.verificationStatus === 'complete'

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">Profili im</h1>
        <Link to="/driver" className="text-xs font-medium text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{err}</div>
      ) : null}

      {mustChangePassword ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
        >
          <p className="font-semibold text-amber-100">Ndrysho fjalëkalimin e parë</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Llogaria u krijua me fjalëkalim të caktuar nga platforma. Zgjidh një fjalëkalim tënd (më poshtë, «Siguria e
            llogarisë») para se të përdorësh panelin — njëjtë si në aplikacione si Wolt kur hapet llogaria nga admini.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Duke ngarkuar profilin…</p>
      ) : acc ? (
        <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#15202b] via-[#121820] to-[#0d1419] p-5 shadow-lg shadow-sky-900/10">
            <div className="flex flex-wrap items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-lg font-bold text-sky-100 ring-2 ring-sky-400/30"
                aria-hidden
              >
                {initials(acc.firstName, acc.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-zinc-50 sm:text-xl">
                    {acc.firstName} {acc.lastName}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      acc.isOnline
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                        : 'bg-zinc-500/20 text-zinc-400 ring-1 ring-zinc-500/25'
                    }`}
                  >
                    {acc.isOnline ? 'Online tani' : 'Offline'}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      verified
                        ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25'
                        : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25'
                    }`}
                  >
                    {verified ? 'Mjeti OK' : 'Plotëso të dhënat'}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-400">{acc.email}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Partner që nga{' '}
                  <time dateTime={acc.partnerSinceUtc}>
                    {new Date(acc.partnerSinceUtc).toLocaleDateString('sq-AL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </p>
              </div>
            </div>
            {acc.nextStepHint ? (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-sm leading-snug text-amber-100/95">
                <span className="font-semibold text-amber-200">Hapi tjetër: </span>
                {acc.nextStepHint}
              </div>
            ) : null}
          </div>

          {/* Quick stats — business snapshot */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Përmbledhje</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`${customerCardMuted} border-emerald-500/15 p-4`}>
                <p className="text-[11px] font-medium uppercase text-zinc-500">Sot</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-300">{fmtMoney(acc.todayEarnings)}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{acc.todayDeliveriesCount} porosi të përfunduara</p>
              </div>
              <div className={`${customerCardMuted} border-sky-500/15 p-4`}>
                <p className="text-[11px] font-medium uppercase text-zinc-500">7 ditët e fundit</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-sky-200">{fmtMoney(acc.weekEarnings)}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{acc.weekDeliveriesCount} porosi</p>
              </div>
              <div className={`${customerCardMuted} border-amber-500/15 p-4`}>
                <p className="text-[11px] font-medium uppercase text-zinc-500">Besueshmëria</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-200">
                  {acc.ratingsCount > 0 ? `${acc.averageRating.toFixed(1)}★` : '—'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {acc.ratingsCount} vlerësime · pranimi {acc.acceptanceRatePercent.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Link
                to="/driver/earnings"
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sky-300 hover:bg-white/10"
              >
                Detaje fitimesh →
              </Link>
              <Link
                to="/driver/stats"
                className="rounded-lg bg-white/5 px-3 py-1.5 text-sky-300 hover:bg-white/10"
              >
                Performance →
              </Link>
            </div>
          </div>

          {/* Mjeti & verifikimi */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Mjeti & platforma</h3>
            <div className={`${customerCardMuted} space-y-3 p-4`}>
              <div className="flex flex-wrap justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <p className="text-[11px] uppercase text-zinc-500">Lloji i mjetit</p>
                  <p className="text-sm font-medium text-zinc-100">{acc.vehicleType || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase text-zinc-500">Targa</p>
                  <p className="font-mono text-sm font-semibold tracking-wide text-zinc-100">
                    {acc.licensePlate || '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">{acc.verificationSummary}</p>
              {acc.gpsStatusHint ? (
                <p className="rounded-lg bg-sky-500/5 px-3 py-2 text-xs text-sky-200/90">
                  <span className="font-semibold text-sky-300/90">GPS: </span>
                  {acc.gpsStatusHint}
                </p>
              ) : null}
            </div>
          </div>

          {/* Kontakt — editable (accordion; mbyllet pas ruajtjes së suksesshme) */}
          <div>
            {contactSuccessBanner ? (
              <p className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
                {contactSuccessBanner}
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggleContactPanel}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Kontakt & adresa</span>
              <span className="text-zinc-500">{showContact ? '▲' : '▼'}</span>
            </button>
            {showContact ? (
              <form onSubmit={(e) => void onSaveContact(e)} className={`${customerCardMuted} space-y-3 p-4`}>
                <p className="text-sm text-zinc-400">
                  Telefoni përdoret për porosi dhe komunikim me restorantin. Adresa ndihmon nëse duhet dokumentacion.
                </p>
                <PhoneInputField
                  id="driver-profile-phone"
                  variant="driver"
                  label="Telefoni"
                  required
                  value={phone}
                  onChange={setPhone}
                  hint="Telefoni përdoret për porosi dhe komunikim me restorantin."
                />
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">Rruga / nr.</span>
                  <input
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    autoComplete="street-address"
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-100 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">Qyteti</span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                      className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-100 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">Kodi postar</span>
                    <input
                      value={postal}
                      onChange={(e) => setPostal(e.target.value)}
                      autoComplete="postal-code"
                      className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-100 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                    />
                  </label>
                </div>
                {saveMsg ? <p className="text-xs text-amber-200/90">{saveMsg}</p> : null}
                <button
                  type="submit"
                  disabled={saving}
                  className={`${customerBtnPrimary} w-full rounded-xl py-2.5 disabled:opacity-50`}
                >
                  {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
                </button>
              </form>
            ) : null}
          </div>

          {/* Siguria */}
          <div>
            {pwSuccessBanner ? (
              <p className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
                {pwSuccessBanner}
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggleSecurityPanel}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              Siguria e llogarisë
              <span className="text-zinc-500">{showPw ? '▲' : '▼'}</span>
            </button>
            {showPw ? (
              <form onSubmit={(e) => void onChangePassword(e)} className={`${customerCardMuted} space-y-3 p-4`}>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Fjalëkalimi aktual"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-100"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Fjalëkalim i ri (min. 6 karaktere)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-zinc-100"
                />
                {pwMsg ? <p className="text-xs text-amber-200/90">{pwMsg}</p> : null}
                <button type="submit" className={`${customerBtnPrimary} w-full rounded-xl py-2.5`}>
                  Ndrysho fjalëkalimin
                </button>
              </form>
            ) : null}
          </div>

          <Link to="/" className={`${customerBtnGhost} inline-flex text-xs`}>
            ← Ballina publike
          </Link>
        </>
      ) : null}
    </div>
  )
}
