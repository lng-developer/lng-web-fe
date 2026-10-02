import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Modal, Select, Space, Table, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { StatusTag, useFeedbackToast } from '@/shared/ui'

import {
  assignDesignRequest,
  type DesignRequest,
  type DesignRequestStatus,
  listDesignAssignees,
  listDesignRequests,
  updateDesignRequestStatus,
} from '../api/designApi'
import { designKeys } from '../api/designKeys'

const nextStatus = (status: DesignRequestStatus): DesignRequestStatus | undefined =>
  status === 'ASSIGNED' ? 'IN_PROGRESS' : status === 'IN_PROGRESS' ? 'COMPLETED' : undefined

const statusTone = (status: DesignRequestStatus) =>
  status === 'COMPLETED'
    ? 'approved'
    : status === 'CANCELLED'
      ? 'cancelled'
      : status === 'IN_PROGRESS'
        ? 'processing'
        : 'pending'

export function DesignRequestsPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loaded = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loaded
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [requestToAssign, setRequestToAssign] = useState<DesignRequest>()
  const [assigneeId, setAssigneeId] = useState<string>()
  const permissions = useMemo(
    () =>
      new Set([
        ...(account?.permissions ?? []),
        ...(account?.scopes ?? []).flatMap((scope) => scope.permissions),
      ]),
    [account?.permissions, account?.scopes],
  )
  const canAssign = permissions.has('DESIGN:REQUEST_ASSIGN')
  const canWork = permissions.has('DESIGN:REQUEST_WORK')
  const requests = useQuery({
    queryKey: designKeys.requests(),
    queryFn: listDesignRequests,
    retry: false,
  })
  const assignees = useQuery({
    queryKey: designKeys.assignees(),
    queryFn: listDesignAssignees,
    enabled: canAssign && Boolean(requestToAssign),
    staleTime: 60_000,
    retry: false,
  })
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: designKeys.requests() }),
    [queryClient],
  )
  const recoverForbidden = useCallback(
    async (error: unknown) => {
      if ((error as { response?: { status?: number } })?.response?.status === 403) {
        setRequestToAssign(undefined)
        setAssigneeId(undefined)
        await refresh()
      }
      toast(
        'error',
        error instanceof Error ? error.message : t('portal.design.requests.updateFailed'),
      )
    },
    [refresh, t, toast],
  )
  const assign = useMutation({
    mutationFn: () => assignDesignRequest(requestToAssign!.id, assigneeId!),
    onSuccess: async () => {
      setRequestToAssign(undefined)
      setAssigneeId(undefined)
      await refresh()
      toast('success', t('portal.design.requests.assigned'))
    },
    onError: recoverForbidden,
  })
  const transition = useMutation({
    mutationFn: (request: DesignRequest) =>
      updateDesignRequestStatus(request.id, nextStatus(request.status)!),
    onSuccess: refresh,
    onError: recoverForbidden,
  })
  const columns = useMemo<TableColumnsType<DesignRequest>>(
    () => [
      {
        title: t('portal.design.requests.orderItem'),
        key: 'reference',
        render: (_, request) => request.listingSnapshot?.sku ?? request.orderItemId ?? '—',
      },
      {
        title: t('portal.design.requests.listing'),
        key: 'listing',
        render: (_, request) => request.listingSnapshot?.title ?? '—',
      },
      {
        title: t('portal.design.requests.status'),
        dataIndex: 'status',
        render: (status: DesignRequestStatus) => (
          <StatusTag status={statusTone(status)}>{status}</StatusTag>
        ),
      },
      {
        title: t('portal.design.requests.actions'),
        key: 'actions',
        render: (_, request) => {
          const transitionStatus = nextStatus(request.status)
          return (
            <Space size="small">
              {canAssign && !['COMPLETED', 'CANCELLED'].includes(request.status) ? (
                <Button size="small" onClick={() => setRequestToAssign(request)}>
                  {t('portal.design.requests.assign')}
                </Button>
              ) : null}
              {canWork && transitionStatus ? (
                <Button
                  size="small"
                  type="primary"
                  loading={transition.isPending && transition.variables?.id === request.id}
                  onClick={() => transition.mutate(request)}
                >
                  {t(
                    transitionStatus === 'IN_PROGRESS'
                      ? 'portal.design.requests.start'
                      : 'portal.design.requests.complete',
                  )}
                </Button>
              ) : null}
            </Space>
          )
        },
      },
    ],
    [canAssign, canWork, t, transition],
  )
  const assigneeOptions = useMemo(
    () =>
      (assignees.data ?? []).map(({ id, fullName, name }) => ({
        value: id,
        label: fullName ?? name ?? id,
      })),
    [assignees.data],
  )

  return (
    <section>
      <Typography.Title level={3}>{t('portal.design.requests.title')}</Typography.Title>
      <Typography.Paragraph>{t('portal.design.requests.description')}</Typography.Paragraph>
      <Table
        columns={columns}
        dataSource={requests.data ?? []}
        loading={requests.isLoading}
        pagination={false}
        rowKey="id"
      />
      <Modal
        open={Boolean(requestToAssign)}
        title={t('portal.design.requests.assign')}
        okButtonProps={{ disabled: !assigneeId, loading: assign.isPending }}
        okText={t('portal.design.requests.assign')}
        onCancel={() => {
          setRequestToAssign(undefined)
          setAssigneeId(undefined)
        }}
        onOk={() => assign.mutate()}
      >
        <Select
          aria-label={t('portal.design.requests.designer')}
          loading={assignees.isLoading}
          options={assigneeOptions}
          placeholder={t('portal.design.requests.designer')}
          value={assigneeId}
          onChange={setAssigneeId}
        />
      </Modal>
    </section>
  )
}
