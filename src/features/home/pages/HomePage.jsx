import { useTranslation } from 'react-i18next'
import { Card, CardContent, Skeleton, Typography } from '@mui/material'

import { formatCurrency } from '@/utils/format'

import { useHomeSummaryQuery } from '../api/home.queries'

export default function HomePage() {
  const { t } = useTranslation()
  const { data, isPending } = useHomeSummaryQuery()

  const summaryItems = [
    { label: t('home.summary.users'), value: data?.totalUsers },
    { label: t('home.summary.orders'), value: data?.totalOrders },
    {
      label: t('home.summary.revenue'),
      value: data ? formatCurrency(data.totalRevenue) : undefined,
    },
  ]
  const queueItems = data?.queues ?? []
  const exceptionItems = data?.exceptions ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('home.welcome')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('home.description')}
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryItems.map((item) => (
          <Card key={item.label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              {isPending ? (
                <Skeleton width={96} height={32} />
              ) : (
                <Typography variant="h5">{item.value}</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('home.queues.title')}
            </Typography>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {isPending
                ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={84} />)
                : queueItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-page p-4">
                      <Typography variant="body2" color="text.secondary">
                        {t(item.labelKey)}
                      </Typography>
                      <Typography variant="h5">{item.count}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(item.statusKey)}
                      </Typography>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('home.exceptions.title')}
            </Typography>
            <div className="flex flex-col gap-3">
              {isPending
                ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={40} />)
                : exceptionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <Typography variant="body2" color="text.secondary">
                        {t(item.labelKey)}
                      </Typography>
                      <Typography variant="subtitle1">{item.count}</Typography>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
