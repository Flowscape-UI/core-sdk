import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
    },
    format: ['esm'],
    outDir: 'dist',
    clean: true,
    dts: {
      tsgo: true,
    },
    platform: 'neutral',
  },
  {
    entry: {
      'flowscape.global': './src/index.ts',
    },
    format: ['iife'],
    outDir: 'dist',
    clean: false,
    dts: false,
    platform: 'browser',
    globalName: 'Flowscape',
    minify: true,

    noExternal: ['culori', 'konva'],
  },
]);