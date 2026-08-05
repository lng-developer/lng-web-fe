import '@/shared/i18n/i18n'
import '@/styles/global.scss'

import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '@/app/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
