import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import { fetchAdminPayments, type AdminPaymentListResult, type AdminPaymentRow } from '../lib/adminApi'
import {
  formatMoneyEur,
  formatPaymentDate,
  PAYMENT_PROVIDER_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  paymentProviderLabel,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../lib/adminFinanceStatus'
import {
  adminFilterBtn,
  customerBtnGhost,
  customerCardMuted,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
  customerSelect,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 25

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  valueClass,
}: {
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
  tone: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums text-gray-900 ${valueClass ?? ''}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

function paymentSubtitle(row: AdminPaymentRow): string {
  const parts = [
    row.restaurantName,
    row.customerName ?? row.customerEmail,
    paymentProviderLabel(row.provider),
  ].filter(Boolean)
  return parts.join(' · ')
}

function PaymentCard({ row }: { row: AdminPaymentRow }) {
  const badge = paymentStatusBadgeClass(row.status)
  return (
    <article className="rounded-xl border border-gray-200/90 bg-white px-4 py-3.5 shadow-sm transition hover:border-violet-200/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-gray-900">{row.orderNumber}</p>
          <p className="mt-0.5 truncate text-sm text-gray-500">{paymentSubtitle(row)}</p>
          <p className="mt-1 text-xs text-gray-400">{formatPaymentDate(row.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatMoneyEur(row.amount)}</p>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badge}`}
          >
            {paymentStatusLabel(row.status)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
        <Link
          to={`/admin/orders?search=${encodeURIComponent(row.orderNumber)}`}
          className={`${customerBtnGhost} text-xs`}
        >
          Shiko porosinë
        </Link>
      </div>
    </article>
  )
}

export default function AdminFinancePage() {
  const token = useAuthStore((s) => s.token)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('')
  const [provider, setProvider] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [appliedProvider, setAppliedProvider] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminPaymentListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const intervalHint = appliedFrom || appliedTo ? 'në interval' : 'gjithsej'

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const q: Parameters<typeof fetchAdminPayments>[1] = { page, pageSize: PAGE_SIZE }
    if (appliedFrom) q.fromUtc = `${appliedFrom}T00:00:00.000Z`
    if (appliedTo) q.toUtc = `${appliedTo}T23:59:59.999Z`
    if (appliedStatus !== '') q.status = Number(appliedStatus)
    if (appliedProvider.trim()) q.provider = appliedProvider.trim()
    const d = await fetchAdminPayments(token, q)
    setData(d)
  }, [token, appliedFrom, appliedTo, appliedStatus, appliedProvider, page])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let c = false
    setLoading(true)
    void load()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, load])

  function applyFilters() {
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
    setAppliedStatus(status)
    setAppliedProvider(provider)
    setPage(1)
  }

  function resetFilters() {
    setFromDate('')
    setToDate('')
    setStatus('')
    setProvider('')
    setAppliedFrom('')
    setAppliedTo('')
    setAppliedStatus('')
    setAppliedProvider('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financa</h1>
          <p className={customerPanelSubtitle}>Monitoro pagesat, rimbursimet dhe të ardhurat e platformës.</p>
        </div>
      </div>

      {data && !loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Të ardhura të kapura"
            value={formatMoneyEur(data.sumCapturedAmount)}
            hint={intervalHint}
            icon={<AdminIcon name="finance" size={18} className="text-emerald-600" />}
            tone="bg-emerald-50"
          />
          <KpiCard
            label="Pagesa në pritje"
            value={formatMoneyEur(data.sumPendingAmount)}
            hint={data.pendingCount === 1 ? '1 pagesë' : `${data.pendingCount} pagesa`}
            icon={<AdminIcon name="orders" size={18} className="text-amber-600" />}
            tone="bg-amber-50"
          />
          <KpiCard
            label="Rimbursime"
            value={formatMoneyEur(data.sumRefundedAmount)}
            hint={data.refundedCount === 1 ? '1 refund' : `${data.refundedCount} refunde`}
            icon={<AdminIcon name="support" size={18} className="text-sky-600" />}
            tone="bg-sky-50"
          />
          <KpiCard
            label="Transaksione"
            value={data.total}
            hint={intervalHint}
            icon={<AdminIcon name="reports" size={18} className="text-violet-600" />}
            tone="bg-violet-50"
          />
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : null}

      <div className={`${customerCardMuted} flex flex-wrap items-end gap-3 p-4`}>
        <label className={customerLabelSm}>
          Prej
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={customerField} />
        </label>
        <label className={customerLabelSm}>
          Deri
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={customerField} />
        </label>
        <label className={customerLabelSm}>
          Statusi
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={customerSelect}>
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={customerLabelSm}>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={customerSelect}>
            {PAYMENT_PROVIDER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={adminFilterBtn(true)} onClick={applyFilters}>
          Filtro
        </button>
        <button type="button" className={customerBtnGhost} onClick={resetFilters}>
          Pastro filtrat
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <AdminTableSkeleton rows={6} />
      ) : data && data.items.length === 0 ? (
        <AdminEmptyState
          icon="💳"
          title="Nuk ka pagesa për këtë interval."
          description="Provo të ndryshosh datat ose filtrat e statusit dhe provider-it."
        />
      ) : data ? (
        <>
          <div className="space-y-3">
            {data.items.map((p) => (
              <PaymentCard key={p.id} row={p} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              Duke shfaqur {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} nga {data.total} pagesa
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
              >
                ←
              </button>
              <span className="tabular-nums">Faqja {data.page}</span>
              <button
                type="button"
                className={customerBtnGhost}
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((x) => x + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
