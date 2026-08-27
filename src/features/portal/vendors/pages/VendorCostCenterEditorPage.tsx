import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Typography } from 'antd'

import { getVendorProduct, type VendorCostCenter } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorCostCenterEditorModal } from './VendorCostCenterEditorModal'

type EditorLocationState = { costCenter?: VendorCostCenter; productId?: string } | null

export function VendorCostCenterEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { costCenterId, productId } = useParams<{ productId: string; costCenterId?: string }>()
  const isNew = !costCenterId
  const [isEditing, setIsEditing] = useState(isNew || location.pathname.endsWith('/edit'))
  const stateItem = (location.state as EditorLocationState)?.costCenter
  const stateProductId = (location.state as EditorLocationState)?.productId
  const resolvedProductId = productId ?? stateProductId ?? stateItem?.vendorProductId

  const product = useQuery({
    queryKey: resolvedProductId
      ? vendorKeys.product(resolvedProductId)
      : ['portal', 'vendors', 'products', 'missing'],
    queryFn: () => getVendorProduct(resolvedProductId!),
    enabled: Boolean(resolvedProductId),
    retry: false,
  })
  const item = stateItem
  const backToCostCenters = () =>
    navigate(`/portal/vendors/products/${resolvedProductId}/cost-centers`)
  const leaveOrDiscardEdit = () => {
    if (isNew || !isEditing) backToCostCenters()
    else setIsEditing(false)
  }

  if (!resolvedProductId || product.isError || (!isNew && !item)) {
    return <Typography.Text type="danger">{t('portal.vendors.branchUnavailable')}</Typography.Text>
  }

  if (!product.data || (!isNew && !item)) return null

  return (
    <VendorCostCenterEditorModal
      item={item}
      mode="page"
      open
      productId={product.data.id}
      vendorId={product.data.vendor?.id ?? ''}
      readOnly={!isEditing}
      onEdit={() => setIsEditing(true)}
      onCancel={leaveOrDiscardEdit}
      onSaved={() => setIsEditing(false)}
    />
  )
}
