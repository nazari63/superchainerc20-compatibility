/* eslint-disable no-console */
import { defineConfig } from 'tsup'

export default defineConfig({
  name: '@superchainerc20-compatibility/checks',
  entry: ['src/index.ts'],
  outDir: 'build',
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
})
