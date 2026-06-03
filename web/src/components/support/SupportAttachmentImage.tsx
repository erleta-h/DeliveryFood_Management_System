import { useEffect, useState } from 'react'
import { fetchSupportAttachmentBlob } from '../../lib/supportAttachments'

type Props = {
  token: string
  ticketId: number
  attachmentId: number
  fileName: string
  admin?: boolean
}

export function SupportAttachmentImage({ token, ticketId, attachmentId, fileName, admin }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    void fetchSupportAttachmentBlob(token, ticketId, attachmentId, admin).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      url = u
      setSrc(u)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [token, ticketId, attachmentId, admin])

  if (!src) {
    return <p className="text-xs text-zinc-500">Duke ngarkuar foton…</p>
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="block max-w-xs">
      <img
        src={src}
        alt={fileName}
        className="max-h-40 rounded-lg border border-[#30363d] object-cover"
      />
    </a>
  )
}

export function SupportAttachmentList({
  token,
  ticketId,
  attachments,
  admin,
}: {
  token: string
  ticketId: number
  attachments: { id: number; fileName: string }[]
  admin?: boolean
}) {
  if (attachments.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <SupportAttachmentImage
          key={a.id}
          token={token}
          ticketId={ticketId}
          attachmentId={a.id}
          fileName={a.fileName}
          admin={admin}
        />
      ))}
    </div>
  )
}
