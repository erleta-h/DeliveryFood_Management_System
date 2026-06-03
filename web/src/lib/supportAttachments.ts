import { apiPath } from './apiBase'

const MAX_PHOTOS = 3
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export function supportAttachmentPath(ticketId: number, attachmentId: number, admin = false) {
  const base = admin
    ? `/api/admin/support/tickets/${ticketId}/attachments/${attachmentId}`
    : `/api/support/tickets/${ticketId}/attachments/${attachmentId}`
  return apiPath(base)
}

export function validateSupportPhotos(files: File[]): string | null {
  if (files.length > MAX_PHOTOS) return `Maksimum ${MAX_PHOTOS} foto.`
  for (const f of files) {
    if (!f.type.startsWith('image/')) return 'Vetëm foto (JPEG, PNG, WebP, GIF).'
    if (f.size > MAX_BYTES) return 'Çdo foto max 5 MB.'
  }
  return null
}

export async function uploadSupportAttachment(
  token: string,
  ticketId: number,
  file: File,
  messageId?: number,
): Promise<{ ok: true; attachmentId: number } | { ok: false; message: string }> {
  const form = new FormData()
  form.append('file', file)
  const q = messageId != null ? `?messageId=${messageId}` : ''
  const res = await fetch(apiPath(`/api/support/tickets/${ticketId}/attachments${q}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (res.status === 201) {
    const j = (await res.json()) as { attachmentId?: number; AttachmentId?: number }
    const id = j.attachmentId ?? j.AttachmentId
    if (id == null || !Number.isFinite(id))
      return { ok: false, message: 'Përgjigje e paplotë nga serveri.' }
    return { ok: true, attachmentId: id }
  }
  try {
    const j = (await res.json()) as { message?: string }
    return { ok: false, message: j.message ?? `Gabim ${res.status}` }
  } catch {
    return { ok: false, message: `Gabim ${res.status}` }
  }
}

export async function fetchSupportAttachmentBlob(
  token: string,
  ticketId: number,
  attachmentId: number,
  admin = false,
): Promise<string | null> {
  const res = await fetch(supportAttachmentPath(ticketId, attachmentId, admin), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export { MAX_PHOTOS, ACCEPT }
