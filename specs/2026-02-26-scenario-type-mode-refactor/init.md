# ScenarioType mode refactor (EXTERNAL|INTERNAL) + Governance-only RHS (remove inline grids)

## Increment

1

## Context

- Current UI has RHS composed of:
    - Sticky governance area (header + key details + summary cards + message/actions + unified activity table)
    - Below-sticky sections for SA scenarios: Direct Changes grid + Impact Data grid (inline, cramped)
- Target direction is to remove all inline analytical tables from governance mode and later introduce a dedicated Analysis route.
- This increment intentionally does **not** deliver the analysis page yet; it prepares contracts and cleans the governance layout.

## Goals

- Refactor ScenarioType "rendering modes" from:
    - `directChangesMode: LINK_OUT | GRID`
    - `impactDataMode: LINK_OUT | GRID`

  to:
    - `directChangesMode: EXTERNAL | INTERNAL`
    - `impactDataMode: EXTERNAL | INTERNAL`

- Update governance-mode RHS so it contains **only** the sticky governance area.
- Preserve current sticky governance behavior.
- Update SummaryCards CTAs for `EXTERNAL` vs `INTERNAL` modes.

## Non-Goals

- No `/analysis` route yet.
- No tabs, overlay, modal, or full-screen analysis UI yet.
- No backend schema migration required beyond renaming/enum updates.
- No change to unified activity stream model.
- No change to signoff governance behavior.
- No change to date/time formatting standard.

## Visual Assets

<!-- Placeholder: add screenshots, wireframes, or design links here -->

## Decisions

### D1. Enum Mapping
- `LINK_OUT` → `EXTERNAL`
- `GRID` → `INTERNAL`

### D2. Backend Guard Logic (Transition Period)
- Accept both old (`LINK_OUT`/`GRID`) and new (`EXTERNAL`/`INTERNAL`) values during transition period, then tighten later.

### D3. Phase-2 Saga Grid Fetches
- Remove the phase-2 fetch entirely for this increment. Governance mode never fetches `directChanges` or `impactData` expands.

### D4. INTERNAL-mode CTA Behavior
- CTA remains enabled. On click, show a toast: "Analysis view coming soon". No navigation occurs.

### D5. DirectChangesSection / ImpactDataSection Components
- Remove the render lines from ScenarioDetailPane but keep the component files in the codebase for future reuse in the analysis route.

### D6. Canonical SummaryCards Implementation
- Use API-provided `cta.url` as the canonical source. Remove hardcoded prototype URLs (`/images/direct-changes-viewer.html`, `/images/impact-report-viewer.html`). Fix the inline CTA rendering in ScenarioDetailPane to use `summaryCards.*.cta.url`.

### D7. Liquibase Migration Approach
- Add a new Liquibase changeset (e.g., `024-rename-mode-values.yaml`) with UPDATE statements. Do not modify existing seed changesets.

### D8. Backend/Frontend Typing
- **Backend:** Keep `ScenarioType` mode fields as bare `String` (no Java enum introduction).
- **Frontend:** Introduce strict TypeScript union type `'EXTERNAL' | 'INTERNAL'` with a normalization shim function that maps legacy values: `normalizeMode(mode: 'LINK_OUT'|'GRID'|'EXTERNAL'|'INTERNAL') => 'EXTERNAL' | 'INTERNAL'`.

### D9. Test Updates
- Update all ~15 test files to use new enum values (`EXTERNAL`/`INTERNAL`).
- Add limited backward-compatibility normalization tests to verify the shim correctly maps `LINK_OUT` → `EXTERNAL` and `GRID` → `INTERNAL`.

### D10. Fix Hardcoded CTA URLs
- Fix the hardcoded CTA URLs in ScenarioDetailPane as part of this increment. Replace with API-provided URLs from `summaryCards.*.cta.url`.

### Visual Assets
- No visual assets provided at this time.
