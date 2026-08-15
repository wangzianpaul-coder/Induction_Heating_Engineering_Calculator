# Controlled Implementation Plan

## Governing baseline

All work maps to Technical Freeze `IH-EC-V1-G0-2026-08-14-01`. The controlled
documents remain the engineering authority. Code and tests implement those
documents; they do not recalibrate or reinterpret them.

The following rules apply to every phase:

- calculation code is pure TypeScript and independent of React;
- canonical SI is the calculation boundary; display units are adapters only;
- a method is registered only after its contract, source, applicability,
  warnings, trace, failure statuses, and tests are complete;
- deferred/reference-only/insufficient-evidence paths fail closed;
- no UI, viewer, chart, report, or export layer contains an engineering formula;
- deterministic snapshots and explicit application/model/material/schema
  versions accompany reproducible results;
- feature/data gates disable only their dependent result or feature.

## Phase 0 — Freeze verification

Status: **complete**.

Scope: mandatory controlled-file reading; freeze, gate, allowlist, 52-method
consistency, schema/enumeration, source-manifest hash, release-gate, and workspace
preservation audits.

Exit evidence: `PHASE_0_FREEZE_VERIFICATION.md`.

## Phase 1 — Calculation foundation

Status: **complete**.

Scope:

- pinned TypeScript/Vitest/Vite project and dual-build skeleton;
- immutable Quantity model, canonical SI dimensions and explicit unit adapters;
- exact Parameter, Method, Material-property, status, warning, port, and topology
  registries copied from controlled dictionaries;
- result, solver status, warning, trace-DAG, provenance, and failure schemas;
- immutable Geometry, Material, and Case snapshots;
- canonical finite JSON, deterministic SHA-256 fingerprints, readable versioned
  case-file serialization, and fail-closed import;
- application, calculation-model, material-database, schema, and technical-freeze
  version mapping;
- pure unit/domain/serialization/registry tests;
- no business UI and no engineering-method formula implementation.

Method IDs: all 52 IDs are catalogued with exact lifecycle and source mappings;
zero methods are activated as executable calculations in this phase.

Exit evidence: `PHASE_1_FOUNDATION.md`.

Exit criteria: strict typecheck and test suite pass; standard ES-module core and
portable single-bundle core build successfully; artifact policy checks pass; all
invalid/non-finite/mismatched-schema/mismatched-freeze inputs fail closed.

## Phase 2 — Low-coupling calculation modules

Status: **complete at the current frozen-evidence boundary; runtime activation
remains gated**.

Current incremental evidence: `PHASE_2_PROGRESS.md`. Isolated ID-NUM-01 Simpson
and bracketed-bisection primitives, B-01 through B-07 (with B-07 limited to its
single-turn self route), D-01 through D-07 (with D-05 still an unsplit parent),
E-01/E-03, I-04
fixed-property screening, J-01 constant/piecewise-constant conduction, J-02
text-frozen correlations, and J-03/J-04/J-06 code have focused tests and full-
regression coverage. No Phase-2 method is runtime-executable until its full
snapshot/result/trace/source/warning adapter is complete. Controlled
discrepancies and release gates additionally keep B-01, B-04, B-05, B-06,
B-07, D-02, D-06, E-01, E-03, I-04, J-01, J-02, J-03, J-04, and J-06
non-activatable; they are recorded in the Phase-0 addendum and Phase-2 progress
record and are never repaired by guessed providers, child IDs, mappings,
tolerances, aliases, defaults, or warning rules.

A-01 remains source/schema gated rather than partially guessed: the current
material record does not freeze dependent-value physical ranges, phase/Curie
segments, interpolation IDs/versions, ordered unique nodes, or uncertainty
propagation, and its validation IDs differ from the central validation file.

D-05 has isolated strong-skin-screening and measurement-identification routes,
but no internal route name is treated as an approved child method. I-01 remains
unimplemented because its global feasible-interval search, finite design
domain, solver settings, rounding/stock rules, candidate snapshots, and
J-dependency adapters are not uniquely frozen.

E-02 also remains unimplemented: its contract explicitly waits for an approved
same-grade temperature/field/frequency material package, while A-01, Curie
segments, temperature-grid generation, scenario-band provenance, and aggregate
parameter mappings are not yet executable. No cold-state or generic material
curve is substituted.

J-05 remains unimplemented because its primary annulus-correlation sources are
not locally pinned and its dispatcher, measured-gap/eccentricity policy,
closure evidence, gas-property mapping, area basis, J-03 adapter, and child IDs
are not uniquely frozen. Derived notes and unmanifested working PDFs are not
promoted into product formula sources.

I-03 remains unimplemented because I-01/I-02 have no executable result
adapters and the feasible-set/manufacturing-set schema, upward-closed proof,
rounding rules, comparable boundary snapshots, and dependency failure-status
priority are not frozen. It does not infer feasibility from unresolved solver
states or use `max(delta_T,delta_Q)` without proof.

A-02 remains unimplemented because no IAPWS release/provider/official-node
package is locally pinned, and the unsplit parent lacks approved child/model
selection, cross-release state binding, phase/saturation/SR6 policies, complete
parameter mappings, and validation nodes. Constant room-temperature water
properties are not substituted.

C-01 remains unimplemented until the controlled files choose whether normalized
metrics use the qualified Recommended result or an independent external
reference (or define two separately named families). J-07 remains unimplemented
until its characteristic length, thermal capacity, boundary `h`, time/state and
dependency schemas, update/integration rules, analytical check, and primary
source are frozen.

I-02 remains unimplemented because its heat-limit/area-basis and finite-domain
schema, global root/tangency proof, nested solver settings, candidate dependency
snapshots, total-loss control volume, rounding/stock policy, and validation
mapping are not executable. A single bracketed root or sidewall-only heat rate
is not promoted into the required all-root total-loss solution.

B-08 remains a non-product numerical primitive. The controlled files do not
provide an approved serializable `integrand_id` dispatcher, quantity dimensions
and absolute-tolerance units, the primitive's mandatory explicit solver
tolerances, singular-endpoint transformations, or a pinned authoritative
elliptic comparison provider for `NUM-SIMP-002`. A caller closure, hidden
tolerance, or unpinned implementation is not substituted.

CODATA22 is mapped to B-03, B-04, B-07, D-04, E-01, E-03, J-03, and J-04, but
no local CODATA22 release copy is present in `SOURCE_MANIFEST.csv`. Those routes
retain the frozen constants and remain non-activatable until the controlled
version, access date, byte count, and SHA-256 pin are added; constants are not
replaced or recalibrated to close the source gate.

Phase-2 disposition is closed across all 32 A/B/C/D/E/I/J method IDs: 16 have
complete isolated implementations, 6 expose only independently safe partial
routes, and 10 remain unimplemented behind the gates recorded above and in
`PHASE_2_PROGRESS.md`. B-08's reusable numerical primitive is not counted as a
product-method route. Zero methods are activated in the runtime registry.

Scope: implement allowlisted A, B, C, D, E, I, and J methods in dependency order.
Each method receives an isolated TypeScript implementation, canonical-SI input
and output contract, exact controlled source mapping, applicability predicates,
warnings, failure branches, engineering trace, dimensional/limit/invalid-input
tests, and mapped validation cases before registration.

Deferred methods remain unavailable. Material- or evidence-gated branches return
their controlled non-success status without blocking independent methods.

Exit criteria: every activated method passes contract, dimensional, analytical
limit, invalid-input, and validation-case tests; method/contract/source/registry
mapping remains one-to-one.

## Phase 3 — System modules and orchestration

Status: **complete at the current frozen-evidence boundary**.

Completion evidence: `PHASE_3_PROGRESS.md`. The isolated wave covers F-01/F-02,
G-02/G-04/G-05/G-06/G-07/G-08/G-10, and H-01/H-03/H-04/H-05/H-06. G-01/G-03,
H-02/H-07, and K integrated orchestration remain explicitly blocked at their
frozen interfaces; F-03/G-09 remain deferred. Zero methods are runtime-
executable while their formal result/trace/warning/version boundaries and
recorded release gates remain open.

Scope: implement allowlisted F, G, and H methods plus K integrated case
orchestration. Model Series, Parallel, and Transformer topologies independently;
apply measurement overrides with provenance; enforce power, energy, and coolant
flow balances; and keep coupled outer iterations in the orchestration layer with
residuals and explicit convergence/failure status.

F-03 and G-09 remain disabled/deferred. No topology is silently coerced into
another topology.

Exit criteria: topology-specific, conservation, convergence, non-convergence,
no-feasible-solution, and override-provenance tests pass.

## Phase 4 — Material data and comparison

Status: **complete at the current frozen-evidence boundary**.

Completion evidence: `PHASE_4_PROGRESS.md`. The safe isolated wave strengthens
material-record structural admission and adds an exact-snapshot metadata
inventory comparator. It publishes no material values and performs no property
interpolation, extrapolation, numerical comparison, ranking, Recommended
selection, or downstream sensitivity calculation.

`A-01`, the first reviewed material data package, record-to-snapshot resolution,
three-tier override selection, formal Material Comparison, and untrusted
material-file import remain explicitly blocked by their recorded schema,
source, validation, and orchestration gates. The released material catalog
therefore remains empty and zero Phase-4 capabilities are runtime activated.

Scope: implement Common Preset, Project, and User Defined material services;
property-level source/quality/state provenance; temperature-dependent curves;
comparison; interpolation/extrapolation policies; and scoped missing-data
behaviour. Only reviewed data is shipped as approved preset data.

Exit criteria: material snapshots reproduce on another installation, curve and
state validation pass, provenance is complete, and missing/unapproved properties
fail only dependent calculations.

## Phase 5 — Desktop engineering UI

Status: **Runnable MVP complete at the Phase-5B controlled-adapter boundary**.

Progress evidence: `PHASE_5_PROGRESS.md` and `RUNNABLE_MVP.md`. The UI now
provides local Case creation/editing, six reviewed narrow evaluator adapters,
Calculate, result/warning/source views, and canonical save/reopen. Formal
MethodRegistry execution remains 0/52; material comparison, 3D, formal trace,
and engineering-report workflows remain gated.

Scope: React desktop shell consuming the stable application API; project/case
management; dense parameter editing and help; result, status, warning, method,
comparison, trace, and report views; JSON/CSV export and print-ready reporting.
Primary target is 1920x1080 on Windows Chrome/Edge at 100–125% scaling, with
1366x768 and 2560x1440 verification.

Exit criteria: no calculation formula exists in UI code; keyboard/mouse desktop
workflows, parameter metadata, case interchange, exports, printing, and target
resolutions pass acceptance checks.

## Phase 6 — Parametric 3D and FEM interchange boundary

Status: **pending**.

Scope: Three.js geometry driven by the same immutable GeometrySnapshot; workpiece
or furnace tube, insulation layers, air gap, hollow water-cooled helical coil,
cooling passage, leads/busbars, and controlled dimension relationships; camera
controls, reset, visibility, transparency, cutaway where feasible, and dimension
annotations. Non-FEM spatial fields are labelled `Schematic / Illustrative`.

Provide versioned adapters/manifests for external ANSYS Maxwell, ANSYS Thermal,
and COMSOL results. Do not implement a browser FEM solver.

Exit criteria: viewer has no engineering formulas, snapshot/viewer geometry
consistency tests pass, and malformed/incompatible external datasets fail closed.

## Phase 7 — Standard/portable builds and release acceptance

Status: **pending**.

Scope: integrate and produce Standard Static Web Build and Portable Offline Build;
embed all runtime dictionaries/data/help/assets; prohibit CDN, remote assets,
localhost, service worker, and runtime local-JSON fetch; complete case exchange,
export, print, performance, three-resolution, offline, and clean-Windows-PC
acceptance; generate versioned release manifest and known-limitations record.

Exit criteria: the portable entry HTML opens with `file://` in ordinary Windows
Chrome/Edge without Node, npm, Python, database, development environment, command
line, web server, or network; all required core functions work; reproducible build
and static-deployment instructions and acceptance records are delivered.

## Per-phase completion record

Every completed phase must record:

1. implemented scope;
2. method IDs activated or explicitly not activated;
3. tests and their result;
4. failure-closed branches;
5. documentation changes;
6. remaining feature/data gates;
7. the next phase.
