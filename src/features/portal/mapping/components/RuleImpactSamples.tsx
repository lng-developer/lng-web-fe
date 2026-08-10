import { useTranslation } from 'react-i18next'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Flex, List, Tag, Typography } from 'antd'

import type { RuleConflictResult, RulePreviewResult } from '../api/mappingApi'

function sampleDetails(item: Record<string, unknown>): Array<[string, unknown]> {
  const details: Array<[string, unknown]> = [
    ['Config', item.configCode],
    ['Product group', item.productTypeGroupId],
    ['Template', item.internalTemplateId],
    ['Product type', item.platformProductType],
    ['Role', item.semanticRole],
    ['Match', item.matchValue],
    ['Normalized', item.normalizedValue],
    ['Vendor', item.vendorId],
  ]
  return details.filter(([, value]) => value != null && value !== '')
}

export function RuleImpactSamples({
  conflicts,
  preview,
}: {
  readonly conflicts?: RuleConflictResult
  readonly preview?: RulePreviewResult
}) {
  const { t } = useTranslation()
  const errors = conflicts?.hasExactConflict
    ? [{ severity: 'ERROR' as const, message: t('mapping.feedback.exactConflict') }]
    : (conflicts?.errors ?? conflicts?.conflicts?.filter((item) => item.severity === 'ERROR') ?? [])
  const warnings =
    conflicts?.warnings ?? conflicts?.conflicts?.filter((item) => item.severity === 'WARNING') ?? []
  const items = preview?.samples ?? preview?.items ?? []

  return (
    <Flex vertical gap={10} style={{ marginTop: 12, marginBottom: 4 }}>
      {errors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          message={t('mapping.feedback.exactConflict')}
          description={
            errors.length > 1 ? (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {errors.map((e, i) => (
                  <li key={i} style={{ fontSize: 12 }}>
                    {'message' in e ? String(e.message) : JSON.stringify(e)}
                  </li>
                ))}
              </ul>
            ) : undefined
          }
        />
      ) : null}

      {warnings.length > 0 && !errors.length ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={t('mapping.feedback.scopeOverlap')}
          description={
            warnings.length > 1 ? (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {warnings.map((w, i) => (
                  <li key={i} style={{ fontSize: 12 }}>
                    {'message' in w ? String(w.message) : JSON.stringify(w)}
                  </li>
                ))}
              </ul>
            ) : undefined
          }
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <Flex align="center" gap={6}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('mapping.states.sampled')} - {items.length} sample{items.length > 1 ? 's' : ''}
            </Typography.Text>
          </Flex>
          <List
            size="small"
            dataSource={items}
            style={{
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: '4px 0',
            }}
            renderItem={(item, index) => (
              <List.Item style={{ padding: '8px 12px', alignItems: 'flex-start' }}>
                <Flex vertical gap={6} style={{ width: '100%' }}>
                  <Flex align="center" gap={8} wrap="wrap" style={{ width: '100%' }}>
                    <Tag
                      color="default"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {String(item.input ?? item.sku ?? item.orderItemId ?? `item ${index + 1}`)}
                    </Tag>
                    <ArrowRightOutlined style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }} />
                    <Tag
                      color={item.matched ? 'green' : 'default'}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    >
                      {item.matched ? String(item.output ?? item.result ?? 'matched') : 'No match'}
                    </Tag>
                  </Flex>
                  {sampleDetails(item).length ? (
                    <Flex gap={6} wrap="wrap">
                      {sampleDetails(item).map(([label, value]) => (
                        <Tag key={label} color="blue" style={{ marginInlineEnd: 0 }}>
                          {label}: {String(value)}
                        </Tag>
                      ))}
                    </Flex>
                  ) : null}
                </Flex>
              </List.Item>
            )}
          />
        </>
      ) : null}
    </Flex>
  )
}
