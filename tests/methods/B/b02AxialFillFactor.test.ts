import { describe, expect, it } from "vitest";

import {
  B02_AXIAL_FILL_FACTOR_MAPPING,
  evaluateB02AxialFillFactor,
  type B02AxialFillFactorInput,
} from "../../../src/methods/B/b02AxialFillFactor.js";

const applicableGeometry = Object.freeze({
  windingClass: "uniform_single_layer",
  envelopeDefinition: "ADR-0003_full_axial_envelope",
  identicalTurnSections: true,
  nonOverlappingAxialProjection: true,
} as const);

function input(
  overrides: Partial<B02AxialFillFactorInput> = {},
): B02AxialFillFactorInput {
  return {
    electricalTurnCount: 8,
    conductorAxialSizeM: 0.01,
    windingEnvelopeLengthM: 0.1,
    geometry: applicableGeometry,
    ...overrides,
  };
}

describe("B-02 axial fill factor", () => {
  it("maps exactly to the frozen method contract and executed method check", () => {
    expect(B02_AXIAL_FILL_FACTOR_MAPPING).toMatchObject({
      methodId: "B-02",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#B-02:Equation",
      sourceRefs: ["ID-GEO-01"],
      contractSourceRefs: ["ID-GEO-01", "ADR-0003", "DER-GEO"],
      validationCaseIds: [],
      methodCheckIds: ["GEO-FILL-001"],
    });
  });

  it("implements k_fill_axial=N*d_ax/b_env in canonical SI", () => {
    const result = evaluateB02AxialFillFactor(input());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value.kFillAxial).toBeCloseTo(0.8, 15);
      expect(result.value.dimensionId).toBe("dimensionless");
      expect(result.value.canonicalUnitId).toBe("one");
      expect(result.value.interpretation).toBe("axial_projected_coverage");
      expect(result.equation).toBe("k_fill_axial = N * d_ax / b_env");
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("passes GEO-FILL-001 at the k=1 boundary", () => {
    const result = evaluateB02AxialFillFactor(
      input({ windingEnvelopeLengthM: 0.08 }),
    );
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value.kFillAxial).toBe(1);
    }
  });

  it("normalizes the binary64 N=3, d_ax=0.1, b_env=0.3 identity to exactly k=1", () => {
    const result = evaluateB02AxialFillFactor(
      input({
        electricalTurnCount: 3,
        conductorAxialSizeM: 0.1,
        windingEnvelopeLengthM: 0.3,
      }),
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value.kFillAxial).toBe(1);
    }
  });

  it("is invariant when every length is scaled by the same SI factor", () => {
    const base = evaluateB02AxialFillFactor(input());
    const scaled = evaluateB02AxialFillFactor(
      input({
        conductorAxialSizeM: 0.01e-3,
        windingEnvelopeLengthM: 0.1e-3,
      }),
    );
    expect(base.status).toBe("success");
    expect(scaled.status).toBe("success");
    if (base.status === "success" && scaled.status === "success") {
      expect(scaled.value.kFillAxial).toBeCloseTo(
        base.value.kFillAxial,
        15,
      );
    }
  });

  it("returns invalid_input rather than a value for k>1 or overlap", () => {
    for (const candidate of [
      input({ windingEnvelopeLengthM: 0.079 }),
      input({
        geometry: {
          ...applicableGeometry,
          nonOverlappingAxialProjection: false,
        },
      }),
    ]) {
      const result = evaluateB02AxialFillFactor(candidate);
      expect(result).toMatchObject({
        status: "invalid_input",
        applicabilityStatus: "not_evaluated",
      });
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed when envelope semantics are not confirmed", () => {
    const result = evaluateB02AxialFillFactor(
      input({
        geometry: {
          ...applicableGeometry,
          envelopeDefinition: "other_or_unknown",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "B-02.envelope_semantics_unconfirmed" },
    });
    expect("value" in result).toBe(false);
  });

  it("returns not_applicable for multilayer or mixed-section geometry", () => {
    for (const geometry of [
      { ...applicableGeometry, windingClass: "multilayer" as const },
      { ...applicableGeometry, identicalTurnSections: false },
    ]) {
      const result = evaluateB02AxialFillFactor(input({ geometry }));
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
    }
  });

  it.each([
    ["zero turns", { electricalTurnCount: 0 }],
    ["fractional turns", { electricalTurnCount: 2.5 }],
    ["unsafe turns", { electricalTurnCount: Number.MAX_SAFE_INTEGER + 1 }],
    ["zero conductor size", { conductorAxialSizeM: 0 }],
    ["negative envelope", { windingEnvelopeLengthM: -1 }],
    ["NaN conductor size", { conductorAxialSizeM: Number.NaN }],
    ["infinite envelope", { windingEnvelopeLengthM: Number.POSITIVE_INFINITY }],
  ])("rejects %s without a numeric placeholder", (_name, overrides) => {
    const result = evaluateB02AxialFillFactor(input(overrides));
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects erased-type or missing applicability evidence", () => {
    const uncontrolled = evaluateB02AxialFillFactor(
      input({
        geometry: {
          ...applicableGeometry,
          windingClass: "legacy_single_layer" as "uniform_single_layer",
        },
      }),
    );
    expect(uncontrolled.status).toBe("invalid_input");

    const missing = evaluateB02AxialFillFactor({
      ...input(),
      geometry: undefined,
    } as unknown as B02AxialFillFactorInput);
    expect(missing.status).toBe("insufficient_data");
  });

  it("does not coerce a hostile geometry enumeration", () => {
    const hostileEnumeration = {
      toString() {
        throw new Error("must not coerce hostile geometry enumeration");
      },
      [Symbol.toPrimitive]() {
        throw new Error("must not coerce hostile geometry enumeration");
      },
    };
    const candidate = input({
      geometry: {
        ...applicableGeometry,
        windingClass:
          hostileEnumeration as unknown as "uniform_single_layer",
      },
    });

    expect(() => evaluateB02AxialFillFactor(candidate)).not.toThrow();
    const result = evaluateB02AxialFillFactor(candidate);
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("fails closed without executing top-level or geometry accessors and traps", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "electricalTurnCount",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topLevelProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("must contain hostile top-level reflection trap");
      },
    });
    const geometryAccessor = Object.defineProperty(
      { ...applicableGeometry },
      "windingClass",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute geometry accessor");
        },
      },
    );
    const geometryProxy = new Proxy(applicableGeometry, {
      getOwnPropertyDescriptor() {
        throw new Error("must contain hostile geometry reflection trap");
      },
    });

    for (const [candidate, expectedStatus] of [
      [topLevelAccessor, "invalid_input"],
      [topLevelProxy, "invalid_input"],
      [input({ geometry: geometryAccessor as typeof applicableGeometry }), "insufficient_data"],
      [input({ geometry: geometryProxy }), "insufficient_data"],
    ] as const) {
      expect(() =>
        evaluateB02AxialFillFactor(
          candidate as unknown as B02AxialFillFactorInput,
        ),
      ).not.toThrow();
      const result = evaluateB02AxialFillFactor(
        candidate as unknown as B02AxialFillFactorInput,
      );
      expect(result.status).toBe(expectedStatus);
      expect("value" in result).toBe(false);
    }
  });
});
