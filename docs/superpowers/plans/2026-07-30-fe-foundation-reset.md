# FE Foundation Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing JavaScript/MUI frontend source with a minimal React 19, TypeScript, Ant Design 6 foundation that is ready for screen-by-screen rebuilding.

**Architecture:** Delete the old `src` tree in one reversible commit, then rebuild a one-way dependency structure: `app -> layouts/features -> shared`. The foundation contains typed configuration, one Axios client, VN/EN localization, application providers, and placeholder/error routes; authentication and business screens remain out of scope.

**Tech Stack:** React 19, TypeScript, Vite 8, Ant Design 6, React Router 7, TanStack Query 5, Axios, i18next, Vitest, React Testing Library.

## Global Constraints

- Work only in `C:\lng_system\lng-web\lng-web-fe\.worktrees\fe-refactor` on `refactor/fe-foundation`.
- Do not modify the backend worktree.
- Do not copy old JavaScript UI implementation into the new source tree.
- Preserve old contracts through Git history and the approved design spec.
- Do not add Redux, Next.js, micro-frontends, Pro Components, React Hook Form, Tailwind, MUI, Emotion, or Notistack.
- Use Ant Design tokens and one global SCSS file; add CSS Modules only when a component needs isolated styles.
- Every task ends with lint, typecheck, focused tests, and an independently reviewable commit.

---

### Task 1: Reset Source and Tooling

**Files:**

- Delete: `src/`
- Delete: `jsconfig.json`
- Delete: `vite.config.js`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `eslint.config.js`
- Modify: `index.html`

**Interfaces:**

- Consumes: approved design at `docs/superpowers/specs/2026-07-30-fe-foundation-reset-design.md`.
- Produces: TypeScript/Vite toolchain with the `@/` alias and no old UI dependencies.

- [ ] **Step 1: Confirm the destructive target and recovery commit**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git ls-tree -d --name-only HEAD src
```

Expected: clean branch `refactor/fe-foundation`; `src` is present in `HEAD`; record the returned commit as the recovery point.

- [ ] **Step 2: Delete only the old source tree and obsolete JS config**

Use `apply_patch` for text files and a validated filesystem removal for the exact resolved directory `C:\lng_system\lng-web\lng-web-fe\.worktrees\fe-refactor\src`. Remove `jsconfig.json` and `vite.config.js`. Do not delete any repository root, worktree, docs, environment file, or Git metadata.

- [ ] **Step 3: Replace dependencies and scripts**

Run:

```powershell
npm uninstall @emotion/react @emotion/styled @hookform/resolvers @mui/icons-material @mui/material @tailwindcss/vite notistack react-hook-form tailwindcss vite-plugin-svgr
npm install antd@^6 @ant-design/icons@^6
npm install --save-dev typescript typescript-eslint vitest jsdom @testing-library/react @testing-library/jest-dom @types/react @types/react-dom
```

Set scripts in `package.json` to:

```json
{
  "dev": "vite",
  "typecheck": "tsc -b",
  "build": "tsc -b && vite build",
  "build:dev": "tsc -b && vite build --mode development",
  "build:prod": "tsc -b && vite build --mode production",
  "preview": "vite preview",
  "lint": "eslint .",
  "test": "vitest run",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "prepare": "husky"
}
```

Change `lint-staged` source matching from `*.{js,jsx}` to `*.{js,jsx,ts,tsx}`.

- [ ] **Step 4: Add TypeScript and Vite configuration**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["node", "vite/client"]
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(rootDir, 'src') } },
  server: { port: 5173, open: true },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' },
})
```

Import `typescript-eslint`, spread `...typescriptEslint.configs.recommended` after `js.configs.recommended`, and extend the existing application override from `**/*.{js,jsx}` to `**/*.{js,jsx,ts,tsx}`. Keep React, hooks, accessibility, import sorting, and Prettier rules unchanged.

Update `index.html` to load `/src/main.tsx`; remove the deleted favicon reference and external Google Fonts request.

- [ ] **Step 5: Verify the reset boundary**

Run:

```powershell
npm ls @mui/material @emotion/react tailwindcss notistack react-hook-form
npm ls antd @ant-design/icons typescript vitest
git diff --check
git status --short
```

Expected: old packages absent, new packages installed, only the planned reset/config files changed.

- [ ] **Step 6: Commit the destructive reset separately**

```powershell
git add -- src jsconfig.json vite.config.js vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json package.json package-lock.json eslint.config.js index.html
git commit -m "refactor(fe): reset frontend source foundation"
```

### Task 2: Add Typed Shared Configuration and API Client

**Files:**

- Create: `src/vite-env.d.ts`
- Create: `src/test/setup.ts`
- Create: `src/shared/config/env.ts`
- Create: `src/shared/config/env.test.ts`
- Create: `src/shared/api/apiError.ts`
- Create: `src/shared/api/apiError.test.ts`
- Create: `src/shared/api/client.ts`
- Create: `src/shared/api/index.ts`
- Create: `src/shared/query/queryClient.ts`

**Interfaces:**

- Produces: `env.apiBaseUrl`, `env.appName`, `ApiError`, `normalizeApiError(error)`, `apiClient`, and `queryClient`.
- Consumers: application providers and all later feature slices.

- [ ] **Step 1: Write failing environment tests**

Export a pure `readEnv(source)` helper and test that missing `VITE_API_BASE_URL` becomes an empty string, trailing slashes are removed without embedding a host, and `VITE_APP_NAME` defaults to `LNG Web FE`.

- [ ] **Step 2: Run the environment test and confirm failure**

```powershell
npx vitest run src/shared/config/env.test.ts
```

Expected: FAIL because `env.ts` does not exist.

- [ ] **Step 3: Implement typed environment access**

Expose an immutable object through a pure reader so the boundary is testable:

```ts
type EnvSource = Pick<ImportMetaEnv, 'VITE_API_BASE_URL' | 'VITE_APP_NAME' | 'DEV'>

export function readEnv(source: EnvSource) {
  return Object.freeze({
    apiBaseUrl: (source.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
    appName: source.VITE_APP_NAME ?? 'LNG Web FE',
    isDev: source.DEV,
  })
}

export const env = readEnv(import.meta.env)
```

Declare both Vite variables in `src/vite-env.d.ts`.

- [ ] **Step 4: Write failing API error tests**

Cover a backend Axios error with `{ code, message, details }`, an Axios network error without a response, and an existing `ApiError` passed through unchanged.

- [ ] **Step 5: Implement minimal shared API behavior**

Create `ApiError` with `status`, `code`, and `details`. Implement `normalizeApiError` once. Create one Axios instance:

```ts
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
})
```

The response interceptor returns `response.data` and rejects `normalizeApiError(error)`. Do not add token refresh before the auth slice.

Create a Query Client with `staleTime: 60_000`, `refetchOnWindowFocus: false`, and `retry: 1`.

- [ ] **Step 6: Verify and commit shared infrastructure**

```powershell
npm run lint
npm run typecheck
npx vitest run src/shared/config/env.test.ts src/shared/api/apiError.test.ts
git diff --check
git add src/vite-env.d.ts src/test src/shared/config src/shared/api src/shared/query
git commit -m "feat(fe): add typed shared infrastructure"
```

### Task 3: Restore Minimal VN/EN Localization

**Files:**

- Create: `src/shared/i18n/locales/vi/common.json`
- Create: `src/shared/i18n/locales/en/common.json`
- Create: `src/shared/i18n/i18n.ts`
- Create: `src/shared/i18n/locales.test.ts`
- Create: `src/shared/i18n/LanguageSwitch.tsx`

**Interfaces:**

- Produces: initialized `i18n`, namespaces `common`, language codes `vi | en`, and `LanguageSwitch`.
- Consumers: application providers and foundation pages.

- [ ] **Step 1: Write the failing locale parity test**

Flatten both JSON objects and assert identical sorted keys. Assert these exact keys exist in both languages:

```text
app.name
language.vi
language.en
foundation.eyebrow
foundation.title
foundation.description
errors.unexpected
notFound.title
notFound.backHome
```

- [ ] **Step 2: Run the locale test and confirm failure**

```powershell
npx vitest run src/shared/i18n/locales.test.ts
```

Expected: FAIL because locale files do not exist.

- [ ] **Step 3: Add minimal translations**

Vietnamese copy:

```json
{
  "app": { "name": "LNG Web" },
  "language": { "vi": "Tiếng Việt", "en": "English" },
  "foundation": {
    "eyebrow": "Nền tảng mới",
    "title": "Foundation đã sẵn sàng",
    "description": "Sẵn sàng xây lại từng màn hình theo hợp đồng backend."
  },
  "errors": { "unexpected": "Đã xảy ra lỗi không mong muốn." },
  "notFound": { "title": "Không tìm thấy trang", "backHome": "Về trang chính" }
}
```

English copy uses `New foundation`, `Foundation is ready`, `Ready to rebuild each screen against backend contracts.`, `Something unexpected happened.`, `Page not found`, and `Back home`.

- [ ] **Step 4: Initialize i18next and language switching**

Default to `vi`, fall back to `vi`, use namespace `common`, and persist only the selected language under `lng.language`. `LanguageSwitch` uses Ant Design `Segmented` and calls `i18n.changeLanguage`.

- [ ] **Step 5: Verify and commit localization**

```powershell
npm run lint
npm run typecheck
npx vitest run src/shared/i18n/locales.test.ts
git diff --check
git add src/shared/i18n
git commit -m "feat(fe): restore minimal bilingual foundation"
```

### Task 4: Compose the Ant Design Foundation Application

**Files:**

- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/providers/AppProviders.tsx`
- Create: `src/app/router/router.tsx`
- Create: `src/app/router/RouteErrorPage.tsx`
- Create: `src/app/router/NotFoundPage.tsx`
- Create: `src/features/foundation/FoundationPage.tsx`
- Create: `src/features/foundation/FoundationPage.module.scss`
- Create: `src/styles/global.scss`
- Create: `src/app/App.test.tsx`

**Interfaces:**

- Consumes: `queryClient`, initialized i18n, `LanguageSwitch`, and Ant Design.
- Produces: runnable application at `/`, error UI, and catch-all not-found UI.

- [ ] **Step 1: Write the failing application smoke test**

Export the route objects as `appRoutes`. Render a `RouterProvider` backed by `createMemoryRouter(appRoutes, { initialEntries: ['/'] })` and assert the Vietnamese foundation title and language control are visible. Repeat with `initialEntries: ['/missing']` and assert the localized not-found title and home action.

- [ ] **Step 2: Run the smoke test and confirm failure**

```powershell
npx vitest run src/app/App.test.tsx
```

Expected: FAIL because the app components do not exist.

- [ ] **Step 3: Implement providers and theme**

Compose `I18nextProvider`, Ant Design `ConfigProvider`, `App`, and `QueryClientProvider`. Use a restrained light theme:

```ts
{
  token: {
    colorPrimary: '#b7112c',
    colorBgLayout: '#f5f7fa',
    colorText: '#172033',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  components: { Table: { headerBg: '#f5f7fa' } },
}
```

- [ ] **Step 4: Implement routes and foundation UI**

Create `/` for `FoundationPage` and `*` for `NotFoundPage`. Use `RouteErrorPage` as `errorElement`. The foundation page contains the LNG name, bilingual switch, title, description, and a compact status card. Keep it responsive with semantic HTML and no business navigation.

- [ ] **Step 5: Pass all local quality gates**

```powershell
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: all commands exit `0`; no old feature import or old UI package appears in `src`.

- [ ] **Step 6: Run browser acceptance**

Start `npm run dev -- --host 127.0.0.1`, open `/` and `/missing`, then verify desktop and 390px-wide views. Confirm VN/EN switching, no horizontal overflow, no console errors, and the not-found home action.

- [ ] **Step 7: Commit the runnable foundation**

```powershell
git add src
git commit -m "feat(fe): build Ant Design application foundation"
```

### Task 5: Final Contract and Scope Audit

**Files:**

- Modify only if verification exposes a defect: files created in Tasks 1-4.

**Interfaces:**

- Consumes: the complete foundation branch.
- Produces: evidence that the destructive reset is reversible, scoped, and ready for the auth slice.

- [ ] **Step 1: Verify source and dependency boundaries**

```powershell
rg -n '@mui|@emotion|tailwind|notistack|react-hook-form|@/features/(auth|orders|hr|mapping|rbac)' src package.json vite.config.ts
npm ls @mui/material @emotion/react tailwindcss notistack react-hook-form
```

Expected: no source matches and the removed packages are absent.

- [ ] **Step 2: Verify the full baseline**

```powershell
npm run lint
npm run typecheck
npm test
npm run build
git status --short --branch
git log -5 --oneline
```

Expected: all checks pass, working tree is clean, and the reset/tooling, shared infrastructure, i18n, and application commits are individually visible.

- [ ] **Step 3: Re-index CodeGraph**

```powershell
codegraph init -i
codegraph status
```

Expected: the index belongs to this FE worktree and reports `Index is up to date`.

- [ ] **Step 4: Stop at the approved boundary**

Do not begin authentication or another screen in this plan. Report the exact commits, verification results, browser acceptance, and any non-blocking warnings.
