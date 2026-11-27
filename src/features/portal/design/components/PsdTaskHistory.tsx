import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Popover, Spin } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { DATA_COLORS } from '@/shared/ui'
import { useDesignTaskDetailQuery } from '../hooks/useDesignTasksQuery'

type TaskHistoryItem = {
  action?: string
  status?: string
  from?: string
  to?: string
  at?: string
  createdAt?: string
}

export function PsdTaskHistory({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const detail = useDesignTaskDetailQuery(taskId, { enabled: open })
  const history = (detail.data as { history?: TaskHistoryItem[] } | undefined)?.history ?? []
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      title={t('portal.design.taskHistory')}
      arrow={false}
      content={
        detail.isPending ? (
          <Spin size="small" />
        ) : detail.isError ? (
          <Button onClick={() => void detail.refetch()}>{t('portal.design.retryHistory')}</Button>
        ) : history.length ? (
          renderHistoryContent(history)
        ) : (
          t('portal.design.noHistory')
        )
      }
    >
      <Button
        type="text"
        size="small"
        aria-label={t('portal.design.taskHistory')}
        icon={<HistoryOutlined />}
      />
    </Popover>
  )
}

function renderHistoryContent(history: TaskHistoryItem[]) {
  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
      {history.map((item, idx) => (
        <div key={idx} style={{ marginBottom: 8, minWidth: 180 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {item.from ? <span style={{ fontWeight: 500 }}>{item.from}</span> : null}
            <span style={{ color: DATA_COLORS.success, fontSize: 13 }}>➔</span>
            <span style={{ fontWeight: 500 }}>{item.to || item.action || item.status || '-'}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginLeft: 16 }}>
            {item.at
              ? dayjs(item.at).format('YYYY-MM-DD HH:mm')
              : item.createdAt
                ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')
                : '-'}
          </div>
        </div>
      ))}
    </div>
  )
}
