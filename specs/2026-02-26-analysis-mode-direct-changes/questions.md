# Increment 2 -- Clarifying Questions (Spec-Shaper Research)

The following questions emerged from a full codebase audit of the current implementation after increment 1. Each question includes context explaining **why** it matters and **what code** informed the question.

---

## 1. Routing strategy: nested route under ScenarioManagementPage vs. sibling route?

**Context:** The current routing in `AppRoutes.tsx` (line 8-11) nests `/scenarios/:id` as a child of `/scenarios`, with `ScenarioManagementPage` as the parent element. The parent renders `<Outlet />` (line 20 of `ScenarioManagementPage.tsx`), but the Outlet currently renders `null` -- it exists only to activate React Router context for `useParams()`.

The init.md specifies a new route `/scenarios/:id/analysis`. Two approaches exist:

- **Option A: Nested route** -- Add `<Route path=":id/analysis" element={<AnalysisPage />} />` as a child of the `/scenarios` parent route. This keeps `ScenarioManagementPage` as the layout shell (TopNavBar + SplitPaneLayout stay mounted), and the Outlet renders the analysis overlay. The LHS and governance RHS remain in the DOM (hidden or repositioned).
- **Option B: Sibling route** -- Add `/scenarios/:id/analysis` as a completely separate top-level route with its own page component. This means SplitPaneLayout, ScenarioListPane, etc. are completely unmounted when entering analysis mode, and must be re-mounted on return.

**Question:** Which approach is intended? Option A preserves the LHS in DOM (supporting the "user may expand temporarily" requirement without re-fetching the scenario list), but requires the analysis content to render in the RHS slot or overlay the RHS. Option B is simpler but forces a full remount (and re-fetch of the scenario list) when the user clicks "Back" to governance. If Option A, should the analysis content **replace the RHS panel content** (conditional rendering inside ScenarioManagementPage based on route match), or **overlay** both LHS+RHS?

---

## 2. LHS auto-collapse: who owns the collapse trigger and how?

**Context:** `SplitPaneLayout.tsx` (lines 13-14) keeps `isCollapsed` as **local `useState`** inside the component. The collapse/expand is driven by `panelRef.current?.collapse()` and `panelRef.current?.expand()`, where `panelRef` is a local `useRef<ImperativePanelHandle>`. There is **no prop** to set initial collapsed state, and no ref/callback exposed to parent components.

The init.md requires: "LHS auto-collapsed on analysis entry." This means an external trigger (route change, or analysis slice state change) needs to programmatically collapse the LHS.

**Question:** Should we:
- **(A)** Lift the collapse imperative out of SplitPaneLayout by accepting an optional `imperativeRef` prop (using `useImperativeHandle` + `forwardRef`) so the parent `ScenarioManagementPage` can call `panelRef.collapse()` when it detects the analysis route is active?
- **(B)** Add a `defaultCollapsed` or `forceCollapsed` prop to SplitPaneLayout that reacts to a Redux state flag?
- **(C)** Create a shared context/provider that both the route and SplitPaneLayout subscribe to?

Option A is the lightest touch and avoids coupling SplitPaneLayout to Redux. Option B/C may introduce bidirectional state sync issues (the `react-resizable-panels` library v3.x manages its own internal panel state via `ImperativePanelHandle`). Please confirm the preferred approach.

---

## 3. LHS click in analysis mode: navigate to governance for the clicked scenario -- via what mechanism?

**Context:** `ScenarioListPane.tsx` (line 301) currently navigates on item click via:
```ts
onClick={() => navigate(`/scenarios/${item.id}`)}
```
The init.md states: "Clicking a scenario item in LHS exits analysis and navigates to governance for the clicked scenario." This already happens naturally if the user clicks in the LHS, since `/scenarios/${item.id}` is the governance route. But this only works if the LHS is actually mounted and receiving clicks during analysis mode.

**Question:** If we use the nested-route approach (Question 1, Option A), the LHS stays mounted and clicking works automatically. If we use the sibling-route approach, the LHS is not mounted during analysis. Which is it? Additionally, if the user temporarily expands the LHS during analysis, clicks a **different** scenario, should we navigate to **governance for the new scenario** (exit analysis)? Or navigate to **analysis for the new scenario** (stay in analysis)? The init.md says "returns to governance," but this could be surprising if the user expected to switch scenarios within analysis mode.

---

## 4. Analysis slice: separate Redux slice or extend the existing `scenariosSlice`?

**Context:** The current `scenariosSlice.ts` has a `ScenariosState` interface (line 142) with no analysis-related fields. The `ScenarioDetail` interface (line 122) explicitly comments: `// directChanges and impactData removed -- governance mode does not render grids`. The init.md says "New Redux/state slice to manage analysis mode state" and "Analysis slice state."

The store in `store.ts` (line 9-13) currently has two reducers: `scenarios` and `admin`. Adding a third `analysis` reducer is straightforward.

**Question:** Please confirm: should we create a **new `analysisSlice.ts`** with its own state shape (e.g., `{ activeTab, directChanges, directChangesLoading, directChangesError, scenarioId }`)? Or should the analysis data be added as fields on the existing `scenariosSlice`? A separate slice keeps governance and analysis state decoupled (the init.md's "Analysis slice state" suggests this), but it means the analysis saga needs to know the scenario ID independently of `selectedDetail`. Should the analysis slice store its own copy of `scenarioId` parsed from the route, or reference `scenarios.selectedDetail.id`?

---

## 5. Data fetching: can we reuse `fetchScenarioDetail` with `expand=directChanges`, or do we need a separate API function?

**Context:** The current `scenarioApi.ts` (line 18-19) fetches governance data:
```ts
`${API_BASE_URL}/scenarios/${id}?expand=header,summaryCards,events`
```
The backend `ScenarioDetailService.buildDirectChanges()` (line 845-887) is activated when `expand` contains `directChanges`. It guards against EXTERNAL mode (line 848-851) and returns `DirectChangesDto(columns, rows)`.

The init.md says "Fetch direct changes data on analysis route entry" and mentions "Parallel fetch pattern -- fetch scenario metadata and direct changes data in parallel."

**Question:** Should the analysis route make a **single call** `?expand=header,summaryCards,directChanges` (one request, getting both metadata and grid data)? Or should it make **two parallel calls**: one for metadata (`expand=header,summaryCards`) and one for direct changes (`expand=directChanges`)? The backend supports both in a single expand, but the single-call approach means analysis data would need to go into `ScenarioDetail` (conflating governance and analysis state), whereas two calls allows the analysis slice to own its own data independently. Also, for the "cold start deep-link" edge case, the analysis page has no governance data pre-loaded -- does the metadata call need to include `events` too, or is header+summaryCards sufficient for the analysis header?

---

## 6. Analysis page layout: what renders in the analysis surface besides the grid?

**Context:** The `DirectChangesSection` component (line 9-24) renders a heading ("Direct Changes") and delegates to `DataGridTable` for rendering. The `DataGridTable` (line 10-112) has a filter input and a sortable HTML table with horizontal scroll not explicitly handled (the `.gridContainer` style has `width: 100%` but no `overflow-x`).

The init.md acceptance criteria say: "Direct changes data renders with horizontal scroll support." The init.md also mentions "tabs ordering rules for increment 2" and "Back returns to governance."

**Question:**
- Does the analysis page show a **header bar** with the scenario name, a Back button/breadcrumb, and the tab strip? Or is it just tabs + grid content below?
- Should the existing `DirectChangesSection` component be reused as-is inside the analysis surface, or should we create a new `AnalysisDirectChangesPanel` that is full-screen optimized (no section heading duplication if tabs already indicate which section)?
- For horizontal scroll: should we add `overflow-x: auto` to the `DataGridTable` `.gridContainer` style, or is a more sophisticated virtualized table expected?
- Are there visual assets/mockups available that show the analysis page layout? **The init.md has a placeholder for visual assets but nothing attached yet.**

---

## 7. Tab implementation: which tab library/component, and what are the "tab ordering rules"?

**Context:** The init.md mentions "Tabs ordering rules for increment 2" but does not specify what those rules are. The project uses `@fluentui/react-components` (imported extensively in ScenarioDetailPane). Fluent UI v9 provides `<TabList>` and `<Tab>` components.

The init.md says increment 2 has two tab values: `direct-changes` and `impact-reports`. But the non-goals say "Do not implement Impact Reports rendering yet (increment 3)."

**Question:**
- Should we use Fluent UI `<TabList>` + `<Tab>` for the tab strip?
- For increment 2, should the tab strip show **both tabs** (direct-changes visible + active, impact-reports visible but disabled/placeholder), or **only the direct-changes tab** (and impact-reports tab added in increment 3)?
- What are the "tab ordering rules"? Is this about which tab appears first, or about dynamic ordering based on scenario type (e.g., if a scenario type has `directChangesMode: INTERNAL` but `impactDataMode: EXTERNAL`, should the impact-reports tab be hidden entirely)?
- The `initial-tab` query param: should changing tabs update the URL query param (so the URL is always shareable/bookmarkable), or is `initial-tab` only used on first load?

---

## 8. EXTERNAL deep-link auto-open: what is the exact UX flow?

**Context:** The init.md says "Deep-link EXTERNAL auto-open behavior works correctly (opens external URL and redirects back)." Currently, EXTERNAL CTAs in the governance view (ScenarioDetailPane.tsx lines 323-345) render as `<Link href={url} target="_blank">` -- a standard new-tab link.

The edge case table mentions "Missing CTA URL for EXTERNAL deep-link: Graceful fallback; do not attempt `window.open` with undefined URL."

**Question:** What triggers the EXTERNAL deep-link auto-open? Is the scenario:
1. User navigates to `/scenarios/:id/analysis?initial-tab=direct-changes` for a scenario where `directChangesMode === 'EXTERNAL'`.
2. The analysis page detects EXTERNAL mode, calls `window.open(cta.url, '_blank', 'noopener,noreferrer')`.
3. Then immediately `navigate(-1)` or `navigate(`/scenarios/${id}`)` to return to governance?

Or does this happen from the governance CTA click (i.e., clicking the Changes Summary CTA for an EXTERNAL scenario does `window.open` + stays on governance, no route change needed)? The current EXTERNAL CTA already opens in a new tab via `target="_blank"` -- so what is the "redirects back" referring to? Is this specifically for the case where someone lands on `/scenarios/:id/analysis` via a **shared URL/bookmark** for a scenario that happens to be EXTERNAL?

---

## 9. ScenarioDetail interface: should `directChanges` be re-added, or kept in a separate type?

**Context:** The `ScenarioDetail` interface in `scenariosSlice.ts` (line 122-134) currently has this comment:
```ts
// directChanges and impactData removed -- governance mode does not render grids
```
But the `DirectChangesData` and `ImpactDataData` interfaces are still defined in the same file (lines 106-120). The backend `ScenarioDetailDto` (line 9-23) still includes `directChanges` and `impactData` as optional fields (non-null only when expanded).

**Question:** If we use a separate analysis slice (per Question 4), the analysis slice would define its own state shape referencing `DirectChangesData`. Should we:
- **(A)** Re-add `directChanges?: DirectChangesData` back to `ScenarioDetail` so a single API response can populate it?
- **(B)** Keep `ScenarioDetail` governance-only and create a separate `AnalysisData` interface in the analysis slice?
- **(C)** Share the `DirectChangesData` type across both slices (already exported from scenariosSlice) but store the data in the analysis slice?

Option C seems cleanest: shared types, separate storage. Please confirm.

---

## 10. `normalizeTab` utility: should it validate against scenario type modes?

**Context:** The init.md mentions a `normalizeTab` utility: "Validates and normalizes the `initial-tab` query param; falls back to `direct-changes` if invalid or missing." The edge case table says: "Invalid or missing `initial-tab` query param: Default to `direct-changes` tab."

**Question:** Should `normalizeTab` purely validate the string value (checking if it is `'direct-changes'` or `'impact-reports'`, defaulting to `'direct-changes'`), or should it also cross-reference the scenario's type modes? For example, if a scenario has `directChangesMode: EXTERNAL` and someone navigates to `?initial-tab=direct-changes`, should normalizeTab detect this mismatch and redirect/fallback, or should that guard logic live in the component/saga instead?

---

## 11. Existing `SummaryCardsSection` component vs. inline card rendering in ScenarioDetailPane

**Context:** There are two implementations of summary card rendering:
1. `SummaryCardsSection.tsx` (lines 14-137) -- a standalone component that receives `SummaryCardsData` as props. It renders EXTERNAL CTA links but does **not** use `normalizeMode` and does **not** handle INTERNAL CTAs (no "coming soon" toast, no analysis navigation).
2. The inline rendering in `ScenarioDetailPane.tsx` (lines 252-452) -- directly renders cards with `normalizeMode` and the "coming soon" toast for INTERNAL CTAs.

The `SummaryCardsSection` component appears to be an older version that is only referenced in its own test file and in a `ScenarioDetailPane.test.tsx` import check, but is **not actually rendered** in the current ScenarioDetailPane.

**Question:** For increment 2, we need to replace the INTERNAL "coming soon" toast with `navigate(`/scenarios/${id}/analysis?initial-tab=direct-changes`)`. Should we update the inline rendering in `ScenarioDetailPane.tsx` directly, or should we refactor to use the `SummaryCardsSection` component (updating it to handle INTERNAL navigation)? The inline approach is the lowest-risk change (modify 2 onClick handlers). Please confirm.

---

## 12. 404/error handling on the analysis route for invalid scenario IDs

**Context:** The current governance route handles 404s in `ScenarioDetailPane.tsx` (lines 151-165) by showing "Scenario not found" with a "Back to scenarios" button. The `scenariosSaga.ts` `handleFetchScenarioDetail` catches errors and dispatches `fetchScenarioDetailFailure`.

For the analysis route, if someone navigates to `/scenarios/invalid-id/analysis`, the fetch will 404.

**Question:** Should the analysis page show its own error state (e.g., "Scenario not found" with a back link), or should it redirect to `/scenarios` (or `/scenarios/invalid-id` to let governance handle the error)? If we use a separate analysis slice, the error state is independent of `scenarios.detailError`. Should the analysis page check `analysisSlice.error` and render its own error UI?

---

## Visual Assets Request

The init.md `Visual Assets` section is currently a placeholder. To finalize the spec, I need:
- A mockup or wireframe of the **analysis page layout**: header bar, tab strip position, grid area, Back button placement
- Confirmation of the **LHS collapsed appearance** during analysis mode (is it the same collapsed chevron as the current SplitPaneLayout collapse, or something different like a thin branded sidebar?)
- A mockup of the **tab strip** design: tab labels, selected/unselected states, disabled state for impact-reports in increment 2
- Confirmation of the **EXTERNAL deep-link** flow as a user-journey diagram or storyboard

---

*Generated by spec-shaper research against codebase state at commit `313b181` (master).*
