import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDocumentTitle } from '@/app/layout/pageTitle'

export function useDocumentTitle(title?: string | null, options?: { readonly raw?: boolean }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!title) return
    const appName = t('app.name', { defaultValue: 'LNG Web' })
    document.title = options?.raw ? title : formatDocumentTitle(title, appName)
  }, [options?.raw, t, title])
}
