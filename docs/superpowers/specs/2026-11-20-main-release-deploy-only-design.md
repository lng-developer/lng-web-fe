# Main Release Deploy-Only Design

## Intent

Run the full frontend quality gate only for changes entering `develop`. A release PR from `develop` to `main` validates that its source branch is exactly `develop`; after merge, `main` runs only the existing server deployment.

## Safety constraints

- `main` must only accept pull requests whose head ref is `develop`.
- Direct pushes to `main` must be prevented by a GitHub branch rule, not merely by YAML conditions.
- Deployment keeps the existing rollback and activation checks. Because GitHub artifacts are scoped to the prior quality-gate run, the deploy job rebuilds `dist` without running lint, unit, or UI tests.
- Pull requests to `develop` keep lint, unit, build, and UI shards unchanged.

## Non-goals

- No application-code or test-suite changes.
- No changes to deployment credentials, host, artifacts, or rollback behavior.
