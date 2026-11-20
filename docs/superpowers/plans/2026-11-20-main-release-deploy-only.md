# Main Release Deploy-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avoid duplicate frontend checks during a verified `develop` to `main` release while retaining release-source validation and server deployment.

**Architecture:** `.github/workflows/quality-gate.yml` keeps lint, build, and UI jobs for `develop` PRs and pushes. A `release-source` job validates a `main` PR is sourced from `develop`; deploy runs only on a push to `main` and builds its own deploy artifact without rerunning tests. A GitHub branch rule prevents direct pushes to `main`.

**Tech Stack:** GitHub Actions YAML, GitHub branch protection API.

**Spec:** `docs/superpowers/specs/2026-11-20-main-release-deploy-only-design.md`

## Global Constraints

- Do not modify runtime deployment scripts, secrets, artifacts, or rollback behavior.
- Preserve the full quality gate for `develop`.
- No new dependencies.

## Review Focus

- PR from any branch other than `develop` to `main` must fail the source guard.
- A PR to `develop` still schedules lint, unit, build, and all UI shards.
- A push to `main` schedules deploy without the quality jobs.
- Direct push to `main` is blocked by branch protection.

---

### Task 1: Split frontend release workflow paths

**Files:**
- Modify: `.github/workflows/quality-gate.yml`

**Interfaces:**
- Consumes: GitHub `pull_request` and `push` event context.
- Produces: required `release-source` check for PRs targeting `main` and `deploy-server` on pushes to `main`.

- [ ] Add a release-source job that fails unless `github.head_ref == 'develop'` on pull requests targeting `main`.
- [ ] Gate quality-gate and ui-tests to `develop` only, without changing their commands.
- [ ] Remove deploy dependencies on quality jobs; checkout, install, and build its deploy artifact without running tests, then preserve its main-push guard.
- [ ] Validate YAML event/job conditions by inspecting the rendered diff.

### Task 2: Protect frontend main releases

**Files:**
- External configuration: GitHub repository branch protection for `main`

**Interfaces:**
- Consumes: `release-source` status check.
- Produces: no direct pushes, PR required, `release-source` required before merge.

- [ ] Apply the branch rule after the workflow PR is merged and its check exists.
- [ ] Verify API readback shows PR requirement, direct-push restriction, and required `release-source` check.
