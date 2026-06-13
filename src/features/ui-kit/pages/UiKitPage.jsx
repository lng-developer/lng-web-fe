import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SearchIcon from '@mui/icons-material/Search'
import {
  Avatar,
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
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'

export default function UiKitPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [selectValue, setSelectValue] = useState('')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [page, setPage] = useState(3)

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
            <Button variant="contained">Primary</Button>
            <Button variant="contained" disabled>
              Primary
            </Button>
            <Button variant="outlined">Secondary</Button>
            <Button variant="outlined" disabled>
              Secondary
            </Button>
            <Button variant="text">Ghost</Button>
            <Button variant="text" disabled>
              Ghost
            </Button>
            <Button variant="contained" color="error">
              Danger
            </Button>
            <Button variant="contained" color="error" disabled>
              Danger
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="contained" size="small">
              Small
            </Button>
            <Button variant="contained" size="medium">
              Default
            </Button>
            <Button variant="contained" size="large">
              Large
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.inputs')}</Typography>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t('uiKit.inputs.default')} placeholder={t('uiKit.inputs.default')} />
            <TextField
              label={t('uiKit.inputs.withIcon')}
              placeholder={t('uiKit.inputs.search')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label={t('uiKit.inputs.error')}
              defaultValue={t('uiKit.inputs.errorValue')}
              error
              helperText={t('uiKit.inputs.errorHelper')}
            />
            <TextField
              label={t('uiKit.inputs.disabled')}
              defaultValue={t('uiKit.inputs.disabledValue')}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Typography variant="h6">{t('uiKit.sections.select')}</Typography>
          <FormControl sx={{ minWidth: 240 }}>
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
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>A</Avatar>
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.8125rem' }}>B</Avatar>
            <Avatar sx={{ width: 40, height: 40 }}>C</Avatar>
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
                enqueueSnackbar(t('uiKit.toast.messages.success'), { variant: 'success' })
              }
            >
              {t('uiKit.toast.success')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => enqueueSnackbar(t('uiKit.toast.messages.error'), { variant: 'error' })}
            >
              {t('uiKit.toast.error')}
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                enqueueSnackbar(t('uiKit.toast.messages.warning'), { variant: 'warning' })
              }
            >
              {t('uiKit.toast.warning')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => enqueueSnackbar(t('uiKit.toast.messages.info'), { variant: 'info' })}
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
              <Button variant="outlined">Top</Button>
            </Tooltip>
            <Tooltip title={t('uiKit.tooltip.bottom')} placement="bottom">
              <Button variant="outlined">Bottom</Button>
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
