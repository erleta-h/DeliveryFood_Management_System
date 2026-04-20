import { apiPath } from './apiBase'

export type PartnerApplicationPayload = {
  country: string
  businessType: string
  venueCountLabel: string
  venueName: string
  streetAddress: string
  postalCode: string
  city: string
  contactFirstName: string
  contactLastName: string
  phone: string
  email: string
  message?: string
}

export async function submitPartnerApplication(
  body: PartnerApplicationPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/partner/applications'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      country: body.country,
      businessType: body.businessType,
      venueCountLabel: body.venueCountLabel,
      venueName: body.venueName,
      streetAddress: body.streetAddress,
      postalCode: body.postalCode,
      city: body.city,
      contactFirstName: body.contactFirstName,
      contactLastName: body.contactLastName,
      phone: body.phone,
      email: body.email,
      message: body.message?.trim() || undefined,
    }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}
