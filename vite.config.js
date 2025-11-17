import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@components/admin': resolve(__dirname, 'src/components/admin'),
      '@components/user': resolve(__dirname, 'src/components/user'),
      '@components/shared': resolve(__dirname, 'src/components/shared'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@lib': resolve(__dirname, 'src/lib'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)/.test(id)) {
            return 'vendor-react';
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }

          if (/[\\/]node_modules[\\/]firebase[\\/]/.test(id)) {
            return 'vendor-firebase';
          }

          if (/[\\/]node_modules[\\/](recharts|framer-motion)[\\/]/.test(id)) {
            return 'vendor-charts';
          }

          if (/[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/.test(id)) {
            return 'vendor-leaflet';
          }

          if (/[\\/]node_modules[\\/](pdf-lib|react-signature-canvas)[\\/]/.test(id)) {
            return 'vendor-pdf';
          }

          return undefined;
        },
      },
    },
  },
});
