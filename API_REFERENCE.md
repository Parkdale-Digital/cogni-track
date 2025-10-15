# CogniTrack API Reference

This reference covers the authenticated JSON endpoints exposed by the CogniTrack Next.js application. Routes live under `src/app/api/` and require Clerk authentication unless otherwise noted.

## Base URLs

| Environment | Base URL | Notes |
| --- | --- | --- |
| Local | `http://localhost:5000` | `npm run dev` binds to port 5000. |
| Staging | `https://staging.cogni-track.app` | Requires staging Clerk keys and secrets. |
| Production | `https://app.cogni-track.app` | Protected behind Clerk authentication and Vercel infrastructure. |

> All examples assume JSON requests with `Content-Type: application/json` and that the caller has an active Clerk session cookie. Use Clerk’s SDK or API tokens to obtain authenticated sessions.

## Authentication

- **User endpoints:** `/api/keys` and `/api/usage` rely on Clerk sessions. Unauthenticated requests receive `401 Unauthorized`.
- **Cron endpoint:** `/api/cron/daily-usage` does **not** use Clerk. Instead, it requires a `Bearer` token that matches the `CRON_SECRET` environment variable. Requests without a valid secret return `401` or `503`.

## Endpoint Summary

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/keys` | List masked provider keys for the signed-in user. |
| `POST` | `/api/keys` | Create a new encrypted provider key. |
| `GET` | `/api/keys/{id}` | Fetch a single provider key (masked). |
| `PUT` | `/api/keys/{id}` | Update usage mode, metadata, or rotate the key. |
| `DELETE` | `/api/keys/{id}` | Remove a provider key (cascades usage events). |
| `POST` | `/api/usage` | Trigger ingestion for the current user. |
| `GET` | `/api/usage` | Retrieve recent usage events (optionally paginated). |
| `GET` | `/api/cron/daily-usage` | Run the organization-wide daily ingestion job (Cron only). |

---

## `/api/keys`

### GET `/api/keys`

Returns masked provider keys for the authenticated user. If the database is unreachable (e.g., during local development), the response falls back to an empty payload with header `x-db-off: true`.

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
| `500` | Database failure (see logs for details). |

### POST `/api/keys`

Creates an encrypted provider key. Only OpenAI keys support `admin` mode because ingestion expects organization headers.

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

**Validation Rules**

| Field | Requirement |
| --- | --- |
| `provider` | One of `openai`, `anthropic`, `google`, `cohere`. |
| `apiKey` | Non-empty string. |
| `usageMode` | Optional (`standard` default). Must be `standard` or `admin`. |
| `organizationId`, `projectId` | Required when `usageMode` = `admin`; normalized to `org-*` / `proj_*`. |

**Errors**

| Status | Reason |
| --- | --- |
| `400` | Missing `provider`/`apiKey`, invalid provider, invalid usage mode, or missing org/project IDs for admin mode. |
| `401` | Missing Clerk session. |
| `500` | Unexpected failure while encrypting or inserting. |

## `/api/keys/{id}`

All routes require the provider key to belong to the authenticated user; otherwise a `404` is returned.

### GET `/api/keys/{id}`

Returns masked metadata for a single key.

```json
{
  "key": {
    "id": 13,
    "provider": "openai",
    "maskedKey": "sk-li...90",
    "createdAt": "2025-10-12T05:18:47.901Z",
    "usageMode": "admin",
    "hasOrgConfig": true
  }
}
```

### PUT `/api/keys/{id}`

Allows rotating the key, switching usage modes, or updating admin metadata. Omitting `apiKey` keeps the existing encrypted value.

```http
PUT /api/keys/13 HTTP/1.1
Cookie: __session=...
Content-Type: application/json

{
  "usageMode": "admin",
  "organizationId": "org-new",
  "projectId": "proj_new"
}
```

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

Removes the key and cascades related usage events.

```json
{
  "message": "API key deleted successfully"
}
```

**Common Errors**

| Status | Reason |
| --- | --- |
| `400` | Invalid key ID. |
| `401` | Missing Clerk session. |
| `404` | Key not found for the user. |
| `500` | Unexpected database failure. |

---

## `/api/usage`

### POST `/api/usage`

Triggers ingestion for the current user by calling `fetchAndStoreUsageForUser`. Optional `daysBack` controls the window length and is clamped between 1 and 30.

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

**Errors**

| Status | Reason |
| --- | --- |
| `400` | `daysBack` outside 1–30 or not a number. |
| `401` | Missing Clerk session. |
| `500` | Ingestion failure (message conveys error from `usage-fetcher`). |

### GET `/api/usage`

Retrieves recent usage events sorted by timestamp descending. Supports pagination with `limit` (max 1000) and `offset`.

```http
GET /api/usage?limit=100&offset=0 HTTP/1.1
Cookie: __session=...
```

**Response 200**

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

If the environment has not applied the latest migrations, the handler logs a warning and falls back to the legacy selection without metadata fields.

**Errors**

| Status | Reason |
| --- | --- |
| `401` | Missing Clerk session. |
| `500` | Query failure or database error. |

---

## `/api/cron/daily-usage`

Runs the daily ingestion loop for every registered user. Intended to be triggered by Vercel Cron as configured in `vercel.json`.

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
| `401` | Missing or invalid `CRON_SECRET`. |
| `503` | `CRON_SECRET` not configured in the environment. |
| `500` | An unexpected error occurred while iterating users. |

Archive responses and logs under `audit/cron-dry-run/` during rehearsals to maintain an operational trail.

---

## Tips & Gotchas

- All endpoints return JSON; errors include a single `error` field with a human-readable message.
- Admin ingestion requires `OPENAI_ORGANIZATION` and `OPENAI_PROJECT` headers to be present when the key is stored or updated. Missing metadata generates a `CONFIGURATION_ERROR` telemetry issue.
- To trigger ingestion without exposing secrets in the browser, prefer server actions (e.g., `refreshUsageData` in `src/app/analytics/actions.ts`).
- When encountering `x-db-off: true` responses locally, ensure `LOCAL_DATABASE_URL` points to a reachable Postgres instance or run the app in simulated mode (`ENABLE_SIMULATED_USAGE=true`).

Keep this reference up to date as new routes or providers are added. Include request/response samples backed by fixtures or integration tests to avoid drift.
