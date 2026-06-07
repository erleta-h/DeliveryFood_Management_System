import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/authApi'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerCardMuted,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

function IconUser() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.08] py-3.5 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-100">{value}</p>
      </div>
    </div>
  )
}

function SecurityRow({
  label,
  detail,
  verified,
}: {
  label: string
  detail: string
  verified?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 truncate text-sm text-zinc-500">{detail}</p>
      </div>
      {verified ? <IconCheck /> : null}
    </div>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  const phoneVerified = Boolean(user?.phone?.trim())
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '—'

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (!token) return
    if (newPw.length < 6) {
      setPwError('Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Fjalëkalimet e rinj nuk përputhen.')
      return
    }
    setPwBusy(true)
    const r = await changePassword(token, currentPw, newPw)
    setPwBusy(false)
    if (r.ok) {
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShowPasswordForm(false)
      setPwSuccess('Fjalëkalimi u përditësua. Po të ridrejtujmë te hyrja…')
      logout()
      window.setTimeout(() => navigate('/login', { replace: true }), 1800)
    } else {
      setPwError(r.error)
    }
  }

  function onLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  if (!user) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Nuk je i kyçur.</p>
      </section>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Llogaria ime</h1>
        <p className={customerPanelSubtitle}>
          Menaxho të dhënat personale dhe sigurinë e llogarisë tënde
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Të dhënat personale */}
        <section className={`${customerCard} flex flex-col`}>
          <h2 className="text-base font-bold text-zinc-100">Të dhënat personale</h2>
          <div className="mt-4 flex-1">
            <ProfileRow icon={<IconUser />} label="Emri" value={fullName || '—'} />
            <ProfileRow icon={<IconMail />} label="Email" value={user.email} />
            <ProfileRow
              icon={<IconPhone />}
              label="Telefoni"
              value={user.phone?.trim() ? user.phone : '— (shto te Adresat)'}
            />
            <ProfileRow
              icon={<IconCalendar />}
              label="Adresa kryesore"
              value={[user.line1, user.city, user.postalCode].filter(Boolean).join(', ') || '—'}
            />
          </div>
          <Link
            to="/app/addresses"
            className={`${customerBtnGhost} mt-5 inline-flex w-full items-center justify-center gap-2`}
          >
            <IconEdit />
            Ndrysho profilin
          </Link>
        </section>

        {/* Siguria */}
        <section className={`${customerCard} flex flex-col`}>
          <h2 className="text-base font-bold text-zinc-100">Siguria e llogarisë</h2>
          <div className="mt-4 flex-1">
            <SecurityRow label="Email i verifikuar" detail={user.email} verified />
            <SecurityRow
              label="Telefoni i verifikuar"
              detail={phoneVerified ? user.phone : 'Shto numrin te Adresat'}
              verified={phoneVerified}
            />
            <SecurityRow label="Fjalëkalimi" detail="••••••••••••" />
          </div>

          {pwSuccess ? (
            <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {pwSuccess}
            </p>
          ) : null}

          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => {
                setPwError(null)
                setShowPasswordForm(true)
              }}
              className={`${customerBtnGhost} mt-5 inline-flex w-full items-center justify-center gap-2 border-emerald-500/25 text-emerald-200 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-emerald-100`}
            >
              <IconLock />
              Ndrysho fjalëkalimin
            </button>
          ) : (
            <form onSubmit={(e) => void onChangePassword(e)} className={`${customerCardMuted} mt-5 space-y-3 p-4`}>
              <div>
                <label htmlFor="acc-cur-pw" className={customerLabelSm}>
                  Fjalëkalimi aktual
                </label>
                <input
                  id="acc-cur-pw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className={customerField}
                  required
                />
              </div>
              <div>
                <label htmlFor="acc-new-pw" className={customerLabelSm}>
                  Fjalëkalim i ri
                </label>
                <input
                  id="acc-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={customerField}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="acc-confirm-pw" className={customerLabelSm}>
                  Përsërite fjalëkalimin
                </label>
                <input
                  id="acc-confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={customerField}
                  required
                  minLength={6}
                />
              </div>
              {pwError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {pwError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={pwBusy} className={customerBtnPrimary}>
                  {pwBusy ? 'Duke ruajtur…' : 'Ruaj fjalëkalimin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPwError(null)
                    setCurrentPw('')
                    setNewPw('')
                    setConfirmPw('')
                  }}
                  className={customerBtnGhost}
                >
                  Anulo
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Dalje */}
      <section className={`${customerCard} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <IconLogout />
          </span>
          <div>
            <p className="font-semibold text-zinc-100">Dalje nga llogaria</p>
            <p className="mt-0.5 text-sm text-zinc-500">Dil nga llogaria në këtë pajisje</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200"
        >
          Dil
        </button>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} FoodDelivery. Të gjitha të drejtat e rezervuara.</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/app/support" className="transition hover:text-zinc-400">
            Ndihmë
          </Link>
          <span className="text-zinc-700">·</span>
          <Link to="/" className="transition hover:text-zinc-400">
            Kushtet e përdorimit
          </Link>
          <span className="text-zinc-700">·</span>
          <Link to="/" className="transition hover:text-zinc-400">
            Privatësia
          </Link>
        </div>
      </footer>
    </div>
  )
}
