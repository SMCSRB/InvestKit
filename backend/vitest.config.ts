import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Les tests de base de données partagent une seule base : pas en parallèle.
    fileParallelism: false,
    testTimeout: 30000,
  },
});
