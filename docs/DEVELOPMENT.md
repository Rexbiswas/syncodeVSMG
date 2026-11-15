# SYNCODE Developer Guide

## 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v12.x` or higher (`npm install -g pnpm`)
- **Docker & Docker Compose**: (Optional for local PostgreSQL and Redis containers)

---

## 2. Environment Setup

1. Clone the repository.
2. Duplicate the environment template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies from the repository root:
   ```bash
   pnpm install
   ```

---

## 3. Infrastructure (Docker)

To spin up PostgreSQL and Redis with persistent volumes and health checks:

```bash
# Start background services
pnpm docker:up

# Tear down services
pnpm docker:down
```

Verify service status:
```bash
docker compose ps
```

---

## 4. Database Lifecycle & Migrations

```bash
# Generate Prisma Client
pnpm db:generate

# Deploy migrations to PostgreSQL
pnpm db:migrate
```

---

## 5. Development Mode

To run all applications and packages concurrently with live reload:

```bash
pnpm dev
```

Or run individual targets:
```bash
# Web application (Next.js 16) -> http://localhost:3000
pnpm --filter @syncode/web dev

# REST API (NestJS) -> http://localhost:4000/api/v1
pnpm --filter @syncode/api dev

# Collaboration Foundation -> http://localhost:4001
pnpm --filter @syncode/collaboration dev
```

---

## 6. Monorepo Scripts Reference

| Command | Action |
|---|---|
| `pnpm build` | Compiles all packages and applications via Turborepo |
| `pnpm typecheck` | Validates strict TypeScript compilation across all projects |
| `pnpm test` | Runs the test suites using Vitest |
| `pnpm lint` | Runs linter checks across all packages |
| `pnpm docker:up` | Starts PostgreSQL and Redis containers |
| `pnpm docker:down` | Stops PostgreSQL and Redis containers |
| `pnpm db:generate` | Generates Prisma client types |
| `pnpm db:migrate` | Runs database migrations |

