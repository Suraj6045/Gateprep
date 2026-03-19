import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16213e',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#51cf66', secondary: '#16213e' } },
          error: { iconTheme: { primary: '#ff6b6b', secondary: '#16213e' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
