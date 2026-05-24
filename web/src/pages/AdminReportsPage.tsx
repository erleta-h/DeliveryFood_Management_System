import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  authenticatedDownloadFile,
  fetchAdminDashboard,
  fetchOperationsReport,
  operationsReportExportUrl,
  type AdminDashboardData,
  type OperationsReport,
} from '../lib/adminApi'
import { customerBtnGhost, customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

function fmtMoney(n: number) {
  return new Intl.NumberFormat('sq-XK', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function AdminReportsPage() {
  const token = useAuthStore((s) => s.token)
  const [dash, setDash] = useState<AdminDashboardData | null>(null)
  const [ops, setOps] = useState<OperationsReport | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dashError, setDashError] = useState<string | null>(null)
  const [opsError, setOpsError] = useState<string | null>(null)
  const [loadingDash, setLoadingDash] = useState(true)
  const [loadingOps, setLoadingOps] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoadingDash(false)
      return
    }
    let c = false
    setLoadingDash(true)
    void fetchAdminDashboard(token)
      .then((d) => {
        if (!c) setDash(d)
      })
      .catch((e: unknown) => {
        if (!c) setDashError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoadingDash(false)
      })
    return () => {
      c = true
    }
  }, [token])

  const loadOps = useCallback(async () => {
    if (!token) return
    setOpsError(null)
    setLoadingOps(true)
    try {
      const q: { fromUtc?: string; toUtc?: string } = {}
      if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
      if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
      const r = await fetchOperationsReport(token, q)
      setOps(r)
    } catch (e: unknown) {
      setOpsError(e instanceof Error ? e.message : 'Gabim.')
      setOps(null)
    } finally {
      setLoadingOps(false)
    }
  }, [token, fromDate, toDate])

  useEffect(() => {
    if (!token) return
    void loadOps()
  }, [token, loadOps])

  async function onExport(format: 'csv' | 'json' | 'xlsx') {
    if (!token) return
    setExportMsg(null)
    const q: { fromUtc?: string; toUtc?: string } = {}
    if (fromDate) q.fromUtc = `${fromDate}T00:00:00.000Z`
    if (toDate) q.toUtc = `${toDate}T23:59:59.999Z`
    try {
      await authenticatedDownloadFile(
        token,
        operationsReportExportUrl(format, q),
        `operations-report.${format}`,
      )
    } catch (e: unknown) {
      setExportMsg(e instanceof Error ? e.message : 'Eksporti dështoi.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Raporte</h1>
        <p className="mt-1 text-sm text-gray-500">
          Përmbledhje dashboard; raport operacional me filtra data (UTC) dhe eksport CSV / JSON / Excel.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/orders" className={customerBtnGhost}>
          Porositë
        </Link>
        <Link to="/admin/finance" className={customerBtnGhost}>
          Pagesat
        </Link>
        <Link to="/admin/data-port" className={customerBtnGhost}>
          Eksport lista
        </Link>
      </div>

      {dashError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Dashboard: {dashError}
        </p>
      ) : null}
      {loadingDash ? <p className="text-sm text-gray-500">Duke ngarkuar dashboard…</p> : null}

      {dash && !loadingDash ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-gray-500">Porosi sot</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{dash.ordersToday}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-gray-500">Porosi muaji</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{dash.ordersThisMonth}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-gray-500">Të ardhura muaji</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{fmtMoney(dash.revenueThisMonth)}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-gray-500">Restorantet aktive</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{dash.activeRestaurants}</p>
          </div>
          <div className={`${customerCardMuted} p-4`}>
            <p className="text-xs uppercase text-gray-500">Aplikime në pritje</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{dash.pendingPartnerApplications}</p>
          </div>
        </div>
      ) : null}

      <section className={`${customerCardMuted} space-y-4 p-4`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700/80">
          Raport operacional (dinamik)
        </h2>
        <p className="text-xs text-gray-500">
          Filtro sipas intervalit (UTC). Pa data — përdoret të gjithë historia e disponueshme.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-xs text-gray-500">
            Nga (UTC)
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Deri (UTC)
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <button type="button" className={customerBtnGhost} onClick={() => void loadOps()}>
            Rifresko
          </button>
        </div>
        {opsError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            Raport operacional: {opsError}
          </p>
        ) : null}
        {loadingOps ? <p className="text-sm text-gray-500">Duke llogaritur…</p> : null}
        {exportMsg ? <p className="text-sm text-amber-700">{exportMsg}</p> : null}
        {ops && !loadingOps ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Porosi (interval)</p>
                <p className="text-xl font-semibold text-gray-900">{ops.orderCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Shuma porosive</p>
                <p className="text-xl font-semibold text-gray-900">{fmtMoney(ops.orderTotalSum)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Restorante aktive</p>
                <p className="text-xl font-semibold text-gray-900">{ops.activeRestaurantCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Klientë (roli)</p>
                <p className="text-xl font-semibold text-gray-900">{ops.customerRoleUserCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Tiketa të hapura</p>
                <p className="text-xl font-semibold text-gray-900">{ops.openSupportTickets}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Kupona aktivë</p>
                <p className="text-xl font-semibold text-gray-900">{ops.couponCountActive}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={customerBtnGhost} onClick={() => void onExport('csv')}>
                Shkarko CSV
              </button>
              <button type="button" className={customerBtnGhost} onClick={() => void onExport('json')}>
                Shkarko JSON
              </button>
              <button type="button" className={customerBtnGhost} onClick={() => void onExport('xlsx')}>
                Shkarko Excel
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
