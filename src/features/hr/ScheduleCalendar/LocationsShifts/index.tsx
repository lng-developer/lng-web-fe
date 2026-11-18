import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Row, Space, Tag, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard, StatusTag } from '@/shared/ui'

import type { Shift, WorkLocation } from '../../api/hrOperationsApi'
import styles from './LocationsShifts.module.scss'
import type { LocationsShiftsModel } from './useLocationsShifts'

type LocationsShiftsProps = {
  model: LocationsShiftsModel
}

export function LocationsShifts({ model }: LocationsShiftsProps) {
  const { t } = useTranslation()

  return (
    <Row gutter={[16, 16]} className={styles.row}>
      <Col xs={24} lg={12}>
        <SectionCard
          title={t('hrOperations.schedule.workLocations')}
          className={styles.tableCard}
          extra={
            model.canScheduleWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={model.addLocation}>
                {t('hrOperations.schedule.addLocation')}
              </Button>
            )
          }
        >
          <CoreDataTable
            size="small"
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.locations.isLoading}
            dataSource={model.locations.data?.items}
            fitContainer
            columns={[
              {
                title: t('hrOperations.common.location'),
                dataIndex: 'name',
                align: 'left',
                render: (value) => <Typography.Text strong>{value}</Typography.Text>,
              },
              {
                title: t('hrOperations.common.timezone'),
                dataIndex: 'timezone',
                width: 170,
                align: 'center',
                render: (value) => <Tag color="geekblue">{value}</Tag>,
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                width: 135,
                align: 'center',
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
                      width: 48,
                      align: 'center' as const,
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
        <SectionCard
          title={t('hrOperations.schedule.shifts')}
          className={styles.tableCard}
          extra={
            model.canScheduleWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={model.addShift}>
                {t('hrOperations.schedule.addShift')}
              </Button>
            )
          }
        >
          <CoreDataTable
            size="small"
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.shifts.isLoading}
            dataSource={model.shifts.data?.items}
            fitContainer
            columns={[
              {
                title: t('hrOperations.schedule.shift'),
                align: 'left',
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
                width: 150,
                align: 'center',
                render: (_, item: Shift) => (
                  <Tag color="cyan">
                    {item.startTime} - {item.endTime}
                  </Tag>
                ),
              },
              {
                title: t('hrOperations.schedule.break'),
                dataIndex: 'breakMinutes',
                width: 110,
                align: 'center',
                render: (value) => t('hrOperations.schedule.minutes', { count: value }),
              },
              ...(model.canScheduleWrite
                ? [
                    {
                      title: '',
                      width: 48,
                      align: 'center' as const,
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
