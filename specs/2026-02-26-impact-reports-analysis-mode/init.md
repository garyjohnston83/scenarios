# Impact Reports (multiple) in Analysis Mode + Tabs + Parallel Eager Loading

## Increment

**Increment 3**

---

## Pre-requisites

Increment 1 complete:
- ScenarioType modes refactored to `EXTERNAL` | `INTERNAL` with legacy normalization.
- Governance mode contains only sticky governance area.

Increment 2 complete:
- `/scenarios/{id}/analysis` route implemented.
- Direct Changes INTERNAL fully functional in analysis mode.
- Deep-link EXTERNAL auto-open + return-to-governance working.
- LHS auto-collapses on analysis entry and LHS click exits to governance.
- Minimal analysis header with back + scenario name + workflow chip + tabs scaffold.

---

## Goals

1. Implement full Impact Reports support in Analysis Mode.
2. Support multiple impact reports per scenario (Impact Report 1 | Impact Report 2 | ...).
3. Render Direct Changes and Impact Reports as separate components.
4. Tabs ordering rules:
   - If both INTERNAL: `Direct Changes | Impact Report 1 | Impact Report 2 | ...`
   - If only Direct Changes INTERNAL: `Direct Changes`
   - If only Impact INTERNAL: `Impact Report 1 | Impact Report 2 | ...`
5. `initial-tab` query param controls initial active tab.
6. Eager parallel loading of all INTERNAL datasets on analysis page load.

---

## Non-goals

- No redesign of governance page.
- No redesign of signoff logic.
- No pagination/filter/export heavy tooling yet.
- No change to expand-based API philosophy unless required for multiple impact datasets.
- No caching optimization beyond basic store-level memoization.

---

## Functional Requirements

### 1) Analysis Tab Model
- Tab types: `"direct-changes"` and `"impact-{impactId}"` (unique per impact dataset)
- Display labels: "Direct Changes", "Impact Report 1", "Impact Report 2", ...
- Tab ordering: Direct Changes always first if INTERNAL. Impact reports ordered by `ImpactRun.createdAt` ascending (or explicit order index if provided by backend). Order must be deterministic.

### 2) Backend Data Model
- Current model: ImpactRun, ScenarioGridDataset (dataset_type = "IMPACT_DATA"), ScenarioGridRow
- Enhancement: Support multiple impact datasets per scenario. One ScenarioGridDataset per ImpactRun (preferred).
- API contract: `GET /scenarios/{id}?expand=impactData` returns `impactData: { reports: [{ impactRunId, name, createdAt, dataset: { columns, rows } }, ...] }`

### 3) Frontend Data Fetching (Parallel Eager Loading)
- On analysis page mount: fetch header+summaryCards, normalize modes, build internal sections list, launch parallel fetches.
- Prefer single `expand=impactData` call returning all reports.

### 4) Tab Activation Logic
- `initial-tab=direct-changes` activates Direct Changes if INTERNAL.
- `initial-tab=impact-reports` activates first impact report tab if INTERNAL.
- Fallback: direct-changes if available, else first impact report, else navigate back to governance.
- Changing tab does NOT modify route.

### 5) Impact Report Component
- New `ImpactReportAnalysisView.tsx`, separate from DirectChangesAnalysisView.
- Full-width table with horizontal scroll, reuses DataGridTable.
- Optional metadata strip: report name + createdAt.
- Loading spinner, error banner with retry.

### 6) Deep-Link EXTERNAL Behavior (Impact)
- `/analysis?initial-tab=impact-reports` with EXTERNAL impactDataMode: open external URL, navigate back to governance.

---

## Frontend Architecture Changes

- Extend analysis slice state with `impactReports` section.
- Dynamic tab list built from available INTERNAL sections.
- Remove placeholder impact tab from increment 2.

---

## Backend Changes

- Extend `buildImpactData()` to return list of reports joined with ImpactRun.
- Maintain expand guard (EXTERNAL → 400).
- Deterministic ordering. Legacy tolerance (single dataset → one-element array).

---

## Acceptance Criteria

- [ ] Both INTERNAL: tabs show `Direct Changes | Impact Report 1 | Impact Report 2`, all fetched eagerly in parallel.
- [ ] Direct Changes INTERNAL + Impact EXTERNAL: tabs show `Direct Changes` only; governance impact CTA opens external URL.
- [ ] Direct Changes EXTERNAL + Impact INTERNAL (2 reports): tabs show `Impact Report 1 | Impact Report 2`; direct-changes deep link auto-opens external URL.
- [ ] No regressions in LHS, back navigation, activity stream, signoff/workflow.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Impact INTERNAL but zero reports | Show empty state: "No impact reports available." |
| Impact dataset present but columns empty | Render empty table state |
| Cold deep-link to `/analysis` | All required header + impact metadata fetched correctly |

---

## Implementation Notes

- Prefer single `expand=impactData` call returning all reports in one response.
- `normalizeMode` utility continues to be used at every API boundary.
- `normalizeTab` utility to be extended for impact report tab resolution.
- Impact reports ordered by `createdAt` ascending for deterministic ordering.

---

## Decisions

### D1. Schema Migration Strategy for Multiple Impact Datasets
- Add nullable `impact_run_id` FK column to `ScenarioGridDataset`. For `IMPACT_DATA` datasets, populate it; for `DIRECT_CHANGES`, leave null. Existing single `IMPACT_DATA` datasets get migrated to link to the latest ImpactRun for their scenario.

### D2. Impact Data API Response Shape
- Clean break — `expand=impactData` returns `impactData.reports[]` (new multi-report shape). No need to preserve old single-dataset shape since no consumers depend on it yet.

### D3. Seed Data Wiring
- Add proper seed data wiring so all scenarios are internally consistent and at least one scenario demonstrates multi-report behavior. Create grid datasets linked to existing impact runs (scenarios 1-3), and create an impact run for scenario 4's existing grid dataset.

### D4. Report Name Source
- Use `ImpactRun.runRef` as the display name in the frontend (e.g., "RUN-2026-0219-001"). No new `name` column needed on ImpactRun for now.

### D5. Compare CTA in Impact Reports
- Include `compareCta` per report in the API response but do not render it yet in the frontend (placeholder for a future increment).

### D6. Impact Data EXTERNAL Deep-Link URL
- Use `summaryCards.impactSummary.cta.url` for EXTERNAL deep-link handling. Consistent with the increment 2 pattern for direct changes.

### D7. Tab Selection State Management
- Store `activeTab` only in the Redux `analysisSlice` (local to analysis session, cleared on exit). Do not sync tab state to URL in this increment.

### D8. Error Handling Granularity
- Single error state for the entire impact section (all impact tabs show the same error). Consistent with the single `expand=impactData` call approach.

### Visual Assets
- No visual assets provided at this time.
