import { BrowserRouter, Link ,Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { BrandLogo } from './components/BrandLogo'
import { GuestRoute } from './components/GuestRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerShellBg,
} from './lib/customerTheme'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'))
const AddressesPage = lazy(() => import('./pages/AddressesPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))

function HomePage() {
  return (
    <div className={`${customerShellBg} min-h-screen px-4 py-16`}>
      <div className="mx-auto max-w-lg text-center">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <p className="mt-8 text-zinc-400">Demo autentifikimi — kyçu ose krijo llogari.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className={`${customerBtnPrimary} inline-flex justify-center no-underline`}
          >
            Hyr
          </Link>
          <Link
            to="/signup"
            className={`${customerBtnGhost} inline-flex justify-center no-underline`}
          >
            Regjistrohu
          </Link>
        </div>
      </div>
    </div>
  )
}

function StubModule({ title }: { title: string }) {
  return (
    <div className={`${customerShellBg} min-h-screen p-8`}>
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#222636]/80 p-6 text-zinc-100 backdrop-blur-md">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ky modul nuk është në këtë projekt minimal (vetëm klienti + auth).
        </p>
        <p className="mt-4">
          <Link to="/app/account" className="text-amber-400 no-underline hover:underline">
            Llogaria
          </Link>
          <span className="text-zinc-600"> · </span>
          <Link to="/" className="text-amber-400 no-underline hover:underline">
            Ballina
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<Outlet />}>
            <Route index element={<Navigate to="account" replace />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Outlet />}>
            <Route index element={<StubModule title="Admin" />} />
            <Route path="restaurants" element={<StubModule title="Restorantet" />} />
            <Route path="orders" element={<StubModule title="Porositë" />} />
            <Route path="riders" element={<StubModule title="Delivera" />} />
            <Route path="users" element={<StubModule title="Klientët" />} />
            <Route path="finance" element={<StubModule title="Financa" />} />
            <Route path="promotions" element={<StubModule title="Promocione" />} />
            <Route path="reviews" element={<StubModule title="Vlerësime" />} />
            <Route path="zones" element={<StubModule title="Zonat & tarifat" />} />
            <Route path="reports" element={<StubModule title="Raporte" />} />
            <Route path="security" element={<StubModule title="Siguria" />} />
            <Route path="support" element={<StubModule title="Support" />} />
            <Route path="settings" element={<StubModule title="Konfigurime" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
  <Route
    path="/app"
    element={
      <Suspense fallback={<div>Loading...</div>}>
        <CustomerLayout />
      </Suspense>
    }
  >
    <Route index element={<Navigate to="restaurants" replace />} />

   
    <Route path="addresses" element={<AddressesPage />} />
    <Route path="checkout" element={<CheckoutPage />} />
    <Route path="orders" element={<OrdersPage />} />
    <Route path="orders/:id" element={<OrderDetailPage />} />
  </Route>
</Route>

 



      

        <Route path="/kitchen" element={<StubModule title="Kuzhina" />} />
        <Route path="/driver" element={<StubModule title="Deliver" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}