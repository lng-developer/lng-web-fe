import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // svgr cho phép import file .svg như 1 React component qua hậu tố `?react`,
  // ví dụ: import LogoIcon from '@/assets/icons/logo.svg?react'
  // (không kèm hậu tố -> import vẫn trả về URL của file svg như bình thường).
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
