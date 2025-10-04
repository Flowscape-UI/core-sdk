import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: false, // Disable source maps for smaller bundle
  clean: true,
  format: ['esm', 'cjs'],
  target: 'es2020',
  outDir: 'dist',
  treeshake: true,
  minify: true, // Minify for production
});
