import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Magazines from './pages/Magazines'
import MagazineDetail from './pages/MagazineDetail'
import Faq from './pages/Faq'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import ItemManager from './admin/ItemManager'
import SettingsPage from './admin/SettingsPage'
import { SECTIONS } from './admin/sections'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="magazines" element={<Magazines />} />
        <Route path="magazines/:id" element={<MagazineDetail />} />
        <Route path="faq" element={<Faq />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        {SECTIONS.map((s) => (
          <Route key={s.path} path={s.path} element={<ItemManager key={s.path} {...s} />} />
        ))}
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
