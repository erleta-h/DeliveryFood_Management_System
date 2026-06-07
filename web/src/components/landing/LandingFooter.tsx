import { Link } from 'react-router-dom'
import { BrandLogo } from '../BrandLogo'
import type { PublicLandingContent } from '../../lib/publicSiteApi'

type Props = {
  content: PublicLandingContent
}

export function LandingFooter({ content }: Props) {
  return (
    <footer id="kontakti" className="scroll-mt-20 border-t border-white/[0.06] bg-[#080a10]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo compact withIcon />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">{content.footerTagline}</p>
            <div className="mt-4 flex gap-3 text-zinc-500">
              {['Facebook', 'Instagram', 'TikTok'].map((s) => (
                <span key={s} className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] uppercase tracking-wide">
                  {s.slice(0, 2)}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Linke të shpejta</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li>
                <Link to="/login?next=%2Fapp%2Frestaurants" className="hover:text-amber-300">
                  {content.footerLinkRestaurants}
                </Link>
              </li>
              <li>
                <a href="#si-funksionon" className="hover:text-amber-300">
                  Si funksionon
                </a>
              </li>
              <li>
                <Link to="/partner" className="hover:text-amber-300">
                  {content.footerLinkPartner}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ligjore</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li>Kushtet e përdorimit</li>
              <li>Politika e privatësisë</li>
              <li>Cookies</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Shkarko aplikacionin</p>
            <div className="mt-4 flex flex-col gap-2">
              <span className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs text-zinc-400">
                App Store — së shpejti
              </span>
              <span className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs text-zinc-400">
                Google Play — së shpejti
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-zinc-600">
          <p>{content.footerCopyright}</p>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-zinc-400">
            <span aria-hidden>🌐</span> Shqip
          </span>
        </div>
      </div>
    </footer>
  )
}
