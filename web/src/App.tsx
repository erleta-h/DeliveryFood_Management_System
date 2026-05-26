
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/AdminRoute'
import { DriverRoute } from './components/DriverRoute'
import { GuestRoute } from './components/GuestRoute'
import { KitchenStaffRoute } from './components/KitchenStaffRoute'
import { LandingPage } from './components/LandingPage'
import { PageSpinner } from './components/PageSpinner'
import { ProtectedRoute } from './components/ProtectedRoute'
import { KitchenAccountPage, KitchenHistoryPage, KitchenMenuPage } from './lazy/kitchen'
import { useAuthStore } from './store/authStore'

const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'))
const RestaurantListPage = lazy(() => import('./pages/RestaurantListPage'))
const RestaurantDetailPage = lazy(() => import('./pages/RestaurantDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const AddressesPage = lazy(() => import('./pages/AddressesPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))
const OrderPaymentPage = lazy(() => import('./pages/OrderPaymentPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const KitchenLayout = lazy(() => import('./layouts/KitchenLayout'))
const KitchenOrdersPage = lazy(() => import('./pages/KitchenOrdersPage'))
const PartnerApplyPage = lazy(() => import('./pages/PartnerApplyPage'))
const PartnerLoginPage = lazy(() => import('./pages/PartnerLoginPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminPartnerApplicationsPage = lazy(() => import('./pages/AdminPartnerApplicationsPage'))
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'))
const AdminRestaurantsPage = lazy(() => import('./pages/AdminRestaurantsPage'))
const AdminFoodCategoriesPage = lazy(() => import('./pages/AdminFoodCategoriesPage'))
const AdminDriverApplicationsPage = lazy(() => import('./pages/AdminDriverApplicationsPage'))
const AdminDataPortPage = lazy(() => import('./pages/AdminDataPortPage'))
const AdminCustomersPage = lazy(() => import('./pages/AdminCustomersPage'))
const AdminFinancePage = lazy(() => import('./pages/AdminFinancePage'))
const AdminPromotionsPage = lazy(() => import('./pages/AdminPromotionsPage'))
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'))
const AdminZonesPage = lazy(() => import('./pages/AdminZonesPage'))
const AdminRidersPage = lazy(() => import('./pages/AdminRidersPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'))
const AdminSecurityPage = lazy(() => import('./pages/AdminSecurityPage'))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'))
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage'))
const DriverLayout = lazy(() => import('./layouts/DriverLayout'))
const DriverDeliveriesPage = lazy(() => import('./pages/DriverDeliveriesPage'))
const DriverEarningsPage = lazy(() => import('./pages/DriverEarningsPage'))
const DriverHistoryPage = lazy(() => import('./pages/DriverHistoryPage'))
const DriverProfilePage = lazy(() => import('./pages/DriverProfilePage'))

const lazyFallback = <PageSpinner />

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (loading) return <PageSpinner />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/partner"
          element={
            <Suspense fallback={lazyFallback}>
              <PartnerApplyPage />
            </Suspense>
          }
        />
        <Route element={<DriverRoute />}>
          <Route
            path="/driver"
            element={
              <Suspense fallback={lazyFallback}>
                <DriverLayout />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={lazyFallback}>
                  <DriverDeliveriesPage />
                </Suspense>
              }
            />
            <Route
              path="earnings"
              element={
                <Suspense fallback={lazyFallback}>
                  <DriverEarningsPage />
                </Suspense>
              }
            />
            <Route
              path="history"
              element={
                <Suspense fallback={lazyFallback}>
                  <DriverHistoryPage />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={lazyFallback}>
                  <DriverProfilePage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route element={<AdminRoute />}>
          <Route
            path="/admin"
            element={
              <Suspense fallback={lazyFallback}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="partner-applications"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminPartnerApplicationsPage />
                </Suspense>
              }
            />
            <Route
              path="orders"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="restaurants"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminRestaurantsPage />
                </Suspense>
              }
            />
            <Route
              path="food-categories"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminFoodCategoriesPage />
                </Suspense>
              }
            />
            <Route
              path="driver-applications"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminDriverApplicationsPage />
                </Suspense>
              }
            />
            <Route
              path="users"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminCustomersPage />
                </Suspense>
              }
            />
            <Route
              path="finance"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminFinancePage />
                </Suspense>
              }
            />
            <Route
              path="promotions"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminPromotionsPage />
                </Suspense>
              }
            />
            <Route
              path="reviews"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminReviewsPage />
                </Suspense>
              }
            />
            <Route
              path="zones"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminZonesPage />
                </Suspense>
              }
            />
            <Route
              path="riders"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminRidersPage />
                </Suspense>
              }
            />
            <Route
              path="reports"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminReportsPage />
                </Suspense>
              }
            />
            <Route
              path="data-port"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminDataPortPage />
                </Suspense>
              }
            />
            <Route
              path="security"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminSecurityPage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminSettingsPage />
                </Suspense>
              }
            />
            <Route
              path="support"
              element={
                <Suspense fallback={lazyFallback}>
                  <AdminSupportPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route element={<KitchenStaffRoute />}>
          <Route
            path="/kitchen"
            element={
              <Suspense fallback={lazyFallback}>
                <KitchenLayout />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={lazyFallback}>
                  <KitchenOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="orders"
              element={
                <Suspense fallback={lazyFallback}>
                  <KitchenOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="account"
              element={
                <Suspense fallback={lazyFallback}>
                  <KitchenAccountPage />
                </Suspense>
              }
            />
            <Route
              path="menu"
              element={
                <Suspense fallback={lazyFallback}>
                  <KitchenMenuPage />
                </Suspense>
              }
            />
            <Route
              path="history"
              element={
                <Suspense fallback={lazyFallback}>
                  <KitchenHistoryPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route element={<GuestRoute />}>
          <Route
            path="/login"
            element={
              <Suspense fallback={lazyFallback}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={lazyFallback}>
                <SignupPage />
              </Suspense>
            }
          />
          <Route
            path="/partner/login"
            element={
              <Suspense fallback={lazyFallback}>
                <PartnerLoginPage />
              </Suspense>
            }
          />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route
            path="/app"
            element={
              <Suspense fallback={lazyFallback}>
                <CustomerLayout />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="restaurants" replace />} />
            <Route
              path="restaurants"
              element={
                <Suspense fallback={lazyFallback}>
                  <RestaurantListPage />
                </Suspense>
              }
            />
            <Route
              path="restaurants/:id"
              element={
                <Suspense fallback={lazyFallback}>
                  <RestaurantDetailPage />
                </Suspense>
              }
            />
            <Route
              path="cart"
              element={
                <Suspense fallback={lazyFallback}>
                  <CartPage />
                </Suspense>
              }
            />
            <Route
              path="addresses"
              element={
                <Suspense fallback={lazyFallback}>
                  <AddressesPage />
                </Suspense>
              }
            />
            <Route
              path="checkout"
              element={
                <Suspense fallback={lazyFallback}>
                  <CheckoutPage />
                </Suspense>
              }
            />
            <Route
              path="orders"
              element={
                <Suspense fallback={lazyFallback}>
                  <OrdersPage />
                </Suspense>
              }
            />
            <Route
              path="orders/:id/pay"
              element={
                <Suspense fallback={lazyFallback}>
                  <OrderPaymentPage />
                </Suspense>
              }
            />
            <Route
              path="orders/:id"
              element={
                <Suspense fallback={lazyFallback}>
                  <OrderDetailPage />
                </Suspense>
              }
            />
            <Route
              path="account"
              element={
                <Suspense fallback={lazyFallback}>
                  <AccountPage />
                </Suspense>
              }
            />
            <Route
              path="support"
              element={
                <Suspense fallback={lazyFallback}>
                  <SupportPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App