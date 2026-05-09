import { Link } from 'react-router-dom'
import { customerBtnPrimary, customerCardMuted } from '../lib/customerTheme'

const SUPPORT_TEL = '+38344123456'
const SUPPORT_MAIL = 'support@fooddelivery.local'

export default function DriverSupportPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-zinc-100">Mbështetja</h1>
        <Link to="/driver" className="text-xs text-sky-400 hover:text-sky-300">
          ← Paneli
        </Link>
      </div>
      <div className={`${customerCardMuted} space-y-3 p-4`}>
        <a href={`tel:${SUPPORT_TEL.replace(/\s/g, '')}`} className={`${customerBtnPrimary} block text-center`}>
          Thirr supportin
        </a>
        <a
          href={`mailto:${SUPPORT_MAIL}?subject=FoodDelivery%20Driver`}
          className="block rounded-lg border border-white/10 py-3 text-center text-sm text-sky-300 hover:bg-white/5"
        >
          Email support
        </a>
        <p className="text-xs text-zinc-500">
          Chat live në kohë reale kërkon integrim (WebSocket / provider) — për MVP përdor telefon ose email.
        </p>
        <Link
          to="/driver"
          className="block text-center text-xs text-amber-200/90 underline-offset-2 hover:underline"
        >
          Raporto problem me porosinë aktive nga paneli kryesor (detaje porosie).
        </Link>
      </div>
    </div>
  )
}
