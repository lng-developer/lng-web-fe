export const designTasksKeys = {
  all: ['design-tasks'],
  list: (query = {}) => [...designTasksKeys.all, 'list', query],
  detail: (taskId) => [...designTasksKeys.all, 'detail', taskId],
  summary: (query = {}) => [...designTasksKeys.all, 'summary', query],
  scoreSummary: (query = {}) => [...designTasksKeys.all, 'score-summary', query],
  workload: (query = {}) => [...designTasksKeys.all, 'workload', query],
  submissions: (taskId) => [...designTasksKeys.all, 'submissions', taskId],
}
