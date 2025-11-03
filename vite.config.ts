import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? 
    ((process.env.YNH_APP_ARG_PATH || '/liberchat').replace(/\/$/, '') + '/') : 
    '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('Proxying WebSocket request:', req.url);
          });
        }
      }
    }
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1000, // Augmentation de la limite à 1000 kB
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'socket-vendor': ['socket.io-client'],
          'video-vendor': ['simple-peer'],
          'emoji-vendor': ['@emoji-mart/data', '@emoji-mart/react']
        },
        assetFileNames: (assetInfo: { name?: string }) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    cssCodeSplit: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['emoji-mart', 'socket.io-client'],
    exclude: ['lucide-react']
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'simple-peer': 'simple-peer/simplepeer.min.js',
    },
  }
});