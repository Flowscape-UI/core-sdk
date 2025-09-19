import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  target: 'es2020',
  outDir: 'dist',
  treeshake: true,
  minify: false,
});
