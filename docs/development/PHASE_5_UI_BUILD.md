# Version 0.9 Runnable Test UI Build and Verification

## Scope

These commands build the Runnable MVP React application. The UI exposes ten
reviewed, narrow application adapters while leaving every formal method-registry
runtime flag unchanged. It provides local Case creation/editing, calculation,
result inspection, canonical save/reopen, and explicit disabled reasons.

## Commands

```powershell
pnpm install --frozen-lockfile --offline
pnpm run dev:ui
```

Development URL: `http://127.0.0.1:5173/`.

Run the complete versioned 0.9 test-release gate:

```powershell
pnpm run verify:release:0.9
```

The versioned command runs the existing complete `verify:mvp` chain:
source-manifest verification, strict no-emit TypeScript,
the complete Vitest suite, both Foundation builds, both UI builds, and the UI
artifact/offline verifier. `verify:ui` is the build/artifact subset.

## Artifacts

### Standard static UI

Directory: `dist/v0.9-ui-standard-static/`

- relative ES-module HTML and local CSS/JavaScript;
- source map for the JavaScript chunk;
- `release-manifest.json` scope `v0_9_test_release_ui`.
- `V0_9_KNOWN_LIMITATIONS.md`, included in the manifest with its exact byte
  count and SHA-256 digest.

Serve with any ordinary static host, or use `pnpm run preview:ui` after build.
Do not treat this module-based artifact as a direct `file://` package.

### Portable offline UI

Directory: `dist/v0.9-ui-portable-offline/`

- `index.html`;
- `ih-ec-ui.js`, a production classic IIFE that mounts at `#root`;
- `ih-ec-ui.css`;
- `release-manifest.json` scope `v0_9_test_release_ui`.
- `V0_9_KNOWN_LIMITATIONS.md`, included in the manifest with its exact byte
  count and SHA-256 digest.

The Portable artifact has no runtime module import, Node `process.env`, fetch,
XHR, WebSocket, worker, service worker, CDN, remote asset, localhost dependency,
or runtime local-JSON request.
Distribute the entire directory and open its `index.html` directly; do not copy
the HTML without the sibling script, stylesheet, manifest and limitations file.

## Artifact verifier

`scripts/verify-ui-builds.mjs` checks exact manifest schema/build identity/scope,
package application version, implementation phase, technical freeze ID, and
one identical version map across Foundation and UI artifacts. It also verifies
safe paths, exact bytes/SHA-256, local resources, parsed JavaScript network and
module policy, Portable classic-IIFE syntax, self-starting `#root`, and that UI
builds do not overwrite Foundation outputs.

For the 0.9 UI artifacts it additionally checks `releaseProfile`, the acceptance
boundary, the known-limitations file path/hash, `zh-Hans` document language, and
Chinese-first title/no-script guidance. Foundation manifests remain compatible
and do not receive these UI-only fields.

Passing this automated gate establishes the Runnable MVP artifact boundary. It
does not claim final clean-PC packaging, full accessibility/performance review,
formal engineering-report acceptance, or final Phase-7 release sign-off.
The evidence template is `docs/development/PHASE_7_ACCEPTANCE.md`.
