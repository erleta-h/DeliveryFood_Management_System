/** Lexon mesazhin e gabimit nga përgjigja e API-së (auth, etj.). */
export async function readApiErrorMessage(res: Response): Promise<string> {
  let bodyText: string | undefined
  try {
    const j = (await res.json()) as {
      message?: string
      error?: string
      title?: string
    }
    bodyText = j.error?.trim() || j.message?.trim() || j.title?.trim()
  } catch {
    /* përgjigje jo-JSON */
  }

  if (bodyText) return bodyText

  switch (res.status) {
    case 401:
      return 'Email ose fjalëkalim i gabuar. Kontrollo të dhënat dhe provo përsëri.'
    case 403:
      return 'Llogaria është joaktive ose nuk ke leje për këtë hyrje.'
    case 409:
      return 'Ky email është tashmë i regjistruar.'
    case 503:
      return 'Shërbimi i hyrjes nuk është i disponueshëm. Rinisni API-në dhe provoni përsëri.'
    default:
      if (res.status >= 500)
        return 'Gabim në server. Provoni përsëri pas pak çastesh.'
      if (res.status >= 400)
        return `Kërkesa nuk u pranua (kodi ${res.status}).`
      return `Kërkesa dështoi (kodi ${res.status}).`
  }
}

export function networkErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch|network/i.test(err.message))
    return 'Nuk u arrit lidhja me serverin. Kontrollo që API po punon (Visual Studio → Start).'
  if (err instanceof Error && err.message.trim()) return err.message
  return 'Ndodhi një gabim i papritur. Provoni përsëri.'
}
