import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { DeliveryAddressSection } from './DeliveryAddressSection'
import { LandingCollaborateSection } from './LandingCollaborateSection.tsx'
import { hasAdminRole, hasCustomerRole, hasDriverRole, hasRestaurantStaffRole } from '../lib/jwtRoles'
import { customerBtnGhost, customerBtnPrimary, customerShellBg } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'


function primaryEntryForToken(token: string): { to: string; label: string } {
  if (hasAdminRole(token)) return { to: '/admin', label: 'Hap panelin admin' }
  if (hasDriverRole(token)) return { to: '/driver', label: 'Hap panelin e driverit' }
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

      <div className="mx-auto flex min-h-[46vh] w-full max-w-6xl flex-col justify-center px-4 pb-24 pt-28 sm:min-h-[50vh] sm:px-8 sm:pb-28 sm:pt-32">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 text-center sm:max-w-none sm:gap-8 sm:text-left">
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

          <LandingCollaborateSection />
        </div>
      </div>
    </div>
  )
}
