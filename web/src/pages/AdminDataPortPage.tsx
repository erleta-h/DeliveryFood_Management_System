import { useState } from 'react'
import { adminDataImport, adminDataExportUrl, authenticatedDownloadFile } from '../lib/adminApi'
import { customerBtnGhost, customerBtnPrimary, customerCardMuted } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

const RESOURCES = [
  { id: 'orders', label: 'Porositë' },
  { id: 'restaurants', label: 'Restorantet' },
  { id: 'customers', label: 'Klientët' },
  { id: 'coupons', label: 'Kuponat' },
  { id: 'support-tickets', label: 'Tiketat support' },
] as const

export default function AdminDataPortPage() {
  const token = useAuthStore((s) => s.token)
  const [msg, setMsg] = useState<string | null>(null)
  const [importText, setImportText] = useState('')

  async function onExport(resource: string, format: 'csv' | 'json' | 'xlsx') {
    if (!token) return
    setMsg(null)
    try {
      await authenticatedDownloadFile(token, adminDataExportUrl(resource, format), `${resource}.${format}`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Eksporti dështoi.')
    }
  }

  async function onImport(resource: string, format: string) {
    if (!token) return
    setMsg(null)
    const r = await adminDataImport(token, resource, format, importText)
    if (!r.ok) setMsg(r.message)
    else {
      setMsg('Importi u krye.')
      setImportText('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Eksport / import</h1>
        <p className="mt-1 text-sm text-gray-500">
          Eksport deri në 5000 rreshta (CSV, JSON, Excel). Import: kuponat (JSON ose CSV me header Code,
          DiscountPercent) ose CMS (JSON objekt me çelësa <span className="font-mono">cms.*</span>).
        </p>
      </div>

      {msg ? <p className="text-sm text-amber-700">{msg}</p> : null}

      <div className="space-y-4">
        {RESOURCES.map((r) => (
          <div key={r.id} className={`${customerCardMuted} flex flex-wrap items-center gap-2 p-4`}>
            <span className="min-w-[8rem] font-medium text-gray-800">{r.label}</span>
            <button type="button" className={customerBtnGhost} onClick={() => void onExport(r.id, 'csv')}>
              CSV
            </button>
            <button type="button" className={customerBtnGhost} onClick={() => void onExport(r.id, 'json')}>
              JSON
            </button>
            <button type="button" className={customerBtnGhost} onClick={() => void onExport(r.id, 'xlsx')}>
              Excel
            </button>
          </div>
        ))}
      </div>

      <div className={`${customerCardMuted} space-y-3 p-4`}>
        <p className="text-sm font-medium text-violet-700/90">Import (trupi i kërkesës)</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          placeholder='[{"code":"DEMO10","discountPercent":10}] ose CSV: Code,DiscountPercent'
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={customerBtnPrimary} onClick={() => void onImport('coupons', 'json')}>
            Import kuponash (JSON)
          </button>
          <button type="button" className={customerBtnGhost} onClick={() => void onImport('coupons', 'csv')}>
            Import kuponash (CSV)
          </button>
          <button type="button" className={customerBtnGhost} onClick={() => void onImport('cms', 'json')}>
            Import CMS (JSON)
          </button>
        </div>
      </div>
    </div>
  )
}
