import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildAnnouncementPayload,
  mapAnnouncementRow,
} from './utils/announcementApi.js'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('announcement behavior preserves server capabilities and accepted payload fields', () => {
  assert.deepEqual(
    mapAnnouncementRow({ id: 'a-1', capabilities: { update: true, delete: false } }).actions,
    { update: true, delete: false },
  )
  assert.deepEqual(
    buildAnnouncementPayload({
      title: '  Policy update ',
      content: ' Read this ',
      category: 'POLICY',
      priority: 'HIGH',
      status: 'PUBLISHED',
      sendToAll: true,
      targetDepartmentIds: ['ignored'],
      targetProfileIds: ['ignored'],
      isPinned: false,
      scheduledAt: '',
      displayOnly: true,
    }),
    {
      title: 'Policy update',
      content: 'Read this',
      category: 'POLICY',
      priority: 'HIGH',
      status: 'PUBLISHED',
      sendToAll: true,
      targetDepartmentIds: [],
      targetProfileIds: [],
      isPinned: false,
      scheduledAt: null,
    },
  )
})

test('announcements use operations primitives and server record capabilities', async () => {
  const page = await source('pages/AnnouncementsPage.jsx')

  assert.match(page, /OperationsPageShell/)
  assert.match(page, /OperationsTable/)
  assert.match(page, /useSearchParams/)
  assert.match(page, /row\.capabilities\?\.update/)
  assert.match(page, /row\.capabilities\?\.delete/)
  assert.doesNotMatch(page, /roleName|roles\.includes|\.role\b/)
})

test('remaining HR pages expose calendar, reconciliation, and SQL sync evidence', async () => {
  const [schedule, attendance, settings] = await Promise.all([
    source('../hr-time/pages/SchedulePage.jsx'),
    source('../hr-time/pages/AttendanceDeskPage.jsx'),
    source('../hr-settings/pages/HrSettingsPage.jsx'),
  ])

  assert.match(schedule, /holidays/)
  assert.match(schedule, /rotations/)
  assert.match(schedule, /HR_CALENDAR:WRITE/)
  assert.match(attendance, /calculationReason/)
  assert.match(attendance, /source/)
  assert.match(settings, /SQL attendance/i)
  assert.match(settings, /lastResult/)
  assert.match(settings, /retry:\s*false/)
})

test('announcement and settings routes mirror exact backend permissions', async () => {
  const [routes, navigation] = await Promise.all([
    source('../../routes/index.jsx'),
    source('../../layouts/sidebarNavigation.js'),
  ])

  assert.match(routes, /HR_ANNOUNCEMENTS[\s\S]*HR_ANNOUNCEMENTS:READ[\s\S]*HR_ANNOUNCEMENTS:WRITE/)
  assert.match(routes, /HR_SETTINGS[\s\S]*HR_INTEGRATIONS:MANAGE/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_ANNOUNCEMENTS/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_SETTINGS/)
})
