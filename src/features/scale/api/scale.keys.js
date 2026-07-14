export const scaleKeys = {
  all: ['scale'],
  tasks: (query = {}) => [...scaleKeys.all, 'tasks', query],
  summary: (query = {}) => [...scaleKeys.all, 'summary', query],
  assignees: (query = {}) => [...scaleKeys.all, 'assignees', query],
  shops: (query = {}) => [...scaleKeys.all, 'shops', query],
}
