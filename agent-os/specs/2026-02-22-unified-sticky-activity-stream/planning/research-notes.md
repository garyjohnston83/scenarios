# Research Notes: Unified Sticky Activity Stream

## Codebase Analysis

### Backend: Current State

**ScenarioEvent entity** (`model-logic-service/.../entity/ScenarioEvent.java`):
- Fields: `id` (UUID), `scenario` (FK), `actorDisplayName`, `eventType` (String, max 50), `createdAt`, `payloadJson` (jsonb), `relatedMessage` (FK to ScenarioMessage), `actorUser` (FK to UserRef).
- The `eventType` is a plain String (not a Java enum), stored as VARCHAR(50). This makes adding new event types straightforward -- no enum migration needed.
- `relatedMessage` FK already exists, which the raw idea requires for linking MESSAGE_POSTED events to their ScenarioMessage.

**EVENT_LABELS map** (in `ScenarioDetailService.java`, lines 80-95):
- Already includes `MESSAGE_POSTED` -> "Message posted" in the server-side label map.
- Full list of known event types: SCENARIO_CREATED, IMPACT_COMPLETED, MESSAGE_POSTED, SIGNOFF_COMMENCED, SIGNOFF_APPROVED, SIGNOFF_REJECTED, SIGNOFF_STARTED, SIGNOFF_APPROVAL_RECORDED, SIGNOFF_COMPLETED, SCENARIO_RECALLED, SCENARIO_REJECTED, IMPACT_DATA_REFRESHED, IMPACT_INVALIDATED, PROMOTION_COMPLETED.
- Note: The seed data uses `SIGNOFF_COMMENCED` and `SIGNOFF_APPROVED` which are in EVENT_LABELS, but the `processEvent()` logic emits `SIGNOFF_STARTED`, `SIGNOFF_APPROVAL_RECORDED`, and `SIGNOFF_COMPLETED` instead. This is a legacy inconsistency -- the seed data predates the current signoff logic.

**Seed data** (`009-seed-messages-events-signoff.yaml`):
- Already contains `MESSAGE_POSTED` event type rows in the seed data (e.g., for "IR Vol Surface Update" scenario).
- However, these seed `MESSAGE_POSTED` events do NOT have `related_message_id` set (column not in the INSERT).
- The `012-add-related-message-id-to-event.yaml` migration added the FK column, but the existing seed data was not updated to link MESSAGE_POSTED events to their corresponding messages.

**ScenarioDetailService.postMessage()** (lines 181-204):
- Currently creates ONLY a ScenarioMessage. Does NOT create a corresponding ScenarioEvent.
- The raw idea requires this method to also create a `MESSAGE_POSTED` ScenarioEvent with `relatedMessage` set.

**ScenarioDetailService.buildReviewApproval()** (lines 675-715):
- Currently the `expand=reviewApproval` handler. It builds: workflow status, messages list, events list, approvals progress.
- Events are returned via `EventDto` with fields: `id`, `createdAt`, `actorDisplayName`, `eventType`, `eventLabel`, `relatedMessageId`.
- The raw idea says NOT to delete the server-side reviewApproval expand -- just stop calling it from the UI.

**ScenarioDetailService.toDetailDto()** (lines 522-582):
- Does NOT currently have an `expand=events` handler. The events section needs to be added.
- Currently supports: `header`, `summaryCards`, `reviewApproval`, `directChanges`, `impactData`.

**ScenarioDetailDto** (`dto/ScenarioDetailDto.java`):
- Currently a record with fields: `id`, `name`, `scenarioTypeCode`, `ownerDisplayName`, `createdAt`, `updatedAt`, `header`, `summaryCards`, `reviewApproval`, `directChanges`, `impactData`.
- A new field for the unified events expand needs to be added.

**EventDto** (`dto/EventDto.java`):
- Current record: `id`, `createdAt`, `actorDisplayName`, `eventType`, `eventLabel`, `relatedMessageId`.
- The raw idea's contract wants: `id`, `bucketType`, `occurredAt`, `authorDisplayName`, `details`, `statusTransition`.
- This is a different shape than the existing EventDto -- either a new DTO or modification of the existing one.

### Frontend: Current State

**ScenarioDetailPane.tsx** (lines 1-521):
- The sticky header area contains: title, three summary cards (Key Details, Changes Summary, Impact Summary), a quick message composer with action buttons (Send, Sign-off, Recall, Reject).
- Below the sticky header: DirectChangesSection, ImpactDataSection, ReviewApprovalSection (conditionally rendered).
- The message composer + action buttons are DUPLICATED -- they appear both in the sticky header AND inside ReviewApprovalSection.

**ReviewApprovalSection.tsx** (lines 1-317):
- Renders three subsections: "Workflow Status" (state label + progress), "Messages" (list with composer), "Events" (list).
- Has its own message composer with Send/Sign-off/Recall/Reject buttons (duplicate of sticky header's).
- Contains an "Export History" stub button.
- The raw idea wants to REPLACE this entire section with the unified Activity table in the sticky area.

**scenarioApi.ts** (lines 15-19):
- `fetchScenarioDetail()` currently requests `expand=header,summaryCards,reviewApproval`.
- Needs to change to `expand=header,summaryCards,events` (for Market Data / LINK_OUT types).
- For SA / GRID types: `expand=header,summaryCards,events,directChanges,impactData`.

**scenariosSlice.ts**:
- `ScenarioDetail` interface includes `reviewApproval?: ReviewApprovalData`.
- `ReviewApprovalData` shape: `workflow`, `messages`, `events`, `approvalsReceived`, `approvalsRequired`.
- `postMessageSuccess` reducer appends to `selectedDetail.reviewApproval.messages` -- this will need to change since reviewApproval will no longer be in the response.
- `EventData` interface: `id`, `createdAt`, `actorDisplayName`, `eventType`, `eventLabel`, `relatedMessageId`.

**formatDate.ts**:
- Currently formats as `en-GB` locale with `day: 'numeric', month: 'short', year: 'numeric'` -- e.g., "19 Feb 2026".
- The raw idea wants `dd/MM/yyyy HH:mm:ss` (24-hour) format everywhere. This is a significant change.

**labelMappings.ts**:
- `eventTypeLabels` map is MISSING several event types that exist in the backend EVENT_LABELS: `SCENARIO_CREATED`, `IMPACT_COMPLETED`, `MESSAGE_POSTED`, `SIGNOFF_COMMENCED`, `SIGNOFF_APPROVED`.
- The backend label map has 14 entries; the frontend only has 8.

### Key Observations and Gaps

1. **bucketType classification**: The raw idea introduces MESSAGE/USER/SYSTEM buckets but does not specify which existing event types map to which bucket. Need classification rules.

2. **statusTransition**: The raw idea says this should be "populated only when workflow state changes" but the current backend does NOT store old/new state in the event. The state transitions are applied directly to the scenario summary. Deriving `statusTransition` would require either:
   - Storing old+new state in `payloadJson` when creating events, OR
   - Computing it from a static mapping of event type -> state transition.

3. **Details column**: The raw idea's contract has a `details` field. For MESSAGE_POSTED events this would presumably be the message text. For other events it would be the event label. Need to clarify the exact content.

4. **Dual message composer**: Both the sticky header AND ReviewApprovalSection have message composers. When ReviewApprovalSection is removed, only the sticky header composer remains -- which is already in place.

5. **Activity table in sticky header**: The raw idea says the Activity table goes in the sticky area. Currently the sticky area is already substantial (title + 3 cards + message row). Adding a table with potentially dozens of rows needs scroll/height constraints.

6. **Seed data inconsistency**: The seed data uses `SIGNOFF_COMMENCED` and `SIGNOFF_APPROVED` event types, but the runtime code emits `SIGNOFF_STARTED`, `SIGNOFF_APPROVAL_RECORDED`, and `SIGNOFF_COMPLETED`. The seed data should probably be updated.

---

## Clarifying Questions

Based on the raw idea for the Unified Sticky Activity Stream and my analysis of the existing codebase, I have the following clarifying questions:

### 1. Bucket type classification for each event type

The raw idea introduces three bucket types (MESSAGE, USER, SYSTEM) but does not specify which of the 14 existing event types maps to which bucket. I am assuming the following classification. Is this correct?

- **MESSAGE**: `MESSAGE_POSTED`
- **USER**: `SCENARIO_CREATED`, `SIGNOFF_COMMENCED`, `SIGNOFF_APPROVED`, `SIGNOFF_STARTED`, `SIGNOFF_APPROVAL_RECORDED`, `SIGNOFF_COMPLETED`, `SCENARIO_RECALLED`, `SCENARIO_REJECTED`
- **SYSTEM**: `IMPACT_COMPLETED`, `IMPACT_DATA_REFRESHED`, `IMPACT_INVALIDATED`, `PROMOTION_COMPLETED`

Or should the classification be based on the `actorDisplayName` value (i.e., if actor is "System" then SYSTEM bucket, otherwise check if it is MESSAGE_POSTED for MESSAGE bucket, else USER)?

### 2. How should `statusTransition` be derived?

The raw idea requires a `statusTransition` field (e.g., "Draft -> Impact Available") populated only when workflow state changes. Currently, the backend does NOT store old/new state in the event payload -- it just applies the state change directly to the `ScenarioSummary`. Two possible approaches:

- **(A) Static mapping**: Derive `statusTransition` from a hardcoded map of event type to old->new state (e.g., `IMPACT_COMPLETED` always means `DRAFT -> IMPACT_AVAILABLE`). This is simpler but does not work perfectly for events like `IMPACT_COMPLETED` which can trigger from either `DRAFT` or `IMPACT_PENDING`.
- **(B) Store at write time**: Modify each event handler (handleRecall, handleSignoff, etc.) to capture the old workflow state before the transition and store `{oldState, newState}` in `payloadJson`. Then read it back when building the events expand.

I am assuming approach (B) is preferred since it is accurate and the event handlers already have access to the old state. Is that correct?

### 3. What is the "details" column content for each event type?

The raw idea's API contract specifies a `details` field in each event row. I am assuming:

- For `MESSAGE_POSTED` events: the message text (loaded via the `relatedMessage` FK).
- For all other events: the friendly event label from `EVENT_LABELS` (e.g., "Impact assessment completed", "Scenario recalled").

Is that correct, or should the details column contain something different (e.g., the recall/reject reason message for SCENARIO_RECALLED/SCENARIO_REJECTED events)?

### 4. What should happen to the existing ReviewApprovalSection component?

The raw idea says to stop calling `expand=reviewApproval` from the UI and replace the section with the unified Activity table. For the component file itself, I am assuming:

- **(A)** Keep the `ReviewApprovalSection.tsx` file in the codebase but simply stop rendering it (remove the `{reviewApproval && <ReviewApprovalSection .../>}` from ScenarioDetailPane). The server-side expand also remains per the non-goals.

Or should we:

- **(B)** Delete the `ReviewApprovalSection` component files entirely since they will be dead code.

I am assuming (A) for now -- keep the files but stop using them. Is that correct?

### 5. What is the Activity table height/scroll behavior in the sticky header?

The sticky header already contains the scenario title, three summary cards, and the message composer row. Adding a full Activity table to this area could make it very tall (especially for scenarios with many events). I am assuming:

- The Activity table should have a **max-height with vertical scroll** (e.g., max-height: 300px with `overflow-y: auto`), similar to the existing `messagesList` and `eventsList` in ReviewApprovalSection which both have `max-height: 300px`.

Is 300px the right constraint, or should it be a different value? Should the table also auto-scroll to the newest (bottom) entry on load?

### 6. Should the existing seed data be updated for MESSAGE_POSTED events?

The current seed data (`009-seed-messages-events-signoff.yaml`) already has `MESSAGE_POSTED` events but they lack `related_message_id` values. The `012-add-related-message-id-to-event.yaml` migration added the FK column after the seed data was created. I am assuming:

- We should create a new changeset that updates the existing seed `MESSAGE_POSTED` events to set their `related_message_id` to the matching ScenarioMessage rows (matching on scenario_id + actor + timestamp).
- We should also add `MESSAGE_POSTED` events for the second message in the IR Vol Surface Update scenario (John Doe's message, which currently has no corresponding event).

Is that correct, or should seed data be left as-is?

### 7. How should the Type column icons look in the Activity table?

The raw idea says "Type rendered as icons for MESSAGE/USER/SYSTEM." I am assuming:

- Use Fluent UI icons from the `@fluentui/react-icons` package with small colored badges/pills, for example:
  - MESSAGE: a chat/comment icon (e.g., `ChatRegular` or `CommentRegular`)
  - USER: a person icon (e.g., `PersonRegular`)
  - SYSTEM: a settings/gear icon (e.g., `SettingsRegular` or `BotRegular`)
- Each icon would be rendered inside a small pill/badge with a distinct background color per bucket type.

Or should these be simple text badges (like `[MSG]`, `[USR]`, `[SYS]`) without icons?

### 8. Should the new unified events DTO be a new record or modify the existing EventDto?

The current `EventDto` has: `id`, `createdAt`, `actorDisplayName`, `eventType`, `eventLabel`, `relatedMessageId`. The raw idea's contract wants: `id`, `bucketType`, `occurredAt`, `authorDisplayName`, `details`, `statusTransition`. These are quite different shapes. I am assuming:

- Create a **new DTO** (e.g., `ActivityRowDto`) for the unified events expand, leaving the existing `EventDto` untouched (since the server-side `reviewApproval` expand still uses it).

Is that correct?

### 9. After posting a message, how should the UI optimistically update the Activity table?

Currently, `postMessageSuccess` appends the new message to `selectedDetail.reviewApproval.messages`. With the new design:

- **(A)** After posting a message, re-fetch the full scenario detail (like `postEvent` currently does) so the new MESSAGE_POSTED event appears in the activity stream.
- **(B)** Optimistically append a new activity row to the local state without re-fetching.

I am assuming (A) since the backend now creates both the message AND the event, and we need the server-generated event data. Is that correct?

### 10. Should the "Export History" button from ReviewApprovalSection be carried over?

The existing ReviewApprovalSection has an "Export History" stub button at the bottom. Should this button:

- **(A)** Be removed entirely (since it is just a stub with `alert('Not implemented')`).
- **(B)** Be carried over to the new Activity table area as a stub for future implementation.

I am assuming (A) -- remove it since it is non-functional. Is that correct?

### 11. What about the Workflow Status sub-section and approval progress display?

The current ReviewApprovalSection shows "Workflow Status" (state label + step X of Y) and "Approvals received X of Y". With the unified Activity table replacing this section:

- The workflow state is already displayed in the "Key Details" summary card in the sticky header.
- Should the approval progress (e.g., "Approvals received 1 of 2") be added somewhere in the new layout, or is it sufficient that individual SIGNOFF_APPROVAL_RECORDED events appear in the Activity stream?

### 12. How should the `formatDate` utility be updated for the new dd/MM/yyyy HH:mm:ss format?

The raw idea requires standardizing ALL dates to `dd/MM/yyyy HH:mm:ss` (24-hour). The current `formatDate.ts` uses `Intl.DateTimeFormat('en-GB')` with day/month-short/year. I am assuming:

- Update the single `formatDate()` function to produce `dd/MM/yyyy HH:mm:ss` format. This will affect ALL existing date displays (header, summary cards, messages, events, scenario list).
- Confirm this is desired even for the scenario list view where the more compact "19 Feb 2026" format might be preferred.

Is the `dd/MM/yyyy HH:mm:ss` format intended for absolutely every date in the application, including the scenario list table?

---

## Existing Code Reuse

Are there existing features in the codebase with similar patterns we should reference? For example:
- Similar table components or UI patterns to re-use
- Comparable data-table layouts
- Related backend logic or service objects

**Similar features identified from analysis:**
- `DirectChangesSection` and `ImpactDataSection` -- both render grid/table data in the content area below the sticky header. The new Activity table could follow a similar component pattern.
- The `eventsList` in `ReviewApprovalSection` -- current rendering of events that will be replaced.
- The existing `EventDto` and `buildReviewApproval()` logic -- server-side event fetching patterns.

Please provide file/folder paths or names of any additional similar features if they exist.

---

## Visual Assets Request

Do you have any design mockups, wireframes, or screenshots that could help guide the development?

If yes, please place them in: `C:\Workspaces\SSD\sdd-arch-tool-generated\Prototypes\Scenarios\agent-os\specs\2026-02-22-unified-sticky-activity-stream\planning\visuals\`

Use descriptive file names like:
- activity-table-mockup.png
- sticky-header-layout.png
- type-icons-wireframe.png
