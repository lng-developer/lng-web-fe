import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { OrderWorkbenchItem } from '@/features/portal/orders/api/orderApi'
import { OrderItemConfirmationModal } from '@/features/portal/orders/components/OrderItemConfirmationModal'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/ui', () => ({
  CopyableSku: () => null,
  PopupModal: ({
    children,
    onOk,
    okButtonProps,
  }: {
    children: React.ReactNode
    onOk: () => void
    okButtonProps: { disabled: boolean }
  }) => (
    <div>
      {children}
      <button disabled={okButtonProps.disabled} onClick={onOk}>
        Save
      </button>
    </div>
  ),
}))
afterEach(cleanup)

it('requires a changed quantity and reason, then submits the original quantity for concurrency protection', () => {
  const onConfirm = vi.fn()
  render(
    <OrderItemConfirmationModal
      confirmation={{
        kind: 'quantity',
        item: { item: { id: 'item', quantity: 1 } } as OrderWorkbenchItem,
      }}
      pending={false}
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />,
  )
  const save = screen.getByRole('button', { name: 'Save' })
  expect(save).toBeDisabled()
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } })
  expect(save).toBeDisabled()
  fireEvent.change(screen.getByRole('textbox', { name: 'orders.fields.reason' }), {
    target: { value: ' Pack of two ' },
  })
  expect(save).toBeEnabled()
  fireEvent.click(save)
  expect(onConfirm).toHaveBeenCalledWith({
    kind: 'quantity',
    itemId: 'item',
    quantity: 2,
    expectedQuantity: 1,
    reason: 'Pack of two',
  })
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
  expect(save).toBeDisabled()
})
