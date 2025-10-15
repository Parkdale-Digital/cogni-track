---
id: openapi-reference
title: OpenAPI Reference & Downloads
description: Access the latest OpenAI-compatible OpenAPI document and learn how the spec fits into CogniTrack architecture.
---

The OpenAPI document captures the REST surface that CogniTrack integrates with for usage telemetry and admin operations. Keep this file in sync so developers and partner teams can validate requests against the same contract used in automation.

## Download the current spec

- **Format:** YAML (`OpenAPI 3.1`)
- **Source:** Mirrors `openai/openai-openapi` (tag `v2.3.0`) with CogniTrack annotations where applicable.
- **Direct download:** [`openapi.documented.yml`](/specs/openapi.documented.yml)

Use the download link above for tools such as Stoplight, Postman, or VS Code's OpenAPI preview. The file is served from the Docusaurus `static/specs` directory, ensuring Git history tracks updates alongside the site.

## When to update

Update the spec when:

- OpenAI ships new endpoints or fields required by CogniTrack ingestion.
- CogniTrack introduces proxy endpoints that wrap OpenAI calls.
- Any redaction or annotation changes are made for internal consumers.

## Update procedure

1. Pull the latest source spec from `https://github.com/openai/openai-openapi`.
2. Apply CogniTrack-specific annotations (search for `x-cognitrack-*` extensions in the repo for examples).
3. Replace `docs-site/static/specs/openapi.documented.yml` with the updated version.
4. Run `npm run docs:build` to ensure Docusaurus still bundles without warnings.
5. Update this page's changelog and note the version bump in release notes.

## Changelog

| Date       | Version | Notes |
| ---------- | ------- | ----- |
| 2025-10-15 | 2.3.0   | Initial migration into Docusaurus with direct download link. |
