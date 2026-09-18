import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Progress, Select, Space, Switch, Table, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import { FeedbackAlert, SectionCard } from '@/shared/ui'

import type { ExtensionManagementAgent } from '../../api/integrationApi'
import type { ImageJob } from '../api/listingImageApi'
import { useListingImageSync } from '../api/useListingImageSync'

export default function ListingImageSyncPanel({
  account,
  agents,
  shopNames,
}: {
  account: CurrentAccount
  agents: ExtensionManagementAgent[]
  shopNames: Map<string, string>
}) {
  const { t } = useTranslation()
  const key = 'listingImageSync.'
  const permission = (shopId: string, mode: 'READ' | 'WRITE') =>
    canUseScopedPermission(account, `CATALOG:${mode}`, { scopeType: 'shop', scopeId: shopId })
  const visibleAgents = agents.filter(
    (agent) => permission(agent.shopId, 'READ') || permission(agent.shopId, 'WRITE'),
  )
  const [agentId, setAgentId] = useState<string>()
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(false)
  const selected = visibleAgents.find((agent) => agent.id === agentId) || visibleAgents[0]
  const state = useListingImageSync(visibleAgents.length > 0, page)
  if (!visibleAgents.length) return null
  const schedule = state.schedules.data?.items.find((value) => value.agentId === selected?.id)
  const writable = !!selected && permission(selected.shopId, 'WRITE')
  const ready = selected?.status === 'ONLINE' && selected?.listingImageSync === true
  const busy = state.save.isPending || state.create.isPending || state.action.isPending
  const error =
    state.save.error ||
    state.create.error ||
    state.action.error ||
    state.schedules.error ||
    state.jobs.error
  const act = (job: ImageJob, action: 'pause' | 'resume' | 'retry') =>
    state.action.mutate({ jobId: job.id, action })
  return (
    <SectionCard title={t(`${key}title`)}>
      <Space orientation="vertical" className="w-full" size="middle">
        <Typography.Paragraph>{t(`${key}description`)}</Typography.Paragraph>
        {error ? <FeedbackAlert type="error" title={error.message} /> : null}
        <Space wrap>
          <Select
            aria-label={t(`${key}agent`)}
            value={selected?.id}
            onChange={setAgentId}
            className="min-w-64"
            options={visibleAgents.map((agent) => ({
              value: agent.id,
              label: `${shopNames.get(agent.shopId) || agent.shopId} / ${agent.label}`,
            }))}
          />
          {writable ? (
            <>
              <Switch
                aria-label={t(`${key}schedule`)}
                checked={schedule?.enabled ?? false}
                loading={state.save.isPending}
                disabled={
                  busy ||
                  state.schedules.isLoading ||
                  (!selected?.listingImageSync && !schedule?.enabled)
                }
                onChange={(enabled) => state.save.mutate({ agentId: selected!.id, enabled })}
              />
              <Typography.Text>{t(`${key}schedule`)}</Typography.Text>
              <Button
                disabled={!ready || busy || state.jobs.isLoading}
                onClick={() => setConfirm(true)}
              >
                {t(`${key}request`)}
              </Button>
            </>
          ) : null}
        </Space>
        {!selected?.listingImageSync ? (
          <FeedbackAlert type="warning" title={t(`${key}upgrade`)} />
        ) : selected.status !== 'ONLINE' ? (
          <FeedbackAlert type="info" title={t(`${key}offline`)} />
        ) : null}
        {schedule?.lastError ? <FeedbackAlert type="warning" title={schedule.lastError} /> : null}
        {schedule?.enabled ? (
          <Typography.Text type="secondary">
            {t(`${key}next`, { time: new Date(schedule.nextRunAt).toLocaleString() })}
          </Typography.Text>
        ) : null}
        <Table<ImageJob>
          rowKey="id"
          size="small"
          loading={state.jobs.isLoading}
          dataSource={state.jobs.data?.items || []}
          scroll={{ x: true }}
          pagination={{
            current: page,
            pageSize: 10,
            total: state.jobs.data?.total || 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          columns={[
            {
              title: t(`${key}shop`),
              key: 'shop',
              render: (_, job) => shopNames.get(job.shopId) || job.shopId,
            },
            {
              title: t(`${key}status`),
              dataIndex: 'status',
              render: (status: string) => t(`${key}statuses.${status}`),
            },
            {
              title: t(`${key}progress`),
              key: 'progress',
              render: (_, job) => (
                <div className="min-w-36">
                  <span>
                    {job.processed} / {job.total}
                  </span>
                  <Progress
                    percent={job.total ? Math.floor((job.processed / job.total) * 100) : 0}
                    showInfo={false}
                    status={job.status === 'PAUSED' ? 'exception' : undefined}
                  />
                </div>
              ),
            },
            {
              title: t(`${key}results`),
              key: 'results',
              render: (_, job) => (
                <>
                  <Typography.Text>
                    {t(`${key}counts`, {
                      updated: job.updated,
                      unchanged: job.unchanged,
                      skipped: job.skipped,
                      failed: job.failed,
                    })}
                  </Typography.Text>
                  {job.errorMessage ? (
                    <div>
                      <Typography.Text type="danger">{job.errorMessage}</Typography.Text>
                    </div>
                  ) : null}
                </>
              ),
            },
            {
              title: t(`${key}actions`),
              key: 'actions',
              render: (_, job) =>
                permission(job.shopId, 'WRITE') ? (
                  <Space>
                    {['QUEUED', 'RUNNING'].includes(job.status) ? (
                      <Button size="small" disabled={busy} onClick={() => act(job, 'pause')}>
                        {t(`${key}pause`)}
                      </Button>
                    ) : null}
                    {job.status === 'PAUSED' ? (
                      <Button
                        size="small"
                        disabled={
                          busy ||
                          !agents.some(
                            (agent) =>
                              agent.id === job.agentId &&
                              agent.status === 'ONLINE' &&
                              agent.listingImageSync,
                          )
                        }
                        onClick={() => act(job, 'resume')}
                      >
                        {t(`${key}resume`)}
                      </Button>
                    ) : null}
                    {job.failed > 0 && ['PAUSED', 'COMPLETED_WITH_ERRORS'].includes(job.status) ? (
                      <Button
                        size="small"
                        disabled={
                          busy ||
                          !agents.some(
                            (agent) =>
                              agent.id === job.agentId &&
                              agent.status === 'ONLINE' &&
                              agent.listingImageSync,
                          )
                        }
                        onClick={() => act(job, 'retry')}
                      >
                        {t(`${key}retry`)}
                      </Button>
                    ) : null}
                  </Space>
                ) : null,
            },
          ]}
        />
      </Space>
      <Modal
        title={t(`${key}request`)}
        open={confirm}
        onCancel={() => setConfirm(false)}
        okText={t(`${key}start`)}
        cancelText={t('portal.integrations.cancel')}
        confirmLoading={state.create.isPending}
        okButtonProps={{ disabled: !ready || !writable }}
        onOk={() => {
          if (selected && ready && writable)
            state.create.mutate(
              { agentId: selected.id, shopId: selected.shopId },
              { onSuccess: () => setConfirm(false) },
            )
        }}
      >
        <Typography.Paragraph>{t(`${key}confirm`)}</Typography.Paragraph>
      </Modal>
    </SectionCard>
  )
}
