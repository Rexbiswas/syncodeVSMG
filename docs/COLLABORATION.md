# SYNCODE — Phase 4: Real-Time Collaboration Engine

## 1. Executive Summary

Phase 4 establishes the distributed, low-latency, multi-user document synchronization engine for the SYNCODE platform. Built upon **Yjs**, **CRDT (Conflict-Free Replicated Data Types)**, **WebSockets**, and **Yjs Awareness**, this engine guarantees conflict-free concurrent editing, sub-15ms roundtrip synchronization, persistent document recovery across restarts, cluster-wide horizontal scalability via Redis Pub/Sub, and strict role-based access control.

---

## 2. High-Level Architecture & Topology

```text
                     [ Client Browser / IDE Extension ]
                                    │
                                    │ WebSocket /collaboration?token=...&roomId=...&documentKey=...
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Collaboration Gateway (:4001)                         │
│                                                                        │
│   ┌───────────────────────┐              ┌─────────────────────────┐   │
│   │     TokenVerifier     │              │     RoomAuthorizer      │   │
│   │  (JWT HMAC-SHA256)    │              │ (PostgreSQL Tenancy DB) │   │
│   └──────────┬────────────┘              └────────────┬────────────┘   │
│              │                                        │                │
│              └───────────────────┬────────────────────┘                │
│                                  │ (Verified & Authorized)             │
│                                  ▼                                     │
│                     ┌─────────────────────────┐                        │
│                     │     DocumentManager     │                        │
│                     └────────────┬────────────┘                        │
│                                  │                                     │
│             ┌────────────────────┴────────────────────┐                │
│             ▼                                         ▼                │
│   ┌─────────────────────┐                   ┌─────────────────────┐    │
│   │    ManagedRoom A    │                   │    ManagedRoom B    │    │
│   │ ─────────────────── │                   │ ─────────────────── │    │
│   │ • Y.Doc (CRDT)      │                   │ • Y.Doc (CRDT)      │    │
│   │ • Yjs Awareness     │                   │ • Yjs Awareness     │    │
│   │ • Local Connections │                   │ • Local Connections │    │
│   └─────────┬───────────┘                   └─────────┬───────────┘    │
└─────────────┼─────────────────────────────────────────┼────────────────┘
              │                                         │
       Postgres Persistence                      Redis Coordination
              │                                         │
              ▼                                         ▼
   ┌───────────────────────┐               ┌─────────────────────────┐
   │      PostgreSQL       │               │       Redis 7           │
   │ ───────────────────── │               │ ─────────────────────── │
   │ • CollaborationDoc    │               │ • Pub/Sub Channel:      │
   │ • DocumentUpdate      │               │   collaboration:room:*  │
   │ • DocumentSnapshot    │               │ • Presence Hash:        │
   │                       │               │   collaboration:pres:*  │
   └───────────────────────┘               └─────────────────────────┘
```

---

## 3. Communication Protocol (Binary WebSocket)

Collaboration frames use the compact binary encoding defined in `y-protocols`:

| Frame Code | Constant | Description |
| :--- | :--- | :--- |
| `0` | `YJS_MSG_SYNC` | CRDT Document Synchronization (Step 1, Step 2, and incremental updates) |
| `1` | `YJS_MSG_AWARENESS` | Ephemeral user presence, cursor locations, and selections |
| `2` | `YJS_MSG_ROOM_INFO` | Server-verified authorization metadata, assigned user color, and permissions |
| `4` | `YJS_MSG_ERROR` | Error notifications (e.g. `READ_ONLY_VIOLATION`, `UNAUTHENTICATED`) |

### Synchronization Flow:
1. **Connection**: Client establishes WebSocket connection with `token`, `roomId`, and optional `documentKey`.
2. **Room Info**: Server dispatches `YJS_MSG_ROOM_INFO` containing user role, read-only status, assigned deterministic color, and room metadata.
3. **Step 1**: Server transmits its state vector (`writeSyncStep1`) to the client.
4. **Step 2**: Server transmits missing document state (`writeSyncStep2`) to the client; client replies with any local updates.
5. **Incremental Edits**: Subsequent changes are broadcast via `syncProtocol.writeUpdate` to all peer clients.

---

## 4. Security & Role-Based Access Control (RBAC)

1. **Mandatory Handshake Authentication**:
   - Every connection query must supply a valid `token` matching `JWT_ACCESS_SECRET`.
   - Expired or tampered tokens are rejected with WebSocket close code `4001`.
2. **Workspace & Room Authorization**:
   - `RoomAuthorizer` queries PostgreSQL to verify that the room exists and that the user holds valid workspace membership.
   - Unauthorized attempts receive close code `4003` (`ROOM_FORBIDDEN`).
3. **Viewer Enforcement (`READ_ONLY_VIOLATION`)**:
   - Users with the `VIEWER` role receive `isReadOnly = true`.
   - Any document modification submitted by a Viewer is intercepted, rejected with `CollaborationErrorCode.READ_ONLY_VIOLATION`, and the client is forcibly re-synchronized to the server state.
4. **Spoofing Prevention**:
   - Awareness user identities are sealed server-side using the verified JWT payload (`id`, `username`, `displayName`, `role`). Clients cannot forge user identities in awareness packets.
5. **Payload Limiting**:
   - Max payload is capped at `COLLABORATION_MAX_PAYLOAD_BYTES` (default 1MB). Oversized frames trigger immediate disconnect (`1009`).

---

## 5. Persistence Strategy & Disaster Recovery

Documents persist across server restarts via three PostgreSQL entities:

1. `CollaborationDocument`:
   - Unique per `(roomId, documentKey)`.
   - Tracks document version and latest compacted snapshot.
2. `DocumentUpdate`:
   - Appends incremental binary updates (`updateData: Bytes`) tagged with `userId` and timestamp.
3. `DocumentSnapshot`:
   - Full document state compaction (`binaryState: Bytes`).
   - Periodic compaction triggers automatically every **50 updates**, flushes a single consolidated snapshot, and deletes historical incremental updates to prevent unconstrained table growth.

---

## 6. Multi-Instance Cluster Synchronization

1. **Redis Pub/Sub Replication**:
   - Updates applied on one collaboration node are published to Redis channel `collaboration:room:<roomId>:<documentKey>`.
   - Peer instances subscribe and apply updates with transaction origin `'redis'`, avoiding cyclic echo broadcasts.
2. **Cluster Presence Tracking**:
   - Presence hashes `collaboration:presence:<roomId>` store active user metadata with TTL-backed heartbeat entries.
   - Disconnections clean up user presence across all cluster instances.

---

## 7. Performance Benchmarks

Automated benchmarks in `src/__tests__/performance.test.ts` verify:

- **CRDT Edit Throughput**: 500 consecutive CRDT operations execute in under `300ms` (< 0.6ms / edit).
- **Serialization & Deserialization**: Binary packet transformation in under `5ms`.
- **Snapshot Compaction**: 200 incremental edits compacted in under `15ms`.
- **Awareness Engine**: 1,000 cursor updates encoded and applied in under `200ms` (> 5,000 updates/sec).

---

## 8. Frontend Integration: Monaco Editor & Awareness

In Phase 5, the browser client (`apps/web`) connects Microsoft Monaco Editor to the Yjs collaboration engine:
- **`MonacoYjsBinding`**: Handles bidirectional synchronization between Monaco's text model and `Y.Text('content')` protected by a re-entrant mutex lock.
- **Remote Cursors & Selection Highlights**: Maps remote awareness states into Monaco delta decorations with collaborator colors, initials, and name tags.
- **Document Routing**: Multi-tab buffers route to distinct `documentKey` instances per room.
- **Read-Only Enforcement**: Automatically configures `readOnly: true` in Monaco for users with the `VIEWER` role.
See [docs/EDITOR.md](./EDITOR.md) for full implementation details.
