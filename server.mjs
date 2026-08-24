/* global URL, console, process */

import http from 'node:http'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const port = Number(process.env.PORT || 5173)
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
])

export function getPathname(url, host) {
  try {
    return decodeURIComponent(new URL(url, `http://${host || 'localhost'}`).pathname)
  } catch {
    return null
  }
}

function proxy(req, res) {
  const upstream = http.request(
    { hostname: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers: req.headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
      upstreamRes.pipe(res)
    },
  )
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Bad gateway' }))
  })
  req.pipe(upstream)
}

export function createServer() {
  return http.createServer(async (req, res) => {
    if (!req.url || req.url.startsWith('/api/') || req.url === '/health') return proxy(req, res)
    const pathname = getPathname(req.url, req.headers.host)
    if (!pathname) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('Bad request')
    }
    const candidate = path.normalize(path.join(root, pathname))
    const file = candidate.startsWith(root) ? candidate : path.join(root, 'index.html')
    try {
      const stat = await fs.stat(file)
      if (stat.isFile()) {
        res.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' })
        return createReadStream(file).pipe(res)
      }
    } catch {
      // Fall through to the SPA entry point.
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    createReadStream(path.join(root, 'index.html')).pipe(res)
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(port, '0.0.0.0', () => console.log(`lng-web-fe listening on ${port}`))
}
