# OpenAI Admin Data – Legal Review Brief

**Date:** 2025-10-02  
**Time:** 11:00–11:30 PT (tentative)  
**Attendees:** Legal (TBD), Maya (Security), Product Ops, Codex liaison  

## Purpose
- Confirm whether service-account metadata (names, emails, roles) falls under existing DPAs.
- Determine consent requirements before ingesting organization-level telemetry for customer workspaces.

## Prep Materials
- `docs/openai_admin_security_controls.md`
- `memorybank/integrations.md`
- `audit/security-review/2025-10-01_security_review_agenda.md` (decisions exported)

## Key Questions
1. Does storing `openai_project_members.email` require updates to privacy policy or data processing agreements?
2. Are there jurisdiction-specific retention rules for certificate events or service-account logs?
3. What consent communication is required prior to enabling admin telemetry for managed customers?

## Desired Outcomes
- Written determination on DPA coverage (yes/no, required amendments).
- Guidance on consent/notification language for customers.
- Checklist of legal follow-ups with owners and due dates.
