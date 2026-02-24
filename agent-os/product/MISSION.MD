# MISSION: Scenarios

## Overview
Scenarios is a new (greenfield) micro-frontend UI module for an investment bank’s risk platform. It enables Market Risk Managers and Market Data Managers to review the impact of proposed data changes on downstream risk calculations, collaborate with their team, and approve or reject sign-off — all within a single UI.

## Problem Statement
Business users in Risk need to assess how data changes affect downstream calculations (e.g., FRTB SA, VaR) before promoting those changes to production. Today, this impact review and sign-off flow is not contained within a single place for Market Risk users, creating friction for timely and well-governed sign-off. Scenarios provides a focused module to review impacts and complete sign-off with an end-to-end audit trail.

## Target Audience
- Primary users: Market Risk Managers and Market Data Managers
- Department: Market Risk (investment bank)
- Personas out of scope: Non–Market Risk users (e.g., other control or trading functions) for the 2026 launch

## Vision & Goals
- Vision: Allow users to review impact and sign-off data changes with ease, communicating with the team entirely within this new UI module.
- Strategic goals:
  - Centralize impact review and sign-off for Market Risk users
  - Integrate with existing risk calculation and market data UI modules via a micro-frontend framework
  - Provide complete auditability (messages, actions, approvals) with internal e-signoff and 7-year retention

## Success Criteria
- Primary KPI (as provided): 100% of targeted Market Risk users review impact and perform sign-off in the app
- Compliance/operational acceptance:
  - End-to-end audit trail of messages and actions is available in production
  - Internal e-signoff (attestation) in place; audit data retained for 7 years
- Other metrics: Not discussed during discovery

## Scope
### In Scope
- Review summary impacts of data changes on downstream calculations
- Link to direct changes and specific impact reports
- View all messages and actions in an end-to-end audit trail (searchable)
- Reject or approve sign-off within the module (internal attestation)
- Message specific UI to promote signed-off data changes
- Rules-based, finely-grained approvals (configurable, including data-attribute level)
- Micro-frontend integration with existing UI modules: Market Data, FRTB SA, and VaR

### Out of Scope
- Making the data changes themselves (performed in the specific source applications)
- Integrating to all possible applications where data could be changed (e.g., generic trade systems) for the 2026 launch
- Non–Market Risk personas (only Market Risk users are included for this phase)
- External e-signature standards/compliance (internal attestation only)

## Constraints
- Architecture: Micro-frontend framework; Scenarios must integrate with Market Data, FRTB SA, and VaR UI modules
- Approvals: Highly customizable rules-based workflow with fine-grained (attribute-level) controls
- Audit and compliance: End-to-end audit trail, internal e-signoff, 7-year retention; no specific external regulation mandated
- Security/identity/SSO: Not discussed during discovery
- Data residency/privacy: Not discussed during discovery
- Budget: To be discussed later
- Timeline: PoC Q2 2026; UAT Q3 2026; Production Q4 2026

## Delivery Plan
- Milestones and phases
  - PoC (Q2 2026)
    - Impact summary for data changes with manual link-outs to source change details and impact reports
    - Scope limited to a single desk/data domain
  - UAT (Q3 2026)
    - Rules-based approvals implemented
    - End-to-end audit trail with search
    - Integration with Market Data UI module via micro-frontend framework
  - Production (Q4 2026)
    - Full micro-frontend integration with Market Data, FRTB SA, and VaR modules
    - In-app messaging to promote signed-off data changes
    - Internal e-signoff enabled with 7-year audit retention in production
- MVP definition
  - MVP corresponds to the initial production release (Q4 2026) enabling end-to-end impact review, approvals, auditability, messaging-driven promotion, and integration with the three target UI modules

## Additional Context
- Project name: Scenarios
- New vs. existing product: New (greenfield)
- Existing documentation: None provided; user attempted to share prior discussions/links that were not accessible; no PRD/brief available
- Stakeholders beyond primary users: Not discussed during discovery
- Integration details (APIs/message bus/DB access) and SSO/authorization specifics: Not discussed during discovery
