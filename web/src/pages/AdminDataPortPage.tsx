import { useCallback, useId, useRef, useState, type DragEvent } from 'react'
import { AdminIcon, type AdminNavIconName } from '../components/admin/adminIcons'
import { adminDataImport, adminDataExportUrl, authenticatedDownloadFile } from '../lib/adminApi'
import {
  adminSuccessBanner,
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
  customerLabelSm,
} from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

type ExportResourceId = 'orders' | 'restaurants' | 'customers' | 'coupons' | 'support-tickets'
type ImportModalKind = 'restaurants' | 'coupons' | 'cms'

type ExportCard = {
  id: ExportResourceId
  label: string
  description: string
  icon: AdminNavIconName
  importKind?: ImportModalKind
  importLabel?: string
}

const EXPORT_CARDS: ExportCard[] = [
  {
    id: 'orders',
    label: 'Porositë',
    description: 'Eksporto të gjitha porositë për raporte dhe arkivim.',
    icon: 'orders',
  },
  {
    id: 'restaurants',
    label: 'Restorantet',
    description: 'Eksporto listën e biznesve ose importo restorante të reja.',
    icon: 'restaurant',
    importKind: 'restaurants',
    importLabel: 'Importo CSV',
  },
  {
    id: 'customers',
    label: 'Klientët',
    description: 'Eksporto listën e klientëve për analiza.',
    icon: 'users',
  },
  {
    id: 'coupons',
    label: 'Kuponat',
    description: 'Eksporto kuponat ose importo kupona të rinj.',
    icon: 'promotions',
    importKind: 'coupons',
    importLabel: 'Importo CSV / JSON',
  },
  {
    id: 'support-tickets',
    label: 'Tiketat support',
    description: 'Eksporto tiketat dhe bisedat për raportim.',
    icon: 'support',
  },
]

const SAMPLE_BLOBS: Record<ImportModalKind, { filename: string; mime: string; content: string }> = {
  restaurants: {
    filename: 'shembull-restorante.csv',
    mime: 'text/csv;charset=utf-8',
    content:
      'Name,Email,Phone,City,Address\nOnBurger,onburger@gmail.com,044123123,Prishtinë,Rruga B Nr.12\n',
  },
  coupons: {
    filename: 'shembull-kupona.csv',
    mime: 'text/csv;charset=utf-8',
    content: 'Code,DiscountPercent\nDEMO10,10\nWELCOME15,15\n',
  },
  cms: {
    filename: 'shembull-cms.json',
    mime: 'application/json;charset=utf-8',
    content: JSON.stringify({ 'cms.heroTitle': 'Mirë se vini', 'cms.heroSubtitle': 'Porosit online' }, null, 2),
  },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Heq BOM (Excel) dhe normalizon rreshtat për CSV import. */
function normalizeCsvText(text: string): string {
  const trimmed = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const btnExportExcel =
  'inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-40'

const btnExportOutline =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40'

const btnImportOutline =
  'rounded-lg border border-violet-600 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:opacity-40'

type ImportModalConfig = {
  title: string
  description: string
  accept: string
  allowedLines: string[]
  sampleKind: ImportModalKind
  sampleLinkLabel: string
}

const IMPORT_MODAL_CONFIG: Record<ImportModalKind, ImportModalConfig> = {
  restaurants: {
    title: 'Importo Restorante',
    description: 'Ngarko një file CSV për të importuar restorante të reja.',
    accept: '.csv,text/csv',
    allowedLines: [
      'Formati i lejuar: CSV',
      'Kolonat: Name, Email, Phone, City, Address',
      'Maksimumi 5000 rreshta',
    ],
    sampleKind: 'restaurants',
    sampleLinkLabel: 'Shkarko shembullin (CSV)',
  },
  coupons: {
    title: 'Importo Kupona',
    description: 'Ngarko CSV ose JSON për të krijuar kupona promocionalë.',
    accept: '.csv,.json,text/csv,application/json',
    allowedLines: [
      'Formati i lejuar: CSV ose JSON',
      'Kolonat për CSV: Code, DiscountPercent',
    ],
    sampleKind: 'coupons',
    sampleLinkLabel: 'Shkarko shembullin',
  },
  cms: {
    title: 'Importo CMS',
    description: 'Ngarko një file JSON për të përditësuar përmbajtjen e faqes kryesore.',
    accept: '.json,application/json',
    allowedLines: [
      'Formati i lejuar: JSON',
      'Ky veprim mund të ndryshojë tekstet dhe përmbajtjen e ballinës.',
    ],
    sampleKind: 'cms',
    sampleLinkLabel: 'Shkarko shembullin (JSON)',
  },
}

function ExportCardRow({
  card,
  onExport,
  onOpenImport,
}: {
  card: ExportCard
  onExport: (resource: string, format: 'csv' | 'json' | 'xlsx') => void
  onOpenImport?: () => void
}) {
  return (
    <div
      className={`${customerCardMuted} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-violet-600">
          <AdminIcon name={card.icon} size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{card.label}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{card.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnExportExcel} onClick={() => onExport(card.id, 'xlsx')}>
              <span className="text-emerald-600" aria-hidden>
                ▦
              </span>
              Excel
            </button>
            <button type="button" className={btnExportOutline} onClick={() => onExport(card.id, 'csv')}>
              CSV
            </button>
            <button type="button" className={btnExportOutline} onClick={() => onExport(card.id, 'json')}>
              JSON
            </button>
          </div>
        </div>
      </div>
      {card.importKind && onOpenImport ? (
        <div className="flex shrink-0 flex-col items-stretch border-t border-gray-100 pt-4 sm:items-end sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
          <p className={customerLabelSm}>Importo të dhëna</p>
          <button type="button" className={`${btnImportOutline} mt-2`} onClick={onOpenImport}>
            {card.importLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ImportModal({
  kind,
  busy,
  file,
  error,
  onClose,
  onFile,
  onImport,
}: {
  kind: ImportModalKind
  busy: boolean
  file: File | null
  error: string | null
  onClose: () => void
  onFile: (f: File | null) => void
  onImport: () => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const cfg = IMPORT_MODAL_CONFIG[kind]
  const [dragOver, setDragOver] = useState(false)

  const pickFile = useCallback(
    (f: File | null) => {
      if (!f) {
        onFile(null)
        return
      }
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      if (kind === 'restaurants' && ext !== 'csv') return
      if (kind === 'cms' && ext !== 'json') return
      if (kind === 'coupons' && ext !== 'csv' && ext !== 'json') return
      onFile(f)
    },
    [kind, onFile],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) pickFile(f)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal
      aria-labelledby={`${inputId}-title`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${inputId}-title`} className="text-lg font-semibold text-gray-900">
              {cfg.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{cfg.description}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Mbyll"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          className={[
            'mt-5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition',
            dragOver ? 'border-violet-500 bg-violet-50/50' : 'border-violet-300 bg-violet-50/30',
          ].join(' ')}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <AdminIcon name="import" size={24} />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-800">Drag &amp; Drop file këtu</p>
          <p className="mt-1 text-sm text-gray-500">ose</p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={cfg.accept}
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className={`${customerBtnPrimary} mt-4`}
            onClick={() => inputRef.current?.click()}
          >
            Zgjidh file
          </button>
        </div>

        {file ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="mt-0.5 text-gray-500">{formatFileSize(file.size)}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <span aria-hidden>●</span> Gati për import
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <span className="shrink-0 font-bold text-sky-600" aria-hidden>
            i
          </span>
          <ul className="space-y-0.5">
            {cfg.allowedLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900"
          onClick={() => {
            const s = SAMPLE_BLOBS[cfg.sampleKind]
            downloadBlob(s.filename, s.mime, s.content)
          }}
        >
          <AdminIcon name="import" size={16} className="rotate-180" />
          {cfg.sampleLinkLabel}
        </button>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={customerBtnGhost} disabled={busy} onClick={onClose}>
            Anulo
          </button>
          <button
            type="button"
            className={customerBtnPrimary}
            disabled={busy || !file}
            onClick={onImport}
          >
            {busy ? 'Duke importuar…' : 'Importo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDataPortPage() {
  const token = useAuthStore((s) => s.token)
  const [msg, setMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [importModal, setImportModal] = useState<ImportModalKind | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  async function onExport(resource: string, format: 'csv' | 'json' | 'xlsx') {
    if (!token) return
    setMsg(null)
    setSuccess(false)
    try {
      await authenticatedDownloadFile(token, adminDataExportUrl(resource, format), `${resource}.${format}`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Eksporti dështoi.')
    }
  }

  function openImport(kind: ImportModalKind) {
    setImportModal(kind)
    setImportFile(null)
    setImportError(null)
    setMsg(null)
    setSuccess(false)
  }

  function closeImport() {
    if (importBusy) return
    setImportModal(null)
    setImportFile(null)
    setImportError(null)
  }

  async function runImport() {
    if (!token || !importModal || !importFile) return
    setImportBusy(true)
    setMsg(null)
    setImportError(null)
    setSuccess(false)
    try {
      const raw = await importFile.text()
      const text =
        importModal === 'restaurants' || (importModal === 'coupons' && importFile.name.endsWith('.csv'))
          ? normalizeCsvText(raw)
          : raw
      const ext = importFile.name.split('.').pop()?.toLowerCase() ?? ''
      let resource = importModal
      let format = ext
      if (importModal === 'coupons') {
        if (ext !== 'csv' && ext !== 'json') {
          setMsg('Zgjidh një file CSV ose JSON.')
          return
        }
        format = ext
      } else if (importModal === 'cms') {
        format = 'json'
      } else if (importModal === 'restaurants') {
        format = 'csv'
      }

      const r = await adminDataImport(token, resource, format, text)
      if (!r.ok) {
        setImportError(r.message)
        setMsg(r.message)
      } else {
        setSuccess(true)
        setMsg('Importi u krye.')
        setImportModal(null)
        setImportFile(null)
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Importi dështoi.'
      setImportError(err)
      setMsg(err)
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Eksport / import</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
          Eksporto të dhënat e sistemit për raporte dhe arkivim.
          <br />
          Importo të dhëna administrative në formatin e kërkuar.
        </p>
      </div>

      {msg ? (
        <p
          className={
            success
              ? adminSuccessBanner
              : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'
          }
          role="alert"
        >
          {msg}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className={customerLabelSm}>Eksporto të dhënat</h2>
        <div className="space-y-3">
          {EXPORT_CARDS.map((card) => (
            <ExportCardRow
              key={card.id}
              card={card}
              onExport={(r, f) => void onExport(r, f)}
              onOpenImport={card.importKind ? () => openImport(card.importKind!) : undefined}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={customerLabelSm}>Importo përmbajtjen e faqes / të dhëna administrative</h2>
        <div
          className={`${customerCardMuted} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-violet-600">
              <AdminIcon name="cms" size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">CMS (faqja kryesore)</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                Importo përmbajtjen e faqes kryesore në format JSON.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch border-t border-gray-100 pt-4 sm:items-end sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
            <p className={customerLabelSm}>Importo të dhëna</p>
            <button type="button" className={`${btnImportOutline} mt-2`} onClick={() => openImport('cms')}>
              Importo JSON
            </button>
          </div>
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <span className="shrink-0 font-bold text-sky-600" aria-hidden>
          i
        </span>
        <p>Kufizimi maksimal për eksport është 5000 rreshta për kërkesë.</p>
      </div>

      {importModal ? (
        <ImportModal
          kind={importModal}
          busy={importBusy}
          file={importFile}
          error={importError}
          onClose={closeImport}
          onFile={(f) => {
            setImportFile(f)
            setImportError(null)
          }}
          onImport={() => void runImport()}
        />
      ) : null}
    </div>
  )
}
