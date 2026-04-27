import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
// ↓ Side-effect import — initialises Reown AppKit (createAppKit) before render
import { wagmiConfig } from './lib/wallet.ts'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GlobalToastProvider } from './contexts/ToastContext.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GlobalToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </GlobalToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
