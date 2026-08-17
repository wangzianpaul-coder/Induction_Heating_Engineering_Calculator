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

- The Chinese guided Basic Calculator is the default page; the evidence-rich
  Advanced Calculator remains available as a separate workspace.
- New/reset, local edit, Calculate, canonical JSON save and reopen are available.
- Results retain units, status, warnings, applicability, limitations,
  assumptions, source references, and failure actions.
- `B-02`, `B-03`, `D-01`, `D-03`, `D-04`, `D-07`, `F-01`, `H-01`, `H-03`,
  and `J-03` are callable only through the controlled application adapter.
- Simplified Chinese is the default interface language, with an explicit
  Chinese/English switch and larger desktop/body typography.
- B-03 uses the locally pinned official CODATA22 source and remains a
  warning-bearing analytical limit; F-01 remains an estimated, non-Recommended
  reflected-impedance calculation.
- Saved Case input is content-addressed and reproducible; hostile accessors,
  method-selection drift, and projection drift fail closed.
- Standard and Portable artifacts carry scope `v0_9_test_release_ui`; the fresh
  Phase-7 automated gate passed their same-batch
  manifest/hash/offline/module-policy verification on 2026-08-17.
- Every editable engineering parameter in the Basic, Advanced-method and 3D
  forms has Chinese-first plain-language help describing what it is, how to
  obtain it and what it affects.
- Ordinary UI hides internal method/decision/evidence identifiers, hashes and
  snapshot references; necessary technical codes are available only on errors.
- Basic input files, Advanced canonical Cases, result CSV and print-ready output
  are available without formula duplication in UI code.
- The existing Parameters, Calculation Guide, Case Inspector and About pages
  remain available with public, user-readable presentation data.

## Preserved boundaries

- Formal method-registry flags are unchanged; this milestone is not a blanket
  method activation or a final release claim.
- No default engineering value or released material was added.
- Formal normalized method comparison/Recommended selection remains blocked.
- No formal CalculationResult trace/report or browser FEM solver is claimed.
- Broad browser accessibility/performance checks and independent clean-PC
  acceptance remain Phase-7 evidence gates.

## Verification

The intended automated gate is `pnpm run verify:release:0.9`. Detailed build checks are
documented in `PHASE_5_UI_BUILD.md`; runtime capability and disabled reasons are
documented in `RUNNABLE_MVP.md`.
