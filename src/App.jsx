import { Route, Routes } from 'react-router-dom'
import Layout from './shared/layout/Layout'
import ScrollToTop from './shared/layout/ScrollToTop'
import HomePage from './pages/home/HomePage'
import MagazinesPage from './pages/magazines/MagazinesPage'
import MagazineDetailPage from './pages/magazine-detail/MagazineDetailPage'
import FaqPage from './pages/faq/FaqPage'
import PolicyPage from './pages/policy/PolicyPage'
import FramePage from './pages/frame/FramePage'
import PolaroidsPage from './pages/polaroids/PolaroidsPage'
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
import { SECTIONS } from './admin/sections'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />

          <Route path="magazines" element={<MagazinesPage />} />
          <Route path="magazines/:id" element={<MagazineDetailPage />} />

          {/* One page per product, each in its own folder under src/pages (placeholders for now) */}
          <Route path="frame" element={<FramePage />} />
          <Route path="polaroids" element={<PolaroidsPage />} />
          <Route path="sticker" element={<StickerPage />} />
          <Route path="photo-strip" element={<PhotoStripPage />} />
          <Route path="products/:id" element={<ProductPage />} />

          <Route path="cart" element={<CartPage />} />
          <Route path="account" element={<AccountPage />} />

          <Route path="faq" element={<FaqPage />} />
          <Route path="policies/:id" element={<PolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          {SECTIONS.map((s) => (
            <Route key={s.path} path={s.path} element={<ItemManager key={s.path} {...s} />} />
          ))}
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}
