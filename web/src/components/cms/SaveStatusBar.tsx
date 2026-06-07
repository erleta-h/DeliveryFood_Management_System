type Props = {
  saving: boolean
  saved: boolean
  error: string | null
  lastUpdatedLabel: string | null
  onSave: () => void
  dirty: boolean
}

export function SaveStatusBar({ saving, saved, error, lastUpdatedLabel, onSave, dirty }: Props) {
  return (
    <div className="space-y-3 border-t border-gray-100 pt-5">
      <button
        type="button"
        disabled={saving || !dirty}
        onClick={onSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Duke ruajtur…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            Ruaj ndryshimet
          </>
        )}
      </button>

      <div className="flex min-h-[1.25rem] flex-wrap items-center justify-between gap-2 text-xs">
        {error ? (
          <span className="font-medium text-red-600">{error}</span>
        ) : saved ? (
          <span className="font-medium text-emerald-600">Ruajtur me sukses</span>
        ) : dirty ? (
          <span className="text-amber-600">Ka ndryshime të paruajtura</span>
        ) : (
          <span className="text-gray-400">Asnjë ndryshim</span>
        )}
        {lastUpdatedLabel ? <span className="text-gray-400">{lastUpdatedLabel}</span> : null}
      </div>
    </div>
  )
}
