import { describe, expect, it } from "vitest";

import * as publicApi from "../../../src/public-api.js";
import { methodId } from "../../../src/domain/ids.js";
import { H03_METHOD_VERSION } from "../../../src/methods/H/h03BranchFlowGeometry.js";
import {
  H05_BINARY64_MIN_NORMAL,
  H05_CONTRACT_SOURCE_REFS,
  H05_CONTROLLED_SOURCE_GATES,
  H05_DERIVATION_REFS,
  H05_IMPLEMENTATION_READINESS,
  H05_INTERNAL_ROUTE_NAMES,
  H05_METHOD_CHECK_IDS,
  H05_METHOD_ID,
  H05_METHOD_MAPPING,
  H05_METHOD_VERSION,
  H05_NUMERIC_REPRESENTABILITY_POLICY,
  H05_SOURCE_REFS,
  H05_VALIDATION_CASE_IDS,
  H05_WARNING_PREDICATES,
  evaluateH05PressureLossAndNetwork,
  type H05FailureCode,
  type H05InternalRouteName,
  type H05PressureLossAndNetworkFailure,
  type H05PressureLossAndNetworkInput,
  type H05PressureLossAndNetworkSuccess,
} from "../../../src/methods/H/h05PressureLossAndNetwork.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT_A = `case:${"a".repeat(64)}`;
const CASE_SNAPSHOT_B = `case:${"b".repeat(64)}`;
const GEOMETRY_SNAPSHOT_A = `geometry:${"c".repeat(64)}`;
const GEOMETRY_SNAPSHOT_B = `geometry:${"d".repeat(64)}`;
const PROPERTY_SNAPSHOT = `material:${"e".repeat(64)}`;
const FLUID_STATE_SNAPSHOT = `fluid_state:${"f".repeat(64)}`;
const RESULT_SNAPSHOT = `result:${"1".repeat(64)}`;
const ARTIFACT_SHA = "2".repeat(64);

function quantity<TDimension extends string, TUnit extends string>(
  valueSi: number,
  dimensionId: TDimension,
  canonicalUnitId: TUnit,
) {
  return { valueSi, dimensionId, canonicalUnitId };
}

function baseInput(
  route: H05InternalRouteName =
    "straight_round_turbulent_Colebrook_1939",
): H05PressureLossAndNetworkInput {
  const turbulent = route === "straight_round_turbulent_Colebrook_1939";
  return {
    route,
    flowGeometry: {
      kind: "h03_resolved_flow_geometry",
      sourceMethodId: "H-03",
      sourceMethodVersion: H03_METHOD_VERSION,
      sourceResultSnapshotId: RESULT_SNAPSHOT,
      sourceRef: "PROJECT-H03:RESULT:001",
      dataQuality: "project_specific",
      provenanceId: "provenance.h03.result.001",
      caseSnapshotId: CASE_SNAPSHOT_A,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
      fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
      coolantCircuitId: "coolant.circuit.001",
      coolantNetworkId: "coolant.network.001",
      branchId: "coolant.branch.001",
      timeBasisId: "steady.window.001",
      velocity: quantity(
        turbulent ? 10 : 0.1003009027,
        "velocity",
        "m_per_s",
      ),
      hydraulicDiameter: quantity(0.01, "length", "m"),
    },
    properties: {
      kind: "explicit_upstream_property_tuple",
      a02ResultClaimed: false,
      propertyTupleSnapshotId: PROPERTY_SNAPSHOT,
      propertyProviderId: "controlled.property.provider",
      propertyProviderVersion: "1.0.0",
      propertyProviderArtifactSha256: ARTIFACT_SHA,
      sourceRef: "PROJECT-PROPERTY-TUPLE:001",
      dataQuality: "engineering_reference",
      provenanceId: "provenance.property.tuple.001",
      caseSnapshotId: CASE_SNAPSHOT_A,
      fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
      coolantCircuitId: "coolant.circuit.001",
      coolantNetworkId: "coolant.network.001",
      branchId: "coolant.branch.001",
      timeBasisId: "steady.window.001",
      temperature: quantity(300, "absolute_temperature", "K"),
      pressure: {
        ...quantity(200_000, "pressure", "Pa"),
        pressureBasis: "absolute",
      },
      phaseClassification: "single_phase_liquid",
      rho: quantity(turbulent ? 1_000 : 997, "density", "kg_per_m3"),
      mu: quantity(0.001, "dynamic_viscosity", "Pa_s"),
    },
    straightSegment: {
      kind: "straight_segment_geometry",
      sourceRef: "PROJECT-GEOMETRY:STRAIGHT-SEGMENT:001",
      dataQuality: "project_specific",
      provenanceId: "provenance.geometry.segment.001",
      sourceArtifactSha256: ARTIFACT_SHA,
      caseSnapshotId: CASE_SNAPSHOT_A,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
      coolantCircuitId: "coolant.circuit.001",
      coolantNetworkId: "coolant.network.001",
      branchId: "coolant.branch.001",
      length: quantity(5, "length", "m"),
      lengthInterpretation: "straight_centerline_length",
    },
    roughness: turbulent
      ? {
          kind: "actual_absolute_roughness",
          roughnessMeaning: "actual_absolute_roughness",
          sourceRef: "PROJECT-ROUGHNESS:001",
          dataQuality: "project_specific",
          provenanceId: "provenance.roughness.001",
          sourceArtifactSha256: ARTIFACT_SHA,
          caseSnapshotId: CASE_SNAPSHOT_A,
          geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
          coolantCircuitId: "coolant.circuit.001",
          coolantNetworkId: "coolant.network.001",
          branchId: "coolant.branch.001",
          epsilon: quantity(1.5e-6, "length", "m"),
        }
      : {
          kind: "source_confirmed_not_applicable",
          roughnessMeaning: "not_applicable_to_laminar_route",
          sourceRef: "ID-HYD-02:LAMINAR-ROUGHNESS-NOT-CONSUMED",
          dataQuality: "approved_reference",
          provenanceId: "provenance.roughness.na.001",
          sourceArtifactSha256: ARTIFACT_SHA,
          caseSnapshotId: CASE_SNAPSHOT_A,
          geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
          coolantCircuitId: "coolant.circuit.001",
          coolantNetworkId: "coolant.network.001",
          branchId: "coolant.branch.001",
          epsilon: null,
        },
    localLosses: {
      kind: "source_confirmed_not_applicable",
      component: "local_losses",
      reasonCode: "no_local_loss_components_in_declared_segment",
      sourceRef: "PROJECT-GEOMETRY:NO-LOCAL-COMPONENTS:001",
      dataQuality: "project_specific",
      provenanceId: "provenance.local.loss.na.001",
      sourceArtifactSha256: ARTIFACT_SHA,
      caseSnapshotId: CASE_SNAPSHOT_A,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
      coolantCircuitId: "coolant.circuit.001",
      coolantNetworkId: "coolant.network.001",
      branchId: "coolant.branch.001",
    },
    elevation: {
      kind: "source_confirmed_not_applicable",
      component: "elevation",
      reasonCode: "no_elevation_change_in_declared_segment",
      sourceRef: "PROJECT-GEOMETRY:NO-ELEVATION-CHANGE:001",
      dataQuality: "project_specific",
      provenanceId: "provenance.elevation.na.001",
      sourceArtifactSha256: ARTIFACT_SHA,
      caseSnapshotId: CASE_SNAPSHOT_A,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_A,
      coolantCircuitId: "coolant.circuit.001",
      coolantNetworkId: "coolant.network.001",
      branchId: "coolant.branch.001",
    },
    networkScope: {
      kind: "single_branch_fixed_flow_only",
      topologyAdapterStatus: "not_applicable_single_branch",
      pumpCurveAdapterStatus: "not_applicable_single_branch",
      reachabilityClaimed: false,
    },
    applicability: {
      geometryClass: "straight_round_tube",
      flowScope: "single_branch_fixed_flow",
      phaseRegime: "single_phase_liquid",
      frictionFactorConvention: "Darcy",
    },
    solver: turbulent
      ? {
          kind: "explicit_ID_NUM_01_bracketed_bisection",
          lowerBoundFD: 0.01,
          upperBoundFD: 0.03,
          residualTolerance: 1e-12,
          bracketWidthTolerance: 1e-12,
          maxIterations: 100,
        }
      : {
          kind: "not_applicable_to_closed_form_laminar_route",
          lowerBoundFD: null,
          upperBoundFD: null,
          residualTolerance: null,
          bracketWidthTolerance: null,
          maxIterations: null,
        },
  };
}

function changed(
  mutate: (candidate: Record<string, any>) => void,
  route?: H05InternalRouteName,
): unknown {
  const candidate = structuredClone(baseInput(route)) as Record<string, any>;
  mutate(candidate);
  return candidate;
}

function successOf(input: unknown): H05PressureLossAndNetworkSuccess {
  const result = evaluateH05PressureLossAndNetwork(
    input as H05PressureLossAndNetworkInput,
  );
  if (result.status !== "success") {
    throw new Error(
      `Expected H-05 success; got ${result.status}/${result.failure.code}`,
    );
  }
  return result;
}

function failureOf(input: unknown): H05PressureLossAndNetworkFailure {
  const result = evaluateH05PressureLossAndNetwork(
    input as H05PressureLossAndNetworkInput,
  );
  if (result.status === "success") {
    throw new Error("Expected H-05 failure; got success");
  }
  return result;
}

function expectClosedFailure(
  input: unknown,
  status: H05PressureLossAndNetworkFailure["status"],
  code: H05FailureCode,
) {
  const result = failureOf(input);
  expect(result).toMatchObject({ status, failure: { code } });
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect("substitution" in result).toBe(false);
  expect("inputSnapshot" in result).toBe(false);
  expect("solverResiduals" in result).toBe(false);
  expect("internalRoute" in result).toBe(false);
  expect(JSON.stringify(result)).not.toContain('"root"');
  return result;
}

function setRe(candidate: Record<string, any>, reynolds: number) {
  candidate.properties.rho.valueSi = 1;
  candidate.flowGeometry.velocity.valueSi = reynolds;
  candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
  candidate.properties.mu.valueSi = 1;
}

function setUnknownComponent(candidate: Record<string, any>, key: string) {
  const component = candidate[key];
  component.kind = "unknown_or_unconfirmed";
  component.reasonCode = "unknown_or_unconfirmed";
  for (const field of [
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceArtifactSha256",
    "caseSnapshotId",
    "geometrySnapshotId",
    "coolantCircuitId",
    "coolantNetworkId",
    "branchId",
  ]) {
    component[field] = null;
  }
}

function setUnknownRoughness(candidate: Record<string, any>) {
  candidate.roughness = {
    kind: "unknown_or_unconfirmed",
    roughnessMeaning: "unknown_or_unconfirmed",
    sourceRef: null,
    dataQuality: null,
    provenanceId: null,
    sourceArtifactSha256: null,
    caseSnapshotId: null,
    geometrySnapshotId: null,
    coolantCircuitId: null,
    coolantNetworkId: null,
    branchId: null,
    epsilon: null,
  };
}

describe("H-05 frozen registry, sources and isolation", () => {
  it("maps the exact frozen parent specification without invented child IDs", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-05"));
    expect(H05_METHOD_ID).toBe("H-05");
    expect(H05_METHOD_VERSION).toBe(specification.methodVersion);
    expect(H05_METHOD_MAPPING.methodId).toBe(specification.methodId);
    expect(H05_METHOD_MAPPING.approvalStatus).toBe(
      "approved_with_limitation",
    );
    expect(H05_METHOD_MAPPING.methodType).toBe("numerical");
    expect(H05_METHOD_MAPPING.requiresSubmethodSplit).toBe(true);
    expect(H05_METHOD_MAPPING.submethodSplitBasis).toBe(
      specification.submethodSplitBasis,
    );
    expect(H05_SOURCE_REFS).toEqual([
      "ID-HYD-02",
      "C39:PP133-156",
      "NIST-TN2294:REPORT-P23",
    ]);
    expect(H05_CONTRACT_SOURCE_REFS).toEqual(
      specification.contractSourceRefs,
    );
    expect(H05_DERIVATION_REFS).toEqual(["ID-HYD-02"]);
    expect(H05_VALIDATION_CASE_IDS).toEqual([]);
    expect(H05_METHOD_CHECK_IDS).toEqual(["COOL-COLEBROOK-001"]);
    expect(H05_VALIDATION_CASE_IDS).not.toContain("COOL-DP-LAM-001");
    expect(H05_VALIDATION_CASE_IDS).not.toContain("COOL-DP-TURB-001");
    expect(H05_INTERNAL_ROUTE_NAMES.every((name) => !/^[A-J]-\d{2}$/u.test(name))).toBe(true);
    expect(H05_IMPLEMENTATION_READINESS.registeredChildMethodIds).toEqual([]);
    expect(H05_IMPLEMENTATION_READINESS.internalRouteNamesAreMethodIds).toBe(
      false,
    );
    expect(H05_METHOD_MAPPING.parameterMapping.dynamicViscosity).toEqual({
      contractInputId: "mu",
      parameterId: null,
      parameterDictionaryStatus: "controlled_parameter_id_missing",
      dimensionId: "dynamic_viscosity",
      canonicalUnitId: "Pa_s",
    });
    expect(H05_IMPLEMENTATION_READINESS.openMethodGates).toContain(
      "parameter_dictionary_dynamic_viscosity_id_missing",
    );
  });

  it("records C39 and NIST as null local-copy/hash/visual source gates", () => {
    expect(H05_CONTROLLED_SOURCE_GATES.map((gate) => gate.sourceRef)).toEqual([
      "C39:PP133-156",
      "NIST-TN2294:REPORT-P23",
    ]);
    for (const gate of H05_CONTROLLED_SOURCE_GATES) {
      expect(gate.localCopyPath).toBeNull();
      expect(gate.localCopySha256).toBeNull();
      expect(gate.sourceManifestEntry).toBeNull();
      expect(gate.visualPageReviewStatus).toBeNull();
      expect(gate.gateStatus).toBe("blocked_local_primary_copy_missing");
    }
    expect(H05_IMPLEMENTATION_READINESS.openMethodGates).toContain(
      "NIST_TN2294_Figure_18_digitization_pending",
    );
    expect(H05_IMPLEMENTATION_READINESS.runtimeActivation).toBe("blocked");
  });

  it("stays absent from public API and executable runtime registration", () => {
    expect("evaluateH05PressureLossAndNetwork" in publicApi).toBe(false);
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-05"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(specification.requiresSubmethodSplit).toBe(true);
  });

  it("publishes exact warning predicates and machine-only arithmetic policy", () => {
    expect(Object.values(H05_WARNING_PREDICATES)).toEqual(
      METHOD_SPECIFICATION_REGISTRY.get(methodId("H-05")).warningPredicates,
    );
    expect(H05_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(H05_NUMERIC_REPRESENTABILITY_POLICY).toMatchObject({
      engineeringTolerance: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      overflowPolicy: "fail_closed",
      swallowedTermPolicy: "fail_closed",
      coreRounding: "none",
    });
  });

  it("does not expose unused standard gravity in the straight-only partial", async () => {
    const module = await import(
      "../../../src/methods/H/h05PressureLossAndNetwork.js"
    );
    expect("H05_STANDARD_GRAVITY_M_PER_S2" in module).toBe(false);
  });
});

describe("H-05 frozen equations and dimensional behavior", () => {
  it("reproduces the frozen laminar Darcy baseline without mapping its prose heading", () => {
    const result = successOf(
      baseInput("straight_round_laminar_Darcy_64_over_Re"),
    );
    expect(result.value.Re.valueSi).toBeCloseTo(1_000, 6);
    expect(result.value.frictionFactorDarcy.valueSi).toBeCloseTo(0.064, 10);
    expect(
      result.value.pressureComponents.straightFriction.valueSi,
    ).toBeCloseTo(160.4814443, 6);
    expect(result.value.pressureComponents.total.valueSi).toBe(
      result.value.pressureComponents.straightFriction.valueSi,
    );
    expect(result.validationCaseIds).toEqual([]);
    expect(result.methodCheckIds).toEqual(["COOL-COLEBROOK-001"]);
    expect(result.solverResiduals).toEqual({
      solverUsed: false,
      algorithmId: "closed_form_fD_64_over_Re",
      classification: "analytical_internal_route",
    });
  });

  it("solves the frozen Colebrook regression point with explicit ID-NUM settings", () => {
    const result = successOf(
      changed((candidate) => {
        candidate.flowGeometry.hydraulicDiameter.valueSi = 0.02011;
        candidate.properties.rho.valueSi = 1;
        candidate.flowGeometry.velocity.valueSi = 100_000;
        candidate.properties.mu.valueSi = 0.02011;
      }),
    );
    expect(result.value.Re.valueSi).toBe(100_000);
    expect(result.value.frictionFactorDarcy.valueSi).toBeCloseTo(
      0.0183840,
      6,
    );
    expect(result.solverResiduals.solverUsed).toBe(true);
    if (result.solverResiduals.solverUsed) {
      expect(result.solverResiduals.algorithmId).toBe(
        "ID-NUM-01:bracketed-bisection",
      );
      expect(result.solverResiduals.residualMagnitude).toBeLessThanOrEqual(
        1e-12,
      );
      expect(result.solverResiduals.finalBracket.width).toBeLessThanOrEqual(
        1e-12,
      );
    }
  });

  it("accepts sourced exact-zero absolute roughness without treating unknown as zero", () => {
    const result = successOf(
      changed((candidate) => {
        candidate.roughness.epsilon.valueSi = 0;
      }),
    );
    expect(result.substitution.absoluteRoughnessM).toBe(0);
    expect(result.value.frictionFactorDarcy.valueSi).toBeGreaterThan(0);
  });

  it("keeps local/elevation unavailable records distinct from numeric zero", () => {
    const result = successOf(baseInput());
    expect(result.value.pressureComponents.localLosses).toEqual({
      availability: "source_confirmed_not_applicable",
      numericPlaceholderUsed: false,
    });
    expect(result.value.pressureComponents.elevation).toEqual({
      availability: "source_confirmed_not_applicable",
      numericPlaceholderUsed: false,
    });
    expect("valueSi" in result.value.pressureComponents.localLosses).toBe(false);
    expect("valueSi" in result.value.pressureComponents.elevation).toBe(false);
    expect(JSON.stringify(result.evidence.localLosses)).not.toContain(
      '"valueSi":0',
    );
  });

  it("marks branch flow and pump workpoint unavailable without a reachability claim", () => {
    const result = successOf(baseInput());
    expect(result.value.branchFlows).toEqual({
      outputId: "branch flows",
      availability: "not_evaluated_fixed_branch_flow_is_input",
    });
    expect(result.value.workpoint).toEqual({
      outputId: "workpoint",
      availability: "not_available_single_branch_no_pump_curve_requested",
      reachabilityEvaluated: false,
    });
  });

  it("scales pressure linearly with L while preserving Re and fD", () => {
    const first = successOf(
      baseInput("straight_round_laminar_Darcy_64_over_Re"),
    );
    const doubled = successOf(
      changed((candidate) => {
        candidate.straightSegment.length.valueSi *= 2;
      }, "straight_round_laminar_Darcy_64_over_Re"),
    );
    expect(doubled.value.Re.valueSi).toBe(first.value.Re.valueSi);
    expect(doubled.value.frictionFactorDarcy.valueSi).toBe(
      first.value.frictionFactorDarcy.valueSi,
    );
    expect(doubled.value.pressureComponents.total.valueSi).toBe(
      2 * first.value.pressureComponents.total.valueSi,
    );
  });

  it("scales pressure with rho when rho and mu are scaled together at fixed Re", () => {
    const first = successOf(
      baseInput("straight_round_laminar_Darcy_64_over_Re"),
    );
    const scaled = successOf(
      changed((candidate) => {
        candidate.properties.rho.valueSi *= 2;
        candidate.properties.mu.valueSi *= 2;
      }, "straight_round_laminar_Darcy_64_over_Re"),
    );
    expect(scaled.value.Re.valueSi).toBe(first.value.Re.valueSi);
    expect(scaled.value.pressureComponents.total.valueSi).toBe(
      2 * first.value.pressureComponents.total.valueSi,
    );
  });

  it("returns immutable snapshots and deterministic results", () => {
    const input = baseInput();
    const first = successOf(input);
    const second = successOf(input);
    expect(first).toEqual(second);
    (input.properties.rho as { valueSi: number }).valueSi = 1;
    expect(first.evidence.properties.rho.valueSi).toBe(1_000);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.evidence)).toBe(true);
    expect(Object.isFrozen(first.evidence.properties.rho)).toBe(true);
  });
});

describe("H-05 applicability, component and network failure gates", () => {
  it.each([2_300, 9_999.999])(
    "fails closed in the deferred transition interval at Re=%s",
    (reynolds) => {
      const result = expectClosedFailure(
        changed((candidate) => setRe(candidate, reynolds)),
        "not_applicable",
        "H-05.transition_flow_not_applicable",
      );
      expect(result.warnings[0]?.predicate).toBe(
        H05_WARNING_PREDICATES.transitionFlow,
      );
    },
  );

  it.each([
    ["geometryClass", "helical_or_curved", "H-05.geometry_not_applicable"],
    ["geometryClass", "noncircular", "H-05.geometry_not_applicable"],
    ["phaseRegime", "two_phase_or_other", "H-05.phase_not_applicable"],
  ] as const)("rejects known unsupported %s=%s", (key, value, code) => {
    const result = expectClosedFailure(
      changed((candidate) => {
        candidate.applicability[key] = value;
        if (key === "phaseRegime") {
          candidate.properties.phaseClassification = value;
        }
      }),
      "not_applicable",
      code,
    );
    if (value === "helical_or_curved") {
      expect(result.warnings[0]?.predicate).toBe(
        H05_WARNING_PREDICATES.helicalFinal,
      );
    }
  });

  it("never silently converts a Fanning factor to Darcy", () => {
    const result = expectClosedFailure(
      changed((candidate) => {
        candidate.applicability.frictionFactorConvention = "Fanning";
      }),
      "not_applicable",
      "H-05.fanning_factor_not_applicable",
    );
    expect(result.warnings[0]?.predicate).toBe(
      H05_WARNING_PREDICATES.darcyFanningMix,
    );
  });

  it.each([
    ["straight_round_laminar_Darcy_64_over_Re", 100_000],
    ["straight_round_turbulent_Colebrook_1939", 1_000],
  ] as const)("rejects route/Re mismatch for %s", (route, reynolds) => {
    expectClosedFailure(
      changed((candidate) => setRe(candidate, reynolds), route),
      "not_applicable",
      "H-05.route_domain_not_applicable",
    );
  });

  it.each(["localLosses", "elevation"] as const)(
    "closes total pressure when %s is unknown instead of substituting zero",
    (key) => {
      const result = expectClosedFailure(
        changed((candidate) => setUnknownComponent(candidate, key)),
        "insufficient_data",
        key === "localLosses"
          ? "H-05.local_loss_component_unconfirmed"
          : "H-05.elevation_component_unconfirmed",
      );
      if (key === "localLosses") {
        expect(result.warnings[0]?.predicate).toBe(
          H05_WARNING_PREDICATES.roughnessOrLocalLossUnknown,
        );
      }
    },
  );

  it("requires actual roughness for Colebrook and never uses abs/default zero", () => {
    const unknown = expectClosedFailure(
      changed(setUnknownRoughness),
      "insufficient_data",
      "H-05.roughness_unconfirmed",
    );
    expect(unknown.warnings[0]?.predicate).toBe(
      H05_WARNING_PREDICATES.roughnessOrLocalLossUnknown,
    );

    expectClosedFailure(
      changed((candidate) => {
        candidate.roughness = baseInput(
          "straight_round_laminar_Darcy_64_over_Re",
        ).roughness;
      }),
      "insufficient_data",
      "H-05.roughness_required",
    );
  });

  it("requires a sourced laminar roughness disposition rather than unknown", () => {
    expectClosedFailure(
      changed(
        setUnknownRoughness,
        "straight_round_laminar_Darcy_64_over_Re",
      ),
      "insufficient_data",
      "H-05.roughness_unconfirmed",
    );
  });

  it.each([
    ["route", "unknown_or_unconfirmed", "H-05.route_unconfirmed"],
    ["geometryClass", "unknown_or_unconfirmed", "H-05.applicability_unconfirmed"],
    ["flowScope", "unknown_or_unconfirmed", "H-05.applicability_unconfirmed"],
    ["phaseRegime", "unknown_or_unconfirmed", "H-05.applicability_unconfirmed"],
    ["frictionFactorConvention", "unknown_or_unconfirmed", "H-05.applicability_unconfirmed"],
  ] as const)("fails closed for unknown %s", (key, value, code) => {
    expectClosedFailure(
      changed((candidate) => {
        if (key === "route") {
          candidate.route = value;
        } else {
          candidate.applicability[key] = value;
          if (key === "phaseRegime") {
            candidate.properties.phaseClassification = value;
          }
        }
      }),
      "insufficient_data",
      code,
    );
  });

  it("does not solve a parallel network or pump workpoint without adapters", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.networkScope = {
          kind: "parallel_network_or_pump_workpoint_requested",
          topologyAdapterStatus: "missing_or_unreleased",
          pumpCurveAdapterStatus: "missing_or_unreleased",
          reachabilityClaimed: false,
        };
        candidate.applicability.flowScope =
          "parallel_network_or_pump_workpoint";
      }),
      "insufficient_data",
      "H-05.network_adapter_unavailable",
    );
  });

  it("rejects a pump reachability claim without a replayable pump curve", () => {
    const result = expectClosedFailure(
      changed((candidate) => {
        candidate.networkScope = {
          kind: "parallel_network_or_pump_workpoint_requested",
          topologyAdapterStatus: "missing_or_unreleased",
          pumpCurveAdapterStatus: "missing_or_unreleased",
          reachabilityClaimed: true,
        };
        candidate.applicability.flowScope =
          "parallel_network_or_pump_workpoint";
      }),
      "not_applicable",
      "H-05.reachability_claim_not_applicable",
    );
    expect(result.warnings[0]?.predicate).toBe(
      H05_WARNING_PREDICATES.reachabilityWithoutPumpCurve,
    );
  });

  it.each([
    [
      false,
      "insufficient_data",
      "H-05.network_adapter_unavailable",
    ],
    [
      true,
      "not_applicable",
      "H-05.reachability_claim_not_applicable",
    ],
  ] as const)(
    "disposes a matched network request with reachabilityClaimed=%s before unused positive-subnormal Re arithmetic",
    (reachabilityClaimed, status, code) => {
      const result = expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = H05_BINARY64_MIN_NORMAL;
          candidate.flowGeometry.velocity.valueSi = 1;
          candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
          candidate.properties.mu.valueSi = 2;
          candidate.networkScope = {
            kind: "parallel_network_or_pump_workpoint_requested",
            topologyAdapterStatus: "missing_or_unreleased",
            pumpCurveAdapterStatus: "missing_or_unreleased",
            reachabilityClaimed,
          };
          candidate.applicability.flowScope =
            "parallel_network_or_pump_workpoint";
        }),
        status,
        code,
      );
      if (reachabilityClaimed) {
        expect(result.warnings[0]?.predicate).toBe(
          H05_WARNING_PREDICATES.reachabilityWithoutPumpCurve,
        );
      }
    },
  );

  it("rejects contradictory fixed-branch and network scope records", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.applicability.flowScope =
          "parallel_network_or_pump_workpoint";
      }),
      "invalid_input",
      "H-05.network_scope_mismatch",
    );
  });
});

describe("H-05 provenance and immutable-boundary gates", () => {
  it("rejects an impossible claimed A-02 result", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.a02ResultClaimed = true;
      }),
      "invalid_input",
      "H-05.a02_result_overclaim",
    );
  });

  it("requires the current H-03 model version", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.flowGeometry.sourceMethodVersion = "0.0.0";
      }),
      "insufficient_data",
      "H-05.upstream_h03_version_mismatch",
    );
  });

  it.each([
    ["caseSnapshotId", CASE_SNAPSHOT_B],
    ["fluidStateSnapshotId", `fluid_state:${"3".repeat(64)}`],
    ["coolantCircuitId", "coolant.circuit.other"],
    ["coolantNetworkId", "coolant.network.other"],
    ["branchId", "coolant.branch.other"],
    ["timeBasisId", "steady.window.other"],
  ] as const)("rejects cross-state property %s mismatch", (key, value) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties[key] = value;
      }),
      "invalid_input",
      "H-05.upstream_state_binding_mismatch",
    );
  });

  it.each([
    ["straightSegment", "H-05.geometry_evidence_binding_mismatch"],
    ["roughness", "H-05.roughness_evidence_binding_mismatch"],
    ["localLosses", "H-05.component_evidence_binding_mismatch"],
    ["elevation", "H-05.component_evidence_binding_mismatch"],
  ] as const)("rejects a cross-geometry %s record", (key, code) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate[key].geometrySnapshotId = GEOMETRY_SNAPSHOT_B;
      }),
      "invalid_input",
      code,
    );
  });

  it("rejects contradictory phase classifications", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.phaseClassification = "two_phase_or_other";
      }),
      "invalid_input",
      "H-05.phase_evidence_mismatch",
    );
  });

  it.each(["unknown", "generic_typical"] as const)(
    "rejects %s-quality rho/mu instead of defaulting water properties",
    (quality) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.dataQuality = quality;
        }),
        "insufficient_data",
        "H-05.property_tuple_provenance_insufficient",
      );
    },
  );

  it.each([
    ["flowGeometry", "H-05.flow_geometry_provenance_insufficient"],
    ["straightSegment", "H-05.straight_segment_provenance_insufficient"],
    ["roughness", "H-05.roughness_provenance_insufficient"],
    ["localLosses", "H-05.component_provenance_insufficient"],
    ["elevation", "H-05.component_provenance_insufficient"],
  ] as const)("rejects generic-typical %s provenance", (key, code) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate[key].dataQuality = "generic_typical";
      }),
      "insufficient_data",
      code,
    );
  });

  it.each([
    ["propertyTupleSnapshotId", "material:not-a-hash"],
    ["propertyProviderArtifactSha256", "not-a-hash"],
    ["caseSnapshotId", "case:not-a-hash"],
    ["fluidStateSnapshotId", "fluid_state:not-a-hash"],
  ] as const)("rejects malformed property provenance %s", (key, value) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties[key] = value;
      }),
      "invalid_input",
      "H-05.property_tuple_schema_invalid",
    );
  });
});

describe("H-05 explicit solver and binary64 failure-closed behavior", () => {
  it("rejects a non-sign-changing Colebrook bracket without a root payload", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.solver.lowerBoundFD = 0.2;
        candidate.solver.upperBoundFD = 0.3;
      }),
      "invalid_input",
      "H-05.solver_bracket_invalid",
    );
  });

  it("returns non_converged without a last midpoint", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.solver.residualTolerance = Number.MIN_VALUE * 2 ** 52;
        candidate.solver.bracketWidthTolerance = Number.MIN_VALUE * 2 ** 52;
        candidate.solver.maxIterations = 1;
      }),
      "non_converged",
      "H-05.solver_non_converged",
    );
  });

  it.each([
    ["lowerBoundFD", 0],
    ["upperBoundFD", Infinity],
    ["residualTolerance", 0],
    ["bracketWidthTolerance", Number.MIN_VALUE],
    ["maxIterations", 1.5],
  ] as const)("rejects invalid explicit solver setting %s", (key, value) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.solver[key] = value;
      }),
      "invalid_input",
      "H-05.solver_settings_schema_invalid",
    );
  });

  it("rejects stale bisection settings on the laminar route", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.solver = baseInput().solver;
      }, "straight_round_laminar_Darcy_64_over_Re"),
      "invalid_input",
      "H-05.solver_route_mismatch",
    );
  });

  it("requires explicit Colebrook settings and has no default", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.solver = {
          kind: "unknown_or_unconfirmed",
          lowerBoundFD: null,
          upperBoundFD: null,
          residualTolerance: null,
          bracketWidthTolerance: null,
          maxIterations: null,
        };
      }),
      "insufficient_data",
      "H-05.solver_settings_unconfirmed",
    );
  });

  it.each([NaN, Infinity, -1, 0, Number.MIN_VALUE])(
    "fails closed for invalid/subnormal rho=%s",
    (value) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = value;
        }),
        "invalid_input",
        value === Number.MIN_VALUE
          ? "H-05.property_tuple_value_invalid"
          : "H-05.property_tuple_value_invalid",
      );
    },
  );

  it("fails closed when a Re product overflows", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.valueSi = Number.MAX_VALUE;
        candidate.flowGeometry.velocity.valueSi = 2;
      }),
      "invalid_input",
      "H-05.numeric_overflow",
    );
  });

  it("fails closed when v squared underflows after a representable Re", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.route = "straight_round_laminar_Darcy_64_over_Re";
        candidate.properties.rho.valueSi = Number.MAX_VALUE;
        candidate.flowGeometry.velocity.valueSi = H05_BINARY64_MIN_NORMAL;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = 1;
        candidate.roughness = baseInput(
          "straight_round_laminar_Darcy_64_over_Re",
        ).roughness;
        candidate.solver = baseInput(
          "straight_round_laminar_Darcy_64_over_Re",
        ).solver;
      }),
      "invalid_input",
      "H-05.numeric_underflow",
    );
  });

  it("fails closed when the final pressure product overflows", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.straightSegment.length.valueSi = Number.MAX_VALUE;
      }, "straight_round_laminar_Darcy_64_over_Re"),
      "invalid_input",
      "H-05.numeric_overflow",
    );
  });

  it("detects both directed rho*v minimum-normal operand swallows", () => {
    const m = H05_BINARY64_MIN_NORMAL;
    const q = 1 - Number.EPSILON / 2;
    expect(m * q).toBe(m);
    for (const reverse of [false, true]) {
      expectClosedFailure(
        changed((candidate) => {
          candidate.route = "straight_round_laminar_Darcy_64_over_Re";
          candidate.properties.rho.valueSi = reverse ? q : m;
          candidate.flowGeometry.velocity.valueSi = reverse ? m : q;
          candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
          candidate.properties.mu.valueSi = m;
          candidate.roughness = baseInput(
            "straight_round_laminar_Darcy_64_over_Re",
          ).roughness;
          candidate.solver = baseInput(
            "straight_round_laminar_Darcy_64_over_Re",
          ).solver;
        }),
        "invalid_input",
        "H-05.numeric_term_swallowed",
      );
    }
  });

  it("detects a swallowed Colebrook logarithm-argument term", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.valueSi = 1e300;
        candidate.flowGeometry.velocity.valueSi = 1;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = 1;
        candidate.roughness.epsilon.valueSi = 0.01;
      }),
      "invalid_input",
      "H-05.numeric_term_swallowed",
    );
  });

  it("keeps exact unit factors legal", () => {
    const result = successOf(
      changed((candidate) => {
        candidate.properties.rho.valueSi = 1;
        candidate.flowGeometry.velocity.valueSi = 1_000;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = 1;
        candidate.straightSegment.length.valueSi = 1;
      }, "straight_round_laminar_Darcy_64_over_Re"),
    );
    expect(result.value.Re.valueSi).toBe(1_000);
  });
});

describe("H-05 hostile trust boundary and status priority", () => {
  it("rejects top-level and nested extra keys", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.hiddenDefault = 0;
      }),
      "invalid_input",
      "H-05.input_schema_invalid",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.hidden = 1;
      }),
      "invalid_input",
      "H-05.property_tuple_value_invalid",
    );
  });

  it("does not execute top-level or nested getters", () => {
    let reads = 0;
    const top = structuredClone(baseInput()) as Record<string, any>;
    Object.defineProperty(top, "route", {
      enumerable: true,
      get() {
        reads += 1;
        return "straight_round_turbulent_Colebrook_1939";
      },
    });
    expectClosedFailure(
      top,
      "invalid_input",
      "H-05.input_schema_invalid",
    );
    expect(reads).toBe(0);

    const nested = structuredClone(baseInput()) as Record<string, any>;
    Object.defineProperty(nested.properties.rho, "valueSi", {
      enumerable: true,
      get() {
        reads += 1;
        return 1_000;
      },
    });
    expectClosedFailure(
      nested,
      "invalid_input",
      "H-05.property_tuple_value_invalid",
    );
    expect(reads).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "swallows a hostile top-level Proxy %s trap",
    (trapName) => {
      const proxy = new Proxy(baseInput(), {
        [trapName]() {
          throw new Error("hostile trap");
        },
      });
      expectClosedFailure(
        proxy,
        "invalid_input",
        "H-05.input_schema_invalid",
      );
    },
  );

  it("rejects symbol and inherited keys", () => {
    const symbolCandidate = structuredClone(baseInput());
    Reflect.defineProperty(symbolCandidate, Symbol("hidden"), {
      value: 1,
      enumerable: true,
    });
    expectClosedFailure(
      symbolCandidate,
      "invalid_input",
      "H-05.input_schema_invalid",
    );

    const inherited = Object.create({ hidden: 1 });
    Object.assign(inherited, baseInput());
    expectClosedFailure(
      inherited,
      "invalid_input",
      "H-05.input_schema_invalid",
    );
  });

  it("lets a later malformed solver enum outrank an earlier unknown route", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.route = "unknown_or_unconfirmed";
        candidate.solver.kind = "mystery_solver";
      }),
      "invalid_input",
      "H-05.solver_settings_schema_invalid",
    );
  });

  it("lets malformed applicability outrank an earlier missing property tuple", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties = null;
        candidate.applicability.geometryClass = "mystery_geometry";
      }),
      "invalid_input",
      "H-05.applicability_schema_invalid",
    );
  });

  it("lets known transition flow outrank unrelated unknown roughness and components", () => {
    expectClosedFailure(
      changed((candidate) => {
        setRe(candidate, 5_000);
        setUnknownRoughness(candidate);
        setUnknownComponent(candidate, "localLosses");
      }),
      "not_applicable",
      "H-05.transition_flow_not_applicable",
    );
  });

  it.each([
    ["geometryClass", "helical_or_curved", "H-05.geometry_not_applicable"],
    ["geometryClass", "noncircular", "H-05.geometry_not_applicable"],
    ["frictionFactorConvention", "Fanning", "H-05.fanning_factor_not_applicable"],
  ] as const)(
    "lets known categorical %s=%s outrank unrelated Re overflow",
    (key, value, code) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.applicability[key] = value;
          candidate.properties.rho.valueSi = Number.MAX_VALUE;
          candidate.flowGeometry.velocity.valueSi = 2;
        }),
        "not_applicable",
        code,
      );
    },
  );

  it.each([
    ["unknown route", true],
    ["unknown geometry", false],
  ] as const)(
    "lets %s close before an intermediate positive-subnormal Re",
    (_name, unknownRoute) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = H05_BINARY64_MIN_NORMAL;
          candidate.flowGeometry.velocity.valueSi = 1;
          candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
          candidate.properties.mu.valueSi = 2;
          if (unknownRoute) {
            candidate.route = "unknown_or_unconfirmed";
          } else {
            candidate.applicability.geometryClass = "unknown_or_unconfirmed";
          }
        }, "straight_round_laminar_Darcy_64_over_Re"),
        "insufficient_data",
        unknownRoute
          ? "H-05.route_unconfirmed"
          : "H-05.applicability_unconfirmed",
      );
    },
  );

  it("rejects unknown roughness carrying a zero placeholder", () => {
    expectClosedFailure(
      changed((candidate) => {
        setUnknownRoughness(candidate);
        candidate.roughness.epsilon = quantity(0, "length", "m");
      }),
      "invalid_input",
      "H-05.roughness_schema_invalid",
    );
  });

  it("rejects numeric local K/elevation fields outside the frozen adapter schema", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.localLosses.sumK = 0;
      }),
      "invalid_input",
      "H-05.component_resolution_schema_invalid",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.elevation.deltaZ = 0;
      }),
      "invalid_input",
      "H-05.component_resolution_schema_invalid",
    );
  });
});
