export const scaleKeys = {
  all: ['scale'],
  groupTasks: (query = {}) => [...scaleKeys.all, 'group-tasks', query],
  etsyTasks: (query = {}) => [...scaleKeys.all, 'etsy-tasks', query],
}
