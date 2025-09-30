# Analytics & Dashboard UX Audit PRD

## Overview
This document captures the findings from the UX evaluation of the Analytics and Dashboard surfaces in the Cogni Track application. The goal is to align the experience with the developer persona’s need to confirm spend anomalies quickly, inspect token and cost trends, export data, and manage provider keys.

## Objectives
- Restore a clear information hierarchy where at-a-glance KPIs precede filters and deep-dive modules.
- Ensure accessible, token-aligned interactions that support keyboard and assistive users.
- Protect the saliency budget so anomaly cues stand out from neutral data presentations.
- Streamline the spike → filter → export workflow with opinionated defaults and consistent grouping.

## Key Findings & Issues
1. **Missing Main Landmarks (UX-001, UX-002)**
   - Analytics and Dashboard pages rely on generic `<div>` wrappers, preventing skip navigation and breaking container rhythm.
2. **Buried KPIs (UX-003)**
   - Usage summary and charts render below filters and alerts, forcing users to scan secondary controls before core insights.
3. **Non-semantic Advanced Filter Toggle (UX-004)**
   - Clickable `<div>` lacks button semantics, aria-expanded, and focus styles, blocking keyboard access to filters.
4. **Filter Chips Without Pressed State (UX-005)**
   - Provider/model chips use ad-hoc colors with no aria-pressed flag, confusing active selections and screen readers.
5. **Over-saturated KPI Tiles (UX-006)**
   - Usage summary cards use bright brand colors that compete with alert semantics and dilute anomaly signaling.
6. **Charts Using Raw Hex Colors (UX-007)**
   - Recharts lines/tooltips ignore design tokens, causing clashes with alert colors and potential contrast issues.
7. **No Active Navigation State (UX-008)**
   - Global navigation provides no current-page feedback or aria-current attribute, hurting wayfinding.
8. **Inconsistent Empty/Filtered States (Related to UX-001/UX-003)**
   - Empty analytics states use default white backgrounds and lack token-based styling, reducing clarity when data is missing.

## Proposed Enhancements
- Wrap page bodies in `<main className="container ...">` and section elements with appropriate aria-labelledby ties.
- Reorder analytics layout to surface `UsageSummary` and charts before filters, alerts, and drill-down modules.
- Convert the advanced filter header into a real `<button>` with aria attributes and focus-visible states.
- Tokenize filter chips, applying `aria-pressed` and neutral inactive colors while keeping active chips aligned with primary/secondary tokens.
- Neutralize KPI tiles using `bg-card`, `bg-muted`, and `text-muted-foreground` tokens, reserving accent colors for numbers only.
- Update Recharts components to use `hsl(var(--primary))` and `hsl(var(--accent))` strokes, `popover` tooltips, and tokenized grids.
- Introduce active nav styling by leveraging `usePathname` and `aria-current` to guide users across Home, Dashboard, and Analytics.
- Harmonize empty/filtered states with token-based cards, clear messaging, and contextual actions such as “Clear filters.”

## Success Metrics
- Time to locate KPIs on Analytics page reduced (measure via usability testing).
- Keyboard accessibility audit passes (advanced filters toggle/chips operable via tab + space).
- Reduced support tickets related to navigation confusion or missing analytics data.
- Qualitative feedback indicating anomaly signals are easier to detect.

## Dependencies & Risks
- Requires coordination with design tokens to confirm usage of `primary`, `accent`, `secondary`, and `muted` palette values.
- Chart styling updates must be validated against both light and dark modes.
- Ensure changes respect existing Clerk auth flows and do not disrupt SignedIn/SignedOut gating.

## Next Steps
1. Implement quick wins (main landmarks, nav active state, semantic filter toggle).
2. Update Analytics layout ordering and restyle KPI tiles/charts.
3. Validate accessibility and contrast with manual QA plus automated tools.
4. Iterate on progressive disclosure (collapsed advanced filters, drill-down sequence) based on user testing feedback.
