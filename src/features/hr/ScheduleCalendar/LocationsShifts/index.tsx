import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Row, Space, Table, Tag, Typography } from 'antd'

import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard, StatusTag } from '@/shared/ui'

import type { Shift, WorkLocation } from '../../api/hrOperationsApi'
import type { LocationsShiftsModel } from './useLocationsShifts'

type LocationsShiftsProps = {
  model: LocationsShiftsModel
}

export function LocationsShifts({ model }: LocationsShiftsProps) {
  const { t } = useTranslation()

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <SectionCard title={t('hrOperations.schedule.workLocations')}>
          {model.canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={model.addLocation}
              style={{ marginBottom: 16 }}
            >
              {t('hrOperations.schedule.addLocation')}
            </Button>
          )}
          <Table
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.locations.isLoading}
            dataSource={model.locations.data?.items}
            columns={[
              {
                title: t('hrOperations.common.location'),
                dataIndex: 'name',
                render: (value) => <Typography.Text strong>{value}</Typography.Text>,
              },
              {
                title: t('hrOperations.common.timezone'),
                dataIndex: 'timezone',
                render: (value) => <Tag color="geekblue">{value}</Tag>,
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => (
                  <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
                    {model.statusLabel(value)}
                  </StatusTag>
                ),
              },
              ...(model.canScheduleWrite
                ? [
                    {
                      title: '',
                      width: 44,
                      render: (_: unknown, item: WorkLocation) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => model.editLocation(item)}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
      </Col>

      <Col xs={24} lg={12}>
        <SectionCard title={t('hrOperations.schedule.shifts')}>
          {model.canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={model.addShift}
              style={{ marginBottom: 16 }}
            >
              {t('hrOperations.schedule.addShift')}
            </Button>
          )}
          <Table
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.shifts.isLoading}
            dataSource={model.shifts.data?.items}
            columns={[
              {
                title: t('hrOperations.schedule.shift'),
                render: (_, item: Shift) => (
                  <Space>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Tag color="default" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {item.code}
                    </Tag>
                  </Space>
                ),
              },
              {
                title: t('hrOperations.schedule.hours'),
                render: (_, item: Shift) => (
                  <Tag color="cyan">
                    {item.startTime} - {item.endTime}
                  </Tag>
                ),
              },
              {
                title: t('hrOperations.schedule.break'),
                dataIndex: 'breakMinutes',
                render: (value) => t('hrOperations.schedule.minutes', { count: value }),
              },
              ...(model.canScheduleWrite
                ? [
                    {
                      title: '',
                      width: 44,
                      render: (_: unknown, item: Shift) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => model.editShift(item)}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>
      </Col>
    </Row>
  )
}
