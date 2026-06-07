import { useCallback, useEffect, useId, useMemo, useState, type DragEvent } from 'react'
import { fetchKitchenMenu } from '../lib/kitchenMenuApi'
import { isKitchenHttpUnauthorized } from '../lib/kitchenApi'
import {
  deleteKitchenCover,
  deleteKitchenLogo,
  fetchKitchenBranding,
  kitchenBrandingPublicUrl,
  uploadKitchenCover,
  uploadKitchenLogo,
  type KitchenBrandingState,
} from '../lib/kitchenBrandingApi'
import { coverImageFromMenu, generatedLogoLines } from '../lib/restaurantDetailUi'
import { imageUrlForFoodCategory } from '../lib/categoryBrowseImages'
import { useAuthStore } from '../store/authStore'

const card =
  'rounded-2xl border border-[#30363d] bg-[#161b22] p-5 sm:p-6'
const uploadZoneBase =
  'flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition'
const uploadZoneIdle =
  'border-[#484f58] bg-[#0d1117]/60 hover:border-[#ffc107]/40 hover:bg-[#ffc107]/5'
const uploadZoneActive = 'border-[#ffc107] bg-[#ffc107]/10'
const btnGold =
  'inline-flex items-center justify-center rounded-lg bg-[#ffc107] px-4 py-2 text-sm font-semibold text-[#0d1117] transition hover:bg-[#f5b800] disabled:cursor-not-allowed disabled:opacity-50'
const btnGhostDanger =
  'inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-transparent px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50'

function UploadIcon() {
  return (
    <svg className="mb-2 h-8 w-8 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  )
}

function isAcceptedImageFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg'].includes(ext) || /^image\/(png|jpeg)$/.test(file.type)
}

type BrandingUploadZoneProps = {
  inputId: string
  disabled: boolean
  dragOver: boolean
  onDragOverChange: (over: boolean) => void
  onFile: (file: File) => void
  title: string
  hint1: string
  hint2: string
}

function BrandingUploadZone({
  inputId,
  disabled,
  dragOver,
  onDragOverChange,
  onFile,
  title,
  hint1,
  hint2,
}: BrandingUploadZoneProps) {
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    onDragOverChange(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,.jpg,.jpeg,.png"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
      <label
        htmlFor={inputId}
        className={`${uploadZoneBase} ${dragOver ? uploadZoneActive : uploadZoneIdle} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) onDragOverChange(true)
        }}
        onDragLeave={() => onDragOverChange(false)}
        onDrop={handleDrop}
      >
        <UploadIcon />
        <span className="text-sm font-medium text-zinc-200">{title}</span>
        <span className="mt-1 text-xs text-zinc-500">Drag &amp; drop ose kliko · {hint1}</span>
        <span className="mt-0.5 text-xs text-zinc-600">{hint2}</span>
      </label>
    </>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      {label}: {ok ? 'E personalizuar' : 'Automatike'}
    </span>
  )
}

export default function KitchenBrandingPage() {
  const token = useAuthStore((s) => s.token)
  const logoInputId = useId()
  const coverInputId = useId()
  const [branding, setBranding] = useState<KitchenBrandingState | null>(null)
  const [autoCoverUrl, setAutoCoverUrl] = useState<string>(() => imageUrlForFoodCategory(''))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [logoDragOver, setLogoDragOver] = useState(false)
  const [coverDragOver, setCoverDragOver] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setError(null)
    setSessionExpired(false)
    try {
      const [b, menu] = await Promise.all([fetchKitchenBranding(token), fetchKitchenMenu(token)])
      setBranding(b)
      if (b) {
        const cats = menu.map((c) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
          items: c.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            isAvailable: i.isAvailable,
            isFeatured: i.isFeatured,
            imageUrl: i.imageUrl ?? null,
          })),
        }))
        setAutoCoverUrl(coverImageFromMenu(cats, b.categoryName))
      }
    } catch (e: unknown) {
      if (isKitchenHttpUnauthorized(e)) {
        setSessionExpired(true)
        setBranding(null)
        return
      }
      throw e
    }
  }, [token])

  useEffect(() => {
    if (!token) return
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
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(t)
  }, [flash])

  const previewCover = useMemo(() => {
    if (branding?.coverUrl) return kitchenBrandingPublicUrl(branding.coverUrl)
    return autoCoverUrl
  }, [branding?.coverUrl, autoCoverUrl])

  const previewLogoSrc = branding?.logoUrl ? kitchenBrandingPublicUrl(branding.logoUrl) : null
  const previewLogoLines = generatedLogoLines(branding?.restaurantName ?? '')

  function pickImageOrError(file: File) {
    if (!isAcceptedImageFile(file)) {
      setError('Zgjidh një imazh PNG ose JPG.')
      return false
    }
    return true
  }

  async function onUploadLogo(file: File) {
    if (!token || !pickImageOrError(file)) return
    setBusy(true)
    setError(null)
    const r = await uploadKitchenLogo(token, file)
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setFlash('Logo u ruajt.')
    await load()
  }

  async function onUploadCover(file: File) {
    if (!token || !pickImageOrError(file)) return
    setBusy(true)
    setError(null)
    const r = await uploadKitchenCover(token, file)
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setFlash('Cover banner u ruajt.')
    await load()
  }

  async function onRemoveLogo() {
    if (!token || !branding?.hasCustomLogo) return
    setBusy(true)
    setError(null)
    const r = await deleteKitchenLogo(token)
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setFlash('Logo u hoq — përdoret teksti automatik.')
    await load()
  }

  async function onRemoveCover() {
    if (!token || !branding?.hasCustomCover) return
    setBusy(true)
    setError(null)
    const r = await deleteKitchenCover(token)
    setBusy(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setFlash('Cover u hoq — përdoret imazhi automatik.')
    await load()
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Duke ngarkuar branding…</p>
  }

  if (sessionExpired) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        Sesioni skadoi. Dil dhe hyr përsëri.
      </p>
    )
  }

  if (!branding) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Llogaria nuk është lidhur me restorant.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branding i restorantit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Menaxho logon dhe cover banner-in që shfaqen te klientët
          </p>
        </div>
        <button
          type="button"
          className={btnGold}
          disabled={busy}
          onClick={() => {
            setFlash('Branding u rifreskua.')
            void load()
          }}
        >
          Ruaj ndryshimet
        </button>
      </div>

      {flash ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold text-white">Logo e restorantit</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kjo logo shfaqet në profilin e restorantit dhe në listën e restoranteve.
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#30363d] bg-black">
              {previewLogoSrc ? (
                <img src={previewLogoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="px-2 text-center">
                  {previewLogoLines.map((line) => (
                    <p key={line} className="text-[10px] font-bold leading-tight text-[#ffc107]">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <BrandingUploadZone
                inputId={logoInputId}
                disabled={busy}
                dragOver={logoDragOver}
                onDragOverChange={setLogoDragOver}
                onFile={(f) => void onUploadLogo(f)}
                title="Ngarko logo"
                hint1="PNG ose JPG (maks. 2MB)"
                hint2="Rekomandohet: 500×500px (katror)"
              />
              <button
                type="button"
                className={`${btnGhostDanger} mt-3`}
                disabled={busy || !branding.hasCustomLogo}
                onClick={() => void onRemoveLogo()}
              >
                <span aria-hidden>🗑</span> Hiq logo
              </button>
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold text-white">Cover banner</h2>
          <p className="mt-1 text-sm text-zinc-500">Ky banner shfaqet në krye të profilit të restorantit.</p>
          <div className="mt-5 space-y-4">
            <div className="h-32 overflow-hidden rounded-xl border border-[#30363d]">
              {previewCover ? (
                <img src={previewCover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#0d1117] text-xs text-zinc-600">
                  Pa cover
                </div>
              )}
            </div>
            <BrandingUploadZone
              inputId={coverInputId}
              disabled={busy}
              dragOver={coverDragOver}
              onDragOverChange={setCoverDragOver}
              onFile={(f) => void onUploadCover(f)}
              title="Ngarko cover banner"
              hint1="PNG ose JPG (maks. 5MB)"
              hint2="Rekomandohet: 1600×600px"
            />
            <button
              type="button"
              className={btnGhostDanger}
              disabled={busy || !branding.hasCustomCover}
              onClick={() => void onRemoveCover()}
            >
              <span aria-hidden>🗑</span> Hiq banner
            </button>
          </div>
        </section>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold text-white">Si do të shfaqet te klientët</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#30363d] bg-[#0c0e14]">
          <div className="relative h-36 sm:h-44">
            {previewCover ? (
              <img src={previewCover} alt="" className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0e14]/20 to-[#0c0e14]" />
          </div>
          <div className="relative border-t border-[#30363d] px-4 pb-4 pt-0">
            <div className="-mt-10 flex items-end gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
                {previewLogoSrc ? (
                  <img src={previewLogoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="px-1 text-center">
                    {previewLogoLines.map((line) => (
                      <p key={line} className="text-[9px] font-bold leading-tight text-[#ffc107]">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <span className="mb-1 inline-block rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Hapur
                </span>
                <p className="truncate text-lg font-bold text-white">{branding.restaurantName}</p>
                <p className="text-xs text-zinc-400">{branding.categoryName}</p>
              </div>
              <div className="ml-auto hidden flex-col gap-1 pb-1 sm:flex">
                <StatusBadge ok={branding.hasCustomLogo} label="Logo" />
                <StatusBadge ok={branding.hasCustomCover} label="Cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="rounded-xl border border-[#ffc107]/20 bg-[#ffc107]/5 px-4 py-3 text-sm text-zinc-300">
        <span className="font-medium text-[#ffc107]">Shënim:</span> Nëse nuk ngarkoni logo ose banner, do të
        përdoren imazhet automatike nga menuja ose sipas kategorisë.
      </p>
    </div>
  )
}
