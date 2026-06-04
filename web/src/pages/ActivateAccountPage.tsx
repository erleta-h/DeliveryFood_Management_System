import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { activateAccount } from '../lib/authApi'
import {
  customerBtnPrimary,
  customerCard,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
  customerShellBg,
} from '../lib/customerTheme'

export default function ActivateAccountPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [email, setEmail] = useState('')
  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token.trim()) {
      setError('Vendos token aktivizimi ose hap linkun nga emaili.')
      return
    }
    if (password.length < 8) {
      setError('Fjalëkalimi duhet të ketë të paktën 8 karaktere.')
      return
    }
    if (password !== confirm) {
      setError('Fjalëkalimet nuk përputhen.')
      return
    }
    setBusy(true)
    const r = await activateAccount({
      token: token.trim(),
      email: email.trim() || undefined,
      newPassword: password,
      confirmPassword: confirm,
    })
    setBusy(false)
    if (r.ok) {
      setDone(true)
      window.setTimeout(() => navigate('/login?next=driver', { replace: true }), 2000)
    } else setError(r.error)
  }

  return (
    <div className={`${customerShellBg} relative`}>
      <header className="absolute left-0 right-0 top-0 z-10 px-4 pt-5 sm:px-8 sm:pt-7">
        <BrandLogo />
      </header>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-12 pt-24">
        <section className={customerCard}>
          <h1 className="text-2xl font-bold text-zinc-100">Activate Account</h1>
          <p className={customerPanelSubtitle}>Krijo fjalëkalimin për llogarinë e deliverit të miratuar.</p>

          {done ? (
            <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Llogaria u aktivizua. Po të ridrejtojmë te hyrja…
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="act-email" className={customerLabelSm}>
                  Email
                </label>
                <input
                  id="act-email"
                  type="email"
                  className={customerField}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="opsionale nëse ke linkun e plotë"
                />
              </div>
              <div>
                <label htmlFor="act-token" className={customerLabelSm}>
                  Activation Token
                </label>
                <input
                  id="act-token"
                  className={customerField}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required={!tokenFromUrl}
                  readOnly={!!tokenFromUrl}
                />
              </div>
              <div>
                <label htmlFor="act-pw" className={customerLabelSm}>
                  New Password
                </label>
                <input
                  id="act-pw"
                  type="password"
                  className={customerField}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="act-pw2" className={customerLabelSm}>
                  Confirm Password
                </label>
                <input
                  id="act-pw2"
                  type="password"
                  className={customerField}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
              ) : null}
              <button type="submit" disabled={busy} className={`${customerBtnPrimary} w-full`}>
                {busy ? 'Duke aktivizuar…' : 'Activate Account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-zinc-400">
            <Link to="/login?next=driver" className="font-semibold text-sky-400 hover:text-sky-300">
              Kthehu te hyrja Deliver
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
