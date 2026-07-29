# RBAC UI Foundation Stitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and verify one desktop-only Stitch foundation board that standardizes the shared visual language for all HR and RBAC screens.

**Architecture:** Add one isolated design-system board to the existing Stitch project without modifying current CRUD or Access Explorer frames. The board is the visual source of truth for later screen revisions and mirrors the approved token and component specification.

**Tech Stack:** Google Stitch, existing MUI component vocabulary, Material icons, approved RBAC desktop UI foundation spec

## Global Constraints

- Create desktop output only.
- Keep the existing Stitch project and all current frames unchanged.
- Use one light theme, one brand accent `#E83B4A`, and the approved neutral token set.
- Use Inter for interface text and JetBrains Mono only for IDs, codes, and endpoints.
- Use the existing Material icon family only.
- Add no speculative filters, form fields, statuses, dependencies, or backend behavior.
- The foundation standardizes controls but does not force workflows into tables.

---

### Task 1: Generate the Foundation Board

**Files:**

- Reference: `docs/superpowers/specs/2026-07-29-rbac-ui-foundation-design.md`
- Create in Stitch: `LNG UI Foundation - Enterprise Compact`

**Interfaces:**

- Consumes: approved token values and component rules from the UI foundation spec
- Produces: one named Stitch board used as the visual reference for subsequent HR and RBAC frame revisions

- [ ] **Step 1: Open the existing RBAC Stitch project**

Use project `356688402026366041`. Keep all existing screens in place.

- [ ] **Step 2: Generate one desktop foundation board**

Ask Stitch to create one 1440px-wide light-theme board titled exactly `LNG UI Foundation - Enterprise Compact`. The prompt must include the exact colors, typography sizes, spacing, radii, control heights, icon sizes, and component roles from the approved spec.

- [ ] **Step 3: Include complete component states**

The board must visibly show default, hover, focus, active, disabled, loading, read-only, validation, and destructive states where applicable. It must include buttons, icon buttons, fields, search, inline filters, advanced-filter trigger and chips, cards, pagination, dialogs, drawer, toast, alert, skeleton, and empty state.

- [ ] **Step 4: Keep the specimen operational**

Include one compact toolbar specimen that combines search, three visible filters, a counted advanced-filter trigger, active chips, clear-all, and pagination without inventing an endpoint contract.

### Task 2: Contract and Visual Audit

**Files:**

- Verify in Stitch: `LNG UI Foundation - Enterprise Compact`
- Reference: `docs/superpowers/specs/2026-07-29-rbac-ui-foundation-design.md`

**Interfaces:**

- Consumes: the generated foundation board
- Produces: a verified board ready for user review and later Antigravity implementation

- [ ] **Step 1: Verify board identity and scope**

Confirm the exact title is present, the board is desktop-only, and existing CRUD frames remain available.

- [ ] **Step 2: Verify token fidelity**

Confirm `#E83B4A`, the approved neutral palette, Inter and JetBrains Mono roles, 8px control radius, 12px card/dialog radius, and 32/40/44px control heights are visibly documented.

- [ ] **Step 3: Verify component coverage**

Confirm icons, buttons, inputs and labels, search, filters, cards, pagination, modal, drawer, and feedback states are all present. Reject emoji, mixed icon families, placeholder-as-label, decorative red, nested generic cards, and unsupported dark/mobile variants.

- [ ] **Step 4: Verify accessibility language**

Confirm visible focus, readable disabled states, text labels for statuses, tooltips/accessibility notes for icon-only actions, inline field errors, and stable loading states.

- [ ] **Step 5: Deliver the board for review**

Keep the Stitch tab as the deliverable and provide the project link. Do not revise the CRUD and Access Explorer screens until the foundation is approved.
