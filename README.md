# SYNCODE &mdash; Universal Real-Time Code Collaboration Platform

[![Phase](https://img.shields.io/badge/Phase-2%20Authentication%20%26%20User%20Management%20Completed-brightgreen.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-ef4444)](https://turbo.build/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D)](https://redis.io/)

SYNCODE is an enterprise-grade Universal Real-Time Code Collaboration Platform built to connect developers across different editors: **Visual Studio Code**, **JetBrains IDEs**, **Neovim**, and modern **Web browsers**.

---

## Roadmap Status

- [x] **Phase 1: Foundation & Core Infrastructure** (Monorepo, Docker, NestJS API, Collaboration Service, Next.js frontend, Prisma, Redis)
- [x] **Phase 2: Authentication & User Management** (Argon2id, JWT access tokens, HttpOnly refresh token rotation, session revocation, profile & security settings, protected routes)
- [ ] **Phase 3: Project & Workspace Management**
- [ ] **Phase 4: Real-Time Collaboration Engine (CRDT / Yjs)**
- [ ] **Phase 5: Editor Extensions & Synchronization Adapter**
- [ ] **Phase 6: Audio / Video & Presence Communication**
- [ ] **Phase 7: Terminal & Execution Sharing**
- [ ] **Phase 8: Access Control & Permissions**
- [ ] **Phase 9: Enterprise Audit Logging & Analytics**
- [ ] **Phase 10: Performance Optimization & Scalability**
- [ ] **Phase 11: Deployment & Production Infrastructure**
- [ ] **Phase 12: Production Readiness & Launch**

---

## Architecture Highlights

- **Monorepo**: Turborepo + pnpm workspaces with strict dependency isolation.
- **Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, and in-memory JWT authentication context with silent background refresh and protected route guards.
- **Backend API (`apps/api`)**: NestJS 11 with Express adapter, structured Pino logging, Helmet security headers, atomic sliding-window Redis rate limiting, and global exception filtering.
- **Authentication & Security Engine**:
  - Native **Argon2id** password hashing (`@node-rs/argon2`) with 64 MB memory cost, 3 iterations, 4 parallelism lanes.
  - Short-lived signed JWT access tokens (15m) held exclusively in memory.
  - Cryptographically random SHA-256 hashed refresh tokens stored in PostgreSQL.
  - **HttpOnly, SameSite=Lax, Secure** refresh token cookies.
  - **Refresh Token Rotation & Replay Attack Defense**: Replay attempts instantly revoke all user sessions.
  - Granular multi-session tracking and revocation.
- **Collaboration Microservice (`apps/collaboration`)**: Isolated real-time microservice foundation on port 4001 for future Yjs CRDT synchronization.
- **Database (`packages/database`)**: PostgreSQL 16 managed via Prisma ORM with automated migrations.
- **Caching & Broker**: Redis 7 with `ioredis` connection lifecycle management, automated reconnection, and sliding-window rate limiting.
- **Shared Packages (`packages/*`)**:
  - `@syncode/validation`: Type-safe Zod validation schemas for requests, auth DTOs, and runtime environment validation.
  - `@syncode/config`: Centralized shared configuration constants and utilities.
  - `@syncode/core`: Shared domain models and core abstractions.
  - `@syncode/protocol`: Binary/JSON message protocols for real-time synchronization.
  - `@syncode/editor-adapter`: Abstraction layer connecting IDE plugins to the collaboration engine.

---

## Monorepo Layout

```text
syncode/
├── apps/
│   ├── web/                    # Next.js 16 App Router frontend (Port 3000)
│   ├── api/                    # NestJS REST API (Port 4000)
│   └── collaboration/          # Real-time WebSocket collaboration service (Port 4001)
├── packages/
│   ├── config/                 # Shared configurations and environment rules
│   ├── core/                   # Core business logic and interfaces
│   ├── database/               # Prisma schema, migrations, and database client
│   ├── editor-adapter/         # Editor synchronization interface
│   ├── protocol/               # Shared communication wire protocol
│   └── validation/             # Zod validation schemas and DTOs
├── extensions/
│   └── vscode/                 # Visual Studio Code extension
├── docs/                       # Architecture, API, and Development guides
├── docker-compose.yml          # PostgreSQL 16 & Redis 7 services
├── pnpm-workspace.yaml         # Workspace definition
├── turbo.json                  # Turborepo task pipeline
└── package.json                # Root package configuration
```

---

## Quickstart

### 1. Prerequisites
- **Node.js**: >= 20.18
- **pnpm**: >= 9.x / 10.x / 12.x
- **Docker & Docker Compose**: For PostgreSQL 16 and Redis 7



### 2. Start Infrastructure
```bash
# Start PostgreSQL & Redis in detached mode
docker compose up -d

# Verify containers are healthy
docker compose ps
```

### 3. Database Setup
```bash
# Generate Prisma client
pnpm db:generate

# Deploy migrations to PostgreSQL
pnpm db:migrate
```

### 4. Run Development Services
```bash
pnpm dev
```

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Next.js App Router |
| **System Status** | [http://localhost:3000/status](http://localhost:3000/status) | Diagnostic dashboard |
| **API Health Check** | [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) | Deep database & Redis status |
| **Collaboration Service** | [http://localhost:4001/health](http://localhost:4001/health) | Real-time microservice |

---

## REST API Overview

All backend endpoints are prefixed with `/api/v1`:

### Health & Diagnostics
- `GET /api/v1/health` &mdash; Deep diagnostic check for API, PostgreSQL connection, and Redis cache.

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` &mdash; Register a new user account with Argon2id password hashing.
- `POST /api/v1/auth/login` &mdash; Authenticate credentials; sets HttpOnly refresh cookie and returns in-memory access token.
- `POST /api/v1/auth/refresh` &mdash; Rotate refresh token and issue a fresh access token.
- `POST /api/v1/auth/logout` &mdash; Revoke current session and clear refresh cookie.
- `POST /api/v1/auth/logout-all` &mdash; Revoke all active sessions across all devices for the authenticated user.
- `GET /api/v1/auth/me` &mdash; Retrieve authenticated user profile (requires Bearer JWT).
- `POST /api/v1/auth/verify-email` &mdash; Verify user email address with single-use token.
- `POST /api/v1/auth/resend-verification` &mdash; Request a fresh verification token.
- `POST /api/v1/auth/forgot-password` &mdash; Request password reset email token.
- `POST /api/v1/auth/reset-password` &mdash; Complete password reset using secure token.
- `GET /api/v1/auth/oauth/google` &mdash; Initiate Google OAuth2 flow.
- `GET /api/v1/auth/oauth/google/callback` &mdash; Google OAuth2 authorization code callback.

### Users & Settings (`/api/v1/users`)
- `PATCH /api/v1/users/me` &mdash; Update user display name and avatar URL.
- `POST /api/v1/users/me/password` &mdash; Change password and revoke other active sessions.
- `GET /api/v1/users/me/sessions` &mdash; List all active sessions with IP and user-agent metadata.
- `DELETE /api/v1/users/me/sessions/:id` &mdash; Revoke an individual session.

---

## Frontend Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Marketing landing page and platform features |
| `/login` | Public | User authentication with email/password and Google OAuth |
| `/register` | Public | Account creation form |
| `/forgot-password` | Public | Password recovery request form |
| `/reset-password` | Public | New password submission with token |
| `/verify-email` | Public | Email confirmation processing page |
| `/status` | Public | Real-time service connectivity dashboard |
| `/dashboard` | Protected | Authenticated user workspace overview |
| `/settings/profile` | Protected | Profile editor (display name, avatar) |
| `/settings/security` | Protected | Password change and active session management |

---

## Quality Assurance & Testing

SYNCODE enforces strict typing and comprehensive test coverage across all packages:

```bash
# Run unit and integration test suites (Vitest across all packages)
pnpm test

# Run strict TypeScript typechecking
pnpm typecheck

# Run ESLint across packages and applications
pnpm lint

# Run optimized production builds across all packages
pnpm build
```

---

## Documentation

- [System Architecture](file:///docs/ARCHITECTURE.md)
- [REST API Specification](file:///docs/API.md)
- [Developer Guide](file:///docs/DEVELOPMENT.md)


## for test 
<p><strong>login</strong></p>
<p><a>admin@test.com</a></p>
<p>12345678</p>
<p><strong>From your SYNCODE project root, run</strong></p>
pnpm install
<br/>
pnpm db:generate
<br/>
pnpm build
<br/>
pnpm typecheck
<br/>
pnpm lint
<br/>
pnpm test

<p><strong>Then start the application:</strong></p>
pnpm docker:up
<br/>
pnpm dev