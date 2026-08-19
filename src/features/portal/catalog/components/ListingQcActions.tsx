import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Modal, Space, Tooltip, Typography } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import { approveListing, type Listing, rejectListing } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './ListingQcActions.module.scss'

interface ListingQcActionsProps {
  listing: Listing
  canWrite: boolean
}

export function ListingQcActions({ listing, canWrite }: ListingQcActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const approve = useMutation({
    mutationFn: () => approveListing(listing.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      toast('success', t('portal.catalog.qc.approvedToast'))
    },
    onError: (err) =>
      toast('error', err instanceof Error ? err.message : t('portal.catalog.qc.approveFailed')),
  })

  const reject = useMutation({
    mutationFn: (reason: string) => rejectListing(listing.id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      setRejectOpen(false)
      setRejectReason('')
      toast('success', t('portal.catalog.qc.rejectedToast'))
    },
    onError: (err) =>
      toast('error', err instanceof Error ? err.message : t('portal.catalog.qc.rejectFailed')),
  })

  if (!canWrite) return null

  if (listing.qcStatus === 'APPROVED') {
    return (
      <div className={`${styles.notice} ${styles.approved}`}>
        <CheckCircleOutlined className={styles.noticeIcon} />
        <div>
          <Typography.Text strong>{t('portal.catalog.qc.approved')}</Typography.Text>
          {listing.approvedAt ? (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {new Date(listing.approvedAt).toLocaleString()}
            </Typography.Text>
          ) : null}
        </div>
      </div>
    )
  }

  if (listing.qcStatus === 'REJECTED') {
    return (
      <div className={`${styles.notice} ${styles.rejected}`}>
        <CloseCircleOutlined className={styles.noticeIcon} />
        <div>
          <Typography.Text strong>{t('portal.catalog.qc.rejected')}</Typography.Text>
          {listing.rejectionReason ? (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {listing.rejectionReason}
            </Typography.Text>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`${styles.notice} ${styles.draft}`}>
        <Space size={4}>
          <ClockCircleOutlined className={styles.noticeIcon} />
          <Typography.Text>
            {t('portal.catalog.qc.draftPrefix')} <strong>DRAFT</strong>{' '}
            {t('portal.catalog.qc.draftSuffix')}
          </Typography.Text>
        </Space>
      </div>
      <Space size={12}>
        <Tooltip title={t('portal.catalog.qc.approveTooltip')}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={approve.isPending}
            onClick={() =>
              Modal.confirm({
                title: t('portal.catalog.qc.approveConfirmTitle'),
                content: t('portal.catalog.qc.approveConfirmContent', { sku: listing.sku }),
                okText: t('portal.catalog.approve'),
                okButtonProps: { style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } },
                onOk: () => approve.mutate(),
              })
            }
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: 120 }}
          >
            {t('portal.catalog.approve')}
          </Button>
        </Tooltip>
        <Tooltip title={t('portal.catalog.qc.rejectTooltip')}>
          <Button
            danger
            size="large"
            icon={<CloseCircleOutlined />}
            onClick={() => setRejectOpen(true)}
            style={{ minWidth: 120 }}
          >
            {t('portal.catalog.reject')}
          </Button>
        </Tooltip>
      </Space>

      <Modal
        open={rejectOpen}
        title={
          <Space>
            <FileTextOutlined />
            {t('portal.catalog.qc.rejectTitle', { sku: listing.sku })}
          </Space>
        }
        onCancel={() => {
          setRejectOpen(false)
          setRejectReason('')
        }}
        onOk={() => reject.mutate(rejectReason)}
        okButtonProps={{ danger: true, disabled: !rejectReason.trim(), loading: reject.isPending }}
        okText={t('portal.catalog.qc.confirmRejection')}
        destroyOnClose
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('portal.catalog.qc.rejectDescription')}
        </Typography.Text>
        <Input.TextArea
          rows={4}
          placeholder={t('portal.catalog.qc.rejectPlaceholder')}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  )
}
