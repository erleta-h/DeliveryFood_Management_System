import { Link } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import { landingBtnGold, landingBtnOutline } from '../../lib/landingTheme'
import { hasAdminRole, hasCustomerRole, hasDriverRole, hasRestaurantStaffRole } from '../../lib/jwtRoles'
import { useAuthStore } from '../../store/authStore'

function primaryEntryForToken(token: string): { to: string; label: string } {
  if (hasAdminRole(token)) return { to: '/admin', label: 'Paneli admin' }
  if (hasDriverRole(token)) return { to: '/driver', label: 'Paneli driver' }
  if (hasRestaurantStaffRole(token) && !hasCustomerRole(token)) return { to: '/kitchen', label: 'Kuzhina' }
  return { to: '/app', label: 'Hap aplikacionin' }
}

const NAV_LINKS = [
  { href: '#si-funksionon', label: 'Si funksionon' },
  { href: '#restorantet', label: 'Restorantet' },
  { href: '/partner', label: 'Për restorante', route: true },
  { href: '/driver/apply', label: 'Për shoferë', route: true },
  { href: '#kontakti', label: 'Kontakti' },
] as const

export function LandingNavbar() {
  const token = useAuthStore((s) => s.token)
  const entry = token ? primaryEntryForToken(token) : null

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0c12]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center gap-6 px-6 py-4 lg:px-10">
        <BrandLogo entrance withIcon />

        <nav className="animate-site-nav hidden flex-1 items-center justify-center gap-8 lg:flex">
          {NAV_LINKS.map((link) =>
            'route' in link && link.route ? (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-white transition hover:text-[#ffc107]"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white transition hover:text-[#ffc107]"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="animate-site-nav ml-auto flex items-center gap-2.5">
          {entry ? (
            <Link to={entry.to} className={landingBtnGold}>
              {entry.label}
            </Link>
          ) : (
            <>
              <Link to="/login" className={landingBtnOutline}>
                Kyçu
              </Link>
              <Link to="/signup" className={landingBtnGold}>
                Regjistrohu
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
