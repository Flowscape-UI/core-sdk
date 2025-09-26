import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Dev server for the playground. We alias the library import to local src for HMR.
export default defineConfig({
  root: resolve(__dirname),
  server: {
    port: 5174,
    open: true,
    allowedHosts: ['trust-math-meat-science.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@flowscape-ui/core-sdk': resolve(__dirname, '../src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
  },
});
