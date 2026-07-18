export const shopsKeys = {
  all: ['shops'],
  lists: () => [...shopsKeys.all, 'list'],
  list: (query = {}) => [...shopsKeys.lists(), query],
  detail: (id) => [...shopsKeys.all, 'detail', id],
}
