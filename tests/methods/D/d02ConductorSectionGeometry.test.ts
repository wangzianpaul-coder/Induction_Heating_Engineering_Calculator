import { describe, expect, it } from "vitest";

import {
  D02_BINARY64_MIN_NORMAL,
  D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING,
  D02_NUMERIC_REPRESENTABILITY_POLICY,
  evaluateD02ConductorSectionGeometry,
  type D02ConductorSectionGeometryInput,
  type D02HollowRoundInput,
  type D02SolidRoundInput,
} from "../../../src/methods/D/d02ConductorSectionGeometry.js";

const solidApplicability = Object.freeze({
  sectionUniformity: "constant_along_length",
  sectionBasis: "ideal_declared_dimensions",
  voidPlacement: "not_applicable",
  depositState: "absent",
} as const);

const hollowApplicability = Object.freeze({
  ...solidApplicability,
  voidPlacement: "centered",
} as const);

function solidRound(
  overrides: Partial<D02SolidRoundInput> = {},
): D02SolidRoundInput {
  return {
    shape: "solid_round",
    outerDimensions: { outerDiameterM: 0.02 },
    innerDimensions: null,
    applicability: solidApplicability,
    ...overrides,
  };
}

function hollowRound(
  overrides: Partial<D02HollowRoundInput> = {},
): D02HollowRoundInput {
  return {
    shape: "hollow_round",
    outerDimensions: { outerDiameterM: 0.02 },
    innerDimensions: { innerDiameterM: 0.012 },
    applicability: hollowApplicability,
    ...overrides,
  };
}

describe("D-02 conductor metal and hydraulic section geometry", () => {
  it("is not exported from the runtime public API while its freeze conflict is open", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateD02ConductorSectionGeometry" in publicApi).toBe(false);
    expect("D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING" in publicApi).toBe(false);
  });

  it("maps to the frozen method metadata while remaining explicitly non-activatable", () => {
    expect(D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING).toMatchObject({
      methodId: "D-02",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#D-02:Equation",
      sourceRefs: ["ID-GEO-03"],
      contractSourceRefs: ["ID-GEO-03", "DER-GEO"],
      validationCaseIds: [],
      methodCheckIds: ["GEO-AREA-001"],
      implementationReadiness:
        "partial_non_activatable_specification_conflict",
      implementedShapes: ["solid_round", "hollow_round"],
    });
    expect(
      D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING.specificationConflict,
    ).toMatchObject({
      contractEnumeration: [
        "solid_round",
        "hollow_round",
        "solid_rect",
        "hollow_rect",
      ],
      parameterDictionaryEnumeration: [
        "solid_round",
        "hollow_round",
        "solid_rectangular",
        "hollow_rectangular",
        "custom",
      ],
    });
    expect(D02_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(D02_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING.numericRepresentabilityPolicy,
    ).toBe(D02_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("passes the solid-round analytical hand calculation in canonical SI", () => {
    const result = evaluateD02ConductorSectionGeometry(solidRound());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.shape).toBe("solid_round");
      expect(result.value.Ametal).toMatchObject({
        kind: "available",
        quantityId: "Ametal",
        dimensionId: "area",
        canonicalUnitId: "m2",
      });
      expect(result.value.Ametal.value).toBeCloseTo(
        (Math.PI * 0.02 ** 2) / 4,
        16,
      );
      for (const output of [
        result.value.Ahydraulic,
        result.value.Pwetted,
        result.value.Dh,
      ]) {
        expect(output).toMatchObject({
          kind: "unavailable",
          status: "not_applicable",
        });
        expect("value" in output).toBe(false);
        expect("dimensionId" in output).toBe(false);
        expect("canonicalUnitId" in output).toBe(false);
      }
    }
  });

  it("passes the hollow-round analytical hand calculation for all four outputs", () => {
    const result = evaluateD02ConductorSectionGeometry(hollowRound());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      const expectedMetalArea = (Math.PI * (0.02 ** 2 - 0.012 ** 2)) / 4;
      const expectedHydraulicArea = (Math.PI * 0.012 ** 2) / 4;
      expect(result.value.Ametal.value).toBeCloseTo(expectedMetalArea, 16);
      expect(result.value.Ahydraulic.kind).toBe("available");
      expect(result.value.Pwetted.kind).toBe("available");
      expect(result.value.Dh.kind).toBe("available");
      if (
        result.value.Ahydraulic.kind === "available" &&
        result.value.Pwetted.kind === "available" &&
        result.value.Dh.kind === "available"
      ) {
        expect(result.value.Ahydraulic.value).toBeCloseTo(
          expectedHydraulicArea,
          16,
        );
        expect(result.value.Pwetted.value).toBeCloseTo(Math.PI * 0.012, 16);
        expect(result.value.Dh.value).toBeCloseTo(0.012, 16);
        expect(result.value.Ahydraulic.canonicalUnitId).toBe("m2");
        expect(result.value.Pwetted.canonicalUnitId).toBe("m");
        expect(result.value.Dh.canonicalUnitId).toBe("m");
      }
      expect(result.equations).toContain(
        "Dh = 4 * Ahydraulic / Pwetted = d_i",
      );
    }
  });

  it("obeys length and area scaling dimensions", () => {
    const scale = 1e-3;
    const base = evaluateD02ConductorSectionGeometry(hollowRound());
    const scaled = evaluateD02ConductorSectionGeometry(
      hollowRound({
        outerDimensions: { outerDiameterM: 0.02 * scale },
        innerDimensions: { innerDiameterM: 0.012 * scale },
      }),
    );
    expect(base.status).toBe("success");
    expect(scaled.status).toBe("success");
    if (base.status === "success" && scaled.status === "success") {
      expect(scaled.value.Ametal.value).toBeCloseTo(
        base.value.Ametal.value * scale ** 2,
        20,
      );
      if (
        base.value.Ahydraulic.kind === "available" &&
        scaled.value.Ahydraulic.kind === "available" &&
        base.value.Pwetted.kind === "available" &&
        scaled.value.Pwetted.kind === "available" &&
        base.value.Dh.kind === "available" &&
        scaled.value.Dh.kind === "available"
      ) {
        expect(scaled.value.Ahydraulic.value).toBeCloseTo(
          base.value.Ahydraulic.value * scale ** 2,
          20,
        );
        expect(scaled.value.Pwetted.value).toBeCloseTo(
          base.value.Pwetted.value * scale,
          20,
        );
        expect(scaled.value.Dh.value).toBeCloseTo(
          base.value.Dh.value * scale,
          20,
        );
      }
    }
  });

  it.each([
    "solid_rect",
    "hollow_rect",
    "solid_rectangular",
    "hollow_rectangular",
    "custom",
] as const)(
    "fails closed on the unresolved controlled shape %s",
    (shape) => {
      const result = evaluateD02ConductorSectionGeometry({
        shape,
        outerDimensions: {},
        innerDimensions: {},
        applicability: {},
      });
      expect(result).toMatchObject({
        status: "insufficient_data",
        applicabilityStatus: "not_evaluated",
        failure: { code: "D-02.specification_conflict" },
      });
      expect("value" in result).toBe(false);
    },
  );

  it("never infers a center hole or wall thickness", () => {
    const solidWithHole = evaluateD02ConductorSectionGeometry(
      solidRound({
        innerDimensions: {
          innerDiameterM: 0.01,
        } as unknown as null,
      }),
    );
    const hollowWithoutHole = evaluateD02ConductorSectionGeometry(
      hollowRound({ innerDimensions: null as unknown as { innerDiameterM: number } }),
    );
    const hollowWithWallOnly = evaluateD02ConductorSectionGeometry(
      hollowRound({
        innerDimensions: {
          wallThicknessM: 0.004,
        } as unknown as { innerDiameterM: number },
      }),
    );

    expect(solidWithHole).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-02.solid_inner_dimensions_forbidden" },
    });
    expect(hollowWithoutHole).toMatchObject({
      status: "insufficient_data",
      failure: { code: "D-02.inner_dimensions_invalid" },
    });
    expect(hollowWithWallOnly).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-02.inner_dimensions_invalid" },
    });
    for (const result of [solidWithHole, hollowWithoutHole, hollowWithWallOnly]) {
      expect("value" in result).toBe(false);
    }
  });

  it.each([
    ["zero outer diameter", solidRound({ outerDimensions: { outerDiameterM: 0 } })],
    ["negative outer diameter", solidRound({ outerDimensions: { outerDiameterM: -1 } })],
    ["NaN outer diameter", solidRound({ outerDimensions: { outerDiameterM: Number.NaN } })],
    ["infinite outer diameter", solidRound({ outerDimensions: { outerDiameterM: Number.POSITIVE_INFINITY } })],
    ["zero inner diameter", hollowRound({ innerDimensions: { innerDiameterM: 0 } })],
    ["negative inner diameter", hollowRound({ innerDimensions: { innerDiameterM: -1 } })],
    ["NaN inner diameter", hollowRound({ innerDimensions: { innerDiameterM: Number.NaN } })],
    ["infinite inner diameter", hollowRound({ innerDimensions: { innerDiameterM: Number.POSITIVE_INFINITY } })],
  ])("rejects %s without publishing a value", (_name, candidate) => {
    const result = evaluateD02ConductorSectionGeometry(candidate);
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it.each([
    [0.02, 0.02],
    [0.02, 0.021],
  ])(
    "strictly rejects outer diameter %s with inner diameter %s",
    (outerDiameterM, innerDiameterM) => {
      const result = evaluateD02ConductorSectionGeometry(
        hollowRound({
          outerDimensions: { outerDiameterM },
          innerDimensions: { innerDiameterM },
        }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "D-02.inner_not_nested" },
      });
      expect("value" in result).toBe(false);
    },
  );

  it("fails closed when binary64 cannot represent positive derived geometry", () => {
    const overflow = evaluateD02ConductorSectionGeometry(
      solidRound({ outerDimensions: { outerDiameterM: 1e308 } }),
    );
    const underflow = evaluateD02ConductorSectionGeometry(
      hollowRound({
        outerDimensions: { outerDiameterM: 2e-300 },
        innerDimensions: { innerDiameterM: 1e-300 },
      }),
    );
    for (const result of [overflow, underflow]) {
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "D-02.numeric_resolution_invalid" },
      });
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed on positive-subnormal hydraulic area before it can corrupt Dh", () => {
    const innerDiameterM = 2.3e-162;
    const result = evaluateD02ConductorSectionGeometry(
      hollowRound({
        outerDimensions: { outerDiameterM: 4.6e-162 },
        innerDimensions: { innerDiameterM },
      }),
    );

    // The exact circular identity is Dh = d_i. A positive-subnormal
    // intermediate previously produced a finite but materially corrupted Dh.
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-02.numeric_resolution_invalid" },
    });
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    expect(innerDiameterM).toBeGreaterThan(D02_BINARY64_MIN_NORMAL);
  });

  it("rejects extra or mismatched dimension fields", () => {
    const extraTopLevel = evaluateD02ConductorSectionGeometry({
      ...solidRound(),
      legacyAreaM2: 1,
    } as unknown as D02ConductorSectionGeometryInput);
    const extraOuter = evaluateD02ConductorSectionGeometry(
      solidRound({
        outerDimensions: {
          outerDiameterM: 0.02,
          legacyWidthM: 0.02,
        } as unknown as { outerDiameterM: number },
      }),
    );
    const extraInner = evaluateD02ConductorSectionGeometry(
      hollowRound({
        innerDimensions: {
          innerDiameterM: 0.012,
          wallThicknessM: 0.004,
        } as unknown as { innerDiameterM: number },
      }),
    );
    expect(extraTopLevel.status).toBe("invalid_input");
    expect(extraOuter.status).toBe("invalid_input");
    expect(extraInner.status).toBe("invalid_input");
    expect("value" in extraTopLevel).toBe(false);
    expect("value" in extraOuter).toBe(false);
    expect("value" in extraInner).toBe(false);
  });

  it("requires ideal constant clean-section applicability evidence", () => {
    const candidates: readonly D02ConductorSectionGeometryInput[] = [
      hollowRound({
        applicability: {
          ...hollowApplicability,
          sectionUniformity: "varying_or_unknown",
        },
      }),
      hollowRound({
        applicability: {
          ...hollowApplicability,
          sectionBasis: "actual_cad_required_or_unknown",
        },
      }),
      hollowRound({
        applicability: {
          ...hollowApplicability,
          depositState: "present_or_unknown",
        },
      }),
      hollowRound({
        applicability: {
          ...hollowApplicability,
          voidPlacement: "eccentric_or_unknown",
        },
      }),
    ];
    for (const candidate of candidates) {
      const result = evaluateD02ConductorSectionGeometry(candidate);
      expect(result.status).toBe("not_applicable");
      expect(result.applicabilityStatus).toBe("out_of_domain");
      expect("value" in result).toBe(false);
    }
  });

  it("rejects missing or uncontrolled applicability evidence", () => {
    const missing = evaluateD02ConductorSectionGeometry(
      hollowRound({ applicability: undefined as unknown as typeof hollowApplicability }),
    );
    const uncontrolled = evaluateD02ConductorSectionGeometry(
      hollowRound({
        applicability: {
          ...hollowApplicability,
          sectionBasis:
            "legacy_ideal" as unknown as "ideal_declared_dimensions",
        },
      }),
    );
    expect(missing.status).toBe("insufficient_data");
    expect(uncontrolled.status).toBe("invalid_input");
    expect("value" in missing).toBe(false);
    expect("value" in uncontrolled).toBe(false);
  });

  it("does not coerce a hostile shape enumeration", () => {
    const hostileShape = {
      toString() {
        throw new Error("must not coerce hostile D-02 shape");
      },
      [Symbol.toPrimitive]() {
        throw new Error("must not coerce hostile D-02 shape");
      },
    };
    const candidate = {
      ...solidRound(),
      shape: hostileShape,
    } as unknown as D02ConductorSectionGeometryInput;
    expect(() => evaluateD02ConductorSectionGeometry(candidate)).not.toThrow();
    const result = evaluateD02ConductorSectionGeometry(candidate);
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("fails closed without executing accessors or hostile reflection traps", () => {
    const topAccessor = Object.defineProperty(
      { ...solidRound() },
      "shape",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute D-02 top-level accessor");
        },
      },
    );
    const topProxy = new Proxy(solidRound(), {
      ownKeys() {
        throw new Error("hostile D-02 top-level reflection trap");
      },
    });
    const outerAccessor = Object.defineProperty(
      { outerDiameterM: 0.02 },
      "outerDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute D-02 outer accessor");
        },
      },
    );
    const innerProxy = new Proxy(
      { innerDiameterM: 0.012 },
      {
        getOwnPropertyDescriptor() {
          throw new Error("hostile D-02 inner reflection trap");
        },
      },
    );
    const applicabilityAccessor = Object.defineProperty(
      { ...hollowApplicability },
      "voidPlacement",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute D-02 applicability accessor");
        },
      },
    );

    const candidates = [
      topAccessor,
      topProxy,
      solidRound({
        outerDimensions: outerAccessor as unknown as { outerDiameterM: number },
      }),
      hollowRound({
        innerDimensions: innerProxy,
      }),
      hollowRound({
        applicability:
          applicabilityAccessor as unknown as typeof hollowApplicability,
      }),
    ];
    for (const candidate of candidates) {
      expect(() =>
        evaluateD02ConductorSectionGeometry(
          candidate as unknown as D02ConductorSectionGeometryInput,
        ),
      ).not.toThrow();
      const result = evaluateD02ConductorSectionGeometry(
        candidate as unknown as D02ConductorSectionGeometryInput,
      );
      expect(["invalid_input", "insufficient_data"]).toContain(result.status);
      expect("value" in result).toBe(false);
    }
  });

  it("deep-freezes every successful output envelope", () => {
    for (const candidate of [solidRound(), hollowRound()]) {
      const result = evaluateD02ConductorSectionGeometry(candidate);
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.value)).toBe(true);
        expect(Object.isFrozen(result.value.Ametal)).toBe(true);
        expect(Object.isFrozen(result.value.Ahydraulic)).toBe(true);
        expect(Object.isFrozen(result.value.Pwetted)).toBe(true);
        expect(Object.isFrozen(result.value.Dh)).toBe(true);
        expect(Object.isFrozen(result.equations)).toBe(true);
        expect(Object.isFrozen(result.substitution)).toBe(true);
        expect(Object.isFrozen(result.assumptions)).toBe(true);
      }
    }
  });
});
