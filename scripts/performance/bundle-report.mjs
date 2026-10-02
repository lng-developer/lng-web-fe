/* global console, process */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const LIMITS = {
  entryGzipKb: 400,
  totalGzipKb: 1300,
}

const args = process.argv.slice(2)
const json = args.includes('--json')
const directoryIndex = args.indexOf('--dir')
const directory = resolve(directoryIndex === -1 ? 'dist' : args[directoryIndex + 1])

if (directoryIndex !== -1 && !args[directoryIndex + 1]) {
  throw new Error('Missing value for --dir')
}

const assetsDirectory = existsSync(resolve(directory, 'assets')) ? resolve(directory, 'assets') : directory
const referencedEntry = existsSync(resolve(directory, 'index.html'))
  ? readFileSync(resolve(directory, 'index.html'), 'utf8').match(/\/assets\/([^"']+\.js)/)?.[1]
  : undefined

const files = readdirSync(assetsDirectory)
  .map((name) => ({ name, path: resolve(assetsDirectory, name) }))
  .filter(({ path }) => statSync(path).isFile())
  .map(({ name, path }) => {
    const content = readFileSync(path)
    return {
      name,
      rawKb: Number((content.length / 1024).toFixed(1)),
      gzipKb: Number((gzipSync(content, { level: 9 }).length / 1024).toFixed(1)),
    }
  })

const entry = referencedEntry
  ? files.find(({ name }) => name === referencedEntry)
  : files.find(({ name }) => /^(?:index|app)-.*\.js$/.test(name))
if (!entry) throw new Error(`No JavaScript entry found in ${assetsDirectory}`)

const totalGzipKb = Number(files.reduce((total, file) => total + file.gzipKb, 0).toFixed(1))
const failures = [
  entry.gzipKb > LIMITS.entryGzipKb && `Entry gzip bundle exceeds ${LIMITS.entryGzipKb} KB (${entry.gzipKb} KB)`,
  totalGzipKb > LIMITS.totalGzipKb && `Total gzip bundle exceeds ${LIMITS.totalGzipKb} KB (${totalGzipKb} KB)`,
].filter(Boolean)

const report = {
  assetCount: files.length,
  totalGzipKb,
  entry,
  largestAssets: [...files].sort((left, right) => right.gzipKb - left.gzipKb).slice(0, 5),
  budgetPassed: failures.length === 0,
}

if (json) {
  process.stdout.write(`${JSON.stringify(report)}\n`)
} else {
  console.table(report.largestAssets)
  console.log(`Assets: ${report.assetCount}; total gzip: ${report.totalGzipKb} KB; entry gzip: ${entry.gzipKb} KB`)
}

if (failures.length) throw new Error(failures.join('\n'))
