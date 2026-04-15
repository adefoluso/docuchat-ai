# DocuChat Backend

Lightweight backend for DocuChat (TypeScript + Prisma).

**Stack**
- Node.js
- TypeScript
- Prisma (SQLite by default)

Repository layout
- `prisma/` — Prisma schema and migrations
- `src/` — application code

Prerequisites
- Node.js 18+ and npm (or yarn)
- Git

Quickstart (local development)

1) Clone the repository

```bash
git clone <repo-url>
cd docuchat-backend
```

2) Install dependencies

```bash
npm install
```

3) Create environment files

- Create a development `.env` in the project root with at least:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

- For tests, create `.env.test` (not committed) with test secrets:

```env
DATABASE_URL="file:./prisma/test.db"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

4) Generate Prisma client

```bash
npx prisma generate
```

5) Apply migrations (create the database + schema)

```bash
# Apply migrations (recommended for CI / reproducible environments)
npx prisma migrate deploy

# During development you can use:
npx prisma migrate dev
```

6) Seed the database (optional)

```bash
# Runs the seed command defined in prisma config (ts-node is used to run the seed)
npx prisma db seed
```

7) Run the app

```bash
# development (watch)
npm run dev

# production build + start
npm run build
npm start
```

Running tests
- Tests use Vitest and a separate test SQLite at `prisma/test.db`.
- Ensure `.env.test` exists with `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

```bash
NODE_ENV=test npm test
```

Notes & troubleshooting
- If you see "secretOrPrivateKey must have a value", ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set in your `.env` (or `.env.test` for tests).
- If Prisma cannot find the database or migrations, check `DATABASE_URL` and run `npx prisma migrate deploy`.
- To inspect migration SQL, open `prisma/migrations/<migration-folder>/migration.sql`.
- Do not rename migrations that have already been applied to production databases; instead create a new migration.

Helpful commands

- Generate client: `npx prisma generate`
- Apply migrations: `npx prisma migrate deploy`
- Create a dev migration and apply: `npx prisma migrate dev`
- Run seed: `npx prisma db seed`
- Start dev server: `npm run dev`