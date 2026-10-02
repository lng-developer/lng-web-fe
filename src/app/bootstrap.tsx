import React from 'react'
import ReactDOM from 'react-dom/client'

export async function bootstrapApp(resolveAuthentication: () => Promise<void | boolean>) {
  const shouldRenderApp = await resolveAuthentication()
  if (shouldRenderApp === false) return

  const { App } = await import('./App')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
