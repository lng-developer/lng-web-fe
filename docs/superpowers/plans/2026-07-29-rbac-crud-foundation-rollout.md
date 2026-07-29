# RBAC CRUD Foundation Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Enterprise Compact foundation to the seven contract-approved desktop CRUD boards without changing backend fields, params, endpoints, or behaviors.

**Architecture:** Revise one existing Stitch frame at a time to protect contract fidelity. Use the approved foundation board as the only visual source, then audit each frame for both component consistency and API contract preservation.

**Tech Stack:** Google Stitch, approved `LNG UI Foundation - Enterprise Compact`, existing MUI component vocabulary

## Global Constraints

- Desktop only; no mobile or dark variants.
- Revise existing approved frames; do not create duplicate CRUD boards.
- Preserve every verified endpoint, request body field, query param, enum, required/nullable rule, and no-body action.
- Use the exact foundation colors, typography, icon family, radii, heights, search/filter pattern, pagination, modal, and feedback states.
- Do not add app-shell navigation, industrial copy, metrics, audit metadata, schema controls, or unsupported actions.

---

### Task 1: Apply Foundation to Account and Assignment Boards

**Files:**

- Revise in Stitch: `CRUD Contract Board — STAFF ACCOUNT ACCESS (Approved Exact)`
- Revise in Stitch: `CRUD Contract Board — ACCESS ASSIGNMENTS (Final Exact)`

**Interfaces:**

- Consumes: approved foundation board and existing verified account/assignment contracts
- Produces: polished account and assignment CRUD boards with unchanged contract content

- [ ] **Step 1:** Revise Staff Account Access using the shared header, toolbar, field, button, modal, pagination, and feedback patterns.
- [ ] **Step 2:** Verify account list params and every account mutation body/no-body action remain visible and unchanged.
- [ ] **Step 3:** Revise Access Assignments using the same component language.
- [ ] **Step 4:** Verify list params, assignment POST/PATCH/DELETE, scoped permission PUT, ObjectId wording, and enums remain unchanged.

### Task 2: Apply Foundation to Policy Boards

**Files:**

- Revise in Stitch: `CRUD Contract Board — ROLES (Approved Exact)`
- Revise in Stitch: `CRUD Contract Board — PERMISSIONS (Approved Exact)`
- Revise in Stitch: `CRUD Contract Board — SCOPE REGISTRY (Approved Exact)`

**Interfaces:**

- Consumes: approved foundation board and existing verified role, permission, and scope contracts
- Produces: three visually consistent policy-management boards

- [ ] **Step 1:** Revise Roles while preserving search/page/limit, create/update bodies, delete, and permission add/remove actions.
- [ ] **Step 2:** Revise Permissions while preserving search/page/limit, create/update bodies, and delete.
- [ ] **Step 3:** Revise Scope Registry while preserving all list params, immutable identity fields, mutable name/status, and lifecycle actions.
- [ ] **Step 4:** Audit all three for exact endpoints, labels-above-fields, modal states, and destructive confirmations.

### Task 3: Apply Foundation to HR CRUD Boards

**Files:**

- Revise in Stitch: `CRUD Modal Spec — HR CREATE STAFF (Approved Exact)`
- Revise in Stitch: `CRUD Modal Spec — HR UPDATE / LIFECYCLE (Approved Exact)`

**Interfaces:**

- Consumes: approved foundation board and verified HR provisioning/profile contracts
- Produces: polished HR create, update, delete, and restore modal specifications

- [ ] **Step 1:** Revise HR Create Staff with the shared toolbar, field grouping, assignment repeater, validation, button, and modal patterns.
- [ ] **Step 2:** Verify every provisioning field and assignment field remains visible, including workMode, jobLevel, probationEndDate, scopeId, and overridePermissionIds.
- [ ] **Step 3:** Revise HR Update/Lifecycle with the shared large-form, drawer, destructive confirmation, and feedback patterns.
- [ ] **Step 4:** Verify all Company, Personal, Contract, Sensitive/Compensation fields plus full delete/restore endpoints remain visible and no account-revocation claim appears.

### Task 4: Cross-Board Audit and Handoff

**Files:**

- Verify in Stitch: all seven revised CRUD boards

**Interfaces:**

- Consumes: seven revised boards
- Produces: one consistent, contract-faithful desktop CRUD set ready for user review

- [ ] **Step 1:** Verify title, typography, color, radius, control height, icon family, button roles, search/filter layout, pagination, cards, modals, and feedback states across all boards.
- [ ] **Step 2:** Verify contract text has not been removed, abbreviated, or invented.
- [ ] **Step 3:** Keep the Stitch project tab as deliverable and provide the project link. Do not start Antigravity implementation before user approval.
