import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext.jsx'
import './styles/variables.css'
import './index.css'

document.addEventListener('error', event => {
  const image = event.target
  if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = '/images/product-image-unavailable.svg'
}, true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
)