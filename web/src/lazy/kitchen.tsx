import { lazy } from 'react'

/** Lazy imports përr panelin e kuzhinës — një vend që HMR të mos «humb» referencën. */
export const KitchenBrandingPage = lazy(() => import('../pages/KitchenBrandingPage'))
export const KitchenAccountPage = lazy(() => import('../pages/KitchenAccountPage'))
export const KitchenMenuPage = lazy(() => import('../pages/KitchenMenuPage'))
export const KitchenHistoryPage = lazy(() => import('../pages/KitchenHistoryPage'))
export const KitchenSupportPage = lazy(() => import('../pages/KitchenSupportPage'))