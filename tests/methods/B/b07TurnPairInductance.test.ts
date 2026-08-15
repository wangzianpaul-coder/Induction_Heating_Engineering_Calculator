import { describe, expect, it, vi } from "vitest";

import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import { methodId } from "../../../src/domain/ids.js";
import {
  B07_ASSUMPTIONS,
  B07_BINARY64_MIN_NORMAL,
  B07_CONTRACT_SOURCE_REFS,
  B07_DERIVATION_REFS,
  B07_IMPLEMENTATION_READINESS,
  B07_METHOD_CHECK_IDS,
  B07_METHOD_ID,
  B07_METHOD_MAPPING,
  B07_METHOD_VERSION,
  B07_RG12_CONTROLLED_SOURCE,
  B07_SOURCE_REFS,
  B07_VALIDATION_CASE_IDS,
  B07_VACUUM_PERMEABILITY_H_PER_M,
  B07_WARNING_PREDICATES,
  calculateB07TurnPairInductance,
  type B07ModelScopeEvidence,
  type B07TurnPairInductanceFailure,
  type B07TurnPairInductanceInput,
} from "../../../src/methods/B/b07TurnPairInductance.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"7".repeat(64)}`;

type MutableInput = {
  -readonly [Key in keyof B07TurnPairInductanceInput]: B07TurnPairInductanceInput[Key];
};

function makeInput(
  turnRadiiM: number[] = [0.25],
  turnAxialPositionsM: number[] = [0],
): MutableInput {
  return {
    turnRadiiM,
    turnAxialPositionsM,
    conductorRoundRadiusM: 0.0004,
    currentDistribution: "uniform_cross_section",
    geometryEvidence: {
      normalizedByMethodId: "B-01",
      normalizedByMethodVersion: METHOD_SPECIFICATION_REGISTRY.get(
        methodId("B-01"),
      ).methodVersion,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
      semanticMappingStatus: "confirmed_same_B01_snapshot",
      turnRadiusContractParameterId: "turn.radius[]",
      turnRadiusBasis: "explicit_per_turn_current_path_radius",
      normalizedTurnRadiiM: [...turnRadiiM],
      turnAxialPositionContractParameterId: "turn.axial_position[]",
      b01TurnCenterParameterId: "coil.turn_center_z[]",
      axialPositionMapping: "explicit_identity_to_B01_turn_centers",
      normalizedTurnAxialPositionsM: [...turnAxialPositionsM],
      coordinateSystemId: "coil-axis-origin-at-winding-midplane",
      turnOrdering: "ascending",
      geometrySourceRef: "case:geometry-engineering-record",
    },
    modelScopeEvidence: {
      geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
      planarCoaxialLoopStatus: "confirmed",
      conductorSection: "thin_solid_round",
      thinSolidRoundApproximationStatus:
        "confirmed_without_numeric_threshold",
      conductorRoundRadiusContractParameterId: "conductor.round_radius",
      normalizedConductorRoundRadiusM: 0.0004,
      currentDistributionContractParameterId: "current_distribution",
      currentDistribution: "uniform_cross_section",
      continuousHelixEffect: "negligible_for_discrete_loop_model",
      leadTreatment: "winding_only_boundary_explicitly_excludes_leads",
      proximityEffect: "negligible_for_discrete_loop_model",
      turnIntersectionStatus: "confirmed_non_intersecting",
      conductorAssumptionSourceRef: "case:conductor-engineering-record",
      currentDistributionSourceRef: "case:current-distribution-record",
      omittedPathAssessmentSourceRef: "case:scope-assessment-record",
    },
  };
}

function withScope(
  input: B07TurnPairInductanceInput,
  patch: Partial<B07ModelScopeEvidence>,
): B07TurnPairInductanceInput {
  return {
    ...input,
    modelScopeEvidence: { ...input.modelScopeEvidence, ...patch },
  };
}

function expectFailureWithoutPublication(
  outcome: ReturnType<typeof calculateB07TurnPairInductance>,
  status: B07TurnPairInductanceFailure["status"],
  code: B07TurnPairInductanceFailure["failure"]["code"],
): asserts outcome is B07TurnPairInductanceFailure {
  expect(outcome.status).toBe(status);
  if (outcome.status === "success") {
    throw new Error("Expected a failure-closed B-07 outcome.");
  }
  expect(outcome.failure.code).toBe(code);
  expect(outcome.warningIds).toEqual([]);
  expect(outcome.warnings).toEqual([]);
  expect("value" in outcome).toBe(false);
  expect("evidence" in outcome).toBe(false);
  const json = JSON.parse(JSON.stringify(outcome)) as Record<string, unknown>;
  expect(json).not.toHaveProperty("value");
  expect(json).not.toHaveProperty("evidence");
  expect(json).not.toHaveProperty("unit");
  expect(json).not.toHaveProperty("dimension");
}

describe("B-07 controlled mapping and release boundary", () => {
  it("binds method, contract, source, derivation and validation metadata exactly", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-07"));

    expect(B07_METHOD_ID).toBe("B-07");
    expect(B07_METHOD_VERSION).toBe(specification.methodVersion);
    expect(B07_SOURCE_REFS).toEqual([
      "RG12:PDF6:eq1",
      "RG12:PDF123:eq81",
      "RG12:PDF126-128:example57",
      "CODATA22",
    ]);
    expect(B07_CONTRACT_SOURCE_REFS).toEqual([
      "RG12:PDF6:eq1",
      "RG12:PDF123:eq81",
      "RG12:PDF126-128:Example57",
      "DER-EM:SI-normalization-pending",
    ]);
    expect(B07_DERIVATION_REFS).toEqual([
      "DER-EM:SI-normalization-pending",
    ]);
    expect(B07_VALIDATION_CASE_IDS).toEqual([
      "EM-L-005",
      "EM-L-006",
      "EM-L-004",
    ]);
    expect(B07_METHOD_CHECK_IDS).toEqual([]);
    expect(B07_METHOD_MAPPING.inputParameterIds).toEqual([
      "turn.radius[]",
      "turn.axial_position[]",
      "conductor.round_radius",
      "current_distribution",
    ]);
    expect(B07_METHOD_MAPPING.outputQuantityIds).toEqual([
      "L_total",
      "Lself_i",
      "Mij",
    ]);
    expect(B07_METHOD_MAPPING.scientificConfidence).toBeNull();
    expect(B07_METHOD_MAPPING.confidenceResolutionReason).toContain(
      "split into child methods",
    );
  });

  it("pins the controlled RG12 file hash and original-page locations", () => {
    expect(B07_RG12_CONTROLLED_SOURCE).toEqual({
      sourceId: "RG12",
      relativePath:
        "references/external_sources/nbsbulletinv8n1p1_A2b.pdf",
      sha256:
        "73ec4b101d78494bb4d6d10312bc04df5313e678a27b008bd27e6bdadf85ff82",
      mutualEquationLocation: "PDF6:eq1",
      summationEquationLocation: "PDF123:eq81",
      exampleLocation: "PDF126-128:Example57",
      sourceManifestRef: "SOURCE_MANIFEST.csv#nbsbulletinv8n1p1_A2b.pdf",
      originalUnitSystem: "electromagnetic_CGS",
    });
  });

  it("records every non-activation gate without inventing a child, warning, parameter, or provider", () => {
    expect(B07_IMPLEMENTATION_READINESS.runtimeActivation).toBe("blocked");
    expect(B07_IMPLEMENTATION_READINESS.implementedSubpath).toContain(
      "single_turn",
    );
    expect(B07_IMPLEMENTATION_READINESS.openGates.map(({ gateId }) => gateId)).toEqual([
      "B-07.elliptic-provider-release-gate",
      "B-07.DER-EM-SI-normalization-and-EM-L-004",
      "B-07.composite-confidence-child-split",
      "B-07.parameter-dictionary-alignment",
      "B-07.stable-warning-ids-and-trigger-policy",
    ]);
    expect(B07_METHOD_MAPPING.stableWarningIds).toEqual([]);
    expect(
      METHOD_SPECIFICATION_REGISTRY.get(methodId("B-07")).implementationAvailable,
    ).toBe(false);
    expect(
      METHOD_SPECIFICATION_REGISTRY.get(methodId("B-07")).executable,
    ).toBe(false);
  });

  it("binds each prose predicate exactly and keeps stable warning IDs empty", () => {
    expect(B07_WARNING_PREDICATES).toEqual({
      sameTurnMutualSingularity: "i=j mutual-inductance singularity",
      thinWireScopeUnconfirmed: "r_c/a is not small",
      turnsIntersect: "turns intersect",
      unsupportedSectionSelfConstant:
        "hollow or rectangular section uses the -7/4 self term",
      leadContributionMissing: "lead contribution is missing",
    });
    expect(B07_METHOD_MAPPING.warningPredicates).toEqual(
      Object.values(B07_WARNING_PREDICATES),
    );
  });
});

describe("B-07 released single-turn self-inductance subpath", () => {
  it("evaluates the frozen canonical-SI thin-solid-round self equation", () => {
    const input = makeInput();
    const result = calculateB07TurnPairInductance(input);

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error(result.failure.code);
    }
    const expected =
      B07_VACUUM_PERMEABILITY_H_PER_M *
      0.25 *
      (Math.log((8 * 0.25) / 0.0004) - 7 / 4);
    expect(result.value.totalInductance.valueSi).toBe(expected);
    expect(result.value.selfInductances).toEqual([
      {
        quantityId: "Lself_i",
        turnIndex: 0,
        valueSi: expected,
        dimensionId: "inductance",
        canonicalUnitId: "H",
      },
    ]);
    expect(result.value.mutualInductances).toEqual([]);
    expect(result.evidence.mutualEvaluation).toEqual({
      status: "not_applicable",
      pairCount: 0,
      providerUsed: false,
      reason: "a single turn has no i<j mutual-inductance pair",
    });
  });

  it("publishes an auditable substitution, dimensions, assumptions and validation state", () => {
    const result = calculateB07TurnPairInductance(makeInput());
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error(result.failure.code);
    }

    expect(result.evidence.equation.selfEquation).toBe(
      "L_i=mu0*a_i*[ln(8*a_i/r_c)-7/4]",
    );
    expect(result.evidence.equation.totalEquation).toBe(
      "L_total=sum_i(L_i)+2*sum_i_less_than_j(M_ij)",
    );
    expect(result.evidence.equation.substitution).toMatchObject({
      radiusM: 0.25,
      conductorRoundRadiusM: 0.0004,
      eightRadiusM: 2,
      finiteSectionConstant: 1.75,
      mutualPairSumH: 0,
    });
    expect(result.evidence.units.dimensionalIdentity).toBe("(H/m)*m=H");
    expect(result.evidence.assumptions).toBe(B07_ASSUMPTIONS);
    expect(result.evidence.validationState.emL004).toBe(
      "blocked_pending_signed_CGS_to_SI_chain",
    );
    expect(result.evidence.numericRepresentabilityPolicy).toMatchObject({
      engineeringThreshold: false,
      rCOverAThresholdApplied: false,
      positiveSubnormalIntermediatePolicy: "fail_closed",
      swallowedPositiveOrSubtractiveTermPolicy: "fail_closed",
    });
  });

  it("scales linearly when every length is scaled by the same factor", () => {
    const base = calculateB07TurnPairInductance(makeInput([0.25], [0]));
    const scaledInput = makeInput([1], [0]);
    scaledInput.conductorRoundRadiusM = 0.0016;
    scaledInput.modelScopeEvidence = {
      ...scaledInput.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 0.0016,
    };
    const scaled = calculateB07TurnPairInductance(scaledInput);
    expect(base.status).toBe("success");
    expect(scaled.status).toBe("success");
    if (base.status !== "success" || scaled.status !== "success") {
      throw new Error("Expected successful dimensional scaling cases.");
    }
    expect(scaled.value.totalInductance.valueSi).toBeCloseTo(
      4 * base.value.totalInductance.valueSi,
      14,
    );
  });

  it("increases self inductance when the explicit conductor radius decreases", () => {
    const largerWireInput = makeInput();
    largerWireInput.conductorRoundRadiusM = 0.001;
    largerWireInput.modelScopeEvidence = {
      ...largerWireInput.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 0.001,
    };
    const smallerWireInput = makeInput();
    smallerWireInput.conductorRoundRadiusM = 0.0001;
    smallerWireInput.modelScopeEvidence = {
      ...smallerWireInput.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 0.0001,
    };
    const largerWire = calculateB07TurnPairInductance(largerWireInput);
    const smallerWire = calculateB07TurnPairInductance(smallerWireInput);
    expect(largerWire.status).toBe("success");
    expect(smallerWire.status).toBe("success");
    if (largerWire.status !== "success" || smallerWire.status !== "success") {
      throw new Error("Expected successful analytical-limit cases.");
    }
    expect(smallerWire.value.totalInductance.valueSi).toBeGreaterThan(
      largerWire.value.totalInductance.valueSi,
    );
  });

  it("does not infer or numerically threshold r_c/a after explicit scope confirmation", () => {
    const input = makeInput();
    input.conductorRoundRadiusM = 0.02;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 0.02,
    };
    const result = calculateB07TurnPairInductance(input);
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error(result.failure.code);
    }
    expect(result.warningIds).toEqual([]);
    expect(result.evidence.numericRepresentabilityPolicy.rCOverAThresholdApplied).toBe(
      false,
    );
  });

  it("snapshots and deeply freezes arrays so later caller mutation cannot alter the result", () => {
    const input = makeInput();
    const result = calculateB07TurnPairInductance(input);
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error(result.failure.code);
    }
    const published = result.value.totalInductance.valueSi;

    (input.turnRadiiM as number[])[0] = 99;
    (input.turnAxialPositionsM as number[])[0] = 88;
    (input.geometryEvidence.normalizedTurnRadiiM as number[])[0] = 77;
    (input.geometryEvidence.normalizedTurnAxialPositionsM as number[])[0] = 66;

    expect(result.value.totalInductance.valueSi).toBe(published);
    expect(result.evidence.inputSnapshot.turnRadiiM).toEqual([0.25]);
    expect(result.evidence.inputSnapshot.turnAxialPositionsM).toEqual([0]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.selfInductances)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.geometrySemanticEvidence.normalizedTurnRadiiM)).toBe(
      true,
    );
  });
});

describe("B-07 mutual/provider release gate", () => {
  it("fails every two-turn case without publishing candidate self, mutual, or total values", () => {
    const result = calculateB07TurnPairInductance(
      makeInput([0.25, 0.25], [-0.005, 0.005]),
    );
    expectFailureWithoutPublication(
      result,
      "insufficient_data",
      "B-07.elliptic_provider_release_gate",
    );
    expect(result.failure.message).toContain("complete-elliptic-integral provider");
  });

  it("fails three unequal-radius turns at the same provider gate without a last partial sum", () => {
    const result = calculateB07TurnPairInductance(
      makeInput([0.2, 0.25, 0.3], [-0.02, 0, 0.02]),
    );
    expectFailureWithoutPublication(
      result,
      "insufficient_data",
      "B-07.elliptic_provider_release_gate",
    );
    expect(JSON.stringify(result)).not.toContain("selfInductances");
    expect(JSON.stringify(result)).not.toContain("mutualInductances");
    expect(JSON.stringify(result)).not.toContain("totalInductance");
  });

  it("routes N>=2 to the unused provider gate before single-turn subnormal arithmetic", () => {
    const radius = B07_BINARY64_MIN_NORMAL / 2;
    const input = makeInput([radius, radius], [-1, 1]);
    input.conductorRoundRadiusM = Number.MIN_VALUE;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: Number.MIN_VALUE,
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "insufficient_data",
      "B-07.elliptic_provider_release_gate",
    );
  });

  it("rejects coincident turn centerlines before the provider gate", () => {
    const result = calculateB07TurnPairInductance(
      makeInput([0.25, 0.25], [0, 0]),
    );
    expectFailureWithoutPublication(
      result,
      "not_applicable",
      "B-07.turns_intersect",
    );
  });
});

describe("B-07 applicability fails closed before numeric/provider work", () => {
  it.each([
    [
      { planarCoaxialLoopStatus: "not_satisfied" },
      "B-07.planar_coaxial_geometry_not_applicable",
    ],
    [
      { conductorSection: "hollow_round" },
      "B-07.unsupported_conductor_section",
    ],
    [
      { conductorSection: "rectangular" },
      "B-07.unsupported_conductor_section",
    ],
    [
      { thinSolidRoundApproximationStatus: "not_satisfied" },
      "B-07.thin_solid_round_approximation_not_applicable",
    ],
    [
      { currentDistribution: "strong_skin_surface" },
      "B-07.strong_skin_not_applicable",
    ],
    [
      { continuousHelixEffect: "significant" },
      "B-07.continuous_helix_not_applicable",
    ],
    [
      { leadTreatment: "complete_terminal_boundary_with_unmodelled_leads" },
      "B-07.lead_boundary_not_applicable",
    ],
    [{ proximityEffect: "significant" }, "B-07.proximity_not_applicable"],
    [{ turnIntersectionStatus: "intersecting" }, "B-07.turns_intersect"],
  ] as const)("rejects known out-of-domain evidence %j", (scopePatch, code) => {
    const input = makeInput([B07_BINARY64_MIN_NORMAL / 2], [0]);
    input.conductorRoundRadiusM = Number.MIN_VALUE;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: Number.MIN_VALUE,
    };
    const result = calculateB07TurnPairInductance(
      withScope(input, scopePatch as Partial<B07ModelScopeEvidence>),
    );
    expectFailureWithoutPublication(result, "not_applicable", code);
  });

  it("rejects a top-level strong-skin declaration even if the evidence copy disagrees", () => {
    const input = makeInput();
    input.currentDistribution = "strong_skin_surface";
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "not_applicable",
      "B-07.strong_skin_not_applicable",
    );
  });

  it.each([
    { planarCoaxialLoopStatus: "unconfirmed" },
    { conductorSection: "other_or_unknown" },
    { thinSolidRoundApproximationStatus: "unconfirmed" },
    { currentDistribution: "other_or_unknown" },
    { continuousHelixEffect: "unconfirmed" },
    { leadTreatment: "unconfirmed" },
    { proximityEffect: "unconfirmed" },
    { turnIntersectionStatus: "unconfirmed" },
  ] as const)("returns insufficient_data for unresolved scope evidence %j", (scopePatch) => {
    const result = calculateB07TurnPairInductance(
      withScope(
        makeInput(),
        scopePatch as Partial<B07ModelScopeEvidence>,
      ),
    );
    expectFailureWithoutPublication(
      result,
      "insufficient_data",
      "B-07.model_scope_unconfirmed",
    );
  });
});

describe("B-07 geometry and input trust boundary", () => {
  it("requires the same content-addressed snapshot across geometry and scope evidence", () => {
    const input = makeInput();
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      geometrySnapshotId: `geometry:${"8".repeat(64)}`,
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
    );
  });

  it("rejects top-level turn arrays that differ from the B-01 snapshot evidence", () => {
    const input = makeInput();
    input.turnRadiiM = [0.3];
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
    );
  });

  it("rejects a conductor radius that differs from its same-snapshot evidence", () => {
    const input = makeInput();
    input.conductorRoundRadiusM = 0.0005;
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
    );
  });

  it("rejects an unregistered current-distribution value without coercion", () => {
    const input = makeInput();
    input.currentDistribution = "legacy_ac" as never;
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.current_distribution_mismatch",
    );
  });

  it("returns insufficient_data for unconfirmed same-snapshot geometry mapping", () => {
    const input = makeInput();
    input.geometryEvidence = {
      ...input.geometryEvidence,
      semanticMappingStatus: "unconfirmed",
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "insufficient_data",
      "B-07.geometry_mapping_unconfirmed",
    );
  });

  it("rejects missing, extra and symbol top-level fields", () => {
    const missing = makeInput() as unknown as Record<string, unknown>;
    delete missing.currentDistribution;
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(missing as unknown as B07TurnPairInductanceInput),
      "invalid_input",
      "B-07.input_schema_invalid",
    );

    const extra = { ...makeInput(), legacyRadiusMm: 250 };
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(extra),
      "invalid_input",
      "B-07.input_schema_invalid",
    );

    const symbolInput = makeInput() as B07TurnPairInductanceInput & {
      [key: symbol]: unknown;
    };
    symbolInput[Symbol("hidden")] = 1;
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(symbolInput),
      "invalid_input",
      "B-07.input_schema_invalid",
    );
  });

  it("does not execute a top-level getter", () => {
    let getterCalls = 0;
    const input = makeInput() as unknown as Record<string, unknown>;
    Object.defineProperty(input, "turnRadiiM", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [0.25];
      },
    });
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(input as unknown as B07TurnPairInductanceInput),
      "invalid_input",
      "B-07.input_schema_invalid",
    );
    expect(getterCalls).toBe(0);
  });

  it("does not execute an array element getter", () => {
    let getterCalls = 0;
    const input = makeInput();
    const hostile = [0.25];
    Object.defineProperty(hostile, "0", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 0.25;
      },
    });
    input.turnRadiiM = hostile;
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(input),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );
    expect(getterCalls).toBe(0);
  });

  it("rejects sparse, extra-key and symbol-key arrays", () => {
    const sparseInput = makeInput();
    sparseInput.turnRadiiM = new Array(1);
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(sparseInput),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );

    const extraInput = makeInput();
    const extraArray = [0.25] as number[] & { legacy?: number };
    extraArray.legacy = 250;
    extraInput.turnRadiiM = extraArray;
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(extraInput),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );

    const symbolInput = makeInput();
    const symbolArray = [0.25] as number[] & { [key: symbol]: unknown };
    symbolArray[Symbol("hidden")] = 1;
    symbolInput.turnRadiiM = symbolArray;
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(symbolInput),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );
  });

  it("rejects a 0xffffffff sparse array quickly without throwing or iterating its length", () => {
    const input = makeInput();
    input.turnRadiiM = new Array(0xffffffff);
    expect(() => calculateB07TurnPairInductance(input)).not.toThrow();
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(input),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );
  });

  it("catches hostile Proxy reflection traps at top-level, array and nested evidence boundaries", () => {
    const top = new Proxy(makeInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(top),
      "invalid_input",
      "B-07.input_schema_invalid",
    );

    const arrayInput = makeInput();
    arrayInput.turnRadiiM = new Proxy([0.25], {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor");
      },
    });
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(arrayInput),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );

    const evidenceInput = makeInput();
    evidenceInput.geometryEvidence = new Proxy(evidenceInput.geometryEvidence, {
      ownKeys() {
        throw new Error("hostile evidence");
      },
    });
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(evidenceInput),
      "invalid_input",
      "B-07.geometry_evidence_invalid",
    );
  });

  it("rejects zero turns, mismatched array lengths, nonfinite coordinates and out-of-range r_c", () => {
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(makeInput([], [])),
      "invalid_input",
      "B-07.turn_count_invalid",
    );

    const mismatch = makeInput([0.25], [0]);
    mismatch.turnAxialPositionsM = [0, 1];
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(mismatch),
      "invalid_input",
      "B-07.turn_count_invalid",
    );

    const nonfinite = makeInput([0.25], [Number.NaN]);
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(nonfinite),
      "invalid_input",
      "B-07.turn_array_schema_invalid",
    );

    const outOfRange = makeInput();
    outOfRange.conductorRoundRadiusM = 0.25;
    outOfRange.modelScopeEvidence = {
      ...outOfRange.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 0.25,
    };
    expectFailureWithoutPublication(
      calculateB07TurnPairInductance(outOfRange),
      "invalid_input",
      "B-07.conductor_radius_out_of_range",
    );
  });
});

describe("B-07 binary64 representability boundaries", () => {
  it("rejects positive subnormal single-turn inputs as a machine boundary", () => {
    const radius = B07_BINARY64_MIN_NORMAL / 2;
    const input = makeInput([radius], [0]);
    input.conductorRoundRadiusM = Number.MIN_VALUE;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: Number.MIN_VALUE,
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.numeric_resolution_invalid",
    );
  });

  it("rejects gradual underflow in the positive mu0*a intermediate", () => {
    const radius = 2 * B07_BINARY64_MIN_NORMAL;
    const input = makeInput([radius], [0]);
    input.conductorRoundRadiusM = B07_BINARY64_MIN_NORMAL;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: B07_BINARY64_MIN_NORMAL,
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.numeric_resolution_invalid",
    );
  });

  it("rejects overflow in the source-ordered 8*a intermediate", () => {
    const radius = Number.MAX_VALUE / 4;
    const input = makeInput([radius], [0]);
    input.conductorRoundRadiusM = 1;
    input.modelScopeEvidence = {
      ...input.modelScopeEvidence,
      normalizedConductorRoundRadiusM: 1,
    };
    const result = calculateB07TurnPairInductance(input);
    expectFailureWithoutPublication(
      result,
      "invalid_input",
      "B-07.numeric_resolution_invalid",
    );
  });

  it("fails closed when binary64 swallows the -7/4 subtraction", () => {
    const logSpy = vi.spyOn(Math, "log").mockReturnValue(2 ** 60);
    try {
      const result = calculateB07TurnPairInductance(makeInput());
      expectFailureWithoutPublication(
        result,
        "invalid_input",
        "B-07.numeric_resolution_invalid",
      );
      expect(result.failure.message).toContain("swallowed");
    } finally {
      logSpy.mockRestore();
    }
  });
});
