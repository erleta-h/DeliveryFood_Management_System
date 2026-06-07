import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CmsHeroEditor } from '../components/cms/CmsHeroEditor'
import { CmsLandingPreview } from '../components/cms/CmsLandingPreview'
import { CmsSectionEditor } from '../components/cms/CmsSectionEditor'
import { CmsSectionTabs } from '../components/cms/CmsSectionTabs'
import { SaveStatusBar } from '../components/cms/SaveStatusBar'
import { CMS_DEFAULTS, formatRelativeUpdated, latestUpdatedAt } from '../lib/landingContent'
import { ALL_CMS_FIELD_KEYS, getCmsSection, type CmsSectionId } from '../lib/cmsConfig'
import { adminCmsUpsert, fetchAdminCms, type AdminCmsEntry } from '../lib/adminApi'
import { customerBtnGhost } from '../lib/adminTheme'
import { useAuthStore } from '../store/authStore'

function buildDraftFromRows(rows: AdminCmsEntry[]): Record<string, string> {
  const d: Record<string, string> = { ...CMS_DEFAULTS }
  for (const r of rows) d[r.key] = r.value ?? CMS_DEFAULTS[r.key] ?? ''
  return d
}

export default function AdminCmsPage() {
  const token = useAuthStore((s) => s.token)
  const [rows, setRows] = useState<AdminCmsEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({ ...CMS_DEFAULTS })
  const [baseline, setBaseline] = useState<Record<string, string>>({ ...CMS_DEFAULTS })
  const [activeSection, setActiveSection] = useState<CmsSectionId>('hero')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [clientSavedAt, setClientSavedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    const list = await fetchAdminCms(token)
    setRows(list)
    const d = buildDraftFromRows(list)
    setDraft(d)
    setBaseline(d)
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

  const dirtyKeys = useMemo(() => {
    return ALL_CMS_FIELD_KEYS.filter((k) => (draft[k] ?? '') !== (baseline[k] ?? ''))
  }, [draft, baseline])

  const dirty = dirtyKeys.length > 0

  const lastUpdatedLabel = useMemo(() => {
    const fromApi = rows ? formatRelativeUpdated(latestUpdatedAt(rows)) : null
    const fromClient = formatRelativeUpdated(clientSavedAt)
    return fromClient ?? fromApi
  }, [rows, clientSavedAt])

  function onFieldChange(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
    setSaveError(null)
  }

  async function saveAll() {
    if (!token || !dirty) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      for (const key of dirtyKeys) {
        const r = await adminCmsUpsert(token, { key, value: draft[key] ?? '' })
        if (!r.ok) {
          setSaveError(r.message)
          return
        }
      }
      setBaseline({ ...draft })
      setSaved(true)
      setClientSavedAt(new Date().toISOString())
      void load()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Gabim gjatë ruajtjes.')
    } finally {
      setSaving(false)
    }
  }

  const section = getCmsSection(activeSection)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">CMS — Faqja Kryesore</h1>
          <p className="mt-1 text-sm text-gray-500">Menaxho përmbajtjen e landing page</p>
        </div>
        <Link to="/" target="_blank" className={`${customerBtnGhost} inline-flex items-center gap-2`}>
          Paraqitja e faqes
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
        </Link>
      </div>

      {error ? <p className="shrink-0 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="shrink-0 text-sm text-gray-500">Duke ngarkuar…</p> : null}

      {rows && !loading ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
            <div className="shrink-0 border-b border-gray-100 px-4 pt-3 sm:px-5">
              <CmsSectionTabs active={activeSection} onChange={setActiveSection} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{section.label}</p>
                <p className="mt-1 text-sm text-gray-500">{section.description}</p>
              </div>

              {activeSection === 'hero' ? (
                <CmsHeroEditor draft={draft} onFieldChange={onFieldChange} />
              ) : (
                <CmsSectionEditor section={section} draft={draft} onFieldChange={onFieldChange} />
              )}

              <SaveStatusBar
                saving={saving}
                saved={saved}
                error={saveError}
                lastUpdatedLabel={lastUpdatedLabel}
                onSave={() => void saveAll()}
                dirty={dirty}
              />
            </div>
          </div>

          <div className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 xl:min-h-0 xl:flex-1">
            <CmsLandingPreview draft={draft} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
