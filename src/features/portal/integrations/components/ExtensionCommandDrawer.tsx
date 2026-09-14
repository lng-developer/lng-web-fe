import { Alert, Modal, Space, Typography } from 'antd'

import { FormattedDateTime, StatusTag } from '@/shared/ui'

import type { ExtensionCommand } from '../api/integrationApi'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

export interface ExtensionCommandDrawerProps {
  readonly command?: ExtensionCommand
  readonly onClose: () => void
}

export function ExtensionCommandDrawer({ command, onClose }: ExtensionCommandDrawerProps) {
  return (
    <Modal
      title="Task details"
      open={Boolean(command)}
      onCancel={onClose}
      footer={null}
      width="min(1000px, 85vw)"
      style={{ top: 40 }}
      destroyOnClose
    >
      {command ? (
        <div className={styles.commandTimeline}>
          <Space>
            <StatusTag
              status={
                command.status === 'SUCCEEDED'
                  ? 'operational'
                  : command.status === 'FAILED'
                    ? 'critical'
                    : 'pending'
              }
            >
              {command.status}
            </StatusTag>
            <Typography.Text>{command.type}</Typography.Text>
          </Space>
          {[
            ['Created', command.createdAt],
            ['Claimed', command.claimedAt],
            ['Started', command.startedAt],
            [
              command.status === 'FAILED'
                ? 'Failed'
                : command.status === 'SUCCEEDED'
                  ? 'Completed'
                  : 'Last update',
              command.completedAt,
            ],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div className={styles.commandTimelineRow} key={String(label)}>
                <Typography.Text strong>{label}</Typography.Text>
                <FormattedDateTime value={String(value)} />
              </div>
            ))}
          {command.errorMessage ? (
            <Alert type="error" showIcon title={command.errorMessage} />
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
