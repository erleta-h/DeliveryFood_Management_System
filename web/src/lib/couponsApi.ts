import { fetchWithAuth } from './apiClient'

export type ValidateCouponResult = {
  couponId: number
  code: string
  discountPercent: number
  discountAmount: number
  finalTotal: number
}

export type AppliedCoupon = ValidateCouponResult

function normalizeCouponResponse(data: Record<string, unknown>): ValidateCouponResult {
  return {
    couponId: Number(data.couponId ?? data.CouponId),
    code: String(data.code ?? data.Code ?? ''),
    discountPercent: Number(data.discountPercent ?? data.DiscountPercent),
    discountAmount: Number(data.discountAmount ?? data.DiscountAmount),
    finalTotal: Number(data.finalTotal ?? data.FinalTotal),
  }
}

export async function validateCoupon(
  token: string,
  body: { code: string; subtotal: number },
): Promise<{ ok: true; coupon: AppliedCoupon } | { ok: false; message: string }> {
  const res = await fetchWithAuth('/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: body.code.trim(), subtotal: body.subtotal }),
  })

  if (res.ok) {
    const data = (await res.json()) as Record<string, unknown>
    const coupon = normalizeCouponResponse(data)
    if (!Number.isFinite(coupon.discountAmount)) {
      return { ok: false, message: 'Përgjigje e papritur nga serveri.' }
    }
    return { ok: true, coupon }
  }

  const data = (await res.json().catch(() => null)) as { message?: string } | null
  return { ok: false, message: data?.message ?? `HTTP ${res.status}` }
}
