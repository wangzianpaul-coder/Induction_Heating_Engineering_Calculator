# v1 Controlled SI Derivations

> Technical freeze ID: `IH-EC-V1-G0-2026-08-14-01`  
> Role: auditable algebra for project-derived equations. Primary empirical correlations remain traceable to `FORMULA_SOURCE_REGISTER.md`; this file does not replace their source papers.

## ID-DATA-01 — In-envelope tabular interpolation

For two ordered data nodes `(x_i,y_i)` and `(x_{i+1},y_{i+1})`, with `x_i <= x <= x_{i+1}`:

`y(x)=y_i+(y_{i+1}-y_i)(x-x_i)/(x_{i+1}-x_i)`.

The data package, not this identity, determines whether the independent variable may be temperature, pressure, frequency or field. Duplicate or unordered nodes are `invalid_input`. Outside the approved data envelope the default is `insufficient_data`; an explicitly approved extrapolation policy must use a separate method/version and warning.

## ID-GEO-01 — Uniform single-layer geometry

For conductor radial size `d_rad`, axial size `d_ax`, centre pitch `p` and `N` electrical turns:

`D_o=D_i+2d_rad`, `D_m=(D_i+D_o)/2=D_i+d_rad`.

The first-to-last centre span contains `N-1` pitch intervals:

`b_cc=(N-1)p`, `b_env=b_cc+d_ax`, `g=p-d_ax`.

These are mechanical envelope identities. `D_c` is not used to reconstruct a mechanical conductor path.

## ID-GEO-02 — Helical conductor centre-path length

Unwrapping a uniform helix on the mechanical/CAD conductor centre-path diameter `D_m` gives a right triangle whose circumferential travel is `pi D_m N_rev` and whose actual axial advance is `delta_z_helix`. Therefore:

`l_helix=sqrt[(pi D_m N_rev)^2+delta_z_helix^2]`.

Add `lead_length` and other reference-plane segments explicitly. This derivation proves why `Np`, `b_cc`, `b_env` and the path axial advance cannot be interchanged.

## ID-GEO-03 — Conductor and hydraulic cross-sections

For declared mechanical dimensions in SI:

- solid round: `A_metal=pi d_o^2/4`;
- round tube: `A_metal=pi(d_o^2-d_i^2)/4`, `A_h=pi d_i^2/4`;
- solid rectangle: `A_metal=w h`;
- rectangular tube with explicit inner width/height: `A_metal=w_o h_o-w_i h_i`, `A_h=w_i h_i`.

For any internal channel with wetted perimeter `P_wetted`, `D_h=4A_h/P_wetted`. Invalid or non-positive inner dimensions are rejected; no wall-thickness convention is inferred from an ambiguous field.

## ID-OHM-01 — DC resistance

For uniform temperature, material and metal cross-section:

`R_dc(T)=rho_e(T) ell/A_metal`.

For a spatially varying path, the controlled generalization is `R_dc=integral_path[rho_e(T(s))/A_metal(s)] ds`. Contact, braze, busbar and lead resistances are separate segments unless explicitly included in the integration.

## ID-OHM-02 — Current density and conductor loss

The average RMS current density based on a declared effective metal area is `J_rms=I_rms/A_effective`. With a resistance referenced to the same frequency, temperature, geometry and port:

`P_Cu=I_rms^2 R_ac,used`.

`R_ac,used` may be an approved estimate or a same-state measurement; the two provenances remain distinct. Peak current must not be inserted into the RMS loss identity without the corresponding waveform integration.

## ID-EM-01 — Skin depth and reference-frequency scenario

For a linear good conductor with phasor convention and negligible displacement current, the diffusion wavenumber is `gamma=(1+j)/delta`, where:

`delta=sqrt[2/(omega mu sigma)]=sqrt[rho/(pi f mu0 mu_r)]`.

With the explicitly chosen design scenario `D/(2delta)=2`, so `delta=D/4`:

`f_ref=16rho/(pi mu0 mu_r D^2)`.

This is a reference penetration ratio, not an optimum-frequency theorem. All implementation values are SI; engineering-unit forms are UI-boundary conversions only.

For a locally planar strong-skin surface, surface resistance `R_s=rho/delta`. With participating perimeter `P_eff` and length `l`:

`Rac_surface=R_s l/P_eff=rho l/(delta P_eff)`.

For the approved isolated round screening case `P_eff=2pi r_o`. It is invalid when the declared surface, curvature, wall-thickness or proximity conditions fail.

## ID-Z-01 — Passive reflected impedance

For coupled linear windings with secondary `Z_2=R_2+jomega L_2`, elimination of the secondary current gives:

`Z_ref=omega^2 M^2/Z_2`.

Multiplying by the complex conjugate:

`R_ref=omega^2 M^2 R_2/[R_2^2+(omega L_2)^2]`,

`X_ref=-omega^3 M^2 L_2/[R_2^2+(omega L_2)^2]`.

Therefore `R_eq=R_1+R_ref` and

`L_eq=L_1-omega^2 M^2 L_2/[R_2^2+(omega L_2)^2]`.

The algebra is approved when `M` (or `k`), `R_2` and `L_2` have explicit provenance. It does not derive those values from arbitrary geometry.

## ID-MEAS-01 — Port impedance identification

For a sinusoidal RMS port:

`|Z|=V/I`, `R_eq=P/I^2`.

If reactive sign/phase is known and measurement uncertainty permits:

`X=sign(X)sqrt[(V/I)^2-R_eq^2]`, `L_eq=X/omega` for an inductive port.

Without phase/reactive information, only `R_eq` is identifiable. A materially negative radicand is `inconsistent_measurement`, not a value to fix with an absolute-value operation.

## ID-AC-01 — Single-port AC quantities

For RMS phasors at one declared reference plane:

`Z=R+jX`, `X_L=omega L`, `|Z|=sqrt(R^2+X^2)`, `V=IZ`, and `Q_L=X_L/R` when that series quality-factor definition is applicable. The approximation `|V| approx I omega L` is permitted only when the resistive and other reactive terms are demonstrably negligible.

## ID-AC-02 — Apparent power and power factor

Single-phase RMS definitions are `S_complex=V I* =P+jQ`, `|S|=V_rms I_rms`, and `PF=P/|S|`. For a balanced three-phase system using line-to-line voltage and line current, `|S|=sqrt(3)V_LL I_L`. Topology, phase count, RMS convention and reference plane are mandatory; these identities do not predict converter efficiency or distortion power factor.

## ID-RLC-01 — Series resonance topology

Series RLC:

`Z_s=R_s+j(omega L-1/(omega C))`; hence `omega_0=1/sqrt(LC)`.

## ID-RLC-02 — Parallel resonance topologies

Ideal `R_p||L||C`:

`Y=1/R_p+j(omega C-1/(omega L))`; hence `omega_0=1/sqrt(LC)`.

Practical `(R_s+jomega L)||C`:

`Y=(R_s-jomega L)/[R_s^2+(omega L)^2]+jomega C`.

Setting `Im(Y)=0` gives:

`C=L/[R_s^2+(omega_0L)^2]`, or `omega_0^2=1/(LC)-(R_s/L)^2`.

At this frequency, direct substitution gives `Z_in=L/(C R_s)`. A non-positive squared frequency means no physical resonance root for the requested parameters.

## ID-Z-02 — Ideal matching transformer

For an ideal transformer `n=N_p/N_s=V_p/V_s=I_s/I_p` and `Z_p=n^2Z_s`. Loss, leakage, magnetising current and saturation are outside this ideal method.

## ID-TH-01 — Heating energy, time and power boundaries

For a batch workpiece with a declared material path:

`E_useful=m integral[T_0 to T_1] c_p(T)dT + m sum(Delta h_phase) + E_reaction`.

For continuous mass flow, the corresponding useful power is `P_useful=mdot Delta h_process`. A lumped transient model, when its spatial-uniformity assumptions are separately accepted, is:

`m c_p(T)dT/dt=P_absorbed-Q_loss(T,t)-P_phase/reaction`.

Power boundaries are explicit sums, for example `P_workpiece=P_useful+Q_loss,workpiece`, `P_coil_port=P_workpiece+P_Cu+P_stray`, and `P_grid=P_coil_port/product(eta_i)`. Each loss or efficiency appears exactly once and each efficiency records its numerator and denominator reference planes.

## ID-HYD-01 — Cooling energy and internal heat-transfer chain

For the declared water-cooled control volume:

`Q_cool=P_Cu+Q_pickup_to_coil+P_magnetic+P_other_cooled`.

Single-phase steady enthalpy balance:

`mdot=Q_cool/(h_out-h_in)`, `Vdot=mdot/rho`, `v=Vdot_branch/A_h`, `D_h=4A_h/P_wetted`.

Dimensionless definitions are `Re=rho v D_h/mu` and `Pr=c_p mu/k_f`. A selected, in-domain correlation supplies `Nu`, then `h_i=Nu k_f/D_h`.

## ID-HYD-02 — Hydraulic, saturation and pump-screening chain

Darcy pressure balance:

`Delta p=f_D(L/D_h)rho v^2/2+sum[K_j rho v_j^2/2]+rho g0 Delta z`.

Parallel branches share node pressure difference and satisfy mass conservation; equal flow is a consequence only for equal resistance. Local saturation screening uses `DeltaT_sub=T_sat(p_abs)-T_local`; positive equilibrium subcooling is not itself a safety certification.

For a distributed axial heat pickup `q'_cool(z)`, the screening chain is `dh_b/dz=q'_cool/mdot`, `q''_i=q'_cool/P_i`, and `T_wi=T_b+q''_i(1/h_i+R''_f)`. It is an axial/section-average model, not proof of the maximum AC hot-spot wall temperature.

At a declared pump suction reference plane, the available net positive suction head is

`NPSH_A=p_suction,static,abs/(rho g0)+v_s^2/(2g0)-p_sat(T_s)/(rho g0)`,

with elevation or other Bernoulli terms added if not already included in the stated static pressure. It can be compared only with the selected pump manufacturer's `NPSH_R` under matching definitions and operating state.

## ID-NUM-01 — Numerical integration and root-solver rules

Composite Simpson integration over `n` equal subintervals requires positive even `n` and uses:

`I_n=(h/3)[f_0+f_n+4 sum(f_odd)+2 sum(f_even,interior)]`.

The implementation repeats at `n,2n,4n` until a declared absolute-plus-relative tolerance is satisfied, or returns `non_converged`; singular endpoints require an approved transformation or another registered algorithm. Bracketed scalar root solvers must first prove a valid bracket and report residual, bracket width, iteration count and termination reason. No root in the searched physical interval is distinct from numerical non-convergence.

## ID-QA-01 — Method comparison without circular validation

For applicable methods evaluated from the same immutable input snapshot, a descriptive spread may be reported as

`spread=(max(L_i)-min(L_i))/L_reference`,

where `L_reference` is explicitly identified and non-zero. Pairwise residuals retain method/version and uncertainty. Agreement between methods is not independent validation and cannot raise scientific confidence by itself; out-of-domain and failed methods remain visible rather than being silently dropped.

## ID-ANN-01 — Annulus geometry and dispatch boundary

The canonical radial clearance between the mechanical coil inner surface and insulation outer surface is:

`s_ann=(D_i-D_ins,o)/2`, with `D_ins,o=D_workpiece,o+2 delta_ins` when that construction applies.

If `D_i` is derived from approved mechanical coil geometry, `D_i=D_m-d_rad`; `D_c` is not used for this reconstruction. For eccentricity `e_ann`, `s_ann,min=s_ann-e_ann` and `s_ann,max=s_ann+e_ann`. A non-positive minimum clearance is invalid/interference.

`ID-ANN-01` only classifies orientation, sealing/opening, continuous versus discrete outer boundary, concentricity and heat-flow direction, then dispatches to an independently sourced in-domain correlation. It supplies no universal `Nu(Ra)` equation and never guesses missing boundary conditions.

## ID-HT-01 — Cylindrical thermal balance

Steady one-dimensional radial conduction through a constant-`k` cylinder follows integration of Fourier's law:

`Q=2pi L k(T_i-T_o)/ln(r_o/r_i)`.

For multiple constant-`k` layers in series:

`R_cond=sum[ln(r_i/r_{i-1})/(2pi k_i L)]`.

For temperature-dependent `k`, each layer obeys:

`Q ln(r_o/r_i)/(2pi L)=integral[T_o to T_i] k(T)dT`,

and interface temperatures are solved from common heat flow.

At the outer sidewall:

`Q_surface=2pi r_o L h_c(T_s-T_a)+2pi r_o L epsilon sigma(T_s^4-T_sur^4)`.

The insulation solver closes `Q_cond=Q_surface` for each candidate thickness. It then constructs the feasible sets for surface temperature, heat loss and material/manufacturing limits. The general two-target solution is:

`delta*=min(F_T intersect F_Q intersect F_M)`.

`max(delta_T,delta_Q)` is valid only after both feasible sets are proven upward-closed on the approved design branch. No feasible intersection returns `no_feasible_solution`; failure of a numerical iteration returns `non_converged`.

## ID-RAD-01 — Diffuse-gray radiation network

For two long concentric diffuse-gray cylinders, radiation based on hot inner area is:

`Q_rad=sigma A_h(T_h^4-T_c^4)/[1/epsilon_h+(A_h/A_c)(1/epsilon_c-1)]`.

Gas transfer and radiation are parallel paths; end loss, supports and penetrations are separate control-volume terms.

## ID-HT-02 — Transient heat-loss and lumped screening boundary

A transient energy solver evaluates the approved instantaneous convection, radiation, conduction, opening and bridge terms at the current state and integrates the declared control-volume ODE. It must not replace those state-dependent terms with an undocumented constant loss fraction.

The Biot number is a screening quantity:

`Bi=h L_c/k_solid`,

where `h`, `L_c` and `k_solid` must correspond to the selected geometry, boundary and property state. This controlled derivation does not approve a universal Bi threshold; until a source and geometry-specific criterion are registered, the result is reported as a screening indicator with `needs_verification`, not as an automatic lumped-capacitance acceptance decision.
