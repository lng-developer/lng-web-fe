import React from 'react'
import ReactDOM from 'react-dom/client'

function renderBootState(message: string) {
  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f7f8fa;color:#172033;font-family:Plus Jakarta Sans,Arial,sans-serif">
      <section style="width:min(420px,100%);padding:32px;border:1px solid #e4e8ef;border-radius:20px;background:#fff;box-shadow:0 16px 40px rgba(23,32,51,.08);text-align:center">
        <strong style="display:block;margin-bottom:10px;font-size:20px;letter-spacing:-.02em">LNG Web</strong>
        <p style="margin:0;color:#667085;line-height:1.6">${message}</p>
      </section>
    </main>
  `
}

export async function bootstrapApp(resolveAuthentication: () => Promise<void | boolean>) {
  renderBootState('Đang tải không gian làm việc…')

  try {
    const shouldRenderApp = await resolveAuthentication()
    if (shouldRenderApp === false) return

    const { App } = await import('./App')
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch {
    renderBootState('Không thể tải ứng dụng. Vui lòng tải lại trang để thử lại.')
  }
}
