export const ordersKeys = {
  all: ['orders'],
  list: (query = {}) => [...ordersKeys.all, 'list', query],
  detail: (orderId) => [...ordersKeys.all, 'detail', orderId],
}
