import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

import FormTextField from '@/components/form/FormTextField'

import { getMappingRuleSelectConfig, MAPPING_RULE_FORM_CONFIG } from '../data/mappingUxConfig'
import {
  buildRuleConflictPayload,
  buildRuleEvaluationPayload,
  useMappingRuleForm,
} from '../hooks/useMappingRuleForm'
import RuleEvaluationPanel from './RuleEvaluationPanel'
import SemanticRuleForm from './SemanticRuleForm'
import SkuConfigRuleForm from './SkuConfigRuleForm'
import SkuNormalizeRuleForm from './SkuNormalizeRuleForm'
import ValueAliasForm from './ValueAliasForm'

const formComponents = {
  semanticRules: SemanticRuleForm,
  skuConfig: SkuConfigRuleForm,
  skuNormalize: SkuNormalizeRuleForm,
  valueAliases: ValueAliasForm,
}

const emptyEvaluation = {
  conflicts: [],
  error: '',
  preview: null,
}

function errorMessage(error) {
  return error?.message || 'mapping.evaluation.failed'
}

export default function MappingRuleDialog({
  onCheckConflicts,
  onClose,
  onPreview,
  onPreviewChange,
  onSave,
  open,
  optionsBySource = {},
  rule,
  type,
}) {
  const { t } = useTranslation()
  const config = MAPPING_RULE_FORM_CONFIG[type]
  const FormComponent = formComponents[type]
  const shopField = config?.fields.find(({ payloadKey }) => payloadKey === 'shopId')
  const shopSelectConfig = shopField
    ? getMappingRuleSelectConfig(shopField, optionsBySource.shops || [], Boolean(rule))
    : { defaultValue: '', required: false }
  const form = useMappingRuleForm({ requireShop: shopSelectConfig.required, rule, type })
  const [evaluation, setEvaluation] = useState(emptyEvaluation)
  const [pendingAction, setPendingAction] = useState('')
  const pending = Boolean(pendingAction)

  useEffect(() => {
    setEvaluation(emptyEvaluation)
  }, [open, rule, type])

  useEffect(() => {
    if (!rule && shopSelectConfig.defaultValue && !form.getValues('shopId')) {
      form.setValue('shopId', shopSelectConfig.defaultValue, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }
  }, [form, rule, shopSelectConfig.defaultValue])

  const handlePreviewChange = useCallback(
    (payload) => {
      onPreviewChange?.(payload)
    },
    [onPreviewChange],
  )

  const testRule = form.handleSubmit(async (values) => {
    const payload = buildRuleEvaluationPayload(type, values)
    setPendingAction('preview')
    setEvaluation(emptyEvaluation)

    try {
      const [preview, conflicts] = await Promise.all([
        onPreview?.(payload),
        onCheckConflicts?.(buildRuleConflictPayload(type, values, rule?.id)),
      ])
      setEvaluation({
        conflicts: conflicts?.conflicts || [],
        error: '',
        preview: preview || null,
      })
    } catch (error) {
      form.applyServerErrors(error)
      setEvaluation({
        conflicts: [],
        error: errorMessage(error),
        preview: null,
      })
    } finally {
      setPendingAction('')
    }
  })

  const saveRule = form.handleSubmit(async (values) => {
    if (!onSave) return
    const payload = buildRuleEvaluationPayload(type, values)
    setPendingAction('save')

    try {
      await onSave({ body: payload.rule, id: rule?.id, type })
      onClose()
    } catch (error) {
      form.applyServerErrors(error)
      setEvaluation((current) => ({ ...current, error: errorMessage(error) }))
    } finally {
      setPendingAction('')
    }
  })

  if (!config || !FormComponent) return null

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={pending ? undefined : onClose}
      aria-labelledby="mapping-rule-dialog-title"
    >
      <DialogTitle id="mapping-rule-dialog-title">
        {rule
          ? t('mapping.ruleDialog.editTitle', {
              rule: t(`mapping.ruleTypes.${type}`, { defaultValue: config.title }),
            })
          : t('mapping.ruleDialog.createTitle', {
              rule: t(`mapping.ruleTypes.${type}`, { defaultValue: config.title }),
            })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} className="pt-2">
          <Alert severity="info" variant="outlined">
            {t(`mapping.ruleDescriptions.${type}`, { defaultValue: config.description })}
          </Alert>
          <Alert severity="success" variant="outlined">
            <Typography variant="subtitle2">{t('mapping.ruleDialog.howToFill')}</Typography>
            <Box component="ul" className="mb-0 mt-1 pl-5">
              {config.howToFill.map((item, index) => (
                <Typography key={item} component="li" variant="body2">
                  {t(`mapping.howToFill.${type}.${index}`, { defaultValue: item })}
                </Typography>
              ))}
            </Box>
          </Alert>
          <FormComponent
            control={form.control}
            editing={Boolean(rule)}
            onPreviewChange={handlePreviewChange}
            optionsBySource={optionsBySource}
          />
          <FormTextField
            control={form.control}
            helperText={t('mapping.evaluation.samplesHelp')}
            label={t('mapping.evaluation.samples')}
            minRows={3}
            multiline
            name="samples"
            placeholder={t('mapping.evaluation.samplesPlaceholder')}
            size="small"
          />
          <RuleEvaluationPanel
            conflicts={evaluation.conflicts}
            error={evaluation.error}
            pending={pendingAction === 'preview'}
            preview={evaluation.preview}
          />
        </Stack>
      </DialogContent>
      <DialogActions className="gap-2 px-6 pb-5 pt-3">
        <Button disabled={pending} onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button disabled={pending} variant="outlined" onClick={testRule}>
          {t('mapping.evaluation.testRule')}
        </Button>
        <Button
          aria-busy={pendingAction === 'save'}
          disabled={pending || !onSave}
          startIcon={
            pendingAction === 'save' ? <CircularProgress color="inherit" size={16} /> : null
          }
          variant="contained"
          onClick={saveRule}
        >
          {pendingAction === 'save'
            ? t('mapping.messages.savingRule')
            : rule
              ? t('common.save')
              : t('mapping.actions.createRule')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
