import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
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

      <CoreDataTable
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
          ...(model.canScheduleWrite
            ? [
                {
                  title: t('hrOperations.common.action'),
                  align: 'right' as const,
                  width: 96,
                  onHeaderCell: () => ({ style: { textAlign: 'right' as const, width: 96 } }),
                  render: (_: unknown, item: Parameters<typeof model.editAssignment>[0]) => (
                    <Space size={2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title={t('hrOperations.schedule.editAssignment')}>
                        <Button
                          type="text"
                          aria-label={t('hrOperations.schedule.editAssignment')}
                          icon={<EditOutlined />}
                          onClick={() => model.editAssignment(item)}
                        />
                      </Tooltip>
                      {item.status === 'ACTIVE' && (
                        <Popconfirm
                          title={t('hrOperations.schedule.deactivateAssignmentConfirm')}
                          okText={t('hrOperations.schedule.deactivateAssignment')}
                          cancelText={t('hrOperations.common.cancel')}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => model.deactivateAssignment(item)}
                        >
                          <Tooltip title={t('hrOperations.schedule.deactivateAssignment')}>
                            <Button
                              type="text"
                              danger
                              aria-label={t('hrOperations.schedule.deactivateAssignment')}
                              icon={<StopOutlined />}
                              loading={model.deactivatingAssignmentId === item.id}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
    </SectionCard>
  )
}
