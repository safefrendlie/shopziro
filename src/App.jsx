import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import SetupScreen from './components/SetupScreen'
import AppShell from './components/AppShell'
import { RequireRole, RequireUser } from './components/Guards'
import { PageLoader } from './components/ui'
import { ToastProvider } from './state/toast'
import { AuthProvider } from './state/auth'
import { CartProvider } from './state/cart'
import { NotifyProvider } from './state/notifications'

import Home from './pages/Home'
import Explore from './pages/Explore'
import Auth from './pages/Auth'
import Reset from './pages/Reset'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import AccountSettings from './pages/AccountSettings'
import NotFound from './pages/NotFound'

const SellerLayout = lazy(() => import('./pages/seller/SellerLayout'))
const SellerOverview = lazy(() => import('./pages/seller/Overview'))
const MyShop = lazy(() => import('./pages/seller/MyShop'))
const Builder = lazy(() => import('./pages/seller/Builder'))
const Products = lazy(() => import('./pages/seller/Products'))
const Categories = lazy(() => import('./pages/seller/Categories'))
const SellerOrders = lazy(() => import('./pages/seller/Orders'))
const Customers = lazy(() => import('./pages/seller/Customers'))
const SellerEnquiries = lazy(() => import('./pages/seller/Enquiries'))
const SellerReviews = lazy(() => import('./pages/seller/Reviews'))
const Analytics = lazy(() => import('./pages/seller/Analytics'))
const Integrations = lazy(() => import('./pages/seller/Integrations'))
const ShareQR = lazy(() => import('./pages/seller/ShareQR'))

const BuyerLayout = lazy(() => import('./pages/buyer/BuyerLayout'))
const BuyerOrders = lazy(() => import('./pages/buyer/Orders'))
const BuyerEnquiries = lazy(() => import('./pages/buyer/Enquiries'))
const Favourites = lazy(() => import('./pages/buyer/Favourites'))
const SavedProducts = lazy(() => import('./pages/buyer/Saved'))
const BuyerReviews = lazy(() => import('./pages/buyer/Reviews'))

export default function App() {
  if (!isConfigured) return <SetupScreen />

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <NotifyProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="explore" element={<Explore />} />
                  <Route path="auth" element={<Auth />} />
                  <Route path="reset" element={<Reset />} />
                  <Route path="shop/:slug" element={<Shop />} />
                  <Route path="shop/:slug/product/:pid" element={<Shop />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route
                    path="account/settings"
                    element={
                      <RequireUser>
                        <div className="container page narrow">
                          <h1 className="page-title">Account and alerts</h1>
                          <AccountSettings />
                        </div>
                      </RequireUser>
                    }
                  />

                  <Route
                    path="seller"
                    element={
                      <RequireRole role="seller">
                        <SellerLayout />
                      </RequireRole>
                    }
                  >
                    <Route index element={<SellerOverview />} />
                    <Route path="shop" element={<MyShop />} />
                    <Route path="customise" element={<Builder />} />
                    <Route path="products" element={<Products kind="product" />} />
                    <Route path="services" element={<Products kind="service" />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="orders" element={<SellerOrders />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="enquiries" element={<SellerEnquiries />} />
                    <Route path="reviews" element={<SellerReviews />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="share" element={<ShareQR />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="settings" element={<AccountSettings />} />
                  </Route>

                  <Route
                    path="buyer"
                    element={
                      <RequireRole role="buyer">
                        <BuyerLayout />
                      </RequireRole>
                    }
                  >
                    <Route index element={<BuyerOrders />} />
                    <Route path="orders" element={<BuyerOrders />} />
                    <Route path="enquiries" element={<BuyerEnquiries />} />
                    <Route path="favourites" element={<Favourites />} />
                    <Route path="saved" element={<SavedProducts />} />
                    <Route path="reviews" element={<BuyerReviews />} />
                    <Route path="settings" element={<AccountSettings />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </NotifyProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
