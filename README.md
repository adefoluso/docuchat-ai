# DocuChat Backend

Docuchat AI.

**Stack**
- Node.js
- TypeScript
- Prisma (SQLite by default in `prisma/schema.prisma`)

**Repository layout**
- `prisma/` — Prisma schema and migrations
- `src/` — application entry and code

## Prerequisites
- Node.js 18+ and npm (or yarn)
- Git

## Setup (local development)
1. Clone the repository

```bash
git clone <repo-url>
cd docuchat-backend
```

2. Install dependencies

```bash
npm install
```

3. Create an `.env` in the project root and set the database URL (example using SQLite):

```env
DATABASE_URL="file:./dev.db"
```

4. Generate the Prisma client

```bash
npx prisma generate
```

5. Apply migrations (creates `dev.db` and schema)

```bash
npx prisma migrate deploy
# or to apply and create a migration locally while developing:
# npx prisma migrate dev
```

6. Start the app

```bash
npm run dev
```

## Working with migrations
- The project stores migrations under `prisma/migrations/`.

> Important: Do NOT rename a migration that has already been applied to production databases. Instead, create a new migration that makes the desired changes.

## Notes about the database
- `prisma/schema.prisma` currently uses SQLite as the provider; you can switch to Postgres or MySQL by updating the datasource and `DATABASE_URL`.

## Troubleshooting
- If Prisma complains about missing `DATABASE_URL`, ensure `.env` exists and has the correct value.
- To inspect migration SQL, check `prisma/migrations/<migration-folder>/migration.sql`.