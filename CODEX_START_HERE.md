# Codex Start Here

> Gate 0: **PASS**  
> Technical freeze ID: `IH-EC-V1-G0-2026-08-14-01`  
> Current turn: documentation only; no code in this turn  
> Next stage: **Ready for Codex implementation** under the frozen allowlist  
> Copy-ready execution brief: [CODEX_IMPLEMENTATION_PROMPT.md](CODEX_IMPLEMENTATION_PROMPT.md)

## 1. Start rule

Read [GATE_0_REVIEW.md](GATE_0_REVIEW.md) first. In the next development stage:

- implement only `approved` or `approved_with_limitation` methods;
- enforce every stated domain, warning and failure predicate;
- keep `deferred`, `insufficient_evidence` and `reference_only` branches disabled;
- let missing material, OEM, measurement or FEM data block only the dependent result;
- never fill a gap with a hidden default, historical coefficient or screenshot-derived fit.

Gate 0 does not certify an actual machine as safe. Do not redo Gate 0 unless a frozen parameter meaning, formula, topology, applicability range, Recommended rule or failure status changes.

## 2. Read order

1. [GATE_0_REVIEW.md](GATE_0_REVIEW.md) — PASS decision, release gates and authorization boundary
2. [docs/decisions/V1_DECISION_REGISTER.md](docs/decisions/V1_DECISION_REGISTER.md) — 15 accepted decisions
3. [CALCULATION_BASIS.md](CALCULATION_BASIS.md) and [CALCULATION_CONTRACTS.md](CALCULATION_CONTRACTS.md) — formulas and 52 method contracts
4. [APPLICATION_ARCHITECTURE.md](APPLICATION_ARCHITECTURE.md), [HANDOFF_TO_CODEX.md](HANDOFF_TO_CODEX.md) and [CODEX_IMPLEMENTATION_PROMPT.md](CODEX_IMPLEMENTATION_PROMPT.md) — layers, A–L ownership, product/distribution requirements, execution roadmap and DoD
5. [docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md](docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md) — SI parameters and geometry semantics
6. [docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md](docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md) — ports, RMS phasors and independent topologies
7. [docs/METHOD_STATUS_DICTIONARY.md](docs/METHOD_STATUS_DICTIONARY.md) and [data/materials/MATERIAL_DATA_MODEL.md](data/materials/MATERIAL_DATA_MODEL.md) — controlled enums and three-tier materials
8. [validation/protocols/MINIMUM_VALIDATION_PLAN.md](validation/protocols/MINIMUM_VALIDATION_PLAN.md) and [docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md](docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md) — validation, sealed holdout, 3D/FEM interchange
9. [FORMULA_SOURCE_REGISTER.md](FORMULA_SOURCE_REGISTER.md), [docs/derivations/V1_CONTROLLED_DERIVATIONS.md](docs/derivations/V1_CONTROLLED_DERIVATIONS.md), [VALIDATION_CASES.md](VALIDATION_CASES.md) and [PROJECT_AUDIT.md](PROJECT_AUDIT.md) — traceability, controlled derivations, checks and historical findings

`working/` and archive/history explain investigations only; they do not override controlled specifications.

## 3. Source-of-truth order

1. User decisions and Accepted ADRs
2. Approved Calculation Basis and Contracts
3. Frozen parameter/material/method/topology/status dictionaries and controlled primary sources
4. Approved validation protocols, immutable data and signed results
5. Architecture and handoff documents
6. Audit/history/working material

Resolve same-level conflicts by ADR/spec revision or fail closed; never choose silently.

## 4. Next-stage implementation scope

- Foundation first: canonical SI Quantity, registries, warning/status engine, immutable snapshots, trace and tests.
- Keep formulas in pure method/domain code, never in UI, import mapping or reports.
- Implement A–L from the detailed handoff; the outer orchestrator owns electro-thermal and cooling iterations.
- Use material tiers `preset_common | project_material | user_defined` and provide Material Comparison without silent averaging.
- Register `method_type=empirical_calibrated` only for new project calibration data with an explicit domain and independent validation.
- Use `approval_status=approved_with_limitation`; do not recreate legacy aliases.
- Validation data roles use the frozen enum `development | calibration | validation | sealed_holdout | external_validation | audit_only`; history is always `audit_only`.
- Keep Series RLC, both Parallel LC forms and the ideal transformer as separate v1 models. Any future topology-bound LLC must also be separate, but G-09/LLC remains `deferred` in this freeze and is not implemented.
- Parameter definitions come from the registry; 3D consumes the canonical GeometrySnapshot and must not invent fields.
- FEM is an external import/reference path with manifest, units, coordinates, mesh, boundary, convergence and energy evidence.
- Deliver both a Standard Static Web Build and a self-contained Portable Offline Build that works from `file://` on an offline Windows PC without Node.js, Python, a server or development tools.
- Treat 1920×1080 as the primary professional desktop workspace; also verify 1366×768 and 2560×1440.
- Provide JSON case exchange, result export, application/model/material versioning and clean-PC portable acceptance evidence.

## 5. Feature/data release gates

These do not block the approved foundation or unrelated methods:

- property-level source review before publishing preset material data;
- project material before project-specific high-confidence claims;
- OEM/project limits before safety labels for cooling or thermal margins;
- measurement/FEM before elevating actual-machine Req/Leq, proximity-dominated Rac, hot spots or complex open-annulus flow;
- a newly acquired `sealed_holdout` before promotion of an `empirical_calibrated` model;
- local version-pinned source copies before a release build.

## 6. Hard prohibitions

- No screenshot reproduction, black-box calibration, historical residual or legacy-software mode in runtime, UI, registry, tests or validation narrative.
- No historical 783 kW/135 L/min cooling pair as input, calibration or validation.
- No universal geometry-only coupling, general LLC, open/discrete/eccentric annulus, two-phase cooling or browser FEM under v1 unless a later ADR approves it.
- No topology, port, RMS/peak, material state, unit or safety assumption by guesswork.
- No ordinary number when status is out of domain, insufficient data, non-converged or blocked.

## 7. Handoff DoD

Before calling a development increment complete:

- freeze ID and method version are recorded;
- inputs/outputs use registered SI parameter IDs;
- equations, assumptions, domain, warnings, dependencies and source refs match the contract;
- validation status uses the frozen enum (`specified`, `blocked`, `executed_pass`, and related approved values);
- domain and failure tests pass, and result precision reflects uncertainty;
- saved cases reproduce with pinned schema/material/method versions;
- no product dependency on screenshots, old chats, workbooks or working files exists.
- both standard-static and portable-offline build requirements and their release tests are satisfied for a release increment.

Start the next development task at Foundation, not with an empty UI shell.
