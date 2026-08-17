# Runnable MVP Engineering Boundary

## Outcome

Version `0.3.0-mvp.1` expands the locally runnable calculation application.
Users can create/edit a Case, enter explicit inputs, run controlled evaluators,
inspect results and warnings, save a canonical CaseFile, and reopen it.

The technical freeze remains `IH-EC-V1-G0-2026-08-14-01`. No formula, source,
engineering threshold, material value, warning ID, child method ID, or
Recommended decision was invented for this milestone.

## Callable adapter allowlist

- `B-02`: axial fill factor for a confirmed uniform identical single layer.
- `B-03`: air/uniform-linear ideal long-solenoid analytical limit, never a
  finite-coil Recommended method.
- `D-01`: cylindrical-helical conductor path length with explicit path segments.
- `D-03`: DC resistance with explicit same-state resistivity provenance.
- `D-07`: same-port series R/L/I/f electrical parameters.
- `F-01`: estimated reflected input impedance, equivalent resistance and
  inductance from explicit same-state two-port R/L/M evidence.
- `H-01`: complete single-circuit cooling heat-load sum without design margin.
- `H-03`: one-branch flow velocity/hydraulic diameter with verified D-02 evidence.

Each adapter calls the existing method evaluator and returns status, outputs,
units, warnings, assumptions, source references, applicability, limitations,
and failure action. A failed method never emits a placeholder numeric result.

## Case persistence

The current CaseSnapshot/CaseFile schema remains authoritative. MVP input is
stored in one exact versioned provenance marker inside the content-addressed
CaseSnapshot. Load rejects ordinary cases, unknown marker versions, selection
version/approval/order drift, and any Case projection that cannot be reproduced
from the saved method inputs. Accessors are not executed at the workspace trust
boundary.

Generic Quantity arrays remain empty in this MVP because the UI does not yet
retain the user's original numeric representation and valid-digit intent.
Inventing a fixed valid-digit count would be false precision.

## Disabled capabilities

- Formal runtime MethodRegistry activation remains 0/52.
- B-04/B-05 finite-coil inductance and other method families with child split,
  warning, property-provider, parameter-alignment, or validation gates remain
  disabled. B-03 became callable only after the official CODATA22 local source
  pin was completed; it remains an analytical limit.
- H-02 automatic coolant-flow sizing remains disabled because the approved
  A-02/IAPWS property provider and constant-property validity window are absent.
- Released material data and default material properties remain unavailable.
- Formal comparison/Recommended selection is unavailable; selected results are
  only displayed side by side with a boundary warning.
- Formal CalculationResult trace, report, 3D/FEM and final product acceptance
  remain future work.

## Intended gate

`pnpm run verify:mvp` is the automated Runnable MVP gate. It is intentionally
different from a final engineering-product release gate.
