import type { MongoIndexUsageSnapshot } from '../api/monitoringApi'

type Index = MongoIndexUsageSnapshot['collections'][number]['indexes'][number]

export function getIndexReview(
  index: Index,
  collectionName: string,
  snapshots: MongoIndexUsageSnapshot[],
) {
  const history = snapshots.flatMap((snapshot) => {
    const collection = snapshot.collections.find(({ name }) => name === collectionName)
    const current = collection?.indexes.find(({ name }) => name === index.name)
    return collection && current
      ? [
          {
            capturedOn: snapshot.capturedOn,
            usageAvailable: collection.usageAvailable,
            operations: current.operations,
            classification:
              collection.findings.find(({ indexName }) => indexName === index.name)
                ?.classification ?? 'KEEP',
          },
        ]
      : []
  })
  const latest = history[0]
  if (!latest?.usageAvailable || latest.operations === null) {
    return { classification: latest?.classification ?? 'KEEP', idleDays: 0, candidate: false }
  }
  const lastUnchanged = history
    .slice(1)
    .reduce<
      (typeof history)[number] | null
    >((last, entry) => (last && entry.usageAvailable && entry.operations === latest.operations ? entry : null), latest)
  const idleDays = lastUnchanged
    ? Math.max(
        0,
        Math.floor(
          (Date.parse(latest.capturedOn) - Date.parse(lastUnchanged.capturedOn)) / 86_400_000,
        ),
      )
    : 0
  const candidate = ['COVERED', 'DUPLICATE'].includes(latest.classification) && idleDays >= 7
  return { classification: latest.classification, idleDays, candidate }
}
