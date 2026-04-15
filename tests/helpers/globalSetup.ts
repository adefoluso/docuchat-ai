import { execSync } from 'child_process';

// Run migrations against the test database before any tests. Export a setup
// function so Vitest runs this once (globalSetup) instead of per-worker.
export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./prisma/test.db',
    },
    stdio: 'inherit',
  });
}

// **5. Add to `.gitignore`:**
// ```
// prisma/test.db
// prisma/test.db-journal
// ```
