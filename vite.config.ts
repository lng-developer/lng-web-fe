import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/test/**/*.test.ts'],
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
})
