import { describe, expect, it } from 'vitest'

import psdTasksSource from '@/features/portal/design/pages/PsdTasksPage.tsx?raw'

describe('design file selectors', () => {
  it('reuse the shared FileUpload component', () => {
    expect(psdTasksSource).toContain('<FileUpload')
    expect(psdTasksSource).not.toContain('<Upload.Dragger')
  })

  it('shows multipart upload progress in PSD task submissions', () => {
    expect(psdTasksSource).toContain('onProgress: setUploadProgress')
    expect(psdTasksSource).toContain('<Progress')
  })
})
