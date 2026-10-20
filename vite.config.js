import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // pdf.js (used by the admin PDF upload) ships modern syntax that the default build target rejects
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@firebase/firestore/') || id.includes('/node_modules/firebase/firestore/')) return 'firebase-firestore'
          if (id.includes('/node_modules/@firebase/auth/') || id.includes('/node_modules/firebase/auth/')) return 'firebase-auth'
        },
      },
    },
  },
  optimizeDeps: { esbuildOptions: { target: 'esnext' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true, css: false },
})
