import { describe, expect, it } from "vitest";

import {
  G10_BINARY64_MIN_NORMAL,
  G10_IDEAL_TRANSFORMER_MAPPING,
  G10_NUMERIC_REPRESENTABILITY_POLICY,
  G10_WARNING_PREDICATES,
  evaluateG10IdealMatchingTransformer,
  type G10IdealMatchingTransformerInput,
  type G10IdealMatchingTransformerOutcome,
  type G10IdealMatchingTransformerSuccess,
  type G10NonIdealEffectsEvidence,
  type G10PortEvidence,
  type G10SecondaryCurrentEvidence,
  type G10SecondaryImpedanceEvidence,
  type G10TopologyEvidence,
  type G10TurnsRatioEvidence,
} from "../../../src/methods/G/g10IdealMatchingTransformer.js";

const BASE_TOPOLOGY = Object.freeze({
  topologyId: "ideal_transformer",
  transformerId: "matching-transformer-01",
  modelRegime: "ideal_lossless_transformer",
  polarityConvention: "corresponding_positive_references",
} as const satisfies G10TopologyEvidence);

const BASE_RATIO = Object.freeze({
  turnsRatio: 2,
  ratioDefinition: "Np_over_Ns",
  primaryWindingId: "winding-primary-Np",
  secondaryWindingId: "winding-secondary-Ns",
  transformerId: "matching-transformer-01",
  sourceSnapshotId: "turns-ratio-snapshot-01",
} as const satisfies G10TurnsRatioEvidence);

const BASE_PRIMARY_PORT = Object.freeze({
  windingRole: "primary",
  portId: "transformer-primary-input-port",
  positiveTerminalId: "primary-dot-positive",
  negativeTerminalId: "primary-negative",
  referencePlaneId: "primary-winding-terminals",
  windingId: "winding-primary-Np",
  transformerId: "matching-transformer-01",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  designStateId: "hot-design-state-01",
  frequencyHz: 10_000,
  phasorTimeConvention: "exp_j_omega_t",
  currentReferenceDirection: "into_transformer_primary_receiving_port",
} as const satisfies G10PortEvidence);

const BASE_SECONDARY_PORT = Object.freeze({
  windingRole: "secondary",
  portId: "transformer-secondary-load-port",
  positiveTerminalId: "secondary-dot-positive",
  negativeTerminalId: "secondary-negative",
  referencePlaneId: "secondary-load-terminals",
  windingId: "winding-secondary-Ns",
  transformerId: "matching-transformer-01",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  designStateId: "hot-design-state-01",
  frequencyHz: 10_000,
  phasorTimeConvention: "exp_j_omega_t",
  currentReferenceDirection:
    "from_transformer_into_secondary_load_receiving_port",
} as const satisfies G10PortEvidence);

const BASE_NONIDEAL = Object.freeze({
  windingLoss: "explicitly_excluded_or_confirmed_negligible",
  leakageInductance: "explicitly_excluded_or_confirmed_negligible",
  magnetizingBranch: "explicitly_excluded_or_confirmed_negligible",
  coreLoss: "explicitly_excluded_or_confirmed_negligible",
  coreSaturation: "explicitly_excluded_or_confirmed_negligible",
  parasitics: "explicitly_excluded_or_confirmed_negligible",
  rectifierFactorUse: "none",
} as const satisfies G10NonIdealEffectsEvidence);

interface InputOverrides {
  readonly topology?: Partial<G10TopologyEvidence>;
  readonly turnsRatio?: Partial<G10TurnsRatioEvidence>;
  readonly primaryPort?: Partial<G10PortEvidence>;
  readonly secondaryPort?: Partial<G10PortEvidence>;
  readonly secondaryImpedance?: Partial<G10SecondaryImpedanceEvidence>;
  readonly nonIdealEffects?: Partial<G10NonIdealEffectsEvidence>;
  readonly secondaryCurrent?: null | Partial<G10SecondaryCurrentEvidence>;
}

function input(overrides: InputOverrides = {}): G10IdealMatchingTransformerInput {
  const topology = { ...BASE_TOPOLOGY, ...overrides.topology };
  const turnsRatio = { ...BASE_RATIO, ...overrides.turnsRatio };
  const primaryPort = { ...BASE_PRIMARY_PORT, ...overrides.primaryPort };
  const secondaryPort = { ...BASE_SECONDARY_PORT, ...overrides.secondaryPort };
  const secondaryBoundary = {
    portId: secondaryPort.portId,
    referencePlaneId: secondaryPort.referencePlaneId,
    transformerId: secondaryPort.transformerId,
    quantityBasis: secondaryPort.quantityBasis,
    loadedState: secondaryPort.loadedState,
    designStateId: secondaryPort.designStateId,
    frequencyHz: secondaryPort.frequencyHz,
  };
  return {
    topology,
    turnsRatio,
    primaryPort,
    secondaryPort,
    secondaryImpedance: {
      ...secondaryBoundary,
      realOhm: 0.1,
      imaginaryOhm: 0.2,
      sourceSnapshotId: "secondary-Z-snapshot-01",
      ...overrides.secondaryImpedance,
    },
    nonIdealEffects: { ...BASE_NONIDEAL, ...overrides.nonIdealEffects },
    secondaryCurrent:
      overrides.secondaryCurrent === undefined ||
      overrides.secondaryCurrent === null
        ? null
        : {
            ...secondaryBoundary,
            realA: 3,
            imaginaryA: -4,
            currentReferenceDirection:
              "from_transformer_into_secondary_load_receiving_port",
            sourceSnapshotId: "secondary-I-snapshot-01",
            ...overrides.secondaryCurrent,
          },
  } as G10IdealMatchingTransformerInput;
}

function successOf(
  candidate: G10IdealMatchingTransformerInput,
): G10IdealMatchingTransformerSuccess {
  const result = evaluateG10IdealMatchingTransformer(candidate);
  expect(result.status).toBe("success_with_warnings");
  if (result.status !== "success_with_warnings") {
    throw new Error(
      result.failure?.message ?? `Unexpected G-10 status: ${result.status}`,
    );
  }
  return result;
}

function failureOf(
  candidate: unknown,
): Exclude<
  G10IdealMatchingTransformerOutcome,
  G10IdealMatchingTransformerSuccess
> {
  const result = evaluateG10IdealMatchingTransformer(
    candidate as G10IdealMatchingTransformerInput,
  );
  expect(result.status).not.toBe("success_with_warnings");
  if (result.status === "success_with_warnings") {
    throw new Error("Expected G-10 failure.");
  }
  expect(result).not.toHaveProperty("value");
  expect(result).not.toHaveProperty("powerIdentity");
  expect(result).not.toHaveProperty("substitution");
  expect(result).not.toHaveProperty("inputSnapshot");
  expect(result).not.toHaveProperty("portBoundary");
  expect(result).not.toHaveProperty("solverResiduals");
  return result;
}

describe("G-10 frozen ideal matching transformer", () => {
  it("maps exactly to ID-Z-02, ADR-0007, DER-CIRCUIT and PWR-XFMR-001", () => {
    expect(G10_IDEAL_TRANSFORMER_MAPPING).toMatchObject({
      methodId: "G-10",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#G-10:Equation",
      applicabilityRef: "CALCULATION_CONTRACTS.md#G-10:Applicability",
      warningRef: "CALCULATION_CONTRACTS.md#G-10:Warning predicates",
      validationRef: "CALCULATION_CONTRACTS.md#G-10:Validation",
      sourceRefs: ["ID-Z-02"],
      contractSourceRefs: ["ID-Z-02", "ADR-0007", "DER-CIRCUIT"],
      derivationRefs: ["ID-Z-02", "DER-CIRCUIT"],
      validationCaseIds: ["PWR-XFMR-001"],
      methodCheckIds: [],
      outputQuantityIds: ["Zp", "Vp/Vs", "Is/Ip"],
      stableWarningIds: [],
    });
    expect(G10_WARNING_PREDICATES).toEqual({
      reversedTurnsRatio: "turns-ratio direction is reversed",
      crossTopologyRectifierFactor:
        "rectifier factor crosses topology boundaries",
      mixedFundamentalAndFullWave:
        "fundamental and full-wave port quantities are mixed",
      coreSaturationIgnored: "core saturation is ignored",
    });
  });

  it("freezes fail-closed binary64 policy without engineering calibration", () => {
    expect(G10_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(G10_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      swallowedNonzeroTermPolicy: "fail_closed",
      conservationResidualClamping: false,
      sourceEquationRearranged: false,
      minimumPositiveNormal: 2 ** -1022,
    });
  });

  it("passes PWR-XFMR-001 complex impedance transformation", () => {
    const result = successOf(input());
    expect(result.value.Zp.valueSi.realOhm).toBeCloseTo(0.4, 15);
    expect(result.value.Zp.valueSi.imaginaryOhm).toBeCloseTo(0.8, 15);
    expect(result.value["Vp/Vs"].valueSi).toBe(2);
    expect(result.value["Is/Ip"].valueSi).toBe(2);
    expect(result.substitution).toEqual({
      turnsRatioNpOverNs: 2,
      turnsRatioSquared: 4,
      secondaryImpedanceOhm: { realOhm: 0.1, imaginaryOhm: 0.2 },
    });
  });

  it("passes PWR-XFMR-001 complex-power conservation for compatible RMS phasors", () => {
    const result = successOf(input({ secondaryCurrent: {} }));
    expect(result.powerIdentity.kind).toBe("available");
    if (result.powerIdentity.kind !== "available") {
      throw new Error("Expected available power identity.");
    }
    expect(result.powerIdentity.secondaryCurrent).toEqual({
      realA: 3,
      imaginaryA: -4,
    });
    expect(result.powerIdentity.secondaryVoltage.realV).toBeCloseTo(1.1, 15);
    expect(result.powerIdentity.secondaryVoltage.imaginaryV).toBeCloseTo(0.2, 15);
    expect(result.powerIdentity.primaryVoltage.realV).toBeCloseTo(2.2, 15);
    expect(result.powerIdentity.primaryVoltage.imaginaryV).toBeCloseTo(0.4, 15);
    expect(result.powerIdentity.primaryCurrent).toEqual({
      realA: 1.5,
      imaginaryA: -2,
    });
    expect(result.powerIdentity.secondaryLoadComplexPower.realW).toBeCloseTo(
      2.5,
      14,
    );
    expect(
      result.powerIdentity.secondaryLoadComplexPower.reactiveVar,
    ).toBeCloseTo(5, 14);
    expect(result.powerIdentity.primaryInputComplexPower.realW).toBeCloseTo(
      2.5,
      14,
    );
    expect(
      result.powerIdentity.primaryInputComplexPower.reactiveVar,
    ).toBeCloseTo(5, 14);
    expect(result.powerIdentity.conservationResidual.realW).toBe(0);
    expect(result.powerIdentity.conservationResidual.reactiveVar).toBe(0);
  });

  it("does not invent port phasors when optional secondary current is absent", () => {
    const result = successOf(input());
    expect(result.powerIdentity).toEqual({
      kind: "not_requested",
      status: "not_applicable",
      reason: "secondaryCurrent was null",
    });
    expect(result.solverResiduals.powerResidualAvailable).toBe(false);
  });

  it("handles arbitrary compatible complex phasors without changing the impedance route", () => {
    const result = successOf(
      input({
        turnsRatio: { turnsRatio: 3 },
        secondaryImpedance: { realOhm: 2, imaginaryOhm: -0.5 },
        secondaryCurrent: { realA: -1.25, imaginaryA: 0.75 },
      }),
    );
    expect(result.value.Zp.valueSi).toEqual({
      realOhm: 18,
      imaginaryOhm: -4.5,
    });
    expect(result.powerIdentity.kind).toBe("available");
    if (result.powerIdentity.kind === "available") {
      expect(result.powerIdentity.primaryVoltage.realV).toBeCloseTo(-6.375, 14);
      expect(result.powerIdentity.primaryVoltage.imaginaryV).toBeCloseTo(6.375, 14);
      expect(result.powerIdentity.primaryCurrent.realA).toBeCloseTo(
        -1.25 / 3,
        14,
      );
      expect(result.powerIdentity.primaryCurrent.imaginaryA).toBeCloseTo(
        0.75 / 3,
        14,
      );
      expect(Math.abs(result.powerIdentity.conservationResidual.realW)).toBeLessThan(
        1e-12,
      );
      expect(
        Math.abs(result.powerIdentity.conservationResidual.reactiveVar),
      ).toBeLessThan(1e-12);
    }
  });

  it.each([
    [0.5, 0.25],
    [1, 1],
    [2, 4],
    [10, 100],
  ] as const)("passes exact n^2 impedance scaling for n=%s", (turnsRatio, scale) => {
    const result = successOf(input({ turnsRatio: { turnsRatio } }));
    expect(result.value.Zp.valueSi.realOhm).toBeCloseTo(0.1 * scale, 14);
    expect(result.value.Zp.valueSi.imaginaryOhm).toBeCloseTo(0.2 * scale, 14);
    expect(result.value["Vp/Vs"].valueSi).toBe(turnsRatio);
    expect(result.value["Is/Ip"].valueSi).toBe(turnsRatio);
  });

  it("preserves the complex impedance angle under positive n^2 scaling", () => {
    const result = successOf(
      input({ secondaryImpedance: { realOhm: -3, imaginaryOhm: 4 } }),
    );
    expect(Math.atan2(result.value.Zp.valueSi.imaginaryOhm, result.value.Zp.valueSi.realOhm)).toBe(
      Math.atan2(4, -3),
    );
  });

  it("preserves the ideal short-circuit Zs=0 limit without placeholders", () => {
    const result = successOf(
      input({ secondaryImpedance: { realOhm: 0, imaginaryOhm: 0 } }),
    );
    expect(result.value.Zp.valueSi).toEqual({ realOhm: 0, imaginaryOhm: 0 });
  });

  it("preserves the zero-current complex-power limit", () => {
    const result = successOf(
      input({ secondaryCurrent: { realA: 0, imaginaryA: 0 } }),
    );
    expect(result.powerIdentity.kind).toBe("available");
    if (result.powerIdentity.kind === "available") {
      expect(result.powerIdentity.secondaryVoltage).toEqual({
        realV: 0,
        imaginaryV: 0,
      });
      expect(result.powerIdentity.secondaryLoadComplexPower).toEqual({
        realW: 0,
        reactiveVar: 0,
      });
      expect(result.powerIdentity.conservationResidual).toEqual({
        realW: 0,
        reactiveVar: 0,
      });
    }
  });

  it("accepts rms when both ports and secondary evidence use rms", () => {
    const result = successOf(
      input({
        primaryPort: { quantityBasis: "rms" },
        secondaryPort: { quantityBasis: "rms" },
      }),
    );
    expect(result.inputSnapshot.quantityBasis).toBe("rms");
  });

  it("always exposes the frozen core-saturation limitation", () => {
    const result = successOf(input());
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "G-10.core_saturation_excluded_ideal_model",
        guardedPredicateRef: "core saturation is ignored",
      }),
    ]);
    expect(result.status).toBe("success_with_warnings");
  });

  it("retains topology, ratio direction, both ports and source snapshots", () => {
    const result = successOf(input({ secondaryCurrent: {} }));
    expect(result.inputSnapshot).toEqual({
      topologyId: "ideal_transformer",
      modelRegime: "ideal_lossless_transformer",
      transformerId: "matching-transformer-01",
      ratioDefinition: "Np_over_Ns",
      primaryWindingId: "winding-primary-Np",
      secondaryWindingId: "winding-secondary-Ns",
      primaryPortId: "transformer-primary-input-port",
      secondaryPortId: "transformer-secondary-load-port",
      primaryReferencePlaneId: "primary-winding-terminals",
      secondaryReferencePlaneId: "secondary-load-terminals",
      quantityBasis: "fundamental_rms",
      loadedState: "workpiece_hot",
      designStateId: "hot-design-state-01",
      frequencyHz: 10_000,
      phasorTimeConvention: "exp_j_omega_t",
      polarityConvention: "corresponding_positive_references",
      turnsRatioSourceSnapshotId: "turns-ratio-snapshot-01",
      secondaryImpedanceSourceSnapshotId: "secondary-Z-snapshot-01",
      secondaryCurrentSourceSnapshotId: "secondary-I-snapshot-01",
    });
  });

  it("publishes the frozen analytical trace without a solver claim", () => {
    const result = successOf(input({ secondaryCurrent: {} }));
    expect(result.equations).toEqual([
      "n = Np/Ns = Vp/Vs = Is/Ip",
      "Zp = n^2*Zs",
      "Vp = n*Vs; Ip = Is/n",
      "Sp = Vp*conj(Ip) = Vs*conj(Is) = Ss",
    ]);
    expect(result.solverResiduals).toEqual({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
      powerResidualAvailable: true,
      powerResidualClamped: false,
    });
    expect(result.engineeringPrecision).toEqual({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_input_precision_and_ideal_model_applicability",
    });
  });

  it("keeps successful records deeply immutable", () => {
    const result = successOf(input({ secondaryCurrent: {} }));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Zp.valueSi)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.inputSnapshot)).toBe(true);
    expect(Object.isFrozen(result.portBoundary.excludedEffects)).toBe(true);
    expect(Object.isFrozen(result.powerIdentity)).toBe(true);
  });

  it("does not mutate the caller input", () => {
    const candidate = input({ secondaryCurrent: {} });
    const before = structuredClone(candidate);
    evaluateG10IdealMatchingTransformer(candidate);
    expect(candidate).toEqual(before);
  });

  it.each([
    "series_rlc_single_loop",
    "parallel_ideal_r_l_c_branches",
    "parallel_c_with_series_rl_load",
    "llc_zjl_fig2_6_fundamental_equivalent",
  ] as const)("rejects controlled non-transformer topology %s", (topologyId) => {
    const result = failureOf(input({ topology: { topologyId } }));
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-10.topology_not_applicable");
  });

  it.each(["unknown_or_unconfirmed", "transformer", "matching", "LLC"])(
    "does not guess unknown/text topology %s",
    (topologyId) => {
      const candidate = input() as unknown as Record<string, any>;
      candidate.topology = { ...candidate.topology, topologyId };
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe("G-10.topology_unknown");
    },
  );

  it.each([
    ["modelRegime", "unknown_or_unconfirmed", "insufficient_data", "G-10.model_regime_unknown"],
    ["modelRegime", "nonideal_transformer", "not_applicable", "G-10.model_regime_not_applicable"],
    ["polarityConvention", "unknown_or_unconfirmed", "insufficient_data", "G-10.polarity_unknown"],
    ["polarityConvention", "reversed_or_opposed_references", "not_applicable", "G-10.polarity_not_applicable"],
  ] as const)("fails closed for topology field %s=%s", (field, value, status, code) => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.topology = { ...candidate.topology, [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it.each([
    "windingLoss",
    "leakageInductance",
    "magnetizingBranch",
    "coreLoss",
    "coreSaturation",
    "parasitics",
  ] as const)("rejects unconfirmed nonideal effect %s", (field) => {
    const result = failureOf(
      input({ nonIdealEffects: { [field]: "unknown_or_unconfirmed" } }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-10.nonideal_effects_unknown");
  });

  it.each([
    "windingLoss",
    "leakageInductance",
    "magnetizingBranch",
    "coreLoss",
    "coreSaturation",
    "parasitics",
  ] as const)("rejects material nonideal effect %s", (field) => {
    const result = failureOf(
      input({ nonIdealEffects: { [field]: "present_or_material" } }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-10.nonideal_effects_present");
  });

  it.each([
    ["unknown_or_unconfirmed", "insufficient_data", "G-10.rectifier_factor_unknown"],
    ["applied_or_requested", "not_applicable", "G-10.rectifier_factor_not_applicable"],
  ] as const)("fails closed for rectifier factor use %s", (rectifierFactorUse, status, code) => {
    const result = failureOf(input({ nonIdealEffects: { rectifierFactorUse } }));
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it("prioritizes a known material core effect over an earlier unknown winding-loss exclusion", () => {
    const result = failureOf(
      input({
        nonIdealEffects: {
          windingLoss: "unknown_or_unconfirmed",
          coreLoss: "present_or_material",
        },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-10.nonideal_effects_present");
  });

  it("prioritizes known rectifier-factor use over an earlier unknown winding-loss exclusion", () => {
    const result = failureOf(
      input({
        nonIdealEffects: {
          windingLoss: "unknown_or_unconfirmed",
          rectifierFactorUse: "applied_or_requested",
        },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe(
      "G-10.rectifier_factor_not_applicable",
    );
  });

  it("validates every nonideal-effect enum before an earlier unknown exclusion", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.nonIdealEffects = {
      ...candidate.nonIdealEffects,
      windingLoss: "unknown_or_unconfirmed",
      coreSaturation: "bogus_later_enum",
    };
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-10.nonideal_effects_invalid");
  });

  it.each([
    ["ratioDefinition", "unknown_or_unconfirmed", "insufficient_data", "G-10.turns_ratio_direction_unknown"],
    ["ratioDefinition", "Ns_over_Np", "not_applicable", "G-10.turns_ratio_reversed"],
  ] as const)("fails closed for ratio definition %s", (field, value, status, code) => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.turnsRatio = { ...candidate.turnsRatio, [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MIN_VALUE])(
    "rejects invalid turns ratio %s",
    (turnsRatio) => {
      const result = failureOf(input({ turnsRatio: { turnsRatio } }));
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-10.turns_ratio_invalid");
    },
  );

  it("rejects identical primary and secondary winding IDs", () => {
    const result = failureOf(
      input({ turnsRatio: { secondaryWindingId: "winding-primary-Np" } }),
    );
    expect(result.failure.code).toBe("G-10.turns_ratio_invalid");
  });

  it.each(["primaryPort", "secondaryPort"] as const)(
    "returns insufficient_data for absent %s",
    (field) => {
      const candidate = input() as unknown as Record<string, unknown>;
      candidate[field] = null;
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe(
        field === "primaryPort"
          ? "G-10.primary_port_missing"
          : "G-10.secondary_port_missing",
      );
    },
  );

  it.each(["peak", "full_wave_rms", "dc", "average", "local", "total"] as const)(
    "rejects non-phasor primary port basis %s",
    (quantityBasis) => {
      const result = failureOf(input({ primaryPort: { quantityBasis } }));
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe("G-10.port_basis_not_applicable");
    },
  );

  it("rejects fundamental/full-wave or rms/fundamental mixing between ports", () => {
    const mixedFullWave = failureOf(
      input({ secondaryPort: { quantityBasis: "full_wave_rms" } }),
    );
    expect(mixedFullWave.failure.code).toBe("G-10.port_basis_not_applicable");

    const mixedRms = failureOf(
      input({ primaryPort: { quantityBasis: "rms" } }),
    );
    expect(mixedRms.status).toBe("not_applicable");
    expect(mixedRms.failure.code).toBe("G-10.port_basis_not_applicable");
  });

  it.each([
    ["windingRole", "unknown_or_unconfirmed", "G-10.port_role_unknown"],
    ["quantityBasis", "unknown_or_unconfirmed", "G-10.port_basis_unknown"],
    ["loadedState", "unknown_or_unconfirmed", "G-10.port_loaded_state_unknown"],
    ["phasorTimeConvention", "other_or_unconfirmed", "G-10.port_convention_unknown"],
    ["currentReferenceDirection", "other_or_unconfirmed", "G-10.port_direction_unknown"],
  ] as const)("returns insufficient_data for unconfirmed port field %s", (field, value, code) => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.primaryPort = { ...candidate.primaryPort, [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(code);
  });

  it("rejects swapped port roles and directions", () => {
    const role = failureOf(input({ primaryPort: { windingRole: "secondary" } }));
    expect(role.failure.code).toBe("G-10.port_role_mismatch");

    const direction = failureOf(
      input({
        primaryPort: {
          currentReferenceDirection:
            "from_transformer_into_secondary_load_receiving_port",
        },
      }),
    );
    expect(direction.failure.code).toBe("G-10.port_direction_not_applicable");
  });

  it.each([
    ["transformerId", "other-transformer"],
    ["windingId", "other-primary-winding"],
    ["loadedState", "workpiece_cold"],
    ["designStateId", "other-state"],
    ["frequencyHz", 20_000],
    ["portId", "transformer-secondary-load-port"],
  ] as const)("rejects incompatible primary/secondary boundary field %s", (field, value) => {
    const result = failureOf(
      input({ primaryPort: { [field]: value } as Partial<G10PortEvidence> }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-10.port_boundary_mismatch");
  });

  it("returns insufficient_data for absent secondary impedance", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.secondaryImpedance = null;
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-10.secondary_impedance_missing");
  });

  it.each([
    ["realOhm", Number.NaN],
    ["realOhm", Number.POSITIVE_INFINITY],
    ["realOhm", Number.MIN_VALUE],
    ["imaginaryOhm", Number.NaN],
    ["imaginaryOhm", Number.NEGATIVE_INFINITY],
    ["imaginaryOhm", -Number.MIN_VALUE],
  ] as const)("rejects invalid secondary impedance component %s=%s", (field, value) => {
    const result = failureOf(
      input({
        secondaryImpedance: {
          [field]: value,
        } as Partial<G10SecondaryImpedanceEvidence>,
      }),
    );
    expect(result.failure.code).toBe("G-10.secondary_impedance_invalid");
  });

  it.each([
    ["portId", "other-port"],
    ["referencePlaneId", "other-plane"],
    ["transformerId", "other-transformer"],
    ["quantityBasis", "rms"],
    ["loadedState", "workpiece_cold"],
    ["designStateId", "other-state"],
    ["frequencyHz", 20_000],
  ] as const)("rejects secondary impedance boundary mismatch %s", (field, value) => {
    const result = failureOf(
      input({
        secondaryImpedance: {
          [field]: value,
        } as Partial<G10SecondaryImpedanceEvidence>,
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-10.secondary_impedance_boundary_mismatch",
    );
  });

  it.each([
    ["realA", Number.NaN],
    ["realA", Number.POSITIVE_INFINITY],
    ["realA", Number.MIN_VALUE],
    ["imaginaryA", Number.NaN],
    ["imaginaryA", Number.NEGATIVE_INFINITY],
    ["imaginaryA", -Number.MIN_VALUE],
  ] as const)("rejects invalid optional secondary current %s=%s", (field, value) => {
    const result = failureOf(
      input({
        secondaryCurrent: {
          [field]: value,
        } as Partial<G10SecondaryCurrentEvidence>,
      }),
    );
    expect(result.failure.code).toBe("G-10.secondary_current_invalid");
  });

  it("rejects optional current at another secondary snapshot", () => {
    const result = failureOf(
      input({ secondaryCurrent: { designStateId: "other-state" } }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-10.secondary_current_boundary_mismatch");
  });

  it("rejects optional current with reversed secondary direction", () => {
    const candidate = input({ secondaryCurrent: {} }) as unknown as Record<
      string,
      any
    >;
    candidate.secondaryCurrent = {
      ...candidate.secondaryCurrent,
      currentReferenceDirection: "into_transformer_primary_receiving_port",
    };
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-10.port_direction_not_applicable");
  });

  it("classifies an uncontrolled optional-current direction as malformed input", () => {
    const candidate = input({ secondaryCurrent: {} }) as unknown as Record<
      string,
      any
    >;
    candidate.secondaryCurrent = {
      ...candidate.secondaryCurrent,
      currentReferenceDirection: "secondary-ish",
    };
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-10.secondary_current_invalid");
  });

  it.each([1e200, 1e-200])("rejects n^2 overflow/underflow for n=%s", (turnsRatio) => {
    const result = failureOf(input({ turnsRatio: { turnsRatio } }));
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects referred-impedance overflow", () => {
    const result = failureOf(
      input({
        turnsRatio: { turnsRatio: 1e100 },
        secondaryImpedance: { realOhm: 1e200, imaginaryOhm: 0 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects referred-impedance positive-subnormal underflow", () => {
    const result = failureOf(
      input({
        turnsRatio: { turnsRatio: 1e-100 },
        secondaryImpedance: { realOhm: 1e-200, imaginaryOhm: 0 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects optional primary-voltage overflow", () => {
    const result = failureOf(
      input({
        turnsRatio: { turnsRatio: 1e100 },
        secondaryImpedance: { realOhm: 1, imaginaryOhm: 0 },
        secondaryCurrent: { realA: 1e250, imaginaryA: 0 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects optional primary-current positive-subnormal underflow", () => {
    const result = failureOf(
      input({
        turnsRatio: { turnsRatio: 1e100 },
        secondaryImpedance: { realOhm: 0, imaginaryOhm: 0 },
        secondaryCurrent: { realA: 1e-300, imaginaryA: 0 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects optional complex-power overflow", () => {
    const result = failureOf(
      input({
        turnsRatio: { turnsRatio: 1 },
        secondaryImpedance: { realOhm: 1e100, imaginaryOhm: 0 },
        secondaryCurrent: { realA: 1e110, imaginaryA: 0 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_resolution_invalid");
  });

  it("rejects a swallowed nonzero term in complex phasor multiplication", () => {
    const result = failureOf(
      input({
        secondaryImpedance: { realOhm: 1, imaginaryOhm: 1e-100 },
        secondaryCurrent: { realA: 1, imaginaryA: 1 },
      }),
    );
    expect(result.failure.code).toBe("G-10.numeric_term_swallowed");
  });

  it.each([
    null,
    undefined,
    0,
    "transformer",
    [],
    {},
    { ...input(), extra: true },
  ])("rejects malformed top-level input %#", (candidate) => {
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-10.input_schema_invalid");
  });

  it("does not execute a hostile top-level accessor", () => {
    let calls = 0;
    const candidate = input() as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, "topology", {
      enumerable: true,
      get() {
        calls += 1;
        return BASE_TOPOLOGY;
      },
    });
    const result = failureOf(candidate);
    expect(calls).toBe(0);
    expect(result.failure.code).toBe("G-10.input_schema_invalid");
  });

  it("does not execute a hostile nested accessor", () => {
    let calls = 0;
    const candidate = input() as unknown as Record<string, any>;
    const ratio = { ...candidate.turnsRatio };
    Object.defineProperty(ratio, "turnsRatio", {
      enumerable: true,
      get() {
        calls += 1;
        return 2;
      },
    });
    candidate.turnsRatio = ratio;
    const result = failureOf(candidate);
    expect(calls).toBe(0);
    expect(result.failure.code).toBe("G-10.turns_ratio_invalid");
  });

  it("rejects symbol-key smuggling", () => {
    const candidate = input() as unknown as Record<string | symbol, unknown>;
    candidate[Symbol("hidden") as symbol] = "rectifier-factor";
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-10.input_schema_invalid");
  });

  it("rejects custom-prototype secondary impedance evidence", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.secondaryImpedance = Object.assign(
      Object.create({ hidden: "historical-factor" }),
      candidate.secondaryImpedance,
    );
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-10.secondary_impedance_invalid");
  });

  it("catches hostile Proxy reflection traps and fails closed", () => {
    const candidate = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile reflection");
      },
    });
    expect(() => evaluateG10IdealMatchingTransformer(candidate)).not.toThrow();
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-10.input_schema_invalid");
  });

  it("never emits values, evidence or placeholders on failure", () => {
    const result = failureOf(
      input({ turnsRatio: { ratioDefinition: "Ns_over_Np" } }),
    );
    expect(Object.keys(result).sort()).toEqual([
      "applicabilityStatus",
      "failure",
      "methodApproval",
      "methodId",
      "methodVersion",
      "status",
      "warningIds",
      "warnings",
    ]);
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity|valueSi|snapshot/i);
  });
});
