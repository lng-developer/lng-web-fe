import { useTranslation } from 'react-i18next'
import { Card, CardContent, Typography } from '@mui/material'

import { formatCurrency } from '@/utils/format'

import { useHomeSummaryQuery } from '../api/home.queries'
import FeedbackForm from '../components/FeedbackForm'

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
              <Typography variant="h5">{isPending ? '...' : item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-md">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('feedback.title')}
          </Typography>
          <FeedbackForm />
        </CardContent>
      </Card>
    </div>
  )
}
