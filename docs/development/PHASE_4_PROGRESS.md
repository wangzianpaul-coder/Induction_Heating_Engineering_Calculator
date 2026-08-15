# Phase 4 — Material Data and Comparison Progress Record

## Record

| Field | Current value |
|---|---|
| Date | 2026-08-15 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Phase status | `complete_at_frozen_evidence_boundary` |
| Runtime capabilities newly activated | 0 |
| Released material records | 0 |

This is an engineering-boundary completion record, not a material-database or
product-release claim. Phase 4 implements only the data-shape and exact-metadata
operations that are uniquely supported by the frozen evidence. It does not make
`A-01` executable and does not publish a material value, interpolation service,
Recommended selection, sensitivity result, or runtime comparison workflow.

## Controlled scope completed

### Material registry structural admission

`MaterialRegistry` now mechanically enforces the structural rules that can be
decided without inventing property science:

- every table point has the complete declared coordinate tuple;
- full coordinate tuples are unique, including `+0`/`-0` identity;
- every declared independent variable has one compatible valid-range axis;
- coordinates are finite, type-compatible, and inside mechanically decidable
  domain boundaries;
- a one-dimensional numeric table has at least two strictly increasing nodes;
- release catalogs admit approved, reviewed, source-hashed constants and only
  the frozen one-dimensional numeric `piecewise_linear` table shape;
- multidimensional, categorical, mixed-boundary, unregistered-interpolation,
  and `approved_function` release paths fail closed.

Passing this data-release gate does not register an interpolation implementation
or make `A-01` executable. A constant may retain its explicit source/state domain;
the registry does not pretend that constants require interpolation.

The constructor now captures one immutable descriptor-only view before semantic
validation. The shared registry clone rejects accessor-bearing, sparse,
symbol-decorated, hidden, custom-property, and custom-prototype arrays without
executing array getters or iterators. Each candidate is captured and validated
in input order, preventing stateful Proxy validation-to-clone substitution and
later hostile candidates from hiding an earlier semantic failure.

### Isolated metadata-only material comparison

`materialMetadataComparison` is an isolated, non-public, non-runtime boundary
for already-created content-addressed `MaterialSnapshot` values. It:

- validates the exact snapshot envelope, schema/freeze versions, canonical UTC
  timestamp, payload, SHA-256 fingerprint, and `material:<sha256>` identity;
- narrows material approval and data-quality enums to ADR-0005 rather than
  reusing method or global supersets;
- requires an explicit property set, registered quantity parameter/dimension/
  canonical-unit expectations, and an exact canonical state per property;
- preserves caller candidate/property ordering and the original frozen quantity,
  source, quality, interpolation, and extrapolation metadata;
- keeps a candidate visible when a property is missing, unavailable, or state/
  quantity semantics do not match, marking only that candidate/cell
  `insufficient_data`;
- reports the empty released catalog explicitly and fabricates no candidate;
- performs no interpolation, extrapolation, averaging, curve splicing,
  difference/percentage, ranking, Recommended selection, or sensitivity math.

The comparison input uses a descriptor-only bounded copy. Accessors, symbols,
hidden fields, custom prototypes, cycles, sparse arrays, non-finite values,
throwing Proxy traps, and hostile values thrown by traps fail closed without
escaping the no-throw API. Dense-array inspection is linear in input size.

Every returned property cell is marked `engineeringUsable: false`. This makes
the output a metadata inventory, not an `A-01` property resolution or a formal
Material Comparison result.

## Explicit open gates

- `A-01` remains unimplemented. The frozen record model still lacks controlled
  dependent-value physical ranges/sign rules, versioned interpolation
  implementations, enforceable Curie/phase segmentation, complete conditional
  state coordinates, and an approved uncertainty-propagation contract.
- `RELEASED_MATERIAL_RECORDS` remains empty and the material database remains
  unreleased. No synthetic fixture or historical value was promoted.
- The current shared `MaterialSnapshot` schema has arbitrary JSON state,
  interpolation, and extrapolation fields and no controlled property revision,
  valid-domain, or state-grid result schema. It also does not freeze uniqueness
  or membership semantics between property-level `sourceRefs` and a quantity's
  `sourceRef`.
- No controlled service converts a `MaterialRecord` into a state-resolved
  `MaterialSnapshot`, implements the three-tier override/selection policy, or
  proves material role/slot replacement in a case.
- Full Material Comparison curves, uncertainty bands, downstream
  skin-depth/resistance/thermal/cooling sensitivities, ranking, and Recommended
  selection require `A-01`, typed downstream adapters, and K orchestration.
- `MaterialRegistry` is a deterministic in-process metadata constructor, not a
  byte-bounded untrusted material-file decoder. A separate plain-JSON import
  boundary with size/schema/version controls is required before user material
  files can be accepted.
- Contract method checks `MAT-P-001`/`MAT-P-002` are not silently aliased to
  central validation labels `MAT-001`/`MAT-002`; `MAT-COMP-001` likewise remains
  a blocked product-validation case.

## Isolation and activation

- The comparator is not exported by `src/public-api.ts` and is absent from all
  runtime registries and Vite entrypoints.
- No method registry implementation/executable flag was changed.
- No material record, default property value, provider, warning ID, validation
  alias, interpolation version, or downstream formula was added.
- Runtime network access, historical screenshots/workbooks, and prohibited
  historical cooling figures remain outside source and tests.

## Verification evidence

- Focused Phase-4 tests: 3 files / 67 tests PASS
  (`immutableRegistry`, `materialRegistry`, `materialMetadataComparison`).
- TypeScript `--noEmit`: PASS.
- Full Vitest regression: 56 files / 2777 tests PASS.
- Material registry and metadata comparator each received an independent
  hostile-input and frozen-boundary review after their final fixes; both PASS.
- Controlled source manifest: 47/47 byte counts and SHA-256 digests PASS.
- Standard Static and Portable Offline production builds: PASS.
- Artifact verification: 129 public exports match between build targets.
- Generated sibling JavaScript under `src`/`tests`: 0.
- Production activation-true matches: 0; production runtime-network matches: 0;
  comparator public/runtime references: 0.
- Prohibited historical/runtime-test value matches: 0. Test-only negative
  sentinels that assert activation/network rejection remain intentional.
