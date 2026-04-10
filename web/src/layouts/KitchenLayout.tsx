import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { fetchKitchenContext, type KitchenStaffContext } from './../lib/kitchenApi'
import { customerBtnPrimary, customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

type CtxPhase = 'loading' | 'ready' | 'unauthorized' | 'error'

function navClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-amber-500/15 font-medium text-amber-100 ring-1 ring-amber-500/25'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`
}

export default function KitchenLayout() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [kitchenCtx, setKitchenCtx] = useState<KitchenStaffContext | null>(null)
  const [ctxPhase, setCtxPhase] = useState<CtxPhase>('loading')

  useEffect(() => {
    if (!token) {
      setKitchenCtx(null)
      setCtxPhase('loading')
      return
    }
    let cancelled = false
    setCtxPhase('loading')
    void fetchKitchenContext(token).then((r) => {
      if (cancelled) return
      if (r.ok) {
        setKitchenCtx(r.context)
        setCtxPhase('ready')
        return
      }
      setKitchenCtx(null)
      setCtxPhase(r.reason === 'unauthorized' ? 'unauthorized' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const restaurantTitle =
    kitchenCtx?.isLinked && kitchenCtx.restaurantName
      ? kitchenCtx.restaurantName
      : 'Paneli i restorantit'

  function onReauth() {
    logout()
    void navigate('/partner/login', { replace: true })
  }

  return (
    <div className={`${customerShellBg} min-h-screen`}>
      <header className="border-b border-amber-500/20 bg-[#1e1a14]/90 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">
              {ctxPhase === 'loading' && token ? (
                <span className="animate-pulse text-zinc-500">Duke lidhur me restorantin…</span>
              ) : (
                restaurantTitle
              )}
            </p>
            <p className="mt-0.5 text-sm text-zinc-300">
              {user?.firstName} {user?.lastName}
              {kitchenCtx?.isLinked && kitchenCtx.slug ? (
                <>
                  {' · '}
                  <span className="text-zinc-500">/{kitchenCtx.slug}</span>
                </>
              ) : null}
              <span className="hidden sm:inline">
                {' '}
                · porositë hyrëse (merchant)
              </span>
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <NavLink to="/kitchen" end className={({ isActive }) => navClass(isActive)}>
              Porositë
            </NavLink>
            <NavLink to="/kitchen/menu" className={({ isActive }) => navClass(isActive)}>
              Menuja
            </NavLink>
            <NavLink to="/kitchen/account" className={({ isActive }) => navClass(isActive)}>
              Llogaria
            </NavLink>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              Ballina
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Dil
            </button>
          </nav>
        </div>
      </header>

      {ctxPhase === 'unauthorized' ? (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <p className="font-medium">Sesioni nuk është më i vlefshëm ose nuk ke akses në panel.</p>
            <p className="mt-1 text-xs text-red-200/80">
              Dil dhe hyr përsëri me emailin e stafit te hyrja e partnerit.
            </p>
            <button type="button" onClick={() => onReauth()} className={`${customerBtnPrimary} mt-3 text-sm`}>
              Hyr përsëri
            </button>
          </div>
        </div>
      ) : null}

      {ctxPhase === 'error' ? (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Nuk u lexua dot lidhja me restorantin (rrjet ose server). Rifresko faqen ose kontrollo nëse API është
            ndezur.
          </p>
        </div>
      ) : null}

      {ctxPhase === 'ready' && kitchenCtx && !kitchenCtx.isLinked ? (
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <strong className="font-semibold">Llogaria nuk është lidhur me restorant.</strong> Ke rol stafi në sistem,
            por mungon rreshti <code className="rounded bg-black/30 px-1">RestaurantStaff</code> (cilin restoran
            përfaqëson). Kjo krijohet nga <strong className="font-semibold">admini</strong> kur miratohet partneri —
            deri atëherë nuk shfaqen porosi. (Seed:{' '}
            <code className="rounded bg-black/30 px-1">kitchen@fooddelivery.local</code> është i lidhur me Napoli.)
          </p>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
