import { useEffect, useMemo } from 'react'
import { ACCEPT, MAX_PHOTOS } from '../../lib/supportAttachments'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

export function SupportPhotoPicker({ files, onChange, disabled }: Props) {
  const previews = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files],
  )

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url)
    }
  }, [previews])

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const next = [...files, ...Array.from(list)].slice(0, MAX_PHOTOS)
    onChange(next)
  }

  function removeAt(i: number) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  return (
    <div className="rounded-lg border border-dashed border-[#30363d] bg-[#0d1117]/80 px-4 py-4">
      <p className="text-xs font-medium text-zinc-400">Shto foto (opsional, max {MAX_PHOTOS})</p>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-xs text-zinc-200 hover:bg-[#30363d]">
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled || files.length >= MAX_PHOTOS}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        Zgjidh foto
      </label>
      {previews.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <li key={`${p.file.name}-${i}`} className="relative">
              <img
                src={p.url}
                alt=""
                className="h-16 w-16 rounded-lg border border-[#30363d] object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(i)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white"
                aria-label="Hiq foton"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-zinc-600">JPEG, PNG, WebP ose GIF — deri në 5 MB secila.</p>
      )}
    </div>
  )
}
