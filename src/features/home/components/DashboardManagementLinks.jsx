import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Typography } from '@mui/material'

export default function DashboardManagementLinks({ links }) {
  const { t } = useTranslation()

  if (!links.length) return null

  return (
    <section className="border-t border-border pt-4">
      <Typography variant="subtitle1" className="font-bold text-ink-strong">
        {t('home.dashboard.management.title')}
      </Typography>
      <div className="mt-2 flex flex-wrap gap-2">
        {links.map((link) => (
          <Button key={link.id} component={Link} to={link.href} size="small" variant="outlined">
            {t(`home.dashboard.management.items.${link.id}`)}
          </Button>
        ))}
      </div>
    </section>
  )
}
