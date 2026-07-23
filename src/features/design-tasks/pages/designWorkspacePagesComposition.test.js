import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

for (const page of ['QualityScoringPage.jsx', 'PsdFileLibraryPage.jsx']) {
  test(`${page} uses the Operations list system`, () => {
    const url = new URL(`./${page}`, import.meta.url)
    assert.equal(existsSync(url), true)

    const source = readFileSync(url, 'utf8')
    assert.equal(source.includes('<OperationsPageShell'), true)
    assert.equal(source.includes('<OperationsToolbar'), true)
    assert.equal(source.includes('<OperationsTable'), true)
    assert.equal(source.includes('<OperationsPagination'), true)
    assert.equal(source.includes("const searchInput = searchParams.get('search') || ''"), true)
  })
}

test('Quality Scoring keeps score changes reviewer-gated', () => {
  const source = readFileSync(new URL('./QualityScoringPage.jsx', import.meta.url), 'utf8')
  const drawerSource = readFileSync(
    new URL('../components/QualityScoreDetailDrawer.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(
    source.includes("hasAnyPermission(currentUser, ['DESIGN:REVIEW', 'DESIGN:WRITE'])"),
    true,
  )
  assert.equal(source.includes('useOverrideSubmissionScoreMutation'), true)
  assert.equal(source.includes('useVoidSubmissionScoreMutation'), true)
  assert.equal(source.includes('<MenuItem value="ALL">All statuses</MenuItem>'), true)
  assert.equal(drawerSource.includes('row.downloadUrl'), true)
  assert.equal(drawerSource.includes('apiClient.get(row.downloadUrl'), true)
  assert.equal(drawerSource.includes('ENDPOINTS.MEDIA'), false)
  assert.equal(drawerSource.includes('/api/media/'), false)
  assert.equal(drawerSource.includes('label="Scored by"'), true)
})

test('PSD File Library downloads only through the mapped Design read model', () => {
  const pageSource = readFileSync(new URL('./PsdFileLibraryPage.jsx', import.meta.url), 'utf8')
  const drawerSource = readFileSync(
    new URL('../components/PsdFileDetailDrawer.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(drawerSource.includes('row.downloadUrl'), true)
  assert.equal(drawerSource.includes('ENDPOINTS.MEDIA'), false)
  assert.equal(drawerSource.includes('apiClient.get(row.downloadUrl'), true)
  assert.equal(drawerSource.includes('/api/media/'), false)
  assert.equal(drawerSource.includes('label="Added to task"'), true)
  assert.equal(drawerSource.includes('row.submittedAt'), false)
  assert.equal(pageSource.includes('useUploadMediaAssetMutation'), false)
  assert.equal(pageSource.includes('Delete'), false)
  assert.equal(pageSource.includes('preview'), false)
  assert.equal(pageSource.includes("key: 'filename', label: 'File name', sortable: true"), false)
  assert.equal(pageSource.includes("key: 'size', label: 'Size', sortable: true"), false)
  assert.equal(pageSource.includes("value: 'createdAt'"), true)
  assert.equal(pageSource.includes("value: 'submittedAt'"), true)
  assert.equal(pageSource.includes("label: 'Added to Design'"), true)
  assert.equal(pageSource.includes('row.linkedAt'), true)
  assert.equal(pageSource.includes('placeholder="Search file, listing, or task reference"'), true)
  assert.equal(
    readFileSync(new URL('./QualityScoringPage.jsx', import.meta.url), 'utf8').includes(
      'placeholder="Search file, listing, or task reference"',
    ),
    true,
  )
})
