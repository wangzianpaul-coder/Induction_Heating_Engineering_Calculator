import { describe, expect, it } from "vitest";
import * as publicApi from "../../../src/public-api.js";
import { methodId } from "../../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  H04_BINARY64_MIN_NORMAL,
  H04_CONTRACT_SOURCE_REFS,
  H04_CONTROLLED_SOURCE_GATES,
  H04_DERIVATION_REFS,
  H04_IMPLEMENTATION_READINESS,
  H04_INTERNAL_ROUTE_NAMES,
  H04_METHOD_CHECK_IDS,
  H04_METHOD_ID,
  H04_METHOD_MAPPING,
  H04_METHOD_VERSION,
  H04_NUMERIC_REPRESENTABILITY_POLICY,
  H04_SOURCE_REFS,
  H04_VALIDATION_CASE_IDS,
  H04_WARNING_PREDICATES,
  evaluateH04InternalFlowHeatTransfer,
  type H04InternalFlowHeatTransferFailure,
  type H04InternalFlowHeatTransferInput,
  type H04InternalFlowHeatTransferSuccess,
  type H04InternalRouteName,
} from "../../../src/methods/H/h04InternalFlowHeatTransfer.js";
import { H03_METHOD_VERSION } from "../../../src/methods/H/h03BranchFlowGeometry.js";

const CASE_SNAPSHOT_A = `case:${"a".repeat(64)}`;
const CASE_SNAPSHOT_B = `case:${"b".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"c".repeat(64)}`;
const PROPERTY_SNAPSHOT = `material:${"d".repeat(64)}`;
const FLUID_STATE_SNAPSHOT = `fluid_state:${"e".repeat(64)}`;
const RESULT_SNAPSHOT = `result:${"f".repeat(64)}`;
const PROVIDER_SHA256 = "1".repeat(64);

function quantity<
  TDimension extends string,
  TUnit extends string,
>(valueSi: number, dimensionId: TDimension, canonicalUnitId: TUnit) {
  return { valueSi, dimensionId, canonicalUnitId };
}

function baseInput(
  route: H04InternalRouteName =
    "straight_smooth_round_Gnielinski_1975",
): H04InternalFlowHeatTransferInput {
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
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
      coolantCircuitId: "coolant.circuit.001",
      branchId: "coolant.branch.001",
      timeBasisId: "steady.window.001",
      velocity: quantity(10, "velocity", "m_per_s"),
      hydraulicDiameter: quantity(0.01, "length", "m"),
    },
    properties: {
      kind: "explicit_upstream_property_tuple",
      a02ResultClaimed: false,
      propertyTupleSnapshotId: PROPERTY_SNAPSHOT,
      propertyProviderId: "controlled.property.provider",
      propertyProviderVersion: "1.0.0",
      propertyProviderArtifactSha256: PROVIDER_SHA256,
      sourceRef: "PROJECT-PROPERTY-TUPLE:001",
      dataQuality: "engineering_reference",
      provenanceId: "provenance.property.tuple.001",
      caseSnapshotId: CASE_SNAPSHOT_A,
      fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
      coolantCircuitId: "coolant.circuit.001",
      branchId: "coolant.branch.001",
      timeBasisId: "steady.window.001",
      temperature: quantity(300, "absolute_temperature", "K"),
      pressure: {
        ...quantity(200_000, "pressure", "Pa"),
        pressureBasis: "absolute",
      },
      phaseClassification: "single_phase_liquid",
      rho: quantity(1_000, "density", "kg_per_m3"),
      mu: quantity(0.001, "dynamic_viscosity", "Pa_s"),
      cp: quantity(4_200, "specific_heat_capacity", "J_per_kg_K"),
      kf: quantity(0.6, "thermal_conductivity", "W_per_m_K"),
    },
    applicability: {
      geometryClass: "straight_round_tube",
      surfaceClass: "smooth",
      hydrodynamicDevelopment: "fully_developed",
      thermalDevelopment: "fully_developed",
      phaseRegime: "single_phase_liquid",
      propertyVariation: "not_significant_at_declared_bulk_state",
      heatBoundaryCondition: "constant_wall_temperature",
      requestedInterpretation:
        "mean_internal_heat_transfer_coefficient_screening",
    },
  };
}

function changed(
  mutate: (value: Record<string, any>) => void,
  route?: H04InternalRouteName,
): unknown {
  const candidate = structuredClone(baseInput(route)) as Record<string, any>;
  mutate(candidate);
  return candidate;
}

function successOf(
  input: unknown,
): H04InternalFlowHeatTransferSuccess {
  const result = evaluateH04InternalFlowHeatTransfer(
    input as H04InternalFlowHeatTransferInput,
  );
  if (result.status !== "success") {
    throw new Error(
      `Expected H-04 success; got ${result.status}/${result.failure.code}`,
    );
  }
  return result;
}

function failureOf(
  input: unknown,
): H04InternalFlowHeatTransferFailure {
  const result = evaluateH04InternalFlowHeatTransfer(
    input as H04InternalFlowHeatTransferInput,
  );
  if (result.status === "success") {
    throw new Error("Expected H-04 failure; got success");
  }
  return result;
}

function expectClosedFailure(
  input: unknown,
  status: H04InternalFlowHeatTransferFailure["status"],
  code: H04InternalFlowHeatTransferFailure["failure"]["code"],
) {
  const result = failureOf(input);
  expect(result).toMatchObject({ status, failure: { code } });
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect("substitution" in result).toBe(false);
  expect("inputSnapshot" in result).toBe(false);
  expect(Number.isNaN((result as any).value)).toBe(false);
  return result;
}

function setDimensionlessState(
  candidate: Record<string, any>,
  reynolds: number,
  prandtl: number,
) {
  candidate.flowGeometry.velocity.valueSi = reynolds;
  candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
  candidate.properties.rho.valueSi = 1;
  candidate.properties.mu.valueSi = 1;
  candidate.properties.cp.valueSi = prandtl;
  candidate.properties.kf.valueSi = 1;
}

describe("H-04 frozen registry, source gates and isolation", () => {
  it("maps the exact frozen parent specification without inventing child IDs", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-04"));
    expect(H04_METHOD_ID).toBe("H-04");
    expect(H04_METHOD_VERSION).toBe(specification.methodVersion);
    expect(H04_METHOD_MAPPING.methodId).toBe(specification.methodId);
    expect(H04_METHOD_MAPPING.approvalStatus).toBe(
      "approved_with_limitation",
    );
    expect(H04_METHOD_MAPPING.methodType).toBe("engineering_correlation");
    expect(H04_METHOD_MAPPING.requiresSubmethodSplit).toBe(true);
    expect(H04_METHOD_MAPPING.submethodSplitBasis).toBe(
      specification.submethodSplitBasis,
    );
    expect(H04_SOURCE_REFS).toEqual(specification.sourceRefs);
    expect(H04_CONTRACT_SOURCE_REFS).toEqual(
      specification.contractSourceRefs,
    );
    expect(H04_DERIVATION_REFS).toEqual(["ID-HYD-01"]);
    expect(H04_VALIDATION_CASE_IDS).toEqual(["EXP-COOL-001"]);
    expect(H04_METHOD_CHECK_IDS).toEqual(["COOL-GNIELINSKI-001"]);
    expect(H04_VALIDATION_CASE_IDS).not.toContain("COOL-HT-001");
    expect(H04_METHOD_CHECK_IDS).not.toContain("COOL-HT-001");
    expect(H04_INTERNAL_ROUTE_NAMES.every((name) => !/^[A-J]-\d{2}$/u.test(name))).toBe(true);
    expect(H04_IMPLEMENTATION_READINESS.registeredChildMethodIds).toEqual([]);
    expect(H04_IMPLEMENTATION_READINESS.internalRouteNamesAreMethodIds).toBe(
      false,
    );
  });

  it("records all three missing primary copies as null-hash visual gates", () => {
    expect(H04_CONTROLLED_SOURCE_GATES).toHaveLength(3);
    expect(H04_CONTROLLED_SOURCE_GATES.map((gate) => gate.sourceRef)).toEqual(
      H04_SOURCE_REFS,
    );
    for (const gate of H04_CONTROLLED_SOURCE_GATES) {
      expect(gate.localCopySha256).toBeNull();
      expect(gate.manifestStatus).toBe("missing_from_source_manifest");
      expect(gate.visualPageReviewStatus).toBe(
        "blocked_local_copy_missing",
      );
    }
    expect(H04_IMPLEMENTATION_READINESS.runtimeActivation).toBe("blocked");
    expect(H04_IMPLEMENTATION_READINESS.openMethodGates).toContain(
      "A02_executable_property_provider_missing",
    );
    expect(H04_IMPLEMENTATION_READINESS.openMethodGates).toContain(
      "COOL_HT_001_prose_regression_differs_from_frozen_log10_formula",
    );
  });

  it("keeps H-04 absent from the public API and runtime registry", () => {
    expect("evaluateH04InternalFlowHeatTransfer" in publicApi).toBe(false);
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-04"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(specification.requiresSubmethodSplit).toBe(true);
  });

  it("publishes only machine representability policy, never an engineering tolerance", () => {
    expect(H04_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(H04_NUMERIC_REPRESENTABILITY_POLICY).toMatchObject({
      engineeringTolerance: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      overflowPolicy: "fail_closed",
      swallowedTermPolicy: "fail_closed",
      coreRounding: "none",
    });
  });

  it("maps warning predicates exactly to the frozen contract prose", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-04"));
    expect(Object.values(H04_WARNING_PREDICATES)).toEqual(
      specification.warningPredicates,
    );
    expect(specification.warningIds).toEqual([]);
  });
});

describe("H-04 frozen equations and dimensional identities", () => {
  it("returns the frozen fully developed CWT constant", () => {
    const result = successOf(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 7);
        candidate.applicability.heatBoundaryCondition =
          "constant_wall_temperature";
      }, "fully_developed_straight_round_laminar_CWT"),
    );
    expect(result.value.Re.valueSi).toBe(1_000);
    expect(result.value.Pr.valueSi).toBe(7);
    expect(result.value.Nu.valueSi).toBe(3.656);
    expect(result.value.h.valueSi).toBe(3.656);
    expect(result.value.gnielinskiFrictionFactor.availability).toBe(
      "not_applicable_to_selected_laminar_route",
    );
  });

  it("returns the frozen fully developed CWF constant", () => {
    const result = successOf(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 7);
        candidate.applicability.heatBoundaryCondition =
          "constant_wall_heat_flux";
      }, "fully_developed_straight_round_laminar_CWF"),
    );
    expect(result.value.Nu.valueSi).toBe(4.364);
    expect(result.value.h.valueSi).toBe(4.364);
  });

  it("uses the frozen 1.82 log10 Gnielinski expression without calibrating to the prose regression", () => {
    const result = successOf(baseInput());
    const expectedPr = (4_200 * 0.001) / 0.6;
    const expectedF = (1.82 * Math.log10(100_000) - 1.64) ** -2;
    const expectedNu =
      ((expectedF / 8) * (100_000 - 1_000) * expectedPr) /
      (1 +
        12.7 *
          Math.sqrt(expectedF / 8) *
          (expectedPr ** (2 / 3) - 1));
    expect(result.value.Re.valueSi).toBe(100_000);
    expect(result.value.Pr.valueSi).toBe(expectedPr);
    expect(result.value.gnielinskiFrictionFactor).toEqual({
      availability: "available",
      valueSi: expectedF,
      canonicalUnitId: "one",
    });
    expect(result.value.Nu.valueSi).toBe(expectedNu);
    expect(result.value.h.valueSi).toBe((expectedNu * 0.6) / 0.01);
    expect(result.validationCaseIds).toEqual(["EXP-COOL-001"]);
    expect(result.methodCheckIds).toEqual(["COOL-GNIELINSKI-001"]);
  });

  it("reproduces Re=rho*v*Dh/mu and Pr=cp*mu/kf in canonical SI", () => {
    const result = successOf(
      changed((candidate) => {
        candidate.properties.rho.valueSi = 997;
        candidate.flowGeometry.velocity.valueSi = 2.5;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 0.02;
        candidate.properties.mu.valueSi = 0.001;
        candidate.properties.cp.valueSi = 4_180;
        candidate.properties.kf.valueSi = 0.6;
      }),
    );
    expect(result.value.Re.valueSi).toBe((997 * 2.5 * 0.02) / 0.001);
    expect(result.value.Pr.valueSi).toBe((4_180 * 0.001) / 0.6);
  });

  it("preserves Re and Pr under a coherent rho/mu/kf scale while h follows kf", () => {
    const baseline = successOf(baseInput());
    const scaled = successOf(
      changed((candidate) => {
        candidate.properties.rho.valueSi *= 2;
        candidate.properties.mu.valueSi *= 2;
        candidate.properties.kf.valueSi *= 2;
      }),
    );
    expect(scaled.value.Re.valueSi).toBe(baseline.value.Re.valueSi);
    expect(scaled.value.Pr.valueSi).toBe(baseline.value.Pr.valueSi);
    expect(scaled.value.Nu.valueSi).toBe(baseline.value.Nu.valueSi);
    expect(scaled.value.h.valueSi).toBe(2 * baseline.value.h.valueSi);
  });

  it("preserves all outputs when rho and velocity are inversely scaled", () => {
    const baseline = successOf(baseInput());
    const scaled = successOf(
      changed((candidate) => {
        candidate.properties.rho.valueSi *= 0.5;
        candidate.flowGeometry.velocity.valueSi *= 2;
      }),
    );
    expect(scaled.value).toEqual(baseline.value);
  });

  it("returns trace, SI units, provenance and the mean-screening interpretation", () => {
    const result = successOf(baseInput());
    expect(result.value.h).toMatchObject({
      dimensionId: "heat_transfer_coefficient",
      canonicalUnitId: "W_per_m2_K",
      interpretation:
        "mean_internal_heat_transfer_coefficient_screening_not_hotspot_safety",
    });
    expect(result.inputSnapshot).toEqual({
      caseSnapshotId: CASE_SNAPSHOT_A,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
      propertyTupleSnapshotId: PROPERTY_SNAPSHOT,
      sourceResultSnapshotId: RESULT_SNAPSHOT,
      coolantCircuitId: "coolant.circuit.001",
      branchId: "coolant.branch.001",
      timeBasisId: "steady.window.001",
    });
    expect(result.evidence.properties.a02ResultClaimed).toBe(false);
    expect(result.internalRoute.registrationStatus).toBe(
      "internal_route_not_registered_child_method",
    );
    expect(result.solverResiduals.solverUsed).toBe(false);
    expect(result.engineeringPrecision.coreRounding).toBe("none");
  });
});

describe("H-04 strict correlation domains", () => {
  it("accepts the last manufactured laminar point below Re=2300", () => {
    const result = successOf(
      changed((candidate) => {
        setDimensionlessState(candidate, 2_299, 7);
      }, "fully_developed_straight_round_laminar_CWT"),
    );
    expect(result.value.Re.valueSi).toBe(2_299);
  });

  it.each([2_300, 5_000, 9_999])(
    "fails closed in the deferred transition interval at Re=%s",
    (reynolds) => {
      const result = expectClosedFailure(
        changed((candidate) => {
          setDimensionlessState(candidate, reynolds, 7);
        }),
        "not_applicable",
        "H-04.transition_flow_not_applicable",
      );
      expect(result.warnings[0]?.predicate).toBe(
        "transition-flow interpolation",
      );
    },
  );

  it.each([10_000, 5_000_000])(
    "accepts the inclusive Gnielinski Reynolds boundary Re=%s",
    (reynolds) => {
      const result = successOf(
        changed((candidate) => {
          setDimensionlessState(candidate, reynolds, 7);
        }),
      );
      expect(result.value.Re.valueSi).toBe(reynolds);
    },
  );

  it.each([9_999.5, 5_000_001])(
    "rejects Gnielinski outside its Reynolds domain at Re=%s",
    (reynolds) => {
      const expectedCode =
        reynolds < 10_000
          ? "H-04.transition_flow_not_applicable"
          : "H-04.route_domain_not_applicable";
      expectClosedFailure(
        changed((candidate) => {
          setDimensionlessState(candidate, reynolds, 7);
        }),
        "not_applicable",
        expectedCode,
      );
    },
  );

  it.each([0.5, 2_000])(
    "accepts the inclusive Gnielinski Prandtl boundary Pr=%s",
    (prandtl) => {
      const result = successOf(
        changed((candidate) => {
          setDimensionlessState(candidate, 100_000, prandtl);
        }),
      );
      expect(result.value.Pr.valueSi).toBe(prandtl);
    },
  );

  it.each([0.499, 2_001])(
    "rejects Gnielinski outside its Prandtl domain at Pr=%s",
    (prandtl) => {
      expectClosedFailure(
        changed((candidate) => {
          setDimensionlessState(candidate, 100_000, prandtl);
        }),
        "not_applicable",
        "H-04.route_domain_not_applicable",
      );
    },
  );

  it("does not use a turbulent route for a laminar Reynolds number", () => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 7);
      }),
      "not_applicable",
      "H-04.route_domain_not_applicable",
    );
  });

  it("does not use a laminar route at a turbulent Reynolds number", () => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 100_000, 7);
      }, "fully_developed_straight_round_laminar_CWT"),
      "not_applicable",
      "H-04.route_domain_not_applicable",
    );
  });

  it.each([
    [
      "fully_developed_straight_round_laminar_CWT",
      "constant_wall_heat_flux",
    ],
    [
      "fully_developed_straight_round_laminar_CWF",
      "constant_wall_temperature",
    ],
  ] as const)("rejects the %s heat-boundary mismatch", (route, boundary) => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 7);
        candidate.applicability.heatBoundaryCondition = boundary;
      }, route),
      "not_applicable",
      "H-04.heat_boundary_route_mismatch",
    );
  });
});

describe("H-04 deferred geometry, state and safety gates", () => {
  it.each([
    ["geometryClass", "helical_or_curved", "H-04.geometry_not_applicable"],
    ["geometryClass", "noncircular", "H-04.geometry_not_applicable"],
    ["surfaceClass", "rough_or_other", "H-04.surface_not_applicable"],
    [
      "hydrodynamicDevelopment",
      "entrance_or_developing",
      "H-04.development_not_applicable",
    ],
    [
      "thermalDevelopment",
      "entrance_or_developing",
      "H-04.development_not_applicable",
    ],
    ["phaseRegime", "two_phase_or_other", "H-04.phase_not_applicable"],
    [
      "propertyVariation",
      "significant",
      "H-04.property_variation_not_applicable",
    ],
    [
      "heatBoundaryCondition",
      "other_known",
      "H-04.heat_boundary_not_applicable",
    ],
  ] as const)("fails closed for known unsupported %s=%s", (key, value, code) => {
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
    expect(result.warnings[0]?.predicate).toBe(
      H04_WARNING_PREDICATES.straightTubeMisapplication,
    );
  });

  it("refuses to label a mean coefficient as local hotspot safety", () => {
    const result = expectClosedFailure(
      changed((candidate) => {
        candidate.applicability.requestedInterpretation =
          "local_hotspot_or_safety_claim";
      }),
      "not_applicable",
      "H-04.hotspot_safety_not_applicable",
    );
    expect(result.warnings[0]?.predicate).toBe(
      "mean h is labelled hotspot safety",
    );
  });

  it.each([
    "geometryClass",
    "surfaceClass",
    "hydrodynamicDevelopment",
    "thermalDevelopment",
    "phaseRegime",
    "propertyVariation",
    "heatBoundaryCondition",
    "requestedInterpretation",
  ] as const)("requires explicit %s evidence", (key) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.applicability[key] = "unknown_or_unconfirmed";
        if (key === "phaseRegime") {
          candidate.properties.phaseClassification =
            "unknown_or_unconfirmed";
        }
      }),
      "insufficient_data",
      "H-04.applicability_unconfirmed",
    );
  });

  it("requires an explicit route", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.route = "unknown_or_unconfirmed";
      }),
      "insufficient_data",
      "H-04.route_unconfirmed",
    );
  });

  it.each(["unknown", "generic_typical"])(
    "rejects %s property data rather than supplying default water values",
    (dataQuality) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.dataQuality = dataQuality;
        }),
        "insufficient_data",
        "H-04.property_tuple_provenance_insufficient",
      );
    },
  );

  it.each(["unknown", "generic_typical"])(
    "does not publish %s-quality flow geometry as an H-03 success adapter",
    (dataQuality) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.flowGeometry.dataQuality = dataQuality;
        }),
        "insufficient_data",
        "H-04.flow_geometry_provenance_insufficient",
      );
    },
  );
});

describe("H-04 upstream snapshot and provenance boundary", () => {
  it.each([
    ["caseSnapshotId", CASE_SNAPSHOT_B],
    ["fluidStateSnapshotId", `fluid_state:${"2".repeat(64)}`],
    ["coolantCircuitId", "coolant.circuit.other"],
    ["branchId", "coolant.branch.other"],
    ["timeBasisId", "steady.window.other"],
  ] as const)("rejects a cross-evidence %s mismatch", (key, value) => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties[key] = value;
      }),
      "invalid_input",
      "H-04.upstream_state_binding_mismatch",
    );
  });

  it("rejects contradictory property/applicability phase evidence", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.phaseClassification = "two_phase_or_other";
      }),
      "invalid_input",
      "H-04.phase_evidence_mismatch",
    );
  });

  it("does not pretend that an explicit tuple is an executed A-02 result", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.a02ResultClaimed = true;
      }),
      "invalid_input",
      "H-04.a02_result_overclaim",
    );
  });

  it("requires the current H-03 result version", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.flowGeometry.sourceMethodVersion = "old.model.version";
      }),
      "insufficient_data",
      "H-04.upstream_h03_version_mismatch",
    );
  });

  it("rejects gauge pressure even when its numeric value is positive", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.pressure.pressureBasis = "gauge";
      }),
      "invalid_input",
      "H-04.property_tuple_value_invalid",
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
      "H-04.property_tuple_schema_invalid",
    );
  });

  it("returns immutable evidence snapshots independent of later input mutation", () => {
    const input = baseInput();
    const result = successOf(input);
    (input.properties.rho as { valueSi: number }).valueSi = 1;
    expect(result.evidence.properties.rho.valueSi).toBe(1_000);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.properties.rho)).toBe(true);
  });
});

describe("H-04 binary64 failure-closed arithmetic", () => {
  it.each([NaN, Infinity, -1, 0])(
    "rejects hostile/non-positive rho=%s",
    (value) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = value;
        }),
        "invalid_input",
        "H-04.property_tuple_value_invalid",
      );
    },
  );

  it.each([NaN, Infinity, -1, 0])(
    "rejects hostile/non-positive velocity=%s",
    (value) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.flowGeometry.velocity.valueSi = value;
        }),
        "invalid_input",
        "H-04.flow_geometry_value_invalid",
      );
    },
  );

  it("fails closed when the Re product overflows", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.valueSi = Number.MAX_VALUE;
        candidate.flowGeometry.velocity.valueSi = 2;
      }),
      "invalid_input",
      "H-04.numeric_overflow",
    );
  });

  it.each([
    ["rho", "properties", "rho"],
    ["velocity", "flowGeometry", "velocity"],
  ] as const)(
    "classifies a positive subnormal %s at the machine-representability gate",
    (_name, owner, quantityName) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate[owner][quantityName].valueSi = Number.MIN_VALUE;
        }),
        "invalid_input",
        "H-04.numeric_underflow",
      );
    },
  );

  it("fails closed when the represented Re division is subnormal", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.valueSi = H04_BINARY64_MIN_NORMAL;
        candidate.flowGeometry.velocity.valueSi = 1;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = 2;
        candidate.properties.cp.valueSi = 14;
        candidate.properties.kf.valueSi = 2;
      }, "fully_developed_straight_round_laminar_CWT"),
      "invalid_input",
      "H-04.numeric_underflow",
    );
  });

  it("fails closed when the represented Pr division is subnormal", () => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 7);
        candidate.properties.cp.valueSi = H04_BINARY64_MIN_NORMAL;
        candidate.properties.mu.valueSi = 1;
        candidate.properties.kf.valueSi = 2;
      }, "fully_developed_straight_round_laminar_CWT"),
      "invalid_input",
      "H-04.numeric_underflow",
    );
  });

  it("fails closed when h underflows after otherwise representable Re/Pr", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.valueSi = H04_BINARY64_MIN_NORMAL;
        candidate.flowGeometry.velocity.valueSi = 1;
        candidate.flowGeometry.hydraulicDiameter.valueSi = Number.MAX_VALUE;
        candidate.properties.mu.valueSi = 0.004;
        candidate.properties.kf.valueSi = H04_BINARY64_MIN_NORMAL;
        candidate.properties.cp.valueSi =
          (7 * H04_BINARY64_MIN_NORMAL) / 0.004;
      }, "fully_developed_straight_round_laminar_CWT"),
      "invalid_input",
      "H-04.numeric_underflow",
    );
  });

  it("detects a swallowed Gnielinski denominator correction", () => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 5_000_000, 1 + Number.EPSILON);
      }),
      "invalid_input",
      "H-04.numeric_term_swallowed",
    );
  });

  it("detects all four directed minimum-normal product operand swallows", () => {
    const m = H04_BINARY64_MIN_NORMAL;
    const q = 1 - Number.EPSILON / 2;
    expect(q).not.toBe(1);
    expect(m * q).toBe(m);
    expect(q * m).toBe(m);

    const attacks = [
      changed((candidate) => {
        candidate.properties.rho.valueSi = m;
        candidate.flowGeometry.velocity.valueSi = q;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = m;
        candidate.properties.cp.valueSi = 1;
        candidate.properties.kf.valueSi = m;
      }, "fully_developed_straight_round_laminar_CWT"),
      changed((candidate) => {
        candidate.properties.rho.valueSi = q;
        candidate.flowGeometry.velocity.valueSi = m;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = m;
        candidate.properties.cp.valueSi = 1;
        candidate.properties.kf.valueSi = m;
      }, "fully_developed_straight_round_laminar_CWT"),
      changed((candidate) => {
        candidate.properties.rho.valueSi = m;
        candidate.flowGeometry.velocity.valueSi = 1;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1_000;
        candidate.properties.mu.valueSi = m;
        candidate.properties.cp.valueSi = q;
        candidate.properties.kf.valueSi = m;
      }, "fully_developed_straight_round_laminar_CWT"),
      changed((candidate) => {
        candidate.properties.rho.valueSi = 1_000;
        candidate.flowGeometry.velocity.valueSi = q;
        candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
        candidate.properties.mu.valueSi = q;
        candidate.properties.cp.valueSi = m;
        candidate.properties.kf.valueSi = m;
      }, "fully_developed_straight_round_laminar_CWT"),
    ];

    for (const attack of attacks) {
      expectClosedFailure(
        attack,
        "invalid_input",
        "H-04.numeric_term_swallowed",
      );
    }
  });

  it("keeps exact unit multiplication and division factors legal", () => {
    const result = successOf(
      changed((candidate) => {
        setDimensionlessState(candidate, 1_000, 1);
      }, "fully_developed_straight_round_laminar_CWT"),
    );
    expect(result.value.Re.valueSi).toBe(1_000);
    expect(result.value.Pr.valueSi).toBe(1);
    expect(result.value.Nu.valueSi).toBe(3.656);
  });
});

describe("H-04 hostile trust boundary and status priority", () => {
  it("rejects a top-level extra key", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.hiddenDefault = 4180;
      }),
      "invalid_input",
      "H-04.input_schema_invalid",
    );
  });

  it("rejects a nested extra key", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties.rho.hidden = 1;
      }),
      "invalid_input",
      "H-04.property_tuple_value_invalid",
    );
  });

  it("does not execute a top-level getter", () => {
    let reads = 0;
    const candidate = structuredClone(baseInput()) as Record<string, any>;
    Object.defineProperty(candidate, "route", {
      enumerable: true,
      get() {
        reads += 1;
        return "straight_smooth_round_Gnielinski_1975";
      },
    });
    expectClosedFailure(
      candidate,
      "invalid_input",
      "H-04.input_schema_invalid",
    );
    expect(reads).toBe(0);
  });

  it("does not execute a nested getter", () => {
    let reads = 0;
    const candidate = structuredClone(baseInput()) as Record<string, any>;
    Object.defineProperty(candidate.properties.rho, "valueSi", {
      enumerable: true,
      get() {
        reads += 1;
        return 1_000;
      },
    });
    expectClosedFailure(
      candidate,
      "invalid_input",
      "H-04.property_tuple_value_invalid",
    );
    expect(reads).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "swallows a hostile top-level Proxy %s trap",
    (trapName) => {
      const target = baseInput();
      const proxy = new Proxy(target, {
        [trapName]() {
          throw new Error("hostile trap");
        },
      });
      expectClosedFailure(
        proxy,
        "invalid_input",
        "H-04.input_schema_invalid",
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
      "H-04.input_schema_invalid",
    );

    const inheritedCandidate = Object.create({ hidden: 1 });
    Object.assign(inheritedCandidate, baseInput());
    expectClosedFailure(
      inheritedCandidate,
      "invalid_input",
      "H-04.input_schema_invalid",
    );
  });

  it("lets a later malformed applicability enum outrank an earlier unknown route", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.route = "unknown_or_unconfirmed";
        candidate.applicability.phaseRegime = "mystery_phase";
      }),
      "invalid_input",
      "H-04.applicability_schema_invalid",
    );
  });

  it("lets later malformed applicability outrank an earlier missing property tuple", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.properties = null;
        candidate.applicability.geometryClass = "mystery_geometry";
      }),
      "invalid_input",
      "H-04.applicability_schema_invalid",
    );
  });

  it("lets known helical geometry outrank an unknown phase", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.applicability.geometryClass = "helical_or_curved";
        candidate.applicability.phaseRegime = "unknown_or_unconfirmed";
        candidate.properties.phaseClassification = "unknown_or_unconfirmed";
      }),
      "not_applicable",
      "H-04.geometry_not_applicable",
    );
  });

  it.each([
    ["geometryClass", "helical_or_curved", "H-04.geometry_not_applicable"],
    ["geometryClass", "noncircular", "H-04.geometry_not_applicable"],
    [
      "hydrodynamicDevelopment",
      "entrance_or_developing",
      "H-04.development_not_applicable",
    ],
    ["phaseRegime", "two_phase_or_other", "H-04.phase_not_applicable"],
    [
      "propertyVariation",
      "significant",
      "H-04.property_variation_not_applicable",
    ],
    [
      "heatBoundaryCondition",
      "other_known",
      "H-04.heat_boundary_not_applicable",
    ],
    [
      "requestedInterpretation",
      "local_hotspot_or_safety_claim",
      "H-04.hotspot_safety_not_applicable",
    ],
  ] as const)(
    "lets known unsupported %s=%s outrank unrelated unknown and subnormal arithmetic",
    (key, value, code) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.applicability[key] = value;
          candidate.applicability.surfaceClass = "unknown_or_unconfirmed";
          candidate.properties.rho.valueSi = Number.MIN_VALUE;
          if (key === "phaseRegime") {
            candidate.properties.phaseClassification = value;
          }
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
    "returns insufficient data for %s before unreliable subnormal arithmetic",
    (_name, unknownRoute) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = Number.MIN_VALUE;
          if (unknownRoute) {
            candidate.route = "unknown_or_unconfirmed";
          } else {
            candidate.applicability.geometryClass = "unknown_or_unconfirmed";
          }
        }),
        "insufficient_data",
        unknownRoute
          ? "H-04.route_unconfirmed"
          : "H-04.applicability_unconfirmed",
      );
    },
  );

  it.each([
    ["unknown route", true],
    ["unknown geometry", false],
  ] as const)(
    "returns insufficient data for %s before an intermediate positive-subnormal Re",
    (_name, unknownRoute) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.properties.rho.valueSi = H04_BINARY64_MIN_NORMAL;
          candidate.flowGeometry.velocity.valueSi = 1;
          candidate.flowGeometry.hydraulicDiameter.valueSi = 1;
          candidate.properties.mu.valueSi = 2;
          candidate.properties.cp.valueSi = 1;
          candidate.properties.kf.valueSi = 2;
          if (unknownRoute) {
            candidate.route = "unknown_or_unconfirmed";
          } else {
            candidate.applicability.geometryClass = "unknown_or_unconfirmed";
          }
        }, "fully_developed_straight_round_laminar_CWT"),
        "insufficient_data",
        unknownRoute
          ? "H-04.route_unconfirmed"
          : "H-04.applicability_unconfirmed",
      );
    },
  );

  it("lets a known laminar heat-boundary mismatch outrank unrelated unknown and subnormal arithmetic", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.applicability.heatBoundaryCondition =
          "constant_wall_heat_flux";
        candidate.applicability.surfaceClass = "unknown_or_unconfirmed";
        candidate.properties.rho.valueSi = Number.MIN_VALUE;
      }, "fully_developed_straight_round_laminar_CWT"),
      "not_applicable",
      "H-04.heat_boundary_route_mismatch",
    );
  });

  it("lets the known transition interval outrank unknown geometry", () => {
    expectClosedFailure(
      changed((candidate) => {
        setDimensionlessState(candidate, 5_000, 7);
        candidate.applicability.geometryClass = "unknown_or_unconfirmed";
      }),
      "not_applicable",
      "H-04.transition_flow_not_applicable",
    );
  });

  it.each([
    ["fully_developed_straight_round_laminar_CWT", 100_000, 7],
    ["straight_smooth_round_Gnielinski_1975", 1_000, 7],
  ] as const)(
    "lets the known %s numeric route-domain failure outrank unrelated unknown state",
    (route, reynolds, prandtl) => {
      expectClosedFailure(
        changed((candidate) => {
          setDimensionlessState(candidate, reynolds, prandtl);
          candidate.applicability.surfaceClass = "unknown_or_unconfirmed";
        }, route),
        "not_applicable",
        "H-04.route_domain_not_applicable",
      );
    },
  );

  it("is deterministic and never mutates the controlled input", () => {
    const input = baseInput();
    const before = structuredClone(input);
    const first = evaluateH04InternalFlowHeatTransfer(input);
    const second = evaluateH04InternalFlowHeatTransfer(input);
    expect(first).toEqual(second);
    expect(input).toEqual(before);
  });
});
