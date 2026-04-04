import { customerCard, customerInfoRow, customerPanelSubtitle } from '../lib/customerTheme'
import { useAuthStore } from '../store/authStore'

export default function AccountPage() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Nuk je i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <h1 className="text-2xl font-bold text-zinc-100">Llogaria</h1>
      <p className={customerPanelSubtitle}>Të dhënat nga regjistrimi dhe adresa kryesore.</p>

      <dl className="mt-8 max-w-lg">
        <div className={customerInfoRow}>
          <dt className="text-zinc-500">Emri</dt>
          <dd className="text-zinc-100">
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div className={customerInfoRow}>
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-zinc-100">{user.email}</dd>
        </div>
        <div className={customerInfoRow}>
          <dt className="text-zinc-500">Telefoni</dt>
          <dd className="text-zinc-100">
            {user.phone?.trim() ? user.phone : '— (shto te «Adresa e dorëzimit»)'}
          </dd>
        </div>
        <div className={customerInfoRow}>
          <dt className="text-zinc-500">Adresa</dt>
          <dd className="text-zinc-100">{user.line1}</dd>
        </div>
        <div className={customerInfoRow}>
          <dt className="text-zinc-500">Qyteti</dt>
          <dd className="text-zinc-100">{user.city}</dd>
        </div>
        {user.postalCode ? (
          <div className={customerInfoRow}>
            <dt className="text-zinc-500">Kodi postar</dt>
            <dd className="text-zinc-100">{user.postalCode}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
