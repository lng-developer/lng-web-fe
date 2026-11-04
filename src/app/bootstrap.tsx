import React from 'react'
import ReactDOM from 'react-dom/client'

import { ContentErrorBoundary } from '@/shared/ui'

export async function bootstrapApp(resolveAuthentication: () => Promise<void | boolean>) {
  const shouldRenderApp = await resolveAuthentication()
  if (shouldRenderApp === false) return

  const { App } = await import('./App')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ContentErrorBoundary
        title="Hệ thống đang gặp sự cố"
        description="Vui lòng tải lại trang hoặc liên hệ quản trị viên nếu sự cố tiếp diễn."
      >
        <App />
      </ContentErrorBoundary>
    </React.StrictMode>,
  )
}
