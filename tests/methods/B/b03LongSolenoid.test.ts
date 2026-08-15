import { describe, expect, it } from "vitest";

import {
  B03_ASSUMPTIONS,
  B03_CONTRACT_SOURCE_REFS,
  B03_DERIVATION_REFS,
  B03_METHOD_CHECK_IDS,
  B03_METHOD_MAPPING,
  B03_SOURCE_REFS,
  B03_VALIDATION_CASE_IDS,
  B03_VACUUM_PERMEABILITY_H_PER_M,
  calculateB03LongSolenoid,
  type B03LongSolenoidInput,
  type B03LongSolenoidSuccess,
  type B03Medium,
} from "../../../src/methods/B/b03LongSolenoid.js";

function input(
  overrides: Partial<B03LongSolenoidInput> = {},
): B03LongSolenoidInput {
  return {
    purpose: "analytical_limit_check",
    currentPathDiameterM: 0.2,
    windingEnvelopeLengthM: 1,
    electricalTurnCount: 10,
    medium: { kind: "air" },
    ...overrides,
  };
}

function requireSuccess(
  result: ReturnType<typeof calculateB03LongSolenoid>,
): B03LongSolenoidSuccess {
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(`Expected B-03 success, received ${result.failure.code}.`);
  }
  return result;
}

function expectTolId(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-12 * Math.max(1, Math.abs(expected)),
  );
}

describe("B-03 ideal long-solenoid analytical limit", () => {
  it("computes the frozen canonical-SI equation and derived geometry", () => {
    const result = requireSuccess(calculateB03LongSolenoid(input()));
    const expectedRadiusM = 0.1;
    const expectedAreaM2 = Math.PI * expectedRadiusM ** 2;
    const expectedLInfH =
      (1.25663706127e-6 * 1 * 10 ** 2 * expectedAreaM2) / 1;

    expect(B03_VACUUM_PERMEABILITY_H_PER_M).toBe(1.25663706127e-6);
    expectTolId(result.value.aM, expectedRadiusM);
    expectTolId(result.value.areaM2, expectedAreaM2);
    expectTolId(result.value.bOverD, 5);
    expectTolId(result.value.LInfH, expectedLInfH);
    expect(result.value.LInfH).toBeGreaterThan(0);
  });

  it("records controlled equation, sources, assumptions, applicability, and SI dimensions", () => {
    const result = requireSuccess(calculateB03LongSolenoid(input()));

    expect(result.methodId).toBe("B-03");
    expect(result.methodVersion).toBe("1.0.0-gate0");
    expect(result.methodApproval).toBe("approved_with_limitation");
    expect(result.evidence.equation).toMatchObject({
      equationId: "CALCULATION_CONTRACTS.md#B-03:Equation",
      canonicalSiEquation:
        "L_inf=mu0*mu_r*N^2*A/b; a=D_c/2; A=pi*a^2",
    });
    expect(result.evidence.sourceRefs).toEqual(B03_SOURCE_REFS);
    expect(result.evidence.sourceRefs).toEqual([
      "N09:PDF20-21:eq15-18",
      "RG12:PDF116-135",
      "CODATA22",
    ]);
    expect(result.evidence.contractSourceRefs).toEqual(
      B03_CONTRACT_SOURCE_REFS,
    );
    expect(result.evidence.contractSourceRefs).toEqual([
      "N09:PDF20-21:eq15-18",
      "RG12:PDF116-135",
      "ID-EM-01",
      "DER-EM",
    ]);
    expect(result.evidence.derivationRefs).toEqual(B03_DERIVATION_REFS);
    expect(result.evidence.derivationRefs).toEqual(["ID-EM-01", "DER-EM"]);
    expect(result.evidence.assumptions).toEqual(B03_ASSUMPTIONS);
    expect(result.evidence.validationCaseIds).toEqual(B03_VALIDATION_CASE_IDS);
    expect(result.evidence.validationCaseIds).toEqual(["EM-L-001"]);
    expect(result.evidence.methodCheckIds).toEqual(B03_METHOD_CHECK_IDS);
    expect(result.evidence.methodCheckIds).toEqual([
      "EM-L-LONG-SCALE-001",
    ]);
    expect(B03_METHOD_MAPPING).toMatchObject({
      methodId: "B-03",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#B-03:Equation",
    });
    expect(result.evidence.units).toEqual({
      currentPathDiameter: "m",
      windingEnvelopeLength: "m",
      radius: "m",
      area: "m2",
      relativePermeability: "1",
      turnCount: "1",
      lengthToDiameterRatio: "1",
      inductance: "H",
      dimensionalIdentity: "(H/m)*1*1*m2/m=H",
    });
    expect(result.evidence.applicability).toMatchObject({
      status: "in_domain_for_analytical_limit_check",
      purpose: "analytical_limit_check",
      interpretation: "long_solenoid_limit_only",
      hardLengthToDiameterThresholdApplied: false,
      thresholdPolicy: "no_frozen_hard_threshold",
    });
    expect(result.evidence.recommendation.isRecommended).toBe(false);
    expect(result.evidence.recommendation.reason).toMatch(
      /limit check.*not.*Recommended/i,
    );
    expect(result.warningIds).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
  });

  it("implements EM-L-LONG-SCALE-001 N-squared scaling", () => {
    const base = requireSuccess(calculateB03LongSolenoid(input()));
    const doubledTurns = requireSuccess(
      calculateB03LongSolenoid(input({ electricalTurnCount: 20 })),
    );

    expectTolId(doubledTurns.value.LInfH / base.value.LInfH, 4);
  });

  it("implements EM-L-LONG-SCALE-001 diameter-squared scaling", () => {
    const base = requireSuccess(calculateB03LongSolenoid(input()));
    const doubledDiameter = requireSuccess(
      calculateB03LongSolenoid(input({ currentPathDiameterM: 0.4 })),
    );

    expectTolId(doubledDiameter.value.LInfH / base.value.LInfH, 4);
    expectTolId(doubledDiameter.value.areaM2 / base.value.areaM2, 4);
  });

  it("implements EM-L-LONG-SCALE-001 inverse-length scaling", () => {
    const base = requireSuccess(calculateB03LongSolenoid(input()));
    const doubledLength = requireSuccess(
      calculateB03LongSolenoid(
        input({ windingEnvelopeLengthM: 2 }),
      ),
    );

    expectTolId(doubledLength.value.LInfH / base.value.LInfH, 0.5);
  });

  it("implements uniform-linear relative-permeability scaling", () => {
    const air = requireSuccess(calculateB03LongSolenoid(input()));
    const relativePermeability = 2.75;
    const linearMedium = requireSuccess(
      calculateB03LongSolenoid(
        input({
          medium: { kind: "uniform_linear", relativePermeability },
        }),
      ),
    );

    expectTolId(
      linearMedium.value.LInfH / air.value.LInfH,
      relativePermeability,
    );
    expect(
      linearMedium.evidence.applicability.relativePermeability,
    ).toBe(relativePermeability);
    expect(linearMedium.evidence.applicability.mediumKind).toBe(
      "uniform_linear",
    );
  });

  it("uses explicit air as relative permeability 1 without a hidden medium default", () => {
    const air = requireSuccess(calculateB03LongSolenoid(input()));
    const explicitLinearOne = requireSuccess(
      calculateB03LongSolenoid(
        input({
          medium: { kind: "uniform_linear", relativePermeability: 1 },
        }),
      ),
    );

    expect(air.evidence.applicability.relativePermeability).toBe(1);
    expectTolId(air.value.LInfH, explicitLinearOne.value.LInfH);

    const missingMedium = calculateB03LongSolenoid({
      purpose: "analytical_limit_check",
      currentPathDiameterM: 0.2,
      windingEnvelopeLengthM: 1,
      electricalTurnCount: 10,
    });
    expect(missingMedium.status).toBe("invalid_input");
    expect("value" in missingMedium).toBe(false);
  });

  it("does not invent a b_env/D_c hard threshold", () => {
    const shortGeometry = requireSuccess(
      calculateB03LongSolenoid(
        input({
          currentPathDiameterM: 1,
          windingEnvelopeLengthM: 0.01,
          electricalTurnCount: 2,
        }),
      ),
    );

    expect(shortGeometry.value.bOverD).toBe(0.01);
    expect(
      shortGeometry.evidence.applicability
        .hardLengthToDiameterThresholdApplied,
    ).toBe(false);
    expect(shortGeometry.evidence.recommendation.isRecommended).toBe(false);
  });

  it("returns not_applicable for N=1 without generating a warning ID", () => {
    const result = calculateB03LongSolenoid(
      input({ electricalTurnCount: 1 }),
    );

    expect(result.status).toBe("not_applicable");
    if (result.status !== "not_applicable") {
      throw new Error("Expected N=1 to be not_applicable.");
    }
    expect(result.failure.code).toBe(
      "single_turn_current_sheet_not_applicable",
    );
    expect(result.warningIds).toEqual([]);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("returns not_applicable for an incorrect purpose", () => {
    const result = calculateB03LongSolenoid({
      ...input(),
      purpose: "finite_coil_design",
    });

    expect(result.status).toBe("not_applicable");
    if (result.status !== "not_applicable") {
      throw new Error("Expected unsupported purpose to be not_applicable.");
    }
    expect(result.failure.code).toBe("unsupported_purpose");
    expect("value" in result).toBe(false);
  });

  it("returns not_applicable for an erased-type nonlinear medium", () => {
    const result = calculateB03LongSolenoid({
      ...input(),
      medium: { kind: "nonlinear" },
    });

    expect(result.status).toBe("not_applicable");
    if (result.status !== "not_applicable") {
      throw new Error("Expected nonlinear medium to be not_applicable.");
    }
    expect(result.failure.code).toBe("nonlinear_medium_not_applicable");
    expect(result.warningIds).toEqual([]);
    expect("value" in result).toBe(false);
  });

  it.each([
    ["zero D_c", { currentPathDiameterM: 0 }],
    ["negative D_c", { currentPathDiameterM: -0.1 }],
    ["NaN D_c", { currentPathDiameterM: Number.NaN }],
    ["infinite D_c", { currentPathDiameterM: Number.POSITIVE_INFINITY }],
    ["zero b_env", { windingEnvelopeLengthM: 0 }],
    ["negative b_env", { windingEnvelopeLengthM: -1 }],
    ["NaN b_env", { windingEnvelopeLengthM: Number.NaN }],
    [
      "infinite b_env",
      { windingEnvelopeLengthM: Number.POSITIVE_INFINITY },
    ],
    ["zero turns", { electricalTurnCount: 0 }],
    ["fractional turns", { electricalTurnCount: 2.5 }],
    ["NaN turns", { electricalTurnCount: Number.NaN }],
    [
      "infinite turns",
      { electricalTurnCount: Number.POSITIVE_INFINITY },
    ],
  ])("rejects %s without a numeric value", (_name, overrides) => {
    const result = calculateB03LongSolenoid(input(overrides));

    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    [0],
    [-1],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
  ])(
    "rejects invalid uniform-linear relative permeability %s",
    (relativePermeability) => {
      const medium = {
        kind: "uniform_linear",
        relativePermeability,
      } as B03Medium;
      const result = calculateB03LongSolenoid(input({ medium }));

      expect(result.status).toBe("invalid_input");
      if (result.status !== "invalid_input") {
        throw new Error("Expected invalid relative permeability failure.");
      }
      expect(result.failure.code).toBe("invalid_relative_permeability");
      expect("value" in result).toBe(false);
    },
  );

  it("rejects missing or ambiguous medium fields rather than applying defaults", () => {
    for (const medium of [
      { kind: "uniform_linear" },
      { kind: "air", relativePermeability: 2 },
      { kind: "unknown" },
      {},
      null,
    ]) {
      const result = calculateB03LongSolenoid({ ...input(), medium });
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed for erased-type and hostile input shapes", () => {
    const accessorInput = Object.defineProperty({}, "purpose", {
      enumerable: true,
      get() {
        throw new Error("must not execute accessor");
      },
    });
    const hostileProxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("hostile ownKeys");
        },
      },
    );
    for (const erasedInput of [
      undefined,
      null,
      "B-03",
      3,
      [],
      new Date(),
      {},
      { ...input(), extra: true },
      accessorInput,
      hostileProxy,
    ]) {
      expect(() => calculateB03LongSolenoid(erasedInput)).not.toThrow();
      const result = calculateB03LongSolenoid(erasedInput);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed without executing exact-shape top-level or medium accessors and traps", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "currentPathDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topLevelProxy = new Proxy(input(), {
      getOwnPropertyDescriptor() {
        throw new Error("must contain hostile top-level reflection trap");
      },
    });
    const mediumAccessor = Object.defineProperty({}, "kind", {
      enumerable: true,
      get() {
        throw new Error("must not execute medium accessor");
      },
    });
    const mediumProxy = new Proxy(
      { kind: "air" },
      {
        ownKeys() {
          throw new Error("must contain hostile medium reflection trap");
        },
      },
    );

    for (const candidate of [
      topLevelAccessor,
      topLevelProxy,
      input({ medium: mediumAccessor as unknown as B03Medium }),
      input({ medium: mediumProxy as B03Medium }),
    ]) {
      expect(() => calculateB03LongSolenoid(candidate)).not.toThrow();
      const result = calculateB03LongSolenoid(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed when finite positive inputs underflow a derived value", () => {
    const result = calculateB03LongSolenoid(
      input({ currentPathDiameterM: Number.MIN_VALUE }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected derived-value failure.");
    }
    expect(result.failure.code).toBe("non_finite_derived_value");
    expect("value" in result).toBe(false);
  });
});
