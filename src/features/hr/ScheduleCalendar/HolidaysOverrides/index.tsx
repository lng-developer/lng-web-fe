import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Row, Table, Tag } from 'antd'
import dayjs from 'dayjs'

import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard } from '@/shared/ui'

import type { Holiday } from '../../api/hrOperationsApi'
import type { HolidaysOverridesModel } from './useHolidaysOverrides'

type HolidaysOverridesProps = {
  model: HolidaysOverridesModel
}

export function HolidaysOverrides({ model }: HolidaysOverridesProps) {
  const { t } = useTranslation()

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <SectionCard title={t('hrOperations.schedule.holidays')}>
          {model.canCalendarWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={model.addHoliday}
              style={{ marginBottom: 16 }}
            >
              {t('hrOperations.schedule.addHoliday')}
            </Button>
          )}
          <Table
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.holidays.isLoading}
            dataSource={model.holidays.data?.items}
            columns={[
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'dateKey',
                render: (value: string) => (
                  <Tag color="gold">{dayjs(value).format('DD/MM/YYYY')}</Tag>
                ),
              },
              { title: t('hrOperations.common.name'), dataIndex: 'name' },
              {
                title: t('hrOperations.common.type'),
                dataIndex: 'holidayType',
                render: (value: string) => model.holidayTypeLabel(value),
              },
              ...(model.canCalendarWrite
                ? [
                    {
                      title: '',
                      width: 44,
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
        <SectionCard title={t('hrOperations.schedule.overrides')}>
          {model.canScheduleWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={model.addOverride}
              style={{ marginBottom: 16 }}
            >
              {t('hrOperations.schedule.addOverride')}
            </Button>
          )}
          <Table
            size="small"
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            rowKey="id"
            loading={model.overrides.isLoading}
            dataSource={model.overrides.data?.items}
            columns={[
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'dateKey',
                render: (value: string) => (
                  <Tag color="orange">{dayjs(value).format('DD/MM/YYYY')}</Tag>
                ),
              },
              { title: t('hrOperations.common.name'), dataIndex: 'name' },
              {
                title: t('hrOperations.common.type'),
                dataIndex: 'kind',
                render: (value: string) => model.overrideKindLabel(value),
              },
              {
                title: t('hrOperations.common.scope'),
                dataIndex: 'scopeType',
                render: (value: string) => model.scopeTypeLabel(value),
              },
            ]}
          />
        </SectionCard>
      </Col>
    </Row>
  )
}
