import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.js', 'src/**/*.test.ts', 'test/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['electron/pricing.js'],
    },
  },
})
