import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
          animation: ['framer-motion'],
          pdf: ['jspdf', 'jspdf-autotable'],
          state: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  plugins: [react()],
})
