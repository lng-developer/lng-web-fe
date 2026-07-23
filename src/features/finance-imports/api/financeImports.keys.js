export const financeImportsKeys = {
  all: ['finance-imports'],
  batches: (query = {}) => [...financeImportsKeys.all, 'batches', query],
  batch: (batchId) => [...financeImportsKeys.all, 'batch', batchId],
  importedData: (sourceType, query = {}) => [
    ...financeImportsKeys.all,
    'imported-data',
    sourceType,
    query,
  ],
}
