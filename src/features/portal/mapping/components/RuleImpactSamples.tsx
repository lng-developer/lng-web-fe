import { useTranslation } from 'react-i18next'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Flex, List, Tag, Typography } from 'antd'

import type { RuleConflictResult, RulePreviewResult } from '../api/mappingApi'

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

  const items = preview?.items ?? []

  return (
    <Flex vertical gap={10} style={{ marginTop: 12, marginBottom: 4 }}>
      {/* Conflict errors */}
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

      {/* Conflict warnings */}
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

      {/* Preview impact samples */}
      {items.length > 0 ? (
        <>
          <Flex align="center" gap={6}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('mapping.states.sampled')} — {items.length} sample{items.length > 1 ? 's' : ''}
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
              <List.Item style={{ padding: '6px 12px', alignItems: 'flex-start' }}>
                <Flex align="center" gap={8} wrap="wrap" style={{ width: '100%' }}>
                  {/* Input */}
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
                    {String(item.sku ?? item.orderItemId ?? `item ${index + 1}`)}
                  </Tag>
                  <ArrowRightOutlined style={{ color: '#8c8c8c', fontSize: 12, flexShrink: 0 }} />
                  {/* Output */}
                  <Tag
                    color={item.output != null ? 'green' : 'default'}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  >
                    {String(item.output ?? item.result ?? '—')}
                  </Tag>
                </Flex>
              </List.Item>
            )}
          />
        </>
      ) : null}
    </Flex>
  )
}
