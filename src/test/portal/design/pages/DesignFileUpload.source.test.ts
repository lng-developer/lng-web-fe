import { describe, expect, it } from 'vitest'

import psdModalsSource from '@/features/portal/design/components/PsdTasksActionModals.tsx?raw'
import psdTasksSource from '@/features/portal/design/pages/PsdTasksPage.tsx?raw'

const combinedSource = `${psdTasksSource}\n${psdModalsSource}`

describe('design file selectors', () => {
  it('reuse the shared FileUpload component', () => {
    expect(combinedSource).toContain('<FileUpload')
    expect(combinedSource).not.toContain('<Upload.Dragger')
  })

  it('shows multipart upload progress in PSD task submissions', () => {
    expect(combinedSource).toContain('onProgress: setUploadProgress')
    expect(combinedSource).toContain('<Progress')
  })
})
