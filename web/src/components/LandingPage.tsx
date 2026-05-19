import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { DeliveryAddressSection } from './DeliveryAddressSection'
import { hasAdminRole, hasCustomerRole, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { customerBtnGhost, customerBtnPrimary, customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'


function primaryEntryForToken(token: string): { to: string; label: string } {
  if (hasAdminRole(token)) return { to: '/admin', label: 'Hap panelin admin' }
  if (hasDriverRole(token)) return { to: '/driver', label: 'Hap panelin e kalorësit' }
  if (hasRestaurantStaffRole(token) && !hasCustomerRole(token))
    return { to: '/kitchen', label: 'Hap kuzhinën' }
  return { to: '/app', label: 'Hap aplikacionin' }
}

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  const entry = token ? primaryEntryForToken(token) : null

  return (
    <div className={`${customerShellBg} relative`}>
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center gap-4 px-4 pt-5 sm:px-8 sm:pt-7">
        <BrandLogo entrance />
        <nav className="animate-site-nav ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {entry ? (
            <Link
              to={entry.to}
              className={`${customerBtnPrimary} inline-block text-center text-sm`}
            >
              {entry.label}
            </Link>
          ) : (
            <>
              <Link to="/login" className={`${customerBtnPrimary} inline-block text-center text-sm`}>
                Hyr
              </Link>
              <Link to="/signup" className={`${customerBtnGhost} inline-block text-center text-sm`}>
                Regjistrohu
              </Link>
            </>
          )}
        </nav>
      </header>

      <div className="mx-auto flex min-h-[46vh] max-w-5xl flex-col justify-center px-4 pb-20 pt-28 sm:min-h-[50vh] sm:px-6 sm:pt-32">
        {/* Një kolonë e vetme: titull → përshkrim → adresë → shënim (renditur poshtë-poshtë) */}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 text-center sm:gap-8 sm:text-left">
          <h1 className="animate-site-hero text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">
            Ushqim i shpejtë,{' '}
            <span className="brand-logo-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              në derën tënde
            </span>
          </h1>

          <p className="animate-site-hero-sub text-base leading-relaxed text-zinc-400">
            Zbulo restorante, porosit online dhe ndiq porositë — me llogari, adresë dhe qytet për dorëzim
            të saktë.
          </p>

          <DeliveryAddressSection />

          <section
            aria-labelledby="partner-heading"
            className="mt-14 rounded-2xl border border-white/[0.1] bg-[#1a1f2e]/75 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm sm:mt-16 sm:p-8 sm:text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-400/85">
              Për restorante & biznese
            </p>
            <h2 id="partner-heading" className="mt-2 text-2xl font-bold text-zinc-50 sm:text-3xl">
              Bëhu partner me ne
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Nëse dëshiron të listosh menunë dhe të marrësh porosi përmes platformës, apliko fillimisht
              këtu. Ekipi ynë shqyrton çdo kërkesë; pas kontratës dhe miratimit, hapet aksesi në panel —
              nuk krijohet llogari pa atë hap.
            </p>
            <div className="mt-6 flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:mt-5 lg:justify-start">
              <Link
                to="/partner"
                className={`${customerBtnPrimary} inline-block text-center text-sm`}
              >
                Apliko si partner
              </Link>
              <Link
                to="/partner/login"
                className="whitespace-nowrap text-sm font-semibold text-amber-400/95 underline-offset-4 hover:text-amber-300 hover:underline"
              >
                Ke tashmë kontratë? Hyr
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="driver-heading"
            className="mt-10 rounded-2xl border border-sky-500/20 bg-[#121820]/80 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:mt-12 sm:p-8 sm:text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-400/90">
              Bëhu kalorës
            </p>
            <h2 id="driver-heading" className="mt-2 text-2xl font-bold text-zinc-50 sm:text-3xl">
              Dërgo me biçikletë ose motor
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Aplikoni për rol «Driver»: pas miratimit nga platforma merrni akses në panel ku shfaqen porositë e
              caktuara për ju — mblidhni nga restoranti dhe përfundoni dorëzimin te klienti.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Link
                to="/driver/apply"
                className={`${customerBtnPrimary} inline-block bg-gradient-to-r from-sky-600/90 to-sky-500/80 text-center text-sm ring-1 ring-sky-400/25`}
              >
                Apliko si kalorës
              </Link>
              <Link
                to="/login?next=driver"
                className="text-sm font-semibold text-sky-400/95 underline-offset-4 hover:text-sky-300 hover:underline"
              >
                Ke llogari? Hyr
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
