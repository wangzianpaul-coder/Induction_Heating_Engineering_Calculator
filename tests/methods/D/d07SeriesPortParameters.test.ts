import { describe, expect, it } from "vitest";

import {
  D07_BINARY64_MIN_NORMAL,
  D07_NUMERIC_REPRESENTABILITY_POLICY,
  D07_SERIES_PORT_PARAMETERS_MAPPING,
  D07_WARNING_PREDICATES,
  evaluateD07SeriesPortParameters,
  type D07CurrentEvidence,
  type D07SeriesInductanceEvidence,
  type D07SeriesPortParametersInput,
  type D07SeriesPortParametersSuccess,
  type D07SeriesResistanceEvidence,
} from "../../../src/methods/D/d07SeriesPortParameters.js";

const BASE_RESISTANCE = Object.freeze({
  resistanceOhm: 0.2,
  frequencyHz: 10_000,
  portId: "coil-terminal-port",
  referencePlaneId: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
  seriesEquivalentId: "coil-series-equivalent-hot-v1",
} as const satisfies D07SeriesResistanceEvidence);

const BASE_INDUCTANCE = Object.freeze({
  inductanceH: 50e-6,
  frequencyHz: 10_000,
  portId: "coil-terminal-port",
  referencePlaneId: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
  seriesEquivalentId: "coil-series-equivalent-hot-v1",
} as const satisfies D07SeriesInductanceEvidence);

const BASE_CURRENT = Object.freeze({
  currentA: 100,
  frequencyHz: 10_000,
  portId: "coil-terminal-port",
  referencePlaneId: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
  seriesEquivalentId: "coil-series-equivalent-hot-v1",
  quantityBasis: "rms",
} as const satisfies D07CurrentEvidence);

function input(
  overrides: Readonly<{
    resistance?: Partial<D07SeriesResistanceEvidence>;
    inductance?: Partial<D07SeriesInductanceEvidence>;
    current?: Partial<D07CurrentEvidence>;
    portInterpretation?: D07SeriesPortParametersInput["portInterpretation"];
    modelRegime?: D07SeriesPortParametersInput["modelRegime"];
  }> = {},
): D07SeriesPortParametersInput {
  return {
    resistance: { ...BASE_RESISTANCE, ...overrides.resistance },
    inductance: { ...BASE_INDUCTANCE, ...overrides.inductance },
    current: { ...BASE_CURRENT, ...overrides.current },
    portInterpretation:
      overrides.portInterpretation ?? "coil_series_equivalent_port",
    modelRegime: overrides.modelRegime ?? "linear_sinusoidal_steady_state",
  };
}

function successOf(
  candidate: D07SeriesPortParametersInput,
): D07SeriesPortParametersSuccess {
  const result = evaluateD07SeriesPortParameters(candidate);
  expect(
    ["success", "success_with_warnings"],
    result.status,
  ).toContain(result.status);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(
      result.failure?.message ?? `unexpected D-07 status: ${result.status}`,
    );
  }
  return result;
}

describe("D-07 coil series-port parameters", () => {
  it("binds the implementation to the frozen registry, derivations, and ELEC-ZS-001", () => {
    expect(D07_SERIES_PORT_PARAMETERS_MAPPING).toMatchObject({
      methodId: "D-07",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#D-07:Equation",
      sourceRefs: ["ID-AC-01"],
      contractSourceRefs: ["ID-AC-01", "DER-CIRCUIT"],
      derivationRefs: ["ID-AC-01", "DER-CIRCUIT"],
      validationCaseIds: [],
      methodCheckIds: ["ELEC-ZS-001"],
      outputQuantityIds: [
        "XL",
        "Zcomplex",
        "|Z|",
        "Qs",
        "UR",
        "UX",
        "Uterminal",
      ],
      stableWarningIds: [],
    });
    expect(D07_WARNING_PREDICATES).toEqual({
      zeroResistanceFiniteQualityFactor: "Rs=0 but a finite Q is emitted",
      peakRmsMix: "peak and RMS quantities are mixed",
      uxLabelledGridVoltage: "UX is labelled grid voltage",
      undefinedResonantTankPort: "resonant-tank port is undefined",
    });
  });

  it("implements the complete canonical-SI complex series-port algebra", () => {
    const result = successOf(input());
    const omega = 2 * Math.PI * BASE_RESISTANCE.frequencyHz;
    const expectedX = omega * BASE_INDUCTANCE.inductanceH;
    const expectedMagnitude = Math.hypot(
      BASE_RESISTANCE.resistanceOhm,
      expectedX,
    );

    expect(result.status).toBe("success");
    expect(Object.keys(result.value)).toEqual([
      "XL",
      "Zcomplex",
      "|Z|",
      "Qs",
      "UR",
      "UX",
      "Uterminal",
    ]);
    expect(result.value.XL.valueSi).toBeCloseTo(expectedX, 14);
    expect(result.value.Zcomplex.valueSi).toEqual({
      realOhm: BASE_RESISTANCE.resistanceOhm,
      imaginaryOhm: expectedX,
    });
    expect(result.value["|Z|"].valueSi).toBeCloseTo(expectedMagnitude, 14);
    expect(result.value.Qs.kind).toBe("available");
    if (result.value.Qs.kind === "available") {
      expect(result.value.Qs.valueSi).toBeCloseTo(
        expectedX / BASE_RESISTANCE.resistanceOhm,
        14,
      );
    }
    expect(result.value.UR.valueSi).toBeCloseTo(20, 14);
    expect(result.value.UX.valueSi).toBeCloseTo(
      BASE_CURRENT.currentA * expectedX,
      14,
    );
    expect(result.value.Uterminal.valueSi).toBeCloseTo(
      BASE_CURRENT.currentA * expectedMagnitude,
      14,
    );
  });

  it("reports controlled dimensions and coil-port-only voltage meanings", () => {
    const result = successOf(input());
    for (const output of [
      result.value.XL,
      result.value.Zcomplex,
      result.value["|Z|"],
    ]) {
      expect(output.dimensionId).toBe("electrical_resistance");
      expect(output.canonicalUnitId).toBe("ohm");
    }
    for (const output of [
      result.value.UR,
      result.value.UX,
      result.value.Uterminal,
    ]) {
      expect(output.dimensionId).toBe("voltage");
      expect(output.canonicalUnitId).toBe("V");
    }
    expect(result.value.UX.interpretation).toContain("not_grid_voltage");
    expect(result.value.Uterminal.interpretation).toContain(
      "not_grid_or_tank_total_voltage",
    );
    expect(result.portBoundary).toEqual({
      resultScope: "coil_series_equivalent_port_only",
      UXMeaning: "inductive_component_not_grid_voltage",
      UterminalMeaning: "coil_R_plus_L_terminal_magnitude",
      excludedMeanings: ["grid_side_voltage", "resonant_tank_total_voltage"],
    });
  });

  it("passes frequency and current scaling identities without replacing the full value", () => {
    const base = successOf(input());
    const frequencyScaled = successOf(
      input({
        resistance: { frequencyHz: 40_000 },
        inductance: { frequencyHz: 40_000 },
        current: { frequencyHz: 40_000 },
      }),
    );
    expect(frequencyScaled.value.XL.valueSi).toBeCloseTo(
      base.value.XL.valueSi * 4,
      13,
    );
    expect(frequencyScaled.value.UX.valueSi).toBeCloseTo(
      base.value.UX.valueSi * 4,
      13,
    );
    expect(frequencyScaled.value.UR.valueSi).toBeCloseTo(
      base.value.UR.valueSi,
      13,
    );
    if (
      base.value.Qs.kind === "available" &&
      frequencyScaled.value.Qs.kind === "available"
    ) {
      expect(frequencyScaled.value.Qs.valueSi).toBeCloseTo(
        base.value.Qs.valueSi * 4,
        13,
      );
    }

    const currentScaled = successOf(input({ current: { currentA: 300 } }));
    expect(currentScaled.value.UR.valueSi).toBeCloseTo(
      base.value.UR.valueSi * 3,
      13,
    );
    expect(currentScaled.value.UX.valueSi).toBeCloseTo(
      base.value.UX.valueSi * 3,
      12,
    );
    expect(currentScaled.value.Uterminal.valueSi).toBeCloseTo(
      base.value.Uterminal.valueSi * 3,
      13,
    );
    expect(currentScaled.value.XL.valueSi).toBe(base.value.XL.valueSi);
    expect(currentScaled.value["|Z|"].valueSi).toBe(
      base.value["|Z|"].valueSi,
    );
  });

  it("keeps the R much-less-than omega-L approximation diagnostic-only and reports its exact error", () => {
    const result = successOf(
      input({ resistance: { resistanceOhm: 1e-3 } }),
    );
    const diagnostic = result.approximationDiagnostic;
    const full = result.value.Uterminal.valueSi;
    const approximate = result.value.UX.valueSi;
    const expectedRelativeError = (full - approximate) / full;

    expect(diagnostic).toMatchObject({
      classification: "diagnostic_only_engineering_approximation",
      isReplacementForFullComplexResult: false,
      thresholdApplied: false,
      approximationVoltageV: approximate,
      fullTerminalVoltageV: full,
    });
    expect(diagnostic.relativeMagnitudeError.kind).toBe("available");
    if (diagnostic.relativeMagnitudeError.kind === "available") {
      expect(diagnostic.relativeMagnitudeError.valueSi).toBeCloseTo(
        expectedRelativeError,
        14,
      );
      expect(diagnostic.absoluteMagnitudeError.kind).toBe("available");
      if (diagnostic.absoluteMagnitudeError.kind === "available") {
        expect(diagnostic.absoluteMagnitudeError.valueSi).toBeCloseTo(
          full * diagnostic.relativeMagnitudeError.valueSi,
          14,
        );
      }
    }
    expect(result.value.Uterminal.valueSi).toBeGreaterThan(
      diagnostic.approximationVoltageV,
    );
  });

  it("makes Q unavailable at R=0 without any value or unit placeholder while retaining reliable outputs", () => {
    const result = successOf(input({ resistance: { resistanceOhm: 0 } }));
    expect(result.status).toBe("success_with_warnings");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "D-07.quality_factor_unavailable_zero_resistance",
        condition: "R_s=0",
        guardedPredicateRef: "Rs=0 but a finite Q is emitted",
      }),
    ]);
    expect(result.value.Qs).toEqual({
      kind: "unavailable",
      outputId: "Qs",
      status: "not_applicable",
      reason: "series quality factor is undefined/infinite at R_s=0",
    });
    expect("valueSi" in result.value.Qs).toBe(false);
    expect("dimensionId" in result.value.Qs).toBe(false);
    expect("canonicalUnitId" in result.value.Qs).toBe(false);
    expect(result.value.Zcomplex.valueSi.realOhm).toBe(0);
    expect(result.value["|Z|"].valueSi).toBe(result.value.XL.valueSi);
    expect(result.value.UR.valueSi).toBe(0);
    expect(result.value.Uterminal.valueSi).toBe(result.value.UX.valueSi);
  });

  it("handles I=0 as an exact zero-voltage state without hiding impedance", () => {
    const result = successOf(input({ current: { currentA: 0 } }));
    expect(result.status).toBe("success");
    expect(result.value.UR.valueSi).toBe(0);
    expect(result.value.UX.valueSi).toBe(0);
    expect(result.value.Uterminal.valueSi).toBe(0);
    expect(result.value.XL.valueSi).toBeGreaterThan(0);
    expect(result.value["|Z|"].valueSi).toBeGreaterThan(0);
    expect(result.approximationDiagnostic.absoluteMagnitudeError).toMatchObject({
      kind: "available",
      valueSi: 0,
    });
    expect(result.approximationDiagnostic.relativeMagnitudeError.kind).toBe(
      "available",
    );
  });

  it("retains genuine zero outputs when R, L, and I are exactly zero", () => {
    const result = successOf(
      input({
        resistance: { resistanceOhm: 0 },
        inductance: { inductanceH: 0 },
        current: { currentA: 0 },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.XL.valueSi).toBe(0);
    expect(result.value.Zcomplex.valueSi).toEqual({
      realOhm: 0,
      imaginaryOhm: 0,
    });
    expect(result.value["|Z|"].valueSi).toBe(0);
    expect(result.value.UR.valueSi).toBe(0);
    expect(result.value.UX.valueSi).toBe(0);
    expect(result.value.Uterminal.valueSi).toBe(0);
    expect(result.value.Qs.kind).toBe("unavailable");
    expect(result.approximationDiagnostic.relativeMagnitudeError.kind).toBe(
      "unavailable",
    );
    expect(result.approximationDiagnostic.absoluteMagnitudeError).toMatchObject({
      kind: "available",
      valueSi: 0,
    });
  });

  it("reports explicit null quantity evidence as insufficient_data", () => {
    for (const key of ["resistance", "inductance", "current"] as const) {
      const candidate = { ...input(), [key]: null };
      const result = evaluateD07SeriesPortParameters(
        candidate as unknown as D07SeriesPortParametersInput,
      );
      expect(result.status).toBe("insufficient_data");
      expect("value" in result).toBe(false);
      if (result.status === "insufficient_data") {
        expect(result.failure.code).toBe(`D-07.${key}_evidence_missing`);
      }
    }
  });

  it("accepts explicit RMS and fundamental_rms bases", () => {
    for (const quantityBasis of ["rms", "fundamental_rms"] as const) {
      const result = successOf(input({ current: { quantityBasis } }));
      expect(result.status).toBe("success");
      expect(result.electricalState.quantityBasis).toBe(quantityBasis);
    }
  });

  it.each(["peak", "full_wave_rms", "dc"] as const)(
    "fails closed for the %s quantity basis",
    (quantityBasis) => {
      const result = evaluateD07SeriesPortParameters(
        input({ current: { quantityBasis } }),
      );
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
      if (result.status === "not_applicable") {
        expect(result.failure.code).toBe("D-07.quantity_basis_not_applicable");
      }
    },
  );

  it.each([
    ["frequency", { frequencyHz: 11_000 }],
    ["port", { portId: "another-port" }],
    ["reference plane", { referencePlaneId: "another-plane" }],
    ["loaded state", { loadedState: "workpiece_cold" }],
    ["series equivalent", { seriesEquivalentId: "another-equivalent" }],
  ] as const)("rejects mismatched %s evidence", (_name, inductance) => {
    const result = evaluateD07SeriesPortParameters(
      input({
        inductance: inductance as Partial<D07SeriesInductanceEvidence>,
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
    if (result.status === "insufficient_data") {
      expect(result.failure.code).toBe("D-07.state_boundary_mismatch");
    }
  });

  it.each(["grid_side_port", "resonant_tank_total_port"] as const)(
    "does not relabel D-07 outputs for the %s scope",
    (portInterpretation) => {
      const result = evaluateD07SeriesPortParameters(
        input({ portInterpretation }),
      );
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
      if (result.status === "not_applicable") {
        expect(result.failure.code).toBe(
          "D-07.port_interpretation_not_applicable",
        );
      }
    },
  );

  it("returns not_applicable outside the linear sinusoidal regime", () => {
    const result = evaluateD07SeriesPortParameters(
      input({ modelRegime: "nonlinear_or_non_sinusoidal_or_unknown" }),
    );
    expect(result.status).toBe("not_applicable");
    expect("value" in result).toBe(false);
  });

  it.each([
    ["negative resistance", { resistance: { resistanceOhm: -1 } }],
    ["negative inductance", { inductance: { inductanceH: -1 } }],
    ["negative current", { current: { currentA: -1 } }],
    ["zero frequency", { current: { frequencyHz: 0 } }],
    ["NaN resistance", { resistance: { resistanceOhm: Number.NaN } }],
    [
      "infinite inductance",
      { inductance: { inductanceH: Number.POSITIVE_INFINITY } },
    ],
    ["blank port", { resistance: { portId: " " } }],
  ] as const)("rejects %s", (_name, overrides) => {
    const result = evaluateD07SeriesPortParameters(
      input(
        overrides as Parameters<typeof input>[0],
      ),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("fails closed for derived impedance, voltage, and Q overflow", () => {
    const candidates = [
      input({
        resistance: { frequencyHz: Number.MAX_VALUE },
        inductance: {
          frequencyHz: Number.MAX_VALUE,
          inductanceH: Number.MAX_VALUE,
        },
        current: { frequencyHz: Number.MAX_VALUE },
      }),
      input({
        resistance: { resistanceOhm: Number.MAX_VALUE },
        current: { currentA: Number.MAX_VALUE },
      }),
      input({ resistance: { resistanceOhm: Number.MIN_VALUE } }),
    ];
    for (const candidate of candidates) {
      const result = evaluateD07SeriesPortParameters(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("D-07.numeric_resolution_invalid");
      }
    }
  });

  it("fails closed when a physically positive exact output underflows to a false zero", () => {
    const positiveXUnderflow = input({
      resistance: { resistanceOhm: 0, frequencyHz: Number.MIN_VALUE },
      inductance: {
        inductanceH: Number.MIN_VALUE,
        frequencyHz: Number.MIN_VALUE,
      },
      current: { frequencyHz: Number.MIN_VALUE },
    });
    const positiveUrUnderflow = input({
      resistance: { resistanceOhm: Number.MIN_VALUE },
      inductance: { inductanceH: 0 },
      current: { currentA: Number.MIN_VALUE },
    });
    const positiveUxUnderflow = input({
      resistance: { resistanceOhm: 0 },
      inductance: { inductanceH: Number.MIN_VALUE },
      current: { currentA: Number.MIN_VALUE },
    });
    const positiveTerminalUnderflow = input({
      resistance: { resistanceOhm: Number.MIN_VALUE },
      inductance: { inductanceH: 0 },
      current: { currentA: Number.MIN_VALUE },
    });

    for (const candidate of [
      positiveXUnderflow,
      positiveUrUnderflow,
      positiveUxUnderflow,
      positiveTerminalUnderflow,
    ]) {
      const result = evaluateD07SeriesPortParameters(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("D-07.numeric_resolution_invalid");
      }
    }
  });

  it("fails closed when a positive subnormal angular frequency is magnified into a plausible normal reactance", () => {
    const frequencyHz = Number.MIN_VALUE;
    const inductanceH = 1e308;
    const contaminatedOmega = 2 * Math.PI * frequencyHz;
    const contaminatedReactance = contaminatedOmega * inductanceH;
    const stableIdentityOracle = (frequencyHz * inductanceH) * (2 * Math.PI);

    expect(contaminatedOmega).toBeGreaterThan(0);
    expect(contaminatedOmega).toBeLessThan(D07_BINARY64_MIN_NORMAL);
    expect(Number.isFinite(contaminatedReactance)).toBe(true);
    expect(Number.isFinite(stableIdentityOracle)).toBe(true);
    expect(contaminatedReactance).not.toBe(stableIdentityOracle);

    const result = evaluateD07SeriesPortParameters(
      input({
        resistance: { resistanceOhm: 1, frequencyHz },
        inductance: { inductanceH, frequencyHz },
        current: { currentA: 1, frequencyHz },
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-07.numeric_resolution_invalid" },
    });
    expect("value" in result).toBe(false);
    expect("substitution" in result).toBe(false);
  });

  it("records positive-subnormal rejection as machine-only policy", () => {
    expect(D07_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalIntermediatePolicy: "fail_closed",
      sourceEquationRearranged: false,
      minimumPositiveNormal: D07_BINARY64_MIN_NORMAL,
    });
    expect(
      D07_SERIES_PORT_PARAMETERS_MAPPING.numericRepresentabilityPolicy,
    ).toBe(D07_NUMERIC_REPRESENTABILITY_POLICY);
    expect(successOf(input()).numericRepresentabilityPolicy).toBe(
      D07_NUMERIC_REPRESENTABILITY_POLICY,
    );
  });

  it("marks under-resolved positive approximation errors unavailable without blocking exact outputs", () => {
    const result = successOf(
      input({
        resistance: { resistanceOhm: 1e-200 },
        inductance: { inductanceH: 1 },
        current: { currentA: 1 },
      }),
    );
    expect(result.status).toBe("success");
    expect(result.value.Uterminal.kind).toBe("available");
    expect(result.value.UX.kind).toBe("available");
    expect(result.approximationDiagnostic.relativeMagnitudeError).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(result.approximationDiagnostic.absoluteMagnitudeError).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    for (const diagnostic of [
      result.approximationDiagnostic.relativeMagnitudeError,
      result.approximationDiagnostic.absoluteMagnitudeError,
    ]) {
      expect("valueSi" in diagnostic).toBe(false);
      expect("dimensionId" in diagnostic).toBe(false);
      expect("canonicalUnitId" in diagnostic).toBe(false);
    }
  });

  it("fails closed without executing hostile accessors or reflection traps", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "portInterpretation",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level reflection trap");
      },
    });
    const nestedAccessor = Object.defineProperty(
      { ...BASE_RESISTANCE },
      "resistanceOhm",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute nested accessor");
        },
      },
    );
    const nestedProxy = new Proxy(BASE_INDUCTANCE, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile nested reflection trap");
      },
    });

    for (const candidate of [
      topAccessor,
      topProxy,
      { ...input(), resistance: nestedAccessor },
      { ...input(), inductance: nestedProxy },
    ]) {
      expect(() =>
        evaluateD07SeriesPortParameters(
          candidate as unknown as D07SeriesPortParametersInput,
        ),
      ).not.toThrow();
      const result = evaluateD07SeriesPortParameters(
        candidate as unknown as D07SeriesPortParametersInput,
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("copies Proxy data descriptors without invoking a hostile get trap", () => {
    const resistance = new Proxy(BASE_RESISTANCE, {
      get() {
        throw new Error("D-07 must consume copied data descriptors, not get");
      },
    });
    const candidate = {
      ...input(),
      resistance,
    } as D07SeriesPortParametersInput;
    expect(() => evaluateD07SeriesPortParameters(candidate)).not.toThrow();
    expect(
      evaluateD07SeriesPortParameters(candidate).status,
    ).toBe("success");
  });

  it("does not coerce hostile enum objects through String or toString", () => {
    const hostileEnum = Object.freeze({
      toString() {
        throw new Error("must not coerce hostile enum");
      },
    });
    const candidates = [
      { ...input(), portInterpretation: hostileEnum },
      {
        ...input(),
        current: { ...BASE_CURRENT, quantityBasis: hostileEnum },
      },
      {
        ...input(),
        resistance: { ...BASE_RESISTANCE, loadedState: hostileEnum },
      },
    ];
    for (const candidate of candidates) {
      expect(() =>
        evaluateD07SeriesPortParameters(
          candidate as unknown as D07SeriesPortParametersInput,
        ),
      ).not.toThrow();
      expect(
        evaluateD07SeriesPortParameters(
          candidate as unknown as D07SeriesPortParametersInput,
        ).status,
      ).toBe("invalid_input");
    }
  });

  it("keeps exact outputs usable at L=0 and closes undefined diagnostics", () => {
    const result = successOf(input({ inductance: { inductanceH: 0 } }));
    expect(result.status).toBe("success");
    expect(result.value.XL.valueSi).toBe(0);
    expect(result.value.UX.valueSi).toBe(0);
    expect(result.value.Qs.kind).toBe("available");
    if (result.value.Qs.kind === "available") {
      expect(result.value.Qs.valueSi).toBe(0);
    }
    expect(
      result.approximationDiagnostic.resistanceToReactanceRatio.kind,
    ).toBe("unavailable");
    expect(result.approximationDiagnostic.relativeMagnitudeError.kind).toBe(
      "available",
    );
    if (result.approximationDiagnostic.relativeMagnitudeError.kind === "available") {
      expect(
        result.approximationDiagnostic.relativeMagnitudeError.valueSi,
      ).toBe(1);
    }
  });

  it("deep-freezes successful engineering evidence and outputs", () => {
    const result = successOf(input());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Zcomplex)).toBe(true);
    expect(Object.isFrozen(result.value.Zcomplex.valueSi)).toBe(true);
    expect(Object.isFrozen(result.approximationDiagnostic)).toBe(true);
    expect(Object.isFrozen(result.electricalState)).toBe(true);
    expect(Object.isFrozen(result.portBoundary.excludedMeanings)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });
});
