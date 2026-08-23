import { useTranslation } from 'react-i18next'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { SectionCard, StatusTag } from '@/shared/ui'

import { DEFAULT_TABLE_PAGINATION } from '../../../../shared/constants/enum'
import type { ShiftAssignmentsModel } from './useShiftAssignments'

type ShiftAssignmentsProps = {
  model: ShiftAssignmentsModel
}

export function ShiftAssignments({ model }: ShiftAssignmentsProps) {
  const { t } = useTranslation()

  return (
    <SectionCard title={t('hrOperations.schedule.assignments')}>
      {model.canScheduleWrite && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={model.addAssignment}
          style={{ marginBottom: 16 }}
        >
          {t('hrOperations.schedule.assignShift')}
        </Button>
      )}

      <Table
        size="small"
        scroll={{ y: 'calc(100vh - 360px)' }}
        pagination={DEFAULT_TABLE_PAGINATION}
        rowKey="id"
        loading={model.assignments.isLoading}
        dataSource={model.assignments.data?.items}
        columns={[
          {
            title: t('hrOperations.common.employee'),
            render: (_, item) => (
              <Typography.Text strong>
                {item.employee?.fullName || item.employee?.employeeCode || item.profileId}
              </Typography.Text>
            ),
          },
          {
            title: t('hrOperations.schedule.shift'),
            render: (_, item) => <Tag color="blue">{item.shift?.name || item.shiftId}</Tag>,
          },
          {
            title: t('hrOperations.common.location'),
            render: (_, item) => (
              <Tag color="purple">{item.workLocation?.name || item.workLocationId}</Tag>
            ),
          },
          {
            title: t('hrOperations.schedule.effective'),
            render: (_, item) => (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {dayjs(item.effectiveFrom).format('DD/MM/YYYY')} →{' '}
                {item.effectiveTo ? dayjs(item.effectiveTo).format('DD/MM/YYYY') : '∞'}
              </Typography.Text>
            ),
          },
          {
            title: t('hrOperations.common.status'),
            dataIndex: 'status',
            render: (value) => (
              <StatusTag status={value === 'ACTIVE' ? 'approved' : 'cancelled'}>
                {model.statusLabel(value)}
              </StatusTag>
            ),
          },
        ]}
      />
    </SectionCard>
  )
}
