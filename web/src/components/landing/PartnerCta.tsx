import { Link } from 'react-router-dom'
import { LANDING_IMAGES, landingBtnGold, landingGlassCard, landingLiftHover } from '../../lib/landingTheme'

export function PartnerCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className={`${landingGlassCard} ${landingLiftHover} relative overflow-hidden p-8 lg:p-10`}>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${LANDING_IMAGES.partner})` }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#141824] via-[#141824]/95 to-transparent" aria-hidden />
          <div className="relative max-w-sm">
            <h3 className="text-xl font-bold text-white lg:text-2xl">Ke restorant?</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Bashkohu me platformën tonë dhe fillo të pranosh porosi online.
            </p>
            <Link to="/partner" className={`${landingBtnGold} mt-6`}>
              Apliko si partner →
            </Link>
          </div>
        </article>

        <article className={`${landingGlassCard} ${landingLiftHover} relative overflow-hidden p-8 lg:p-10`}>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${LANDING_IMAGES.driver})` }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#141824] via-[#141824]/95 to-transparent" aria-hidden />
          <div className="relative max-w-sm">
            <h3 className="text-xl font-bold text-white lg:text-2xl">Dëshiron të punosh si shofer?</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Bëhu pjesë e ekipit tonë dhe fito duke dorëzuar porosi në qytetin tënd.
            </p>
            <Link
              to="/driver/apply"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-indigo-400 hover:to-indigo-600"
            >
              Apliko si shofer →
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
