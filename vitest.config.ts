import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Next reads `.env.local` on its own; Vitest does not, and the integration
// project needs `DATABASE_URL` out of it.
config({ path: '.env.local', quiet: true });

/**
 * Two projects, because the two suites have different rights. `unit` is pure
 * and runs on every commit; `integration` talks to a real Neon branch and
 * never does.
 * — `docs/adr/0008-vitest-replaces-the-node-test-runner.md`
 */
export default defineConfig({
  // `@/` resolves in tests the way it resolves everywhere else
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          // `.integration.test.ts` ends in `.test.ts` too, so it is named out
          exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['**/*.integration.test.ts'],
        },
      },
    ],
  },
});
