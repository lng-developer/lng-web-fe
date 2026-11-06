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
      cssMinify: 'lightningcss',
      rollupOptions: {
        input: {
          app: path.resolve(rootDir, 'index.html'),
          msalPopup: path.resolve(rootDir, 'msal-popup.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom')
              ) {
                return 'vendor-react'
              }
              if (
                id.includes('antd') ||
                id.includes('@ant-design') ||
                id.includes('@rc-component')
              ) {
                return 'vendor-antd'
              }
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack'
              }
              if (id.includes('recharts')) {
                return 'vendor-charts'
              }
              if (id.includes('axios') || id.includes('dayjs') || id.includes('i18next')) {
                return 'vendor-utils'
              }
              if (id.includes('@azure/msal-browser') || id.includes('@azure/msal-common')) {
                return 'vendor-msal'
              }
            }
          },
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
