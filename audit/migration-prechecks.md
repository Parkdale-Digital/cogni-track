# Migration Pre-Checks – OpenAI Admin Tables

## Purpose
Outline validation steps to run before applying `drizzle/0002_openai_admin_tables.sql`.

## Checklist
1. `ls drizzle/*.sql` – verify migration draft exists (`0002_openai_admin_tables.sql`).
2. `pnpm drizzle-kit export --out audit/migration-prechecks/drizzle-export.sql` – generate SQL from current schema to compare with `drizzle/0002_openai_admin_tables.sql`.
3. `pnpm drizzle-kit check` – validate Drizzle configuration and pending migrations.
4. `pnpm drizzle-kit introspect --out drizzle/meta/pre-admin.json` – snapshot current schema for comparison.
5. `pnpm exec tsx spikes/admin_ingestion_spike.ts` – confirm dedupe + relationship diagnostics still pass after schema updates to `src/db/schema.ts`.
6. Capture command outputs under `/audit/migration-prechecks/` and append signed checksum.

## Command Reference
```bash
ls drizzle/*.sql
pnpm drizzle-kit export --out audit/migration-prechecks/drizzle-export.sql
pnpm drizzle-kit check
pnpm drizzle-kit introspect --out drizzle/meta/pre-admin.json
pnpm exec tsx spikes/admin_ingestion_spike.ts > audit/migration-prechecks/spike-run.log
sha256sum audit/spike-results/admin_ingestion_spike.json > audit/migration-prechecks/spike-report.sha256
```

## Result Log
| Step | Status | Evidence |
| --- | --- | --- |
| List migrations | Completed | `audit/migration-prechecks/list_migrations.txt`, `audit/migration-prechecks/0002_migration.sha256`, `audit/migration-prechecks/drizzle-name-status.diff` |
| Export SQL | Completed | `audit/migration-prechecks/drizzle-export-run1.sql`, `audit/migration-prechecks/drizzle-export-run2.sql`, `audit/migration-prechecks/drizzle-export-post-schema.sql`, `audit/migration-prechecks/drizzle-export-runs.diff`, `audit/migration-prechecks/migration-vs-export.diff`, `audit/migration-prechecks/migration-vs-export-post.diff` |
| Drizzle check | Completed | `audit/migration-prechecks/drizzle-check-latest.log`, `audit/migration-prechecks/drizzle-zone-files.txt` |
| Schema introspect | Completed | `audit/migration-prechecks/schema-snapshot.clean.json`, `audit/migration-prechecks/schema-structure-summary.json`, `audit/migration-prechecks/schema-snapshot-vs-0001.diff`, `audit/migration-prechecks/drizzle-introspect.log` |
| Spike harness | Completed | `audit/migration-prechecks/spike-run-1.log`, `audit/migration-prechecks/spike-run-2.log`, `audit/migration-prechecks/spike-run-normalized.diff`, `audit/migration-prechecks/spike-validation.log` |
| Report checksum | Completed | `audit/migration-prechecks/spike-report.sha256`, `audit/migration-prechecks/spike-report-check.log` |

## Notes
- Run in staging against disposable database before production apply.
- Back up existing schema snapshot: `pnpm drizzle-kit introspect --out drizzle/meta/pre-admin.json` (suggested).
- If diff deviates, revert migration and adjust schema doc before re-running tools.
- 2025-09-30 parity check: `audit/migration-prechecks/migration-vs-export-post.diff` compares
  `drizzle/0002_openai_admin_tables.sql` with the latest schema export. Drizzle dumps the entire
  schema (so `provider_keys`, `users`, etc. appear) and renders FK constraints as `ALTER TABLE`
  statements without `IF NOT EXISTS`, but the OpenAI admin tables match column types, nullability,
  and index coverage one-for-one.
