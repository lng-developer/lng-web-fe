export const qcKeys = {
  all: ['qc'],
  tasks: (query = {}) => [...qcKeys.all, 'tasks', query],
}
