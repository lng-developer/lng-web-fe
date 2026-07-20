export const financeKeys = {
  all: ['finance'],
  snapshots: (query = {}) => [...financeKeys.all, 'snapshots', query],
}
