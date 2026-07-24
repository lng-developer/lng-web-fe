import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { IconButton, MenuItem, Switch, TextField, Typography } from '@mui/material'

import StatusSwitch from '@/components/common/StatusSwitch'

const fieldTypeOptions = ['TEXT', 'IMAGE', 'OPTION', 'FILE', 'NUMBER', 'DATE', 'UNKNOWN']
const fieldSourceOptions = ['CUSTOMER_INPUT', 'AMAZON_CUSTOMIZATION', 'MANUAL', 'SYSTEM']
const artworkTypeOptions = ['IMAGE', 'TEXT', 'VECTOR', 'PDF', 'MIXED']
const artworkRoleOptions = [
  'FRONT',
  'BACK',
  'LEFT_SLEEVE',
  'RIGHT_SLEEVE',
  'MOCKUP',
  'PREVIEW',
  'OTHER',
]
const assetTypeOptions = [
  'PSD_TEMPLATE',
  'PREVIEW_IMAGE',
  'MASK_FILE',
  'SVG_TEMPLATE',
  'SAMPLE_OUTPUT',
  'OTHER',
]
const blankRequiredField = {
  key: '',
  label: '',
  type: 'TEXT',
  required: true,
  source: 'CUSTOMER_INPUT',
  sortOrder: '',
}
const blankArtworkSlot = {
  key: '',
  label: '',
  type: 'TEXT',
  required: true,
  acceptedFieldKeys: '',
  outputRole: 'FRONT',
  sortOrder: '',
}
const blankDesignAsset = {
  type: 'PSD_TEMPLATE',
  mediaAssetId: '',
  version: 'v1',
  label: '',
  status: 'ACTIVE',
}
const templateFieldHelp = {
  key: 'Stable code used by API/mapping. Use letters, numbers, underscore. Example: customName.',
  label: 'Readable name shown to operators. Example: Custom Name.',
  acceptedFieldKeys:
    'Customer field keys this artwork uses, comma separated. Example: customName, photo.',
  mediaAssetId: 'Media asset id from uploaded file. Leave empty until the file exists in Media.',
}

function updateRow(rows, index, field, value) {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
}

function removeRow(rows, index) {
  return rows.filter((_row, rowIndex) => rowIndex !== index)
}

function RequiredFieldsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.requiredFields', { defaultValue: 'Customer fields' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.requiredFields', {
              defaultValue: 'Fields the customer/order must provide, such as name, size, or photo.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add customer field"
          onClick={() => onChange([...rows, { ...blankRequiredField }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_120px_190px_90px_104px]"
          >
            <TextField
              size="small"
              label="Field key"
              placeholder="customName"
              helperText={templateFieldHelp.key}
              value={row.key || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'key', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Custom Name"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <TextField
              select
              size="small"
              label="Field type"
              value={row.type || 'TEXT'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {fieldTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Source"
              value={row.source || 'CUSTOMER_INPUT'}
              onChange={(event) => onChange(updateRow(rows, index, 'source', event.target.value))}
            >
              {fieldSourceOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Sort"
              value={row.sortOrder || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'sortOrder', event.target.value))
              }
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  checked={Boolean(row.required)}
                  onChange={(event) =>
                    onChange(updateRow(rows, index, 'required', event.target.checked))
                  }
                  slotProps={{ input: { 'aria-label': 'Required field' } }}
                />
                <Typography variant="caption" className="text-ink-muted">
                  Required
                </Typography>
              </div>
              <IconButton
                size="small"
                aria-label="Remove customer field"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArtworkSlotsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.artworkSlots', { defaultValue: 'Artwork slots' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.artworkSlots', {
              defaultValue:
                'Outputs the design system must generate, such as front text or mockup image.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add artwork slot"
          onClick={() => onChange([...rows, { ...blankArtworkSlot }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_120px_150px_minmax(220px,1.2fr)_90px_104px]"
          >
            <TextField
              size="small"
              label="Slot key"
              placeholder="frontText"
              helperText="Stable output slot code. Example: frontText."
              value={row.key || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'key', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Front Text"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <TextField
              select
              size="small"
              label="Output type"
              value={row.type || 'TEXT'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {artworkTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Output role"
              value={row.outputRole || 'FRONT'}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'outputRole', event.target.value))
              }
            >
              {artworkRoleOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Accept keys"
              placeholder="customName, photo"
              helperText={templateFieldHelp.acceptedFieldKeys}
              value={
                Array.isArray(row.acceptedFieldKeys)
                  ? row.acceptedFieldKeys.join(', ')
                  : row.acceptedFieldKeys || ''
              }
              onChange={(event) =>
                onChange(updateRow(rows, index, 'acceptedFieldKeys', event.target.value))
              }
            />
            <TextField
              size="small"
              label="Sort"
              value={row.sortOrder || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'sortOrder', event.target.value))
              }
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  checked={Boolean(row.required)}
                  onChange={(event) =>
                    onChange(updateRow(rows, index, 'required', event.target.checked))
                  }
                  slotProps={{ input: { 'aria-label': 'Required artwork slot' } }}
                />
                <Typography variant="caption" className="text-ink-muted">
                  Required
                </Typography>
              </div>
              <IconButton
                size="small"
                aria-label="Remove artwork slot"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DesignAssetsEditor({ rows, onChange, t }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <Typography className="font-bold text-ink-strong">
            {t('listings.catalogSetup.fields.designAssets', { defaultValue: 'Design assets' })}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {t('listings.catalogSetup.help.designAssets', {
              defaultValue: 'Template files already stored in media, such as PSD or preview asset.',
            })}
          </Typography>
        </div>
        <IconButton
          size="small"
          aria-label="Add design asset"
          onClick={() => onChange([...rows, { ...blankDesignAsset }])}
          className="h-8 w-8 rounded-lg border border-border text-primary"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-surface-subtle p-3 xl:grid-cols-[150px_minmax(260px,1.4fr)_100px_minmax(180px,1fr)_170px]"
          >
            <TextField
              select
              size="small"
              label="Asset type"
              value={row.type || 'PSD_TEMPLATE'}
              onChange={(event) => onChange(updateRow(rows, index, 'type', event.target.value))}
            >
              {assetTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Media asset"
              placeholder="660000000000000000000901"
              helperText={templateFieldHelp.mediaAssetId}
              value={row.mediaAssetId || ''}
              onChange={(event) =>
                onChange(updateRow(rows, index, 'mediaAssetId', event.target.value))
              }
            />
            <TextField
              size="small"
              label="Version"
              placeholder="v1"
              value={row.version || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'version', event.target.value))}
            />
            <TextField
              size="small"
              label="Display label"
              placeholder="Main PSD"
              helperText={templateFieldHelp.label}
              value={row.label || ''}
              onChange={(event) => onChange(updateRow(rows, index, 'label', event.target.value))}
            />
            <div className="flex items-center gap-2">
              <div className="min-w-28">
                <Typography variant="caption" className="block text-ink-muted">
                  Status
                </Typography>
                <div className="flex items-center gap-1">
                  <StatusSwitch
                    checked={(row.status || 'ACTIVE') !== 'INACTIVE'}
                    ariaLabel="Asset status"
                    onChange={(_event, checked) =>
                      onChange(updateRow(rows, index, 'status', checked ? 'ACTIVE' : 'INACTIVE'))
                    }
                  />
                  <Typography variant="caption" className="text-ink-muted">
                    {(row.status || 'ACTIVE') !== 'INACTIVE' ? 'Active' : 'Inactive'}
                  </Typography>
                </div>
              </div>
              <IconButton
                size="small"
                aria-label="Remove design asset"
                onClick={() => onChange(removeRow(rows, index))}
                className="h-8 w-8 rounded-lg border border-border text-danger"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ArtworkSlotsEditor, DesignAssetsEditor, RequiredFieldsEditor }
