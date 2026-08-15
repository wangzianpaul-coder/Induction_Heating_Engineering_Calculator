import { describe, expect, it } from "vitest";

import {
  B04_ASSUMPTIONS,
  B04_BRANCH_POINT_RELATIVE_LIMIT,
  B04_IMPLEMENTATION_READINESS,
  B04_L85_TABLE_1_VALIDATION_NODES,
  B04_LUNDIN_COEFFICIENTS,
  B04_METHOD_MAPPING,
  B04_VACUUM_PERMEABILITY_H_PER_M,
  B04_WARNING_PREDICATES,
  evaluateB04LundinAuxiliaryFunctions,
  evaluateB04NagaokaLundinCurrentSheet,
  type B04CurrentSheetApplicabilityEvidence,
  type B04GeometrySemanticEvidence,
  type B04NagaokaLundinInput,
  type B04NagaokaLundinSuccess,
} from "../../../src/methods/B/b04NagaokaLundinCurrentSheet.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"a".repeat(64)}`;

const BASE_GEOMETRY_EVIDENCE = Object.freeze({
  normalizedByMethodId: "B-01",
  normalizedByMethodVersion: "1.0.0-gate0",
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  semanticMappingStatus: "confirmed_same_B01_snapshot",
  currentPathDiameterParameterId: "coil.current_path_diameter",
  normalizedCurrentPathDiameterM: 0.2,
  windingEnvelopeLengthParameterId: "coil.winding_envelope_length",
  normalizedWindingEnvelopeLengthM: 0.4,
  electricalTurnCountParameterId: "coil.electrical_turn_count",
  normalizedElectricalTurnCount: 10,
  currentPathBasis: "explicit_method_or_state_bound",
} as const satisfies B04GeometrySemanticEvidence);

const BASE_APPLICABILITY_EVIDENCE = Object.freeze({
  windingClass: "uniform_single_layer",
  airCoreStatus: "confirmed_air_core",
  currentSheetIdealization: "confirmed_for_analytical_baseline",
} as const satisfies B04CurrentSheetApplicabilityEvidence);

type InputOverrides = Partial<
  Omit<
    B04NagaokaLundinInput,
    "geometryEvidence" | "applicabilityEvidence"
  >
> & {
  readonly geometryEvidence?: Partial<B04GeometrySemanticEvidence>;
  readonly applicabilityEvidence?: Partial<B04CurrentSheetApplicabilityEvidence>;
};

function input(overrides: InputOverrides = {}): B04NagaokaLundinInput {
  const { geometryEvidence, applicabilityEvidence, ...scalars } = overrides;
  const normalizedScalars = {
    currentPathDiameterM: 0.2,
    windingEnvelopeLengthM: 0.4,
    electricalTurnCount: 10,
    ...scalars,
  };
  return {
    ...normalizedScalars,
    geometryEvidence: {
      ...BASE_GEOMETRY_EVIDENCE,
      normalizedCurrentPathDiameterM:
        normalizedScalars.currentPathDiameterM,
      normalizedWindingEnvelopeLengthM:
        normalizedScalars.windingEnvelopeLengthM,
      normalizedElectricalTurnCount:
        normalizedScalars.electricalTurnCount,
      ...geometryEvidence,
    },
    applicabilityEvidence: {
      ...BASE_APPLICABILITY_EVIDENCE,
      ...applicabilityEvidence,
    },
  };
}

function successOf(candidate: unknown): B04NagaokaLundinSuccess {
  const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    return result;
  }
  throw new Error(`Expected B-04 success, received ${result.status}.`);
}

function expectTolId(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-12 * Math.max(1, Math.abs(expected)),
  );
}

function expectedFunctions(x: number): { readonly f1: number; readonly f2: number } {
  const x2 = x * x;
  return {
    f1:
      (1 +
        B04_LUNDIN_COEFFICIENTS.f1NumeratorX * x +
        B04_LUNDIN_COEFFICIENTS.f1NumeratorX2 * x2) /
      (1 + B04_LUNDIN_COEFFICIENTS.f1DenominatorX * x),
    f2:
      B04_LUNDIN_COEFFICIENTS.f2X * x +
      B04_LUNDIN_COEFFICIENTS.f2X2 * x2 +
      B04_LUNDIN_COEFFICIENTS.f2X3 * x2 * x,
  };
}

describe("B-04 Nagaoka/Lundin finite cylindrical current sheet", () => {
  it("maps exactly to the frozen registry, sources, validations, and method check", () => {
    expect(B04_METHOD_MAPPING).toMatchObject({
      methodId: "B-04",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#B-04:Equation",
      sourceRefs: [
        "L85:PDF3-4:eq9-12:table1",
        "N09:PDF20-21:eq15-18",
        "CODATA22",
      ],
      contractSourceRefs: [
        "L85:PDF3-4:PRINT1428-1429:eq9-12:table1",
        "N09:PDF20-21:PRINT19-20:eq15-18",
        "N09:PDF32-34:tables",
        "CODATA22",
      ],
      derivationRefs: [],
      validationCaseIds: ["EM-L-003", "EM-L-006", "EM-L-001"],
      methodCheckIds: ["EM-L-BRANCH-001"],
      inputParameterIds: [
        "coil.current_path_diameter",
        "coil.winding_envelope_length",
        "coil.electrical_turn_count",
      ],
      outputQuantityIds: ["L_sheet", "K_N"],
      stableWarningIds: [],
    });
    expect(B04_METHOD_MAPPING.warningPredicates).toEqual([
      B04_WARNING_PREDICATES.fewTurnsPitchOrThickConductor,
      B04_WARNING_PREDICATES.meanCurrentPathUncertain,
      B04_WARNING_PREDICATES.branchDisagreement,
      B04_WARNING_PREDICATES.coefficientMultipliedTwice,
    ]);
    expect(B04_VACUUM_PERMEABILITY_H_PER_M).toBe(1.25663706127e-6);
  });

  it("records the Table 1 release cross-check gap without replacing Equations 11-12", () => {
    expect(B04_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        {
          gateId: "B-04.EM-L-003.release-source-cross-check",
          sourceReviewStatus: "pending_release_cross_check",
        },
        { gateId: "B-04.stable-warning-ids-and-policy" },
      ],
    });

    for (const sourceRow of B04_L85_TABLE_1_VALIDATION_NODES) {
      const result = evaluateB04LundinAuxiliaryFunctions({ x: sourceRow.x });
      expect(result.status).toBe("success");
      if (result.status !== "success") {
        throw new Error("Expected L85 auxiliary evaluation success.");
      }
      const expected = expectedFunctions(sourceRow.x);
      expect(result.f1).toBe(expected.f1);
      expect(result.f2).toBe(expected.f2);
      expect(result.tableValuesAreNotSubstituted).toBe(true);
    }

    const quarter = evaluateB04LundinAuxiliaryFunctions({ x: 0.25 });
    const one = evaluateB04LundinAuxiliaryFunctions({ x: 1 });
    if (quarter.status === "success" && one.status === "success") {
      expect(quarter.f2).not.toBe(0.023573);
      expect(one.f1).not.toBe(1.112836);
      expect(one.f2).not.toBe(0.095072);
    }
  });

  it("implements the stable long-sheet Eq. 9 branch in canonical SI", () => {
    const result = successOf(input());
    const x = 0.25;
    const functions = expectedFunctions(x);
    const radiusM = 0.1;
    const expectedLInf =
      (B04_VACUUM_PERMEABILITY_H_PER_M *
        10 ** 2 *
        Math.PI *
        radiusM ** 2) /
      0.4;
    const expectedK = functions.f1 - (4 / (3 * Math.PI)) * 0.5;

    expect(result.status).toBe("success");
    expect(result.value.branch).toBe("long_2a_lte_b");
    expect(result.value.x).toBe(x);
    expect(result.value.f1).toBe(functions.f1);
    expect(result.value.f2).toBe(functions.f2);
    expectTolId(result.value.longSolenoidLimit.valueSi, expectedLInf);
    expectTolId(result.value.nagaokaCoefficient.valueSi, expectedK);
    expectTolId(
      result.value.sheetInductance.valueSi,
      expectedLInf * expectedK,
    );
    expect(result.evidence.equation.selectedBranch).toBe(
      "long_2a_lte_b",
    );
    expect(result.evidence.equation.sourceEquationNumbers).toEqual([
      "L85-Eq9",
      "L85-Eq10",
      "L85-Eq11",
      "L85-Eq12",
    ]);
  });

  it("implements the stable short-sheet Eq. 10 branch in canonical SI", () => {
    const result = successOf(
      input({ currentPathDiameterM: 0.4, windingEnvelopeLengthM: 0.2 }),
    );
    const x = 0.25;
    const functions = expectedFunctions(x);
    const radiusM = 0.2;
    const shortFactor =
      (Math.log(8 * radiusM / 0.2) - 0.5) * functions.f1 +
      functions.f2;
    const expectedL =
      B04_VACUUM_PERMEABILITY_H_PER_M * 10 ** 2 * radiusM * shortFactor;

    expect(result.value.branch).toBe("short_2a_gt_b");
    expect(result.value.x).toBe(x);
    expectTolId(result.value.sheetInductance.valueSi, expectedL);
    expectTolId(
      result.value.nagaokaCoefficient.valueSi,
      result.value.sheetInductance.valueSi /
        result.value.longSolenoidLimit.valueSi,
    );
  });

  it("selects Eq. 9 at 2a=b and uses only the frozen branch-point tolerance", () => {
    const boundary = successOf(
      input({ currentPathDiameterM: 0.2, windingEnvelopeLengthM: 0.2 }),
    );
    expect(boundary.applicabilityStatus).toBe("at_boundary");
    expect(boundary.value.branch).toBe("long_2a_lte_b");
    expect(boundary.value.x).toBe(1);
    expect(boundary.evidence.boundaryCheck.kind).toBe("evaluated");
    if (boundary.evidence.boundaryCheck.kind === "evaluated") {
      expect(boundary.evidence.boundaryCheck.methodCheckId).toBe(
        "EM-L-BRANCH-001",
      );
      expect(
        boundary.evidence.boundaryCheck.relativeDisagreement,
      ).toBeCloseTo(2.5815036158291397e-6, 15);
      expect(
        boundary.evidence.boundaryCheck.relativeDisagreement,
      ).toBeLessThanOrEqual(B04_BRANCH_POINT_RELATIVE_LIMIT);
      expect(boundary.evidence.boundaryCheck.relativeLimit).toBe(3e-6);
      expect(boundary.evidence.boundaryCheck.toleranceBasis).not.toContain(
        "TOL-ID",
      );
    }

    const justLong = successOf(
      input({
        currentPathDiameterM: 0.2,
        windingEnvelopeLengthM: 0.200000000001,
      }),
    );
    const justShort = successOf(
      input({
        currentPathDiameterM: 0.2,
        windingEnvelopeLengthM: 0.199999999999,
      }),
    );
    expect(justLong.value.branch).toBe("long_2a_lte_b");
    expect(justShort.value.branch).toBe("short_2a_gt_b");
  });

  it("publishes K_N exactly once with positive SI inductance and identity-only TOL-ID traces", () => {
    const result = successOf(input());
    const lSheet = result.value.sheetInductance.valueSi;
    const lInf = result.value.longSolenoidLimit.valueSi;
    const kN = result.value.nagaokaCoefficient.valueSi;

    expect(lSheet).toBeGreaterThan(0);
    expect(lInf).toBeGreaterThan(0);
    expect(kN).toBeGreaterThan(0);
    expect(kN).toBeLessThan(1);
    expectTolId(kN, lSheet / lInf);
    expectTolId(lSheet, lInf * kN);
    expect(result.evidence.identities).toHaveLength(3);
    expect(
      result.evidence.identities.every(
        (identity) =>
          identity.toleranceId === "TOL-ID" &&
          identity.tolerancePurpose === "synthetic_identity_only",
      ),
    ).toBe(true);
    expect(result.evidence.warningPolicy.coefficientAppliedExactlyOnce).toBe(
      true,
    );
    expect(result.evidence.units).toEqual({
      currentPathDiameter: "m",
      windingEnvelopeLength: "m",
      radius: "m",
      turnCount: "one",
      coefficient: "one",
      inductance: "H",
      dimensionalIdentity: "(H/m)*m=H",
    });
  });

  it("implements EM-L-001 monotonic convergence toward the long-solenoid limit", () => {
    const ratios = [2, 5, 10, 20, 50];
    const coefficients = ratios.map((ratio) =>
      successOf(
        input({
          currentPathDiameterM: 0.2,
          windingEnvelopeLengthM: 0.2 * ratio,
        }),
      ).value.nagaokaCoefficient.valueSi,
    );

    for (let index = 1; index < coefficients.length; index += 1) {
      expect(coefficients[index]).toBeGreaterThan(coefficients[index - 1]!);
    }
    expect(coefficients.at(-1)).toBeLessThan(1);
    expect(1 - coefficients.at(-1)!).toBeLessThan(1 - coefficients[0]!);
  });

  it("preserves analytical N-squared and geometric length scaling", () => {
    const base = successOf(input());
    const doubledTurns = successOf(input({ electricalTurnCount: 20 }));
    const scaledGeometry = successOf(
      input({
        currentPathDiameterM: 2,
        windingEnvelopeLengthM: 4,
      }),
    );

    expectTolId(
      doubledTurns.value.sheetInductance.valueSi /
        base.value.sheetInductance.valueSi,
      4,
    );
    expectTolId(
      scaledGeometry.value.sheetInductance.valueSi /
        base.value.sheetInductance.valueSi,
      10,
    );
    expectTolId(
      scaledGeometry.value.nagaokaCoefficient.valueSi,
      base.value.nagaokaCoefficient.valueSi,
    );
  });

  it("keeps D_c, b_env, and N bound to one B-01 snapshot and distinct semantics", () => {
    const result = successOf(input());
    expect(result.evidence.geometrySnapshotId).toBe(GEOMETRY_SNAPSHOT_ID);
    expect(result.evidence.normalizedByMethodId).toBe("B-01");
    expect(result.evidence.geometrySemanticEvidence).toEqual(
      BASE_GEOMETRY_EVIDENCE,
    );
    expect(result.evidence.applicabilityEvidence).toEqual(
      BASE_APPLICABILITY_EVIDENCE,
    );
    expect(result.evidence.geometry).toEqual({
      currentPathDiameter: {
        parameterId: "coil.current_path_diameter",
        symbol: "D_c",
        valueSi: 0.2,
        canonicalUnitId: "m",
      },
      windingEnvelopeLength: {
        parameterId: "coil.winding_envelope_length",
        symbol: "b_env",
        localMethodSymbol: "b_sheet",
        valueSi: 0.4,
        canonicalUnitId: "m",
      },
      electricalTurnCount: {
        parameterId: "coil.electrical_turn_count",
        symbol: "N",
        valueSi: 10,
        canonicalUnitId: "one",
      },
      radius: {
        symbol: "a",
        valueSi: 0.1,
        canonicalUnitId: "m",
        derivation: "a=D_c/2",
      },
    });
    expect(JSON.stringify(result)).not.toContain("D_m");
    expect(JSON.stringify(result)).not.toContain("b_cc");
    expect(JSON.stringify(result)).not.toContain("Np");
  });

  it.each([
    ["D_c", { normalizedCurrentPathDiameterM: 0.21 }],
    ["b_env", { normalizedWindingEnvelopeLengthM: 0.41 }],
    ["N", { normalizedElectricalTurnCount: 11 }],
  ] satisfies ReadonlyArray<
    readonly [string, Partial<B04GeometrySemanticEvidence>]
  >)(
    "rejects a top-level %s value not bound to the declared B-01 snapshot",
    (_symbol, geometryEvidence) => {
      const result = evaluateB04NagaokaLundinCurrentSheet(
        input({ geometryEvidence }),
      );

      expect(result.status).toBe("invalid_input");
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe(
          "B-04.geometry_snapshot_value_mismatch",
        );
      }
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    },
  );

  it("returns a controlled centroid warning without inventing a stable warning ID", () => {
    const result = successOf(
      input({
        geometryEvidence: {
          currentPathBasis: "ADR_0003_default_centroid_unresolved",
        },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        predicate: "mean current path is uncertain",
      }),
    ]);
    expect(result.warnings[0]).not.toHaveProperty("warningId");
  });

  it("does not invent turn-count, pitch, conductor-size, or recommendation thresholds", () => {
    const sparseShortCoil = successOf(
      input({
        currentPathDiameterM: 1,
        windingEnvelopeLengthM: 0.01,
        electricalTurnCount: 2,
      }),
    );
    expect(sparseShortCoil.status).toBe("success");
    expect(
      sparseShortCoil.evidence.warningPolicy.automaticPhysicalThresholdsApplied,
    ).toBe(false);
    expect(sparseShortCoil.evidence.warningPolicy.unautomatedPredicates).toEqual([
      "few turns, large pitch, or thick conductor",
    ]);
    expect(JSON.stringify(sparseShortCoil)).not.toMatch(
      /recommendedMethod|hardThreshold|pitchCenter|conductorSize/,
    );
  });

  it("returns not_applicable for N=1 and zero b without a value", () => {
    for (const candidate of [
      input({ electricalTurnCount: 1 }),
      input({ windingEnvelopeLengthM: 0 }),
    ]) {
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(result.status).toBe("not_applicable");
      expect(result.warningIds).toEqual([]);
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it("fails closed for wrong, unversioned, or unconfirmed B-01 semantic mapping", () => {
    const candidates = [
      input({
        geometryEvidence: {
          normalizedByMethodId: "B-02" as "B-01",
        },
      }),
      input({
        geometryEvidence: { normalizedByMethodVersion: "legacy" },
      }),
      input({
        geometryEvidence: {
          currentPathDiameterParameterId:
            "coil.mean_diameter" as "coil.current_path_diameter",
        },
      }),
      input({
        geometryEvidence: {
          windingEnvelopeLengthParameterId:
            "coil.first_last_center_span" as "coil.winding_envelope_length",
        },
      }),
      input({ geometryEvidence: { geometrySnapshotId: "geometry:bad" } }),
      input({
        geometryEvidence: { semanticMappingStatus: "unconfirmed" },
      }),
    ];
    for (const candidate of candidates) {
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(["invalid_input", "insufficient_data"]).toContain(result.status);
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed when the electromagnetic current-path basis is unknown", () => {
    const result = evaluateB04NagaokaLundinCurrentSheet(
      input({
        geometryEvidence: { currentPathBasis: "other_or_unknown" },
      }),
    );
    expect(result.status).toBe("insufficient_data");
    if (result.status === "insufficient_data") {
      expect(result.failure.code).toBe("B-04.current_path_basis_unresolved");
    }
    expect("value" in result).toBe(false);
  });

  it("routes multilayer and confirmed domain failures to not_applicable", () => {
    for (const candidate of [
      input({ applicabilityEvidence: { windingClass: "multilayer" } }),
      input({ applicabilityEvidence: { airCoreStatus: "not_air_core" } }),
      input({
        applicabilityEvidence: {
          currentSheetIdealization: "not_satisfied",
        },
      }),
    ]) {
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
    }
  });

  it("routes unknown applicability evidence to insufficient_data", () => {
    for (const candidate of [
      input({
        applicabilityEvidence: { windingClass: "other_or_unknown" },
      }),
      input({ applicabilityEvidence: { airCoreStatus: "unconfirmed" } }),
      input({
        applicabilityEvidence: { currentSheetIdealization: "unconfirmed" },
      }),
    ]) {
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(result.status).toBe("insufficient_data");
      expect("value" in result).toBe(false);
    }
  });

  it.each([
    ["zero D_c", { currentPathDiameterM: 0 }],
    ["negative D_c", { currentPathDiameterM: -1 }],
    ["NaN D_c", { currentPathDiameterM: Number.NaN }],
    ["infinite D_c", { currentPathDiameterM: Number.POSITIVE_INFINITY }],
    ["negative b_env", { windingEnvelopeLengthM: -1 }],
    ["NaN b_env", { windingEnvelopeLengthM: Number.NaN }],
    ["infinite b_env", { windingEnvelopeLengthM: Number.POSITIVE_INFINITY }],
    ["zero N", { electricalTurnCount: 0 }],
    ["fractional N", { electricalTurnCount: 2.5 }],
    ["unsafe N", { electricalTurnCount: Number.MAX_SAFE_INTEGER + 1 }],
  ])("rejects %s without a value", (_name, overrides) => {
    const result = evaluateB04NagaokaLundinCurrentSheet(
      input(overrides as InputOverrides),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("fails closed for overflow, underflow, and swallowed finite-length corrections", () => {
    const candidates = [
      input({
        currentPathDiameterM: Number.MIN_VALUE,
        windingEnvelopeLengthM: Number.MIN_VALUE,
      }),
      input({ currentPathDiameterM: 1e-200, windingEnvelopeLengthM: 1e200 }),
      input({ currentPathDiameterM: 1e200, windingEnvelopeLengthM: 1e-200 }),
      input({
        currentPathDiameterM: 1e150,
        windingEnvelopeLengthM: 1,
        electricalTurnCount: Number.MAX_SAFE_INTEGER,
      }),
      input({ currentPathDiameterM: 1e-30, windingEnvelopeLengthM: 1 }),
    ];
    for (const candidate of candidates) {
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-04.numeric_resolution_invalid");
      }
    }
  });

  it("rejects extra fields, accessors, hostile Proxy traps, and huge sparse arrays quickly", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "currentPathDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level getter");
        },
      },
    );
    const nestedAccessor = Object.defineProperty(
      { ...BASE_GEOMETRY_EVIDENCE },
      "geometrySnapshotId",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute nested getter");
        },
      },
    );
    const hostileProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    const hugeSparse = new Array(4_294_967_295);

    for (const candidate of [
      { ...input(), extra: true },
      topAccessor,
      { ...input(), geometryEvidence: nestedAccessor },
      hostileProxy,
      { ...input(), geometryEvidence: hugeSparse },
    ]) {
      expect(() => evaluateB04NagaokaLundinCurrentSheet(candidate)).not.toThrow();
      const result = evaluateB04NagaokaLundinCurrentSheet(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("copies exact Proxy descriptors without invoking get traps", () => {
    const geometryProxy = new Proxy(BASE_GEOMETRY_EVIDENCE, {
      get() {
        throw new Error("B-04 must not execute geometry get trap");
      },
    });
    const topProxy = new Proxy(
      { ...input(), geometryEvidence: geometryProxy },
      {
        get() {
          throw new Error("B-04 must not execute top-level get trap");
        },
      },
    );
    const result = successOf(topProxy);
    expect(result.evidence.geometrySnapshotId).toBe(GEOMETRY_SNAPSHOT_ID);
  });

  it("rejects hostile auxiliary-function inputs without a numeric placeholder", () => {
    const accessor = Object.defineProperty({}, "x", {
      enumerable: true,
      get() {
        throw new Error("must not execute x getter");
      },
    });
    for (const candidate of [
      { x: -1 },
      { x: 1.01 },
      { x: Number.NaN },
      { x: 0.25, extra: true },
      accessor,
      new Proxy(
        { x: 0.25 },
        {
          ownKeys() {
            throw new Error("hostile auxiliary trap");
          },
        },
      ),
    ]) {
      expect(() => evaluateB04LundinAuxiliaryFunctions(candidate)).not.toThrow();
      const result = evaluateB04LundinAuxiliaryFunctions(candidate);
      expect(result.status).toBe("invalid_input");
      expect("f1" in result).toBe(false);
      expect("f2" in result).toBe(false);
    }
  });

  it("deep-freezes results, evidence, traces, warnings, and source mappings", () => {
    const result = successOf(
      input({
        geometryEvidence: {
          currentPathBasis: "ADR_0003_default_centroid_unresolved",
        },
      }),
    );
    for (const candidate of [
      result,
      result.value,
      result.value.sheetInductance,
      result.evidence,
      result.evidence.geometry,
      result.evidence.equation,
      result.evidence.identities,
      result.evidence.boundaryCheck,
      result.evidence.warningPolicy,
      result.warnings,
      result.warnings[0],
      B04_METHOD_MAPPING,
      B04_IMPLEMENTATION_READINESS,
      B04_ASSUMPTIONS,
    ]) {
      expect(Object.isFrozen(candidate)).toBe(true);
    }
  });

  it("uses only the frozen primary-source route and applies K_N once", () => {
    const result = successOf(input());
    const serialized = JSON.stringify(result);
    expect(result.evidence.sourceRefs).toEqual(B04_METHOD_MAPPING.sourceRefs);
    expect(result.evidence.sourceRefs).toEqual([
      "L85:PDF3-4:eq9-12:table1",
      "N09:PDF20-21:eq15-18",
      "CODATA22",
    ]);
    expect(result.evidence.scientificInterpretation).toBe(
      "six_digit_current_sheet_approximation_not_physical_coil_accuracy",
    );
    expect(serialized.match(/coefficientAppliedExactlyOnce/g)).toHaveLength(1);
  });
});
