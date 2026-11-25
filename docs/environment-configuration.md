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
