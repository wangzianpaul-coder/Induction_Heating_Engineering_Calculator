import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  B05_ASSUMPTIONS,
  B05_BINARY64_MIN_NORMAL,
  B05_IMPLEMENTATION_READINESS,
  B05_METHOD_MAPPING,
  B05_WARNING_PREDICATES,
  B05_W28_CONTROLLED_SOURCE,
  evaluateB05WheelerSingleLayer,
  type B05ApplicabilityEvidence,
  type B05ApplicationGuardEvidence,
  type B05GeometrySemanticEvidence,
  type B05WheelerSingleLayerInput,
  type B05WheelerSingleLayerSuccess,
} from "../../../src/methods/B/b05WheelerSingleLayer.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  fromCanonicalSI,
  toCanonicalSI,
} from "../../../src/units/conversion.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"c".repeat(64)}`;

const BASE_GEOMETRY_EVIDENCE = Object.freeze({
  normalizedByMethodId: "B-01",
  normalizedByMethodVersion: "1.0.0-gate0",
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  semanticMappingStatus: "confirmed_same_B01_snapshot",
  currentPathDiameterParameterId: "coil.current_path_diameter",
  normalizedCurrentPathDiameterM: 0.1016,
  windingEnvelopeLengthParameterId: "coil.winding_envelope_length",
  normalizedWindingEnvelopeLengthM: 0.1016,
  electricalTurnCountParameterId: "coil.electrical_turn_count",
  normalizedElectricalTurnCount: 10,
  currentPathBasis: "explicit_method_or_state_bound",
} as const satisfies B05GeometrySemanticEvidence);

const BASE_APPLICABILITY_EVIDENCE = Object.freeze({
  windingClass: "uniform_single_layer",
  wheelerGeometryStatus:
    "confirmed_W28_Figure_2_single_layer_helical",
} as const satisfies B05ApplicabilityEvidence);

const BASE_APPLICATION_GUARD = Object.freeze({
  radiusMapping: "method_derives_a_as_D_c_over_2",
  sourceUnitMapping: "canonical_SI_m_converted_to_exact_inch",
  nagaokaFactorApplication: "none",
} as const satisfies B05ApplicationGuardEvidence);

type InputOverrides = Partial<
  Omit<
    B05WheelerSingleLayerInput,
    | "geometryEvidence"
    | "applicabilityEvidence"
    | "applicationGuardEvidence"
  >
> & {
  readonly geometryEvidence?: Partial<B05GeometrySemanticEvidence>;
  readonly applicabilityEvidence?: Partial<B05ApplicabilityEvidence>;
  readonly applicationGuardEvidence?: Partial<B05ApplicationGuardEvidence>;
};

function input(overrides: InputOverrides = {}): B05WheelerSingleLayerInput {
  const {
    geometryEvidence,
    applicabilityEvidence,
    applicationGuardEvidence,
    ...scalarOverrides
  } = overrides;
  const scalars = {
    currentPathDiameterM: 0.1016,
    windingEnvelopeLengthM: 0.1016,
    electricalTurnCount: 10,
    ...scalarOverrides,
  };
  return {
    ...scalars,
    geometryEvidence: {
      ...BASE_GEOMETRY_EVIDENCE,
      normalizedCurrentPathDiameterM: scalars.currentPathDiameterM,
      normalizedWindingEnvelopeLengthM:
        scalars.windingEnvelopeLengthM,
      normalizedElectricalTurnCount: scalars.electricalTurnCount,
      ...geometryEvidence,
    },
    applicabilityEvidence: {
      ...BASE_APPLICABILITY_EVIDENCE,
      ...applicabilityEvidence,
    },
    applicationGuardEvidence: {
      ...BASE_APPLICATION_GUARD,
      ...applicationGuardEvidence,
    },
  };
}

function successOf(candidate: unknown): B05WheelerSingleLayerSuccess {
  const result = evaluateB05WheelerSingleLayer(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    return result;
  }
  throw new Error(`Expected B-05 success, received ${result.status}.`);
}

function expectFailureWithoutResult(candidate: unknown): void {
  const result = evaluateB05WheelerSingleLayer(candidate);
  expect(["invalid_input", "insufficient_data", "not_applicable"]).toContain(
    result.status,
  );
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
}

describe("B-05 Wheeler 1928 single-layer comparison", () => {
  it("maps exactly to the frozen registry, source, contract, validations, and not-Recommended policy", () => {
    expect(B05_METHOD_MAPPING).toMatchObject({
      methodId: "B-05",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      methodType: "engineering_correlation",
      equationRef: "CALCULATION_CONTRACTS.md#B-05:Equation",
      sourceRefs: ["W28:PDF2:eq2", "W28:PDF3:eq3"],
      contractSourceRefs: [
        "W28:PDF2:PRINT1399:eq2",
        "W28:PDF3:PRINT1400:eq3",
      ],
      derivationRefs: [],
      derivationResolutionReason:
        "No ID-/DER- controlled derivation reference is listed in the contract; use the frozen source references.",
      validationCaseIds: ["EM-L-002", "EM-L-006"],
      methodCheckIds: ["EM-L-W28-DOMAIN-001"],
      inputParameterIds: [
        "coil.current_path_diameter",
        "coil.winding_envelope_length",
        "coil.electrical_turn_count",
      ],
      outputQuantityIds: ["L_Wheeler"],
      stableWarningIds: [],
      recommendationEligibility: "not_eligible",
      recommendationReason:
        "C-01 freezes B-05 as an in-domain quick comparison only.",
    });
    expect(B05_METHOD_MAPPING.warningPredicates).toEqual([
      B05_WARNING_PREDICATES.diameterPassedToRadiusFormula,
      B05_WARNING_PREDICATES.millimetresPassedToInchFormula,
      B05_WARNING_PREDICATES.outsideEquation2AccuracyDomain,
      B05_WARNING_PREDICATES.fewTurnsLargePitchOrThickConductor,
      B05_WARNING_PREDICATES.nagaokaFactorAppliedAgain,
    ]);
    expect(B05_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        { gateId: "B-05.stable-warning-ids-and-trigger-policy" },
      ],
    });
    expect(B05_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(B05_BINARY64_MIN_NORMAL).toBe(
      2.2250738585072014e-308,
    );
  });

  it("binds the controlled W28 PDF hash and source locations", () => {
    const sourceUrl = new URL(
      "../../../references/external_sources/wheeler1928.pdf",
      import.meta.url,
    );
    const actualHash = createHash("sha256")
      .update(readFileSync(sourceUrl))
      .digest("hex");
    expect(actualHash).toBe(B05_W28_CONTROLLED_SOURCE.sha256);
    expect(B05_W28_CONTROLLED_SOURCE).toEqual({
      sourceId: "W28",
      relativePath: "references/external_sources/wheeler1928.pdf",
      sha256:
        "1a17fef7ab82d4bcd33f030451cf9b63b8c173ee88741a1ace8a12c1239c90f1",
      equation2Location: "PDF2:PRINT1399:eq2",
      equation3Location: "PDF3:PRINT1400:eq3",
      sourceManifestRef: "SOURCE_MANIFEST.csv#wheeler1928.pdf",
    });
  });

  it("is isolated from public API and remains runtime-disabled", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateB05WheelerSingleLayer" in publicApi).toBe(false);
    expect("B05_METHOD_MAPPING" in publicApi).toBe(false);
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-05"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("B-05"))).toBe(
      false,
    );
  });

  it("reproduces W28 Equation (2) in original inches and microhenries through the SI wrapper", () => {
    const result = successOf(input());
    const expectedMicrohenry = (2 ** 2 * 10 ** 2) / (9 * 2 + 10 * 4);
    expect(result.status).toBe("success");
    expect(result.value.inductance).toEqual({
      quantityId: "L_Wheeler",
      valueSi: expectedMicrohenry * 1e-6,
      dimensionId: "inductance",
      canonicalUnitId: "H",
    });
    expect(result.evidence.equation).toMatchObject({
      equationId: "CALCULATION_CONTRACTS.md#B-05:Equation",
      sourceEquation: "W28-Eq2",
      originalEquation: "L[µH]=a_in^2*N^2/(9*a_in+10*b_in)",
      projectMapping: "a=D_c/2; b=b_env",
      sourceLengthUnit: "inch",
      sourceOutputUnit: "uH",
      substitution: {
        currentPathDiameterM: 0.1016,
        radiusM: 0.0508,
        windingEnvelopeLengthM: 0.1016,
        electricalTurnCount: 10,
        radiusIn: 2,
        windingEnvelopeLengthIn: 4,
        radiusSquaredIn2: 4,
        turnsSquared: 100,
        numeratorIn2: 400,
        nineRadiusIn: 18,
        tenWindingEnvelopeLengthIn: 40,
        denominatorIn: 58,
        inductanceMicrohenry: expectedMicrohenry,
        inductanceH: expectedMicrohenry * 1e-6,
      },
      equation3Disposition: {
        sourceEquation: "W28-Eq3",
        status: "reference_only_not_executed",
        automaticSwitchApplied: false,
      },
    });
    expect(result.evidence.unitIdentityChecks).toHaveLength(3);
    expect(result.evidence.unitIdentityChecks.every((check) => check.passed)).toBe(
      true,
    );
    expect(result.evidence.units).toMatchObject({
      currentPathDiameter: "m",
      windingEnvelopeLength: "m",
      sourceLengths: "inch",
      sourceInductance: "uH",
      canonicalInductance: "H",
    });
    expect(result.evidence.numericRepresentabilityPolicy).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
  });

  it("matches an independent original-unit calculation and exact unit round trip", () => {
    const diameterM = toCanonicalSI(8, "in", "length");
    const lengthM = toCanonicalSI(10, "in", "length");
    const result = successOf(
      input({
        currentPathDiameterM: diameterM,
        windingEnvelopeLengthM: lengthM,
        electricalTurnCount: 24,
      }),
    );
    const aIn = 4;
    const bIn = 10;
    const originalMicrohenry =
      (aIn * aIn * 24 * 24) / (9 * aIn + 10 * bIn);
    expect(fromCanonicalSI(result.value.inductance.valueSi, "uH", "inductance")).toBeCloseTo(
      originalMicrohenry,
      14,
    );
    expect(result.evidence.equation.substitution.radiusIn).toBeCloseTo(aIn, 15);
    expect(result.evidence.equation.substitution.windingEnvelopeLengthIn).toBeCloseTo(
      bIn,
      15,
    );
  });

  it("obeys W28 turn and uniform-length scaling without changing the source substitution", () => {
    const base = successOf(input());
    const turnsScaled = successOf(input({ electricalTurnCount: 30 }));
    const geometryScaled = successOf(
      input({
        currentPathDiameterM: 0.1016 * 8,
        windingEnvelopeLengthM: 0.1016 * 8,
      }),
    );
    expect(turnsScaled.value.inductance.valueSi).toBeCloseTo(
      9 * base.value.inductance.valueSi,
      14,
    );
    expect(geometryScaled.value.inductance.valueSi).toBeCloseTo(
      8 * base.value.inductance.valueSi,
      14,
    );
    expect(turnsScaled.evidence.equation.sourceEquation).toBe("W28-Eq2");
    expect(geometryScaled.evidence.equation.sourceEquation).toBe("W28-Eq2");
  });

  it("publishes quick-comparison/not-Recommended evidence and never switches to Equation (3)", () => {
    const result = successOf(
      input({ windingEnvelopeLengthM: 0.02 }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.applicabilityStatus).toBe("in_domain");
    expect(result.evidence.recommendation).toEqual({
      eligibility: "not_eligible",
      role: "quick_comparison_only",
      isRecommended: false,
      reason: "C-01 freezes B-05 as an in-domain quick comparison only.",
    });
    expect(result.evidence.equation.sourceEquation).toBe("W28-Eq2");
    expect(result.evidence.equation.equation3Disposition).toEqual({
      sourceEquation: "W28-Eq3",
      status: "reference_only_not_executed",
      automaticSwitchApplied: false,
    });
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "b<=0.8a",
    ]);
    expect(result.evidence.applicability).toMatchObject({
      equation2AccuracyDomain: "b>0.8a",
      domainStatus: "outside_or_at_stated_accuracy_domain",
      approximatelyOnePercentClaimAvailable: false,
      hardMethodSwitchApplied: false,
    });
  });

  it("treats b>0.8a as a stated accuracy domain, not a B-04/B-05 switch", () => {
    const inside = successOf(input({ windingEnvelopeLengthM: 0.04065 }));
    const outside = successOf(input({ windingEnvelopeLengthM: 0.04063 }));
    expect(inside.evidence.applicability.domainStatus).toBe(
      "inside_stated_approximately_1_percent_domain",
    );
    expect(inside.warnings).toEqual([]);
    expect(outside.evidence.applicability.domainStatus).toBe(
      "outside_or_at_stated_accuracy_domain",
    );
    expect(outside.warnings.map((candidate) => candidate.predicate)).toEqual([
      "b<=0.8a",
    ]);
    expect(inside.evidence.applicability.hardMethodSwitchApplied).toBe(false);
    expect(outside.evidence.applicability.hardMethodSwitchApplied).toBe(false);
  });

  it("uses the frozen categorical N=1 warning without inventing a broader few-turn threshold", () => {
    const singleTurn = successOf(input({ electricalTurnCount: 1 }));
    const twoTurns = successOf(input({ electricalTurnCount: 2 }));
    expect(singleTurn.status).toBe("success_with_warnings");
    expect(singleTurn.warnings.map((candidate) => candidate.predicate)).toEqual([
      "few turns, large pitch, or thick conductor",
    ]);
    expect(singleTurn.evidence.warningPolicy).toMatchObject({
      automaticUnfrozenPhysicalThresholdsApplied: false,
      singleTurnCategoricalWarningApplied: true,
      unautomatedPredicates: [
        "few turns, large pitch, or thick conductor",
      ],
      nagaokaFactorApplied: false,
    });
    expect(twoTurns.warnings).toEqual([]);
    expect(twoTurns.evidence.warningPolicy.singleTurnCategoricalWarningApplied).toBe(
      false,
    );
  });

  it.each([
    [
      "diameter as radius",
      {
        radiusMapping: "diameter_passed_to_radius_formula",
      },
      "diameter is passed to a radius formula",
      "B-05.radius_mapping_invalid",
    ],
    [
      "millimetres as inches",
      {
        sourceUnitMapping:
          "millimetres_passed_directly_to_inch_formula",
      },
      "millimetres are passed directly to the inch formula",
      "B-05.source_unit_mapping_invalid",
    ],
    [
      "Nagaoka repeated",
      { nagaokaFactorApplication: "applied_again" },
      "a Nagaoka factor is applied again",
      "B-05.repeated_finite_length_correction",
    ],
  ] as const)(
    "fails closed for %s and emits only the frozen prose predicate",
    (_name, applicationGuardEvidence, predicate, code) => {
      const result = evaluateB05WheelerSingleLayer(
        input({
          applicationGuardEvidence:
            applicationGuardEvidence as Partial<B05ApplicationGuardEvidence>,
        }),
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      expect(result.warningIds).toEqual([]);
      expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
        predicate,
      ]);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe(code);
      }
    },
  );

  it("keeps the B-01 D_c:=D_m warning explicitly upstream instead of inventing a B-05 predicate", () => {
    const result = successOf(
      input({
        geometryEvidence: {
          currentPathBasis: "ADR_0003_default_centroid_unresolved",
        },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.warnings).toEqual([]);
    expect(result.upstreamGeometryWarnings).toEqual([
      {
        sourceMethodId: "B-01",
        predicate: "effective current centroid is unknown",
        message:
          "B-01 supplied the warning-bearing ADR-0003 D_c:=D_m default; the upstream current-centroid warning remains visible and does not alter Wheeler's formula.",
      },
    ]);
  });

  it.each([
    ["D_c", { normalizedCurrentPathDiameterM: 0.2 }],
    ["b_env", { normalizedWindingEnvelopeLengthM: 0.2 }],
    ["N", { normalizedElectricalTurnCount: 11 }],
  ] as const)("rejects a top-level/%s B-01 snapshot mismatch", (_name, evidence) => {
    const result = evaluateB05WheelerSingleLayer(
      input({ geometryEvidence: evidence }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe(
        "B-05.geometry_snapshot_value_mismatch",
      );
    }
  });

  it.each([
    ["wrong kind", `case:${"c".repeat(64)}`],
    ["short digest", `geometry:${"c".repeat(63)}`],
    ["uppercase digest", `geometry:${"C".repeat(64)}`],
    ["legacy ID", "geometry:legacy"],
  ] as const)("strictly rejects %s geometry snapshot IDs", (_name, id) => {
    const result = evaluateB05WheelerSingleLayer(
      input({ geometryEvidence: { geometrySnapshotId: id } }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    ["wrong source method", { normalizedByMethodId: "B-04" }],
    ["wrong B-01 version", { normalizedByMethodVersion: "legacy" }],
    [
      "D_m substituted for D_c",
      { currentPathDiameterParameterId: "coil.mean_diameter" },
    ],
    [
      "b_cc substituted for b_env",
      {
        windingEnvelopeLengthParameterId:
          "coil.first_last_center_span",
      },
    ],
    [
      "N_rev substituted for N",
      {
        electricalTurnCountParameterId:
          "coil.helix_revolution_count",
      },
    ],
  ] as const)("rejects %s geometry semantics", (_name, geometryEvidence) => {
    const result = evaluateB05WheelerSingleLayer(
      input({
        geometryEvidence:
          geometryEvidence as Partial<B05GeometrySemanticEvidence>,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-05.invalid_geometry_mapping");
    }
  });

  it("fails closed for unconfirmed B-01 mapping and unresolved D_c basis", () => {
    for (const candidate of [
      input({
        geometryEvidence: { semanticMappingStatus: "unconfirmed" },
      }),
      input({
        geometryEvidence: { currentPathBasis: "other_or_unknown" },
      }),
    ]) {
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("insufficient_data");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it("routes multilayer and confirmed W28 geometry failure to not_applicable", () => {
    for (const candidate of [
      input({ applicabilityEvidence: { windingClass: "multilayer" } }),
      input({
        applicabilityEvidence: { wheelerGeometryStatus: "not_satisfied" },
      }),
    ]) {
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it("routes unknown W28 applicability and application guards to insufficient_data", () => {
    const candidates = [
      input({
        applicabilityEvidence: { windingClass: "other_or_unknown" },
      }),
      input({
        applicabilityEvidence: { wheelerGeometryStatus: "unconfirmed" },
      }),
      input({ applicationGuardEvidence: { radiusMapping: "unconfirmed" } }),
      input({
        applicationGuardEvidence: { sourceUnitMapping: "unconfirmed" },
      }),
      input({
        applicationGuardEvidence: {
          nagaokaFactorApplication: "unconfirmed",
        },
      }),
    ];
    for (const candidate of candidates) {
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("insufficient_data");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it.each([
    ["zero D_c", { currentPathDiameterM: 0 }],
    ["negative D_c", { currentPathDiameterM: -1 }],
    ["NaN D_c", { currentPathDiameterM: Number.NaN }],
    ["infinite D_c", { currentPathDiameterM: Number.POSITIVE_INFINITY }],
    ["zero b_env", { windingEnvelopeLengthM: 0 }],
    ["negative b_env", { windingEnvelopeLengthM: -1 }],
    ["NaN b_env", { windingEnvelopeLengthM: Number.NaN }],
    ["infinite b_env", { windingEnvelopeLengthM: Number.POSITIVE_INFINITY }],
    ["zero N", { electricalTurnCount: 0 }],
    ["negative N", { electricalTurnCount: -1 }],
    ["fractional N", { electricalTurnCount: 2.5 }],
    ["NaN N", { electricalTurnCount: Number.NaN }],
    ["infinite N", { electricalTurnCount: Number.POSITIVE_INFINITY }],
    ["unsafe N", { electricalTurnCount: Number.MAX_SAFE_INTEGER + 1 }],
  ])("rejects %s without value or evidence", (_name, overrides) => {
    expectFailureWithoutResult(input(overrides as InputOverrides));
  });

  it("fails closed for W28 source-chain overflow, underflow, false zero, and swallowed positive terms", () => {
    const candidates = [
      input({
        currentPathDiameterM: Number.MIN_VALUE,
        windingEnvelopeLengthM: Number.MIN_VALUE,
      }),
      input({
        currentPathDiameterM: B05_BINARY64_MIN_NORMAL,
        windingEnvelopeLengthM: 0.1,
      }),
      input({
        currentPathDiameterM: Number.MAX_VALUE,
        windingEnvelopeLengthM: 1,
      }),
      input({
        currentPathDiameterM: 1e200,
        windingEnvelopeLengthM: 1,
      }),
      input({
        currentPathDiameterM: 1e-200,
        windingEnvelopeLengthM: 1e-200,
      }),
      input({
        currentPathDiameterM: 0.0508,
        windingEnvelopeLengthM: 1e20,
      }),
      input({
        currentPathDiameterM: 1e150,
        windingEnvelopeLengthM: 1e150,
        electricalTurnCount: Number.MAX_SAFE_INTEGER,
      }),
    ];
    for (const candidate of candidates) {
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-05.numeric_resolution_invalid");
      }
    }
  });

  it("fails closed when a positive subnormal radius-squared term would contaminate the frozen W28 source chain", () => {
    const currentPathDiameterM = 1.016e-163;
    const windingEnvelopeLengthM = 1.016e-163;
    const radiusIn = fromCanonicalSI(
      currentPathDiameterM / 2,
      "in",
      "length",
    );
    const radiusSquaredIn2 = radiusIn * radiusIn;
    expect(radiusSquaredIn2).toBeGreaterThan(0);
    expect(radiusSquaredIn2).toBeLessThan(B05_BINARY64_MIN_NORMAL);

    const result = evaluateB05WheelerSingleLayer(
      input({
        currentPathDiameterM,
        windingEnvelopeLengthM,
        electricalTurnCount: 1,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-05.numeric_resolution_invalid");
    }
  });

  it("prioritizes known not-applicable routes over the later machine representability guard", () => {
    const candidates = [
      {
        candidate: input({
          currentPathDiameterM: 1.016e-163,
          windingEnvelopeLengthM: 1.016e-163,
          electricalTurnCount: 1,
          applicabilityEvidence: { windingClass: "multilayer" },
        }),
        code: "B-05.multilayer_not_applicable",
      },
      {
        candidate: input({
          currentPathDiameterM: 1.016e-163,
          windingEnvelopeLengthM: 1.016e-163,
          electricalTurnCount: 1,
          applicabilityEvidence: { wheelerGeometryStatus: "not_satisfied" },
        }),
        code: "B-05.wheeler_geometry_not_applicable",
      },
    ] as const;

    for (const { candidate, code } of candidates) {
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      if (result.status === "not_applicable") {
        expect(result.failure.code).toBe(code);
      }
    }
  });

  it("rejects missing/extra/symbol fields, accessors, hostile Proxy traps, and huge sparse arrays quickly", () => {
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
    const geometryAccessor = Object.defineProperty(
      { ...BASE_GEOMETRY_EVIDENCE },
      "geometrySnapshotId",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute geometry getter");
        },
      },
    );
    const applicabilityAccessor = Object.defineProperty(
      { ...BASE_APPLICABILITY_EVIDENCE },
      "windingClass",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute applicability getter");
        },
      },
    );
    const guardAccessor = Object.defineProperty(
      { ...BASE_APPLICATION_GUARD },
      "radiusMapping",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute guard getter");
        },
      },
    );
    const hostileProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys trap");
      },
    });
    const descriptorProxy = new Proxy(BASE_GEOMETRY_EVIDENCE, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile nested descriptor trap");
      },
    });
    const hugeSparse = new Array(4_294_967_295);
    const symbolExtra = { ...input(), [Symbol("legacy")]: true };
    const { applicationGuardEvidence: _missing, ...missingField } = input();

    for (const candidate of [
      { ...input(), legacyWheelerCoefficient: 123 },
      symbolExtra,
      missingField,
      topAccessor,
      { ...input(), geometryEvidence: geometryAccessor },
      { ...input(), applicabilityEvidence: applicabilityAccessor },
      { ...input(), applicationGuardEvidence: guardAccessor },
      hostileProxy,
      { ...input(), geometryEvidence: descriptorProxy },
      { ...input(), geometryEvidence: hugeSparse },
      { ...input(), applicabilityEvidence: hugeSparse },
      { ...input(), applicationGuardEvidence: hugeSparse },
    ]) {
      expect(() => evaluateB05WheelerSingleLayer(candidate)).not.toThrow();
      const result = evaluateB05WheelerSingleLayer(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it("does not coerce hostile scalar, enum, ID, or unit-boundary values", () => {
    const hostile = Object.freeze({
      valueOf() {
        throw new Error("must not coerce hostile value");
      },
      toString() {
        throw new Error("must not stringify hostile value");
      },
    });
    const candidates = [
      { ...input(), currentPathDiameterM: hostile },
      { ...input(), windingEnvelopeLengthM: hostile },
      { ...input(), electricalTurnCount: hostile },
      {
        ...input(),
        geometryEvidence: {
          ...BASE_GEOMETRY_EVIDENCE,
          geometrySnapshotId: hostile,
        },
      },
      {
        ...input(),
        geometryEvidence: {
          ...BASE_GEOMETRY_EVIDENCE,
          currentPathBasis: hostile,
        },
      },
      {
        ...input(),
        applicabilityEvidence: {
          ...BASE_APPLICABILITY_EVIDENCE,
          windingClass: hostile,
        },
      },
      {
        ...input(),
        applicabilityEvidence: {
          ...BASE_APPLICABILITY_EVIDENCE,
          wheelerGeometryStatus: hostile,
        },
      },
      {
        ...input(),
        applicationGuardEvidence: {
          ...BASE_APPLICATION_GUARD,
          radiusMapping: hostile,
        },
      },
      {
        ...input(),
        applicationGuardEvidence: {
          ...BASE_APPLICATION_GUARD,
          sourceUnitMapping: hostile,
        },
      },
      {
        ...input(),
        applicationGuardEvidence: {
          ...BASE_APPLICATION_GUARD,
          nagaokaFactorApplication: hostile,
        },
      },
    ];
    for (const candidate of candidates) {
      expect(() => evaluateB05WheelerSingleLayer(candidate)).not.toThrow();
      expectFailureWithoutResult(candidate);
    }
  });

  it("copies exact Proxy descriptors without invoking get traps", () => {
    const geometryProxy = new Proxy(BASE_GEOMETRY_EVIDENCE, {
      get() {
        throw new Error("must not execute geometry get trap");
      },
    });
    const applicabilityProxy = new Proxy(BASE_APPLICABILITY_EVIDENCE, {
      get() {
        throw new Error("must not execute applicability get trap");
      },
    });
    const guardProxy = new Proxy(BASE_APPLICATION_GUARD, {
      get() {
        throw new Error("must not execute guard get trap");
      },
    });
    const topProxy = new Proxy(
      {
        ...input(),
        geometryEvidence: geometryProxy,
        applicabilityEvidence: applicabilityProxy,
        applicationGuardEvidence: guardProxy,
      },
      {
        get() {
          throw new Error("must not execute top-level get trap");
        },
      },
    );
    const result = successOf(topProxy);
    expect(result.evidence.geometrySnapshotId).toBe(GEOMETRY_SNAPSHOT_ID);
  });

  it("deep-freezes values, evidence, source traces, warnings, and release gates", () => {
    const result = successOf(
      input({
        windingEnvelopeLengthM: 0.02,
        geometryEvidence: {
          currentPathBasis: "ADR_0003_default_centroid_unresolved",
        },
      }),
    );
    for (const candidate of [
      result,
      result.value,
      result.value.inductance,
      result.evidence,
      result.evidence.geometry,
      result.evidence.equation,
      result.evidence.equation.substitution,
      result.evidence.equation.equation3Disposition,
      result.evidence.unitIdentityChecks,
      result.evidence.applicability,
      result.evidence.warningPolicy,
      result.evidence.numericRepresentabilityPolicy,
      result.evidence.recommendation,
      result.warnings,
      result.warnings[0],
      result.upstreamGeometryWarnings,
      result.upstreamGeometryWarnings[0],
      B05_METHOD_MAPPING,
      B05_IMPLEMENTATION_READINESS,
      B05_W28_CONTROLLED_SOURCE,
      B05_ASSUMPTIONS,
    ]) {
      expect(Object.isFrozen(candidate)).toBe(true);
    }
  });

  it("contains no historical-output calibration path or hidden correction in the result", () => {
    const result = successOf(input());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/historical|workbook|screenshot|783|135 L\/min/i);
    expect(serialized.match(/nagaokaFactorApplied/g)).toHaveLength(1);
    expect(result.evidence.warningPolicy.nagaokaFactorApplied).toBe(false);
    expect(result.evidence.sourceRefs).toEqual([
      "W28:PDF2:eq2",
      "W28:PDF3:eq3",
    ]);
  });
});
