import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

import { afterEach, describe, expect, it } from 'vitest'

const workspaceRoot = process.cwd()
const createdDirectories: string[] = []

function createDistFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'lng-bundle-report-'))
  createdDirectories.push(directory)
  return directory
}

function runReport(directory: string) {
  return execFileSync(
    'node',
    ['scripts/performance/bundle-report.mjs', '--dir', directory, '--json'],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
}

afterEach(() => {
  createdDirectories
    .splice(0)
    .forEach((directory) => rmSync(directory, { recursive: true, force: true }))
})

describe('bundle report', () => {
  it('reports a passing gzip budget for a small entry bundle', () => {
    const directory = createDistFixture()
    writeFileSync(join(directory, 'index-demo.js'), randomBytes(1024))

    const report = JSON.parse(runReport(directory))

    expect(report.budgetPassed).toBe(true)
    expect(report.entry.name).toBe('index-demo.js')
    expect(report.entry.gzipKb).toBeGreaterThan(0)
  })

  it('fails when the entry bundle exceeds its gzip budget', () => {
    const directory = createDistFixture()
    writeFileSync(join(directory, 'index-too-large.js'), randomBytes(300 * 1024))

    expect(() => runReport(directory)).toThrow(/Entry gzip bundle exceeds 250 KB/)
  })

  it('uses the entry referenced by index.html instead of a stale asset', () => {
    const directory = createDistFixture()
    const assetsDirectory = join(directory, 'assets')
    mkdirSync(assetsDirectory)
    writeFileSync(join(assetsDirectory, 'index-current.js'), randomBytes(1024))
    writeFileSync(join(assetsDirectory, 'index-stale.js'), randomBytes(300 * 1024))
    writeFileSync(directory + '/index.html', '<script src="/assets/index-current.js"></script>')

    const report = JSON.parse(runReport(directory))

    expect(report.budgetPassed).toBe(true)
    expect(report.entry.name).toBe('index-current.js')
  })
})
