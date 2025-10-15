# Documentation Content Guidelines

## Overview
This document provides detailed guidance for creating the six new Docusaurus pages outlined in `documentation_expansion_plan.md`. Use these templates and examples to ensure consistency and quality.

---

## Frontmatter Templates

### Product Documents

#### vision-and-personas.md
```markdown
---
title: Vision & Personas
description: Product vision, target users, and value propositions for the LLM usage tracking platform
sidebar_position: 2
---
```

#### anthropic-integration-roadmap.md
```markdown
---
title: Anthropic Integration Roadmap
description: Multi-provider strategy and Anthropic API integration plans
sidebar_position: 3
---
```

#### beta-readiness-tracker.md
```markdown
---
title: Beta Readiness Tracker
description: Key performance indicators and launch readiness criteria for beta release
sidebar_position: 4
---
```

### Architecture Documents

#### usage-ingestion-pipeline.md
```markdown
---
title: Usage Ingestion Pipeline
description: Data ingestion flow, encryption handling, and deduplication strategy
sidebar_position: 2
---
```

#### telemetry-and-observability.md
```markdown
---
title: Telemetry & Observability
description: Metrics, monitoring, and operational visibility for the ingestion system
sidebar_position: 4
---
```

#### environment-configuration.md
```markdown
---
title: Environment Configuration
description: Environment variables, secrets management, and deployment configuration
sidebar_position: 5
---
```

---

## Content Structure Templates

### Product Document Structure

```markdown
---
[frontmatter]
---

# [Document Title]

## Overview
[2-3 sentence summary of the document's purpose]

## [Main Section 1]
[Content with subsections as needed]

### [Subsection]
[Details]

## [Main Section 2]
[Content]

## Related Documentation
- [Link to related doc 1]
- [Link to related doc 2]
```

### Architecture Document Structure

```markdown
---
[frontmatter]
---

# [Document Title]

## Overview
[2-3 sentence technical summary]

## Architecture Diagram
[Optional: Mermaid diagram or image]

## [Component/Flow Section]
[Technical details]

### Implementation Details
[Code references, patterns]

## Configuration
[Required settings, environment variables]

## Security Considerations
[Security-relevant information]

## Monitoring & Observability
[Metrics, logs, alerts]

## Related Documentation
- [Link to related doc 1]
- [Link to related doc 2]
```

---

## Content Extraction Examples

### Example 1: Vision Statement (from productContext.md)

**Source (memorybank/productContext.md):**
```markdown
## Vision
- Deliver a unified dashboard for LLM API usage and cost insights so operators can monitor spend without scraping multiple provider consoles.
- Expand from single-key OpenAI tracking toward organization-wide telemetry using the OpenAI Admin APIs as the next growth stage.
```

**Transformed (product/vision-and-personas.md):**
```markdown
## Product Vision

CogniTrack provides a unified dashboard for LLM API usage and cost insights, enabling operators to monitor spend across providers without manual console scraping.

The platform evolves from single-key tracking to organization-wide telemetry, leveraging provider admin APIs to deliver comprehensive visibility into AI infrastructure costs.
```

**Changes Applied:**
- ✅ Removed bullet points for prose flow
- ✅ Generalized "next growth stage" to "evolves"
- ✅ Made provider-agnostic where possible

---

### Example 2: Architecture Pattern (from systemPatterns.md)

**Source (memorybank/systemPatterns.md):**
```markdown
## Data Ingestion Flow
1. Scheduler triggers ingestion worker with feature-flagged access to admin mode.
2. Worker decrypts provider keys using AES-GCM helpers in `src/lib/encryption.ts` and resolves per-key usage mode.
3. Standard mode hits `https://api.openai.com/v1/usage`; admin mode calls `https://api.openai.com/v1/organization/usage/completions` with `OpenAI-Organization` and `OpenAI-Project` headers.
```

**Transformed (architecture/usage-ingestion-pipeline.md):**
```markdown
## Ingestion Flow

The usage ingestion pipeline follows a multi-stage process:

### 1. Trigger & Authentication
A scheduled job triggers the ingestion worker, which decrypts provider API keys using AES-GCM encryption (see [`src/lib/encryption.ts`](../../src/lib/encryption.ts)).

### 2. Mode Resolution
The worker determines the appropriate ingestion mode based on key configuration:
- **Standard Mode**: Fetches usage from provider's standard usage endpoint
- **Admin Mode**: Fetches organization-wide usage with admin credentials

### 3. API Request
The worker makes authenticated requests to the provider's API, including required headers for admin mode operations.

For detailed environment configuration, see [Environment Configuration](./environment-configuration.md).
```

**Changes Applied:**
- ✅ Converted numbered list to descriptive sections
- ✅ Added code links for reference
- ✅ Generalized provider-specific URLs to concepts
- ✅ Added cross-link to related doc

---

### Example 3: Filtering Time-Bound Content

**Source (productContext.md):**
```markdown
## Near-Term Objectives (Q4 2025)
1. Validate ingestion accuracy and pricing fallbacks before enabling dashboards for stakeholders (`IngestionTelemetry`).
2. Require `OPENAI_ORGANIZATION` / `OPENAI_PROJECT` configuration prior to cron activation to avoid failed admin syncs.
```

**Transformed (product/beta-readiness-tracker.md):**
```markdown
## Launch Criteria

### Ingestion Validation
- Ingestion accuracy validated against provider invoices
- Pricing fallback mechanisms tested and documented
- Telemetry dashboard (`IngestionTelemetry`) operational

### Configuration Requirements
- Admin mode requires organization and project identifiers
- Configuration validation prevents failed sync attempts
- Automated checks enforce required settings
```

**Changes Applied:**
- ❌ Removed "Q4 2025" date reference
- ✅ Converted objectives to criteria
- ✅ Made statements timeless and capability-focused
- ✅ Generalized provider-specific variables to concepts

---

## Cross-Linking Best Practices

### Link Format
```markdown
See [Document Title](./relative-path.md) for details.
See [Document Title](./relative-path.md#section-anchor) for specific section.
```

### Required Links by Document

#### usage-ingestion-pipeline.md
```markdown
## Monitoring
For operational metrics and alerting, see [Telemetry & Observability](./telemetry-and-observability.md).

## Configuration
Required environment variables are documented in [Environment Configuration](./environment-configuration.md).
```

#### telemetry-and-observability.md
```markdown
## Ingestion Metrics
These metrics track the [Usage Ingestion Pipeline](./usage-ingestion-pipeline.md) performance.
```

#### beta-readiness-tracker.md
```markdown
## Metrics Definitions
Metric definitions and thresholds are documented in [Telemetry & Observability](./telemetry-and-observability.md).
```

#### anthropic-integration-roadmap.md
```markdown
## Multi-Provider Architecture
The ingestion system supports multiple providers through a unified pipeline. See [Usage Ingestion Pipeline](./usage-ingestion-pipeline.md) for technical details.
```

---

## Writing Style Guidelines

### Voice & Tone
- **Active voice**: "The system encrypts keys" not "Keys are encrypted by the system"
- **Present tense**: "The worker decrypts" not "The worker will decrypt"
- **Direct**: Avoid hedging language like "basically", "essentially", "generally"
- **Technical but accessible**: Define acronyms on first use

### Code References
- Link to source files when mentioning implementation: `[src/lib/encryption.ts](../../src/lib/encryption.ts)`
- Use inline code formatting for: `variables`, `functionNames()`, `file.ts`, `API_ENDPOINTS`
- Use code blocks for: multi-line examples, configuration snippets, API responses

### Security Content
- Always mention encryption at rest for sensitive data
- Reference security controls document when discussing access patterns
- Use "redacted" not "hidden" or "masked" for sensitive values
- Link to compliance documentation when relevant

---

## Quality Checklist

Before submitting any new doc, verify:

- [ ] Frontmatter complete with title, description, sidebar_position
- [ ] No date-specific references (Q4 2025, 2025-10-01, etc.)
- [ ] No internal stakeholder names
- [ ] All code references use relative links
- [ ] Required cross-links present (see plan)
- [ ] Acronyms defined on first use
- [ ] Security considerations addressed if relevant
- [ ] Configuration examples use placeholders not real values
- [ ] Markdown linting passes (no broken links)
- [ ] Content is timeless and capability-focused

---

## Maintenance Notes

### When to Update Public Docs
- Major feature launches (after release)
- Architecture changes affecting multiple components
- Security control updates
- New provider integrations
- Breaking configuration changes

### When to Keep in Memorybank Only
- Sprint planning and task tracking
- Internal deadlines and milestones
- Work-in-progress features
- Stakeholder approval status
- Team assignments and ownership

### Quarterly Review Process
1. Review memorybank files for significant updates
2. Identify content meeting "timeless" criteria
3. Apply content filtering guidelines
4. Update relevant Docusaurus pages
5. Submit PR with Documentation WG review
6. Update this guidelines doc if new patterns emerge

---

## Examples of Good vs. Bad Content

### ❌ Bad: Time-Bound and Internal
```markdown
## Q4 2025 Roadmap
Alice will review the admin mode implementation by October 15th. Once legal approves (scheduled 2025-10-02), we'll enable the feature flag for beta users.
```

### ✅ Good: Timeless and Public
```markdown
## Admin Mode Capabilities
Admin mode enables organization-wide usage tracking through provider admin APIs. This feature requires compliance validation and is gated behind feature flags during rollout.
```

---

### ❌ Bad: Implementation Details Without Context
```markdown
## Setup
Set `OPENAI_ORGANIZATION=org-abc123` and `OPENAI_PROJECT=proj-xyz789` in your `.env.local` file.
```

### ✅ Good: Conceptual with Examples
````markdown
## Admin Mode Configuration
Admin mode requires organization and project identifiers from your provider:

```bash
# Example configuration (use your actual values)
OPENAI_ORGANIZATION=org-your-org-id
OPENAI_PROJECT=proj-your-project-id
```

See [Environment Configuration](./environment-configuration.md) for complete setup instructions.
````

---

## Document Ownership

- **Content Creation**: Documentation Working Group + SMEs
- **Technical Review**: Architecture team for architecture docs
- **Approval**: Documentation WG lead
- **Maintenance**: Documentation WG (quarterly sync with memorybank)

---

## Questions or Issues?

If you encounter ambiguity while creating docs:
1. Check this guidelines document first
2. Review existing Docusaurus pages for patterns
3. Consult Documentation Working Group
4. Document the decision in this file for future reference
