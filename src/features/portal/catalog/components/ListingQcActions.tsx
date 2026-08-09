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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          background: '#f6ffed',
          borderRadius: 8,
          border: '1px solid #b7eb8f',
        }}
      >
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        <div>
          <Typography.Text strong style={{ color: '#52c41a' }}>
            Approved
          </Typography.Text>
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
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '12px 16px',
          background: '#fff2f0',
          borderRadius: 8,
          border: '1px solid #ffccc7',
        }}
      >
        <CloseCircleOutlined
          style={{ color: '#ff4d4f', fontSize: 18, flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <Typography.Text strong style={{ color: '#ff4d4f' }}>
            Rejected
          </Typography.Text>
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
      <div
        style={{
          padding: '12px 16px',
          background: '#fffbe6',
          borderRadius: 8,
          border: '1px solid #ffe58f',
          marginBottom: 12,
        }}
      >
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#faad14' }} />
          <Typography.Text style={{ color: '#ad6800' }}>
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
