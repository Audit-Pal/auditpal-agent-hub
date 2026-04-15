import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GlobalToastProvider } from './contexts/ToastContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GlobalToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
