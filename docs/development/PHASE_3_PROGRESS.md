# Phase 3 — System Modules and Orchestration Progress Record

## Record

| Field | Current value |
|---|---|
| Date | 2026-08-15 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Phase status | `complete_at_frozen_evidence_boundary` |
| Runtime methods newly activated | 0 |

This is an incremental engineering record, not a product-release claim. Phase 2
is complete at the current frozen-evidence boundary. Its unresolved source,
data, schema, child-method, warning, and validation gates remain closed and may
not be bypassed by Phase-3 orchestration.

## Controlled scope

Phase 3 covers the F, G, and H system methods and their case-level
orchestration. Series, parallel, transformer, measurement, energy, power, and
coolant control volumes remain explicit and independent. No topology or port is
silently converted into another one. Coupled iteration belongs in the
orchestration layer and must expose residuals and controlled termination status.

`F-03` and `G-09` remain `deferred`; they are not implementation candidates and
must not appear as ordinary product results. Historical calculations, archived
workbooks, screenshots, prototypes, and the prohibited historical cooling
figures remain excluded from inputs, defaults, calibration, validation, and
golden tests.

## Method disposition

| Method | Frozen approval | Current Phase-3 disposition | Runtime executable |
|---|---|---|---:|
| `F-01` | `approved_with_limitation` | isolated implementation; independent review PASS | no |
| `F-02` | `approved_with_limitation` | isolated safe measurement-identification subset; independent review PASS | no |
| `F-03` | `deferred` | disabled; no implementation | no |
| `G-01` | `approved` | no implementation; material/integration interface blocked | no |
| `G-02` | `approved` | isolated preferred explicit-enthalpy subset; independent review PASS | no |
| `G-03` | `approved_with_limitation` | no implementation; transient/lumped-model interface blocked | no |
| `G-04` | `approved` | isolated implementation; independent review PASS | no |
| `G-05` | `approved` | isolated implementation; independent review PASS | no |
| `G-06` | `approved` | isolated implementation; independent review PASS | no |
| `G-07` | `approved_with_limitation` | isolated implementation; independent review PASS | no |
| `G-08` | `approved_with_limitation` | isolated two-topology implementation; independent review PASS | no |
| `G-09` | `deferred` | disabled; no implementation | no |
| `G-10` | `approved_with_limitation` | isolated implementation; independent review PASS | no |
| `H-01` | `approved` | isolated base-control-volume implementation; independent review PASS | no |
| `H-02` | `approved_with_limitation` | no implementation; IAPWS/A-02 release gate open | no |
| `H-03` | `approved` | isolated implementation; independent review PASS | no |
| `H-04` | `approved_with_limitation` | text-frozen isolated implementation; independent review PASS | no |
| `H-05` | `approved_with_limitation` | isolated straight-pipe partial; independent review PASS | no |
| `H-06` | `approved_with_limitation` | isolated raw-screening partial; independent review PASS | no |
| `H-07` | `approved` | no implementation; A-02/result-evidence interface blocked | no |

## Current implementation wave

- `F-01`: controlled reflected-impedance algebra, passive coupled-circuit
  checks, and exact same-state evidence are implemented without deriving mutual
  inductance from geometry. Its independent review passed.
- `G-06`: single-phase/equivalent-port and explicitly balanced three-phase
  apparent-power routes are implemented with true power factor and one exact
  port/time basis. Known out-of-domain states, unknown states, same-boundary
  mismatches, measurement inconsistency, and binary64 resolution failures have
  distinct failure-closed dispositions; independent review passed.
- `G-07`: only the explicit lumped series-RLC topology is implemented.
  The rounded `PWR-SER-001` capacitance currently does not satisfy its stated
  `1e-12 ohm` imaginary-residual tolerance when substituted into the frozen
  equation; the implementation will preserve the actual residual and will not
  tune or clamp the formula to the fixture. Loaded/unloaded L substitution and
  its mixed-state priority were independently reviewed and pass.
- `G-08` implements the two separately frozen parallel-resonance topologies as
  internal routes of the non-executable parent. Arbitrary-frequency complex
  admittance and impedance remain available when a practical branch has no
  positive resonance root; resonance-only quantities then use an explicit
  `no_feasible_solution` discriminator. Branch voltage/current quantities are
  unavailable unless an exact same-port RMS-voltage record is supplied, and no
  1 V reference is invented. The rounded central fixtures retain their actual
  nonzero imaginary residuals. Independent formula, root, state, hostile-input,
  and wide-exponent numerical review passed.
- `G-10`: the ideal-transformer route is implemented with explicit ratio
  direction, winding polarity, compatible port basis, and non-ideal-effect
  exclusions. Full-enum validation, known non-ideal exclusions, and unknown
  evidence are ordered fail closed; independent review passed.
- `G-04`: the four named efficiency ratios retain their exact numerator and
  denominator boundaries. Missing inputs close only dependent outputs, while
  zero denominators, double counting, reactive-power substitution, and
  numerator-over-denominator uncertainty are handled without clamping or input
  adjustment; independent review passed.
- `F-02`: DHT supports the measurement scope but does not freeze covariance or
  uncertainty-propagation equations. The safe implementation consumes explicit
  precomputed expanded residual uncertainty and validates de-embedding evidence;
  it does not invent propagation or fixture-correction formulas. De-embedding
  and uncertainty evidence are bound to the same immutable measurement/raw
  artifact and derivation chain, and inconsistent reactive-uncertainty routes
  take priority over unknown waveform evidence; independent review passed.
- `H-01`: the base coolant-circuit heat-source sum is implemented from
  source-classified, globally de-duplicated paths. Known forbidden or overlapping
  sources take priority over unknown evidence, and even source-confirmed excluded
  paths retain unique identities. The optional `design_margin` has no frozen
  operator or coefficient, so a requested margin remains `insufficient_data`
  rather than receiving an invented multiplier; independent review passed.
- `H-03`: direct branch flow and explicitly confirmed equal-resistance split
  routes bind D-02 hydraulic geometry to the same branch, network, case, and
  geometry snapshot. Total flow is never silently assigned to one branch;
  independent review passed.
- `H-04` implements only three internal, non-registered routes for the frozen
  fully-developed laminar CWT/CWF constants and the stated Gnielinski formula.
  It consumes an explicit same-state property tuple and H-03 geometry evidence
  without claiming an executable A-02 result. The three primary copies and
  child-method IDs remain unpinned, and the `COOL-HT-001` rounded values differ
  from the frozen `1.82 log10(Re)` equation, so source, validation, and runtime
  activation gates remain closed. Independent review additionally required
  categorical applicability and unknown-state dispositions to precede unused
  machine arithmetic, bidirectional operand-swallow checks in the Re/Pr/h
  chain, and rejection of unknown-quality claimed H-03 evidence; those fixes
  are implemented and independently verified.
- `H-05` implements a non-activatable straight-round, single-branch,
  fixed-flow subset. Laminar `64/Re` and a caller-configured bracketed
  Colebrook solve are kept separate internal routes; transition flow, local
  loss and elevation terms without complete adapters, parallel-network flow,
  and pump work points remain unavailable. C39 and NIST local source pins and
  registered child IDs remain release gates. The consumed dynamic viscosity is
  mapped to canonical SI while the missing formal parameter ID is retained as a
  readiness gate. Network/reachability dispositions precede unused Reynolds
  arithmetic, and independent review passed.
- `H-06` implements only source-bound signed raw screening. Saturation margins
  require an externally precomputed `Tsat` at the same absolute-pressure local
  state, while NPSH comparison requires same-pump, flow, speed, liquid,
  definition, reference-plane and operating-point evidence. It does not derive
  IAPWS properties, wall temperature or NPSHA and never labels a positive margin
  safe. A known `Twi >= Tsat` single-phase exclusion precedes unknown
  interpretation and unused arithmetic. IAPWS Region 4, HI-961 and OEM/project
  safety thresholds remain release gates; independent review passed.
- `G-05` implements the three frozen control-volume stages with explicit
  conditional loss and efficiency evidence; source-confirmed not-applicable
  items are excluded without numeric placeholders, unknown items close only
  dependent downstream outputs, and efficiency coefficients retain both
  boundaries. Independent review found that complete `Pgrid` publication also
  needs a unique continuous directed boundary path from coil terminal to grid;
  that exact fail-closed chain proof is implemented without changing the
  frozen floating-point multiplication order and passed independent re-review.
- `G-02` implements only the contract-preferred steady explicit `hin/hout`
  route for one or more explicitly identified process streams. Each stream is
  bound to the same process control volume, case, process state, time window,
  reference state, and immutable source snapshots; ordered enthalpy
  subtraction, mass-flow multiplication, and multi-stream summation fail
  closed on binary64 resolution loss. The A-01/G-01 temperature/property
  integration alternative remains closed. The explicit route's status,
  provenance, hostile-input, and binary64 boundaries passed independent review;
  neither route is runtime-available.
- `G-01` remains unimplemented. Its first-law equation is frozen, but the
  required A-01 property query is not executable, the released material catalog
  is empty, and the parameter registry has no controlled batch mass, temperature
  interval, heat-capacity, phase/reaction-enthalpy, or energy-output records.
  The controlled files also do not yet define an executable temperature-table
  interpolation/integration adapter, explicit solver tolerances, the machine
  meaning of a narrow constant-`cp` domain, or a discriminated per-mass versus
  total phase/reaction-enthalpy schema with reference-state provenance. No
  generic heat capacity, hidden quadrature rule, or warning threshold is
  substituted.
- `G-03` remains unimplemented. The controlled files state the lumped first-law
  ODE but do not define a serializable time/state-node representation for
  `Pabs(T,t)`, `Qloss(T,t)`, and `Pphase(T)`, an interpolation/event/update rule,
  an approved integrator and complete solver-settings schema, or a separately
  identified constant-net-power product route. Its A-01/G-01 heat-capacity and
  enthalpy dependencies are not executable, while J-07 has no approved
  geometry-specific Biot acceptance threshold or dependency adapter. The
  unnumbered analytical comparison and blocked rise experiment do not supply
  those missing semantics, so no ODE method, tolerance, lumped-model decision,
  or phase/Curie step policy is invented.
- `H-02` remains unimplemented because its preferred product route requires
  same-state single-phase enthalpy and density from a fixed IAPWS release, while
  A-02 and its provider/child-selection/state adapter remain blocked and no
  IAPWS release or official-node package is locally pinned. The constant-`cp`
  path is permitted only as an explicit narrow-domain approximation, but no
  approved property window or approximation adapter exists. The synthetic
  `COOL-ENERGY-001` values test only the first-law identity and unit conversion;
  they are not promoted into default water properties, a project flow target,
  or a substitute for the missing provider.
- `H-07` remains unimplemented. A valid success requires A-02 enthalpy outputs
  for the same new measurement, circuit, control volume, state, and time window,
  but no approved A-02 provider, child method, version selection, or executable
  result chain currently exists. Accepting a caller-authored record that merely
  claims `sourceMethodId=A-02` would admit an impossible or forged upstream
  success that cannot be replayed. The formal H-01 result adapter and approved
  residual-uncertainty propagation are also not closed, so no synthetic
  enthalpy, automatic measurement adjustment, or historical flow/power value is
  substituted.
- `K` integrated orchestration remains unimplemented. Architecture and handoff
  documents allocate the cross-module loops to K, but no K method or child ID,
  registered contract/source/validation entry, serializable state/update plan,
  relaxation/residual/tolerance policy, typed A-J result adapter, energy-closure
  schema, aggregate status priority, or stable warning IDs are frozen. Existing
  scalar numerical primitives and arbitrary JSON solver settings cannot be
  promoted into a product orchestrator, and a caller callback or guessed
  tolerance is not substituted.

All Phase-3 implementations remain isolated and non-runtime until their formal
CalculationResult/trace/warning/version adapters and every recorded release gate
pass independent review.

## Verification evidence

At the latest completed checkpoint, strict TypeScript passes and the full Vitest
suite passes 55 files / 2736 tests. Focused results are F-01 78/78, F-02
110/110, G-02 91/91, G-04 58/58, G-06 96/96, G-07 105/105, G-08 97/97,
G-10 121/121, H-01 104/104, H-03 100/100, H-04 108/108, H-05 95/95, H-06
104/104, and G-05 98/98. The controlled source manifest passes 47/47; standard
static and portable-offline builds pass, and artifact verification confirms 129
matching public exports. No isolated method is exported by the current public
API.

An accidental `tsc -b` invocation had emitted 113 stale sibling `.js` files
beside the authoritative TypeScript under `src/` and `tests/`, causing `.js`
imports to resolve old code. Every emitted file had an exact `.ts` sibling; the
set was removed with the compiler's build-clean operation, and `noEmit: true`
is now explicit in `tsconfig.json`. Both the normal typecheck and build-mode
typecheck pass without recreating any sibling JavaScript files.

## Phase exit requirements

- every allowlisted F/G/H method is implemented in its frozen domain or has a
  precise failure-closed source/data/specification disposition;
- `F-03` and `G-09` remain disabled;
- topology, port, RMS/fundamental/full-wave, time-basis, control-volume, and
  measurement override provenance are explicit and versioned;
- conservation, passivity, convergence, non-convergence, no-feasible-solution,
  invalid-input, and insufficient-data branches are tested;
- coupled iterations expose solver settings, residuals, and termination status;
- strict typecheck, the full test suite, both builds, source hashes, offline
  policy, and artifact API parity pass.

Phase 3 is complete at the current frozen-evidence boundary. No runtime method
was activated, and every unimplemented or partial route above remains closed
until its recorded technical-freeze, source, data, provider, child-method, or
adapter gate is resolved.
