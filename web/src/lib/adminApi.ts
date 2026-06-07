import { apiPath } from './apiBase'

export type PartnerApplicationRow = {
  id: number
  createdAtUtc: string
  status: number
  venueName: string
  city: string
  email: string
  contactFirstName: string
  contactLastName: string
  phone?: string
  businessType?: string
  venueCountLabel?: string
  streetAddress?: string
  message?: string | null
}

export type PartnerApplicationStats = {
  total: number
  pending: number
  contacted: number
  approved: number
  rejected: number
}

export type ApprovePartnerResult = {
  staffEmail: string
  temporaryPassword: string
  restaurantId: number
  restaurantName: string
  restaurantSlug: string
}

export type ResetPartnerStaffPasswordResult = {
  staffEmail: string
  newPassword: string
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type AdminDashboardTopRestaurant = { name: string; orderCount: number }
export type AdminDashboardBusyHour = { hourUtc: number; orderCount: number }

export type AdminDashboardData = {
  pendingPartnerApplications: number
  pendingDriverApplications: number
  activeRestaurants: number
  activeDrivers: number
  totalOrders: number
  ordersToday: number
  ordersThisWeek: number
  ordersThisMonth: number
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  topRestaurantsThisMonth: AdminDashboardTopRestaurant[]
  busiestHoursToday: AdminDashboardBusyHour[]
}

export async function fetchAdminDashboard(token: string): Promise<AdminDashboardData> {
  const res = await fetch(apiPath('/api/admin/dashboard'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminDashboardData>
}

export async function fetchPartnerApplications(
  token: string,
  q?: { search?: string; sort?: string },
): Promise<PartnerApplicationRow[]> {
  const p = new URLSearchParams()
  if (q?.search?.trim()) p.set('search', q.search.trim())
  if (q?.sort?.trim()) p.set('sort', q.sort.trim())
  const qs = p.toString()
  const res = await fetch(
    apiPath(`/api/admin/partner-applications${qs ? `?${qs}` : ''}`),
    {
      headers: { ...authHeader(token) },
    },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PartnerApplicationRow[]>
}

export async function approvePartnerApplication(
  token: string,
  id: number,
  initialPassword?: string,
): Promise<{ ok: true; data: ApprovePartnerResult } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}/approve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ initialPassword: initialPassword ?? null }),
  })
  if (res.ok) {
    const data = (await res.json()) as ApprovePartnerResult
    return { ok: true, data }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function rejectPartnerApplication(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}/reject`), {
    method: 'POST',
    headers: authHeader(token),
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

export type PartnerContractDocument = {
  filename: string
  fileSize: number
  uploadedAtUtc: string
  uploadedByName: string | null
  downloadUrl: string
}

export type PartnerApplicationAuditEntry = {
  eventType: string
  detail: string | null
  createdAtUtc: string
  actorName: string | null
}

export type PartnerApplicationDetail = {
  id: number
  createdAtUtc: string
  status: number
  venueName: string
  city: string
  email: string
  contactFirstName: string
  contactLastName: string
  phone: string
  businessType: string
  venueCountLabel: string
  streetAddress: string
  message: string | null
  country: string
  postalCode: string
  hasContract: boolean
  contract: PartnerContractDocument | null
  history: PartnerApplicationAuditEntry[]
}

export function partnerContractUrl(appId: number): string {
  return apiPath(`/api/admin/partner-applications/${appId}/contract`)
}

export async function fetchPartnerApplicationDetail(
  token: string,
  id: number,
): Promise<PartnerApplicationDetail> {
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}`), {
    headers: authHeader(token),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PartnerApplicationDetail>
}

export async function markPartnerApplicationContacted(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}/contact`), {
    method: 'POST',
    headers: authHeader(token),
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

export async function uploadPartnerContract(
  token: string,
  id: number,
  file: File,
): Promise<{ ok: true; data: PartnerContractDocument } | { ok: false; message: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}/contract`), {
    method: 'POST',
    headers: authHeader(token),
    body: form,
  })
  if (res.ok) {
    const data = (await res.json()) as PartnerContractDocument
    return { ok: true, data }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export type DriverApplicationRow = {
  id: number
  createdAtUtc: string
  status: number
  firstName: string
  lastName: string
  email: string
  phone: string
  vehicleType: string
  licensePlate: string | null
}

export type DriverApplicationStats = {
  total: number
  pending: number
  approvedWaitingActivation: number
  active: number
  rejected: number
}

export type ApproveDriverResult = {
  email: string
  activationEmailSent: boolean
  activationEmailSentAtUtc: string | null
  devActivationUrl?: string | null
}

export type DriverApplicationDetail = {
  id: number
  createdAtUtc: string
  status: number
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string | null
  vehicleType: string
  licensePlate: string | null
  rejectionReason: string | null
  approvedAtUtc: string | null
  approvedByName: string | null
  activatedAtUtc: string | null
  activationEmailSentAtUtc: string | null
  canResendActivationEmail: boolean
  devActivationUrl?: string | null
  documents: { kind: string; filename: string; fileSize: number; downloadUrl: string }[]
  history: { eventType: string; detail: string | null; createdAtUtc: string; actorName: string | null }[]
}

/** Llogarit statistikat nga lista (fallback kur API nuk ka ende /stats). */
export function driverApplicationStatsFromRows(rows: DriverApplicationRow[]): DriverApplicationStats {
  const S = { pending: 0, approved: 2, active: 3, rejected: 9 } as const
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === S.pending).length,
    approvedWaitingActivation: rows.filter((r) => r.status === S.approved).length,
    active: rows.filter((r) => r.status === S.active).length,
    rejected: rows.filter((r) => r.status === S.rejected).length,
  }
}

export async function fetchDriverApplicationStats(
  token: string,
): Promise<DriverApplicationStats | null> {
  const res = await fetch(apiPath('/api/admin/driver-applications/stats'), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverApplicationStats>
}

export async function fetchDriverApplications(
  token: string,
  params?: { search?: string; status?: number; from?: string; to?: string },
): Promise<DriverApplicationRow[]> {
  const q = new URLSearchParams()
  if (params?.search?.trim()) q.set('search', params.search.trim())
  if (params?.status !== undefined) q.set('status', String(params.status))
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  const qs = q.toString()
  const res = await fetch(apiPath(`/api/admin/driver-applications${qs ? `?${qs}` : ''}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverApplicationRow[]>
}

export async function fetchDriverApplicationDetail(
  token: string,
  id: number,
): Promise<DriverApplicationDetail> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverApplicationDetail>
}

export function driverApplicationDocumentUrl(appId: number, kind: string): string {
  return apiPath(`/api/admin/driver-applications/${appId}/documents/${kind}`)
}

export async function approveDriverApplication(
  token: string,
  id: number,
): Promise<{ ok: true; data: ApproveDriverResult } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}/approve`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.ok) {
    const data = (await res.json()) as ApproveDriverResult
    return { ok: true, data }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

export async function rejectDriverApplication(
  token: string,
  id: number,
  reason: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}/reject`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ reason }),
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

export type ResendActivationResult = {
  sent: boolean
  activationEmailSentAtUtc: string | null
  devActivationUrl?: string | null
}

export async function resendDriverActivationEmail(
  token: string,
  id: number,
): Promise<{ ok: true; data: ResendActivationResult } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}/resend-activation`), {
    method: 'POST',
    headers: authHeader(token),
  })
  if (res.ok) {
    const data = (await res.json()) as ResendActivationResult
    return { ok: true, data }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

/** Vetëm për aplikime me status «miratuar». Hiq refresh-token-et e partnerit. */
export async function resetPartnerStaffPassword(
  token: string,
  id: number,
  newPassword?: string | null,
): Promise<
  { ok: true; data: ResetPartnerStaffPasswordResult } | { ok: false; message: string }
> {
  const res = await fetch(apiPath(`/api/admin/partner-applications/${id}/reset-staff-password`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ newPassword: newPassword ?? null }),
  })
  if (res.ok) {
    const data = (await res.json()) as ResetPartnerStaffPasswordResult
    return { ok: true, data }
  }
  let message = `Gabim ${res.status}`
  try {
    const j = (await res.json()) as { message?: string }
    if (j.message) message = j.message
  } catch {
    /* ignore */
  }
  return { ok: false, message }
}

// --- Porositë (admin) ---

export type AdminOrderPayment = {
  id: number
  amount: number
  currency: string
  provider: string
  status: number
}

export type AdminOrderRow = {
  id: number
  orderNumber: string
  placedAtUtc: string
  status: number
  total: number
  restaurantId: number
  restaurantName: string
  customerUserId: number
  customerEmail: string
  payments: AdminOrderPayment[]
}

export type AdminOrderListResult = {
  items: AdminOrderRow[]
  totalCount: number
  page: number
  pageSize: number
}

export type AdminOrderItem = {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type AdminOrderStatusHistoryEntry = {
  id: number
  status: number
  note: string | null
  createdAtUtc: string
}

export type AdminOrderDetail = {
  id: number
  orderNumber: string
  placedAtUtc: string
  status: number
  fulfillmentType: number
  subtotal: number
  deliveryFee: number
  discountTotal: number
  total: number
  restaurantId: number
  restaurantName: string
  customerUserId: number
  customerEmail: string
  customerPhone: string | null
  customerNotes: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  postalCode: string | null
  items: AdminOrderItem[]
  payments: AdminOrderPayment[]
  statusHistory: AdminOrderStatusHistoryEntry[]
}

export type AdminOrdersQuery = {
  fromUtc?: string
  toUtc?: string
  status?: number
  restaurantId?: number
  customerUserId?: number
  search?: string
  page?: number
  pageSize?: number
}

function ordersQueryString(q: AdminOrdersQuery): string {
  const p = new URLSearchParams()
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
  if (q.status !== undefined && q.status !== null && !Number.isNaN(q.status))
    p.set('status', String(q.status))
  if (q.restaurantId != null && q.restaurantId > 0) p.set('restaurantId', String(q.restaurantId))
  if (q.customerUserId != null && q.customerUserId > 0)
    p.set('customerUserId', String(q.customerUserId))
  if (q.search?.trim()) p.set('search', q.search.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  return `?${p.toString()}`
}

export async function fetchAdminOrders(
  token: string,
  query: AdminOrdersQuery,
): Promise<AdminOrderListResult> {
  const res = await fetch(apiPath(`/api/admin/orders${ordersQueryString(query)}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminOrderListResult>
}

export async function fetchAdminOrderDetail(
  token: string,
  orderId: number,
): Promise<AdminOrderDetail> {
  const res = await fetch(apiPath(`/api/admin/orders/${orderId}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) throw new Error('Porosia nuk u gjet.')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminOrderDetail>
}

async function readApiMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string }
    if (typeof j.message === 'string' && j.message) return j.message
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`
}

/** Shkarkim me Bearer (eksporte admin — mos vendos token në URL publike). */
export async function authenticatedDownloadFile(
  token: string,
  url: string,
  fallbackFileName: string,
): Promise<void> {
  const res = await fetch(url, { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition')
  let name = fallbackFileName
  const m = /filename\*?=(?:UTF-8'')?["']?([^";\n]+)/i.exec(cd ?? '')
  if (m?.[1]) name = decodeURIComponent(m[1].replace(/['"]/g, ''))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function adminUpdateOrderStatus(
  token: string,
  orderId: number,
  status: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/orders/${orderId}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status }),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminCancelOrder(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/orders/${orderId}/cancel`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminRefundOrder(
  token: string,
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/orders/${orderId}/refund`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Restorantet ---

export type AdminRestaurantRow = {
  id: number
  name: string
  city: string | null
  slug: string | null
  isActive: boolean
  isApproved: boolean
  deliveryZoneId: number | null
  deliveryZoneName: string | null
  effectiveDeliveryFee: number
  effectiveMinOrderAmount: number
  effectiveEstimatedDeliveryMinutes: number
  hasDeliveryOverride: boolean
  overrideDeliveryFee: number | null
  overrideMinOrderAmount: number | null
  overrideEstimatedDeliveryMinutes: number | null
  orderCount: number
}

export type AdminRestaurantListResult = {
  items: AdminRestaurantRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminRestaurants(
  token: string,
  q: { search?: string; sort?: string; page?: number; pageSize?: number },
): Promise<AdminRestaurantListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  const res = await fetch(apiPath(`/api/admin/restaurants?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminRestaurantListResult>
}

export async function adminPatchRestaurant(
  token: string,
  id: number,
  body: {
    isActive?: boolean | null
    isApproved?: boolean | null
    deliveryZoneId?: number | null
    overrideDeliveryFee?: number | null
    overrideMinOrderAmount?: number | null
    overrideEstimatedDeliveryMinutes?: number | null
    clearDeliveryOverrides?: boolean | null
    deliveryFee?: number | null
    minOrderAmount?: number | null
    estimatedDeliveryMinutes?: number | null
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/restaurants/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Klientët ---

export type AdminCustomerRow = {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  isActive: boolean
  addressCount: number
  orderCount: number
  createdAtUtc: string
  lastOrderAtUtc: string | null
  lastOrderRestaurantName: string | null
}

export type AdminCustomerListResult = {
  items: AdminCustomerRow[]
  total: number
  page: number
  pageSize: number
}

export type AdminCustomerStats = {
  total: number
  active: number
  blocked: number
  totalAddresses: number
  newThisWeek: number
  newAddressesThisWeek: number
}

export type AdminCustomersQuery = {
  search?: string
  status?: 'all' | 'active' | 'blocked'
  sort?: string
  registeredFrom?: string
  registeredTo?: string
  page?: number
  pageSize?: number
}

export async function fetchAdminCustomerStats(token: string): Promise<AdminCustomerStats> {
  const res = await fetch(apiPath('/api/admin/customers/stats'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCustomerStats>
}

export async function fetchAdminCustomers(
  token: string,
  q: AdminCustomersQuery,
): Promise<AdminCustomerListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.status && q.status !== 'all') p.set('status', q.status)
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  if (q.registeredFrom) p.set('registeredFromUtc', `${q.registeredFrom}T00:00:00.000Z`)
  if (q.registeredTo) p.set('registeredToUtc', `${q.registeredTo}T23:59:59.999Z`)
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 10))
  const res = await fetch(apiPath(`/api/admin/customers?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCustomerListResult>
}

export async function adminSetCustomerActive(
  token: string,
  id: number,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/customers/${id}/active`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ isActive }),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Kupona ---

export type AdminCouponStats = {
  activeCount: number
  totalUses: number
  expiringSoonCount: number
  totalDiscountGiven: number
}

export type AdminCouponRow = {
  id: number
  code: string
  discountPercent: number
  maxDiscountAmount: number | null
  minOrderAmount: number | null
  maxUses: number | null
  usesCount: number
  isActive: boolean
  validFrom: string | null
  validTo: string | null
  createdAt: string
}

export type AdminCouponDetail = AdminCouponRow & {
  createdByName: string | null
  totalDiscountGiven: number
}

export type AdminCouponListResult = {
  items: AdminCouponRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminCouponStats(token: string): Promise<AdminCouponStats> {
  const res = await fetch(apiPath('/api/admin/coupons/stats'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCouponStats>
}

export async function fetchAdminCouponDetail(token: string, id: number): Promise<AdminCouponDetail> {
  const res = await fetch(apiPath(`/api/admin/coupons/${id}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCouponDetail>
}

export type AdminCouponUseRow = {
  orderId: number
  orderNumber: string
  placedAtUtc: string
  discountAmount: number
  orderTotal: number
  customerEmail: string
}

export type AdminCouponUsesResult = {
  items: AdminCouponUseRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminCouponUses(
  token: string,
  id: number,
  page = 1,
  pageSize = 20,
): Promise<AdminCouponUsesResult> {
  const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const res = await fetch(apiPath(`/api/admin/coupons/${id}/uses?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCouponUsesResult>
}

export type AdminCouponHistoryRow = {
  eventType: string
  detail: string | null
  createdAtUtc: string
  actorName: string | null
}

export type AdminCouponHistoryResult = {
  items: AdminCouponHistoryRow[]
}

export async function fetchAdminCouponHistory(
  token: string,
  id: number,
): Promise<AdminCouponHistoryResult> {
  const res = await fetch(apiPath(`/api/admin/coupons/${id}/history`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCouponHistoryResult>
}

export async function fetchAdminCoupons(
  token: string,
  q: {
    search?: string
    sort?: string
    status?: string
    page?: number
    pageSize?: number
  },
): Promise<AdminCouponListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  if (q.status?.trim()) p.set('status', q.status.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  const res = await fetch(apiPath(`/api/admin/coupons?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCouponListResult>
}

export async function adminCreateCoupon(
  token: string,
  body: {
    code: string
    discountPercent: number
    maxDiscountAmount?: number | null
    minOrderAmount?: number | null
    maxUses?: number | null
    validFrom?: string | null
    validTo?: string | null
    isActive?: boolean
  },
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/admin/coupons'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 201) {
    const j = (await res.json()) as { id: number }
    return { ok: true, id: j.id }
  }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminUpdateCoupon(
  token: string,
  id: number,
  body: {
    discountPercent: number
    maxDiscountAmount?: number | null
    minOrderAmount?: number | null
    maxUses?: number | null
    validFrom?: string | null
    validTo?: string | null
    isActive: boolean
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/coupons/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminSetCouponActive(
  token: string,
  id: number,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/coupons/${id}/active`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ isActive }),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Vlerësime ---

export type AdminReviewRow = {
  id: number
  orderId: number
  orderNumber: string
  rating: number
  subject: number
  comment: string | null
  createdAt: string
  authorEmail: string
  restaurantName: string | null
}

export type AdminReviewListResult = {
  items: AdminReviewRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminReviews(
  token: string,
  q: { page?: number; pageSize?: number },
): Promise<AdminReviewListResult> {
  const p = new URLSearchParams()
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  const res = await fetch(apiPath(`/api/admin/reviews?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminReviewListResult>
}

export async function adminDeleteReview(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/reviews/${id}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Financa (pagesa) ---

export type AdminPaymentRow = {
  id: number
  orderId: number
  orderNumber: string
  restaurantName: string | null
  customerEmail: string | null
  customerName: string | null
  amount: number
  currency: string
  status: number
  provider: string
  createdAt: string
}

export type AdminPaymentListResult = {
  items: AdminPaymentRow[]
  total: number
  page: number
  pageSize: number
  sumCapturedAmount: number
  sumPendingAmount: number
  sumRefundedAmount: number
  pendingCount: number
  refundedCount: number
}

export async function fetchAdminPayments(
  token: string,
  q: {
    fromUtc?: string
    toUtc?: string
    status?: number
    provider?: string
    page?: number
    pageSize?: number
  },
): Promise<AdminPaymentListResult> {
  const p = new URLSearchParams()
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
  if (q.status !== undefined && q.status !== null) p.set('status', String(q.status))
  if (q.provider?.trim()) p.set('provider', q.provider.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 25))
  const res = await fetch(apiPath(`/api/admin/finance/payments?${p}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminPaymentListResult>
}

export type AdminCommissionSummary = {
  totalPlatformFee: number
  orderCount: number
  currentPercentOfSubtotal: number
}

export async function fetchAdminCommissionSummary(
  token: string,
  q: { fromUtc?: string; toUtc?: string },
): Promise<AdminCommissionSummary> {
  const p = new URLSearchParams()
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
  const res = await fetch(apiPath(`/api/admin/finance/commissions?${p}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCommissionSummary>
}

export type AdminSupportTicketRow = {
  id: number
  userId: number
  userEmail: string
  subject: string
  body: string
  status: number
  category: number
  priority: number
  createdAtUtc: string
  updatedAtUtc: string | null
  resolvedAtUtc: string | null
  adminNote: string | null
  orderId: number | null
  orderNumber: string | null
  restaurantId: number | null
  restaurantName: string | null
  driverId: number | null
  driverName: string | null
  assignedToUserId: number | null
  assignedToEmail: string | null
  messageCount: number
}

export type AdminSupportTicketListResult = {
  items: AdminSupportTicketRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminSupportTickets(
  token: string,
  q: {
    search?: string; sort?: string; page?: number; pageSize?: number
    status?: number | null; category?: number | null; priority?: number | null; assignedTo?: number | null
  },
): Promise<AdminSupportTicketListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 25))
  if (q.status != null) p.set('status', String(q.status))
  if (q.category != null) p.set('category', String(q.category))
  if (q.priority != null) p.set('priority', String(q.priority))
  if (q.assignedTo != null) p.set('assignedTo', String(q.assignedTo))
  const res = await fetch(apiPath(`/api/admin/support/tickets?${p}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminSupportTicketListResult>
}

export async function patchAdminSupportTicket(
  token: string,
  id: number,
  body: { status: number; adminNote?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
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

export type AdminSupportAttachmentRow = {
  id: number
  messageId: number | null
  fileName: string
  createdAtUtc: string
}

export type AdminSupportTicketMessageRow = {
  id: number
  authorUserId: number
  authorEmail: string
  isStaffReply: boolean
  body: string
  createdAtUtc: string
  attachments: AdminSupportAttachmentRow[]
}

export type AdminSupportTicketThread = {
  id: number
  userId: number
  userEmail: string
  subject: string
  initialBody: string
  status: number
  category: number
  priority: number
  createdAtUtc: string
  updatedAtUtc: string | null
  resolvedAtUtc: string | null
  adminNote: string | null
  orderId: number | null
  orderNumber: string | null
  restaurantId: number | null
  restaurantName: string | null
  driverId: number | null
  driverName: string | null
  assignedToUserId: number | null
  assignedToEmail: string | null
  initialAttachments: AdminSupportAttachmentRow[]
  messages: AdminSupportTicketMessageRow[]
}

function normalizeAdminThread(
  raw: AdminSupportTicketThread & {
    InitialAttachments?: AdminSupportAttachmentRow[]
    Messages?: AdminSupportTicketMessageRow[]
  },
): AdminSupportTicketThread {
  const initial = (raw.initialAttachments ?? raw.InitialAttachments ?? []).map(normalizeAdminAttachment)
  const messages = (raw.messages ?? raw.Messages ?? []).map((m) => ({
    ...m,
    attachments: (m.attachments ?? (m as { Attachments?: AdminSupportAttachmentRow[] }).Attachments ?? []).map(
      normalizeAdminAttachment,
    ),
  }))
  return { ...raw, initialAttachments: initial, messages }
}

function normalizeAdminAttachment(
  a: AdminSupportAttachmentRow & { FileName?: string; MessageId?: number | null },
): AdminSupportAttachmentRow {
  return {
    id: a.id,
    messageId: a.messageId ?? a.MessageId ?? null,
    fileName: a.fileName ?? a.FileName ?? 'foto',
    createdAtUtc: a.createdAtUtc,
  }
}

export async function fetchAdminSupportTicketThread(
  token: string,
  id: number,
): Promise<AdminSupportTicketThread | null> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${id}`), {
    headers: { ...authHeader(token) },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as AdminSupportTicketThread
  return normalizeAdminThread(raw)
}

export async function postAdminSupportTicketMessage(
  token: string,
  id: number,
  body: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${id}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ body }),
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

export async function adminAssignTicket(
  token: string,
  ticketId: number,
  agentUserId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/assign`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ agentUserId }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try { const j = (await res.json()) as { message?: string }; if (j.message) message = j.message } catch { /* */ }
  return { ok: false, message }
}

export async function adminChangeTicketStatus(
  token: string,
  ticketId: number,
  status: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try { const j = (await res.json()) as { message?: string }; if (j.message) message = j.message } catch { /* */ }
  return { ok: false, message }
}

export async function adminChangeTicketPriority(
  token: string,
  ticketId: number,
  priority: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/priority`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ priority }),
  })
  if (res.status === 204) return { ok: true }
  let message = `Gabim ${res.status}`
  try { const j = (await res.json()) as { message?: string }; if (j.message) message = j.message } catch { /* */ }
  return { ok: false, message }
}

export type AdminTicketAuditRow = {
  id: number
  actorUserId: number
  actorEmail: string
  action: string
  createdAtUtc: string
}

export async function fetchAdminTicketAudit(
  token: string,
  ticketId: number,
): Promise<AdminTicketAuditRow[]> {
  const res = await fetch(apiPath(`/api/admin/support/tickets/${ticketId}/audit`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminTicketAuditRow[]>
}

export type SupportAgentRow = {
  id: number
  email: string
  displayName: string
}

export async function fetchAdminSupportAgents(token: string): Promise<SupportAgentRow[]> {
  const res = await fetch(apiPath('/api/admin/support/agents'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<SupportAgentRow[]>
}

// --- Delivera ---

export type AdminDriverRow = {
  userId: number
  email: string
  firstName: string
  lastName: string
  userIsActive: boolean
  vehicleType: string
  licensePlate: string | null
  isOnline: boolean
  lastLatitude: number | null
  lastLongitude: number | null
  lastLocationAtUtc: string | null
  createdAt: string
}

export type AdminDriverListResult = {
  items: AdminDriverRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminDrivers(
  token: string,
  q: { page?: number; pageSize?: number; search?: string; status?: string },
): Promise<AdminDriverListResult> {
  const p = new URLSearchParams()
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.status?.trim()) p.set('status', q.status.trim())
  const res = await fetch(apiPath(`/api/admin/drivers?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminDriverListResult>
}

export async function adminPatchDriver(
  token: string,
  userId: number,
  body: { userIsActive?: boolean | null; isOnline?: boolean | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/drivers/${userId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Cilësime ---

export type AdminSettingRow = {
  id: number
  key: string
  value: string | null
  description: string | null
  createdAt: string
  updatedAt: string | null
}

export async function fetchAdminSettings(token: string): Promise<AdminSettingRow[]> {
  const res = await fetch(apiPath('/api/admin/settings'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminSettingRow[]>
}

export async function adminUpsertSetting(
  token: string,
  body: { key: string; value?: string | null; description?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/admin/settings'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Audit ---

export type AdminAuditRow = {
  id: number
  createdAt: string
  userId: number | null
  userEmail: string | null
  action: string
  entity: string
  entityId: string | null
  ipAddress: string | null
}

export type AdminAuditListResult = {
  items: AdminAuditRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminAudit(
  token: string,
  q: { page?: number; pageSize?: number },
): Promise<AdminAuditListResult> {
  const p = new URLSearchParams()
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 40))
  const res = await fetch(apiPath(`/api/admin/audit?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminAuditListResult>
}

// --- Zonat e dërgesës ---

export type AdminCityZone = {
  city: string
  restaurantCount: number
  activeApprovedCount: number
}

export type DeliveryZoneRow = {
  id: number
  name: string
  city: string
  deliveryFee: number
  minOrderAmount: number
  estimatedDeliveryMinutes: number
  isActive: boolean
  restaurantCount: number
  sortOrder: number
}

export type DeliveryZoneListResult = {
  items: DeliveryZoneRow[]
  total: number
  page: number
  pageSize: number
}

export type DeliveryZoneStats = {
  activeZoneCount: number
  restaurantsCovered: number
  averageDeliveryFee: number
  averageEstimatedMinutes: number
  pendingApplicationsCount: number
}

export type DeliveryZoneRestaurantSummary = {
  id: number
  name: string
  isActive: boolean
  isApproved: boolean
}

export type DeliveryZoneDetail = {
  id: number
  name: string
  city: string
  deliveryFee: number
  minOrderAmount: number
  estimatedDeliveryMinutes: number
  description: string | null
  isActive: boolean
  sortOrder: number
  restaurantCount: number
  restaurants: DeliveryZoneRestaurantSummary[]
}

export type DeliveryZoneOption = {
  id: number
  name: string
  city: string
  isActive: boolean
}

export async function fetchDeliveryZoneStats(token: string): Promise<DeliveryZoneStats> {
  const res = await fetch(apiPath('/api/admin/zones/stats'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DeliveryZoneStats>
}

export async function fetchDeliveryZones(
  token: string,
  q: { page?: number; pageSize?: number; search?: string; status?: string; sort?: string },
): Promise<DeliveryZoneListResult> {
  const p = new URLSearchParams()
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.status?.trim()) p.set('status', q.status.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  const res = await fetch(apiPath(`/api/admin/zones?${p}`), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DeliveryZoneListResult>
}

export async function fetchDeliveryZoneOptions(token: string): Promise<DeliveryZoneOption[]> {
  const res = await fetch(apiPath('/api/admin/zones/options'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DeliveryZoneOption[]>
}

export async function fetchDeliveryZoneDetail(token: string, id: number): Promise<DeliveryZoneDetail> {
  const res = await fetch(apiPath(`/api/admin/zones/${id}`), { headers: { ...authHeader(token) } })
  if (res.status === 404) throw new Error('Zona nuk u gjet.')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DeliveryZoneDetail>
}

export async function createDeliveryZone(
  token: string,
  body: {
    name: string
    city: string
    deliveryFee: number
    minOrderAmount: number
    estimatedDeliveryMinutes: number
    description?: string | null
    isActive: boolean
    sortOrder?: number | null
  },
): Promise<{ ok: true; data: DeliveryZoneDetail } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/admin/zones'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { ok: false, message: await readApiMessage(res) }
  return { ok: true, data: (await res.json()) as DeliveryZoneDetail }
}

export async function updateDeliveryZone(
  token: string,
  id: number,
  body: {
    name?: string
    city?: string
    deliveryFee?: number
    minOrderAmount?: number
    estimatedDeliveryMinutes?: number
    description?: string | null
    isActive?: boolean
    sortOrder?: number
  },
): Promise<{ ok: true; data: DeliveryZoneDetail } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/zones/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { ok: false, message: await readApiMessage(res) }
  return { ok: true, data: (await res.json()) as DeliveryZoneDetail }
}

export async function deleteDeliveryZone(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/zones/${id}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function fetchAdminCityZones(token: string): Promise<AdminCityZone[]> {
  const res = await fetch(apiPath('/api/admin/zones/cities'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCityZone[]>
}

// --- Raport operacionesh (dinamik + eksport) ---

export type OperationsReport = {
  fromUtc: string | null
  toUtc: string | null
  orderCount: number
  orderTotalSum: number
  activeRestaurantCount: number
  customerRoleUserCount: number
  openSupportTickets: number
  couponCountActive: number
}

export async function fetchOperationsReport(
  token: string,
  q: { fromUtc?: string; toUtc?: string },
): Promise<OperationsReport> {
  const p = new URLSearchParams()
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
  const res = await fetch(apiPath(`/api/admin/reports/operations?${p}`), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<OperationsReport>
}

export function operationsReportExportUrl(
  format: 'csv' | 'json' | 'xlsx',
  q: { fromUtc?: string; toUtc?: string },
): string {
  const p = new URLSearchParams()
  p.set('format', format)
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
  return apiPath(`/api/admin/reports/operations/export?${p}`)
}

export function adminDataExportUrl(resource: string, format: 'csv' | 'json' | 'xlsx'): string {
  const p = new URLSearchParams()
  p.set('format', format)
  return apiPath(`/api/admin/data-port/export/${encodeURIComponent(resource)}?${p}`)
}

// --- CMS (faqja kryesore) ---

export type AdminCmsEntry = {
  key: string
  value: string | null
  description: string | null
  updatedAt: string | null
}

export async function fetchAdminCms(token: string): Promise<AdminCmsEntry[]> {
  const res = await fetch(apiPath('/api/admin/cms'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminCmsEntry[]>
}

export async function adminCmsUpsert(
  token: string,
  body: { key: string; value?: string | null; description?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/admin/cms'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminDataImport(
  token: string,
  resource: string,
  format: string,
  bodyText: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const p = new URLSearchParams()
  p.set('format', format)
  const res = await fetch(apiPath(`/api/admin/data-port/import/${encodeURIComponent(resource)}?${p}`), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...authHeader(token) },
    body: bodyText,
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

// --- Kategoritë e ushqimit (FoodCategory) ---

export type AdminFoodCategoryRow = {
  id: number
  name: string
  sortOrder: number
  description: string | null
  restaurantCount: number
  createdAt: string
  updatedAt: string | null
}

export async function fetchAdminFoodCategories(token: string): Promise<AdminFoodCategoryRow[]> {
  const res = await fetch(apiPath('/api/admin/food-categories'), { headers: { ...authHeader(token) } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<AdminFoodCategoryRow[]>
}

export async function adminCreateFoodCategory(
  token: string,
  body: { name: string; sortOrder?: number | null; description?: string | null },
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const res = await fetch(apiPath('/api/admin/food-categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 201) {
    const j = (await res.json()) as { id: number }
    return { ok: true, id: j.id }
  }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminUpdateFoodCategory(
  token: string,
  id: number,
  body: { name?: string | null; sortOrder?: number | null; description?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/food-categories/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

export async function adminDeleteFoodCategory(
  token: string,
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/food-categories/${id}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  if (res.status === 204) return { ok: true }
  return { ok: false, message: await readApiMessage(res) }
}

