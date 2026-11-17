# SYNCODE REST API Specification

## 1. Overview
The SYNCODE Backend API is built on NestJS and exposed via an Express adapter.

- **Base URL**: `http://localhost:4000/api/v1`
- **Default Port**: `4000`
- **Global Prefix**: `/api/v1`
- **Protocol**: HTTP/1.1 (JSON)

---

## 2. Standard Headers & Authentication

### Request Headers
| Header | Type | Description |
|---|---|---|
| `Accept` | `string` | Must be `application/json` |
| `Content-Type` | `string` | Must be `application/json` for request bodies |
| `Authorization` | `string` | `Bearer <jwt_access_token>` for protected routes |
| `Cookie` | `string` | `syncode_refresh_token=<token>` (HttpOnly, automatic for refresh/logout) |

### Response Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

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

---

### 3.2 Authentication Endpoints (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
Creates a new user account with Argon2id password hashing and issues tokens.
- **Auth**: None
- **Body**: `{ "email": "user@example.com", "username": "alex", "displayName": "Alex Dev", "password": "Password123" }`
- **Response**: `201 Created` with `{ "user": { ... }, "accessToken": "..." }` and HttpOnly refresh token cookie.

#### `POST /api/v1/auth/login`
Authenticates email and password credentials.
- **Auth**: None
- **Body**: `{ "email": "user@example.com", "password": "Password123" }`
- **Response**: `200 OK` with `{ "user": { ... }, "accessToken": "..." }` and HttpOnly refresh token cookie.

#### `POST /api/v1/auth/refresh`
Performs refresh token rotation.
- **Auth**: HttpOnly cookie (`syncode_refresh_token`)
- **Response**: `200 OK` with `{ "accessToken": "..." }` and new HttpOnly refresh token cookie.

#### `POST /api/v1/auth/logout`
Revokes current session and clears refresh cookie.
- **Auth**: Optional JWT / HttpOnly cookie
- **Response**: `200 OK` with `{ "success": true }`.

#### `POST /api/v1/auth/logout-all`
Revokes all active sessions for the authenticated user.
- **Auth**: Bearer JWT
- **Response**: `200 OK` with `{ "success": true }`.

#### `GET /api/v1/auth/me`
Retrieves authenticated user profile.
- **Auth**: Bearer JWT
- **Response**: `200 OK` with `{ "user": { ... } }`.

#### `POST /api/v1/auth/verify-email`
Verifies user's email address with a single-use token.
- **Auth**: None
- **Body**: `{ "token": "..." }`
- **Response**: `200 OK` with `{ "success": true, "message": "Email verified successfully" }`.

#### `POST /api/v1/auth/resend-verification`
Generates and sends a new verification token.
- **Auth**: Optional Bearer JWT / Body email
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `200 OK` with `{ "success": true }`.

#### `POST /api/v1/auth/forgot-password`
Initiates password recovery.
- **Auth**: None
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `200 OK` with `{ "success": true, "message": "If this email is registered..." }`.

#### `POST /api/v1/auth/reset-password`
Resets password using single-use reset token and revokes active sessions.
- **Auth**: None
- **Body**: `{ "token": "...", "newPassword": "NewPassword123" }`
- **Response**: `200 OK` with `{ "success": true, "message": "Password reset successfully" }`.

#### `GET /api/v1/auth/oauth/google`
Returns or redirects to Google OAuth2 authorization URL.

#### `GET /api/v1/auth/oauth/google/callback`
Google OAuth2 callback processing code exchange, account linking, and cookie issuance.

---

### 3.3 Users Endpoints (`/api/v1/users`)

#### `PATCH /api/v1/users/me`
Updates user profile.
- **Auth**: Bearer JWT
- **Body**: `{ "displayName": "New Name", "avatarUrl": "https://..." }`
- **Response**: `200 OK` with updated user object.

#### `POST /api/v1/users/me/password`
Changes current password.
- **Auth**: Bearer JWT
- **Body**: `{ "currentPassword": "OldPassword123", "newPassword": "NewPassword123" }`
- **Response**: `200 OK` with `{ "success": true }`.

#### `GET /api/v1/users/me/sessions`
Lists all active sessions with IP and user-agent metadata.
- **Auth**: Bearer JWT
- **Response**: `200 OK` with `SessionItem[]`.

#### `DELETE /api/v1/users/me/sessions/:id`
Revokes an individual active session.
- **Auth**: Bearer JWT
- **Response**: `200 OK` with `{ "success": true }`.

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
