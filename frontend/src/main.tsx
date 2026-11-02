import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const Analytics = React.lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })))
const SpeedInsights = React.lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })))

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <App />
      <Suspense fallback={null}>
        <Analytics />
        <SpeedInsights />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#51cf66', secondary: 'var(--bg-card)' } },
          error: { iconTheme: { primary: '#ff6b6b', secondary: 'var(--bg-card)' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
