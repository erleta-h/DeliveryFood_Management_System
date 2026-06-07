import { useEffect, useMemo, useState } from 'react'
import {
  ORDER_REVIEW_SUBJECT_DRIVER,
  ORDER_REVIEW_SUBJECT_RESTAURANT,
  submitOrderReview,
  type CustomerOrderReviewSlot,
} from '../lib/ordersApi'

type Props = {
  orderId: number
  token: string
  slots: CustomerOrderReviewSlot[]
  onSubmitted: () => void
}

function dismissStorageKey(orderId: number) {
  return `fd-review-dismiss-${orderId}`
}

function InteractiveStars({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex flex-wrap items-center gap-0.5" role="group" aria-label="Zgjidh yjet">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-110 disabled:cursor-default disabled:opacity-60"
          aria-label={`${n} yje`}
        >
          <span className={`text-3xl leading-none ${n <= active ? 'text-amber-400' : 'text-zinc-600'}`}>★</span>
        </button>
      ))}
    </div>
  )
}

function SubmittedStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} nga 5 yje`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-lg leading-none ${n <= rating ? 'text-amber-400' : 'text-zinc-600'}`}>
          ★
        </span>
      ))}
    </div>
  )
}

type ReviewFormProps = {
  restaurantSlot: CustomerOrderReviewSlot | undefined
  driverSlot: CustomerOrderReviewSlot | undefined
  pendingRestaurant: boolean
  pendingDriver: boolean
  restaurantRating: number
  restaurantComment: string
  driverRating: number
  driverComment: string
  onRestaurantRating: (n: number) => void
  onRestaurantComment: (v: string) => void
  onDriverRating: (n: number) => void
  onDriverComment: (v: string) => void
  busy: boolean
  error: string | null
  onSubmit: () => void
  onLater: () => void
  compact?: boolean
}

function ReviewFormBody({
  restaurantSlot,
  driverSlot,
  pendingRestaurant,
  pendingDriver,
  restaurantRating,
  restaurantComment,
  driverRating,
  driverComment,
  onRestaurantRating,
  onRestaurantComment,
  onDriverRating,
  onDriverComment,
  busy,
  error,
  onSubmit,
  onLater,
  compact,
}: ReviewFormProps) {
  return (
    <>
      <div className={compact ? 'space-y-4' : 'space-y-5'}>
        {restaurantSlot && (pendingRestaurant || restaurantSlot.isSubmitted) ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              <span className="mr-1.5" aria-hidden>
                🍽️
              </span>
              {restaurantSlot.title}
            </p>
            {pendingRestaurant ? (
              <>
                <InteractiveStars value={restaurantRating} onChange={onRestaurantRating} disabled={busy} />
                <textarea
                  value={restaurantComment}
                  onChange={(e) => onRestaurantComment(e.target.value)}
                  disabled={busy}
                  rows={2}
                  maxLength={2000}
                  placeholder="Koment (opsional)"
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0f1419] px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15 disabled:opacity-50"
                />
              </>
            ) : restaurantSlot.rating != null ? (
              <div className="flex flex-wrap items-center gap-2">
                <SubmittedStars rating={restaurantSlot.rating} />
                <span className="text-xs text-emerald-400">U dërgua ✓</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {driverSlot && (pendingDriver || driverSlot.isSubmitted) ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              <span className="mr-1.5" aria-hidden>
                🚗
              </span>
              {driverSlot.title}
            </p>
            {pendingDriver ? (
              <>
                <InteractiveStars value={driverRating} onChange={onDriverRating} disabled={busy} />
                <textarea
                  value={driverComment}
                  onChange={(e) => onDriverComment(e.target.value)}
                  disabled={busy}
                  rows={2}
                  maxLength={2000}
                  placeholder="Koment (opsional)"
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0f1419] px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15 disabled:opacity-50"
                />
              </>
            ) : driverSlot.rating != null ? (
              <div className="flex flex-wrap items-center gap-2">
                <SubmittedStars rating={driverSlot.rating} />
                <span className="text-xs text-emerald-400">U dërgua ✓</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      {(pendingRestaurant || pendingDriver) ? (
        <div className={`flex flex-col gap-2 sm:flex-row ${compact ? 'mt-4' : 'mt-6'}`}>
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/10 transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Duke dërguar…' : 'Dërgo vlerësimet'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onLater}
            className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40"
          >
            Më vonë
          </button>
        </div>
      ) : null}
    </>
  )
}

export function OrderReviewPanel({ orderId, token, slots, onSubmitted }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissStorageKey(orderId)) === '1',
  )

  const [restaurantRating, setRestaurantRating] = useState(0)
  const [restaurantComment, setRestaurantComment] = useState('')
  const [driverRating, setDriverRating] = useState(0)
  const [driverComment, setDriverComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const restaurantSlot = useMemo(
    () => slots.find((s) => s.subject === ORDER_REVIEW_SUBJECT_RESTAURANT),
    [slots],
  )
  const driverSlot = useMemo(
    () => slots.find((s) => s.subject === ORDER_REVIEW_SUBJECT_DRIVER),
    [slots],
  )

  const pendingRestaurant = restaurantSlot?.canSubmit ?? false
  const pendingDriver = driverSlot?.canSubmit ?? false
  const hasPending = pendingRestaurant || pendingDriver

  const submittedSlots = useMemo(
    () => slots.filter((s) => s.isSubmitted && s.rating != null),
    [slots],
  )

  const allDone = useMemo(() => {
    const relevant = slots.filter((s) => s.canSubmit || s.isSubmitted)
    return relevant.length > 0 && relevant.every((s) => s.isSubmitted)
  }, [slots])

  useEffect(() => {
    if (hasPending && !dismissed) setModalOpen(true)
  }, [hasPending, dismissed, orderId])

  useEffect(() => {
    setDismissed(sessionStorage.getItem(dismissStorageKey(orderId)) === '1')
  }, [orderId])

  if (slots.length === 0) return null

  function handleLater() {
    sessionStorage.setItem(dismissStorageKey(orderId), '1')
    setDismissed(true)
    setModalOpen(false)
    setError(null)
  }

  function handleOpenModal() {
    setModalOpen(true)
    setError(null)
  }

  async function handleSubmit() {
    const payloads: { subject: number; rating: number; comment: string }[] = []

    if (pendingRestaurant && restaurantRating >= 1) {
      payloads.push({
        subject: ORDER_REVIEW_SUBJECT_RESTAURANT,
        rating: restaurantRating,
        comment: restaurantComment,
      })
    }
    if (pendingDriver && driverRating >= 1) {
      payloads.push({
        subject: ORDER_REVIEW_SUBJECT_DRIVER,
        rating: driverRating,
        comment: driverComment,
      })
    }

    if (payloads.length === 0) {
      handleLater()
      return
    }

    setBusy(true)
    setError(null)

    for (const item of payloads) {
      const result = await submitOrderReview(token, orderId, {
        subject: item.subject,
        rating: item.rating,
        comment: item.comment.trim() || null,
      })
      if (!result.ok) {
        setBusy(false)
        setError(result.message)
        return
      }
    }

    setBusy(false)
    sessionStorage.removeItem(dismissStorageKey(orderId))
    setDismissed(false)
    setModalOpen(false)
    setRestaurantRating(0)
    setRestaurantComment('')
    setDriverRating(0)
    setDriverComment('')
    onSubmitted()
  }

  const formProps: ReviewFormProps = {
    restaurantSlot,
    driverSlot,
    pendingRestaurant,
    pendingDriver,
    restaurantRating,
    restaurantComment,
    driverRating,
    driverComment,
    onRestaurantRating: setRestaurantRating,
    onRestaurantComment: setRestaurantComment,
    onDriverRating: setDriverRating,
    onDriverComment: setDriverComment,
    busy,
    error,
    onSubmit: () => void handleSubmit(),
    onLater: handleLater,
  }

  return (
    <>
      {modalOpen && hasPending ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-review-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Mbyll"
            onClick={handleLater}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#141b26] p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 text-center">
              <p className="text-2xl" aria-hidden>
                🎉
              </p>
              <h3 id="order-review-title" className="mt-2 text-lg font-bold text-white">
                Porosia u dorëzua me sukses
              </h3>
              <p className="mt-1 text-sm text-zinc-400">Si ishte përvoja juaj?</p>
            </div>
            <ReviewFormBody {...formProps} />
          </div>
        </div>
      ) : null}

      {dismissed && hasPending && !modalOpen ? (
        <section className="border-t border-white/[0.06] bg-[#0f1419] px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">Na ndihmo me vlerësimin e porosisë.</p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="shrink-0 rounded-xl bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25"
            >
              Vlerëso porosinë
            </button>
          </div>
        </section>
      ) : null}

      {hasPending && !modalOpen && !dismissed && submittedSlots.length > 0 ? (
        <section className="border-t border-white/[0.06] bg-[#0f1419] px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-[#141b26] p-5">
            <p className="text-sm font-semibold text-white">Vlerëso pjesën e mbetur</p>
            <p className="mt-0.5 text-xs text-zinc-500">Mund të vlerësosh vetëm një pjesë — të tjerat janë opsionale.</p>
            <div className="mt-4">
              <ReviewFormBody {...formProps} compact />
            </div>
          </div>
        </section>
      ) : null}

      {allDone && submittedSlots.length > 0 ? (
        <section className="border-t border-white/[0.06] bg-[#0f1419] px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-lg">
            <h3 className="text-base font-bold text-white">Faleminderit për feedback-un!</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Vlerësimet u ruajtën dhe do t&apos;i shohin klientët e tjerë (publik).
            </p>
            <div className="mt-4 space-y-3">
              {submittedSlots.map((slot) => (
                <div
                  key={slot.subject}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{slot.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      ✓
                    </span>
                  </div>
                  <div className="mt-2">
                    <SubmittedStars rating={slot.rating!} />
                  </div>
                  {slot.comment?.trim() ? (
                    <p className="mt-2 text-sm text-zinc-300">&ldquo;{slot.comment.trim()}&rdquo;</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
