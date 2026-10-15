import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    css: {
      modules: {
        generateScopedName:
          mode === 'production'
            ? (name, filename) => {
                const file = path.relative(rootDir, filename).replaceAll('\\', '/')
                const scope = createHash('sha256').update(file).digest('hex').slice(0, 12)
                return `_${name}_${scope}`
              }
            : undefined,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          app: path.resolve(rootDir, 'index.html'),
          msalPopup: path.resolve(rootDir, 'msal-popup.html'),
        },
      },
    },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/test/**/*.test.ts', 'src/test/server/**/*.test.js'],
            exclude: [
              'src/test/app/layout/coreRouteMemory.test.ts',
              'src/test/hr/api/hrApi.test.ts',
              'src/test/shared/api/client.test.ts',
            ],
          },
        },
        {
          extends: true,
          test: {
            name: 'ui',
            environment: 'jsdom',
            setupFiles: './src/test/setup.ts',
            include: [
              'src/test/**/*.test.tsx',
              'src/test/app/layout/coreRouteMemory.test.ts',
              'src/test/hr/api/hrApi.test.ts',
              'src/test/shared/api/client.test.ts',
            ],
          },
        },
      ],
    },
  }
})
