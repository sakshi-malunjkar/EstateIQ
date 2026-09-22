import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16181f',
            color: '#f8fafc',
            border: '1px solid #ffffff1a',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#16181f' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#16181f' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
