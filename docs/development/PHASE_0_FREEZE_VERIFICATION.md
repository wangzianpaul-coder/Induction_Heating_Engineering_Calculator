# Phase 0 — Freeze Verification Record

## Record

| Field | Verified value |
|---|---|
| Verification date | 2026-08-14 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Accepted decision baseline | ADR-0002 through ADR-0009 and `V1_DECISION_REGISTER.md` |
| Superseded decision | ADR-0001 |
| Implementation authorization | Phase 1 may proceed |

This record is an implementation audit. It does not amend or reinterpret any
controlled engineering decision, equation, contract, source, or validation
requirement.

## Controlled-file reading

The implementation prompt and every file in its mandatory reading sequence were
read in full before implementation began. This included the start/handoff/gate
documents, accepted ADRs, architecture, calculation basis and contracts, source
register, validation cases and protocol, project audit, all controlled data
dictionaries, material model and candidate-data requirements, method-status
dictionary, controlled derivations, source manifest, and repository README.

No previous chat, legacy result, workbook output, screenshot, prototype output,
or historical reverse-engineered coefficient was used as an engineering source,
default, calibration target, or golden test.

## Method consistency and allowlist

The structured method entries were independently enumerated from:

- `CALCULATION_BASIS.md`;
- `CALCULATION_CONTRACTS.md`;
- the main method table in `FORMULA_SOURCE_REGISTER.md`;
- the 52 method-to-source mappings in the source register.

Each location contains exactly 52 unique method IDs. Pairwise set differences
are empty. Lifecycle status is consistent between the Calculation Basis,
Contracts authority table, and contract entries/matrix:

| Lifecycle status | Count |
|---|---:|
| `approved` | 21 |
| `approved_with_limitation` | 29 |
| `deferred` | 2 |
| Total | 52 |

The v1 implementation allowlist therefore contains 50 methods:

- `approved`: A-01; B-01, B-02, B-08; C-01; D-01, D-02, D-03, D-06,
  D-07; G-01, G-02, G-04, G-05, G-06; H-01, H-03, H-07; J-01, J-03,
  J-06.
- `approved_with_limitation`: A-02; B-03, B-04, B-05, B-06, B-07;
  D-04, D-05; E-01, E-02, E-03; F-01, F-02; G-03, G-07, G-08, G-10;
  H-02, H-04, H-05, H-06; J-02, J-04, J-05, J-07; I-01, I-02, I-03,
  I-04.
- `deferred` and disabled in v1: F-03 and G-09.

The `scientific_status` codes in the Source Register are evidence/source
classification codes, not lifecycle approval status; they were not used to
derive or override the allowlist.

## Frozen schema and enumeration audit

The parameter, canonical-unit, geometry, material tier, material property,
state, warning, port, loaded-state, phasor, topology, validation, visualization,
result-status, solver-status, and data-quality definitions were checked against
their controlled dictionaries and architecture/contracts. The implementation
will copy these controlled IDs exactly and keep distinct physical quantities
distinct, including all separately defined coil/workpiece diameters.

The central validation catalogue contains 45 unique case headings. Release
validation is separate from historical-output reproduction.

## Source integrity

`SOURCE_MANIFEST.csv` contains 47 records. For every record, the referenced file
exists and its recorded byte length and SHA-256 digest match the current file:

| Check | Result |
|---|---:|
| Manifest rows checked | 47 |
| Existing files | 47 |
| Byte-length matches | 47 |
| SHA-256 matches | 47 |
| Missing files | 0 |
| Unmanifested files under `references/` | 0 |

No controlled source file was modified by this verification.

## Workspace preservation audit

The workspace was not a Git repository at verification time, so there was no
version-control rollback protection. Before implementation it contained 334
non-empty files (251,707,149 bytes). `src/`, `tests/`, and `exports/` were empty,
and no `package.json` existed.

Phase 1 is restricted to new implementation/tooling files and new development
records. The existing root controlled documents, `archive/`, `data/`, `docs/`
controlled content, `references/`, `validation/`, and `working/` evidence are to
be preserved. Any future controlled-file amendment requires an explicit review
rather than incidental implementation edits.

## Remaining feature and data release gates

These are recorded as scoped gates, not as blockers to unrelated Foundation
work:

- property-level review and approval before publishing preset material data;
- project-supplied material datasets for `project_material` releases;
- project/OEM safety-limit inputs where the controlled contracts require them;
- measurement/FEM evidence for actual equivalent resistance/inductance,
  proximity-sensitive AC resistance, hotspot behaviour, and open-annulus cases;
- a new sealed holdout dataset before any empirical calibration release;
- local, pinned source copies for online-only sources before a release that
  depends upon them.

Dependent functionality must return the controlled failure status when a gate is
not satisfied. Missing evidence must never be replaced with zero, NaN, a hidden
default, or a last-iteration value.

## Phase 0 tests and failure-closed branches

Phase 0 was read-only and contains no calculation-method unit tests. Its audit
checks were exact-ID/set/status checks, source-file existence/length/SHA-256
checks, and workspace inventory checks. Failure of freeze identity, method-set
consistency, a controlled digest, or an accepted decision would have blocked
implementation. None failed.

## Post-verification implementation addendum

Phase-2 implementation exposed the following controlled discrepancies and
release-cross-check gates that the initial method-set/status audit did not
identify:

- D-02 has an enum-routing conflict: `CALCULATION_CONTRACTS.md` defines
  `conductor.shape` as `solid_round,hollow_round,solid_rect,hollow_rect`, while
  `ENGINEERING_PARAMETER_DICTIONARY.md` defines the same parameter as
  `solid_round | hollow_round | solid_rectangular | hollow_rectangular | custom`.
- `CALCULATION_CONTRACTS.md` marks B-01 mechanical `D_o` as required, while
  central case GEO-001 omits `D_o` from its input list and expects `D_o` as an
  output of the identity. The isolated implementation follows the method
  contract and supplies explicit `D_o` in its GEO-001-derived test, so the
  central fixture is not executable verbatim until the controlled inputs are
  reconciled. B-01 also lacks a frozen combined-uncertainty rule for comparing
  real measured redundant geometry; `TOL-ID` is identity-only. Its prose
  warning predicates have no stable warning IDs.
- E-01 is associated with `E-SKIN-001` in the Calculation Basis,
  `EM-S-004`/`EM-S-003` in the Contracts and method registry, and
  `ELEC-SKIN-001` in the central validation document. No alias is inferred.
- The parameter dictionary includes D-06 in
  `coil.mean_temperature.consumingMethods` but omits D-06 from
  `frequency.consumingMethods`, although frequency is a required D-06 method
  input. The isolated method records this as a parameter-dictionary conflict
  and does not alter the registry.
- B-04's controlled L85 Equations 11--12 polynomial values differ in the final
  shown digits from some L85 Table-1 exact-function values. The contract
  requires Equations 9--12, while the associated source review still requires
  a release cross-check and supplies no separate table-comparison tolerance.
  The implementation therefore uses the equations, retains the table only as
  an audit diagnostic, and does not invent a tolerance or replace coefficients.
- E-03 contract metadata uses the local names `workpiece.diameter`,
  `rho_at_target_state`, `mu_r_at_target_state`, and `penetration_criterion`.
  The parameter registry instead contains the canonical
  `workpiece.outer_diameter`, `resistivity`, and `relative_permeability` records
  and has no frozen criterion parameter. The contract also describes the
  historical criterion as optional/default two while requiring that the
  historical criterion be explicitly selected. The isolated implementation
  follows the stricter no-hidden-default boundary and records every local-to-
  canonical projection; runtime activation remains blocked until a controlled
  parameter and orchestration mapping is approved.
- J-06 contract input IDs `Qconv`, `Qrad`, `Qends`, `Qbridges`, `Qopenings`, and
  `control_volume` are absent from the controlled parameter registry, while
  `thermal.effective_length` declares J-06 as a consumer without being a J-06
  contract input. No alias is inferred. The isolated method preserves the
  contract IDs and keeps runtime activation blocked pending controlled
  dictionary alignment.
- B-06's frozen method `sourceRefs` spelling uses `FIG1`, while its contract
  source metadata uses `Fig1`. Both refer to the visually verified Wheeler
  Figure 1 / Equation (1) page and are preserved exactly in their respective
  mappings; code does not silently canonicalize one controlled source-ref
  string into the other.
- J-01 is a frozen parent family that still requires child-method splitting.
  The controlled GB8175 Equation 7 printed cumulative-diameter multilayer form
  conflicts with the adjacent-layer Fourier derivation and remains explicitly
  rejected as printed. The isolated implementation therefore exposes only
  constant-`k` single-layer and piecewise-constant adjacent-layer routes; it
  does not invent a child ID or activate the `k(T)` integration route.
- I-04 is likewise an unsplit parent. Its fixed-`h`, fixed-`k` screening
  identities are isolated, but nonlinear/radiative routing has no approved
  child ID. Historical project draft values `0.2` and `0.5` are not frozen
  applicability thresholds and are not encoded as such.
- C-01 has a denominator-semantics conflict that cannot be resolved by code.
  The Calculation Basis permits normalized relative differences and method
  spread only when a qualified Recommended method exists and makes that result
  the denominator. The Calculation Contracts instead define an optional,
  independent `reference_result` and use `L_reference` as the spread
  denominator; `ID-QA-01` requires only that this reference be explicit and
  nonzero. A case containing both a Recommended result and a different
  measurement/FEM/public reference therefore has two incompatible frozen
  answers, while a case with only the external reference has incompatible
  publication rules. C-01 remains unimplemented until a controlled revision
  chooses one denominator or defines two separately named metric families.
- B-07 has no approved, pinned offline complete-elliptic-integral provider in
  the dependency set, and the frozen files do not supply a Carlson/AGM
  implementation or termination rule that may be recreated from memory. The
  isolated method therefore implements only the `N=1` thin-solid-round self
  subchain. `N>=2` fails closed at an elliptic-provider release gate without a
  mutual-inductance partial sum; no dependency or solver was invented.
- J-07 is under-specified for implementation. The frozen files do not define
  the Biot characteristic-length geometry mapping, thermal-capacity meaning,
  the `h` used in `Bi`, a time/state-node schema, dependency evidence adapters,
  property-update/interpolation rules, or the constant/stepwise integration
  and analytical-check equation. Its primary textbook page is also still a
  source gate. J-07 therefore has no implementation rather than a guessed
  lumped-transient route.
- J-02's three named correlation equations and project domains are frozen in
  the Calculation Basis, but the CC75-V, CC75-H and CB77 primary papers have no
  controlled local copies, byte counts or SHA-256 records in
  `SOURCE_MANIFEST.csv`. Any isolated text-frozen implementation remains
  non-activatable and must not claim that the primary pages were locally
  rendered or release-pinned.
- A-01 cannot yet publish a generic property lookup from the frozen material
  schema. `MaterialPropertyRecord` has only independent-axis ranges and an
  arbitrary interpolation-method string: it lacks a dependent-value physical
  range/sign policy, registered interpolation ID/version, enforceable
  Curie/phase segment boundaries, complete conditional-state coordinates,
  node-specific uncertainty/propagation semantics, and mandatory ordered,
  unique table-node rules. The release registry correctly enforces approval,
  reviewed provenance and source hashes, but those gates do not define the
  missing interpolation semantics. `MAT-P-001/002` in the method contract also
  do not match `MAT-001/002` in the central validation file. A-01 therefore
  remains unimplemented rather than assuming all properties are positive,
  accepting arbitrary interpolation labels, or silently treating validation
  IDs as aliases.
- I-01 is not uniquely executable from the frozen interfaces. The Basis fixed-
  surface-temperature equation and the Contract requirement to solve the full
  surface balance over all roots/feasible intervals have no approved global
  scan or tangency-proof mapping. The thickness domain, solver tolerances,
  rounding increment/origin/stock set, candidate-geometry snapshot policy,
  multilayer thickness allocation, end/bridge result boundary, and J-01/J-02/
  J-03 per-candidate adapters are also not frozen. The single-bracket numerical
  primitive cannot be promoted into an all-domain feasibility proof, so I-01
  remains unimplemented.
- E-02 is explicitly material-data gated. No released material record supplies
  same-grade `rho(T)` and `mu_r(T,H,f,state)` data or Curie segmentation; A-01's
  lookup/interpolation schema is itself not executable. The parameter registry
  also lacks the contract's temperature-grid, field-state, dataset and scenario-
  band semantics, and no approved grid-refinement rule exists near Curie. The
  S89 source supports the need for temperature-dependent updates but its
  particular/average-steel fits are not a universal material curve. E-02
  therefore remains unimplemented and returns no cold-state or generic-Curie
  substitute.
- J-05 cannot safely publish a closed-annulus correlation result. RH75, DT69,
  Kuehn--Goldstein and ONWI have no controlled local primary copies/hashes in
  the manifest; a derived research note and unmanifested working PDF cannot
  replace them. The vertical-regime thresholds/boundaries, measured-gap
  residual and eccentricity acceptance, closure/end-continuity evidence, film-
  state gas-property adapter, heat-transfer area basis, and same-boundary J-03
  adapter are also not uniquely frozen. The unsplit parent has no approved
  child IDs or stable warning IDs, so J-05 remains unimplemented rather than
  guessing a concentric/closed geometry or importing a research-note formula.
- I-03 cannot safely combine unavailable I-01/I-02 results. The frozen files do
  not define a machine schema for feasible intervals or manufacturing set
  `F_M`, an approved upward-closed proof, rounding/stock rules, comparable
  snapshot/control-volume/end/bridge evidence, or dependency-failure priority.
  Consequently an empty intersection cannot be distinguished from an
  unresolved/non-converged dependency and `max(delta_T,delta_Q)` cannot be used
  without proof. I-03 remains unimplemented.
- A-02 has no pinned, offline IAPWS implementation or official-node validation
  package. `SOURCE_MANIFEST.csv` contains none of IAPWS-95/IF97, R12-08,
  R15-11 or SR6; the dependency lock contains no property provider. The unsplit
  parent has no approved model-selection/version child IDs, no adapter combining
  thermodynamic and transport releases at one state, no registered phase
  requirement, saturation-warning distance, or SR6 pressure window, and its
  parameter/validation IDs are incomplete. A-02 therefore remains unimplemented
  rather than recreating IAPWS equations, loading an unpinned library, or using
  constant room-temperature water properties.
- B-08's composite-Simpson numerical primitive is implemented, but the product
  method contract is not executable. There is no approved serializable
  `integrand_id` registry/parameter schema, input/output dimension envelope, or
  unit for absolute tolerance; the Contract does not expose the primitive's
  mandatory absolute/relative tolerances. Singular-endpoint transformations and
  a pinned Carlson/AGM/elliptic comparison provider are also absent, and
  `NUM-SIMP-002` has no authoritative validation implementation. B-08 therefore
  remains a non-product primitive rather than accepting a caller closure or
  hidden solver tolerance.
- I-02's surface-balance mathematics is frozen, but its product interface and
  all-root algorithm are not. The exactly-one heat-limit/area-basis and finite
  design-domain schemas, global scan/tangency proof, nested solver settings,
  candidate-geometry/property/surface adapters, total-control-volume end/bridge
  terms, and rounding/stock rules are absent. J-01/J-02/J-03/J-04 remain
  nonruntime, and the single-bracket primitive cannot prove all roots or no
  feasible interval in a non-monotonic domain. I-02 remains unimplemented and
  does not substitute the rejected printed comparison equation or a sidewall-
  only total.
- CODATA22 supports constants used by the isolated B-03, B-04, B-07, D-04,
  E-01, E-03, J-03, and J-04 routes, but a local release copy with access date
  and SHA-256 is still an open source gate. `SOURCE_MANIFEST.csv` currently has
  no CODATA22 entry. The numeric constants remain frozen as specified;
  dependent runtime release waits for the already-required local pin rather
  than replacing the source or calibrating the value.

The D-02 and C-01 items are controlled specification conflicts; the B-01,
E-01, E-03, D-06, and J-06
items are controlled contract/validation/dictionary mapping conflicts or gaps;
the B-04 and CODATA22 items are source-review release gates rather than formula
rewrites; B-06 retains two controlled source-ref spellings without treating
them as distinct equations; B-07, J-02 and J-07 retain provider/source/schema
gates; A-01 retains its material/interpolation-schema and validation-ID gates;
I-01 retains its domain/global-root/rounding/dependency-adapter gates;
E-02 retains its A-01/material-data/Curie-grid/scenario-band gates;
J-05 retains its primary-source/dispatcher/geometry/property/area/adaptor gates;
I-03 retains its dependency/feasible-set/upward-proof/rounding/status gates;
A-02 retains its local IAPWS/provider/official-node/child/state/schema gates;
B-08 retains its integrand/dimension/tolerance/transformation/provider gates;
I-02 retains its limit/area/domain/global-root/dependency/CV/rounding gates;
and J-01/I-04 retain their frozen parent-split and source/threshold gates without
invented child IDs. None changes the Technical Freeze identity, Gate 0 status,
52-method set, or approved-method allowlist. Each affected route remains
isolated and non-activatable. A controlled correction or new technical freeze
is required before the affected product route can be released.

## Conclusion and next phase

The initial verification found no conflict in the audited method IDs,
lifecycle statuses, formulas, source-manifest hashes, or release-gate
classification. With the later implementation-level discrepancies and source
cross-check recorded above and failure-closed, Gate 0 remains `PASS`, the
50-method v1 allowlist remains unambiguous, F-03/G-09 remain deferred, and
Foundation/independent Phase-2 work may proceed.
