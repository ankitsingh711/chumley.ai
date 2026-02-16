import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate large libraries into their own chunks for better caching
          if (id.includes('jspdf')) return 'pdf';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('framer-motion')) return 'animation';

          // React core - keep together
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'router';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('react')) return 'react';

          // Redux
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) return 'state';

          // Other vendor libs
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
  },
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
