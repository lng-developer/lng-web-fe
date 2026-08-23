import { useTranslation } from 'react-i18next'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard } from '@/shared/ui'

import type { SaturdayRotation as SaturdayRotationItem } from '../../api/hrOperationsApi'
import styles from './SaturdayRotation.module.scss'
import type { SaturdayRotationModel } from './useSaturdayRotation'

type SaturdayRotationProps = {
  model: SaturdayRotationModel
}

export function SaturdayRotation({ model }: SaturdayRotationProps) {
  const { t } = useTranslation()

  return (
    <SectionCard title={t('hrOperations.schedule.saturday')}>
      <div className={styles.rotationCommand}>
        <div>
          <Typography.Text className={styles.rotationEyebrow}>
            {t('hrOperations.schedule.rotationPlanner')}
          </Typography.Text>
          <Typography.Paragraph type="secondary" className={styles.rotationHint}>
            {t('hrOperations.schedule.saturdayRotationHint')}
          </Typography.Paragraph>
        </div>

        {model.canRotationRead && (
          <Select
            allowClear
            showSearch
            className={styles.rotationTeamFilter}
            value={model.rotationTeamId}
            onChange={model.setRotationTeamId}
            options={model.teamOptions}
            placeholder={t('hrOperations.schedule.filterTeam')}
          />
        )}
      </div>

      <Space size={8} className={styles.rotationActions} wrap>
        {model.canManageRotation && (
          <>
            <Button type="primary" icon={<PlusOutlined />} onClick={model.generateMonth}>
              {t('hrOperations.schedule.generateMonth')}
            </Button>
            <Button icon={<PlusOutlined />} onClick={model.addRotation}>
              {t('hrOperations.schedule.addRotation')}
            </Button>
            <Popconfirm
              title={t('hrOperations.schedule.resetMonthRotationConfirm')}
              onConfirm={() => model.resetMonthRotation.mutate()}
              okText={t('hrOperations.common.yes')}
              cancelText={t('hrOperations.common.no')}
            >
              <Button
                danger
                loading={model.resetMonthRotation.isPending}
                disabled={!model.rotationTeamId}
              >
                {t('hrOperations.schedule.resetMonthRotation')}
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>

      <Table
        size="small"
        scroll={{ y: 'calc(100vh - 360px)' }}
        pagination={DEFAULT_TABLE_PAGINATION}
        rowKey="id"
        loading={model.rotations.isLoading}
        dataSource={model.rotations.data?.items}
        columns={[
          {
            title: t('hrOperations.common.date'),
            dataIndex: 'dateKey',
            render: (value) => <Tag color="blue">{dayjs(value).format('DD/MM/YYYY')}</Tag>,
          },
          {
            title: t('hrOperations.common.team'),
            dataIndex: 'teamId',
            render: (teamId: string) => model.teamName(teamId),
          },
          {
            title: t('hrOperations.schedule.staffCount'),
            render: (_: unknown, item: SaturdayRotationItem) => (
              <Tag color="orange">{item.employeeProfileIds.length}</Tag>
            ),
          },
          {
            title: t('hrOperations.schedule.sourceLabel'),
            dataIndex: 'source',
            render: (source: string) => (
              <Tag color={source === 'MANUAL' ? 'gold' : 'blue'}>
                {model.rotationSourceLabel(source)}
              </Tag>
            ),
          },
          {
            title: t('hrOperations.schedule.minPresent'),
            dataIndex: 'minPresent',
            render: (value: number) => <Tag color="purple">{value}</Tag>,
          },
          {
            title: t('hrOperations.schedule.restingStaff'),
            render: (_: unknown, item: SaturdayRotationItem) => {
              const visible = item.employeeProfileIds.slice(0, 3)
              const rest = item.employeeProfileIds.length - visible.length

              return (
                <Space size={4} wrap>
                  {visible.map((id) => (
                    <Tag key={id} color="default">
                      {model.employeeNameById.get(id) ?? id}
                    </Tag>
                  ))}
                  {rest > 0 && <Tag color="processing">+{rest}</Tag>}
                </Space>
              )
            },
          },
          ...(model.canManageRotation
            ? [
                {
                  title: t('hrOperations.common.action'),
                  width: 120,
                  render: (_: unknown, item: SaturdayRotationItem) => (
                    <Space size={6}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => model.editRotation(item)}
                      />
                      <Popconfirm
                        title={t('hrOperations.schedule.deleteRotation')}
                        onConfirm={() => model.removeRotation.mutate(item.id)}
                        okText={t('hrOperations.common.yes')}
                        cancelText={t('hrOperations.common.no')}
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          danger
                          loading={model.removeRotation.isPending}
                        />
                      </Popconfirm>
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
