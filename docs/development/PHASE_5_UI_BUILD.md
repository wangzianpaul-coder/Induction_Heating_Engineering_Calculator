# Phase 5B Runnable MVP UI Build and Verification

## Scope

These commands build the Runnable MVP React application. The UI exposes eight
reviewed, narrow application adapters while leaving every formal method-registry
runtime flag unchanged. It provides local Case creation/editing, calculation,
result inspection, canonical save/reopen, and explicit disabled reasons.

## Commands

```powershell
pnpm install --frozen-lockfile --offline
pnpm run dev:ui
```

Development URL: `http://127.0.0.1:5173/`.

Run the complete intended MVP gate:

```powershell
pnpm run verify:mvp
```

`verify:mvp` runs source-manifest verification, strict no-emit TypeScript,
the complete Vitest suite, both Foundation builds, both UI builds, and the UI
artifact/offline verifier. `verify:ui` is the build/artifact subset.

## Artifacts

### Standard static UI

Directory: `dist/phase5-ui-standard-static/`

- relative ES-module HTML and local CSS/JavaScript;
- source map for the JavaScript chunk;
- `release-manifest.json` scope `phase_5b_runnable_mvp_ui`.

Serve with any ordinary static host, or use `pnpm run preview:ui` after build.

### Portable offline UI

Directory: `dist/phase5-ui-portable-offline/`

- `index.html`;
- `ih-ec-ui.js`, a production classic IIFE that mounts at `#root`;
- `ih-ec-ui.css`;
- `release-manifest.json` scope `phase_5b_runnable_mvp_ui`.

The Portable artifact has no runtime module import, Node `process.env`, fetch,
XHR, WebSocket, worker, service worker, CDN, remote asset, localhost dependency,
or runtime local-JSON request.

## Artifact verifier

`scripts/verify-ui-builds.mjs` checks exact manifest schema/build identity/scope,
package application version, implementation phase, technical freeze ID, and
one identical version map across Foundation and UI artifacts. It also verifies
safe paths, exact bytes/SHA-256, local resources, parsed JavaScript network and
module policy, Portable classic-IIFE syntax, self-starting `#root`, and that UI
builds do not overwrite Foundation outputs.

Passing this automated gate establishes the Runnable MVP artifact boundary. It
does not claim final clean-PC packaging, full accessibility/performance review,
formal engineering-report acceptance, or final Phase-7 release sign-off.
