import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  G06_APPARENT_POWER_AND_POWER_FACTOR_MAPPING,
  G06_BINARY64_MIN_NORMAL,
  G06_IMPLEMENTATION_READINESS,
  G06_NUMERIC_REPRESENTABILITY_POLICY,
  G06_WARNING_PREDICATES,
  evaluateG06ApparentPowerAndPowerFactor,
  type G06ApparentPowerAndPowerFactorFailure,
  type G06ApparentPowerAndPowerFactorInput,
  type G06ApparentPowerAndPowerFactorSuccess,
  type G06ElectricalBindingEvidence,
  type G06PhaseSystemEvidence,
} from "../../../src/methods/G/g06ApparentPowerAndPowerFactor.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const BASE_BINDING = Object.freeze({
  caseSnapshotId: "case-snapshot-g06-001",
  electricalStateSnapshotId: "electrical-state-grid-50hz-001",
  portId: "declared-single-phase-port",
  positiveTerminalId: "L",
  negativeTerminalId: "N",
  referencePlaneId: "meter-reference-plane",
  loadedState: "measured_state",
  frequencyHz: 50,
  timeBasisId: "steady-window-10s-rms-and-power",
  measurementWindowId: "measurement-window-001",
  portRole: "other_explicit_single_phase_or_equivalent",
  currentDirection: "into_passive_port",
  waveformBasis: "sinusoidal_steady_state",
} as const satisfies G06ElectricalBindingEvidence);

const SINGLE_PHASE = Object.freeze({
  phaseTopology: "single_phase_or_equivalent_port",
  phaseCount: 1,
  phaseTopologyEvidenceId: "single-phase-wiring-record-001",
  balancedLineVoltageAndCurrentConfirmed: null,
  gridSidePortConfirmed: null,
} as const satisfies G06PhaseSystemEvidence);

const EXACT_UNCERTAINTY = Object.freeze({
  kind: "precomputed_expanded_uncertainty_of_P_minus_S",
  expandedDifferenceUncertaintyW: 0,
  coverageFactor: 1,
  uncertaintySourceRef: "ELEC-PF-001-synthetic-exact",
} as const);

interface SingleInputOverrides {
  readonly voltageV?: number;
  readonly currentA?: number;
  readonly activePowerW?: number;
  readonly voltageQuantityBasis?: G06ApparentPowerAndPowerFactorInput["voltage"]["quantityBasis"];
  readonly currentQuantityBasis?: G06ApparentPowerAndPowerFactorInput["current"]["quantityBasis"];
  readonly voltageInterpretation?: G06ApparentPowerAndPowerFactorInput["voltage"]["interpretation"];
  readonly currentInterpretation?: G06ApparentPowerAndPowerFactorInput["current"]["interpretation"];
  readonly activePowerBasis?: G06ApparentPowerAndPowerFactorInput["activePower"]["activePowerBasis"];
  readonly voltageBinding?: Partial<G06ElectricalBindingEvidence>;
  readonly currentBinding?: Partial<G06ElectricalBindingEvidence>;
  readonly powerBinding?: Partial<G06ElectricalBindingEvidence>;
  readonly phaseSystem?: G06PhaseSystemEvidence;
  readonly consistencyUncertainty?: G06ApparentPowerAndPowerFactorInput["consistencyUncertainty"];
}

function singleInput(
  overrides: SingleInputOverrides = {},
): G06ApparentPowerAndPowerFactorInput {
  return {
    voltage: {
      voltageV: overrides.voltageV ?? 230,
      quantityBasis: overrides.voltageQuantityBasis ?? "rms",
      interpretation:
        overrides.voltageInterpretation ??
        "single_phase_or_equivalent_port_rms",
      binding: { ...BASE_BINDING, ...overrides.voltageBinding },
    },
    current: {
      currentA: overrides.currentA ?? 10,
      quantityBasis: overrides.currentQuantityBasis ?? "rms",
      interpretation:
        overrides.currentInterpretation ??
        "single_phase_or_equivalent_port_rms",
      binding: { ...BASE_BINDING, ...overrides.currentBinding },
    },
    activePower: {
      activePowerW: overrides.activePowerW ?? 1840,
      activePowerBasis:
        overrides.activePowerBasis ??
        "total_active_power_same_waveform_and_window",
      binding: { ...BASE_BINDING, ...overrides.powerBinding },
    },
    phaseSystem: overrides.phaseSystem ?? { ...SINGLE_PHASE },
    consistencyUncertainty:
      overrides.consistencyUncertainty ?? { ...EXACT_UNCERTAINTY },
  };
}

function threePhaseInput(
  overrides: SingleInputOverrides = {},
): G06ApparentPowerAndPowerFactorInput {
  const gridBinding = {
    ...BASE_BINDING,
    portId: "grid-three-phase-input",
    positiveTerminalId: "three-phase-lines",
    negativeTerminalId: "grid-reference",
    electricalStateSnapshotId: "grid-balanced-three-phase-50hz-001",
    portRole: "grid_side" as const,
  };
  const apparentPower = Math.sqrt(3) * 400 * 20;
  return singleInput({
    voltageV: overrides.voltageV ?? 400,
    currentA: overrides.currentA ?? 20,
    activePowerW: overrides.activePowerW ?? apparentPower * 0.9,
    voltageInterpretation:
      overrides.voltageInterpretation ?? "line_to_line_rms",
    currentInterpretation:
      overrides.currentInterpretation ?? "line_current_rms",
    voltageBinding: { ...gridBinding, ...overrides.voltageBinding },
    currentBinding: { ...gridBinding, ...overrides.currentBinding },
    powerBinding: { ...gridBinding, ...overrides.powerBinding },
    phaseSystem:
      overrides.phaseSystem ??
      ({
        phaseTopology: "balanced_three_phase_grid",
        phaseCount: 3,
        phaseTopologyEvidenceId: "balanced-grid-wiring-record-001",
        balancedLineVoltageAndCurrentConfirmed: true,
        gridSidePortConfirmed: true,
      } satisfies G06PhaseSystemEvidence),
    ...(overrides.consistencyUncertainty === undefined
      ? {}
      : { consistencyUncertainty: overrides.consistencyUncertainty }),
    ...(overrides.voltageQuantityBasis === undefined
      ? {}
      : { voltageQuantityBasis: overrides.voltageQuantityBasis }),
    ...(overrides.currentQuantityBasis === undefined
      ? {}
      : { currentQuantityBasis: overrides.currentQuantityBasis }),
    ...(overrides.activePowerBasis === undefined
      ? {}
      : { activePowerBasis: overrides.activePowerBasis }),
  });
}

function successOf(
  input: G06ApparentPowerAndPowerFactorInput,
): G06ApparentPowerAndPowerFactorSuccess {
  const result = evaluateG06ApparentPowerAndPowerFactor(input);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(
      (result as G06ApparentPowerAndPowerFactorFailure).failure.message,
    );
  }
  return result as G06ApparentPowerAndPowerFactorSuccess;
}

function failureOf(
  input: G06ApparentPowerAndPowerFactorInput,
): G06ApparentPowerAndPowerFactorFailure {
  const result = evaluateG06ApparentPowerAndPowerFactor(input);
  expect(["success", "success_with_warnings"]).not.toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    throw new Error("expected G-06 failure");
  }
  return result as G06ApparentPowerAndPowerFactorFailure;
}

describe("G-06 apparent power and true power factor", () => {
  it("binds the isolated implementation to the frozen registry, derivation, source gap and ELEC-PF-001", () => {
    expect(G06_APPARENT_POWER_AND_POWER_FACTOR_MAPPING).toMatchObject({
      methodId: "G-06",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#G-06:Equation",
      sourceRefs: ["ID-AC-02", "PRIMARY-STANDARD-COPY-REQUIRED"],
      contractSourceRefs: [
        "ID-AC-02",
        "DER-CIRCUIT",
        "primary standard page missing",
      ],
      derivationRefs: ["ID-AC-02", "DER-CIRCUIT"],
      validationCaseIds: [],
      methodCheckIds: ["ELEC-PF-001"],
      outputQuantityIds: ["S", "PF"],
      stableWarningIds: [],
    });
    expect(G06_WARNING_PREDICATES).toEqual({
      activePowerExceedsApparentPowerBeyondUncertainty:
        "P>S beyond uncertainty",
      cosinePhiUsedAsTruePowerFactor: "cos(phi) is used as true PF",
      coilAndGridPortsMixed:
        "coil-terminal and grid-side quantities are mixed",
    });
    expect(G06_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "isolated_implementation_not_runtime_activated",
      runtimeActivated: false,
      publicApiExported: false,
      formalNormativeSourcePageStatus:
        "PRIMARY_STANDARD_COPY_REQUIRED_source_location_gap_preserved",
    });
  });

  it("does not activate the registry runtime merely because the isolated file exists", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-06"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
  });

  it("implements single-phase/equivalent S=Vrms*Irms and true PF=P/S", () => {
    const result = successOf(singleInput());
    expect(result.status).toBe("success");
    expect(result.value.S.valueSi).toBe(2300);
    expect(result.value.PF.kind).toBe("available");
    if (result.value.PF.kind === "available") {
      expect(result.value.PF.valueSi).toBeCloseTo(0.8, 15);
    }
    expect(result.equation).toBe(
      "S = V_rms * I_rms; PF = P / S when S > 0",
    );
    expect(result.substitution).toEqual({
      voltageV: 230,
      currentA: 10,
      activePowerW: 1840,
      phaseMultiplier: 1,
      apparentPowerVA: 2300,
    });
  });

  it("implements only the confirmed balanced grid-side three-phase sqrt(3) U_LL I_L branch", () => {
    const result = successOf(threePhaseInput());
    const expectedS = Math.sqrt(3) * 400 * 20;
    expect(result.status).toBe("success");
    expect(result.value.S.valueSi).toBeCloseTo(expectedS, 12);
    expect(result.value.S.interpretation).toBe(
      "balanced_three_phase_grid_apparent_power",
    );
    expect(result.value.PF.kind).toBe("available");
    if (result.value.PF.kind === "available") {
      expect(result.value.PF.valueSi).toBeCloseTo(0.9, 14);
    }
    expect(result.substitution.phaseMultiplier).toBeCloseTo(Math.sqrt(3), 15);
    expect(result.equation).toContain("U_LL,rms");
  });

  it("labels canonical SI power dimension separately from the apparent-power VA display semantic", () => {
    const result = successOf(singleInput());
    expect(result.value.S).toMatchObject({
      outputId: "S",
      dimensionId: "power",
      canonicalUnitId: "W",
      engineeringUnitId: "VA",
    });
    expect(result.value.PF).toMatchObject({
      outputId: "PF",
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    });
  });

  it("passes ELEC-PF-001 single-phase scaling and dimensional identities", () => {
    const base = successOf(singleInput());
    const scaled = successOf(
      singleInput({ voltageV: 460, currentA: 20, activePowerW: 7360 }),
    );
    expect(scaled.value.S.valueSi).toBe(base.value.S.valueSi * 4);
    expect(scaled.value.PF.kind).toBe("available");
    expect(base.value.PF.kind).toBe("available");
    if (
      scaled.value.PF.kind === "available" &&
      base.value.PF.kind === "available"
    ) {
      expect(scaled.value.PF.valueSi).toBe(base.value.PF.valueSi);
    }
  });

  it("passes ELEC-PF-001 balanced-three-phase scaling identity", () => {
    const base = successOf(threePhaseInput());
    const doubled = successOf(
      threePhaseInput({ voltageV: 800, activePowerW: base.value.S.valueSi * 1.8 }),
    );
    expect(doubled.value.S.valueSi).toBeCloseTo(
      base.value.S.valueSi * 2,
      11,
    );
    expect(doubled.value.PF.kind).toBe("available");
    if (doubled.value.PF.kind === "available") {
      expect(doubled.value.PF.valueSi).toBeCloseTo(0.9, 13);
    }
  });

  it("computes true PF for a possibly nonsinusoidal waveform only from total full-wave RMS and total active power", () => {
    const waveform = {
      waveformBasis: "possibly_nonsinusoidal_total_waveform" as const,
    };
    const result = successOf(
      singleInput({
        voltageV: 100,
        currentA: 10,
        activePowerW: 700,
        voltageQuantityBasis: "full_wave_rms",
        currentQuantityBasis: "full_wave_rms",
        voltageBinding: waveform,
        currentBinding: waveform,
        powerBinding: waveform,
      }),
    );
    expect(result.value.PF.kind).toBe("available");
    if (result.value.PF.kind === "available") {
      expect(result.value.PF.valueSi).toBe(0.7);
      expect(result.value.PF.interpretation).toContain("true_power_factor");
    }
    expect(result.electricalSnapshot.voltageQuantityBasis).toBe(
      "full_wave_rms",
    );
  });

  it("preserves the exact port/state/reference-plane/time snapshot in a successful trace", () => {
    const result = successOf(singleInput());
    expect(result.electricalSnapshot.binding).toEqual(BASE_BINDING);
    expect(result.electricalSnapshot.phaseSystem).toEqual(SINGLE_PHASE);
    expect(result.electricalSnapshot).toMatchObject({
      voltageQuantityBasis: "rms",
      currentQuantityBasis: "rms",
      voltageInterpretation: "single_phase_or_equivalent_port_rms",
      currentInterpretation: "single_phase_or_equivalent_port_rms",
      activePowerBasis: "total_active_power_same_waveform_and_window",
    });
    expect(result.sourceRefs).toContain("ID-AC-02");
    expect(result.contractSourceRefs).toContain("DER-CIRCUIT");
    expect(result.methodCheckIds).toEqual(["ELEC-PF-001"]);
  });

  it("publishes PF=0 for zero active power at nonzero apparent power", () => {
    const result = successOf(singleInput({ activePowerW: 0 }));
    expect(result.status).toBe("success");
    expect(result.value.PF.kind).toBe("available");
    if (result.value.PF.kind === "available") {
      expect(result.value.PF.valueSi).toBe(0);
    }
  });

  it("reaches the passive unity-PF analytical limit exactly at P=S", () => {
    const result = successOf(singleInput({ activePowerW: 2300 }));
    expect(result.status).toBe("success");
    expect(result.value.PF.kind).toBe("available");
    if (result.value.PF.kind === "available") {
      expect(result.value.PF.valueSi).toBe(1);
    }
    expect(result.consistency.nominalActivePowerMinusApparentPowerW).toBe(0);
  });

  it("does not invent PF=0 or NaN at zero apparent power", () => {
    const result = successOf(
      singleInput({ voltageV: 0, currentA: 10, activePowerW: 0 }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.S.valueSi).toBe(0);
    expect(result.value.PF).toEqual({
      kind: "unavailable",
      outputId: "PF",
      status: "not_applicable",
      reason: "P/S is undefined at zero apparent power",
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "G-06.power_factor_unavailable_zero_apparent_power",
        condition: "S=0",
      }),
    ]);
  });

  it("fails P>S beyond a supplied zero uncertainty as inconsistent_measurement without a value or evidence snapshot", () => {
    const result = failureOf(singleInput({ activePowerW: 2301 }));
    expect(result.status).toBe("inconsistent_measurement");
    expect(result.failure.code).toBe(
      "G-06.active_power_exceeds_apparent_power",
    );
    expect(result).not.toHaveProperty("value");
    expect(result).not.toHaveProperty("substitution");
    expect(result).not.toHaveProperty("electricalSnapshot");
    expect(result).not.toHaveProperty("consistency");
  });

  it("fails P>S beyond a nonzero precomputed expanded P-S uncertainty", () => {
    const result = failureOf(
      singleInput({
        activePowerW: 2302,
        consistencyUncertainty: {
          kind: "precomputed_expanded_uncertainty_of_P_minus_S",
          expandedDifferenceUncertaintyW: 1,
          coverageFactor: 2,
          uncertaintySourceRef: "calibration-propagation-001",
        },
      }),
    );
    expect(result.status).toBe("inconsistent_measurement");
    expect(result.failure.code).toBe(
      "G-06.active_power_exceeds_apparent_power",
    );
  });

  it("warns within supplied uncertainty but does not clamp or publish PF", () => {
    const result = successOf(
      singleInput({
        activePowerW: 2301,
        consistencyUncertainty: {
          kind: "precomputed_expanded_uncertainty_of_P_minus_S",
          expandedDifferenceUncertaintyW: 1,
          coverageFactor: 2,
          uncertaintySourceRef: "calibration-propagation-001",
        },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.S.valueSi).toBe(2300);
    expect(result.value.PF).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.consistency).toEqual({
      nominalActivePowerMinusApparentPowerW: 1,
      expandedDifferenceUncertaintyW: 1,
      classification: "nominal_exceeds_within_expanded_uncertainty",
      inputAdjusted: false,
      powerFactorPublished: false,
    });
    expect(result.uncertaintySnapshot).toEqual({
      kind: "precomputed_expanded_uncertainty_of_P_minus_S",
      expandedDifferenceUncertaintyW: 1,
      coverageFactor: 2,
      uncertaintySourceRef: "calibration-propagation-001",
    });
    expect(result.warnings[0]).toMatchObject({
      guardedPredicateRef: "P>S beyond uncertainty",
      predicateOutcome: "not_triggered_within_uncertainty",
    });
  });

  it("requires uncertainty evidence before classifying a nominal P>S case", () => {
    const result = failureOf(
      singleInput({
        activePowerW: 2301,
        consistencyUncertainty: {
          kind: "not_available",
          reason: "instrument covariance was not supplied",
        },
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-06.uncertainty_required_for_nominal_exceedance",
    );
  });

  it("does not require a numeric uncertainty placeholder when nominal P<=S", () => {
    const result = successOf(
      singleInput({
        consistencyUncertainty: {
          kind: "not_available",
          reason: "analytical design-state input has no measurement uncertainty",
        },
      }),
    );
    expect(result.status).toBe("success");
    expect(result.consistency.expandedDifferenceUncertaintyW).toBeNull();
  });

  it.each([
    ["fundamental_active_power_only", "fundamental-only"],
    ["cos_phi_derived", "cos(phi)"],
  ] as const)(
    "rejects %s active-power evidence instead of calling it true PF",
    (activePowerBasis, messageFragment) => {
      const result = failureOf(singleInput({ activePowerBasis }));
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe(
        "G-06.active_power_basis_not_applicable",
      );
      expect(result.failure.message).toContain(messageFragment);
      expect(result).not.toHaveProperty("value");
    },
  );

  it.each(["peak", "fundamental_rms", "dc", "average"] as const)(
    "rejects %s voltage/current as a true-PF RMS pair",
    (quantityBasis) => {
      const result = failureOf(
        singleInput({
          voltageQuantityBasis: quantityBasis,
          currentQuantityBasis: quantityBasis,
        }),
      );
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe(
        "G-06.quantity_basis_not_applicable",
      );
    },
  );

  it("rejects mixed voltage/current RMS bases", () => {
    const result = failureOf(
      singleInput({ currentQuantityBasis: "full_wave_rms" }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-06.quantity_basis_not_applicable");
  });

  it.each([
    ["sinusoidal_steady_state", "full_wave_rms"],
    ["possibly_nonsinusoidal_total_waveform", "rms"],
    ["fundamental_only", "rms"],
  ] as const)(
    "rejects waveform basis %s with quantity basis %s",
    (waveformBasis, quantityBasis) => {
      const binding = { waveformBasis };
      const result = failureOf(
        singleInput({
          voltageQuantityBasis: quantityBasis,
          currentQuantityBasis: quantityBasis,
          voltageBinding: binding,
          currentBinding: binding,
          powerBinding: binding,
        }),
      );
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe("G-06.waveform_basis_not_applicable");
    },
  );

  it("rejects the single-phase branch when line-quantity interpretations are supplied", () => {
    const result = failureOf(
      singleInput({
        voltageInterpretation: "line_to_line_rms",
        currentInterpretation: "line_current_rms",
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe(
      "G-06.voltage_current_interpretation_not_applicable",
    );
  });

  it.each([
    [false, true, "not_applicable", "G-06.phase_system_not_applicable"],
    [null, true, "insufficient_data", "G-06.three_phase_balance_unconfirmed"],
    [true, false, "not_applicable", "G-06.three_phase_not_grid_side"],
    [true, null, "insufficient_data", "G-06.three_phase_not_grid_side"],
  ] as const)(
    "fails closed for three-phase balance=%s grid-side=%s",
    (balanced, gridSide, status, code) => {
      const result = failureOf(
        threePhaseInput({
          phaseSystem: {
            phaseTopology: "balanced_three_phase_grid",
            phaseCount: 3,
            phaseTopologyEvidenceId: "three-phase-evidence",
            balancedLineVoltageAndCurrentConfirmed: balanced,
            gridSidePortConfirmed: gridSide,
          },
        }),
      );
      expect(result.status).toBe(status);
      expect(result.failure.code).toBe(code);
    },
  );

  it("rejects an explicitly unbalanced three-phase system", () => {
    const result = failureOf(
      threePhaseInput({
        phaseSystem: {
          phaseTopology: "unbalanced_three_phase",
          phaseCount: 3,
          phaseTopologyEvidenceId: "unbalanced-grid-record",
          balancedLineVoltageAndCurrentConfirmed: false,
          gridSidePortConfirmed: true,
        },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-06.phase_system_not_applicable");
  });

  it("rejects three-phase sqrt(3) use at a coil-terminal port", () => {
    const result = failureOf(
      threePhaseInput({
        voltageBinding: { portRole: "coil_terminal" },
        currentBinding: { portRole: "coil_terminal" },
        powerBinding: { portRole: "coil_terminal" },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-06.three_phase_not_grid_side");
  });

  it.each([
    ["phase_to_neutral_rms", "line_current_rms"],
    ["line_to_line_rms", "phase_current_rms"],
    [
      "other_explicit_voltage_interpretation",
      "other_explicit_current_interpretation",
    ],
  ] as const)(
    "rejects three-phase voltage/current interpretations %s and %s",
    (voltageInterpretation, currentInterpretation) => {
      const result = failureOf(
        threePhaseInput({ voltageInterpretation, currentInterpretation }),
      );
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe(
        "G-06.voltage_current_interpretation_not_applicable",
      );
    },
  );

  it.each([
    [
      "waveform basis",
      () => {
        const binding = { waveformBasis: "unknown_or_unconfirmed" as const };
        return singleInput({
          voltageBinding: binding,
          currentBinding: binding,
          powerBinding: binding,
        });
      },
      "G-06.waveform_basis_unconfirmed",
    ],
    [
      "active-power basis",
      () => singleInput({ activePowerBasis: "unknown_or_unconfirmed" }),
      "G-06.active_power_basis_unconfirmed",
    ],
    [
      "phase topology",
      () =>
        singleInput({
          phaseSystem: {
            phaseTopology: "unknown_or_unconfirmed",
            phaseCount: 3,
            phaseTopologyEvidenceId: "phase-topology-unconfirmed",
            balancedLineVoltageAndCurrentConfirmed: null,
            gridSidePortConfirmed: null,
          },
        }),
      "G-06.phase_system_unconfirmed",
    ],
    [
      "voltage/current interpretation",
      () =>
        singleInput({
          voltageInterpretation: "unknown_or_unconfirmed",
          currentInterpretation: "unknown_or_unconfirmed",
        }),
      "G-06.voltage_current_interpretation_unconfirmed",
    ],
  ] as const)(
    "classifies unknown or unconfirmed %s as insufficient_data",
    (_label, candidate, code) => {
      const result = failureOf(candidate());
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe(code);
      expect(result).not.toHaveProperty("value");
    },
  );

  it.each([
    [
      "peak basis",
      () =>
        singleInput({
          voltageQuantityBasis: "peak",
          currentQuantityBasis: "peak",
          currentBinding: { loadedState: "workpiece_hot" },
        }),
      "G-06.quantity_basis_not_applicable",
    ],
    [
      "fundamental-only waveform",
      () => {
        const waveformBasis = "fundamental_only" as const;
        return singleInput({
          voltageBinding: { waveformBasis },
          currentBinding: { waveformBasis, loadedState: "workpiece_hot" },
          powerBinding: { waveformBasis },
        });
      },
      "G-06.waveform_basis_not_applicable",
    ],
    [
      "cos-phi-derived active power",
      () =>
        singleInput({
          activePowerBasis: "cos_phi_derived",
          currentBinding: { loadedState: "workpiece_hot" },
        }),
      "G-06.active_power_basis_not_applicable",
    ],
    [
      "explicitly unbalanced phase system",
      () =>
        threePhaseInput({
          currentBinding: { loadedState: "workpiece_hot" },
          phaseSystem: {
            phaseTopology: "unbalanced_three_phase",
            phaseCount: 3,
            phaseTopologyEvidenceId: "known-unbalanced-priority",
            balancedLineVoltageAndCurrentConfirmed: false,
            gridSidePortConfirmed: true,
          },
        }),
      "G-06.phase_system_not_applicable",
    ],
    [
      "explicitly unsupported interpretations",
      () =>
        singleInput({
          voltageInterpretation: "other_explicit_voltage_interpretation",
          currentInterpretation: "other_explicit_current_interpretation",
          currentBinding: { loadedState: "workpiece_hot" },
        }),
      "G-06.voltage_current_interpretation_not_applicable",
    ],
  ] as const)(
    "keeps known %s non-applicability ahead of a generic loaded-state mismatch",
    (_label, candidate, code) => {
      const result = failureOf(candidate());
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe(code);
    },
  );

  it.each([
    [
      "waveform basis",
      () => {
        const waveformBasis = "unknown_or_unconfirmed" as const;
        return singleInput({
          voltageBinding: { waveformBasis },
          currentBinding: { waveformBasis, loadedState: "workpiece_hot" },
          powerBinding: { waveformBasis },
        });
      },
      "G-06.waveform_basis_unconfirmed",
    ],
    [
      "active-power basis",
      () =>
        singleInput({
          activePowerBasis: "unknown_or_unconfirmed",
          currentBinding: { loadedState: "workpiece_hot" },
        }),
      "G-06.active_power_basis_unconfirmed",
    ],
    [
      "phase topology",
      () =>
        singleInput({
          currentBinding: { loadedState: "workpiece_hot" },
          phaseSystem: {
            phaseTopology: "unknown_or_unconfirmed",
            phaseCount: 3,
            phaseTopologyEvidenceId: "unknown-phase-priority",
            balancedLineVoltageAndCurrentConfirmed: null,
            gridSidePortConfirmed: null,
          },
        }),
      "G-06.phase_system_unconfirmed",
    ],
    [
      "voltage/current interpretation",
      () =>
        singleInput({
          voltageInterpretation: "unknown_or_unconfirmed",
          currentInterpretation: "unknown_or_unconfirmed",
          currentBinding: { loadedState: "workpiece_hot" },
        }),
      "G-06.voltage_current_interpretation_unconfirmed",
    ],
  ] as const)(
    "keeps unknown %s classified as insufficient_data ahead of a generic loaded-state mismatch",
    (_label, candidate, code) => {
      const result = failureOf(candidate());
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe(code);
    },
  );

  it("keeps invalid enum/schema evidence above known non-applicability", () => {
    const candidate = singleInput({
      voltageQuantityBasis: "peak",
      currentQuantityBasis: "peak",
    }) as unknown as Record<string, unknown>;
    (candidate.activePower as Record<string, unknown>).activePowerBasis =
      "uncontrolled-enum";
    const result = failureOf(
      candidate as unknown as G06ApparentPowerAndPowerFactorInput,
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.active_power_evidence_invalid");
  });

  it.each([
    ["caseSnapshotId", "case-snapshot-other"],
    ["electricalStateSnapshotId", "electrical-state-other"],
    ["portId", "grid-port-other"],
    ["positiveTerminalId", "other-positive-terminal"],
    ["negativeTerminalId", "other-negative-terminal"],
    ["referencePlaneId", "other-reference-plane"],
    ["loadedState", "workpiece_hot"],
    ["frequencyHz", 60],
    ["timeBasisId", "other-time-basis"],
    ["measurementWindowId", "other-window"],
    ["portRole", "grid_side"],
  ] as const)(
    "rejects a current binding mismatch in %s without mixing ports/states/times",
    (field, value) => {
      const result = failureOf(
        singleInput({ currentBinding: { [field]: value } }),
      );
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe(
        "G-06.port_state_time_boundary_mismatch",
      );
      expect(result).not.toHaveProperty("value");
    },
  );

  it("rejects a power binding mismatch independently of voltage/current matching", () => {
    const result = failureOf(
      singleInput({ powerBinding: { referencePlaneId: "grid-meter-plane" } }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-06.port_state_time_boundary_mismatch",
    );
  });

  it.each([
    ["voltage", { voltageV: -1 }],
    ["voltage", { voltageV: Number.NaN }],
    ["voltage", { voltageV: Number.POSITIVE_INFINITY }],
    ["voltage", { voltageV: Number.MIN_VALUE }],
    ["current", { currentA: -1 }],
    ["current", { currentA: Number.NaN }],
    ["current", { currentA: Number.POSITIVE_INFINITY }],
    ["current", { currentA: Number.MIN_VALUE }],
    ["activePower", { activePowerW: -1 }],
    ["activePower", { activePowerW: Number.NaN }],
    ["activePower", { activePowerW: Number.POSITIVE_INFINITY }],
    ["activePower", { activePowerW: Number.MIN_VALUE }],
  ] as const)("rejects invalid canonical-SI %s evidence %#", (kind, patch) => {
    const candidate = singleInput() as unknown as Record<string, unknown>;
    candidate[kind] = {
      ...(candidate[kind] as Record<string, unknown>),
      ...patch,
    };
    const result = failureOf(
      candidate as unknown as G06ApparentPowerAndPowerFactorInput,
    );
    expect(result.status).toBe("invalid_input");
    expect(result).not.toHaveProperty("value");
  });

  it("rejects invalid binding terminals, frequency, direction, state and identifiers", () => {
    const patches: readonly Partial<G06ElectricalBindingEvidence>[] = [
      { positiveTerminalId: "N", negativeTerminalId: "N" },
      { frequencyHz: 0 },
      { frequencyHz: Number.MIN_VALUE },
      { caseSnapshotId: " " },
      { currentDirection: "out_of_passive_port" as never },
      { loadedState: "legacy_state" as never },
    ];
    for (const patch of patches) {
      const result = failureOf(singleInput({ voltageBinding: patch }));
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-06.binding_evidence_invalid");
    }
  });

  it("rejects contradictory or uncontrolled phase-system records", () => {
    const candidates = [
      {
        ...SINGLE_PHASE,
        phaseCount: 3,
      },
      {
        ...SINGLE_PHASE,
        balancedLineVoltageAndCurrentConfirmed: true,
      },
      {
        ...SINGLE_PHASE,
        phaseTopology: "invented_phase_topology",
      },
      {
        ...SINGLE_PHASE,
        phaseTopologyEvidenceId: " ",
      },
    ];
    for (const phaseSystem of candidates) {
      const result = failureOf(
        singleInput({ phaseSystem: phaseSystem as G06PhaseSystemEvidence }),
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe(
        "G-06.phase_system_evidence_invalid",
      );
    }
  });

  it("rejects malformed, negative, subnormal or unsourced uncertainty evidence", () => {
    const candidates = [
      {
        kind: "precomputed_expanded_uncertainty_of_P_minus_S",
        expandedDifferenceUncertaintyW: -1,
        coverageFactor: 2,
        uncertaintySourceRef: "source",
      },
      {
        kind: "precomputed_expanded_uncertainty_of_P_minus_S",
        expandedDifferenceUncertaintyW: Number.MIN_VALUE,
        coverageFactor: 2,
        uncertaintySourceRef: "source",
      },
      {
        kind: "precomputed_expanded_uncertainty_of_P_minus_S",
        expandedDifferenceUncertaintyW: 1,
        coverageFactor: 0,
        uncertaintySourceRef: "source",
      },
      {
        kind: "precomputed_expanded_uncertainty_of_P_minus_S",
        expandedDifferenceUncertaintyW: 1,
        coverageFactor: 2,
        uncertaintySourceRef: " ",
      },
      { kind: "not_available", reason: " " },
    ];
    for (const consistencyUncertainty of candidates) {
      const result = failureOf(
        singleInput({
          consistencyUncertainty:
            consistencyUncertainty as G06ApparentPowerAndPowerFactorInput["consistencyUncertainty"],
        }),
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe(
        "G-06.uncertainty_evidence_invalid",
      );
    }
  });

  it("fails closed on single-phase multiplication overflow", () => {
    const result = failureOf(
      singleInput({ voltageV: Number.MAX_VALUE, currentA: 2, activePowerW: 0 }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
  });

  it("fails closed on balanced-three-phase multiplier overflow", () => {
    const result = failureOf(
      threePhaseInput({
        voltageV: 1.1e308,
        currentA: 1,
        activePowerW: 0,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
  });

  it("fails closed on a positive subnormal V*I product", () => {
    const result = failureOf(
      singleInput({
        voltageV: G06_BINARY64_MIN_NORMAL,
        currentA: 0.5,
        activePowerW: 0,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
  });

  it("fails closed when PF would underflow to a false zero", () => {
    const result = failureOf(
      singleInput({
        voltageV: 1e308,
        currentA: 1,
        activePowerW: G06_BINARY64_MIN_NORMAL,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
  });

  it("fails closed when the P-S residual is only a positive subnormal", () => {
    const apparentPower = G06_BINARY64_MIN_NORMAL;
    const activePowerW = apparentPower + Number.MIN_VALUE;
    expect(activePowerW).toBeGreaterThan(apparentPower);
    const result = failureOf(
      singleInput({
        voltageV: apparentPower,
        currentA: 1,
        activePowerW,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
  });

  it.each([
    ["apparent power", { voltageV: 1, currentA: 1, activePowerW: 1e308 }],
    ["active power", { voltageV: 1e308, currentA: 1, activePowerW: 1e100 }],
  ] as const)(
    "fails closed when P-S swallows the nonzero %s operand",
    (_operand, overrides) => {
      const result = failureOf(singleInput(overrides));
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-06.numeric_resolution_invalid");
      expect(result).not.toHaveProperty("value");
      expect(result).not.toHaveProperty("electricalSnapshot");
      expect(result).not.toHaveProperty("consistency");
    },
  );

  it("keeps known applicability and same-boundary failures ahead of P-S swallowed-operand checks", () => {
    const knownNotApplicable = failureOf(
      singleInput({
        voltageV: 1,
        currentA: 1,
        activePowerW: 1e308,
        voltageQuantityBasis: "peak",
        currentQuantityBasis: "peak",
      }),
    );
    expect(knownNotApplicable.status).toBe("not_applicable");
    expect(knownNotApplicable.failure.code).toBe(
      "G-06.quantity_basis_not_applicable",
    );

    const mismatchedPort = failureOf(
      singleInput({
        voltageV: 1e308,
        currentA: 1,
        activePowerW: 1e100,
        powerBinding: { portId: "different-same-time-port" },
      }),
    );
    expect(mismatchedPort.status).toBe("insufficient_data");
    expect(mismatchedPort.failure.code).toBe(
      "G-06.port_state_time_boundary_mismatch",
    );
  });

  it("exposes and enforces the machine-only representability policy without engineering thresholds", () => {
    expect(G06_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputOrResultPolicy: "fail_closed",
      overflowFalseZeroAndSwallowedTermPolicy: "fail_closed",
      sourceEquationRearranged: false,
      minimumPositiveNormal: G06_BINARY64_MIN_NORMAL,
    });
  });

  it("rejects missing, extra and symbol top-level fields", () => {
    const missing = singleInput() as unknown as Record<string, unknown>;
    delete missing.phaseSystem;
    const extra = { ...singleInput(), unexpectedPower: 123 };
    const withSymbol = singleInput() as unknown as Record<PropertyKey, unknown>;
    withSymbol[Symbol("hidden")] = "hidden";

    for (const candidate of [missing, extra, withSymbol]) {
      const result = failureOf(
        candidate as unknown as G06ApparentPowerAndPowerFactorInput,
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-06.input_schema_invalid");
      expect(result).not.toHaveProperty("value");
    }
  });

  it("rejects top-level accessors without executing them", () => {
    let getterCalls = 0;
    const candidate = { ...singleInput() } as Record<string, unknown>;
    Object.defineProperty(candidate, "voltage", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return singleInput().voltage;
      },
    });
    const result = failureOf(
      candidate as unknown as G06ApparentPowerAndPowerFactorInput,
    );
    expect(result.failure.code).toBe("G-06.input_schema_invalid");
    expect(getterCalls).toBe(0);
  });

  it("rejects nested accessors without executing them", () => {
    let getterCalls = 0;
    const voltage = { ...singleInput().voltage } as Record<string, unknown>;
    Object.defineProperty(voltage, "voltageV", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 230;
      },
    });
    const result = failureOf({
      ...singleInput(),
      voltage,
    } as unknown as G06ApparentPowerAndPowerFactorInput);
    expect(result.failure.code).toBe("G-06.voltage_evidence_invalid");
    expect(getterCalls).toBe(0);
  });

  it("rejects Proxy reflection traps and class instances", () => {
    const proxied = new Proxy(singleInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    class InputRecord {
      public voltage = singleInput().voltage;
      public current = singleInput().current;
      public activePower = singleInput().activePower;
      public phaseSystem = singleInput().phaseSystem;
      public consistencyUncertainty = singleInput().consistencyUncertainty;
    }
    for (const candidate of [proxied, new InputRecord()]) {
      const result = failureOf(
        candidate as G06ApparentPowerAndPowerFactorInput,
      );
      expect(result.failure.code).toBe("G-06.input_schema_invalid");
    }
  });

  it("rejects an inherited binding rather than trusting prototype data", () => {
    const inheritedBinding = Object.create(BASE_BINDING) as G06ElectricalBindingEvidence;
    const result = failureOf({
      ...singleInput(),
      voltage: { ...singleInput().voltage, binding: inheritedBinding },
    });
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-06.binding_evidence_invalid");
  });

  it("rejects null nested required evidence without manufacturing defaults", () => {
    for (const key of ["voltage", "current", "activePower", "phaseSystem"] as const) {
      const candidate = {
        ...singleInput(),
        [key]: null,
      } as unknown as G06ApparentPowerAndPowerFactorInput;
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result).not.toHaveProperty("value");
    }
  });

  it("requires an explicit uncertainty availability discriminator", () => {
    const result = failureOf({
      ...singleInput(),
      consistencyUncertainty: null,
    } as unknown as G06ApparentPowerAndPowerFactorInput);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-06.uncertainty_evidence_missing");
    expect(result).not.toHaveProperty("value");
  });

  it("returns deeply immutable success records and snapshots", () => {
    const result = successOf(singleInput());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.S)).toBe(true);
    expect(Object.isFrozen(result.value.PF)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
    expect(Object.isFrozen(result.electricalSnapshot)).toBe(true);
    expect(Object.isFrozen(result.electricalSnapshot.binding)).toBe(true);
    expect(Object.isFrozen(result.electricalSnapshot.phaseSystem)).toBe(true);
    expect(Object.isFrozen(result.consistency)).toBe(true);
    expect(Object.isFrozen(result.uncertaintySnapshot)).toBe(true);
    expect(Object.isFrozen(result.assumptions)).toBe(true);
  });

  it("keeps failures value-free for every controlled failure status", () => {
    const failures = [
      failureOf(singleInput({ activePowerW: 2301 })),
      failureOf(
        singleInput({ currentQuantityBasis: "fundamental_rms" }),
      ),
      failureOf(
        singleInput({
          currentBinding: { referencePlaneId: "other-plane" },
        }),
      ),
      failureOf(singleInput({ voltageV: Number.NaN })),
    ];
    expect(failures.map((entry) => entry.status).sort()).toEqual([
      "inconsistent_measurement",
      "insufficient_data",
      "invalid_input",
      "not_applicable",
    ]);
    for (const result of failures) {
      expect(result).not.toHaveProperty("value");
      expect(result).not.toHaveProperty("substitution");
      expect(result).not.toHaveProperty("electricalSnapshot");
      expect(result).not.toHaveProperty("consistency");
      expect(result).not.toHaveProperty("uncertaintySnapshot");
    }
  });
});
