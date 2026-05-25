import { rdYellow } from '../../lib/restaurantDetailTheme'

export type PaymentUiMethod = 'card' | 'cod' | 'card_on_delivery'

type Props = {
  selected: PaymentUiMethod
  onSelect: (m: PaymentUiMethod) => void
  /** Kur porosia është krijuar për Stripe, opsionet e tjera janë vetëm informative. */
  lockToCard?: boolean
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${
        checked ? 'border-[#FF7A18]' : 'border-zinc-600'
      }`}
    >
      {checked ? <span className="h-2 w-2 rounded-full bg-[#FF7A18]" /> : null}
    </span>
  )
}

function CardBrandIcons() {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="rounded bg-[#1a1f71] px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-white">
        VISA
      </span>
      <span className="flex h-5 w-7 items-center justify-center rounded bg-zinc-800">
        <span className="h-3 w-3 rounded-full bg-red-500 opacity-90" />
        <span className="-ml-1.5 h-3 w-3 rounded-full bg-amber-400 opacity-90" />
      </span>
      <span className="rounded bg-[#006fcf] px-1 py-0.5 text-[8px] font-bold text-white">AMEX</span>
    </div>
  )
}

function CashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10h.01M18 14h.01" strokeLinecap="round" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h5" strokeLinecap="round" />
      <path d="M8 17h8" strokeLinecap="round" />
    </svg>
  )
}

function MethodRow({
  active,
  disabled,
  onClick,
  radio,
  icon,
  title,
  subtitle,
  trailing,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  radio: boolean
  icon?: React.ReactNode
  title: string
  subtitle?: string
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-4 text-left transition last:border-b-0 ${
        active
          ? 'relative z-[1] -mx-px border border-[#FF7A18]/55 bg-[#FF7A18]/[0.05] shadow-[inset_0_0_0_1px_rgba(255,122,24,0.2)]'
          : 'hover:bg-white/[0.02]'
      } ${disabled ? 'cursor-default opacity-55' : ''}`}
    >
      <Radio checked={radio} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      {icon ? <span className="shrink-0 text-zinc-500">{icon}</span> : null}
      {trailing}
    </button>
  )
}

export function PaymentMethodSelector({ selected, onSelect, lockToCard }: Props) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-white">Mënyra e pagesës</h2>
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c2030]/60">
        <MethodRow
          active={selected === 'card'}
          onClick={() => onSelect('card')}
          radio={selected === 'card'}
          title="Kartë bankare"
          subtitle="Visa, Mastercard, American Express"
          trailing={<CardBrandIcons />}
        />
        <MethodRow
          active={selected === 'cod'}
          disabled={lockToCard}
          onClick={() => !lockToCard && onSelect('cod')}
          radio={selected === 'cod'}
          icon={<CashIcon />}
          title="Para në dorë"
          subtitle="Paguaj kur të mbërrijë porosia"
        />
        <MethodRow
          active={selected === 'card_on_delivery'}
          disabled={lockToCard}
          onClick={() => !lockToCard && onSelect('card_on_delivery')}
          radio={selected === 'card_on_delivery'}
          icon={<TerminalIcon />}
          title="Kartë pas dorëzimit"
          subtitle="Paguaj me kartë te dera"
        />
      </div>
      {lockToCard && selected !== 'card' ? (
        <p className="mt-2 text-xs" style={{ color: rdYellow }}>
          Kjo porosi kërkon pagesë me kartë tani.
        </p>
      ) : null}
    </div>
  )
}
