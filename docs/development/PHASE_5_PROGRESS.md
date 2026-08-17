# Phase 5 — Runnable Engineering UI Progress Record

## Record

| Field | Current value |
|---|---|
| Date | 2026-08-17 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Application version | `0.9.0-beta.1` |
| Phase status | `complete_at_v0_9_test_ui_boundary` |
| Frozen method specifications / formal executable | 52 / 0 |
| Controlled Runnable MVP adapters | 10 |
| Canonical parameter definitions | 67 |
| Released material records | 0 |

## Completed for the 0.9 test UI boundary

- The Chinese three-file compatibility Basic Calculator is the default page;
  the evidence-rich Advanced Calculator remains available as a separate,
  non-interoperable workspace.
- Basic provides 9 pages, 26 inputs, input-driven real-time calculation, default
  restore, input-only JSON save/reopen, 22-result CSV and printing. Opening a
  Basic form restores only inputs and immediately recalculates every result.
- Advanced provides new/reset, local edit, explicit Calculate, canonical Case
  JSON save and reopen. Its results retain units, status, warnings,
  applicability, limitations, assumptions, source references and failure actions.
- `B-02`, `B-03`, `D-01`, `D-03`, `D-04`, `D-07`, `F-01`, `H-01`, `H-03`,
  and `J-03` are callable only through the controlled application adapter.
- Simplified Chinese is the default interface language, with an explicit
  Chinese/English switch for the application shell and translated engineering
  pages plus larger desktop/body typography. The compatibility Basic page
  retains the supplied page's Chinese content and does not claim full English.
- B-03 uses the locally pinned official CODATA22 source and remains a
  warning-bearing analytical limit; F-01 remains an estimated, non-Recommended
  reflected-impedance calculation.
- Saved Case input is content-addressed and reproducible; hostile accessors,
  method-selection drift, and projection drift fail closed.
- Standard and Portable artifacts carry scope `v0_9_test_release_ui`. The final
  same-batch gate passed `77` test files and `2927` tests plus
  manifest/hash/offline/module-policy and reproducibility verification, as
  recorded in `PHASE_7_ACCEPTANCE.md`.
- Every editable engineering parameter in the Basic, Advanced-method and 3D
  forms has Chinese-first plain-language help describing what it is, how to
  obtain it and what it affects.
- Ordinary UI hides internal method/decision/evidence identifiers, hashes and
  snapshot references; necessary technical codes are available only on errors.
- Basic input files and Advanced canonical Cases use separate schemas and never
  read or overwrite one another. Result CSV and print-ready output are available
  without formula duplication in UI code.
- The existing Parameters, Calculation Guide, Case Inspector and About pages
  remain available with public, user-readable presentation data.

## Preserved boundaries

- Formal method-registry flags are unchanged; this milestone is not a blanket
  method activation or a final release claim.
- No default engineering value or released material was added to the Advanced
  controlled boundary. Basic deliberately exposes the supplied three-file
  page's editable example defaults solely for compatibility and demonstration;
  they do not enter Advanced Cases, calibration or validation.
- Formal normalized method comparison/Recommended selection remains blocked.
- No formal CalculationResult trace/report or browser FEM solver is claimed.
- Broad browser accessibility/performance checks and independent clean-PC
  acceptance remain Phase-7 evidence gates.

## Verification

The automated gate is `pnpm run verify:release:0.9`. Its final same-batch run passed
`77` files and `2927` tests together with the complete source, type, build, artifact
and reproducibility checks. Detailed build evidence is recorded in
`PHASE_7_ACCEPTANCE.md`; manual browser and clean-PC evidence remains **PENDING**.
Runtime capability and disabled reasons are documented in `RUNNABLE_MVP.md`.
