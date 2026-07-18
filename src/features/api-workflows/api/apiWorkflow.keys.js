export const apiWorkflowKeys = {
  all: ['api-workflows'],
  list: (workflowId, tabId, query = {}) => [...apiWorkflowKeys.all, workflowId, tabId, query],
  detail: (workflowId, endpointId, params = {}) => [
    ...apiWorkflowKeys.all,
    workflowId,
    endpointId,
    params,
  ],
}
