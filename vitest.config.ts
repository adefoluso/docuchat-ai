import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/helpers/globalSetup.ts',
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-thirty-two-characters-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-thirty-two-characters-long',
      NODE_ENV: 'test',
    },
    globals: true,
  },
});
