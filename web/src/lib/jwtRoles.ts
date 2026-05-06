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

/** ClaimTypes.Role në .NET — shpesh shkurt në JWT si `role` ose URI e plotë. */
const MS_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

/** Lexon rolet nga JWT (ASP.NET: një ose shumë `ClaimTypes.Role`). */
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
        k.endsWith('/role') ||
        lower.endsWith('/claims/role')
      if (isRoleKey) appendRolesFromClaimValue(roles, v)
    }
    if (roles.length === 0 && payload[MS_ROLE_CLAIM] !== undefined) {
      appendRolesFromClaimValue(roles, payload[MS_ROLE_CLAIM])
    }
    return [...new Set(roles)]
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

export function hasSupportRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('Support')
}

/** Claim i njëjtë me `PermissionClaimTypes.Permission` në API (`fooddelivery:perm`). */
const PERMISSION_CLAIM = 'fooddelivery:perm'

/** Emra lejesh si në bazë / JWT (p.sh. `admin.support`). */
export function getPermissionsFromToken(token: string | null): string[] {
  if (!token) return []
  try {
    const json = decodeJwtPayloadJson(token)
    if (!json) return []
    const payload = JSON.parse(json) as Record<string, unknown>
    const out: string[] = []
    for (const [k, v] of Object.entries(payload)) {
      if (k !== PERMISSION_CLAIM) continue
      if (Array.isArray(v)) {
        for (const x of v) if (typeof x === 'string') out.push(x)
      } else if (typeof v === 'string') {
        out.push(v)
      }
    }
    return [...new Set(out)]
  } catch {
    return []
  }
}

export function hasPermission(token: string | null, permission: string): boolean {
  return getPermissionsFromToken(token).includes(permission)
}

/** Hyn në panelin /admin (Admin ose Support me të paktën një leje RBAC). */
export function canAccessAdminPanel(token: string | null): boolean {
  if (!token) return false
  if (hasAdminRole(token)) return true
  if (hasSupportRole(token) && getPermissionsFromToken(token).length > 0) return true
  return false
}

export function hasDriverRole(token: string | null): boolean {
  return getRolesFromToken(token).includes('Driver')
}
