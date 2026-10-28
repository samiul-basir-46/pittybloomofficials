import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './shared/layout/Layout'
import ScrollToTop from './shared/layout/ScrollToTop'
import HomePage from './pages/home/HomePage'
import MagazinesPage from './pages/magazines/MagazinesPage'
import MagazineDetailPage from './pages/magazine-detail/MagazineDetailPage'
import FaqPage from './pages/faq/FaqPage'
import PolicyPage from './pages/policy/PolicyPage'
import FramePage from './pages/frame/FramePage'
import MiniMagazinePage from './pages/mini-magazine/MiniMagazinePage'
import MiniMagazineDetailPage from './pages/mini-magazine/MiniMagazineDetailPage'
import MiniMagazineOrderPage from './pages/mini-magazine/MiniMagazineOrderPage'
import FrameOrderPage from './pages/frame/FrameOrderPage'
import FrameDetailPage from './pages/frame/FrameDetailPage'
import PolaroidsPage from './pages/polaroids/PolaroidsPage'
import PolaroidsOrderPage from './pages/polaroids/PolaroidsOrderPage'
import PolaroidDetailPage from './pages/polaroids/PolaroidDetailPage'
import StickerPage from './pages/sticker/StickerPage'
import PhotoStripPage from './pages/photo-strip/PhotoStripPage'
import CartPage from './pages/cart/CartPage'
import AccountPage from './pages/account/AccountPage'
import ProductPage from './pages/products/ProductPage'
import NotFoundPage from './pages/not-found/NotFoundPage'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import ItemManager from './admin/ItemManager'
import SettingsPage from './admin/SettingsPage'
import OrdersPage from './admin/OrdersPage'
import OrderDetailPage from './admin/OrderDetailPage'
import OrderDetailsPage from './pages/order-details/OrderDetailsPage'
import OrderPage from './pages/order/OrderPage'
import OrderSettingsPage from './admin/OrderSettingsPage'
import { SECTIONS } from './admin/sections'
import { RequireCustomer } from './shared/ui/RouteGuards'
import DraftDetailPage from './admin/DraftDetailPage'
import ManualOrderPage from './pages/manual-order/ManualOrderPage'
import AdminLoginPage from './admin/AdminLoginPage'
import ManualOrderCatalogPage from './admin/ManualOrderCatalogPage'
import SongBookPage from './pages/song-book/SongBookPage'
import SongBookDetailPage from './pages/song-book/SongBookDetailPage'
import SongBookOrderPage from './pages/song-book/SongBookOrderPage'
import FrameSettingsPage from './admin/FrameSettingsPage'
import MiniMagazineSettingsPage from './admin/MiniMagazineSettingsPage'
import PolaroidSettingsPage from './admin/PolaroidSettingsPage'
import { AdminAuthProvider } from './admin/AdminAuthContext'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="admin/login" element={<AdminAuthProvider><AdminLoginPage /></AdminAuthProvider>} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="order-form" element={<ManualOrderPage />} />
          <Route path="custom-order" element={<Navigate to="/order-form" replace />} />

          <Route path="magazines" element={<MagazinesPage />} />
          <Route path="magazines/:id" element={<MagazineDetailPage />} />
          <Route path="magazines/:id/order" element={<RequireCustomer><OrderPage /></RequireCustomer>} />
          <Route path="magazines/:id/details" element={<OrderDetailsPage />} />
          <Route path="song-book" element={<Navigate to="/song-books" replace />} />
          <Route path="song-books" element={<SongBookPage />} />
          <Route path="song-books/:id" element={<SongBookDetailPage />} />
          <Route path="song-books/:id/order" element={<RequireCustomer><SongBookOrderPage /></RequireCustomer>} />

          {/* One page per product, each in its own folder under src/pages (placeholders for now) */}
          <Route path="frame" element={<FramePage />} />
          <Route path="frame/:id" element={<FrameDetailPage />} />
          <Route path="frame/order" element={<RequireCustomer><FrameOrderPage /></RequireCustomer>} />
          <Route path="mini-magazines" element={<MiniMagazinePage />} />
          <Route path="mini-magazines/order" element={<RequireCustomer><MiniMagazineOrderPage /></RequireCustomer>} />
          <Route path="mini-magazines/:id" element={<MiniMagazineDetailPage />} />
          <Route path="polaroids" element={<PolaroidsPage />} />
          <Route path="polaroids/order" element={<RequireCustomer><PolaroidsOrderPage /></RequireCustomer>} />
          <Route path="polaroids/:id" element={<PolaroidDetailPage />} />
          <Route path="sticker" element={<StickerPage />} />
          <Route path="photo-strip" element={<PhotoStripPage />} />
          <Route path="products/:id" element={<ProductPage />} />

          <Route path="cart" element={<CartPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="policies/:id" element={<PolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin" element={<AdminAuthProvider><AdminLayout /></AdminAuthProvider>}>
          <Route index element={<Dashboard />} />
          {SECTIONS.map((s) => (
            <Route key={s.path} path={s.path} element={<ItemManager key={s.path} {...s} />} />
          ))}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="completed-orders" element={<OrdersPage fixedView="completed" />} />
          <Route path="cancelled-orders" element={<OrdersPage fixedView="cancelled" />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="drafts/:id" element={<DraftDetailPage />} />
          <Route path="order-settings" element={<OrderSettingsPage />} />
          <Route path="manual-order" element={<ManualOrderCatalogPage />} />
          <Route path="frame-settings" element={<FrameSettingsPage />} />
          <Route path="mini-magazine-settings" element={<MiniMagazineSettingsPage />} />
          <Route path="polaroid-settings" element={<PolaroidSettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}
