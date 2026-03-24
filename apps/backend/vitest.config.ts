import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/db/migrate.ts',
        'src/db/index.ts',
        'src/db/schema.ts',
        'src/routes/**',        // testés via intégration, pas unitaire
        'src/middleware/**',    // testés via intégration
        'src/services/generation/prompts/**', // templates de prompts, pas de logique
        'src/services/llm/LLMClient.ts',      // interface pure
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 60, // branches plus difficiles à couvrir (parsing JSON, fallbacks)
      },
    },
  },
});
