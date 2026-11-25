# Environment files

| Command              | File               | Purpose                                 |
| -------------------- | ------------------ | --------------------------------------- |
| `npm run dev`        | `.env.development` | Local Vite; API proxy to localhost:3000 |
| `npm run build:dev`  | `.env.development` | Develop CI build                        |
| `npm run build:prod` | `.env.production`  | Production CI build                     |

Both deployed modes use empty API/upload base URLs so requests go to the current
origin's reverse proxy. These files contain public browser settings only.
Never place passwords, database URIs or private keys in `VITE_*` variables.

Vite still supports ignored `.env.local` / `.env.<mode>.local` machine overrides.
The existing `dev:local` command uses `.env.localdev` for its optional local mocks.
Changes require a new frontend build; PM2 environment changes cannot alter a built UI.

## PR CI and deployment

PR CI builds development once, runs lint/unit/UI gates, and stores an artifact named
with the tested Git tree for 14 days. A push to develop only verifies the merged PR,
successful CI jobs and matching tree, then downloads that artifact by ID. It does not
run tests or rebuild. Direct pushes, missing/failed CI, expired artifacts and tree
mismatches stop deployment. Update/retest the PR against current develop before merge.
For expired artifacts, rerun the original PR CI (same tree), then the deploy workflow.
Manual dispatch remains test-only; it cannot supply deployment evidence.
Production promotion retains build:prod; it does not rerun the test suites.
