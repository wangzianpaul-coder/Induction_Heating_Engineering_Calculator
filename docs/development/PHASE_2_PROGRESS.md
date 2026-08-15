# Phase 2 — Low-coupling Calculation Modules Progress Record

## Record

| Field | Current value |
|---|---|
| Date | 2026-08-15 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Phase status | `complete_at_frozen_evidence_boundary` |
| Runtime methods newly activated | 0 |

This is the Phase-2 implementation and release-gate disposition record at the
current frozen evidence boundary, not a product-release claim. All 32 Phase-2
method IDs have an explicit disposition: 16 have complete isolated
implementations, 6 have only the independently safe partial routes permitted by
the frozen evidence, and 10 remain unimplemented behind documented
specification, source, data, or provider gates. The frozen runtime registry
remains failure-closed; no Phase-2 method is product-executable.

## Implemented scope

### A methods

`A-01` remains unimplemented because the current material-property record does
not yet close the frozen lookup contract. It lacks dependent-value physical
range/sign metadata, a versioned interpolation registry, enforceable Curie or
phase segments, complete conditional-state coordinates, ordered/unique table-
node constraints, and an approved uncertainty-propagation rule. The release
registry's approval/provenance/hash checks are valid but do not supply those
scientific semantics; the central `MAT-001/002` labels also do not match the
method-contract `MAT-P-001/002` labels. No generic positivity assumption,
interpolation default, validation alias, or first material record was invented.

`A-02` remains unimplemented because no IAPWS-95/IF97, R12-08, R15-11 or SR6
release and official validation-node package is locally pinned in the source
manifest or dependency lock. The unsplit parent also lacks approved model-
selection/version child IDs, a thermodynamic/transport same-state adapter, a
registered phase requirement, a saturation-warning predicate, and a numeric
SR6 pressure window. No IAPWS equation or constant room-temperature water
property is recreated as a substitute.

### Numerical foundation

`ID-NUM-01` implements composite Simpson evaluation on the mandatory `n`, `2n`,
and `4n` grids. The caller must supply both tolerance components; the primitive
has no hidden solver tolerance. Nested grids reuse evaluations and report exact
counts. A non-converged calculation returns only failure/solver diagnostics and
refinement residuals, never the last integral estimate as a result.

The same controlled numerical boundary also provides bracketed bisection with
an explicit sign-changing bracket, residual tolerance, bracket-width tolerance,
and iteration limit. Convergence requires both tolerances unless an exact zero
is evaluated. Invalid brackets, exhausted binary64 midpoint resolution, and
iteration exhaustion are distinct outcomes; none exposes a last candidate
root. Endpoint candidates are selected only from the retained final bracket,
including adjacent-binary64 endpoint cases.

The B-08 product method is not activated. Its controlled `integrand_id`
dispatch, unit envelope, formal CalculationResult/trace adapter, and
NUM-SIMP-002 authoritative-library comparison remain required. The product
contract also lacks the primitive's mandatory absolute/relative tolerance
inputs and the unit/dimension of absolute tolerance; no caller closure, hidden
tolerance, singular-endpoint transformation, or unpinned elliptic provider is
used to fill those gaps.

### B methods

- `B-01` normalizes the frozen single-layer geometry without merging `D_i`,
  `D_o`, `D_m`, or `D_c`. Mechanical `D_o` remains an explicit required input;
  `D_c:=D_m` is available only through the warning-bearing ADR-0003 route with
  provenance. `N`, `N_rev`, turn-centre coordinates, centre-to-centre span, and
  mechanical envelope remain separate concepts. Real measured redundant
  identities stay non-activatable until a controlled combined-uncertainty rule
  exists; `TOL-ID` is used only for exact algebraic/synthetic identities.
- `B-02` implements `k_fill_axial=N*d_ax/b_env` in canonical SI with explicit
  ADR-0003 envelope semantics. The frozen TOL-ID rule is used only to normalize
  a binary64 identity at the exact `k=1` boundary; it is not an engineering or
  solver tolerance.
- `B-03` implements the ideal long-solenoid analytical limit with the frozen
  `mu0=1.25663706127e-6 H/m`, explicit air or uniform-linear medium, and
  `analytical_limit_check` purpose. It remains limit-only and not Recommended;
  no aspect-ratio threshold or permeability default is invented.
- `B-04` implements the L85 Equations 9--12 two-branch finite-current-sheet
  result, the N09 long-solenoid base, and the frozen CODATA22 permeability.
  `D_c`, `b_env`, and `N` must match the same content-addressed B-01 geometry
  snapshot. The `2a=b` branch comparison uses only the registered
  `EM-L-BRANCH-001` relative limit of `3e-6`. L85 Table 1 is retained as a
  release cross-check and never substituted for the Equation 11--12
  polynomials.
- `B-05` implements Wheeler 1928 Equation (2) through its original inch and
  microhenry boundary, then returns canonical SI. It binds `D_c`, `b_env`, and
  `N` to one content-addressed B-01 snapshot. Equation (3) remains
  reference-only, the result is a quick comparison rather than Recommended,
  and no few-turn, pitch, or conductor-thickness threshold is invented.
- `B-06` implements Wheeler 1928 Figure 1, Equation (1) only for independent
  multilayer geometry `a_ml`, `b_ml`, `c_ml`, total electrical turns `N`, and
  physical layer count `N_layer`. It never derives those values from `D_c`,
  `D_m`, or a single conductor dimension. The source's approximately-one-
  percent statement is exposed only from content-addressed categorical shape
  evidence; no numeric interpretation of "about equal" is created. The
  registry `FIG1` and contract-metadata `Fig1` source-ref spellings remain
  separately exact rather than being silently normalized.
- `B-07` implements only the frozen `N=1` thin-solid-round, uniform-current
  winding self-inductance subchain with complete content-addressed geometry and
  conductor-state evidence. The `N>=2` mutual-inductance route remains
  `insufficient_data`: no approved, pinned offline complete-elliptic-integral
  provider or frozen Carlson/AGM implementation and termination policy exists.
  It publishes no mutual-inductance partial sum and invents no provider, child
  method, conductor-ratio threshold, or CGS-to-SI rule.

### C methods

`C-01` remains unimplemented because the controlled denominator semantics
conflict. The Calculation Basis permits normalized relative differences and
spread only when a qualified Recommended result exists and uses that result as
the denominator; the Calculation Contracts and `ID-QA-01` instead define an
independent `reference_result`/`L_reference`. A case with both a Recommended
result and a different measurement/FEM reference therefore has two incompatible
answers, while a reference-only case has incompatible publication rules. No
denominator is selected silently and no duplicate metric family is invented.

### D methods

- `D-01` calculates the mechanical/CAD conductor center path from `D_m`,
  `N_rev`, and actual endpoint axial advance, with leads and busbars kept as
  distinct contributions. Unknown lead/bus length produces a marked known-path
  lower bound; it is never replaced by zero.
- `D-02` calculates round-section metal and hydraulic geometry. Solid round
  publishes only metal area; unavailable hydraulic outputs have no numeric,
  unit, or dimension placeholder. A real controlled-enum discrepancy is open:
  the method contract uses `solid_rect/hollow_rect`, while the engineering
  parameter dictionary uses `solid_rectangular/hollow_rectangular/custom`.
  Rectangular/custom paths therefore fail closed with
  `D-02.specification_conflict`; no mapping or formula was invented.
- `D-03` calculates uniform-path DC resistance `rho*l/A`, then adds only
  explicit, sourced, de-duplicated series terms. If those terms are explicitly
  unresolved, the independently supported conductor resistance is retained and
  the terminal/extra aggregate is unavailable without placeholders. Sparse
  hostile arrays and binary64-swallowed positive additions fail closed.
- `D-04` calculates copper electromagnetic skin depth from the controlled
  canonical-SI equation and explicit same-state copper property evidence. It
  does not reinterpret electromagnetic penetration depth as thermal depth.
- `D-05` isolates the frozen strong-skin round-conductor screening and same-
  state measurement-identification routes under the unsplit parent ID. The
  screening route enforces `r_o/delta>=10`, hollow-wall
  `t_wall/delta>=3`, outer-surface-only current, isolated/uniform field,
  negligible proximity, and a known return path. The measurement route binds
  case, geometry, material, frequency, temperature, load, port, reference
  plane, de-embedding, raw-data hash, uncertainty, and calibration record.
  Neither internal route is represented as an approved child ID; no `Fprox`,
  Kelvin/Bessel, or proximity correction is invented. A purported successful
  D-02 hollow-section dependency must also reproduce the frozen metal-area and
  hydraulic-area/wetted-perimeter/Dh binary64 chain; an impossible upstream
  success cannot enter through the measurement route.
- `D-06` calculates average DC current density and copper loss using explicit
  RMS conventions and exact same-state AC-resistance evidence. Current,
  resistance, and effective-area evidence bind current basis, coil temperature,
  geometry snapshot, frequency, port, reference plane, and loaded state.
  Resistance evidence also requires explicit producer-owned de-embedding and
  copper-loss-boundary confirmation. Effective current density is published
  only from a successful same-state D-05 effective area; otherwise it is
  unavailable without placeholders. Circular back-calculation from the same
  copper loss is rejected. The parameter dictionary currently omits D-06 from
  `frequency.consumingMethods` while including D-06 for coil mean temperature,
  so this method remains non-activatable.
- `D-07` calculates the controlled series-port quantities `XL`, complex and
  magnitude impedance, `Qs`, `UR`, `UX`, and terminal voltage for an explicit
  same-state series-equivalent port. When `R=0`, Q is unavailable while other
  valid outputs remain. `U≈IωL` is diagnostic only and has no invented
  applicability threshold.

### E methods

- `E-01` calculates workpiece electromagnetic skin depth from explicit,
  same-state resistivity and permeability properties. Both properties must
  share the same content-addressed material snapshot, revision, temperature,
  field, frequency, and phase; workpiece geometry has its own content-addressed
  snapshot. Thickness/skin-depth and radius/skin-depth ratios are unavailable
  without placeholders when their geometry is absent. No numeric "few skin
  depths" threshold is invented. A real validation-name discrepancy among the
  Basis, Contracts/registry, and central validation document is recorded and
  blocks activation.
- `E-02` remains unimplemented because its frozen release gate is open. There
  is no approved same-grade `rho(T)` plus `mu_r(T,H,f,state)` material package,
  Curie segmentation, scenario-band schema, or executable A-01 query. The
  released material catalog is empty and the parameter registry does not define
  the contract's temperature-grid/field-state/dataset aggregates. The S89
  source is retained only as model-scope evidence; its particular/average-steel
  fits are not copied into a generic material curve.
- `E-03` implements two explicit frozen routes: `Pi_D=D/(2*delta_E01)` and the
  historical `Pi_D=2` reference relation
  `f_ref=16*rho/(pi*mu0*mu_r*D^2)`. The criterion must be explicitly selected;
  the nominal value is never inserted as a hidden default. Geometry, material,
  temperature, field, frequency, phase, property provenance, and the E-01
  dependency are snapshot-bound. M04's controlled engineering-unit label
  conflict is handled only through the frozen SI disposition; printed rounded
  coefficients are identity checks, not calculation constants.

### I methods

`I-01` remains unimplemented. The frozen files do not uniquely define its
finite thickness-domain schema, global all-root/all-feasible-interval search,
tangential-root proof, solver tolerances, rounding increment/origin/stock set,
candidate-geometry snapshots, or per-candidate J-01/J-02/J-03 adapters. A
single sign-changing bracket cannot prove the required full feasible set, and
the code does not assume monotonicity or invent a scan grid.

`I-02` remains unimplemented for the same all-domain proof boundary and further
unclosed inputs: the exactly-one heat-limit/area-basis schema, finite design
domain, non-monotonic/tangential-root scan, nested solver settings, candidate
geometry/property/surface snapshots, total-control-volume end/bridge paths, and
rounding/stock rules. The rejected printed comparison equation is not used, and
a sidewall heat rate is not relabelled as total heat loss.

`I-03` also remains unimplemented. I-01/I-02 have no executable typed result
adapters, and the frozen files do not define the feasible-interval/`F_M` schema,
an upward-closed proof, rounding/stock rules, comparable boundary/snapshot
evidence, or dependency-failure priority. An unresolved/non-converged dependency
is never relabelled as an empty feasible intersection, and
`max(delta_T,delta_Q)` is not used without the required proof.

- `I-04` implements only the frozen fixed-`h`, fixed-`k` cylindrical screening
  quantities: `delta/ri`, the same-inner-area cylindrical/plane-wall resistance
  ratio, and `rcrit=k/h`. It does not encode the historical project draft
  values `0.2` or `0.5` as thresholds, does not replace the I-01/I-02 root
  solvers, and does not treat the critical-radius screen as an exact nonlinear
  result. Nonlinear radiation/variable-property routing remains explicitly
  unavailable because the frozen parent requires a child-method split and no
  approved child IDs exist.

### J methods

- `J-01` implements constant-`k` single-layer and piecewise-constant multilayer
  cylindrical radial conduction. Multilayer resistance uses each adjacent
  radius pair, preserves signed heat flow, and reports internal interface
  temperatures. The printed GB8175 Equation 7 cumulative-diameter form remains
  `rejected_as_printed` provenance and is never used as the calculation source.
  The `k(T)` integration/interface route remains `insufficient_data` pending an
  approved child method/property adapter; no child ID is invented.
- `J-02` isolates the three text-frozen routes for the Churchill--Chu vertical
  plate, Churchill--Chu horizontal cylinder, and Churchill--Bernstein cylinder
  crossflow correlations. Each route binds film-state properties, geometry,
  area, surface, boundary, and control volume in canonical SI and enforces only
  the frozen characteristic lengths and correlation domains. The three primary
  papers are not present in `references/` or `SOURCE_MANIFEST.csv`; source-copy
  hash and controlled access date therefore remain explicitly null and the
  parent remains non-activatable. No child ID, warning ID, mixed-convection,
  tilt, array, shielding, or fixed-`h` rule is invented.
- `J-03` implements gray-body radiation to large surroundings and the full
  long-concentric-two-surface resistance network. It uses absolute kelvin,
  explicit area and configuration evidence, content-addressed geometry and
  material provenance, stable fourth-power differencing, and preserves heat-
  flow direction. Any non-FEM field interpretation remains outside this
  method.
- `J-04` implements the current-state linearized radiation coefficient and
  `h_s=h_c+h_r` only for the same surface area and boundary. It accepts only the
  J-03 large-surroundings route; a concentric two-gray-surface network factor is
  never substituted for one emissivity. Equal temperatures use the exact
  derivative limit `4*epsilon*sigma*T^3`, with no temperature-difference
  threshold.
- `J-05` remains unimplemented. Its RH75/DT69/Kuehn--Goldstein/ONWI primary
  sources are not locally pinned in the controlled manifest, and the frozen
  interfaces do not uniquely close the vertical dispatcher, measured-gap/
  eccentricity acceptance, closure/end continuity, film-state property
  adapter, heat-transfer area basis, or same-boundary J-03 evidence. A derived
  research note or unmanifested working PDF is not used as a formula source.
- `J-06` aggregates five explicitly classified, non-overlapping ambient-loss
  paths on one steady-state control volume. A path that is source-confirmed
  absent is not applicable; an applicable unresolved path makes
  `Qloss_total` explicitly unavailable while `missing_items` and `boundary`
  remain available. No known subtotal or unknown-as-zero value is published as
  the total.
- `J-07` remains unimplemented because the frozen files do not define the Biot
  characteristic-length geometry mapping, thermal-capacity meaning, `h` used
  in `Bi`, time/state-node schema, dependency evidence adapters, property-update
  rules, or constant/stepwise integration and analytical-check equation. Its
  primary textbook source is also still a release gate; no universal Biot
  threshold or constant-loss fraction is inserted.

All isolated inputs pass an exact plain-data trust boundary that rejects extra
or missing keys, accessors, hostile proxies/enumerations, sparse arrays, and
non-finite values without invoking coercion. Overflow, false-zero underflow,
swallowed nonzero terms, and positive-subnormal derived multiplicative terms
that can contaminate a later normal result fail closed rather than publishing a
plausible but materially corrupted value. Where `2**-1022` is used for that
purpose, it is recorded as machine representability only and is never an
engineering tolerance or applicability threshold.

## Method IDs and activation state

| Method / primitive | Frozen approval | Isolated implementation | Runtime executable | Remaining activation gate |
|---|---|---:|---:|---|
| `A-01` | `approved` | no | no | material value-range/segment/interpolation/uncertainty schema, validation-ID reconciliation, approved dataset |
| `A-02` | `approved_with_limitation` | no | no | local pinned IAPWS providers/releases, official nodes, child selection/version, phase/saturation/SR6 and parameter mappings |
| `ID-NUM-01` | numerical source primitives | Simpson and bracketed bisection | n/a | B-08 controlled dispatch/adapter/NUM-SIMP-002; caller-specific root scanning/classification |
| `B-01` | `approved` | yes | no | GEO-001 input/contract reconciliation, measured-identity uncertainty rule, stable warning IDs, formal adapter |
| `B-02` | `approved` | yes | no | formal snapshot/result/trace/warning adapter |
| `B-03` | `approved_with_limitation` | yes | no | CODATA22 local pin and formal snapshot/result/trace/warning adapter |
| `B-04` | `approved_with_limitation` | yes | no | CODATA22 local pin, EM-L-003 source/table release cross-check, stable warning policy, formal adapter |
| `B-05` | `approved_with_limitation` | yes | no | stable warning/trigger policy and formal adapter |
| `B-06` | `approved_with_limitation` | yes | no | independent multilayer snapshot adapter, stable warning policy, recommendation router |
| `B-07` | `approved_with_limitation` | partial `N=1` self route | no | CODATA22 local pin, pinned approved elliptic provider, CGS/SI release normalization, child split, EM-L-004, parameter mapping |
| `B-08` | `approved` | no product route; numerical primitive only | no | controlled integrand/dimension/tolerance dispatch, singular transformations, NUM-SIMP-002 provider and formal adapter |
| `C-01` | `approved` | no | no | controlled choice of Recommended vs external-reference denominator, or separately named metric families |
| `D-01` | `approved` | yes | no | formal adapter and controlled warning publication |
| `D-02` | `approved` | partial, round only | no | controlled shape-enum conflict must be resolved |
| `D-03` | `approved` | yes | no | formal adapter and controlled warning publication |
| `D-04` | `approved_with_limitation` | yes | no | CODATA22 local pin and formal snapshot/result/trace/warning adapter |
| `D-05` | `approved_with_limitation` | partial screening/measurement routes under parent | no | approved child IDs, validation-ID and parameter alignment, EXP-RAC execution, stable warnings, formal adapter |
| `D-06` | `approved` | yes | no | parameter-dictionary conflict, D-05 evidence route, formal adapter |
| `D-07` | `approved` | yes | no | formal adapter and controlled warning publication |
| `E-01` | `approved_with_limitation` | yes | no | CODATA22 local pin, validation-ID naming conflict, material-data route, formal adapter |
| `E-02` | `approved_with_limitation` | no | no | A-01 schema, approved same-state material curves/Curie segments, grid/scenario semantics, parameter mapping |
| `E-03` | `approved_with_limitation` | yes | no | parameter-ID mapping closure, CODATA22 local pin, frequency-state orchestration, formal adapter |
| `I-01` | `approved_with_limitation` | no | no | finite-domain/global-root/rounding rules, candidate snapshots, J-01/J-02/J-03 adapters, validation cases |
| `I-02` | `approved_with_limitation` | no | no | heat-limit/area/domain schema, all-root/tangency algorithm, solver settings, candidate dependency snapshots, total CV, rounding and validation |
| `I-03` | `approved_with_limitation` | no | no | executable I-01/I-02 adapters, feasible-set/F_M schema, upward-closed proof, rounding and dependency-status policy |
| `I-04` | `approved_with_limitation` | partial fixed-`h`/fixed-`k` routes | no | approved child IDs, nonlinear child/property adapter, stable warning policy, parameter-dictionary alignment |
| `J-01` | `approved` | partial constant/piecewise-constant `k` routes | no | approved child IDs, `k(T)` property/integration adapter, stable warning policy, formal result/trace adapter |
| `J-02` | `approved_with_limitation` | partial text-frozen correlation routes | no | local primary-source pins, approved child IDs, film-property/geometry parameter mapping, stable warning policy |
| `J-03` | `approved` | yes | no | formal surface/material adapter, stable warning policy, CODATA22 local pin |
| `J-04` | `approved_with_limitation` | yes | no | formal J-02/J-03 adapter, stable warning policy, CODATA22 local pin |
| `J-05` | `approved_with_limitation` | no | no | local primary-source pins, dispatcher/domain closure, gap/eccentricity policy, gas-property/area/J-03 adapters, child IDs |
| `J-06` | `approved` | yes | no | parameter-dictionary alignment, primary-unavailable presentation adapter, stable warning policy |
| `J-07` | `approved_with_limitation` | no | no | Lc/capacity/h/time-state/dependency/update/integration schemas and primary textbook source |

No approval status, `implementationAvailable`, or `executable` registry flag was
changed by this increment. Deferred F-03/G-09 remain disabled. D-05 remains an
unsplit parent family and cannot publish a successful runtime result.

## Tests

Focused isolated suites contain:

- `ID-NUM-01` composite Simpson: 25 tests;
- `ID-NUM-01` bracketed bisection: 25 tests;
- `B-01`: 33 tests;
- `B-02`: 18 tests;
- `B-03`: 31 tests;
- `B-04`: 35 tests;
- `B-05`: 50 tests;
- `B-06`: 88 tests;
- `B-07`: 48 tests;
- `D-01`: 34 tests;
- `D-02`: 29 tests;
- `D-03`: 43 tests;
- `D-04`: 17 tests;
- `D-05`: 128 tests;
- `D-06`: 60 tests;
- `D-07`: 38 tests;
- `E-01`: 70 tests;
- `E-03`: 61 tests;
- `I-04`: 85 tests;
- `J-01`: 29 tests;
- `J-02`: 81 tests;
- `J-03`: 61 tests;
- `J-04`: 90 tests;
- `J-06`: 74 tests.

The current full repository gate is 41 test files and 1371 passing tests. Strict
TypeScript, the 47-file controlled-source audit, Standard and Portable builds,
artifact inventory/byte/SHA-256 verification, offline-policy checks, Portable
IIFE execution, and 129-export Standard/Portable API parity also pass.

Tests cover contract/source/validation mapping, canonical-SI equations,
dimensional scaling, analytical limits, explicit zero boundaries, invalid and
insufficient inputs, non-applicable regimes, missing evidence, unavailable
output discrimination, overflow/underflow, numeric resolution, immutable
outputs, hostile object graphs, and absence of runtime/public activation.

## Failure-closed branches

- Simpson invalid grids/tolerances, endpoint or interior non-finite values,
  integrand exceptions, unrepresentable grids, arithmetic overflow, and
  non-convergence never publish a candidate integral as a result.
- Bracketed bisection rejects malformed tolerances, non-finite evaluations,
  same-sign endpoints, lost sign brackets, iteration exhaustion, and exhausted
  binary64 midpoint resolution without publishing a last candidate. A caller,
  rather than the primitive, distinguishes a searched physical interval with
  no root from numerical non-convergence.
- B-02 rejects overlap, invalid geometry, ambiguous envelope semantics, and
  multilayer/mixed-section use; B-03 rejects unsupported purpose, nonlinear or
  unknown media, and the single-turn current-sheet route.
- B-01 rejects missing mechanical `D_o`, inconsistent exact identities,
  guessed mechanical/current-path semantics, guessed `N_rev`, measured
  identities without a controlled uncertainty comparison, and any snapshot
  evidence mismatch. B-04 rejects single-turn/zero-envelope use, unsupported
  geometry evidence, any `D_c`/`b_env`/`N` snapshot mismatch, and an
  unrepresentable or failed branch-point comparison.
- B-05 rejects wrong radius/diameter or source-unit mapping, detached geometry
  evidence, forbidden Equation-(3) routing, repeated finite-length correction,
  and unrepresentable source-unit arithmetic, including finite outputs polluted
  by positive-subnormal source-unit intermediates. B-06 rejects single-layer,
  inferred-layer, single-conductor-build, single-layer-radius, nonuniform, or
  non-Figure-1 routing; its source accuracy statement cannot be forced or
  derived from an invented numeric ratio threshold. B-07 rejects detached turn
  geometry, unsupported conductor/current distributions, intersection,
  unconfirmed winding-only boundaries, and every multi-turn route while the
  elliptic-provider/source-normalization gate remains open; it never publishes
  a mutual partial sum.
- D-01 rejects `D_c` substitution, guessed `N_rev`, guessed axial advance,
  non-circular/multilayer routing, and unknown path geometry.
- D-02 rejects invalid or under-resolved round geometry, positive-subnormal
  metal/hydraulic calculation chains, and all unresolved
  rectangular/custom enumerations; it never guesses a hole, wall thickness, or
  rectangular mapping.
- D-03 rejects nonuniform path assumptions, material/state mismatch, duplicate
  or unsourced extras, malformed boundaries, and numerically swallowed positive
  resistance contributions.
- D-04 rejects missing/mismatched property state, non-copper or unsupported EM
  regimes, and non-physical inputs.
- D-05 rejects unsupported shapes or field/current regimes, failed strong-skin
  ratios, unknown return paths, proximity-sensitive screening, detached D-01
  through D-04 evidence, and every measurement state/port/de-embedding/raw-data
  mismatch. Measurement-derived effective area is unavailable without a
  numeric/unit placeholder rather than inferred from the measured resistance.
- D-06 rejects peak/full-wave values presented as RMS, any same-state mismatch,
  malformed geometry hashes, unconfirmed or loaded-port total resistance
  boundaries, mismatched or unapproved AC-resistance evidence, circular
  provenance, and invalid D-05 effective-area evidence. A physical `Rac=0`
  remains a valid zero-loss result; positive unrepresentable arithmetic fails
  closed.
- D-07 rejects port/reference-plane/loaded-state/frequency/RMS mismatches and
  never interprets coil-port voltage as grid or resonant-tank voltage.
- E-01 rejects material snapshot/revision/state/property-source mismatches,
  unsupported nonlinear or thermal interpretations, malformed geometry
  evidence, and non-physical or numerically unrepresentable inputs.
- E-02 does not substitute a cold-state constant, generic 700/760-degree Curie
  value, average-steel fit, invented temperature-grid density, or averaged
  low/nominal/high scenario while its data/schema gate is open.
- E-03 rejects omitted or implicit criteria, thin-wall/non-solid/nonlinear or
  optimization interpretations, cold or state-mismatched properties, detached
  E-01 frequency/depth evidence, and unit-constant mixing. Known
  non-applicability takes precedence over unrelated unknown evidence; only a
  genuinely unconfirmed applicable predicate returns insufficient data.
- C-01 does not normalize by an arbitrarily selected Recommended or external
  reference, and it never treats agreement between methods as independent
  validation while the controlled denominator conflict remains unresolved.
- I-04 rejects nonlinear/variable-property use, hidden screening thresholds,
  detached fixed-`h`/fixed-`k` evidence, and any attempt to substitute screening
  for an I-01/I-02 solution. J-01 rejects the printed cumulative-diameter
  multilayer form, non-adjacent or discontinuous layers, mixed snapshots/states,
  unsupported `k(T)` publication, swallowed layer resistance, and
  unrepresentable signed heat/interface-temperature arithmetic.
- J-02 rejects arbitrary tilt, mixed convection, arrays, shielding, unsupported
  characteristic lengths, detached film-property state, geometry/area/control-
  volume mismatch, and every correlation-domain violation. Missing local
  primary-source pins remain an activation gate and are never represented by a
  fabricated hash or visual-review claim.
- J-05 does not substitute a bare diameter difference for one-sided gap, assume
  zero eccentricity, treat an open/discrete coil as a closed continuous annulus,
  use water temperature as copper surface temperature, or import a research-
  note correlation while its source/dispatcher/geometry adapters are open.
- J-07 does not invent a Biot threshold, characteristic length, constant thermal
  mass, state interpolation, integration tolerance, or time-invariant end/
  bridge loss while its transient schema and source gate remain open.
- J-03 rejects Celsius fourth powers, missing view/configuration evidence,
  detached emissivity state, unsupported openings/end effects, and
  unrepresentable fourth-power or radiation-coefficient arithmetic, including
  a positive subnormal coefficient magnified into a plausible normal heat rate.
  J-04 independently rejects such contaminated upstream J-03 evidence before
  identity checks. J-04 also rejects concentric-network
  substitution, different surface/area/boundary/state dependencies, 0/0 or
  stale-evidence paths, and a positive `h_c` or `h_r` term swallowed during
  addition. J-06 rejects duplicate/overlapping or series paths, pickup mixed
  with ambient loss, boundary/time/snapshot mismatch, and unknown losses
  represented by zero; unresolved applicable paths never publish a total.

No failed branch uses zero, NaN, a hidden default, or the last iteration as a
replacement result.

## Documentation changes

- this progress record;
- the implementation plan current-scope update;
- the Phase-0 post-verification controlled-discrepancy addendum;
- refreshed Phase-1 regression/build evidence.

The controlled engineering baseline, ADRs, source register, validation cases,
source copies, and evidence files were not edited.

## Remaining feature and data gates

- formal MethodRuntime registration and snapshot-to-method adapters;
- full CalculationResult, trace-DAG, solver-report, version, source, and output
  dimension mapping for every activated method;
- controlled stable warning records for warning-bearing D-method branches; the
  current frozen warning-ID catalog contains no new IDs for those prose
  predicates, so IDs are not invented in code;
- controlled A-01 material-property value ranges, state/phase segments,
  interpolation IDs and versions, table-order/uniqueness rules, uncertainty
  propagation, `MAT-P-001/002` validation mapping, and the first reviewed
  approved dataset;
- local read-only IAPWS-95/IF97, R12-08, R15-11 and optional SR6 releases with
  exact versions/hashes and official-node tests, plus approved A-02 child/model
  selection, same-state thermodynamic/transport adapter, phase/saturation/SR6
  policies and parameter mappings;
- controlled resolution of the D-02 shape-enum discrepancy before any D-02
  runtime activation, including rectangular/custom routes;
- controlled reconciliation of the B-01 mechanical-`D_o` contract with the
  GEO-001 input fixture, plus a real-measurement identity uncertainty rule and
  stable warning IDs;
- completion of the B-04 `EM-L-003` L85 Table-1/equation release cross-check and
  a controlled warning policy without invented few-turn/pitch/thickness
  thresholds;
- a local controlled CODATA22 release copy with exact version, access date,
  bytes, and SHA-256 before B-03, B-04, B-07, D-04, E-01, E-03, J-03, or J-04
  can be activated;
- controlled B-05 warning triggers without invented few-turn, pitch, or
  conductor-thickness thresholds;
- an independent B-06 multilayer snapshot adapter, stable warning policy, and
  controlled multilayer recommendation router; the exact `FIG1`/`Fig1`
  source-ref spellings must remain traceable;
- an approved, pinned offline complete-elliptic-integral provider and frozen
  CGS-to-SI/child-method release mapping before B-07 can execute multi-turn
  mutual-inductance summation;
- controlled reconciliation of the D-06 parameter-dictionary consuming-method
  declarations;
- controlled reconciliation of E-01 validation labels `E-SKIN-001`,
  `EM-S-004`/`EM-S-003`, and `ELEC-SKIN-001` before aliasing or activation;
- A-01 completion plus approved same-grade `rho(T)` and
  `mu_r(T,H,f,state)` curves, Curie/phase segments, temperature-grid generation
  and scenario-band provenance before E-02 can be implemented;
- controlled reconciliation of E-03 contract-local parameter names with the
  canonical parameter registry, explicit criterion orchestration, same-state
  frequency resolution, and a local pinned CODATA22 source copy;
- local controlled copies, access dates, byte counts, and SHA-256 records for
  CC75-V, CC75-H, and CB77, plus approved J-02 child IDs and film-property/
  geometry parameter adapters; formal J-02/J-03/J-04 surface-result adapters
  and a local pinned CODATA22 source copy are also required before dependent
  combined-surface routes are activated;
- controlled local RH75/DT69/Kuehn--Goldstein/ONWI sources plus an approved
  J-05 child dispatcher, measured-gap residual/uncertainty and eccentricity
  criteria, closure/end-continuity evidence, gas film-state property mapping,
  heat-transfer area basis, and same-boundary J-03 adapter;
- approved child method IDs and formal property/result/trace adapters for the
  J-01 `k(T)` route and I-04 nonlinear screening route; fixed-route isolation
  code does not activate either unsplit parent;
- a frozen I-01 design-domain schema, all-root/all-feasible-interval search and
  tangency-proof policy, solver settings, rounding/stock semantics, provisional
  candidate snapshots, end/bridge result boundary, and per-candidate J-01/J-02/
  J-03 adapters;
- an I-02 exactly-one heat-limit and area-basis schema, finite domain, global
  root/tangency proof and nested solver settings, provisional dependency
  snapshots, complete total-loss control volume, rounding/stock rules and
  executable validation cases;
- executable I-01/I-02 result adapters plus a controlled I-03 feasible-set and
  manufacturing-set schema, upward-closed evidence, rounding rules, comparable
  boundary/snapshot records, and dependency failure-status priority;
- controlled alignment of J-06 contract input IDs with the parameter registry,
  plus an approved UI/report adapter for a primary unavailable total with
  available missing-item and boundary outputs;
- approved B-08 integrand registry/parameter schema, input/output dimensions,
  absolute-tolerance unit, explicit solver tolerance fields, singular-endpoint
  transformation IDs, NUM-SIMP-002 authoritative provider/comparison and formal
  result/trace adapter;
- a controlled C-01 decision choosing the normalized-metric denominator or
  defining separate Recommended-reference and external-reference metric names;
- central and method-level validation execution required by each method;
- released material records for material-dependent methods;
- D-05 controlled child-method split, validation-ID/parameter alignment,
  stable warning policy, formal adapter, and execution of the EXP-RAC
  measurement protocol;
- J-07 characteristic-length and thermal-capacity semantics, `h` selection,
  time/state/dependency schemas, property-update/interpolation and integration
  rules, analytical-check equation, and local primary textbook source;
- preset material, project data, measurement/FEM, and Deferred gates remain
  closed where applicable.

## Next phase

Proceed to Phase 3 system modules and orchestration for independent allowlisted
F, G, and H methods. Phase-2 methods remain non-executable until each method's
complete snapshot, result, trace, source, warning, validation, and version
boundary passes independent review. A Phase-2 method may resume only when its
recorded controlled gate is closed; Phase 3 must not infer, alias, or substitute
the missing Phase-2 evidence.
