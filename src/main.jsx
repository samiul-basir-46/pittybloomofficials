import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { SettingsProvider } from './context/SettingsContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
