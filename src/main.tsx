import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AdminApp } from './admin/AdminApp.tsx'

const RootComponent = window.location.pathname.startsWith('/admin') ? AdminApp : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
)
