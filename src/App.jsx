import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Magazines from './pages/Magazines'
import MagazineDetail from './pages/MagazineDetail'
import Faq from './pages/Faq'
import Policy from './pages/Policy'
import ComingSoon from './pages/ComingSoon'
import ScrollToTop from './components/layout/ScrollToTop'
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
          <Route index element={<Home />} />
          <Route path="magazines" element={<Magazines />} />
          <Route path="magazines/:id" element={<MagazineDetail />} />
          <Route path="faq" element={<Faq />} />
          <Route path="policies/:id" element={<Policy />} />
          {/* Not built yet: replace these with real pages when each one is designed */}
          <Route path="products/:id" element={<ComingSoon />} />
          <Route path="cart" element={<ComingSoon page="cart" />} />
          <Route path="account" element={<ComingSoon page="account" />} />
          <Route path="*" element={<ComingSoon page="page" />} />
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