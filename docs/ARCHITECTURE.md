# SYNCODE System Architecture

## 1. Executive Summary

SYNCODE is a Universal Real-Time Code Collaboration Platform engineered to provide low-latency, conflict-free collaborative editing across diverse integrated development environments (IDEs) including Visual Studio Code, JetBrains IDEs, Neovim, and web browsers.

Phase 1 establishes the production-grade foundational infrastructure, monorepo hierarchy, dependency relationships, communication protocols, and service health monitoring.

---

## 2. Monorepo Topology

The platform leverages a pnpm workspace orchestrated by Turborepo:

```
syncode/
├── apps/
│   ├── web/                    # Next.js 16 App Router frontend
│   ├── api/                    # NestJS Express-adapter REST API
│   └── collaboration/          # Dedicated Yjs/WebSocket real-time service foundation
│
├── extensions/
│   ├── vscode/                 # Visual Studio Code extension foundation
│   ├── jetbrains/              # JetBrains IntelliJ Platform plugin foundation
│   └── neovim/                 # Neovim Lua plugin foundation
│
├── packages/
│   ├── config/                 # Base tsconfigs and application constants
│   ├── core/                   # Standard error classes, result wrappers, utilities
│   ├── protocol/               # Universal collaboration message schemas and types
│   ├── editor-adapter/         # Abstract adapter interfaces for IDE integration
│   ├── database/               # Prisma ORM schema and PostgreSQL client layer
│   └── validation/             # Zod schemas for env and data models
│
├── infrastructure/
│   ├── docker/                 # Container definitions for services
│   └── nginx/                  # Reverse proxy routing configuration
│
└── docs/                       # Architectural and developer documentation
```

---

## 3. Core Architectural Decisions

### 3.1 Separate Real-Time Collaboration Service
The collaborative editing stream is hosted in `apps/collaboration` rather than inside the primary REST API (`apps/api`).
- **Rationale**: Real-time CRDT synchronization creates persistent stateful WebSockets. Separating it from the stateless REST API prevents high-throughput document edits from degrading REST API performance, allowing independent vertical/horizontal auto-scaling.

### 3.2 Strict Environment Validation at Startup
All services employ `@syncode/validation` powered by Zod to validate environment variables during the bootstrap phase.
- **Fail-Fast Principle**: Services immediately abort startup with clear error messages if critical connection strings (`DATABASE_URL`, `REDIS_URL`) or ports are missing or invalid, preventing runtime null-pointer failures.

### 3.3 Universal Editor Adapter Layer
The `@syncode/editor-adapter` package introduces the `IEditorAdapter` contract.
- Any IDE (VS Code, JetBrains, Neovim) only needs to implement cursor transformations, text delta ingestion, and remote decoration rendering against this contract. This guarantees that multi-IDE collaboration does not require editor-specific backend code.

### 3.4 Multi-Tier Health Monitoring
The `GET /api/v1/health` endpoint tests end-to-end service availability:
- **API Availability**: Express process uptime and memory health.
- **PostgreSQL Connectivity**: Evaluates live database responsiveness using active ping queries.
- **Redis Connectivity**: Evaluates in-memory cache and pub/sub broker via Redis `PING`.
- **Status Classification**:
  - `ok` (HTTP 200): All systems operational.
  - `degraded` (HTTP 503): One critical dependency is offline.
  - `down` (HTTP 503): All backing services are offline.

---

## 4. Security & Sensitive Data Boundary

- **Client/Server Isolation**: Browser-facing environment variables in `apps/web` are strictly restricted to `NEXT_PUBLIC_*` prefixes.
- **Header Hardening**: `apps/api` enforces Helmet security headers (CSP, HSTS, frameguard, XSS protection).
- **CORS Enforcement**: Cross-Origin Resource Sharing is locked to configured origins.
- **Credential Masking**: Health checks never return raw connection strings, usernames, or database credentials.

---

## 5. System Evolutionary Pillars

1. **Phase 1: Foundation & Monorepo Architecture** (Completed): Turborepo, pnpm workspaces, NestJS API, PostgreSQL, Redis, health monitoring.
2. **Phase 2: Authentication & User Management** (Completed): JWT session rotation, OAuth 2.0, password security, email verification.
3. **Phase 3: Workspaces & Room Management** (Completed): Multi-tenant workspaces, membership RBAC (OWNER, ADMIN, MEMBER, VIEWER), invitation lifecycle, collaboration rooms.
4. **Phase 4: Real-Time Collaboration Engine** (Completed): Yjs CRDT binary WebSockets, persistent snapshots in PostgreSQL, multi-node replication via Redis Pub/Sub, awareness and presence. See [docs/COLLABORATION.md](./COLLABORATION.md).
5. **Phase 5: Browser-Based Code Editor** (Completed): In-browser Microsoft Monaco Editor integration, bidirectional Yjs synchronization (`MonacoYjsBinding`), dynamic cursor/selection styling, 21 supported programming languages, multi-tab buffer management, customizable themes (`syncode-dark`/`syncode-light`), user preferences, and strict RBAC read-only enforcement for VIEWERS. See [docs/EDITOR.md](./EDITOR.md).
6. **Phase 6: Universal IDE Adapters** (Upcoming): VS Code, JetBrains, and Neovim extensions communicating over universal protocol contracts.

