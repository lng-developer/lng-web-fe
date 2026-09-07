import { create } from 'zustand'

import type { PopupModalAnchor } from '@/shared/ui'

import type { OrderModal } from '../components/orderTypes'

export type { OrderModal }

export type OrderAction = {
  orderId: string
  modal: OrderModal
  anchor?: PopupModalAnchor
}

type OrderActionStore = {
  orderAction: OrderAction | undefined
  openOrderModal: (orderId: string, modal: OrderModal, anchor?: PopupModalAnchor) => void
  closeOrderModal: () => void
}

export const useOrderActionStore = create<OrderActionStore>((set) => ({
  orderAction: undefined,
  openOrderModal: (orderId, modal, anchor) => set({ orderAction: { orderId, modal, anchor } }),
  closeOrderModal: () => set({ orderAction: undefined }),
}))
