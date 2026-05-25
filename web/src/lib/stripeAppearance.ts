import type { Appearance, StripeElementStyle } from '@stripe/stripe-js'

/**
 * Stil për CardNumber / CardExpiry / CardCvc (API e vjetër `style`).
 * `appearance` nuk aplikohet te këto elementë — prandaj teksti mbetej i zi.
 */
export const stripeCardElementStyle: StripeElementStyle = {
  base: {
    color: '#f4f4f5',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '15px',
    fontWeight: '400',
    lineHeight: '22px',
    '::placeholder': {
      color: '#71717a',
    },
    iconColor: '#a1a1aa',
  },
  invalid: {
    color: '#fecaca',
    iconColor: '#fca5a5',
  },
  complete: {
    color: '#ffffff',
    iconColor: '#a1a1aa',
  },
}

/** Pamje e errët e Stripe Elements — për Payment Element / Elements të reja. */
export const stripePaymentAppearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#FF7A18',
    colorBackground: '#141820',
    colorText: '#f4f4f5',
    colorTextSecondary: '#a1a1aa',
    colorTextPlaceholder: '#71717a',
    colorDanger: '#f87171',
    borderRadius: '10px',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '15px',
    spacingUnit: '3px',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(255,255,255,0.12)',
      backgroundColor: '#141820',
      color: '#f4f4f5',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1px solid rgba(255,122,24,0.55)',
      boxShadow: '0 0 0 2px rgba(255,122,24,0.12)',
    },
    '.Label': {
      display: 'none',
    },
    '.Error': {
      fontSize: '12px',
    },
  },
}
