# Phase 5 — Runnable Engineering UI Progress Record

## Record

| Field | Current value |
|---|---|
| Date | 2026-08-17 |
| Technical Freeze ID | `IH-EC-V1-G0-2026-08-14-01` |
| Gate 0 | `PASS` |
| Application version | `0.3.0-mvp.1` |
| Phase status | `complete_at_phase_5b_runnable_mvp_boundary` |
| Frozen method specifications / formal executable | 52 / 0 |
| Controlled Runnable MVP adapters | 8 |
| Canonical parameter definitions | 67 |
| Released material records | 0 |

## Completed in Phase 5B

- React Calculator is the default page.
- New/reset, local edit, Calculate, canonical JSON save and reopen are available.
- Results retain units, status, warnings, applicability, limitations,
  assumptions, source references, and failure actions.
- `B-02`, `B-03`, `D-01`, `D-03`, `D-07`, `F-01`, `H-01`, and `H-03` are callable only through
  the controlled application adapter.
- Simplified Chinese is the default interface language, with an explicit
  Chinese/English switch and larger desktop/body typography.
- B-03 uses the locally pinned official CODATA22 source and remains a
  warning-bearing analytical limit; F-01 remains an estimated, non-Recommended
  reflected-impedance calculation.
- Saved Case input is content-addressed and reproducible; hostile accessors,
  method-selection drift, and projection drift fail closed.
- Standard and Portable artifacts carry scope `phase_5b_runnable_mvp_ui` and
  pass manifest/hash/offline/module-policy verification.
- The existing Parameters, Method Readiness, Case Inspector and About pages
  remain available. Disabled destinations still show exact reasons.

## Preserved boundaries

- Formal method-registry flags are unchanged; this milestone is not a blanket
  method activation or a final release claim.
- No default engineering value or released material was added.
- Formal normalized method comparison/Recommended selection remains blocked.
- No formal CalculationResult trace/report or 3D/FEM viewer is claimed.
- Final clean-PC packaging, broad accessibility/performance acceptance and
  Phase-7 release sign-off remain pending.

## Verification

The intended automated gate is `pnpm run verify:mvp`. Detailed build checks are
documented in `PHASE_5_UI_BUILD.md`; runtime capability and disabled reasons are
documented in `RUNNABLE_MVP.md`.
