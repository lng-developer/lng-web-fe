export const designTasksKeys = {
  all: ['design-tasks'],
  list: (query = {}) => [...designTasksKeys.all, 'list', query],
}
