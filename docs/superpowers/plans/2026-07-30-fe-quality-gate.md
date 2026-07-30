# FE Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every pull request to `develop` and every push to `develop` run lint, Node tests, and a production build on Node 24.

**Architecture:** One GitHub Actions workflow owns the quality gate, producing one stable check name. `package.json` exposes the existing Node test runner through `npm run test`, while `.nvmrc` pins the same major Node version used by the workflow. GitHub branch enforcement is configured outside the repository after the workflow exists.

**Tech Stack:** GitHub Actions, npm, Node.js 24, Node built-in test runner, Vite, ESLint.

## Global Constraints

- Do not add dependencies.
- The only required CI job is `lint -> test -> build`.
- Trigger only for pull requests targeting `develop` and pushes to `develop`.
- Use `npm ci` and Node 24.
- Do not enable a blocking remote rule until the baseline suite is green.

---

### Task 1: Define the local quality-gate contract

**Files:**

- Create: `.nvmrc`
- Modify: `package.json`

**Interfaces:**

- Produces: `npm run test`, which invokes `node --test`.
- Produces: `.nvmrc` content `24`, used by GitHub Actions setup-node.

- [ ] **Step 1: Record the failing baseline command**

Run: `node --test --test-reporter=tap`

Expected: The command executes the repository's Node test suite and reports the current pre-existing failures.

- [ ] **Step 2: Add the smallest test script and Node pin**

```json
{
  "scripts": {
    "test": "node --test"
  },
  "engines": {
    "node": "24.x"
  }
}
```

```text
24
```

- [ ] **Step 3: Verify the command resolves**

Run: `npm run test -- --test-name-pattern="^$"`

Expected: Node's test runner is invoked through npm without a missing-script error.

### Task 2: Add the single GitHub Actions gate

**Files:**

- Create: `.github/workflows/quality-gate.yml`

**Interfaces:**

- Consumes: `.nvmrc` and `npm run lint`, `npm run test`, `npm run build`.
- Produces: required check context `Quality Gate / lint-test-build`.

- [ ] **Step 1: Add the workflow**

```yaml
name: Quality Gate

on:
  pull_request:
    branches: [develop]
  push:
    branches: [develop]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Validate the workflow syntax and local commands**

Run: `npm run lint; npm run build`

Expected: lint and build exit successfully; full tests are separately reported from the baseline.

### Task 3: Protect `develop` remotely after the first green run

**Files:**

- Modify: GitHub repository settings, no repository file.

**Interfaces:**

- Consumes: check context `Quality Gate / lint-test-build` from Task 2.
- Produces: an active branch ruleset for `refs/heads/develop`.

- [ ] **Step 1: Confirm repository plan and administration permission**

Run: `GET /repos/lng-developer/lng-web-fe/rulesets`

Expected: GitHub accepts the request and the credential has Administration write permission.

- [ ] **Step 2: Create an active `develop` ruleset**

```json
{
  "name": "Protect develop",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/develop"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["merge", "squash", "rebase"],
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": 0,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "do_not_enforce_on_create": false,
        "required_status_checks": [{ "context": "Quality Gate / lint-test-build" }],
        "strict_required_status_checks_policy": true
      }
    }
  ],
  "bypass_actors": []
}
```

- [ ] **Step 3: Verify branch rules**

Run: `GET /repos/lng-developer/lng-web-fe/rules/branches/develop`

Expected: `deletion`, `non_fast_forward`, `pull_request`, and `required_status_checks` are active.
