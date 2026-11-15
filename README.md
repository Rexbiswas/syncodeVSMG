# SYNCODE &mdash; Universal Real-Time Code Collaboration Platform

[![Phase](https://img.shields.io/badge/Phase-1%20Foundation%20%26%20Infrastructure-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-ef4444)](https://turbo.build/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)](https://nestjs.com/)

SYNCODE is an enterprise-grade Universal Real-Time Code Collaboration Platform built to connect developers across different editors: **Visual Studio Code**, **JetBrains IDEs**, **Neovim**, and modern **Web browsers**.

---

## Architecture Highlights

- **Monorepo**: Turborepo + pnpm workspaces.
- **Frontend (`apps/web`)**: Next.js 16 with App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.
- **Backend API (`apps/api`)**: NestJS with Express adapter, structured Pino logging, Helmet security, global exception handling, and `/api/v1/health` diagnostic endpoint.
- **Collaboration Service (`apps/collaboration`)**: Standalone real-time microservice foundation for future Yjs CRDT synchronization.
- **Database (`packages/database`)**: PostgreSQL with Prisma ORM client and migrations foundation.
- **Cache & Message Broker**: Redis with `ioredis` connection lifecycle management, reconnect strategy, and graceful shutdown.
- **Shared Contracts (`packages/*`)**: `@syncode/config`, `@syncode/core`, `@syncode/protocol`, `@syncode/editor-adapter`, `@syncode/validation`.
- **Infrastructure**: Docker Compose for PostgreSQL 16 and Redis 7 with persistent volumes and health checks; Nginx reverse proxy configuration.

---

## Quickstart

### 1. Prerequisites
- Node.js >= 20.18
- pnpm >= 12.0

### 2. Setup
```bash
# Clone and enter workspace
cd syncode

# Prepare environment
cp .env.example .env

# Install all workspace dependencies
pnpm install
```

### 3. Spin Up Infrastructure
```bash
# Start PostgreSQL & Redis
pnpm docker:up

# Generate Prisma Client & Migrate Schema
pnpm db:generate
pnpm db:migrate
```

### 4. Run Development Servers
```bash
pnpm dev
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- System Status Screen: [http://localhost:3000/status](http://localhost:3000/status)
- Backend REST API Health: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
- Collaboration Service Health: [http://localhost:4001/health](http://localhost:4001/health)

---

## Testing & Quality Assurance

```bash
# Run unit and integration tests across all packages
pnpm test

# Run strict TypeScript type checking
pnpm typecheck

# Build all packages and applications
pnpm build
```

---

## Documentation

- [System Architecture](file:///docs/ARCHITECTURE.md)
- [REST API Specification](file:///docs/API.md)
- [Developer Guide](file:///docs/DEVELOPMENT.md)
