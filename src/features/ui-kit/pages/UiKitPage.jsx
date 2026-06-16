import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import { SNACKBAR_VARIANTS, THEME_MODES } from '@/constants/app'
import { createAppTheme } from '@/theme'

export default function UiKitPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [selectValue, setSelectValue] = useState('')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [page, setPage] = useState(3)
  const inputPreviewThemes = useMemo(
    () => ({
      [THEME_MODES.LIGHT]: createAppTheme(THEME_MODES.LIGHT),
      [THEME_MODES.DARK]: createAppTheme(THEME_MODES.DARK),
    }),
    [],
  )
  const inputStates = [
    {
      key: 'default',
      slotProps: {
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      },
    },
    {
      key: 'focus',
      focused: true,
      slotProps: {
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <VisibilityOutlinedIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      },
    },
    {
      key: 'error',
      error: true,
      helperText: t('uiKit.inputs.requiredHelper'),
    },
    {
      key: 'disabled',
      disabled: true,
    },
  ]
  const inputPanels = [
    { mode: THEME_MODES.LIGHT, label: t('uiKit.inputs.lightMode') },
    { mode: THEME_MODES.DARK, label: t('uiKit.inputs.darkMode') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('uiKit.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('uiKit.description')}
        </Typography>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.buttons')}</Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="contained">{t('uiKit.buttons.primary')}</Button>
            <Button variant="contained" disabled>
              {t('uiKit.buttons.primary')}
            </Button>
            <Button variant="outlined">{t('uiKit.buttons.secondary')}</Button>
            <Button variant="outlined" disabled>
              {t('uiKit.buttons.secondary')}
            </Button>
            <Button variant="text">{t('uiKit.buttons.ghost')}</Button>
            <Button variant="text" disabled>
              {t('uiKit.buttons.ghost')}
            </Button>
            <Button variant="contained" color="error">
              {t('uiKit.buttons.danger')}
            </Button>
            <Button variant="contained" color="error" disabled>
              {t('uiKit.buttons.danger')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="contained" size="small">
              {t('uiKit.buttons.small')}
            </Button>
            <Button variant="contained" size="medium">
              {t('uiKit.buttons.default')}
            </Button>
            <Button variant="contained" size="large">
              {t('uiKit.buttons.large')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.inputs.title')}</Typography>
          <div className="flex flex-col gap-5">
            {inputPanels.map((panel) => (
              <ThemeProvider key={panel.mode} theme={inputPreviewThemes[panel.mode]}>
                <Box
                  className="rounded-xl p-4"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.default,
                    color: theme.palette.text.primary,
                  })}
                >
                  <Typography
                    variant="h3"
                    className="mb-4"
                    sx={(theme) => ({
                      color: theme.palette.text.secondary,
                    })}
                  >
                    {panel.label}
                  </Typography>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {inputStates.map(({ key, ...fieldProps }) => (
                      <div key={key} className="flex min-w-0 flex-col">
                        <Typography
                          variant="caption"
                          className="mb-[3px] block"
                          sx={(theme) => ({
                            color: theme.palette.text.secondary,
                          })}
                        >
                          {t(`uiKit.inputs.states.${key}`)}
                        </Typography>
                        <TextField
                          fullWidth
                          placeholder={t('uiKit.inputs.contentPlaceholder')}
                          {...fieldProps}
                        />
                      </div>
                    ))}
                  </div>
                </Box>
              </ThemeProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.select')}</Typography>
          <FormControl className="min-w-[240px]">
            <Select
              value={selectValue}
              onChange={(event) => setSelectValue(event.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>{t('uiKit.select.placeholder')}</em>
              </MenuItem>
              <MenuItem value="a">{t('uiKit.select.option', { value: 'A' })}</MenuItem>
              <MenuItem value="b">{t('uiKit.select.option', { value: 'B' })}</MenuItem>
              <MenuItem value="c">{t('uiKit.select.option', { value: 'C' })}</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.dateRangePicker')}</Typography>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.avatar')}</Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="!h-6 !w-6 !text-xs">A</Avatar>
            <Avatar className="!h-8 !w-8 !text-[0.8125rem]">B</Avatar>
            <Avatar className="!h-10 !w-10">C</Avatar>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.checkbox')}</Typography>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox />
            <Checkbox defaultChecked />
            <Checkbox indeterminate />
            <Checkbox disabled />
            <Checkbox disabled defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.toggle')}</Typography>
          <div className="flex flex-wrap items-center gap-4">
            <Switch />
            <Switch defaultChecked />
            <Switch disabled />
            <Switch disabled defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.toast')}</Typography>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outlined"
              onClick={() =>
                enqueueSnackbar(t('uiKit.toast.messages.success'), {
                  variant: SNACKBAR_VARIANTS.SUCCESS,
                })
              }
            >
              {t('uiKit.toast.success')}
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                enqueueSnackbar(t('uiKit.toast.messages.error'), {
                  variant: SNACKBAR_VARIANTS.ERROR,
                })
              }
            >
              {t('uiKit.toast.error')}
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                enqueueSnackbar(t('uiKit.toast.messages.warning'), {
                  variant: SNACKBAR_VARIANTS.WARNING,
                })
              }
            >
              {t('uiKit.toast.warning')}
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                enqueueSnackbar(t('uiKit.toast.messages.info'), {
                  variant: SNACKBAR_VARIANTS.INFO,
                })
              }
            >
              {t('uiKit.toast.info')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.tooltip')}</Typography>
          <div className="flex flex-wrap gap-6">
            <Tooltip title={t('uiKit.tooltip.top')} placement="top">
              <Button variant="outlined">{t('uiKit.tooltip.actions.top')}</Button>
            </Tooltip>
            <Tooltip title={t('uiKit.tooltip.bottom')} placement="bottom">
              <Button variant="outlined">{t('uiKit.tooltip.actions.bottom')}</Button>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.pagination')}</Typography>
          <Pagination count={10} page={page} onChange={(_event, value) => setPage(value)} />
        </CardContent>
      </Card>
    </div>
  )
}
