import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AdminEmptyState } from '../components/admin/AdminEmptyState'
import { AdminIcon } from '../components/admin/adminIcons'
import { AdminTableSkeleton } from '../components/admin/AdminSkeleton'
import {
  adminDeleteSetting,
  adminUpsertSetting,
  fetchAdminSettings,
  type AdminSettingRow,
} from '../lib/adminApi'
import {
  adminErrorBanner,
  adminFilterBtn,
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
  customerField,
  customerLabelForm,
  customerPanelSubtitle,
} from '../lib/adminTheme'
import {
  countSettingsKpis,
  getSettingDescription,
  getSettingLabel,
  getSettingSection,
  getSettingSectionMeta,
  isVisibleOnSettingsPage,
  SETTING_SECTIONS,
  type SettingSectionFilter,
} from '../lib/settingLabels'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 10

function FieldHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold leading-none text-gray-400"
      aria-label={text}
    >
      i
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: ReactNode
  tone: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}

function SectionBadge({ settingKey }: { settingKey: string }) {
  const section = getSettingSection(settingKey)
  const meta = getSettingSectionMeta(section)
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

function DeleteSettingModal({
  row,
  busy,
  onClose,
  onConfirm,
}: {
  row: AdminSettingRow
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const label = getSettingLabel(row.key)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Fshije konfigurimin?</h2>
        <p className="mt-2 text-sm text-gray-500">Ky veprim nuk mund të zhbëhet.</p>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="mt-0.5 font-mono text-xs text-gray-400">{row.key}</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
            Anulo
          </button>
          <button
            type="button"
            className={customerBtnPrimary + ' !bg-red-600 hover:!bg-red-700'}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Duke fshirë…' : 'Fshije përgjithmonë'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const token = useAuthStore((s) => s.token)
  const formRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState<AdminSettingRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgIsError, setMsgIsError] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [desc, setDesc] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState<SettingSectionFilter>('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<AdminSettingRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchAdminSettings(token)
    setRows(list)
  }, [token])

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

  useEffect(() => {
    setPage(1)
  }, [search, sectionFilter])

  const visibleRows = useMemo(() => rows?.filter((r) => isVisibleOnSettingsPage(r.key)) ?? [], [rows])

  const stats = useMemo(() => {
    const keys = visibleRows.map((r) => r.key)
    return countSettingsKpis(keys)
  }, [visibleRows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visibleRows.filter((r) => {
      const section = getSettingSection(r.key)
      if (sectionFilter !== 'all' && section !== sectionFilter) return false
      if (!q) return true
      const label = getSettingLabel(r.key).toLowerCase()
      const sectionLabel = getSettingSectionMeta(section).label.toLowerCase()
      const description = getSettingDescription(r.key, r.description).toLowerCase()
      return (
        label.includes(q) ||
        r.key.toLowerCase().includes(q) ||
        sectionLabel.includes(q) ||
        description.includes(q) ||
        (r.value?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [visibleRows, search, sectionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const pageNumbers = useMemo(() => {
    const max = 5
    let start = Math.max(1, page - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    start = Math.max(1, end - max + 1)
    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  const editingLabel = editingId !== null && key ? getSettingLabel(key) : null
  const editingCatalogHint = key ? getSettingDescription(key, null) : ''

  function resetForm() {
    setKey('')
    setValue('')
    setDesc('')
    setEditingId(null)
    setMsg(null)
    setMsgIsError(false)
  }

  function showMsg(text: string, isError = false) {
    setMsg(text)
    setMsgIsError(isError)
  }

  function startNew() {
    resetForm()
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startEdit(row: AdminSettingRow) {
    setKey(row.key)
    setValue(row.value ?? '')
    setDesc(row.description ?? '')
    setEditingId(row.id)
    setMsg(null)
    setMsgIsError(false)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !key.trim()) return
    setSaving(true)
    setMsg(null)
    setMsgIsError(false)
    const r = await adminUpsertSetting(token, {
      key: key.trim(),
      value: value || null,
      description: desc.trim() || null,
    })
    setSaving(false)
    if (!r.ok) {
      showMsg(r.message, true)
      return
    }
    resetForm()
    showMsg('Konfigurimi u ruajt.')
    void load()
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return
    setDeleteBusy(true)
    setMsg(null)
    setMsgIsError(false)
    const target = deleteTarget
    const r = await adminDeleteSetting(token, target.key)
    setDeleteBusy(false)
    if (!r.ok) {
      showMsg(r.message, true)
      return
    }
    setDeleteTarget(null)
    if (editingId === target.id) resetForm()
    showMsg('Konfigurimi u fshi.')
    void load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Konfigurime</h1>
          <p className={customerPanelSubtitle}>
            Parametrat e biznesit për Food Delivery — tarifa, porosi, shoferë, support dhe faqja publike.
          </p>
        </div>
        <button type="button" className={customerBtnPrimary + ' shrink-0'} onClick={startNew}>
          + Shto konfigurim të ri
        </button>
      </div>

      {msg ? <p className={msgIsError ? adminErrorBanner : adminSuccessBanner}>{msg}</p> : null}
      {error ? <p className={adminErrorBanner}>{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Settings"
          value={loading ? 0 : stats.total}
          tone="bg-violet-100 text-violet-700"
          icon={<AdminIcon name="settings" size={18} />}
        />
        <StatCard
          label="Platform Settings"
          value={loading ? 0 : stats.platform}
          tone="bg-indigo-100 text-indigo-700"
          icon={<AdminIcon name="logo" size={18} />}
        />
        <StatCard
          label="Business Rules"
          value={loading ? 0 : stats.businessRules}
          tone="bg-emerald-100 text-emerald-700"
          icon={<AdminIcon name="finance" size={18} />}
        />
        <StatCard
          label="CMS Settings"
          value={loading ? 0 : stats.cms}
          tone="bg-fuchsia-100 text-fuchsia-700"
          icon={<AdminIcon name="cms" size={18} />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SETTING_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={adminFilterBtn(sectionFilter === s.id)}
            onClick={() => setSectionFilter(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div ref={formRef} className="space-y-4">
          <form onSubmit={save} className={`${customerCardMuted} space-y-4`}>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId !== null ? 'Përditëso konfigurimin' : 'Shto konfigurim të ri'}
              </h2>
              {editingLabel ? (
                <p className="mt-1 text-sm font-medium text-gray-800">{editingLabel}</p>
              ) : null}
            </div>

            <label className={customerLabelForm}>
              <span className="inline-flex items-center">
                Technical Key
                <FieldHint text="System identifier — e.g. platform.support_email" />
              </span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                readOnly={editingId !== null}
                className={customerField + (editingId !== null ? ' bg-gray-50 font-mono text-xs text-gray-600' : ' font-mono text-xs')}
                placeholder="platform.support_email"
              />
              {editingCatalogHint ? (
                <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-gray-500">
                  {editingCatalogHint}
                </span>
              ) : (
                <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-gray-400">
                  Used internally by the system — hidden from operators in the table view.
                </span>
              )}
            </label>

            <label className={customerLabelForm}>
              <span className="inline-flex items-center">
                Current Value
                <FieldHint text="What is live on the platform right now" />
              </span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={customerField}
                placeholder="support@fooddelivery.com"
              />
            </label>

            <label className={customerLabelForm}>
              <span className="inline-flex items-center">
                Internal Note
                <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">(optional)</span>
              </span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className={customerField + ' resize-none'}
                placeholder={
                  editingCatalogHint ||
                  'e.g. Support email shown in footer and on the contact page.'
                }
              />
            </label>

            <button type="submit" className={customerBtnPrimary + ' w-full'} disabled={saving || !key.trim()}>
              {saving ? 'Duke ruajtur…' : 'Ruaj konfigurimin'}
            </button>
          </form>

          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-900">
            <h3 className="font-semibold text-violet-800">Si funksionon?</h3>
            <p className="mt-2 text-violet-800/80">
              Menaxho tarifat, rregullat e porosive, support-in dhe shkurtimet e faqes kryesore — si panel
              operacional i një platforme Food Delivery.
            </p>
            <ul className="mt-3 space-y-2 text-violet-800/90">
              {[
                'Grupet: Platform, Finance, Delivery, Orders, Partner Onboarding, Drivers, Customers, Coupons, Support, CMS',
                'Emrat e lexueshëm zëvendësojnë çelësat teknikë',
                'Përmbajtja e plotë CMS menaxhohet te faqja CMS',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={`${customerCardMuted} flex min-h-[320px] flex-col p-0`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Konfigurimet ekzistuese</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {sectionFilter === 'all'
                  ? 'Të gjitha grupet'
                  : SETTING_SECTIONS.find((s) => s.id === sectionFilter)?.label}
              </p>
            </div>
            <div className="relative w-full max-w-xs sm:w-56">
              <AdminIcon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kërko emrin, grupin ose vlerën…"
                className={customerField + ' pl-9'}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={6} />
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <AdminEmptyState
                icon="⚙️"
                title={search || sectionFilter !== 'all' ? 'Nuk u gjet asnjë konfigurim' : 'Nuk ka konfigurime'}
                description={
                  search || sectionFilter !== 'all'
                    ? 'Provo një term tjetër kërkimi ose ndrysho filtrin e grupit.'
                    : 'Shto konfigurimin e parë duke përdorur formularin në të majtë.'
                }
              />
            </div>
          ) : null}

          {!loading && filtered.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Setting Name</th>
                      <th className="px-4 py-3">Current Value</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.map((s) => {
                      const description = getSettingDescription(s.key, s.description)
                      return (
                      <tr key={s.id} className="transition hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <span className="font-medium text-gray-900">{getSettingLabel(s.key)}</span>
                            <p className="font-mono text-[11px] text-gray-400">{s.key}</p>
                          </div>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-gray-800" title={s.value ?? undefined}>
                          {s.value?.trim() ? s.value : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <SectionBadge settingKey={s.key} />
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-gray-500">
                          {description ? (
                            <span className="line-clamp-2">{description}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Ndrysho"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                              onClick={() => startEdit(s)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Fshi"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-red-500 transition hover:border-red-200 hover:bg-red-50"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-gray-500">
                  Duke shfaqur {(page - 1) * PAGE_SIZE + 1} deri në {Math.min(page * PAGE_SIZE, filtered.length)} nga{' '}
                  {filtered.length} rezultate
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ←
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={
                        n === page
                          ? 'flex h-8 min-w-8 items-center justify-center rounded-lg bg-violet-600 px-2 text-xs font-semibold text-white'
                          : customerBtnGhost + ' h-8 min-w-8 px-2 py-1.5 text-xs'
                      }
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={customerBtnGhost + ' px-2.5 py-1.5 text-xs'}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {deleteTarget ? (
        <DeleteSettingModal
          row={deleteTarget}
          busy={deleteBusy}
          onClose={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  )
}
