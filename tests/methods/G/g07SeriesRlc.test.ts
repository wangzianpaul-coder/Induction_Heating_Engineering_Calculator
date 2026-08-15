import { describe, expect, it } from "vitest";

import {
  G07_BINARY64_MIN_NORMAL,
  G07_METHOD_CHECK_IDS,
  G07_NUMERIC_REPRESENTABILITY_POLICY,
  G07_SERIES_RLC_MAPPING,
  G07_WARNING_PREDICATES,
  evaluateG07SeriesRlc,
  type G07CapacitanceEvidence,
  type G07InductanceEvidence,
  type G07PortEvidence,
  type G07ResistanceEvidence,
  type G07SeriesRlcInput,
  type G07SeriesRlcOutcome,
  type G07SeriesRlcSuccess,
  type G07TopologyEvidence,
} from "../../../src/methods/G/g07SeriesRlc.js";

const BASE_TOPOLOGY = Object.freeze({
  topologyId: "series_rlc_single_loop",
  seriesNetworkId: "series-tank-01",
  networkModelRegime: "ideal_lumped_linear_single_frequency",
  parasiticAssessment: "confirmed_negligible_for_intended_use",
} as const satisfies G07TopologyEvidence);

const BASE_PORT = Object.freeze({
  portId: "tank-input-port",
  positiveTerminalId: "tank-in-positive",
  negativeTerminalId: "tank-in-negative",
  referencePlaneId: "deembedded-tank-input-plane",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  designStateId: "hot-design-state-01",
  frequencyHz: 10_000,
  phasorTimeConvention: "exp_j_omega_t",
  currentDirection: "into_passive_port",
} as const satisfies G07PortEvidence);

interface InputOverrides {
  readonly topology?: Partial<G07TopologyEvidence>;
  readonly port?: Partial<G07PortEvidence>;
  readonly resistance?: Partial<G07ResistanceEvidence>;
  readonly inductance?: Partial<G07InductanceEvidence>;
  readonly capacitance?: Partial<G07CapacitanceEvidence>;
}

function input(overrides: InputOverrides = {}): G07SeriesRlcInput {
  const topology = { ...BASE_TOPOLOGY, ...overrides.topology };
  const port = { ...BASE_PORT, ...overrides.port };
  const boundary = {
    frequencyHz: port.frequencyHz,
    portId: port.portId,
    referencePlaneId: port.referencePlaneId,
    loadedState: port.loadedState,
    designStateId: port.designStateId,
    seriesNetworkId: topology.seriesNetworkId,
  };
  return {
    topology,
    port,
    resistance: {
      ...boundary,
      resistanceOhm: 0.05,
      sourceSnapshotId: "R-hot-snapshot-01",
      ...overrides.resistance,
    },
    inductance: {
      ...boundary,
      inductanceH: 10e-6,
      stateRoute: "loaded_design_state",
      sourceSnapshotId: "L-hot-snapshot-01",
      ...overrides.inductance,
    },
    capacitance: {
      ...boundary,
      capacitanceF: 25e-6,
      sourceSnapshotId: "C-design-snapshot-01",
      ...overrides.capacitance,
    },
  } as G07SeriesRlcInput;
}

function successOf(candidate: G07SeriesRlcInput): G07SeriesRlcSuccess {
  const result = evaluateG07SeriesRlc(candidate);
  expect(result.status).toBe("success_with_warnings");
  if (result.status !== "success_with_warnings") {
    throw new Error(
      result.failure?.message ?? `Unexpected G-07 status: ${result.status}`,
    );
  }
  return result;
}

function failureOf(candidate: unknown): Exclude<G07SeriesRlcOutcome, G07SeriesRlcSuccess> {
  const result = evaluateG07SeriesRlc(candidate as G07SeriesRlcInput);
  expect(result.status).not.toBe("success_with_warnings");
  if (result.status === "success_with_warnings") {
    throw new Error("Expected G-07 failure.");
  }
  expect(result).not.toHaveProperty("value");
  expect(result).not.toHaveProperty("substitution");
  expect(result).not.toHaveProperty("inputSnapshot");
  expect(result).not.toHaveProperty("materialProperties");
  expect(result).not.toHaveProperty("solverResiduals");
  expect(result).not.toHaveProperty("portBoundary");
  return result;
}

function directValues(candidate: G07SeriesRlcInput) {
  const omega = 2 * Math.PI * candidate.port.frequencyHz;
  const imaginaryOhm =
    omega * candidate.inductance.inductanceH -
    1 / (omega * candidate.capacitance.capacitanceF);
  return {
    omega,
    imaginaryOhm,
    f0:
      1 /
      (2 *
        Math.PI *
        Math.sqrt(
          candidate.inductance.inductanceH *
            candidate.capacitance.capacitanceF,
        )),
    cForF: 1 / (omega * omega * candidate.inductance.inductanceH),
  };
}

describe("G-07 frozen series RLC", () => {
  it("maps only to the frozen registry, controlled derivation, and method check", () => {
    expect(G07_SERIES_RLC_MAPPING).toMatchObject({
      methodId: "G-07",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#G-07:Equation",
      applicabilityRef: "CALCULATION_CONTRACTS.md#G-07:Applicability",
      warningRef: "CALCULATION_CONTRACTS.md#G-07:Warning predicates",
      validationRef: "CALCULATION_CONTRACTS.md#G-07:Validation",
      sourceRefs: ["ID-RLC-01", "PRIMARY-TEXTBOOK-COPY-REQUIRED"],
      contractSourceRefs: [
        "ID-RLC-01",
        "DER-CIRCUIT",
        "primary textbook page missing",
      ],
      derivationRefs: ["ID-RLC-01", "DER-CIRCUIT"],
      validationCaseIds: [],
      methodCheckIds: ["ELEC-RLC-S-001"],
      outputQuantityIds: ["Zs", "f0", "C_for_f"],
      stableWarningIds: [],
    });
    expect(G07_METHOD_CHECK_IDS).toEqual(["ELEC-RLC-S-001"]);
    expect(G07_WARNING_PREDICATES).toEqual({
      topologyUnknown: "topology is unknown",
      unloadedInductanceWithoutWarning:
        "unloaded L replaces hot loaded L without warning",
      parallelOrLlcMisroute:
        "parallel or LLC topology uses the series method",
      parasiticsIgnored: "parasitics are ignored",
    });
  });

  it("freezes a machine-only numeric policy without engineering calibration", () => {
    expect(G07_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(G07_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      swallowedNonzeroReactiveTermPolicy: "fail_closed",
      resonanceResidualClamping: false,
      sourceEquationRearranged: false,
      minimumPositiveNormal: 2 ** -1022,
    });
  });

  it("implements the canonical-SI direct series impedance and both resonance identities", () => {
    const candidate = input();
    const direct = directValues(candidate);
    const result = successOf(candidate);

    expect(result.value.Zs.valueSi.realOhm).toBe(0.05);
    expect(result.value.Zs.valueSi.imaginaryOhm).toBe(direct.imaginaryOhm);
    expect(result.value.f0.valueSi).toBe(direct.f0);
    expect(result.value.C_for_f.valueSi).toBe(direct.cForF);
    expect(result.substitution.angularFrequencyRadPerS).toBe(direct.omega);
    expect(result.solverResiduals.operatingReactiveResidualOhm).toBe(
      direct.imaginaryOhm,
    );
    expect(result.solverResiduals.resonanceResidualClamped).toBe(false);
  });

  it("reports controlled dimensions, units, interpretations, and RMS phasor convention", () => {
    const result = successOf(input());
    expect(result.value.Zs).toMatchObject({
      outputId: "Zs",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "series_rlc_input_impedance",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    });
    expect(result.value.f0).toMatchObject({
      outputId: "f0",
      dimensionId: "frequency",
      canonicalUnitId: "Hz",
    });
    expect(result.value.C_for_f).toMatchObject({
      outputId: "C_for_f",
      dimensionId: "capacitance",
      canonicalUnitId: "F",
    });
  });

  it("preserves the PWR-SER-001 rounded datum residual instead of clamping it", () => {
    const candidate = input({ capacitance: { capacitanceF: 25.33029591e-6 } });
    const direct = directValues(candidate);
    const result = successOf(candidate);

    expect(direct.imaginaryOhm).toBeCloseTo(-1.44969591886479e-11, 23);
    expect(Math.abs(direct.imaginaryOhm)).toBeGreaterThan(1e-12);
    expect(result.value.Zs.valueSi.imaginaryOhm).toBe(direct.imaginaryOhm);
    expect(result.value.Zs.valueSi.imaginaryOhm).not.toBe(0);
    expect(result.value.f0.valueSi).toBeCloseTo(10_000.0000001154, 9);
  });

  it("closes the PWR-SER-001 analytical resonance limit using the frozen C_for_f identity", () => {
    const provisional = successOf(input());
    const result = successOf(
      input({ capacitance: { capacitanceF: provisional.value.C_for_f.valueSi } }),
    );
    expect(Math.abs(result.value.Zs.valueSi.imaginaryOhm)).toBeLessThanOrEqual(
      1e-12,
    );
    expect(result.value.Zs.valueSi.realOhm).toBe(0.05);
    expect(result.value.C_for_f.valueSi).toBe(
      provisional.value.C_for_f.valueSi,
    );
  });

  it("passes PWR-SER-002 below/above-resonance reactance signs", () => {
    const f0 = 10_000;
    const inductanceH = 10e-6;
    const capacitanceF = 1 / ((2 * Math.PI * f0) ** 2 * inductanceH);
    const below = successOf(
      input({
        port: { frequencyHz: 0.8 * f0 },
        inductance: { inductanceH },
        capacitance: { capacitanceF },
      }),
    );
    const above = successOf(
      input({
        port: { frequencyHz: 1.2 * f0 },
        inductance: { inductanceH },
        capacitance: { capacitanceF },
      }),
    );
    expect(below.value.Zs.valueSi.imaginaryOhm).toBeLessThan(0);
    expect(above.value.Zs.valueSi.imaginaryOhm).toBeGreaterThan(0);
    expect(below.value.f0.valueSi).toBeCloseTo(f0, 11);
    expect(above.value.f0.valueSi).toBeCloseTo(f0, 11);
  });

  it("passes the dimensional f^-2 capacitance scaling identity", () => {
    const base = successOf(input({ port: { frequencyHz: 8_000 } }));
    const scaled = successOf(input({ port: { frequencyHz: 32_000 } }));
    expect(scaled.value.C_for_f.valueSi).toBeCloseTo(
      base.value.C_for_f.valueSi / 16,
      14,
    );
  });

  it("passes the dimensional (L*C)^-1/2 natural-frequency scaling identity", () => {
    const base = successOf(input());
    const scaled = successOf(
      input({
        inductance: { inductanceH: 40e-6 },
        capacitance: { capacitanceF: 100e-6 },
      }),
    );
    expect(scaled.value.f0.valueSi).toBeCloseTo(
      base.value.f0.valueSi / 4,
      13,
    );
  });

  it("keeps f0 invariant when L and C are inversely scaled", () => {
    const base = successOf(input());
    const scaled = successOf(
      input({
        inductance: { inductanceH: 50e-6 },
        capacitance: { capacitanceF: 5e-6 },
      }),
    );
    expect(scaled.value.f0.valueSi).toBeCloseTo(base.value.f0.valueSi, 13);
  });

  it("allows the frozen passive ideal limit R=0 without inventing a finite-Q result", () => {
    const result = successOf(input({ resistance: { resistanceOhm: 0 } }));
    expect(result.value.Zs.valueSi.realOhm).toBe(0);
    expect(result.value.Zs.valueSi.imaginaryOhm).toBe(
      directValues(input({ resistance: { resistanceOhm: 0 } })).imaginaryOhm,
    );
    expect(Object.keys(result.value)).toEqual(["Zs", "f0", "C_for_f"]);
  });

  it("always exposes the ideal-model parasitic limitation after confirmation", () => {
    const result = successOf(input());
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: "G-07.parasitics_excluded_after_negligibility_confirmation",
      guardedPredicateRef: "parasitics are ignored",
    });
    expect(result.status).toBe("success_with_warnings");
  });

  it("allows an explicit unloaded reference only with a non-silent warning", () => {
    const result = successOf(
      input({
        port: {
          loadedState: "empty",
          designStateId: "empty-reference-state-01",
        },
        inductance: { stateRoute: "unloaded_reference_only" },
      }),
    );
    expect(result.warnings.map(({ code }) => code)).toEqual([
      "G-07.parasitics_excluded_after_negligibility_confirmation",
      "G-07.unloaded_inductance_reference_only",
    ]);
    expect(result.inputSnapshot.loadedState).toBe("empty");
    expect(result.inputSnapshot.inductanceStateRoute).toBe(
      "unloaded_reference_only",
    );
  });

  it("does not attach the unloaded-L warning to a confirmed loaded design state", () => {
    const result = successOf(input());
    expect(result.inputSnapshot.loadedState).toBe("workpiece_hot");
    expect(result.inputSnapshot.inductanceStateRoute).toBe(
      "loaded_design_state",
    );
    expect(
      result.warnings.some(
        ({ code }) => code === "G-07.unloaded_inductance_reference_only",
      ),
    ).toBe(false);
  });

  it("retains the explicit port, state, topology, and property-source snapshot", () => {
    const result = successOf(input());
    expect(result.inputSnapshot).toEqual({
      topologyId: "series_rlc_single_loop",
      seriesNetworkId: "series-tank-01",
      portId: "tank-input-port",
      positiveTerminalId: "tank-in-positive",
      negativeTerminalId: "tank-in-negative",
      referencePlaneId: "deembedded-tank-input-plane",
      quantityBasis: "fundamental_rms",
      loadedState: "workpiece_hot",
      designStateId: "hot-design-state-01",
      frequencyHz: 10_000,
      phasorTimeConvention: "exp_j_omega_t",
      currentDirection: "into_passive_port",
      inductanceStateRoute: "loaded_design_state",
      resistanceSourceSnapshotId: "R-hot-snapshot-01",
      inductanceSourceSnapshotId: "L-hot-snapshot-01",
      capacitanceSourceSnapshotId: "C-design-snapshot-01",
    });
  });

  it("publishes an analytical trace without pretending to have solver residuals", () => {
    const result = successOf(input());
    expect(result.equations).toEqual([
      "omega = 2*pi*f",
      "Z_s = R + j*(omega*L - 1/(omega*C))",
      "f_0 = 1/(2*pi*sqrt(L*C))",
      "C_for_f = 1/((2*pi*f)^2*L)",
    ]);
    expect(result.materialProperties).toEqual([]);
    expect(result.solverResiduals).toMatchObject({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
      resonanceResidualClamped: false,
    });
    expect(result.engineeringPrecision).toEqual({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim: "limited_by_input_precision_and_model_applicability",
    });
  });

  it("does not claim a Recommended result absent a frozen recommendation policy", () => {
    const result = successOf(input());
    expect(result.recommendation.eligibility).toBeNull();
    expect(result.recommendation.reason).toContain(
      "No explicit Recommended policy",
    );
  });

  it("keeps all successful records deeply immutable", () => {
    const result = successOf(input());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Zs)).toBe(true);
    expect(Object.isFrozen(result.value.Zs.valueSi)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.inputSnapshot)).toBe(true);
    expect(Object.isFrozen(result.portBoundary.excludedTopologies)).toBe(true);
  });

  it("does not mutate the caller input", () => {
    const candidate = input();
    const before = structuredClone(candidate);
    evaluateG07SeriesRlc(candidate);
    expect(candidate).toEqual(before);
  });

  it.each([
    "parallel_ideal_r_l_c_branches",
    "parallel_c_with_series_rl_load",
    "llc_zjl_fig2_6_fundamental_equivalent",
    "ideal_transformer",
  ] as const)("fails closed for controlled non-series topology %s", (topologyId) => {
    const result = failureOf(input({ topology: { topologyId } }));
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-07.topology_not_applicable");
  });

  it.each(["unknown_or_unconfirmed", "series", "parallel", "LLC"])(
    "does not guess unknown/text topology %s",
    (topologyId) => {
      const candidate = input() as unknown as Record<string, unknown>;
      candidate.topology = { ...BASE_TOPOLOGY, topologyId };
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe("G-07.topology_unknown");
    },
  );

  it("returns insufficient_data when topology evidence is absent", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.topology = null;
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-07.topology_evidence_missing");
  });

  it.each([
    ["unknown_or_unconfirmed", "insufficient_data", "G-07.network_model_unknown"],
    [
      "distributed_or_switching_or_nonlinear",
      "not_applicable",
      "G-07.network_model_not_applicable",
    ],
  ] as const)("fails closed for network-model regime %s", (networkModelRegime, status, code) => {
    const result = failureOf(input({ topology: { networkModelRegime } }));
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it.each([
    [
      "unknown_or_unconfirmed",
      "insufficient_data",
      "G-07.parasitic_assessment_unknown",
    ],
    ["present_or_material", "not_applicable", "G-07.parasitics_not_applicable"],
  ] as const)("fails closed for parasitic assessment %s", (parasiticAssessment, status, code) => {
    const result = failureOf(input({ topology: { parasiticAssessment } }));
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it.each(["peak", "full_wave_rms", "dc", "average", "local", "total"] as const)(
    "rejects non-phasor port quantity basis %s",
    (quantityBasis) => {
      const result = failureOf(input({ port: { quantityBasis } }));
      expect(result.status).toBe("not_applicable");
      expect(result.failure.code).toBe("G-07.port_basis_not_applicable");
    },
  );

  it("accepts the controlled rms basis as well as fundamental_rms", () => {
    const result = successOf(input({ port: { quantityBasis: "rms" } }));
    expect(result.inputSnapshot.quantityBasis).toBe("rms");
  });

  it.each([
    ["quantityBasis", "unknown_or_unconfirmed", "G-07.port_basis_unknown"],
    ["loadedState", "unknown_or_unconfirmed", "G-07.loaded_state_unknown"],
    [
      "phasorTimeConvention",
      "other_or_unconfirmed",
      "G-07.phasor_convention_unknown",
    ],
    [
      "currentDirection",
      "other_or_unconfirmed",
      "G-07.current_direction_unknown",
    ],
  ] as const)("returns insufficient_data for unconfirmed port field %s", (field, value, code) => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.port = { ...BASE_PORT, [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(code);
  });

  it.each([
    ["portId", ""],
    ["positiveTerminalId", ""],
    ["negativeTerminalId", ""],
    ["referencePlaneId", ""],
    ["designStateId", ""],
    ["frequencyHz", 0],
    ["frequencyHz", -1],
    ["frequencyHz", Number.NaN],
    ["frequencyHz", Number.POSITIVE_INFINITY],
    ["frequencyHz", Number.MIN_VALUE],
  ] as const)("rejects invalid port field %s=%s", (field, value) => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.port = { ...BASE_PORT, [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-07.port_evidence_invalid");
  });

  it("rejects coincident port terminals", () => {
    const result = failureOf(
      input({ port: { negativeTerminalId: "tank-in-positive" } }),
    );
    expect(result.failure.code).toBe("G-07.port_evidence_invalid");
  });

  it.each(["resistance", "inductance", "capacitance"] as const)(
    "returns insufficient_data when %s evidence is absent",
    (kind) => {
      const candidate = input() as unknown as Record<string, unknown>;
      candidate[kind] = null;
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe(`G-07.${kind}_evidence_missing`);
    },
  );

  it.each([
    ["resistance", "resistanceOhm", -1],
    ["resistance", "resistanceOhm", Number.MIN_VALUE],
    ["resistance", "resistanceOhm", Number.NaN],
    ["resistance", "resistanceOhm", Number.POSITIVE_INFINITY],
    ["inductance", "inductanceH", 0],
    ["inductance", "inductanceH", -1],
    ["inductance", "inductanceH", Number.MIN_VALUE],
    ["inductance", "inductanceH", Number.NaN],
    ["inductance", "inductanceH", Number.POSITIVE_INFINITY],
    ["capacitance", "capacitanceF", 0],
    ["capacitance", "capacitanceF", -1],
    ["capacitance", "capacitanceF", Number.MIN_VALUE],
    ["capacitance", "capacitanceF", Number.NaN],
    ["capacitance", "capacitanceF", Number.POSITIVE_INFINITY],
  ] as const)("rejects invalid %s scalar %s=%s", (kind, field, value) => {
    const candidate = input() as unknown as Record<string, any>;
    candidate[kind] = { ...candidate[kind], [field]: value };
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe(`G-07.${kind}_evidence_invalid`);
  });

  it.each([
    ["frequencyHz", 20_000],
    ["portId", "other-port"],
    ["referencePlaneId", "other-plane"],
    ["loadedState", "workpiece_cold"],
    ["designStateId", "other-state"],
    ["seriesNetworkId", "other-network"],
  ] as const)("rejects an R/L/C snapshot mismatch in %s", (field, value) => {
    const result = failureOf(
      input({ resistance: { [field]: value } as Partial<G07ResistanceEvidence> }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-07.state_boundary_mismatch");
  });

  it.each(["resistance", "inductance", "capacitance"] as const)(
    "fails closed when %s loaded_state is unconfirmed",
    (kind) => {
      const candidate = input() as unknown as Record<string, any>;
      candidate[kind] = {
        ...candidate[kind],
        loadedState: "unknown_or_unconfirmed",
      };
      const result = failureOf(candidate);
      expect(result.status).toBe("insufficient_data");
      expect(result.failure.code).toBe("G-07.element_loaded_state_unknown");
    },
  );

  it("fails closed when the inductance loaded/unloaded route is unknown", () => {
    const result = failureOf(
      input({ inductance: { stateRoute: "unknown_or_unconfirmed" } }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe("G-07.inductance_route_unknown");
  });

  it.each([
    ["empty", "loaded_design_state"],
    ["workpiece_hot", "unloaded_reference_only"],
  ] as const)("rejects loaded_state=%s with route=%s", (loadedState, stateRoute) => {
    const result = failureOf(
      input({ port: { loadedState }, inductance: { stateRoute } }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-07.inductance_route_inconsistent");
  });

  it("prioritizes a known unloaded-L substitution into a hot-loaded port over the generic state mismatch", () => {
    const result = failureOf(
      input({
        port: { loadedState: "workpiece_hot" },
        inductance: {
          loadedState: "empty",
          designStateId: "empty-reference-state-01",
          stateRoute: "unloaded_reference_only",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-07.inductance_route_inconsistent");
  });

  it("keeps a known loaded-L route with empty L evidence as invalid_input", () => {
    const result = failureOf(
      input({
        inductance: {
          loadedState: "empty",
          designStateId: "empty-reference-state-01",
          stateRoute: "loaded_design_state",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-07.inductance_route_inconsistent");
  });

  it("rejects angular-frequency overflow", () => {
    const result = failureOf(input({ port: { frequencyHz: Number.MAX_VALUE } }));
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects omega-L multiplication overflow", () => {
    const result = failureOf(
      input({
        port: { frequencyHz: 1e200 },
        inductance: { inductanceH: 1e200 },
        capacitance: { capacitanceF: 1e-200 },
      }),
    );
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects omega-C multiplication underflow", () => {
    const result = failureOf(
      input({
        port: { frequencyHz: G07_BINARY64_MIN_NORMAL },
        inductance: { inductanceH: 1e307 },
        capacitance: { capacitanceF: G07_BINARY64_MIN_NORMAL },
      }),
    );
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects positive-subnormal capacitive reactance", () => {
    const result = failureOf(
      input({
        port: { frequencyHz: 1e300 },
        inductance: { inductanceH: 1e-300 },
        capacitance: { capacitanceF: 1e7 },
      }),
    );
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects L-C product underflow without algebraic substitution", () => {
    const result = failureOf(
      input({
        port: { frequencyHz: 1e200 },
        inductance: { inductanceH: 1e-200 },
        capacitance: { capacitanceF: 1e-200 },
      }),
    );
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects L-C product overflow even when the operating reactances are representable", () => {
    const frequencyHz = 1e-200 / (2 * Math.PI);
    const result = failureOf(
      input({
        port: { frequencyHz },
        inductance: { inductanceH: 1e200 },
        capacitance: { capacitanceF: 1e200 },
      }),
    );
    expect(result.failure.code).toBe("G-07.numeric_resolution_invalid");
  });

  it("rejects a swallowed nonzero capacitive term", () => {
    const result = failureOf(
      input({
        port: { frequencyHz: 1 },
        inductance: { inductanceH: 1 },
        capacitance: { capacitanceF: 1e100 },
      }),
    );
    expect(result.failure.code).toBe("G-07.reactive_term_swallowed");
  });

  it.each([
    null,
    undefined,
    0,
    "series-rlc",
    [],
    {},
    { ...input(), extra: true },
  ])("rejects malformed top-level input %#", (candidate) => {
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-07.input_schema_invalid");
  });

  it("does not execute a hostile top-level accessor", () => {
    let calls = 0;
    const candidate = input() as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, "port", {
      enumerable: true,
      get() {
        calls += 1;
        return BASE_PORT;
      },
    });
    const result = failureOf(candidate);
    expect(calls).toBe(0);
    expect(result.failure.code).toBe("G-07.input_schema_invalid");
  });

  it("does not execute a hostile nested accessor", () => {
    let calls = 0;
    const candidate = input() as unknown as Record<string, any>;
    const resistance = { ...candidate.resistance };
    Object.defineProperty(resistance, "resistanceOhm", {
      enumerable: true,
      get() {
        calls += 1;
        return 0.05;
      },
    });
    candidate.resistance = resistance;
    const result = failureOf(candidate);
    expect(calls).toBe(0);
    expect(result.failure.code).toBe("G-07.resistance_evidence_invalid");
  });

  it("rejects symbol-key smuggling", () => {
    const candidate = input() as unknown as Record<string | symbol, unknown>;
    candidate[Symbol("hidden")] = "parallel";
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-07.input_schema_invalid");
  });

  it("rejects custom-prototype evidence", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.capacitance = Object.assign(
      Object.create({ hidden: "parallel" }),
      candidate.capacitance,
    );
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-07.capacitance_evidence_invalid");
  });

  it("catches hostile Proxy reflection traps and fails closed", () => {
    const candidate = new Proxy(input(), {
      getPrototypeOf() {
        throw new Error("hostile reflection");
      },
    });
    expect(() => evaluateG07SeriesRlc(candidate)).not.toThrow();
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-07.input_schema_invalid");
  });

  it("never emits NaN, Infinity, zero placeholders, or last values on failure", () => {
    const result = failureOf(
      input({ capacitance: { capacitanceF: Number.NaN } }),
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
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity|valueSi/);
  });
});
