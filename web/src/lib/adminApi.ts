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

export type ApproveDriverResult = {
  email: string
  temporaryPassword: string
}

export async function fetchDriverApplications(token: string): Promise<DriverApplicationRow[]> {
  const res = await fetch(apiPath('/api/admin/driver-applications'), {
    headers: { ...authHeader(token) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DriverApplicationRow[]>
}

export async function approveDriverApplication(
  token: string,
  id: number,
  initialPassword?: string | null,
): Promise<{ ok: true; data: ApproveDriverResult } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}/approve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ initialPassword: initialPassword ?? null }),
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
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiPath(`/api/admin/driver-applications/${id}/reject`), {
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
  deliveryFee: number
  minOrderAmount: number
  estimatedDeliveryMinutes: number
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
}

export type AdminCustomerListResult = {
  items: AdminCustomerRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminCustomers(
  token: string,
  q: { search?: string; sort?: string; page?: number; pageSize?: number },
): Promise<AdminCustomerListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
  p.set('page', String(q.page ?? 1))
  p.set('pageSize', String(q.pageSize ?? 20))
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

export type AdminCouponRow = {
  id: number
  code: string
  discountPercent: number
  maxDiscountAmount: number | null
  maxUses: number | null
  usesCount: number
  isActive: boolean
  validFrom: string | null
  validTo: string | null
  createdAt: string
}

export type AdminCouponListResult = {
  items: AdminCouponRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminCoupons(
  token: string,
  q: { search?: string; sort?: string; page?: number; pageSize?: number },
): Promise<AdminCouponListResult> {
  const p = new URLSearchParams()
  if (q.search?.trim()) p.set('search', q.search.trim())
  if (q.sort?.trim()) p.set('sort', q.sort.trim())
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
    maxUses?: number | null
    validFrom?: string | null
    validTo?: string | null
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
  orderNumber: string
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
}

export async function fetchAdminPayments(
  token: string,
  q: { fromUtc?: string; toUtc?: string; page?: number; pageSize?: number },
): Promise<AdminPaymentListResult> {
  const p = new URLSearchParams()
  if (q.fromUtc) p.set('fromUtc', q.fromUtc)
  if (q.toUtc) p.set('toUtc', q.toUtc)
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

export type AdminSupportTicketMessageRow = {
  id: number
  authorUserId: number
  authorEmail: string
  isStaffReply: boolean
  body: string
  createdAtUtc: string
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
  messages: AdminSupportTicketMessageRow[]
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
  return res.json() as Promise<AdminSupportTicketThread>
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

// --- Zona (qytete) ---

export type AdminCityZone = {
  city: string
  restaurantCount: number
  activeApprovedCount: number
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

export type AdminCmsEntry = { key: string; value: string | null; description: string | null }

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

