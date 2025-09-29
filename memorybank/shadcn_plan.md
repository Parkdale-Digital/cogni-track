# shadcn/ui Integration Plan

## Goals & Guardrails
- Refresh the CogniTrack UX with shadcn/ui while retaining the existing Tailwind setup, Clerk auth flows, and Drizzle data layer.
- Roll out in measured phases so each surface (layout, dashboard, forms) is tested before moving on.
- Maintain accessibility, responsive behavior, and light/dark theming across all views.

## Phase 1 – Foundation
1. Install and initialize shadcn/ui (`npx shadcn-ui@latest init`).
2. Align Tailwind config (colors, radius, typography) with the generated tokens.
3. Scaffold shared primitives: `Button`, `Input`, `Card`, `Badge`, `Tooltip`, `Dialog`, `DropdownMenu`, `Table`, `Tabs`, `Alert`, `Skeleton`, `Toast`.
4. Configure the base theme (light/dark) and ensure global styles are applied in `layout.tsx`.
5. Run `npm run lint` / `npm run build`; capture baseline screenshots for reference.

## Phase 2 – Layout & Navigation
1. Rebuild the landing layout header/hero using shadcn `Shell` and button primitives around existing Clerk actions.
2. Update global navigation (dashboard shell, header CTA) to use shadcn spacing and typography.
3. Verify responsiveness and theming; run lint/build.

## Phase 3 – Dashboard Views
1. Replace KPI/stat cards with shadcn `Card` components (icons, tooltips, balanced padding).
2. Wrap Recharts visualizations inside shadcn `Card`/`Tabs` to unify styling.
3. Swap the recent events table for shadcn `Table`, adding pagination and hover states.
4. Introduce shadcn `Skeleton` loaders for cron-triggered refresh states.

## Phase 4 – Forms & Settings
1. Convert API key management flows to shadcn `Form`, `Input`, `Select`, and `Dialog` components.
2. Wire the shadcn toast system for success/error feedback from server actions.
3. Ensure validation messages, disabled states, and focus styles meet accessibility expectations.

## Phase 5 – Secondary Screens & Polishing
1. Apply shadcn patterns to analytics filters/results, auth pages, and any remaining modals.
2. Add global `ToastProvider` and related context to `layout.tsx`.
3. Perform responsive/keyboard/light-dark audits; update documentation and screenshots.

## Validation Checklist (per phase)
- `npm run lint` and `npm run build`
- Manual responsive sweep (mobile/tablet/desktop)
- Keyboard navigation & focus indicators
- Light/dark mode verification
- Updated snapshots/screenshots for stakeholders

## Deliverables
- New UI primitives under `src/components/ui/`
- Updated pages and forms leveraging shadcn patterns
- Memory bank entries documenting adoption rationale and runbooks
- Before/after visuals to demonstrate the design uplift
