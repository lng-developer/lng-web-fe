import { useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import StatusSwitch from '@/components/common/StatusSwitch'

import { ArtworkSlotsEditor, DesignAssetsEditor, RequiredFieldsEditor } from './templateEditors'

function InternalTemplateDialog({
  mode,
  open,
  values: initialValues,
  productTypes,
  isSubmitting,
  onClose,
  onSubmit,
  t,
}) {
  const isEdit = mode === 'edit'
  const [values, setValues] = useState(initialValues)

  function onChange(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="text-xl font-bold text-ink-strong">
        {t(
          isEdit
            ? 'listings.catalogSetup.templates.editTitle'
            : 'listings.catalogSetup.templates.addTitle',
          { defaultValue: isEdit ? 'Edit internal template' : 'Create internal template' },
        )}
      </DialogTitle>
      <DialogContent className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto pt-3">
        <div className="rounded-lg border border-info/30 bg-info-bg px-4 py-3">
          <Typography className="text-sm font-semibold text-info-strong">
            {t('listings.catalogSetup.help.templateModalTitle', {
              defaultValue: 'How to fill template fields',
            })}
          </Typography>
          <Typography variant="body2" className="mt-1 text-ink-secondary">
            {t('listings.catalogSetup.help.templateModalBody', {
              defaultValue:
                'Key is the stable system code used by mapping and production. Label is the readable name operators see on orders and design tasks.',
            })}
          </Typography>
        </div>
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.code', { defaultValue: 'Code' })}
          value={values.code}
          disabled={isEdit}
          helperText={t('listings.catalogSetup.help.templateCode', {
            defaultValue: 'Template code used by listing and mapping, for example TSHIRT_MAIN.',
          })}
          onChange={(event) => onChange('code', event.target.value)}
        />
        <TextField
          size="small"
          label={t('listings.catalogSetup.fields.name', { defaultValue: 'Display name' })}
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
        <TextField
          size="small"
          multiline
          minRows={2}
          label={t('listings.catalogSetup.fields.description', { defaultValue: 'Description' })}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormControl size="small">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.form.productType')}
            </Typography>
            <Select
              value={values.productTypeGroupId}
              onChange={(event) => onChange('productTypeGroupId', event.target.value)}
              displayEmpty
              IconComponent={KeyboardArrowDownIcon}
              className="h-10 rounded-lg text-sm"
            >
              <MenuItem value="" disabled>
                {t('listings.form.selectProductType')}
              </MenuItem>
              {productTypes.map((typeOption) => (
                <MenuItem key={typeOption.id} value={typeOption.id}>
                  {typeOption.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className="flex min-h-10 flex-col justify-center">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              {t('listings.catalogSetup.fields.status', { defaultValue: 'Status' })}
            </Typography>
            <div className="flex items-center gap-2">
              <StatusSwitch
                checked={values.status !== 'INACTIVE'}
                ariaLabel={t('listings.catalogSetup.fields.status', { defaultValue: 'Status' })}
                onChange={(_event, checked) => onChange('status', checked ? 'ACTIVE' : 'INACTIVE')}
              />
              <Typography variant="body2" className="text-ink-secondary">
                {t(
                  values.status !== 'INACTIVE'
                    ? 'listings.values.status.active'
                    : 'listings.values.status.inactive',
                )}
              </Typography>
            </div>
          </div>
          <div className="flex min-h-10 flex-col justify-center">
            <Typography variant="body2" className="mb-1 font-semibold text-ink">
              Requires PSD
            </Typography>
            <div className="flex items-center gap-2">
              <StatusSwitch
                checked={values.requiresPsd}
                ariaLabel="Requires PSD"
                onChange={(_event, checked) => onChange('requiresPsd', checked)}
              />
              <Typography variant="body2" className="text-ink-secondary">
                {values.requiresPsd ? 'Required' : 'Not required'}
              </Typography>
            </div>
          </div>
        </div>
        <Typography variant="caption" className="text-ink-muted">
          {t('listings.catalogSetup.help.templateFields', {
            defaultValue:
              'Configure the template fields used by mapping, design, and production without editing raw JSON.',
          })}
        </Typography>
        <RequiredFieldsEditor
          rows={values.requiredFields || []}
          onChange={(rows) => onChange('requiredFields', rows)}
          t={t}
        />
        <ArtworkSlotsEditor
          rows={values.artworkSlots || []}
          onChange={(rows) => onChange('artworkSlots', rows)}
          t={t}
        />
        <DesignAssetsEditor
          rows={values.designAssets || []}
          onChange={(rows) => onChange('designAssets', rows)}
          t={t}
        />
      </DialogContent>
      <DialogActions className="px-6 pb-6 pt-3">
        <Button variant="outlined" onClick={onClose} className="h-10 rounded-lg px-5 font-semibold">
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(values)}
          disabled={isSubmitting}
          className="h-10 rounded-lg px-5 font-semibold"
        >
          {t(isEdit ? 'listings.form.save' : 'listings.form.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InternalTemplateDialog
