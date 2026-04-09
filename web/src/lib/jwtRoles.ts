/** Base64URL → Base64 me padding; `atob` shpesh dështon pa '='. */
function decodeJwtPayloadJson(token: string): string | null {
  const part = token.split('.')[1]
  if (!part) return null
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (base64.length % 4)) % 4
  const padded = pad ? base64 + '='.repeat(pad) : base64
  try {
    return atob(padded)
  } catch {
    return null
  }
}

function appendRolesFromClaimValue(roles: string[], v: unknown) {
  if (Array.isArray(v)) {
    for (const x of v) if (typeof x === 'string') roles.push(x)
  } else if (typeof v === 'string') roles.push(v)
}

/** Lexon rolet nga JWT (ASP.NET: ClaimTypes.Role → zakonisht `role` ose URI që përfundon në `/role`). */
export function getRolesFromToken(token: string | null): string[] {
  if (!token) return []
  try {
    const json = decodeJwtPayloadJson(token)
    if (!json) return []
    const payload = JSON.parse(json) as Record<string, unknown>
    const roles: string[] = []
    for (const [k, v] of Object.entries(payload)) {
      const lower = k.toLowerCase()
      const isRoleKey =
        lower === 'role' ||
        lower === 'roles' ||
        k.endsWith('/role')
      if (isRoleKey) appendRolesFromClaimValue(roles, v)
    }
    return roles
  } catch {
    return []
  }
}

export function hasCustomerRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('Customer')
}

export function hasRestaurantStaffRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('RestaurantStaff')
}

export function hasAdminRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('Admin')
}

export function hasDriverRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('Driver')
}
