import { useState } from 'react'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Space, Tooltip, Typography } from 'antd'
import { Input, Modal } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import { approveListing, type Listing, rejectListing } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './ListingQcActions.module.scss'

interface ListingQcActionsProps {
  listing: Listing
  canWrite: boolean
}

export function ListingQcActions({ listing, canWrite }: ListingQcActionsProps) {
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const approve = useMutation({
    mutationFn: () => approveListing(listing.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      toast('success', 'Listing approved successfully')
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Could not approve'),
  })

  const reject = useMutation({
    mutationFn: (reason: string) => rejectListing(listing.id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      setRejectOpen(false)
      setRejectReason('')
      toast('success', 'Listing rejected')
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Could not reject'),
  })

  if (!canWrite) return null

  if (listing.qcStatus === 'APPROVED') {
    return (
      <div className={`${styles.notice} ${styles.approved}`}>
        <CheckCircleOutlined className={styles.noticeIcon} />
        <div>
          <Typography.Text strong>Approved</Typography.Text>
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
          <Typography.Text strong>Rejected</Typography.Text>
          {listing.rejectionReason ? (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {listing.rejectionReason}
            </Typography.Text>
          ) : null}
        </div>
      </div>
    )
  }

  // DRAFT — show action buttons
  return (
    <>
      <div className={`${styles.notice} ${styles.draft}`}>
        <Space size={4}>
          <ClockCircleOutlined className={styles.noticeIcon} />
          <Typography.Text>
            This listing is in <strong>DRAFT</strong> — it will not receive orders until approved.
          </Typography.Text>
        </Space>
      </div>
      <Space size={12}>
        <Tooltip title="Mark this listing as ready for production">
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={approve.isPending}
            onClick={() =>
              Modal.confirm({
                title: 'Approve listing?',
                content: `SKU: ${listing.sku} will be set to APPROVED and become eligible for order matching.`,
                okText: 'Approve',
                okButtonProps: { style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } },
                onOk: () => approve.mutate(),
              })
            }
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: 120 }}
          >
            Approve
          </Button>
        </Tooltip>
        <Tooltip title="Reject with reason">
          <Button
            danger
            size="large"
            icon={<CloseCircleOutlined />}
            onClick={() => setRejectOpen(true)}
            style={{ minWidth: 120 }}
          >
            Reject
          </Button>
        </Tooltip>
      </Space>

      <Modal
        open={rejectOpen}
        title={
          <Space>
            <FileTextOutlined />
            Reject Listing — {listing.sku}
          </Space>
        }
        onCancel={() => {
          setRejectOpen(false)
          setRejectReason('')
        }}
        onOk={() => reject.mutate(rejectReason)}
        okButtonProps={{ danger: true, disabled: !rejectReason.trim(), loading: reject.isPending }}
        okText="Confirm Rejection"
        destroyOnClose
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Provide a clear reason so the responsible team can address the issue.
        </Typography.Text>
        <Input.TextArea
          rows={4}
          placeholder="e.g. Missing artwork slot configuration, incorrect SKU format..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  )
}
