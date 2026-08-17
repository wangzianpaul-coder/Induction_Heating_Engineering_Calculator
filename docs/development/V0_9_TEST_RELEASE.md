# Version 0.9 Test Release Status

## Product outcome

The 0.9 milestone is a runnable browser test release with a Chinese-first public presentation layer, an isolated three-file compatibility Basic Calculator, controlled Advanced calculations, local persistence, explicit applicability and warnings, a bounded parametric 3D/FEM interchange workspace, and Standard/Portable offline builds.

The user-facing product no longer exposes historical implementation-phase labels or internal method/decision/evidence identifiers. Those identifiers remain in source, controlled documents, saved engineering records and error diagnostics where they are necessary for reproducibility.

## Meaning of “phase complete”

Historical Phase 0–5 documents preserve the evidence of what was closed at each boundary. Later
compatibility addenda may clarify which statements apply only to Advanced, but they do not imply
that a missing primary source, property provider, validation case or material record exists.

For the 0.9 product milestone:

- the local interactive calculation loop is complete;
- Chinese-first public presentation and input help are complete. The application shell and
  translated engineering pages can switch to English; the compatibility Basic page deliberately
  retains the supplied page's Chinese content and does not claim complete English translation;
- safe application adapters are released only for independently reviewed evaluator routes;
- Basic input-file save/reopen with immediate recalculation and Advanced canonical Case
  save/reopen are separate, tested workflows;
- the final same-batch automated gate passed `77` test files and `2927` tests on
  2026-08-17; browser smoke testing and independent clean-PC testing remain mandatory
  release evidence;
- blocked scientific routes remain fail-closed in the controlled Advanced boundary. A similarly
  named estimate in the compatibility Basic page does not activate or validate that Advanced route.

This is the only interpretation consistent with `CALCULATION_BASIS.md`, `CALCULATION_CONTRACTS.md`, the Accepted ADR set, the Formula Source Register and the no-historical-calibration decision.

## Phase 0–7 status at the 0.9 test boundary

| Phase | Accurate current status | What this does not claim |
|---|---|---|
| Phase 0 — Freeze Verification | Complete | No controlled source, contract or safety gate was relaxed. |
| Phase 1 — Calculation Foundation | Complete | It did not activate calculation methods by itself. |
| Phase 2 — Low-coupling Calculation Modules | Complete at the frozen-evidence boundary | Partial or unimplemented Advanced routes remain closed; formal runtime activation remains 0/52. Compatibility Basic formulas are a separate boundary. |
| Phase 3 — System Modules and Orchestration | Complete at the frozen-evidence boundary | Blocked Advanced orchestration, automatic cooling safety sizing and deferred controlled routes are not presented as available. |
| Phase 4 — Material Data and Comparison | Complete at the frozen-evidence boundary | The released material catalogue remains empty; numerical material comparison and automatic selection are unavailable. |
| Phase 5 — Desktop Engineering UI | Complete at the 0.9 test-UI implementation boundary | Full cross-browser, target-resolution, accessibility, performance and clean-PC acceptance are Phase-7 evidence. |
| Phase 6 — Parametric 3D and FEM Interchange Boundary | Complete at the bounded v1 geometry/reference boundary | No browser FEM solver, solver-native-file upload or imported-field overlay is claimed. |
| Phase 7 — Builds and Release Acceptance | Automated boundary complete; Phase overall in progress | The recorded automated gate does not replace local-browser or independent clean-PC evidence; both remain pending. |

“Complete at the frozen-evidence boundary” means every item has either an
implemented, tested route or an explicit fail-closed disposition. It does not
mean missing primary sources, property providers, validation data or product
contracts have been invented.

## Excel boundary

The attached early matching workbook was inspected as read-only research evidence. Its layout and
user workflow informed the product. The separately supplied three-file web calculator is reproduced
inside an isolated compatibility Basic boundary, including its visible example defaults, empirical
inputs, branch behavior and regression outputs. Those compatibility values do not enter Advanced
Case records, controlled evaluator defaults, method activation, scientific calibration targets or
validation fixtures. Workbook cache values, screenshots and historical software outputs remain
prohibited as evidence for controlled engineering correctness.

## Release gate

The versioned automated gate is:

```powershell
pnpm run verify:release:0.9
```

This versioned command runs the complete `verify:mvp` chain. The final 2026-08-17
same-batch run passed source-manifest verification, strict type checking, all `2927`
tests in `77` test files, all four builds, artifact verification and the same-source
reproducibility check. The resulting two UI manifest hashes are recorded in
`PHASE_7_ACCEPTANCE.md`; pre-integration hashes are not reused. Browser smoke testing of the
9-page/26-input Basic calculation, Advanced calculation, Chinese-first language boundary,
tooltips, Basic form and Advanced Case save/reopen, 22-row Basic CSV/print and 3D interaction is
recorded separately and remains **PENDING**.

## Remaining research gates

The following are not represented as controlled **Advanced** runtime capabilities until their
actual evidence is present. Compatibility estimates with similar names remain isolated and are not
formal activation:

- released material and water-property providers;
- finite-coil Recommended selection with frozen source and warning policy;
- validated AC resistance and workpiece-load prediction chains;
- automatic coolant sizing, pump/network and boiling-safety conclusions;
- insulation-thickness global solve and manufacturing rounding;
- formal result trace/report signing, imported FEM field overlays and final independent clean-PC acceptance.

These gates do not prevent the 0.9 test release from being usable for the explicitly allowlisted calculations.
