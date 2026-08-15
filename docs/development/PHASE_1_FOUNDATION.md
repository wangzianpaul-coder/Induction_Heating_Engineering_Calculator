# Phase 1 — Calculation Foundation Completion Record

## Record

| Field | Verified value |
|---|---|
| Completion date | 2026-08-14 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Application version | `0.1.0-foundation.1` |
| Calculation model version | `1.0.0-gate0` |
| Material database version | `0.0.0-unreleased` |
| Implementation phase | `phase_1_foundation` |
| Phase status | `complete` |

This record covers the calculation foundation only. It does not claim that a
calculation method, product UI, final static website, final portable HTML, or a
clean-Windows acceptance test is complete.

## Implemented scope

- Pinned Node.js, pnpm, TypeScript, Vite, and Vitest toolchain metadata and a
  reproducible lock file.
- Canonical-SI dimension and unit registries with explicit, dimension-checked
  display conversion. Absolute temperature and temperature difference remain
  distinct dimensions even though both use canonical kelvin.
- An immutable `Quantity` union. Known/estimated/measured scalar quantities
  carry canonical SI, original/display representation, uncertainty, basis,
  precision, controlled data quality, state, and provenance. The production
  constructors are bound to the frozen Parameter and Method registries, enforce
  parameter-specific unit semantics, and require content-addressed source
  snapshots where supplied. Missing/not-applicable quantities contain no
  numeric value, so zero, NaN, or a previous iterate cannot become a hidden
  placeholder.
- Exact frozen machine enumerations for method, lifecycle, approval, validation,
  source review, dataset role, result, applicability, provenance, confidence,
  data quality, warning severity, topology, loaded state, quantity basis, port,
  and RMS phasor conventions.
- A 67-record parameter registry copied from the controlled engineering
  dictionary. Distinct quantities such as `D_i`, `D_o`, `D_m`, `D_c`, turn
  clearance, and annulus radial gap remain independent. Aliases are available
  only through an explicit migration path.
- A 52-record method specification registry with exact Gate-0 approval status,
  source mapping, input/output contract metadata, applicability, warning
  predicates, central validation IDs, method-check IDs, source-register
  confidence mapping, recommendation eligibility, and contract/derivation
  references.
- Material record and property-level provenance schemas, authoring/release
  gates, finite-data checks, unit/dimension checks, source-review consistency,
  and approval metadata checks. The released material catalog is deliberately
  empty because the preset-data release gate has not passed.
- Immutable Geometry, Material, and Case snapshots with deterministic canonical
  JSON and SHA-256 identities.
- Readable versioned JSON case files with exact schema/freeze/version mapping,
  nested and envelope fingerprints, bounded size/depth/node count, and a
  no-throw untrusted-input validator. Import independently recomputes canonical
  SI, display representations, and absolute uncertainty from the serialized
  source units and rejects parameter-semantic unit substitutions even when all
  fingerprints have been recomputed.
- Calculation result, warning, and trace-DAG schemas. Results bind method ID,
  method version, approval, source, confidence, recommendation eligibility,
  snapshot IDs, model versions, applicability, solver report, warnings, and
  failure diagnostic. Successful output envelopes, solver termination,
  warning ownership, trace snapshots/method/status, complete frozen-source
  coverage, and runtime implementation registration are validated as one
  publication boundary. Failure results cannot contain a value or numeric
  provenance.
- Standard ES-module and portable single-file IIFE calculation-core builds with
  versioned release manifests and per-file byte/SHA-256 records.

No engineering formula was implemented in Phase 1. React, Three.js, charts,
reports, and business UI were intentionally not started before the calculation
foundation.

## Method IDs and activation state

All 52 top-level frozen method IDs are catalogued. Their lifecycle distribution
remains exactly:

| Approval status | Count | Runtime executable in Phase 1 |
|---|---:|---:|
| `approved` | 21 | 0 |
| `approved_with_limitation` | 29 | 0 |
| `deferred` | 2 | 0 |
| Total | 52 | 0 |

The v1 allowlist contains 50 approved or approved-with-limitation specifications.
F-03 and G-09 remain Deferred and cannot be selected as ordinary case methods or
publish a successful result.

The runtime method registry is empty until isolated implementations and their
required tests are added in later phases. Parent method families that require
controlled child IDs are also barred from successful result publication before
their split is registered: A-02, D-05, G-08, G-09, H-04, H-05, J-01, J-02,
J-05, and I-04.

## Tests and build evidence

The latest repository regression command was `pnpm run verify:foundation`,
executed with process-local `TEMP` and `TMP` resolved from `USERPROFILE` to avoid
the stale legacy Windows profile path. The count includes the Foundation suites
and current non-activated Phase-2 isolation suites; it does not change the
Phase-1 scope or activate an engineering method.

| Gate | Result |
|---|---|
| Controlled source manifest | 47/47 files; path, bytes, and SHA-256 pass |
| TypeScript strict typecheck | PASS |
| Vitest | 41 files, 1371 tests, 1371 pass (includes non-activated Phase-2 isolation tests) |
| Standard core build | PASS |
| Portable core build | PASS |
| Artifact inventory/bytes/SHA-256 | PASS |
| Portable classic-script/import/fetch/URL policy | PASS |
| Portable IIFE execution and Standard/Portable public-API parity | PASS; 129 exports |

Generated artifacts:

| Build | File | Bytes | SHA-256 |
|---|---|---:|---|
| Standard | `dist/standard-static/ih-ec-core.js` | 298742 | `943afbe6b6f8d7f4fb5677ff821582b1cdb1a1185007150f68bba58cc5c4ccd3` |
| Standard source map | `dist/standard-static/ih-ec-core.js.map` | 568522 | `82fca8a8da3ee5db5349ae2b1dae1bc523f26bf7a1176e4a22945d6506da886e` |
| Portable | `dist/portable-offline/ih-ec-core.js` | 205960 | `c554d6eec1ceea5a652eb27fa455156c4476a79292f2cca213c388ac839e7510` |

The Phase-1 portable artifact is the self-contained calculation-core library,
not the final `file://` product entry HTML. Final offline UI acceptance remains a
Phase-7 release criterion.

Tests cover unit conversion and dimensional algebra; absolute/delta temperature;
known and unavailable quantity semantics; registry uniqueness and immutable JSON
boundaries; all 52 method mappings and approval counts; all 67 parameter IDs;
material release gates; warning/status consistency; trace-DAG structure;
success/failure result discrimination; case round-trip and tamper detection; and
both build-manifest policies.

No historical workbook value, screenshot value, legacy prototype output,
historical ChatGPT output, 783 kW value, or 135 L/min value is used as a default,
formula input, calibration target, scientific-validation target, or golden test.

## Failure-closed branches

The Foundation rejects or returns an explicit non-success state for:

- unknown, malformed, duplicate, Deferred, version-mismatched, or
  approval-mismatched method selections;
- unknown parameter IDs and parameter dimension/canonical/display-unit mismatch;
- dimension-compatible but parameter-semantic unit substitution, including
  active/heat (`W`), reactive (`var`), and apparent (`VA`) power-family mixing;
- non-finite numbers, unsupported JSON primitives, sparse arrays, symbol keys,
  accessors, cycles, and non-plain registry metadata;
- case size, structure-depth, structure-node, schema, freeze, model-version,
  snapshot-ID, and fingerprint mismatch;
- invalid topology/port/phasor conventions;
- unavailable quantities that attempt to carry a numeric placeholder;
- successful results with blocking/fatal warnings, out-of-domain applicability,
  Deferred/forged approval, unknown method/source/version, rejected or unresolved
  confidence, forged recommendation, incomplete frozen-source evidence,
  inconsistent solver/trace/snapshot/warning ownership, empty or uncontrolled
  output envelopes, an unregistered implementation, or an unsplit parent method
  family;
- failed results that attempt to carry a value or numeric provenance;
- material non-finite tables/constants, invalid ranges/units/dimensions,
  duplicate points/properties, missing or mismatched property-level provenance,
  failed source review, or incomplete approval metadata;
- portable bundles containing runtime module imports, `fetch`, remote URLs,
  unmanifested files, unsafe manifest paths, or byte/SHA-256 mismatch.

## Documentation changes

- `docs/development/PHASE_0_FREEZE_VERIFICATION.md`
- `docs/development/IMPLEMENTATION_PLAN.md`
- `docs/development/FOUNDATION_BUILD.md`
- this Phase-1 completion record

The controlled engineering baseline, accepted ADRs, source copies, archive, and
research/evidence working files were not edited.

## Remaining feature and data gates

- property-level source review and approval before releasing common preset
  material data;
- project datasets before releasing project-material records;
- project/OEM safety limits where required by cooling and protection contracts;
- measurement/FEM evidence for same-state actual equivalent impedance,
  proximity-sensitive AC resistance, hotspot behaviour, and open/complex
  annulus cases;
- a new, segregated sealed holdout before any empirical-calibrated model release;
- local pinned copies for online-only sources before dependent release paths are
  activated;
- explicit child method IDs and contracts for every frozen parent family before
  those parents can publish a successful value.

These gates disable only dependent records or calculation paths. They do not
block independent allowlisted methods.

## Next phase

Proceed to Phase 2 — Low-coupling Calculation Modules. Implement isolated
allowlisted methods in dependency order, beginning with geometry normalization,
dimensionless utilities, unit-safe numerical primitives, and other methods whose
required controlled inputs and sources are already released. Every activation
must include contract/source mapping, applicability and warning predicates,
failure statuses, trace, dimensional and analytical-limit tests, invalid-input
tests, and its mapped validation cases.
