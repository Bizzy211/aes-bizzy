import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/types/**/*.ts',
        'src/**/index.ts', // Barrel exports
        'src/cli/init.ts', // Interactive wizard - tested via skip flag behavior
      ],
      thresholds: {
        lines: 75,
        functions: 85,
        branches: 70,
        statements: 75,
      },
    },
  },
});
