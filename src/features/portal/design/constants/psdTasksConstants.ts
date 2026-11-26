export const STATUS_TABS = [
  { key: 'all', titleKey: 'portal.design.tabs.all', defaultTitle: 'All', status: undefined },
  {
    key: 'Unassigned',
    titleKey: 'taskQueue.unassigned',
    defaultTitle: 'Unassigned',
    status: undefined,
  },
  { key: 'New', titleKey: 'portal.design.tabs.new', defaultTitle: 'New', status: 'NEW' },
  {
    key: 'Requested',
    titleKey: 'portal.design.tabs.requested',
    defaultTitle: 'Requested',
    status: 'REQUESTED',
  },
  {
    key: 'Assigned',
    titleKey: 'portal.design.tabs.assigned',
    defaultTitle: 'Assigned',
    status: 'ASSIGNED',
  },
  {
    key: 'In Progress',
    titleKey: 'portal.design.tabs.inProgress',
    defaultTitle: 'In Progress',
    status: 'IN_PROGRESS',
  },
  {
    key: 'Uploaded',
    titleKey: 'portal.design.tabs.uploaded',
    defaultTitle: 'Uploaded',
    status: 'SUBMITTED',
  },
  {
    key: 'QC Rejected',
    titleKey: 'portal.design.tabs.qcRejected',
    defaultTitle: 'QC Rejected',
    status: 'REJECTED',
  },
  {
    key: 'QC Passed',
    titleKey: 'portal.design.tabs.qcPassed',
    defaultTitle: 'QC Passed',
    status: 'APPROVED',
  },
] as const
