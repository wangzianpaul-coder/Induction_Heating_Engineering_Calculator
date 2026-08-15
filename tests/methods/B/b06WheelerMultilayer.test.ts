import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isWithinTolId } from "../../../src/config/tolerances.js";
import { methodId } from "../../../src/domain/ids.js";
import {
  B06_ASSUMPTIONS,
  B06_BINARY64_MIN_NORMAL,
  B06_IMPLEMENTATION_READINESS,
  B06_METHOD_MAPPING,
  B06_WARNING_PREDICATES,
  B06_W28_CONTROLLED_SOURCE,
  evaluateB06WheelerMultilayer,
  type B06ApplicabilityEvidence,
  type B06ApplicationGuardEvidence,
  type B06GeometrySemanticEvidence,
  type B06WheelerMultilayerInput,
  type B06WheelerMultilayerSuccess,
} from "../../../src/methods/B/b06WheelerMultilayer.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  fromCanonicalSI,
  toCanonicalSI,
} from "../../../src/units/conversion.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"6".repeat(64)}`;
const BASE_A_M = toCanonicalSI(3, "in", "length");
const BASE_B_M = toCanonicalSI(2, "in", "length");
const BASE_C_M = toCanonicalSI(1.8, "in", "length");

const BASE_GEOMETRY_EVIDENCE = Object.freeze({
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  semanticMappingStatus: "confirmed_same_content_addressed_snapshot",
  multilayerMeanRadiusParameterId: "coil.multilayer_mean_radius",
  normalizedMultilayerMeanRadiusM: BASE_A_M,
  multilayerAxialLengthParameterId: "coil.multilayer_axial_length",
  normalizedMultilayerAxialLengthM: BASE_B_M,
  multilayerRadialBuildParameterId: "coil.multilayer_radial_build",
  normalizedMultilayerRadialBuildM: BASE_C_M,
  electricalTurnCountParameterId: "coil.electrical_turn_count",
  normalizedElectricalTurnCount: 20,
  layerCountParameterId: "coil.layer_count",
  normalizedLayerCount: 3,
  meanRadiusBasis: "complete_multilayer_mechanical_mean_radius",
  axialLengthBasis: "complete_multilayer_winding_axial_length",
  radialBuildBasis: "total_radial_build_of_all_layers",
  electricalTurnCountBasis: "total_electrical_turn_count_all_layers",
  layerCountBasis: "counted_physical_winding_layers",
} as const satisfies B06GeometrySemanticEvidence);

const BASE_APPLICABILITY_EVIDENCE = Object.freeze({
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  windingClass: "genuine_multilayer",
  figure1GeometryStatus: "confirmed_approximately_W28_Figure_1",
  turnDistributionStatus: "confirmed_approximately_uniform",
  denominatorTermComparabilityStatus:
    "confirmed_about_equal_by_engineering_assessment",
  denominatorTermComparabilityBasis:
    "content_addressed_engineering_geometry_assessment",
} as const satisfies B06ApplicabilityEvidence);

const BASE_APPLICATION_GUARD = Object.freeze({
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  sourceUnitMapping: "canonical_SI_m_converted_to_exact_inch",
  accuracyClaimPolicy:
    "method_reports_claim_only_from_frozen_shape_evidence",
} as const satisfies B06ApplicationGuardEvidence);

type InputOverrides = Partial<
  Omit<
    B06WheelerMultilayerInput,
    | "geometryEvidence"
    | "applicabilityEvidence"
    | "applicationGuardEvidence"
  >
> & {
  readonly geometryEvidence?: Partial<B06GeometrySemanticEvidence>;
  readonly applicabilityEvidence?: Partial<B06ApplicabilityEvidence>;
  readonly applicationGuardEvidence?: Partial<B06ApplicationGuardEvidence>;
};

function input(overrides: InputOverrides = {}): B06WheelerMultilayerInput {
  const {
    geometryEvidence,
    applicabilityEvidence,
    applicationGuardEvidence,
    ...scalarOverrides
  } = overrides;
  const scalars = {
    multilayerMeanRadiusM: BASE_A_M,
    multilayerAxialLengthM: BASE_B_M,
    multilayerRadialBuildM: BASE_C_M,
    electricalTurnCount: 20,
    layerCount: 3,
    ...scalarOverrides,
  };
  return {
    ...scalars,
    geometryEvidence: {
      ...BASE_GEOMETRY_EVIDENCE,
      normalizedMultilayerMeanRadiusM: scalars.multilayerMeanRadiusM,
      normalizedMultilayerAxialLengthM: scalars.multilayerAxialLengthM,
      normalizedMultilayerRadialBuildM: scalars.multilayerRadialBuildM,
      normalizedElectricalTurnCount: scalars.electricalTurnCount,
      normalizedLayerCount: scalars.layerCount,
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

function successOf(candidate: unknown): B06WheelerMultilayerSuccess {
  const result = evaluateB06WheelerMultilayer(candidate);
  expect(result.status).toBe("success");
  if (result.status === "success") {
    return result;
  }
  throw new Error(`Expected B-06 success, received ${result.status}.`);
}

function expectFailureWithoutResult(candidate: unknown): void {
  const result = evaluateB06WheelerMultilayer(candidate);
  expect(["invalid_input", "insufficient_data", "not_applicable"]).toContain(
    result.status,
  );
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect(result.methodMapping).toBe(B06_METHOD_MAPPING);
}

describe("B-06 Wheeler 1928 multilayer approximation", () => {
  it("maps exactly to the frozen registry, contract, method check, and undecided multilayer recommendation role", () => {
    expect(B06_METHOD_MAPPING).toMatchObject({
      methodId: "B-06",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      methodType: "engineering_correlation",
      equationRef: "CALCULATION_CONTRACTS.md#B-06:Equation",
      sourceRefs: ["W28:PDF1:PRINT1398:FIG1:eq1"],
      contractSourceRefs: ["W28:PDF1:PRINT1398:Fig1:eq1"],
      derivationRefs: [],
      derivationResolutionReason:
        "No ID-/DER- controlled derivation reference is listed in the contract; use the frozen source references.",
      validationCaseIds: [],
      methodCheckIds: ["EM-L-ML-001"],
      inputParameterIds: [
        "coil.multilayer_mean_radius",
        "coil.multilayer_axial_length",
        "coil.multilayer_radial_build",
        "coil.electrical_turn_count",
        "coil.layer_count",
      ],
      outputQuantityIds: ["L_Wheeler_multilayer"],
      stableWarningIds: [],
      recommendationEligibility: null,
      recommendationReason:
        "C-01 only states that B-06 uses an independent multilayer route and does not participate in the single-layer recommendation policy.",
    });
    expect(B06_METHOD_MAPPING.warningPredicates).toEqual([
      B06_WARNING_PREDICATES.layerCountBelowTwo,
      B06_WARNING_PREDICATES.conductorSizeUsedAsRadialBuild,
      B06_WARNING_PREDICATES.singleLayerRadiusUsedAsMeanRadius,
      B06_WARNING_PREDICATES.stronglyNonuniformDistribution,
      B06_WARNING_PREDICATES.unsupportedAccuracyClaim,
    ]);
  });

  it("publishes only explicit activation gates and does not invent warning IDs or shape thresholds", () => {
    expect(B06_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        { gateId: "B-06.stable-warning-ids" },
        { gateId: "B-06.independent-multilayer-geometry-snapshot-adapter" },
        { gateId: "B-06.multilayer-recommendation-router" },
      ],
    });
    expect(B06_METHOD_MAPPING.stableWarningIds).toEqual([]);
    expect(B06_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(B06_BINARY64_MIN_NORMAL).toBe(
      2.2250738585072014e-308,
    );
  });

  it("binds the controlled W28 PDF byte length, SHA-256, page, figure, and equation", () => {
    const sourceUrl = new URL(
      "../../../references/external_sources/wheeler1928.pdf",
      import.meta.url,
    );
    expect(statSync(sourceUrl).size).toBe(B06_W28_CONTROLLED_SOURCE.byteLength);
    expect(
      createHash("sha256").update(readFileSync(sourceUrl)).digest("hex"),
    ).toBe(B06_W28_CONTROLLED_SOURCE.sha256);
    expect(B06_W28_CONTROLLED_SOURCE).toEqual({
      sourceId: "W28",
      relativePath: "references/external_sources/wheeler1928.pdf",
      byteLength: 733_950,
      sha256:
        "1a17fef7ab82d4bcd33f030451cf9b63b8c173ee88741a1ace8a12c1239c90f1",
      equation1Location: "PDF1:PRINT1398:FIG1:eq1",
      visualVerificationStatus: "verified_primary_page",
      sourceManifestRef: "SOURCE_MANIFEST.csv#wheeler1928.pdf",
    });
  });

  it("remains isolated from the public API and runtime registry", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateB06WheelerMultilayer" in publicApi).toBe(false);
    expect("B06_METHOD_MAPPING" in publicApi).toBe(false);
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-06"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("B-06"))).toBe(
      false,
    );
  });

  it("reproduces W28 Figure 1 Equation (1) in inches and microhenries through the SI wrapper", () => {
    const result = successOf(input());
    const expectedMicrohenry = (0.8 * 3 ** 2 * 20 ** 2) / (6 * 3 + 9 * 2 + 10 * 1.8);
    const expectedH = toCanonicalSI(
      expectedMicrohenry,
      "uH",
      "inductance",
    );
    expect(result.value.inductance).toMatchObject({
      quantityId: "L_Wheeler_multilayer",
      dimensionId: "inductance",
      canonicalUnitId: "H",
    });
    expect(result.value.inductance.valueSi).toBeCloseTo(expectedH, 14);
    expect(result.evidence.equation).toMatchObject({
      equationId: "CALCULATION_CONTRACTS.md#B-06:Equation",
      sourceEquation: "W28-Figure1-Equation1",
      originalEquation:
        "L[µH]=0.8*a_in^2*n^2/(6*a_in+9*b_in+10*c_in)",
      projectMapping:
        "a=a_ml; b=b_ml; c=c_ml; n=N; N_layer is a separate applicability gate",
      sourceLengthUnit: "inch",
      sourceOutputUnit: "uH",
      legacyTDisposition: "migration_alias_for_c_ml_only_not_runtime_field",
    });
    const substitution = result.evidence.equation.substitution;
    for (const [actual, expected] of [
      [substitution.meanRadiusIn, 3],
      [substitution.axialLengthIn, 2],
      [substitution.radialBuildIn, 1.8],
      [substitution.meanRadiusSquaredIn2, 9],
      [substitution.turnsSquared, 400],
      [substitution.unscaledNumeratorIn2, 3600],
      [substitution.scaledNumeratorIn2, 2880],
      [substitution.sixMeanRadiusIn, 18],
      [substitution.nineAxialLengthIn, 18],
      [substitution.tenRadialBuildIn, 18],
      [substitution.firstDenominatorSumIn, 36],
      [substitution.denominatorIn, 54],
      [substitution.inductanceMicrohenry, expectedMicrohenry],
      [substitution.inductanceH, expectedH],
    ] as const) {
      expect(isWithinTolId(actual, expected)).toBe(true);
    }
  });

  it("matches an independent original-unit calculation and all exact unit round trips", () => {
    const aM = toCanonicalSI(2, "in", "length");
    const bM = toCanonicalSI(3, "in", "length");
    const cM = toCanonicalSI(0.5, "in", "length");
    const result = successOf(
      input({
        multilayerMeanRadiusM: aM,
        multilayerAxialLengthM: bM,
        multilayerRadialBuildM: cM,
        electricalTurnCount: 100,
        layerCount: 5,
        applicabilityEvidence: {
          denominatorTermComparabilityStatus: "confirmed_not_about_equal",
        },
      }),
    );
    const expectedMicrohenry = (0.8 * 2 ** 2 * 100 ** 2) / (6 * 2 + 9 * 3 + 10 * 0.5);
    expect(
      fromCanonicalSI(result.value.inductance.valueSi, "uH", "inductance"),
    ).toBeCloseTo(expectedMicrohenry, 13);
    expect(result.evidence.unitIdentityChecks).toHaveLength(4);
    expect(result.evidence.unitIdentityChecks.every((check) => check.passed)).toBe(
      true,
    );
    expect(
      result.evidence.unitIdentityChecks.map((check) => check.toleranceId),
    ).toEqual(["TOL-ID", "TOL-ID", "TOL-ID", "TOL-ID"]);
  });

  it("obeys the frozen N-squared scaling", () => {
    const base = successOf(input({ electricalTurnCount: 10 }));
    const scaled = successOf(input({ electricalTurnCount: 30 }));
    expect(scaled.value.inductance.valueSi).toBeCloseTo(
      9 * base.value.inductance.valueSi,
      14,
    );
  });

  it("obeys uniform geometric length scaling and keeps N_layer out of Equation (1)", () => {
    const base = successOf(input());
    const scale = 8;
    const scaled = successOf(
      input({
        multilayerMeanRadiusM: BASE_A_M * scale,
        multilayerAxialLengthM: BASE_B_M * scale,
        multilayerRadialBuildM: BASE_C_M * scale,
        layerCount: 8,
      }),
    );
    const sameGeometryDifferentLayers = successOf(input({ layerCount: 12 }));
    expect(scaled.value.inductance.valueSi).toBeCloseTo(
      scale * base.value.inductance.valueSi,
      14,
    );
    expect(sameGeometryDifferentLayers.value.inductance.valueSi).toBe(
      base.value.inductance.valueSi,
    );
    expect(scaled.evidence.geometry.layerCount).toMatchObject({
      sourceEquationVariable: false,
      role: "multilayer_applicability_gate",
    });
  });

  it("keeps all five geometry semantics distinct in trace and evidence", () => {
    const result = successOf(input());
    expect(result.evidence.geometry).toEqual({
      multilayerMeanRadius: {
        parameterId: "coil.multilayer_mean_radius",
        symbol: "a_ml",
        sourceSymbol: "a",
        valueSi: BASE_A_M,
        canonicalUnitId: "m",
      },
      multilayerAxialLength: {
        parameterId: "coil.multilayer_axial_length",
        symbol: "b_ml",
        sourceSymbol: "b",
        valueSi: BASE_B_M,
        canonicalUnitId: "m",
      },
      multilayerRadialBuild: {
        parameterId: "coil.multilayer_radial_build",
        symbol: "c_ml",
        sourceSymbol: "c",
        valueSi: BASE_C_M,
        canonicalUnitId: "m",
      },
      electricalTurnCount: {
        parameterId: "coil.electrical_turn_count",
        symbol: "N",
        sourceSymbol: "n",
        valueSi: 20,
        canonicalUnitId: "one",
      },
      layerCount: {
        parameterId: "coil.layer_count",
        symbol: "N_layer",
        valueSi: 3,
        canonicalUnitId: "one",
        sourceEquationVariable: false,
        role: "multilayer_applicability_gate",
      },
    });
  });

  it("publishes the about-1-percent source statement only from explicit content-addressed comparability evidence", () => {
    const confirmed = successOf(input());
    const outside = successOf(
      input({
        applicabilityEvidence: {
          denominatorTermComparabilityStatus: "confirmed_not_about_equal",
        },
      }),
    );
    const unassessed = successOf(
      input({
        applicabilityEvidence: {
          denominatorTermComparabilityStatus: "unconfirmed",
          denominatorTermComparabilityBasis: "not_assessed",
        },
      }),
    );
    expect(confirmed.evidence.engineeringAccuracy).toMatchObject({
      approximatelyOnePercentClaimAvailable: true,
      approximatelyOnePercentClaimPublished: true,
      claimBasis:
        "W28_primary_statement_plus_content_addressed_engineering_geometry_assessment",
      numericShapeThresholdInvented: false,
      denominatorTermRatiosUsedForRouting: false,
    });
    for (const result of [outside, unassessed]) {
      expect(result.evidence.engineeringAccuracy).toMatchObject({
        approximatelyOnePercentClaimAvailable: false,
        approximatelyOnePercentClaimPublished: false,
        claimBasis: "not_available",
        numericShapeThresholdInvented: false,
        denominatorTermRatiosUsedForRouting: false,
      });
      expect(result.warnings).toEqual([]);
    }
  });

  it("does not calculate or invent a denominator-term ratio threshold", () => {
    const near = successOf(input());
    const far = successOf(
      input({
        multilayerAxialLengthM: toCanonicalSI(20, "in", "length"),
        applicabilityEvidence: {
          denominatorTermComparabilityStatus: "confirmed_not_about_equal",
        },
      }),
    );
    for (const result of [near, far]) {
      expect(result.evidence.warningPolicy).toEqual({
        stableWarningIdsPublished: false,
        unfrozenNumericShapeThresholdApplied: false,
        applicabilityUsesCategoricalContentAddressedEvidence: true,
      });
      expect(result.evidence.numericRepresentabilityPolicy).toEqual({
        binary64MinimumNormal: 2 ** -1022,
        boundaryKind: "machine_numeric_representability_only",
        positiveSubnormalIntermediatePolicy: "fail_closed",
        engineeringThreshold: false,
        sourceEquationRearranged: false,
      });
      expect(JSON.stringify(result.evidence.engineeringAccuracy)).not.toMatch(
        /numericRatio|thresholdValue|cutoff/i,
      );
    }
  });

  it("keeps B-06 outside the single-layer recommendation policy without inventing a multilayer recommendation", () => {
    const result = successOf(input());
    expect(result.evidence.recommendation).toEqual({
      registryEligibility: null,
      role: "independent_multilayer_route_only",
      participatesInSingleLayerRecommendationPolicy: false,
      recommendedMethodDecision: "not_decided_by_B-06",
      reason:
        "C-01 only states that B-06 uses an independent multilayer route and does not participate in the single-layer recommendation policy.",
    });
  });

  it.each([1, 0, -1])(
    "routes integer N_layer=%s below two to not_applicable with the frozen predicate",
    (layerCount) => {
      const result = evaluateB06WheelerMultilayer(input({ layerCount }));
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
        "N_layer<2 -> not_applicable",
      ]);
      if (result.status === "not_applicable") {
        expect(result.failure.code).toBe("B-06.layer_count_not_applicable");
      }
    },
  );

  it("does not infer multilayer geometry from a hollow or thick single-layer conductor", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        layerCount: 1,
        geometryEvidence: {
          radialBuildBasis: "single_conductor_radial_size",
          layerCountBasis: "inferred_from_single_conductor_thickness",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "single-conductor radial size is used as c_ml",
    ]);
  });

  it.each([
    [
      "single-layer winding class",
      { windingClass: "single_layer" },
      "B-06.single_layer_not_applicable",
    ],
    [
      "non-Figure-1 geometry",
      { figure1GeometryStatus: "not_satisfied" },
      "B-06.figure1_geometry_not_applicable",
    ],
  ] as const)("fails closed as not_applicable for %s", (_name, evidence, code) => {
    const result = evaluateB06WheelerMultilayer(
      input({ applicabilityEvidence: evidence }),
    );
    expect(result.status).toBe("not_applicable");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "not_applicable") {
      expect(result.failure.code).toBe(code);
    }
  });

  it("fails strongly nonuniform geometry closed with its exact frozen warning predicate", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        applicabilityEvidence: {
          turnDistributionStatus: "confirmed_strongly_nonuniform",
        },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "layer radii or turn distribution is strongly nonuniform",
    ]);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    ["winding class", { windingClass: "other_or_unknown" }],
    ["Figure 1 shape", { figure1GeometryStatus: "unconfirmed" }],
    ["turn distribution", { turnDistributionStatus: "unconfirmed" }],
  ] as const)("returns insufficient_data for unconfirmed %s", (_name, evidence) => {
    const result = evaluateB06WheelerMultilayer(
      input({ applicabilityEvidence: evidence }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    [
      "D_c/D_m as a_ml",
      { meanRadiusBasis: "single_layer_D_c_or_D_m_radius" },
      "single-layer D_c is used as a_ml",
      "B-06.mean_radius_mapping_invalid",
    ],
    [
      "d_rad as c_ml",
      { radialBuildBasis: "single_conductor_radial_size" },
      "single-conductor radial size is used as c_ml",
      "B-06.radial_build_mapping_invalid",
    ],
  ] as const)(
    "rejects %s with the exact frozen warning",
    (_name, geometryEvidence, predicate, code) => {
      const result = evaluateB06WheelerMultilayer(
        input({ geometryEvidence }),
      );
      expect(result.status).toBe("invalid_input");
      expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
        predicate,
      ]);
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe(code);
      }
    },
  );

  it.each([
    [
      "single-layer/ambiguous b",
      { axialLengthBasis: "single_layer_or_ambiguous_length" },
      "B-06.axial_length_mapping_invalid",
    ],
    [
      "conflated N and N_layer",
      { electricalTurnCountBasis: "conflated_with_layer_count" },
      "B-06.turn_count_mapping_invalid",
    ],
    [
      "layer count inferred from conductor thickness",
      { layerCountBasis: "inferred_from_single_conductor_thickness" },
      "B-06.layer_count_mapping_invalid",
    ],
  ] as const)("rejects %s without manufacturing a warning", (_name, evidence, code) => {
    const result = evaluateB06WheelerMultilayer(
      input({ geometryEvidence: evidence }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect("value" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe(code);
    }
  });

  it.each([
    ["same-snapshot status", { semanticMappingStatus: "unconfirmed" }],
    ["a_ml basis", { meanRadiusBasis: "other_or_unknown" }],
    ["b_ml basis", { axialLengthBasis: "other_or_unknown" }],
    ["c_ml basis", { radialBuildBasis: "other_or_unknown" }],
    ["N basis", { electricalTurnCountBasis: "other_or_unknown" }],
    ["N_layer basis", { layerCountBasis: "other_or_unknown" }],
  ] as const)("returns insufficient_data for unconfirmed %s", (_name, evidence) => {
    const result = evaluateB06WheelerMultilayer(
      input({ geometryEvidence: evidence }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    [
      "D_c parameter ID",
      { multilayerMeanRadiusParameterId: "coil.current_path_diameter" },
      "single-layer D_c is used as a_ml",
    ],
    [
      "D_m parameter ID",
      { multilayerMeanRadiusParameterId: "coil.mean_diameter" },
      "single-layer D_c is used as a_ml",
    ],
    [
      "d_rad parameter ID",
      { multilayerRadialBuildParameterId: "conductor.radial_size" },
      "single-conductor radial size is used as c_ml",
    ],
  ] as const)("rejects the known %s substitution at the parameter-ID boundary", (_name, evidence, predicate) => {
    const result = evaluateB06WheelerMultilayer(
      input({
        geometryEvidence:
          evidence as unknown as Partial<B06GeometrySemanticEvidence>,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      predicate,
    ]);
    expect("value" in result).toBe(false);
  });

  it.each([
    ["a_ml", { normalizedMultilayerMeanRadiusM: 0.2 }],
    ["b_ml", { normalizedMultilayerAxialLengthM: 0.2 }],
    ["c_ml", { normalizedMultilayerRadialBuildM: 0.2 }],
    ["N", { normalizedElectricalTurnCount: 21 }],
    ["N_layer", { normalizedLayerCount: 4 }],
  ] as const)("rejects a top-level/%s snapshot value mismatch", (_name, evidence) => {
    const result = evaluateB06WheelerMultilayer(
      input({ geometryEvidence: evidence }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-06.geometry_snapshot_value_mismatch");
    }
  });

  it.each([
    ["wrong kind", `case:${"6".repeat(64)}`],
    ["short digest", `geometry:${"6".repeat(63)}`],
    ["uppercase digest", `geometry:${"A".repeat(64)}`],
    ["legacy ID", "geometry:legacy"],
  ] as const)("strictly rejects %s geometry snapshot IDs", (_name, id) => {
    expectFailureWithoutResult(
      input({ geometryEvidence: { geometrySnapshotId: id } }),
    );
  });

  it.each(["applicability", "guard"] as const)(
    "rejects a content-addressed %s record from a different geometry snapshot",
    (kind) => {
      const otherId = `geometry:${"7".repeat(64)}`;
      const result = evaluateB06WheelerMultilayer(
        kind === "applicability"
          ? input({ applicabilityEvidence: { geometrySnapshotId: otherId } })
          : input({ applicationGuardEvidence: { geometrySnapshotId: otherId } }),
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-06.evidence_snapshot_mismatch");
      }
    },
  );

  it("rejects direct non-inch source-unit use without inventing a B-06 warning predicate", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        applicationGuardEvidence: {
          sourceUnitMapping: "millimetres_or_other_units_passed_directly",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.warnings).toEqual([]);
    expect("value" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-06.source_unit_mapping_invalid");
    }
  });

  it.each([
    { sourceUnitMapping: "unconfirmed" },
    { accuracyClaimPolicy: "unconfirmed" },
  ] as const)("returns insufficient_data for an unconfirmed application guard", (guard) => {
    const result = evaluateB06WheelerMultilayer(
      input({ applicationGuardEvidence: guard }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("rejects a forced about-1-percent claim outside the stated shape evidence with the frozen predicate", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        applicabilityEvidence: {
          denominatorTermComparabilityStatus: "confirmed_not_about_equal",
        },
        applicationGuardEvidence: {
          accuracyClaimPolicy: "approximately_one_percent_claim_forced",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "approximately 1% is claimed outside the stated shape condition",
    ]);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("rejects any forced accuracy label even when shape evidence is satisfied, without falsely firing the outside-domain predicate", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        applicationGuardEvidence: {
          accuracyClaimPolicy: "approximately_one_percent_claim_forced",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.warnings).toEqual([]);
    expect("value" in result).toBe(false);
  });

  it.each([
    [
      "confirmed comparability without assessment",
      {
        denominatorTermComparabilityStatus:
          "confirmed_about_equal_by_engineering_assessment",
        denominatorTermComparabilityBasis: "not_assessed",
      },
      "insufficient_data",
    ],
    [
      "unconfirmed comparability with completed assessment",
      {
        denominatorTermComparabilityStatus: "unconfirmed",
        denominatorTermComparabilityBasis:
          "content_addressed_engineering_geometry_assessment",
      },
      "invalid_input",
    ],
  ] as const)("fails closed for %s", (_name, evidence, status) => {
    const result = evaluateB06WheelerMultilayer(
      input({ applicabilityEvidence: evidence }),
    );
    expect(result.status).toBe(status);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    ["zero a_ml", { multilayerMeanRadiusM: 0 }],
    ["negative a_ml", { multilayerMeanRadiusM: -1 }],
    ["NaN a_ml", { multilayerMeanRadiusM: Number.NaN }],
    ["infinite a_ml", { multilayerMeanRadiusM: Number.POSITIVE_INFINITY }],
    ["zero b_ml", { multilayerAxialLengthM: 0 }],
    ["negative b_ml", { multilayerAxialLengthM: -1 }],
    ["NaN b_ml", { multilayerAxialLengthM: Number.NaN }],
    ["infinite b_ml", { multilayerAxialLengthM: Number.POSITIVE_INFINITY }],
    ["zero c_ml", { multilayerRadialBuildM: 0 }],
    ["negative c_ml", { multilayerRadialBuildM: -1 }],
    ["NaN c_ml", { multilayerRadialBuildM: Number.NaN }],
    ["infinite c_ml", { multilayerRadialBuildM: Number.POSITIVE_INFINITY }],
    ["zero N", { electricalTurnCount: 0 }],
    ["negative N", { electricalTurnCount: -1 }],
    ["fractional N", { electricalTurnCount: 2.5 }],
    ["NaN N", { electricalTurnCount: Number.NaN }],
    ["infinite N", { electricalTurnCount: Number.POSITIVE_INFINITY }],
    ["unsafe N", { electricalTurnCount: Number.MAX_SAFE_INTEGER + 1 }],
    ["fractional N_layer", { layerCount: 2.5 }],
    ["NaN N_layer", { layerCount: Number.NaN }],
    ["infinite N_layer", { layerCount: Number.POSITIVE_INFINITY }],
    ["unsafe N_layer", { layerCount: Number.MAX_SAFE_INTEGER + 1 }],
  ])("rejects %s without value or evidence", (_name, overrides) => {
    expectFailureWithoutResult(input(overrides as InputOverrides));
  });

  it("fails closed for source-chain overflow, underflow, false zero, and non-finite output", () => {
    const candidates = [
      input({
        multilayerMeanRadiusM: Number.MIN_VALUE,
        multilayerAxialLengthM: Number.MIN_VALUE,
        multilayerRadialBuildM: Number.MIN_VALUE,
      }),
      input({ multilayerMeanRadiusM: 1e200 }),
      input({ multilayerMeanRadiusM: 1e-200 }),
      input({
        multilayerMeanRadiusM: 1e150,
        multilayerAxialLengthM: 1e150,
        multilayerRadialBuildM: 1e150,
        electricalTurnCount: Number.MAX_SAFE_INTEGER,
      }),
    ];
    for (const candidate of candidates) {
      const result = evaluateB06WheelerMultilayer(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-06.numeric_resolution_invalid");
      }
    }
  });

  it("fails closed when a positive subnormal a-squared term would contaminate the frozen source chain", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        multilayerMeanRadiusM: 1.016e-163,
        multilayerAxialLengthM: 1.016e-163,
        multilayerRadialBuildM: 1.016e-163,
        electricalTurnCount: 1,
        layerCount: 2,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-06.numeric_resolution_invalid");
    }
  });

  it("prioritizes the known N_layer<2 domain exclusion over a later subnormal calculation-chain guard", () => {
    const result = evaluateB06WheelerMultilayer(
      input({
        multilayerMeanRadiusM: 1.016e-163,
        multilayerAxialLengthM: 1.016e-163,
        multilayerRadialBuildM: 1.016e-163,
        electricalTurnCount: 1,
        layerCount: 1,
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "N_layer<2 -> not_applicable",
    ]);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "not_applicable") {
      expect(result.failure.code).toBe("B-06.layer_count_not_applicable");
    }
  });

  it.each([
    [
      "9b swallowed by 6a",
      {
        multilayerMeanRadiusM: 1e20,
        multilayerAxialLengthM: 1e-20,
        multilayerRadialBuildM: 1,
      },
    ],
    [
      "10c swallowed by the first denominator sum",
      {
        multilayerMeanRadiusM: 1e20,
        multilayerAxialLengthM: 1e20,
        multilayerRadialBuildM: 1e-20,
      },
    ],
    [
      "first denominator sum swallowed by 10c",
      {
        multilayerMeanRadiusM: 1,
        multilayerAxialLengthM: 1,
        multilayerRadialBuildM: 1e20,
      },
    ],
  ])("fails closed when a positive term is swallowed: %s", (_name, overrides) => {
    const result = evaluateB06WheelerMultilayer(
      input(overrides as InputOverrides),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    if (result.status === "invalid_input") {
      expect(result.failure.code).toBe("B-06.numeric_resolution_invalid");
    }
  });

  it("rejects missing/extra/legacy/symbol fields, accessors, hostile Proxy traps, and huge sparse arrays", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "multilayerMeanRadiusM",
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
      "sourceUnitMapping",
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
      { ...input(), t: BASE_C_M },
      { ...input(), currentPathDiameterM: 2 * BASE_A_M },
      { ...input(), conductorRadialSizeM: BASE_C_M },
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
      expect(() => evaluateB06WheelerMultilayer(candidate)).not.toThrow();
      expectFailureWithoutResult(candidate);
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
      { ...input(), multilayerMeanRadiusM: hostile },
      { ...input(), multilayerAxialLengthM: hostile },
      { ...input(), multilayerRadialBuildM: hostile },
      { ...input(), electricalTurnCount: hostile },
      { ...input(), layerCount: hostile },
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
          meanRadiusBasis: hostile,
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
          denominatorTermComparabilityStatus: hostile,
        },
      },
      {
        ...input(),
        applicationGuardEvidence: {
          ...BASE_APPLICATION_GUARD,
          sourceUnitMapping: hostile,
        },
      },
    ];
    for (const candidate of candidates) {
      expect(() => evaluateB06WheelerMultilayer(candidate)).not.toThrow();
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

  it("deep-freezes successful values, traces, mappings, assumptions, and release gates", () => {
    const result = successOf(input());
    for (const candidate of [
      result,
      result.value,
      result.value.inductance,
      result.evidence,
      result.evidence.geometrySemanticEvidence,
      result.evidence.applicabilityEvidence,
      result.evidence.applicationGuardEvidence,
      result.evidence.geometry,
      result.evidence.geometry.multilayerMeanRadius,
      result.evidence.geometry.multilayerAxialLength,
      result.evidence.geometry.multilayerRadialBuild,
      result.evidence.geometry.electricalTurnCount,
      result.evidence.geometry.layerCount,
      result.evidence.equation,
      result.evidence.equation.substitution,
      result.evidence.unitIdentityChecks,
      result.evidence.engineeringAccuracy,
      result.evidence.warningPolicy,
      result.evidence.numericRepresentabilityPolicy,
      result.evidence.recommendation,
      result.warnings,
      B06_METHOD_MAPPING,
      B06_IMPLEMENTATION_READINESS,
      B06_IMPLEMENTATION_READINESS.openGates,
      B06_W28_CONTROLLED_SOURCE,
      B06_ASSUMPTIONS,
    ]) {
      expect(Object.isFrozen(candidate)).toBe(true);
    }
  });

  it("deep-freezes failure metadata and warning payloads while omitting value/evidence", () => {
    const result = evaluateB06WheelerMultilayer(input({ layerCount: 1 }));
    expect(result.status).toBe("not_applicable");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.methodMapping)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.warnings[0])).toBe(true);
    if (result.status === "not_applicable") {
      expect(Object.isFrozen(result.failure)).toBe(true);
    }
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("contains no calibration, workbook, screenshot, hidden coefficient, or historical-output truth path", () => {
    const result = successOf(input());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/workbook|screenshot|calibrat/i);
    expect(serialized).not.toMatch(/currentPathDiameter|meanDiameter|conductorRadialSize/);
    expect(result.evidence.sourceRefs).toEqual([
      "W28:PDF1:PRINT1398:FIG1:eq1",
    ]);
    expect(result.evidence.contractSourceRefs).toEqual([
      "W28:PDF1:PRINT1398:Fig1:eq1",
    ]);
    expect(result.evidence.derivationRefs).toEqual([]);
    expect(result.evidence.validationCaseIds).toEqual([]);
    expect(result.evidence.methodCheckIds).toEqual(["EM-L-ML-001"]);
  });
});
