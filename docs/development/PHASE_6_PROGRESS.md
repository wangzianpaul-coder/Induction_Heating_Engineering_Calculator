# Phase 6 — Parametric 3D and FEM Interchange Progress

Date: 2026-08-17
Implementation boundary: technical freeze `IH-EC-V1-G0-2026-08-14-01`

## Status

Phase 6 is implemented at the bounded v1 visualization/interchange boundary in
`IMPLEMENTATION_PLAN.md`. It does not relax any calculation-method, material,
validation, or release gate.

## Parametric 3D implementation

- `src/visualization/sceneModel.ts` builds a versioned, immutable scene from one
  content-addressed `GeometrySnapshot`.
- The accepted mapping is an explicit coaxial, single-insulation-layer,
  hollow-round-conductor helix. The snapshot must provide the workpiece/tube,
  insulation, single-sided radial air gap, mechanical coil diameters, helical
  path, lead length, conductor radial outside size, conductor outside diameter,
  and coolant-hole diameter. The current round-tube mapping requires the radial
  outside size and tube outside diameter to be supplied separately and agree.
- Snapshot kind, schema, technical freeze, payload fingerprint, content-addressed
  ID, unique quantities, positive/finite ranges, radial ordering, and frozen
  mechanical identities are checked before any scene is produced.
- Missing or conflicting dimensions are never inferred. Existing Case files
  with another geometry mapping fail closed instead of being silently migrated.
- `src/application/visualizationService.ts` supplies two UI-safe routes:
  - load an already validated Case JSON using the existing strict Case parser;
  - build a temporary immutable geometry snapshot from a complete set of
    explicit millimetre inputs and an explicit conservative valid-digit claim.
- The application projection removes snapshot ID, content hash, mapping ID, and
  raw Case payload before ordinary UI receives the scene.
- `src/visualization/Parametric3DViewer.tsx` uses Three.js `0.185.1` and supports
  rotate, zoom, view reset, component visibility, global transparency, planar
  cutaway, component picking/highlighting, and dimension annotations.
- The hollow copper tube is rendered as a swept annular wall with a separate
  coolant passage. Leads preserve the declared total lead length; their direction
  remains explicitly illustrative.
- The permanent Chinese-first watermark is
  `示意图 / Schematic · 非 FEM 场`. Colours, transparency, dimension lines and
  cutaway never claim to be solved temperature or electromagnetic fields.
- The interactive renderer rejects more than 128 helical revolutions as a
  viewer-capacity failure. This is a performance/safety boundary, not an
  engineering applicability limit, and it never modifies the source snapshot.

No calculation formula, material provider, FEM solver, Case parser, or Case
mutation path exists in the viewer component.

## External FEM read-only boundary

`src/interchange/femReferenceManifest.ts` implements schema version `1.0.0` for
read-only external references from:

- ANSYS Maxwell;
- ANSYS Thermal;
- COMSOL Multiphysics.

The strict parser validates exact fields and rejects unknown or missing schema
members. It validates solver family/name/version/adapter combinations, analysis
type, 2D/3D declaration, right-handed coordinates, declared length-unit scale,
axis mapping, affine transform, and the geometry snapshot binding. It also
requires independent SHA-256 references for geometry, mesh, materials,
boundaries, sources/excitations, and every field-data artifact.

At least three monotonically refined mesh levels are required, together with a
declared convergence metric, nonlinear residual metadata, energy-balance
metadata, operating frequency/time/phasor basis, validation status, overlap
datasets, and uncertainty. Only these fields are accepted:

- temperature;
- magnetic flux density;
- current density;
- volumetric heat generation.

Manifest parsing only establishes structural compatibility. Package admission
is a separate call that requires hashes computed from the actual selected files,
an exact current geometry snapshot ID, a non-rejected validation state, and
successful declared convergence and energy gates. The admitted record is frozen
and permanently labelled `fem_or_experiment_reference` with policy
`read_only_reference_no_model_mutation`.

The interchange module imports no calculation method, material registry,
visualization builder, or snapshot constructor. Imported FEM metadata therefore
cannot update geometry, material data, formulas, defaults, Recommended selection,
or calculation results.

## Verification

Focused Phase-6 verification covers:

- snapshot/scene reproducibility and immutability;
- all required component and dimension mappings;
- tampered hashes, incompatible mapping/schema, missing quantities, conflicting
  identities, and viewer-capacity rejection;
- public scene projection with no snapshot/hash/mapping identifiers;
- Case JSON and explicit-input application routes;
- hostile accessor and throwing-Proxy rejection without executing getters or
  propagating exceptions;
- permanent non-FEM provenance watermark and public-label rendering;
- renderer source-boundary checks;
- ANSYS Maxwell, ANSYS Thermal, and COMSOL manifest profiles;
- malformed schema, unsupported solver/version/field, unit/transform mismatch,
  mirrored coordinates, non-refining meshes, inconsistent convergence metadata,
  geometry mismatch, artifact hash mismatch, and rejected/unconverged admission;
- interchange source-boundary checks.

The focused suite contains 22 tests. It passed together with TypeScript strict
type checking. The repository-wide suite was also run during Phase-6 integration;
the final release-gate run is recorded by Phase 7 after all parallel UI work has
landed.

## Deliberate boundaries and remaining gates

- This implementation is a geometry viewer and external-reference boundary; it
  is not a browser FEM/CFD solver.
- No generic CAD kernel, collision solver, multi-layer winding modeller, arbitrary
  conductor-section sweep, or automatic legacy-geometry migration is claimed.
- Solver-native exporters and field payload formats remain external. A manifest
  cannot be formally admitted until the application has independently computed
  every selected raw-file hash.
- Imported scalar/vector field overlay is not enabled until its payload schema,
  memory/performance budget, legends, and spatial validation fixtures are frozen.
- FEM reference admission is not scientific validation and cannot approve or
  calibrate a calculation method without the separate controlled validation
  protocol and experimental evidence.
- Final Windows Chrome/Edge WebGL interaction, portable-offline hardware testing,
  and release acceptance belong to Phase 7.
