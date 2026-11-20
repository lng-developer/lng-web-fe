import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Row, Tag } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard } from '@/shared/ui'

import type { Holiday } from '../../api/hrOperationsApi'
import styles from './HolidaysOverrides.module.scss'
import type { HolidaysOverridesModel } from './useHolidaysOverrides'

type HolidaysOverridesProps = {
  model: HolidaysOverridesModel
}

export function HolidaysOverrides({ model }: HolidaysOverridesProps) {
  const { t } = useTranslation()

  return (
    <Row gutter={[16, 16]} className={styles.row}>
      <Col xs={24} lg={12}>
        <SectionCard
          title={t('hrOperations.schedule.holidays')}
          className={styles.tableCard}
          extra={
            model.canCalendarWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={model.addHoliday}>
                {t('hrOperations.schedule.addHoliday')}
              </Button>
            )
          }
        >
          <CoreDataTable
            size="small"
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.holidays.isLoading}
            dataSource={model.holidays.data?.items}
            fitContainer
            columns={[
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'dateKey',
                width: 130,
                align: 'center',
                render: (value: string) => (
                  <Tag color="gold">{dayjs(value).format('DD/MM/YYYY')}</Tag>
                ),
              },
              { title: t('hrOperations.common.name'), dataIndex: 'name', align: 'left' },
              {
                title: t('hrOperations.common.type'),
                dataIndex: 'holidayType',
                width: 140,
                align: 'center',
                render: (value: string) => model.holidayTypeLabel(value),
              },
              ...(model.canCalendarWrite
                ? [
                    {
                      title: '',
                      width: 48,
                      align: 'center' as const,
                      render: (_: unknown, item: Holiday) => (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => model.editHoliday(item)}
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
          title={t('hrOperations.schedule.overrides')}
          className={styles.tableCard}
          extra={
            model.canScheduleWrite && (
              <Button type="primary" icon={<PlusOutlined />} onClick={model.addOverride}>
                {t('hrOperations.schedule.addOverride')}
              </Button>
            )
          }
        >
          <CoreDataTable
            size="small"
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.overrides.isLoading}
            dataSource={model.overrides.data?.items}
            fitContainer
            columns={[
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'dateKey',
                width: 130,
                align: 'center',
                render: (value: string) => (
                  <Tag color="orange">{dayjs(value).format('DD/MM/YYYY')}</Tag>
                ),
              },
              { title: t('hrOperations.common.name'), dataIndex: 'name', align: 'left' },
              {
                title: t('hrOperations.common.type'),
                dataIndex: 'kind',
                width: 130,
                align: 'center',
                render: (value: string) => model.overrideKindLabel(value),
              },
              {
                title: t('hrOperations.common.scope'),
                dataIndex: 'scopeType',
                width: 130,
                align: 'center',
                render: (value: string) => model.scopeTypeLabel(value),
              },
            ]}
          />
        </SectionCard>
      </Col>
    </Row>
  )
}
