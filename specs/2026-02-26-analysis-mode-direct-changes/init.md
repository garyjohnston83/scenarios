# Analysis Mode route + INTERNAL Direct Changes end-to-end (full-screen analysis overlay) + deep-link/EXTERNAL auto-open

## Increment

**Increment 2**

---

## Pre-requisites

Increment 1 completed:

- **ScenarioType modes** refactored to `EXTERNAL` | `INTERNAL` (with legacy normalization `LINK_OUT` -> `EXTERNAL`, `GRID` -> `INTERNAL`)
- **Governance RHS** is sticky governance only (no inline grids)
- **SummaryCards CTAs** use API-provided `cta.url` for `EXTERNAL`; `INTERNAL` CTAs currently show "coming soon" toast

---

## Goals

1. **Introduce dedicated Analysis Mode route for INTERNAL sections:**
   - `/scenarios/{id}/analysis?initial-tab=direct-changes`
   - `/scenarios/{id}/analysis?initial-tab=impact-reports` (impact-reports tab may not exist yet; see non-goals)

2. **Implement INTERNAL Direct Changes as a full-screen analysis surface.**

3. **Wire SummaryCards CTAs in governance mode for INTERNAL navigation.**

4. **Deep-link behavior for EXTERNAL sections** (auto-open + redirect back).

---

## Non-goals

- Do **not** implement Impact Reports rendering yet (increment 3).
- No redesign of filters/export for direct changes.
- No new signoff/governance logic changes.

---

## UX Rules (locked)

- Analysis mode is a **route-based "overlay"** (not a modal).
- **LHS auto-collapse** on entry; user may expand temporarily.
- Clicking a scenario item in LHS **returns to governance** for the clicked scenario.
- **Tabs ordering rules** for increment 2.
- **Back** returns to governance; no scroll position restoration required.

---

## Frontend Changes Overview

| Area | Description |
|---|---|
| **New route** | `/scenarios/:id/analysis` |
| **Analysis slice state** | New Redux/state slice to manage analysis mode state |
| **LHS collapse coordination** | Auto-collapse LHS on analysis entry; allow temporary expand |
| **Navigation behavior rules** | LHS click exits analysis to governance; Back returns to governance |
| **Data fetching strategy** | Fetch direct changes data on analysis route entry |
| **Direct Changes analysis component** | Full-screen analysis surface rendering direct changes content |
| **SummaryCards CTA updates** | Replace "coming soon" toast with navigation for `INTERNAL` sections |

---

## Backend Changes Overview

- **Use existing expand mechanism** for INTERNAL Direct Changes.
- **Compatibility guards** accept legacy values (`LINK_OUT` -> `EXTERNAL`, `GRID` -> `INTERNAL`).
- **No new endpoints required.**

---

## API Contracts

No new API endpoints are introduced in this increment. The frontend will continue to use the existing expand mechanism for INTERNAL Direct Changes data retrieval. The existing CTA contract provides:

- `cta.url` for `EXTERNAL` sections (used for deep-link auto-open).
- `cta.type` / `scenarioType` indicating `EXTERNAL` or `INTERNAL` (with legacy normalization).

---

## Acceptance Criteria

- [ ] New route `/scenarios/:id/analysis` renders analysis screen with Direct Changes tab.
- [ ] LHS is auto-collapsed on analysis entry.
- [ ] Clicking a scenario item in LHS exits analysis and navigates to governance for the clicked scenario.
- [ ] Governance SummaryCards CTAs navigate to analysis route for `INTERNAL` sections (replacing "coming soon" toast).
- [ ] Deep-link `EXTERNAL` auto-open behavior works correctly (opens external URL and redirects back).
- [ ] Direct changes data renders with horizontal scroll support.
- [ ] No regressions in existing governance mode, SummaryCards, or EXTERNAL CTA behavior.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Cold start deep-link** (no prior governance visit) | Analysis route loads data independently; no dependency on prior governance state |
| **Missing CTA URL for EXTERNAL deep-link** | Graceful fallback; do not attempt `window.open` with undefined URL |
| **Invalid or missing `initial-tab` query param** | Default to `direct-changes` tab; do not error |
| **404 scenario** (invalid scenario ID in route) | Show appropriate error/not-found state |

---

## Implementation Notes

- **`normalizeMode` utility** -- Converts legacy values: `LINK_OUT` -> `EXTERNAL`, `GRID` -> `INTERNAL`. Should be used at every API boundary.
- **`normalizeTab` utility** -- Validates and normalizes the `initial-tab` query param; falls back to `direct-changes` if invalid or missing.
- **`window.open` for EXTERNAL deep-links** -- Always use `noopener` and `noreferrer` for security: `window.open(url, '_blank', 'noopener,noreferrer')`.
- **Parallel fetch pattern** -- When entering analysis mode, fetch scenario metadata and direct changes data in parallel to reduce load time.
- **Keep Direct Changes component separate from Impact Reports** -- These are distinct analysis surfaces; do not couple them. Impact Reports will be added in increment 3.

---

## Visual Assets

_Placeholder -- attach mockups, wireframes, or screenshots here as they become available._

---

## Decisions

### D1. Routing Strategy
- Nested child route under `/scenarios/:id` — reuse `SplitPaneLayout` and replace RHS content. Analysis route at `/scenarios/:id/analysis` renders as a child of `ScenarioManagementPage`, sharing the existing LHS.

### D2. LHS Collapse State Management
- Lift collapse state to Redux (global `lhsCollapsed` flag). `SplitPaneLayout` reads from Redux. Analysis page dispatches `setLhsCollapsed(true)` on mount to auto-collapse declaratively.

### D3. LHS Click Behavior in Analysis
- Unconditional — always exit analysis and navigate to governance (`/scenarios/{newId}`) on any LHS scenario click, regardless of whether the clicked scenario is the same one currently open in analysis.

### D4. Analysis State Slice
- New `analysisSlice` — keep governance and analysis state cleanly separated. Analysis slice owns its own loading/error/data state for direct changes (and later impact reports).

### D5. Data Fetching Strategy
- Always fetch header/summaryCards AND directChanges in parallel (simple and correct for cold start). No cache optimization needed — always fetch fresh.

### D6. Component Reuse
- Reuse existing `DataGridTable` inside a new `DirectChangesAnalysisView` wrapper component. Add `overflow-x: auto` via CSS for horizontal scroll support.

### D7. Tab Implementation
- Use Fluent UI `<TabList>` with "Direct Changes" + disabled "Impact Reports" tab (if `impactDataMode == INTERNAL`) to signal future capability. Impact tab shows tooltip "Coming soon".

### D8. EXTERNAL Deep-Link UX
- Show a brief "Redirecting to external system..." loading state, then open the external URL in a new tab (`window.open` with `noopener,noreferrer`) and navigate back to governance `/scenarios/{id}`. This approach handles popup blockers more gracefully than an instant redirect.

### D9. ScenarioDetail Interface
- Keep `ScenarioDetail` governance-only. Store analysis data (directChanges grid data) in the separate `analysisSlice` state. Do not re-add `directChanges`/`impactData` to `ScenarioDetail`.

### D10. Impact Reports CTA Behavior
- Navigate to `/analysis?initial-tab=impact-reports` and show a disabled/placeholder tab in the analysis view with a "Coming soon" message. Do not keep the "coming soon" toast from increment 1 for impact — instead route to analysis consistently.

### D11. Analysis Header Design
- Strictly minimal: back arrow ("← Back to Governance") + scenario name + workflow state chip + tabs. No scenario type badge, owner, or timestamps.

### D12. Browser Back Button Behavior
- Standard browser behavior — browser back returns to the previous history entry (whatever the user navigated from). No custom history manipulation.

### Visual Assets
- No visual assets provided at this time.
