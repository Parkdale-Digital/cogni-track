---
id: app-api-reference
title: Application API Reference
description: REST endpoints exposed by the CogniTrack Next.js app and cron runner.
sidebar_position: 6
---

CogniTrack exposes a small set of authenticated JSON endpoints for provider key management, usage ingestion, and scheduled automation. This reference summarizes request/response shapes, auth requirements, and common errors. All routes live under `src/app/api/`.

## Base URLs

| Environment | URL | Notes |
| --- | --- | --- |
| Local | `http://localhost:5000` | `npm run dev` binds to port 5000. |
| Staging | `https://staging.cogni-track.app` | Requires staging Clerk credentials. |
| Production | `https://app.cogni-track.app` | Protected by Clerk and Vercel infrastructure. |

> All examples assume JSON requests with `Content-Type: application/json` and an active Clerk session cookie unless noted otherwise.

## Authentication

- **User endpoints** (`/api/keys`, `/api/usage`): rely on Clerk sessions (`auth()` in route handlers). Missing sessions return `401`.
- **Cron endpoint** (`/api/cron/daily-usage`): uses a `Bearer` token that must match the `CRON_SECRET` environment variable. Requests lacking a valid secret return `401` or `503`.

## Endpoint Summary

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/keys` | List masked provider keys for the signed-in user. |
| `POST` | `/api/keys` | Create a new encrypted provider key. |
| `GET` | `/api/keys/{id}` | Retrieve a single provider key (masked). |
| `PUT` | `/api/keys/{id}` | Update usage mode, metadata, or rotate the key. |
| `DELETE` | `/api/keys/{id}` | Delete a provider key (usage events cascade). |
| `POST` | `/api/usage` | Trigger ingestion for the current user. |
| `GET` | `/api/usage` | Fetch recent usage events (with pagination). |
| `GET` | `/api/cron/daily-usage` | Run the daily ingestion loop for all users (cron-only). |

---

## `/api/keys`

### GET `/api/keys`

Lists masked provider keys. When the database is unreachable (common during local dev), the response falls back to an empty list with header `x-db-off: true`.

```http
GET /api/keys HTTP/1.1
Cookie: __session=...
```

**Response 200**

```json
{
  "keys": [
    {
      "id": 12,
      "provider": "openai",
      "maskedKey": "sk-12ab...90cd",
      "createdAt": "2025-10-12T05:13:24.123Z",
      "usageMode": "standard",
      "hasOrgConfig": false
    }
  ]
}
```

**Errors**

| Status | Reason |
| --- | --- |
| `401` | Missing or invalid Clerk session. |
| `500` | Database failure (see server logs). |

### POST `/api/keys`

Creates an encrypted provider key. Only OpenAI keys support `admin` mode because ingestion requires organization-level headers.

```http
POST /api/keys HTTP/1.1
Cookie: __session=...
Content-Type: application/json

{
  "provider": "openai",
  "apiKey": "sk-live-...",
  "usageMode": "admin",
  "organizationId": "org_12345",
  "projectId": "proj_67890"
}
```

**Response 201**

```json
{
  "key": {
    "id": 13,
    "provider": "openai",
    "createdAt": "2025-10-12T05:18:47.901Z",
    "usageMode": "admin",
    "hasOrgConfig": true
  },
  "message": "API key added successfully"
}
```

**Validation rules**

| Field | Requirement |
| --- | --- |
| `provider` | One of `openai`, `anthropic`, `google`, `cohere`. |
| `apiKey` | Non-empty string. |
| `usageMode` | Optional (`standard` default); must be `standard` or `admin`. |
| `organizationId`, `projectId` | Required when `usageMode` = `admin`; normalized to `org-*/proj_*`. |

**Errors:** `400` (validation failure), `401` (no session), `500` (unexpected insertion error).

## `/api/keys/{id}`

All operations ensure the key belongs to the authenticated user.

### GET `/api/keys/{id}`

Returns masked metadata for a single key. Useful for settings UIs that display truncated secrets.

### PUT `/api/keys/{id}`

Rotates credentials, toggles usage mode, or updates admin metadata. Omitting `apiKey` keeps the stored ciphertext while refreshing metadata.

**Response 200**

```json
{
  "key": {
    "id": 13,
    "provider": "openai",
    "createdAt": "2025-10-12T05:18:47.901Z",
    "usageMode": "admin",
    "hasOrgConfig": true
  },
  "message": "Provider key settings updated successfully"
}
```

### DELETE `/api/keys/{id}`

Deletes the key and relies on cascade deletes for `usage_events`.

**Common errors:** `400` (invalid ID), `401` (no session), `404` (key not found), `500` (database failure).

---

## `/api/usage`

### POST `/api/usage`

Triggers ingestion for the current user by calling `fetchAndStoreUsageForUser`. Optional `daysBack` is clamped between 1 and 30.

```http
POST /api/usage HTTP/1.1
Cookie: __session=...
Content-Type: application/json

{ "daysBack": 7 }
```

**Response 200**

```json
{
  "success": true,
  "message": "Usage data fetched for 7 day(s)",
  "telemetry": {
    "userId": "user_123",
    "processedKeys": 2,
    "simulatedKeys": 0,
    "failedKeys": 0,
    "storedEvents": 14,
    "skippedEvents": 0,
    "updatedEvents": 3,
    "windowsProcessed": 7,
    "constraintInserts": 7,
    "constraintUpdates": 3,
    "manualFallbackInserts": 0,
    "manualFallbackUpdates": 0,
    "manualFallbackWindows": 0,
    "manualFallbackKeys": 0,
    "issues": []
  }
}
```

**Errors:** `400` (invalid `daysBack`), `401` (no session), `500` (ingestion failure—see logs for the underlying error).

### GET `/api/usage`

Returns recent usage events ordered by timestamp. Supports pagination with `limit` (max 1000) and `offset`. If daily metadata columns are absent, the handler falls back to a legacy selection and logs a warning.

```json
{
  "events": [
    {
      "id": 5432,
      "model": "gpt-4.1-mini",
      "tokensIn": 512,
      "tokensOut": 128,
      "costEstimate": "0.0045",
      "timestamp": "2025-10-12T05:00:00.000Z",
      "provider": "openai",
      "windowStart": "2025-10-12T00:00:00.000Z",
      "windowEnd": "2025-10-12T23:59:59.999Z",
      "projectId": "proj_67890",
      "openaiApiKeyId": "ok_abc123",
      "openaiUserId": "user_xyz",
      "serviceTier": "standard",
      "batch": false,
      "numModelRequests": 4,
      "inputCachedTokens": 256,
      "inputUncachedTokens": 256,
      "inputTextTokens": 256,
      "outputTextTokens": 128,
      "inputCachedTextTokens": 128,
      "inputAudioTokens": 0,
      "inputCachedAudioTokens": 0,
      "outputAudioTokens": 0,
      "inputImageTokens": 0,
      "inputCachedImageTokens": 0,
      "outputImageTokens": 0
    }
  ]
}
```

---

## `/api/cron/daily-usage`

Designed for Vercel Cron (see `vercel.json`). Requires a `Bearer` token that exactly matches `CRON_SECRET`; the handler rejects the strings `"undefined"` and `"null"` to guard misconfiguration.

```http
GET /api/cron/daily-usage HTTP/1.1
Authorization: Bearer ${CRON_SECRET}
```

**Response 200**

```json
{
  "success": true,
  "processed": 4,
  "successful": 4,
  "errors": 0,
  "warningCount": 0,
  "timestamp": "2025-10-12T05:30:00.000Z",
  "telemetry": {
    "processedUsers": 4,
    "processedKeys": 4,
    "simulatedKeys": 0,
    "failedKeys": 0,
    "storedEvents": 28,
    "updatedEvents": 2,
    "windowsProcessed": 4,
    "constraintInserts": 4,
    "constraintUpdates": 2,
    "manualFallbackInserts": 0,
    "manualFallbackUpdates": 0,
    "manualFallbackWindows": 0,
    "manualFallbackKeys": 0,
    "issuesByCode": {}
  }
}
```

**Errors**

| Status | Reason |
| --- | --- |
| `401` | Missing or incorrect `CRON_SECRET`. |
| `503` | `CRON_SECRET` not configured; cron pauses automatically. |
| `500` | Unexpected error while processing users (check logs for details). |

Store cron responses and supporting artefacts in `audit/cron-dry-run/` during rehearsals, and note follow-up actions in `memorybank/daily_usage_progress.md`.

---

## Tips & Gotchas

- All routes return JSON with either a data payload or an `error` string. Handle non-2xx responses gracefully in client code.
- Admin ingestion requires both organization and project IDs; missing metadata yields a `CONFIGURATION_ERROR` telemetry entry.
- When `x-db-off: true` appears, spin up Postgres or configure `LOCAL_DATABASE_URL`. You can also enable `ENABLE_SIMULATED_USAGE` for sandbox testing.
- Prefer server actions (e.g., `refreshUsageData`) over client-side fetches when passing secrets or running privileged operations.

Keep this reference updated as new endpoints or providers are introduced. Companion documentation lives in the [Usage Ingestion Pipeline](usage-ingestion-pipeline.md) and [Telemetry & Observability](telemetry-and-observability.md) pages.
