# SYNCODE REST API Specification

## 1. Overview
The SYNCODE Backend API is built on NestJS and exposed via an Express adapter.

- **Base URL**: `http://localhost:4000/api/v1`
- **Default Port**: `4000`
- **Global Prefix**: `/api/v1`
- **Protocol**: HTTP/1.1 (JSON)

---

## 2. Standard Headers

### Request Headers
| Header | Type | Description |
|---|---|---|
| `Accept` | `string` | Must be `application/json` |
| `Content-Type` | `string` | Must be `application/json` for request bodies |
| `Authorization` | `string` | Bearer token (Phase 2) |

### Response Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`

---

## 3. Endpoints

### 3.1 Health Check
Performs a deep diagnostic of the API, PostgreSQL database, and Redis cache.

- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Auth Required**: None

#### Responses

##### 200 OK — All Services Healthy
```json
{
  "status": "ok",
  "timestamp": "2026-11-15T12:00:00.000Z",
  "uptime": 124,
  "version": "0.1.0",
  "services": {
    "api": {
      "status": "up",
      "latencyMs": 0.12
    },
    "database": {
      "status": "up",
      "latencyMs": 1.45,
      "message": "PostgreSQL connection active"
    },
    "redis": {
      "status": "up",
      "latencyMs": 0.88,
      "message": "Redis server responsive"
    }
  }
}
```

##### 503 Service Unavailable — Degraded / Down
```json
{
  "status": "degraded",
  "timestamp": "2026-11-15T12:00:00.000Z",
  "uptime": 124,
  "version": "0.1.0",
  "services": {
    "api": {
      "status": "up",
      "latencyMs": 0.15
    },
    "database": {
      "status": "down",
      "latencyMs": 5.12,
      "message": "connect ECONNREFUSED 127.0.0.1:5432"
    },
    "redis": {
      "status": "up",
      "latencyMs": 0.92,
      "message": "Redis server responsive"
    }
  }
}
```

---

## 4. Error Response Format

All application errors return standard JSON envelopes managed by `GlobalExceptionFilter`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error description",
    "details": null
  },
  "path": "/api/v1/resource",
  "timestamp": "2026-11-15T12:00:00.000Z"
}
```

