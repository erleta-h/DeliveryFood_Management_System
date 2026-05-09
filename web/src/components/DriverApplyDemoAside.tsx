/**
 * Panel demo në faqen e aplikimit Deliver — shpjegon rrjedhën pa klik shtesë.
 */
const steps = [
  {
    n: 1,
    title: 'Plotëso këtë formular',
    body: 'Dërgoni të dhënat; aplikimi regjistrohet për shqyrtim nga administratori.',
  },
  {
    n: 2,
    title: 'Miratimi i llogarisë',
    body: 'Pas verifikimit, admini hap llogarinë me rol Driver dhe ju njofton (email / telefon).',
  },
  {
    n: 3,
    title: 'Hyr në panelin Deliver',
    body: 'Me kredencialet që merrni, hyni dhe ndizni «Online» për të marrë oferta.',
  },
  {
    n: 4,
    title: 'Porositë në praktikë',
    body: 'Restoranti ju cakton → pranoni ofertën → shkoni te restoranti → merrni porosinë → dorëzoni te klienti.',
  },
]

type Props = { className?: string }

export function DriverApplyDemoAside({ className = '' }: Props) {
  return (
    <aside
      className={`rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#15202b]/95 to-[#0f1419] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 ${className}`}
      aria-labelledby="driver-demo-heading"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400/90">Si funksionon</p>
      <h2 id="driver-demo-heading" className="mt-1 text-lg font-bold leading-tight text-zinc-50 sm:text-xl">
        Rrjedha e një Deliver në FoodDelivery
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Kjo është pamja e përgjithshme — detajet i sheh në panel pasi të miratohesh.
      </p>

      <ol className="relative mt-6 space-y-0">
        {steps.map((s, i) => (
          <li key={s.n} className="relative flex gap-4 pb-8 last:pb-0">
            {i < steps.length - 1 ? (
              <div
                className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-sky-500/40 to-sky-500/10"
                aria-hidden
              />
            ) : null}
            <div
              className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-200 ring-2 ring-sky-500/35"
              aria-hidden
            >
              {s.n}
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-semibold text-zinc-100">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs leading-relaxed text-emerald-100/90">
        <span className="font-semibold text-emerald-300/95">Këshillë: </span>
        pas miratimit nga platforma merrni akses në panel ku shfaqen porositë e caktuara për ju — mblidhni nga
        restoranti dhe përfundoni dorëzimin te klienti.
      </div>
    </aside>
  )
}
