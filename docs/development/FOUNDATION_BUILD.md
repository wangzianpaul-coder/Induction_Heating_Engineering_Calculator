# Phase 1 Foundation Build and Test

## Scope

These instructions build and test the Phase 1 calculation-foundation library.
They do not claim Phase 7 product acceptance: the current artifacts are core
library bundles and do not yet contain the React application entry HTML.

## Pinned toolchain

- Node.js: `24.19.0` (`.node-version`)
- pnpm: `11.19.0` (`packageManager` in `package.json`)
- TypeScript: `7.0.2`
- Vite: `8.2.1`
- Vitest: `4.1.10`

The final Portable Offline product will not require any of these tools on the
end-user Windows PC. They are build-time dependencies only.

## Windows temporary-directory correction

Commands must not use a stale profile path. If the inherited `TEMP` or `TMP` is
invalid, override it for the current PowerShell process from `USERPROFILE`:

```powershell
$ihEcTemp = Join-Path $env:USERPROFILE 'AppData\Local\Temp'
New-Item -ItemType Directory -Path $ihEcTemp -Force | Out-Null
$env:TEMP = $ihEcTemp
$env:TMP = $ihEcTemp
```

This does not change the registry, Windows account, or system environment. The
Vitest launcher performs the same dynamic profile resolution for its child
process and never hard-codes a Windows username.

## Clean dependency install

From `D:\Induction_Heating_Engineering_Calculator`:

```powershell
pnpm install --frozen-lockfile
```

`pnpm-lock.yaml` and exact dependency versions are authoritative. Do not update
dependencies as part of an engineering-method change without a separate review.

## Verification

Run the complete Foundation gate:

```powershell
pnpm run verify:foundation
```

The command executes, in order:

1. all 47 controlled source-copy paths, byte counts, and SHA-256 digests;
2. strict TypeScript type checking;
3. all Vitest suites;
4. Standard Static core-library build;
5. Portable Offline core-library IIFE build;
6. artifact-policy and release-manifest verification.

Individual commands are available as `pnpm run verify:sources`,
`pnpm run typecheck`, `pnpm run test`,
`pnpm run build:standard`, `pnpm run build:portable`, and
`pnpm run verify:artifacts`.

## Foundation artifacts

- `dist/standard-static/ih-ec-core.js`: ES module;
- `dist/standard-static/ih-ec-core.js.map`: development source map;
- `dist/portable-offline/ih-ec-core.js`: self-contained IIFE with no runtime
  module import, fetch, or remote URL;
- a `release-manifest.json` in each build directory with build kind, complete
  version mapping, file byte counts, and SHA-256 hashes.

The artifact verifier rejects missing/unmanifested files, duplicate or unsafe
paths, byte/hash mismatches, runtime imports/fetches/remote URLs in the portable
bundle, and an absent portable global. It also executes the Portable IIFE in an
isolated VM context, dynamically imports the Standard bundle, compares their
complete public API surfaces, and checks the frozen identity plus the expected
52-method, 67-parameter, and zero-released-material registry gates.

## Current release boundary

The manifest scope is `phase_1_foundation_core_only`. No engineering calculation
method is executable in Phase 1, the released preset material catalog is empty,
and the core bundles are not the final user-facing Standard/Portable product.
Those states are intentional failure-closed gates, not placeholders for hidden
defaults.
