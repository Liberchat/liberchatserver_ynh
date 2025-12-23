import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ?
    ((process.env.YNH_APP_ARG_PATH || '/liberchat').replace(/\/$/, '') + '/') :
    '/',
  plugins: [
    react(),
    obfuscator({
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: [/node_modules/, /react/, /react-dom/, /react-jsx-runtime/],
      apply: 'build', // Seulement en production
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['rc4'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
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
          'emoji-vendor': ['emoji-picker-react']
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
        drop_debugger: true,
        passes: 3, // Multiple passes pour meilleure compression
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true
      },
      mangle: {
        toplevel: true, // Renomme toutes les variables
        eval: true,
        keep_classnames: false,
        keep_fnames: false,
        reserved: ['React', 'ReactDOM', 'ReactCurrentOwner'],
        properties: {
          regex: /^_/, // Renomme les propriétés commençant par _
          reserved: ['ReactCurrentOwner', '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED']
        }
      },
      format: {
        comments: false, // Supprime tous les commentaires
        beautify: false,
        ecma: 2020
      }
    }
  },
  optimizeDeps: {
    include: ['emoji-picker-react', 'socket.io-client'],
    exclude: ['lucide-react', 'crypto-wasm']
  },

  // Support WASM
  assetsInclude: ['**/*.wasm'],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'simple-peer': 'simple-peer/simplepeer.min.js',
    },
  }
});