# Authenticated Media Consumption Design

## Goal

Make every frontend consumer of backend MediaAsset `downloadUrl` work across FE and BE origins while preserving authentication and removing direct navigation to protected relative URLs.

## Scope

- Add one shared authenticated media client built on the existing `apiClient`.
- Fetch protected media as `Blob` so the Bearer interceptor is applied.
- Provide a download action that creates and revokes a temporary object URL.
- Provide a React hook for authenticated image previews with object URL cleanup.
- Adopt the shared path in design, catalog, production, order, and work-score surfaces that consume MediaAsset download URLs.
- Keep existing upload endpoints and response types.

## Out of Scope

- Backend changes, Wasabi, signed URLs, cookie-auth redesign, service workers, or new dependencies.
- Replacing public listing `previewUrl` values.
- Replacing customization `inputs[].secureUrl`; that belongs to the customization contract.
- UI redesign or new media-management screens.

## Shared API

`src/shared/media/mediaApi.ts` exposes:

```ts
fetchMediaBlob(downloadUrl: string, signal?: AbortSignal): Promise<Blob>
downloadMediaAsset(downloadUrl: string, filename?: string): Promise<void>
```

`fetchMediaBlob` calls the existing Axios client with `responseType: 'blob'` and an optional abort signal. It accepts only non-empty application-provided URLs; it does not concatenate the API base URL because Axios already resolves relative API paths against `VITE_API_BASE_URL`.

`downloadMediaAsset` creates an object URL, clicks a temporary anchor with an optional safe filename, removes the anchor, and revokes the URL in `finally`.

`src/shared/media/useAuthenticatedMediaUrl.ts` exposes:

```ts
useAuthenticatedMediaUrl(downloadUrl?: string | null): {
  url: string | null
  loading: boolean
  error: Error | null
}
```

The hook fetches only protected backend media paths. It aborts obsolete requests and revokes every replaced/unmounted object URL.

## Consumer Rules

- A button that downloads a MediaAsset calls `downloadMediaAsset`; it does not use `href={downloadUrl}`.
- An `img` whose source is a MediaAsset download URL uses `useAuthenticatedMediaUrl`.
- Public external image URLs such as listing `previewUrl` continue to render directly.
- Components keep existing labels, styling, permissions, and toast conventions.
- Failed authenticated loads retain the current empty/fallback presentation and use existing localized feedback where an action was initiated by the user.

## Surfaces

- Design: submission asset buttons and PSD preview/download.
- Catalog: PSD/template download; protected preview download actions.
- Production: input/output preview and download.
- Orders: PSD template download. Public listing preview and customization URLs remain direct.
- Work score: protected asset download.

## Contract

The frontend treats MediaAsset references as:

```ts
type ProtectedMediaRef = {
  downloadUrl: string | null
  originalFilename?: string | null
  mimeType?: string | null
}
```

No frontend type or component added in this phase depends on MediaAsset `secureUrl`.

## Security and Lifecycle

- Protected bytes travel through the configured authenticated Axios client.
- Object URLs exist only in browser memory and are revoked after use.
- The helper does not persist blobs, tokens, or provider URLs.
- Abort is not shown as a user-facing error when a component unmounts or its URL changes.

## Verification

Tests are written and observed failing before implementation:

- Shared blob fetch uses `apiClient.get(downloadUrl, { responseType: 'blob', signal })`.
- Download creates, clicks, removes, and revokes its object URL.
- Preview hook loads a blob URL and revokes it on replacement/unmount.
- Representative design, production, catalog, order, and work-score consumers no longer render protected raw `href`/`src`.
- Existing upload contract tests remain green.

Run focused Vitest suites, `npm run lint`, and `npm run build`.

## Rollout

Ship with the backend media hardening branch. Local development continues using `VITE_API_BASE_URL=http://localhost:3000`; no Vite proxy is required.
