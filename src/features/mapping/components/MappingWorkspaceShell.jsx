import { useTranslation } from 'react-i18next'
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material'

import { mappingRuleTypes } from '@/features/mapping/api/mapping.queries'

const tabs = [{ id: 'resolve' }, ...mappingRuleTypes]

function getTabLabel(t, tab) {
  return t(`mapping.ruleTypes.${tab.id}`, { defaultValue: tab.label || tab.id })
}

export default function MappingWorkspaceShell({ activeTab, children, onTabChange, toolbar }) {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h1">{t('mapping.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mapping.subtitle')}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_, nextValue) => onTabChange(nextValue)}
          >
            {tabs.map((tab) => (
              <Tab key={tab.id} label={getTabLabel(t, tab)} value={tab.id} />
            ))}
          </Tabs>
        </Paper>

        {toolbar}
        {children}
      </Stack>
    </Box>
  )
}
