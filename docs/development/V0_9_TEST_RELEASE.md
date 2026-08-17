# Version 0.9 Test Release Status

## Product outcome

The 0.9 milestone is a runnable browser test release with a Chinese-first public presentation layer, a guided basic calculator, controlled advanced calculations, local Case persistence, explicit applicability and warnings, a bounded parametric 3D/FEM interchange workspace, and Standard/Portable offline builds.

The user-facing product no longer exposes historical implementation-phase labels or internal method/decision/evidence identifiers. Those identifiers remain in source, controlled documents, saved engineering records and error diagnostics where they are necessary for reproducibility.

## Meaning of “phase complete”

Historical Phase 0–5 documents remain immutable evidence of what was closed at each boundary. They are not rewritten to imply that a missing primary source, property provider, validation case or material record exists.

For the 0.9 product milestone:

- the local interactive calculation loop is complete;
- Chinese-first public presentation and input help are complete;
- safe application adapters are released only for independently reviewed evaluator routes;
- Basic input-file save/reopen and Advanced canonical Case save/reopen are separate,
  tested workflows;
- the fresh automated release gate passed on 2026-08-17; browser smoke testing
  and independent clean-PC testing remain mandatory release evidence;
- blocked scientific routes remain fail-closed and are described as future engineering work rather than hidden or represented by placeholders.

This is the only interpretation consistent with `CALCULATION_BASIS.md`, `CALCULATION_CONTRACTS.md`, the Accepted ADR set, the Formula Source Register and the no-historical-calibration decision.

## Phase 0–7 status at the 0.9 test boundary

| Phase | Accurate current status | What this does not claim |
|---|---|---|
| Phase 0 — Freeze Verification | Complete | No controlled source, contract or safety gate was relaxed. |
| Phase 1 — Calculation Foundation | Complete | It did not activate calculation methods by itself. |
| Phase 2 — Low-coupling Calculation Modules | Complete at the frozen-evidence boundary | Partial or unimplemented routes remain closed; formal runtime activation remains 0/52. |
| Phase 3 — System Modules and Orchestration | Complete at the frozen-evidence boundary | Blocked integrated orchestration, automatic cooling sizing and deferred routes are not presented as available. |
| Phase 4 — Material Data and Comparison | Complete at the frozen-evidence boundary | The released material catalogue remains empty; numerical material comparison and automatic selection are unavailable. |
| Phase 5 — Desktop Engineering UI | Complete at the 0.9 test-UI implementation boundary | Full cross-browser, target-resolution, accessibility, performance and clean-PC acceptance are Phase-7 evidence. |
| Phase 6 — Parametric 3D and FEM Interchange Boundary | Complete at the bounded v1 geometry/reference boundary | No browser FEM solver, solver-native-file upload or imported-field overlay is claimed. |
| Phase 7 — Builds and Release Acceptance | Automated boundary complete; Phase overall in progress | The recorded automated gate does not replace local-browser or independent clean-PC evidence; both remain pending. |

“Complete at the frozen-evidence boundary” means every item has either an
implemented, tested route or an explicit fail-closed disposition. It does not
mean missing primary sources, property providers, validation data or product
contracts have been invented.

## Excel boundary

The attached early matching workbook was inspected as read-only research evidence. Its layout and user workflow inform the guided calculator and documentation. Historical constants, empirical coefficients, screenshot-derived results and mislabeled formulas do not enter runtime defaults, formula implementations, calibration targets or pass/fail fixtures.

## Release gate

The versioned automated gate is:

```powershell
pnpm run verify:release:0.9
```

This versioned command runs the complete `verify:mvp` chain. The 2026-08-17 run
passed source-manifest verification (`48/48`), strict type checking, all `2915`
tests in `76` test files, all four builds and artifact verification. A same-source
second build compared `16` delivery files with `changed=0`. Browser smoke testing
of the Basic calculation, Advanced calculation, Chinese display, tooltips, form
and Case save/reopen, CSV/print and 3D interaction is recorded separately.

## Remaining research gates

The following are not represented as 0.9 runtime capabilities until their actual evidence is present:

- released material and water-property providers;
- finite-coil Recommended selection with frozen source and warning policy;
- validated AC resistance and workpiece-load prediction chains;
- automatic coolant sizing, pump/network and boiling-safety conclusions;
- insulation-thickness global solve and manufacturing rounding;
- formal result trace/report signing, imported FEM field overlays and final independent clean-PC acceptance.

These gates do not prevent the 0.9 test release from being usable for the explicitly allowlisted calculations.
