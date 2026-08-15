import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  D01_BINARY64_MIN_NORMAL,
  D01_CONDUCTOR_PATH_LENGTH_MAPPING,
  D01_NUMERIC_REPRESENTABILITY_POLICY,
  D01_WARNING_PREDICATES,
  evaluateD01ConductorPathLength,
  type D01ConductorPathLengthInput,
  type D01PathApplicabilityEvidence,
} from "../../../src/methods/D/d01ConductorPathLength.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import { toCanonicalSI } from "../../../src/units/conversion.js";

const applicablePath = Object.freeze({
  pathGeometry: "uniform_cylindrical_helix",
  meanDiameterBasis: "mechanical_or_cad_conductor_center_path",
  revolutionCountBasis: "actual_mechanical_or_cad_path",
  axialAdvanceBasis: "actual_path_endpoint_advance",
  turnCenterSpanConsistency: "consistent",
} as const satisfies D01PathApplicabilityEvidence);

function input(
  overrides: Partial<D01ConductorPathLengthInput> = {},
): D01ConductorPathLengthInput {
  return {
    meanMechanicalPathDiameterM: 0.5,
    helixRevolutionCount: 4.25,
    helixAxialAdvanceM: 0.8,
    leadSegmentLengthsM: [0.4, 0.6],
    busSegmentLengthsM: [0.25, 0.75],
    applicability: applicablePath,
    ...overrides,
  };
}

function successfulValue(candidate: unknown) {
  const result = evaluateD01ConductorPathLength(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(result.failure?.message ?? "Unexpected D-01 failure.");
  }
  return result.value;
}

function expectFailureWithoutValue(
  candidate: unknown,
  expectedStatus: "invalid_input" | "insufficient_data" | "not_applicable",
  expectedCode?: string,
): void {
  const result = evaluateD01ConductorPathLength(candidate);
  expect(result.status).toBe(expectedStatus);
  expect("value" in result).toBe(false);
  if (expectedCode !== undefined && "failure" in result) {
    expect(result.failure.code).toBe(expectedCode);
  }
}

describe("D-01 mechanical/CAD conductor center-path length", () => {
  it("maps only to the frozen D-01 specification and remains runtime-disabled", () => {
    expect(D01_CONDUCTOR_PATH_LENGTH_MAPPING).toMatchObject({
      methodId: "D-01",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#D-01:Equation",
      sourceRefs: ["ID-GEO-02"],
      contractSourceRefs: ["ID-GEO-02", "DER-GEO"],
      derivationRefs: ["ID-GEO-02", "DER-GEO"],
      validationCaseIds: [],
      methodCheckIds: ["GEO-LEN-001"],
      stableWarningIds: [],
    });
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-01"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(D01_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(D01_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      D01_CONDUCTOR_PATH_LENGTH_MAPPING.numericRepresentabilityPolicy,
    ).toBe(D01_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("evaluates a synthetic 3-4-5 helix and keeps helix, lead, bus, and total separate", () => {
    const result = evaluateD01ConductorPathLength(
      input({
        meanMechanicalPathDiameterM: 3 / Math.PI,
        helixRevolutionCount: 1,
        helixAxialAdvanceM: 4,
        leadSegmentLengthsM: [1, 2],
        busSegmentLengthsM: [0.25, 0.75],
      }),
    );
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value).toEqual({
        helixLengthM: 5,
        leadLengthM: 3,
        busLengthM: 1,
        totalLengthM: 9,
        knownPathLowerBoundM: 9,
        dimensionId: "length",
        canonicalUnitId: "m",
        pathCompleteness: "complete",
        diameterInterpretation: "mechanical_or_cad_conductor_center_path",
      });
      expect(result.substitution).toMatchObject({
        circumferentialTravelM: 3,
        helixAxialAdvanceM: 4,
      });
      expect(result.warningIds).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.numericRepresentabilityPolicy).toBe(
        D01_NUMERIC_REPRESENTABILITY_POLICY,
      );
    }
  });

  it("passes the frozen zero-axial-advance analytical limit", () => {
    const candidate = input({
      meanMechanicalPathDiameterM: 0.42,
      helixRevolutionCount: 3.5,
      helixAxialAdvanceM: 0,
      leadSegmentLengthsM: [],
      busSegmentLengthsM: [],
    });
    const result = evaluateD01ConductorPathLength(candidate);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value.helixLengthM).toBeCloseTo(
        Math.PI *
          candidate.meanMechanicalPathDiameterM *
          candidate.helixRevolutionCount,
        15,
      );
      expect(result.value.totalLengthM).toBe(result.value.helixLengthM);
    }
  });

  it("treats axial advance as a signed endpoint displacement in the length norm", () => {
    const positive = successfulValue(input({ helixAxialAdvanceM: 0.8 }));
    const negative = successfulValue(input({ helixAxialAdvanceM: -0.8 }));
    expect(negative.helixLengthM).toBe(positive.helixLengthM);
  });

  it("obeys length scaling while N_rev remains dimensionless", () => {
    const baseInput = input();
    const scale = 7;
    const base = successfulValue(baseInput);
    const scaled = successfulValue(
      input({
        meanMechanicalPathDiameterM:
          baseInput.meanMechanicalPathDiameterM * scale,
        helixRevolutionCount: baseInput.helixRevolutionCount,
        helixAxialAdvanceM: baseInput.helixAxialAdvanceM * scale,
        leadSegmentLengthsM: baseInput.leadSegmentLengthsM?.map(
          (value) => value * scale,
        ) ?? null,
        busSegmentLengthsM: baseInput.busSegmentLengthsM?.map(
          (value) => value * scale,
        ) ?? null,
      }),
    );
    expect(scaled.helixLengthM).toBeCloseTo(base.helixLengthM * scale, 13);
    expect(scaled.leadLengthM).toBeCloseTo(
      (base.leadLengthM as number) * scale,
      13,
    );
    expect(scaled.busLengthM).toBeCloseTo(
      (base.busLengthM as number) * scale,
      13,
    );
    expect(scaled.totalLengthM).toBeCloseTo(
      (base.totalLengthM as number) * scale,
      13,
    );
  });

  it("accepts canonical-SI values produced independently by the unit layer", () => {
    const meanDiameterM = toCanonicalSI(500, "mm", "length");
    const axialAdvanceM = toCanonicalSI(800, "mm", "length");
    const value = successfulValue(
      input({
        meanMechanicalPathDiameterM: meanDiameterM,
        helixAxialAdvanceM: axialAdvanceM,
        leadSegmentLengthsM: [toCanonicalSI(400, "mm", "length")],
        busSegmentLengthsM: [toCanonicalSI(250, "mm", "length")],
      }),
    );
    expect(value.helixLengthM).toBeCloseTo(
      Math.hypot(
        Math.PI * meanDiameterM * 4.25,
        axialAdvanceM,
      ),
      15,
    );
    expect(value.leadLengthM).toBe(0.4);
    expect(value.busLengthM).toBe(0.25);
  });

  it("returns a clearly marked lower bound when a lead or bus group is unknown", () => {
    const result = evaluateD01ConductorPathLength(
      input({
        leadSegmentLengthsM: null,
        busSegmentLengthsM: [0.25],
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    if (result.status === "success_with_warnings") {
      expect(result.value.leadLengthM).toBeNull();
      expect(result.value.busLengthM).toBe(0.25);
      expect(result.value.totalLengthM).toBeNull();
      expect(result.value.knownPathLowerBoundM).toBeCloseTo(
        result.value.helixLengthM + 0.25,
        15,
      );
      expect(result.value.pathCompleteness).toBe("lower_bound_only");
      expect(result.warnings.map((warning) => warning.predicate)).toEqual([
        D01_WARNING_PREDICATES.leadOrBusLengthUnknown,
      ]);
    }

    const coilOnly = evaluateD01ConductorPathLength(
      input({ leadSegmentLengthsM: null, busSegmentLengthsM: null }),
    );
    expect(coilOnly.status).toBe("success_with_warnings");
    if (coilOnly.status === "success_with_warnings") {
      expect(coilOnly.value.knownPathLowerBoundM).toBe(
        coilOnly.value.helixLengthM,
      );
      expect(coilOnly.value.totalLengthM).toBeNull();
    }
  });

  it("retains an actual endpoint advance but warns on independent span inconsistency", () => {
    const result = evaluateD01ConductorPathLength(
      input({
        applicability: {
          ...applicablePath,
          turnCenterSpanConsistency: "inconsistent",
        },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    if (result.status === "success_with_warnings") {
      expect(result.value.totalLengthM).not.toBeNull();
      expect(result.warnings.map((warning) => warning.predicate)).toEqual([
        D01_WARNING_PREDICATES.axialAdvanceConflict,
      ]);
    }
  });

  it.each([
    [
      "noncircular/multilayer path",
      { ...applicablePath, pathGeometry: "noncircular_or_multilayer" },
      "not_applicable",
      "D-01.path_geometry_not_applicable",
    ],
    [
      "unknown path geometry",
      { ...applicablePath, pathGeometry: "other_or_unknown" },
      "insufficient_data",
      "D-01.applicability_evidence_missing",
    ],
    [
      "electromagnetic D_c basis",
      {
        ...applicablePath,
        meanDiameterBasis: "electromagnetic_effective_current_path",
      },
      "invalid_input",
      "D-01.mean_diameter_is_electromagnetic_path",
    ],
    [
      "unknown diameter basis",
      { ...applicablePath, meanDiameterBasis: "other_or_unknown" },
      "insufficient_data",
      "D-01.mean_diameter_basis_unconfirmed",
    ],
    [
      "N_rev guessed from N",
      {
        ...applicablePath,
        revolutionCountBasis: "guessed_from_electrical_turn_count",
      },
      "insufficient_data",
      "D-01.revolution_count_guessed",
    ],
    [
      "unknown N_rev basis",
      { ...applicablePath, revolutionCountBasis: "other_or_unknown" },
      "insufficient_data",
      "D-01.revolution_count_basis_unconfirmed",
    ],
    [
      "axial advance guessed from b_cc",
      {
        ...applicablePath,
        axialAdvanceBasis: "guessed_from_turn_center_span",
      },
      "insufficient_data",
      "D-01.axial_advance_guessed",
    ],
    [
      "unknown axial advance basis",
      { ...applicablePath, axialAdvanceBasis: "other_or_unknown" },
      "insufficient_data",
      "D-01.axial_advance_basis_unconfirmed",
    ],
  ] as const)(
    "fails closed for %s",
    (_name, applicability, expectedStatus, expectedCode) => {
      expectFailureWithoutValue(
        input({
          applicability: applicability as D01PathApplicabilityEvidence,
        }),
        expectedStatus,
        expectedCode,
      );
    },
  );

  it.each([
    ["zero D_m", { meanMechanicalPathDiameterM: 0 }],
    ["negative D_m", { meanMechanicalPathDiameterM: -1 }],
    ["zero N_rev", { helixRevolutionCount: 0 }],
    ["NaN N_rev", { helixRevolutionCount: Number.NaN }],
    ["infinite delta_z", { helixAxialAdvanceM: Number.POSITIVE_INFINITY }],
    ["negative lead segment", { leadSegmentLengthsM: [0.1, -0.01] }],
    ["NaN bus segment", { busSegmentLengthsM: [Number.NaN] }],
    ["sparse lead segments", { leadSegmentLengthsM: new Array(2) }],
  ])("rejects %s without a value", (_name, overrides) => {
    expectFailureWithoutValue(input(overrides), "invalid_input");
  });

  it("rejects uncontrolled applicability values without string coercion", () => {
    const hostileEnum = Object.freeze({
      toString() {
        throw new Error("must not coerce hostile enum");
      },
    });
    expect(() =>
      evaluateD01ConductorPathLength(
        input({
          applicability: {
            ...applicablePath,
            pathGeometry: hostileEnum as unknown as "other_or_unknown",
          },
        }),
      ),
    ).not.toThrow();
    expectFailureWithoutValue(
      input({
        applicability: {
          ...applicablePath,
          pathGeometry: hostileEnum as unknown as "other_or_unknown",
        },
      }),
      "invalid_input",
      "D-01.applicability_evidence_invalid",
    );
  });

  it("fails closed without executing top-level or applicability accessors and traps", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "meanMechanicalPathDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topLevelProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level reflection trap");
      },
    });
    const applicabilityAccessor = Object.defineProperty(
      { ...applicablePath },
      "meanDiameterBasis",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute applicability accessor");
        },
      },
    );
    const applicabilityProxy = new Proxy(applicablePath, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile applicability reflection trap");
      },
    });

    for (const candidate of [
      topLevelAccessor,
      topLevelProxy,
      input({
        applicability:
          applicabilityAccessor as unknown as D01PathApplicabilityEvidence,
      }),
      input({ applicability: applicabilityProxy }),
    ]) {
      expect(() => evaluateD01ConductorPathLength(candidate)).not.toThrow();
      expectFailureWithoutValue(candidate, "invalid_input");
    }
  });

  it("fails closed without executing segment element accessors or Proxy traps", () => {
    const accessorSegments = Object.defineProperty([0.2], "0", {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error("must not execute segment accessor");
      },
    });
    const proxySegments = new Proxy([0.2], {
      ownKeys() {
        throw new Error("hostile segment reflection trap");
      },
    });
    for (const candidate of [
      input({
        leadSegmentLengthsM:
          accessorSegments as unknown as readonly number[],
      }),
      input({ busSegmentLengthsM: proxySegments }),
    ]) {
      expect(() => evaluateD01ConductorPathLength(candidate)).not.toThrow();
      expectFailureWithoutValue(
        candidate,
        "invalid_input",
        "D-01.segment_lengths_invalid",
      );
    }
  });

  it("fails closed when finite positive values overflow the frozen equation or sum", () => {
    expectFailureWithoutValue(
      input({
        meanMechanicalPathDiameterM: Number.MAX_VALUE,
        helixRevolutionCount: 2,
      }),
      "invalid_input",
      "D-01.numeric_resolution_invalid",
    );
    expectFailureWithoutValue(
      input({
        meanMechanicalPathDiameterM: 0.1,
        helixRevolutionCount: 1,
        leadSegmentLengthsM: [Number.MAX_VALUE, Number.MAX_VALUE],
      }),
      "invalid_input",
      "D-01.numeric_resolution_invalid",
    );
  });

  it("fails closed before a positive subnormal pi*D_m term is magnified by N_rev", () => {
    const diameterM = Number.MIN_VALUE;
    const revolutionCount = 1e308;
    const pollutedPiTimesDiameterM = Math.PI * diameterM;
    const pollutedTravelM = pollutedPiTimesDiameterM * revolutionCount;
    const stableIdentityM = Math.PI * (diameterM * revolutionCount);

    expect(pollutedPiTimesDiameterM).toBeGreaterThan(0);
    expect(pollutedPiTimesDiameterM).toBeLessThan(D01_BINARY64_MIN_NORMAL);
    expect(Math.abs((pollutedTravelM - stableIdentityM) / stableIdentityM)).toBeGreaterThan(
      0.04,
    );
    expectFailureWithoutValue(
      input({
        meanMechanicalPathDiameterM: diameterM,
        helixRevolutionCount: revolutionCount,
        helixAxialAdvanceM: 0,
        leadSegmentLengthsM: [],
        busSegmentLengthsM: [],
      }),
      "invalid_input",
      "D-01.numeric_resolution_invalid",
    );
  });

  it("fails closed for subnormal later helix terms and a non-normal signed axial magnitude", () => {
    for (const candidate of [
      input({
        meanMechanicalPathDiameterM: 1,
        helixRevolutionCount: Number.MIN_VALUE,
        helixAxialAdvanceM: 0,
      }),
      input({ helixAxialAdvanceM: -Number.MIN_VALUE }),
    ]) {
      expectFailureWithoutValue(
        candidate,
        "invalid_input",
        "D-01.numeric_resolution_invalid",
      );
    }
  });

  it("fails closed when hypot overflows even though both frozen norm terms are finite", () => {
    expectFailureWithoutValue(
      input({
        meanMechanicalPathDiameterM: Number.MAX_VALUE / (2 * Math.PI),
        helixRevolutionCount: 1,
        helixAxialAdvanceM: Number.MAX_VALUE,
        leadSegmentLengthsM: [],
        busSegmentLengthsM: [],
      }),
      "invalid_input",
      "D-01.numeric_resolution_invalid",
    );
  });

  it("fails closed when a positive segment is swallowed inside a group or by the total", () => {
    const swallowedNormalLengthM = Number.EPSILON / 4;
    for (const candidate of [
      input({ leadSegmentLengthsM: [1, swallowedNormalLengthM] }),
      input({
        meanMechanicalPathDiameterM: 1 / Math.PI,
        helixRevolutionCount: 1,
        helixAxialAdvanceM: 0,
        leadSegmentLengthsM: [swallowedNormalLengthM],
        busSegmentLengthsM: [],
      }),
    ]) {
      expectFailureWithoutValue(
        candidate,
        "invalid_input",
        "D-01.numeric_resolution_invalid",
      );
    }
  });

  it("keeps known applicability exclusions ahead of machine representability", () => {
    const machineAttack = {
      meanMechanicalPathDiameterM: Number.MIN_VALUE,
      helixRevolutionCount: 1e308,
      helixAxialAdvanceM: 0,
    } as const;
    expectFailureWithoutValue(
      input({
        ...machineAttack,
        applicability: {
          ...applicablePath,
          pathGeometry: "noncircular_or_multilayer",
        },
      }),
      "not_applicable",
      "D-01.path_geometry_not_applicable",
    );
    expectFailureWithoutValue(
      input({
        ...machineAttack,
        applicability: {
          ...applicablePath,
          pathGeometry: "other_or_unknown",
        },
      }),
      "insufficient_data",
      "D-01.applicability_evidence_missing",
    );
  });

  it("returns immutable success evidence and snapshots segment arrays", () => {
    const leadSegments = [0.4, 0.6];
    const result = evaluateD01ConductorPathLength(
      input({ leadSegmentLengthsM: leadSegments }),
    );
    expect(result.status).toBe("success");
    leadSegments[0] = 99;
    if (result.status === "success") {
      expect(result.value.leadLengthM).toBe(1);
      expect(result.substitution.leadSegmentLengthsM).toEqual([0.4, 0.6]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.substitution)).toBe(true);
      expect(Object.isFrozen(result.substitution.leadSegmentLengthsM)).toBe(
        true,
      );
    }
  });
});
