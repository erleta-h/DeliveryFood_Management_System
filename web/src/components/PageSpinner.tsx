export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#171820] text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400"
          aria-hidden
        />
        <p className="text-sm">Duke ngarkuar…</p>
      </div>
    </div>
  )
}
