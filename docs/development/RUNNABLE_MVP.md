# Runnable MVP Engineering Boundary

## Outcome

Version `0.9.0-beta.1` expands the locally runnable calculation application.
It has two deliberately isolated workflows:

- The three-file compatibility Basic Calculator provides 9 pages, 26 inputs,
  input-driven real-time calculation, three inductance families, lookup and
  integration details, skin-depth and electrical reverse calculations, copper
  loss and water-flow estimates, 22-result CSV, printing and input-only JSON.
- The Advanced Calculator lets users create/edit a Case, enter explicit evidence,
  run controlled evaluators, inspect results and warnings, save a canonical
  CaseFile and reopen it.

The Basic JSON contains no result and is not a canonical engineering Case.
Opening it restores only the 26 inputs and immediately recalculates. Basic never
reads or writes an Advanced Case, and Advanced never reads or overwrites a Basic
form.

The technical freeze for the Advanced controlled boundary remains
`IH-EC-V1-G0-2026-08-14-01`. No controlled formula, source, engineering threshold,
material value, warning ID, child method ID or Recommended decision was invented
for this milestone. Basic separately transcribes the user-supplied three-file
page's formulas, branch threshold and visible example defaults as compatibility
data; those values are not promoted into Advanced engineering evidence.

## Advanced callable adapter allowlist

- `B-02`: axial fill factor for a confirmed uniform identical single layer.
- `B-03`: air/uniform-linear ideal long-solenoid analytical limit, never a
  finite-coil Recommended method.
- `D-01`: cylindrical-helical conductor path length with explicit path segments.
- `D-03`: DC resistance with explicit same-state resistivity provenance.
- `D-04`: copper skin depth with explicit same-state resistivity and relative
  permeability evidence; no material default is supplied.
- `D-07`: same-port series R/L/I/f electrical parameters.
- `F-01`: estimated reflected input impedance, equivalent resistance and
  inductance from explicit same-state two-port R/L/M evidence.
- `H-01`: complete single-circuit cooling heat-load sum without design margin.
- `H-03`: one-branch flow velocity/hydraulic diameter with verified D-02 evidence.
- `J-03`: controlled gray-body radiation for the supported large-surroundings
  or long-concentric boundary with explicit geometry and surface evidence.

Each Advanced adapter calls the existing method evaluator and returns status, outputs,
units, warnings, assumptions, source references, applicability, limitations,
and failure action. A failed method never emits a placeholder numeric result.

## Case persistence

The current Advanced CaseSnapshot/CaseFile schema remains authoritative for
controlled engineering Cases. Advanced MVP input is
stored in one exact versioned provenance marker inside the content-addressed
CaseSnapshot. Load rejects ordinary cases, unknown marker versions, selection
version/approval/order drift, and any Case projection that cannot be reproduced
from the saved method inputs. Accessors are not executed at the workspace trust
boundary.

The Basic form instead uses its own exact versioned input-only schema. It rejects
unknown versions, missing or additional fields and invalid values before changing
the current form. Successful open restores inputs and triggers the same live
calculation used by direct editing; no stored result is trusted.

Generic Quantity arrays remain empty in this MVP because the UI does not yet
retain the user's original numeric representation and valid-digit intent.
Inventing a fixed valid-digit count would be false precision.

## Disabled Advanced/formal capabilities

The items below apply to the Advanced controlled boundary. The compatibility
Basic page may show a similarly named formula or arithmetic estimate, but that
does not activate the formal method, supply missing evidence or make a safety
recommendation.

- Formal runtime MethodRegistry activation remains 0/52.
- B-04/B-05 finite-coil inductance and other method families with child split,
  warning, property-provider, parameter-alignment, or validation gates remain
  disabled. B-03 became callable only after the official CODATA22 local source
  pin was completed; it remains an analytical limit. Basic Nagaoka/Wheeler
  comparisons and its `l/Dm=0.4` compatibility selection are separate.
- H-02 automatic coolant-flow sizing remains disabled because the approved
  A-02/IAPWS property provider and constant-property validity window are absent.
  Basic may calculate a water-flow estimate from user-entered constant density,
  heat capacity, temperature rise and margin, but it is not an OEM or safety
  sizing conclusion.
- Released material data and default material properties remain unavailable.
- Formal comparison/Recommended selection is unavailable; selected results are
  only displayed side by side with a boundary warning.
- The Phase-6 parametric mechanical 3D schematic and strict read-only FEM
  manifest/admission boundary are available. They do not contain a browser FEM
  solver or publish an imported field overlay.
- Formal CalculationResult trace, signed engineering report and independent
  clean-PC acceptance remain future evidence/work.

## Intended gate

`pnpm run verify:release:0.9` is the versioned automated test-release gate and
runs the existing complete `verify:mvp` chain. The final same-batch run passed
source verification, strict type checking, `77` Vitest files and `2927` tests,
four builds, artifact hashes and reproducibility checks. Both final UI artifacts
contain a hashed `V0_9_KNOWN_LIMITATIONS.md`. Manual browser and clean-PC evidence
remains separate and **PENDING** as defined in
`docs/development/PHASE_7_ACCEPTANCE.md`.
