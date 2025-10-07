---
title: Platform Architecture Overview
sidebar_position: 1
---

The CogniTrack platform combines a Next.js application, serverless APIs, and data persistence powered by Drizzle ORM. This page captures the high-level system components that every contributor should understand before diving into feature work.

## Core components

### Web application
- Built with **Next.js 15** and **TypeScript**.
- Tailwind CSS drives styling with a shared design-token system based on CSS variables.
- Clerk provides authentication, authorization, and session management.

### Data access
- Drizzle ORM coordinates access to the backing Postgres database (Neon serverless in production).
- Schema definitions live in `src/db`, keeping types close to the application code.

### Observability and automation
- Background automation is orchestrated through Vercel functions and scheduled jobs.
- Tests and linting run through npm scripts and GitHub automation.

## Next steps
- Review the repository structure in `README.md`.
- Follow the runbooks for day-to-day operational tasks.
- Contribute to the docs whenever architecture changes are proposed.
