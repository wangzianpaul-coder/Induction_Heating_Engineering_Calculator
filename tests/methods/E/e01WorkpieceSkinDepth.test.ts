import { describe, expect, it } from "vitest";

import {
  E01_BINARY64_MIN_NORMAL,
  E01_GEOMETRY_SCALE_WARNING_POLICY,
  E01_NUMERIC_REPRESENTABILITY_POLICY,
  E01_VACUUM_PERMEABILITY_H_PER_M,
  E01_WARNING_PREDICATES,
  E01_WORKPIECE_SKIN_DEPTH_MAPPING,
  evaluateE01WorkpieceSkinDepth,
  type E01ApplicabilityEvidence,
  type E01CharacteristicGeometryEvidence,
  type E01PropertySnapshot,
  type E01WorkpieceSkinDepthInput,
} from "../../../src/methods/E/e01WorkpieceSkinDepth.js";
import { toCanonicalSI } from "../../../src/units/conversion.js";

const MATERIAL_SNAPSHOT_ID = `material:${"a".repeat(64)}`;
const GEOMETRY_SNAPSHOT_ID = `geometry:${"c".repeat(64)}`;

const resistivitySnapshot = Object.freeze({
  propertyId: "electrical_resistivity",
  valueSi: 1e-6,
  dimensionId: "electrical_resistivity",
  canonicalUnitId: "ohm_m",
  materialId: "synthetic-workpiece-grade",
  materialRevision: "material-rev-1",
  propertyRevision: "rho-rev-1",
  materialStateId: "state-1000K-5000Apm-20kHz",
  temperatureK: 1_000,
  fieldStrengthApm: 5_000,
  frequencyHz: 20_000,
  phaseOrMicrostructureId: "single-phase-controlled-state",
  sourceRef: "synthetic-property-fixture-rho",
  sourceSnapshotId: MATERIAL_SNAPSHOT_ID,
  dataQuality: "project_specific",
  stateMatch: "confirmed_for_declared_state",
} as const satisfies E01PropertySnapshot);

const permeabilitySnapshot = Object.freeze({
  propertyId: "relative_permeability",
  valueSi: 100,
  dimensionId: "dimensionless",
  canonicalUnitId: "one",
  materialId: "synthetic-workpiece-grade",
  materialRevision: "material-rev-1",
  propertyRevision: "mu-rev-1",
  materialStateId: "state-1000K-5000Apm-20kHz",
  temperatureK: 1_000,
  fieldStrengthApm: 5_000,
  frequencyHz: 20_000,
  phaseOrMicrostructureId: "single-phase-controlled-state",
  sourceRef: "synthetic-property-fixture-mu",
  sourceSnapshotId: MATERIAL_SNAPSHOT_ID,
  dataQuality: "project_specific",
  stateMatch: "confirmed_for_declared_state",
} as const satisfies E01PropertySnapshot);

const geometry = Object.freeze({
  characteristicThicknessM: 0.01,
  thicknessStatus: "available",
  characteristicRadiusM: 0.05,
  radiusStatus: "available",
  geometryMappingStatus: "confirmed_to_workpiece_geometry",
  geometrySourceRef: "synthetic-geometry-fixture",
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
} as const satisfies E01CharacteristicGeometryEvidence);

const applicability = Object.freeze({
  materialClass: "ferromagnetic",
  materialHomogeneity: "homogeneous",
  materialIsotropy: "isotropic",
  constitutiveRegime: "linear_effective_good_conductor",
  excitation: "sinusoidal_steady_state",
  displacementCurrentRegime: "negligible",
  fieldGeometry: "locally_planar_semi_infinite_reference",
  curieState: "outside_transition_and_unsaturated",
  intendedInterpretation: "electromagnetic_amplitude_reference_depth",
} as const satisfies E01ApplicabilityEvidence);

function input(
  overrides: Partial<E01WorkpieceSkinDepthInput> = {},
): E01WorkpieceSkinDepthInput {
  return {
    frequencyHz: 20_000,
    resistivitySnapshot,
    relativePermeabilitySnapshot: permeabilitySnapshot,
    characteristicGeometry: geometry,
    applicability,
    ...overrides,
  };
}

function successful(candidate: E01WorkpieceSkinDepthInput) {
  const result = evaluateE01WorkpieceSkinDepth(candidate);
  expect(result.status).toMatch(/^success/);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(
      "failure" in result && result.failure !== undefined
        ? result.failure.message
        : `unexpected E-01 status: ${result.status}`,
    );
  }
  return result;
}

function deltaOf(candidate: E01WorkpieceSkinDepthInput): number {
  return successful(candidate).value.deltaW.valueSi;
}

describe("E-01 workpiece electromagnetic reference skin depth", () => {
  it("remains isolated from the runtime public API", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateE01WorkpieceSkinDepth" in publicApi).toBe(false);
    expect("E01_WORKPIECE_SKIN_DEPTH_MAPPING" in publicApi).toBe(false);
  });

  it("binds the frozen method, sources, derivations, and unresolved validation naming without aliases", () => {
    expect(E01_WORKPIECE_SKIN_DEPTH_MAPPING).toMatchObject({
      methodId: "E-01",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#E-01:Equation",
      sourceRefs: [
        "ID-EM-01",
        "M04:PDF2:eq1",
        "JM95:PDF1-4",
        "CODATA22",
      ],
      contractSourceRefs: [
        "ID-EM-01",
        "JM95:PDF1-4",
        "M04:PDF2:eq1",
        "DER-EM",
        "CODATA22",
      ],
      derivationRefs: ["ID-EM-01", "DER-EM"],
      validationCaseIds: [],
      methodCheckIds: ["EM-S-004", "EM-S-003"],
      outputQuantityIds: [
        "delta_w",
        "t/delta",
        "R/delta",
        "property provenance",
      ],
      implementationReadiness:
        "isolated_non_activatable_validation_naming_conflict",
      validationNamingConflict: {
        calculationBasisMethodCheckLabel: "E-SKIN-001",
        calculationContractsAndRegistryMethodCheckIds: [
          "EM-S-004",
          "EM-S-003",
        ],
        registryValidationCaseIds: [],
        relatedValidationDocumentCaseId: "ELEC-SKIN-001",
        resolution: "unresolved_no_alias_no_runtime_activation",
      },
    });
    expect(E01_WORKPIECE_SKIN_DEPTH_MAPPING.stableWarningIds).toEqual([]);
    expect(E01_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(E01_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      E01_WORKPIECE_SKIN_DEPTH_MAPPING.numericRepresentabilityPolicy,
    ).toBe(E01_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("maps every frozen warning predicate without inventing stable warning IDs", () => {
    expect(Object.values(E01_WARNING_PREDICATES)).toEqual([
      "t or R is comparable with a few skin depths",
      "magnetic saturation or Curie transition",
      "thin-wall fields act from both faces",
      "edge, end, slot or unusual geometry",
      "electromagnetic skin depth is called thermal penetration depth",
    ]);
    expect(E01_GEOMETRY_SCALE_WARNING_POLICY).toMatchObject({
      predicate: "t or R is comparable with a few skin depths",
      automationStatus: "not_automated_no_frozen_numeric_threshold",
    });
  });

  it("implements the frozen canonical-SI skin-depth equation", () => {
    const expected = Math.sqrt(
      resistivitySnapshot.valueSi /
        (Math.PI *
          20_000 *
          E01_VACUUM_PERMEABILITY_H_PER_M *
          permeabilitySnapshot.valueSi),
    );
    const result = successful(input());
    expect(result.status).toBe("success");
    expect(result.value.deltaW).toMatchObject({
      kind: "available",
      outputId: "delta_w",
      status: "available",
      valueSi: expected,
      dimensionId: "length",
      canonicalUnitId: "m",
      interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
      isThermalAffectedDepth: false,
    });
    expect(result.numericRepresentabilityPolicy).toBe(
      E01_NUMERIC_REPRESENTABILITY_POLICY,
    );
    expect(result.equation).toBe(
      "delta_w = sqrt(rho_w / (pi * f * mu0 * mu_r_w))",
    );
    expect(result.units.dimensionalIdentity).toBe(
      "sqrt((ohm*m)/(Hz*(H/m)))=m",
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
  });

  it("preserves complete property and state provenance in the result", () => {
    const result = successful(input());
    expect(result.value.propertyProvenance).toMatchObject({
      kind: "available",
      outputId: "property provenance",
      status: "available",
      resistivitySnapshot: {
        propertyId: "electrical_resistivity",
        materialId: "synthetic-workpiece-grade",
        temperatureK: 1_000,
        fieldStrengthApm: 5_000,
        frequencyHz: 20_000,
        sourceRef: "synthetic-property-fixture-rho",
        dataQuality: "project_specific",
      },
      relativePermeabilitySnapshot: {
        propertyId: "relative_permeability",
        sourceRef: "synthetic-property-fixture-mu",
        dataQuality: "project_specific",
      },
    });
    expect(Object.isFrozen(result.value.propertyProvenance)).toBe(true);
    expect(
      Object.isFrozen(
        result.value.propertyProvenance.relativePermeabilitySnapshot,
      ),
    ).toBe(true);
  });

  it("uses the unit layer only at the boundary", () => {
    const convertedRho = toCanonicalSI(
      100,
      "microohm_cm",
      "electrical_resistivity",
    );
    expect(convertedRho).toBe(1e-6);
    const result = successful(
      input({
        frequencyHz: toCanonicalSI(20, "kHz", "frequency"),
        resistivitySnapshot: {
          ...resistivitySnapshot,
          valueSi: convertedRho,
        },
      }),
    );
    expect(result.value.deltaW.valueSi).toBeCloseTo(deltaOf(input()), 15);
  });

  it("passes the square-root dimensional scaling identities", () => {
    const base = deltaOf(input());
    const frequencyScaled = deltaOf(
      input({
        frequencyHz: 80_000,
        resistivitySnapshot: {
          ...resistivitySnapshot,
          frequencyHz: 80_000,
          materialStateId: "state-1000K-5000Apm-80kHz",
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          frequencyHz: 80_000,
          materialStateId: "state-1000K-5000Apm-80kHz",
        },
      }),
    );
    const resistivityScaled = deltaOf(
      input({
        resistivitySnapshot: {
          ...resistivitySnapshot,
          valueSi: 4e-6,
        },
      }),
    );
    const permeabilityScaled = deltaOf(
      input({
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: 10_000,
        },
      }),
    );
    expect(frequencyScaled).toBeCloseTo(base / 2, 15);
    expect(resistivityScaled).toBeCloseTo(base * 2, 15);
    expect(permeabilityScaled).toBeCloseTo(base / 10, 15);
  });

  it("passes the frozen EM-S-003 mu_r 100-to-1 analytical limit", () => {
    const mu100 = deltaOf(input());
    const mu1 = deltaOf(
      input({
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: 1,
        },
      }),
    );
    expect(mu1 / mu100).toBeCloseTo(10, 14);
  });

  it("requires explicit mu_r even for a nonferromagnet and never defaults it", () => {
    const nonferromagneticApplicability = {
      ...applicability,
      materialClass: "nonferromagnetic",
      curieState: "not_applicable_nonferromagnetic",
    } as const;
    const rho = {
      ...resistivitySnapshot,
      fieldStrengthApm: null,
      materialStateId: "nonferromagnetic-state-20kHz",
    } as const;
    const mu = {
      ...permeabilitySnapshot,
      valueSi: 1,
      fieldStrengthApm: null,
      materialStateId: "nonferromagnetic-state-20kHz",
    } as const;
    const result = successful(
      input({
        resistivitySnapshot: rho,
        relativePermeabilitySnapshot: mu,
        applicability: nonferromagneticApplicability,
      }),
    );
    expect(result.substitution.relativePermeability).toBe(1);

    const missingMu = evaluateE01WorkpieceSkinDepth({
      ...input({
        resistivitySnapshot: rho,
        relativePermeabilitySnapshot: mu,
        applicability: nonferromagneticApplicability,
      }),
      relativePermeabilitySnapshot: undefined,
    });
    expect(missingMu.status).toBe("insufficient_data");
    expect("value" in missingMu).toBe(false);
  });

  it("publishes mapped t/delta and R/delta as dimensionless ratios", () => {
    const result = successful(input());
    const delta = result.value.deltaW.valueSi;
    expect(result.value.thicknessToDelta).toMatchObject({
      kind: "available",
      outputId: "t/delta",
      status: "available",
      valueSi: 0.01 / delta,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    });
    expect(result.value.radiusToDelta).toMatchObject({
      kind: "available",
      outputId: "R/delta",
      status: "available",
      valueSi: 0.05 / delta,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    });
  });

  it("uses explicit unavailable ratio outputs without value or unit placeholders", () => {
    const result = successful(input({ characteristicGeometry: null }));
    for (const output of [
      result.value.thicknessToDelta,
      result.value.radiusToDelta,
    ]) {
      expect(output).toMatchObject({
        kind: "unavailable",
        status: "insufficient_data",
      });
      expect("valueSi" in output).toBe(false);
      expect("dimensionId" in output).toBe(false);
      expect("canonicalUnitId" in output).toBe(false);
    }
  });

  it("distinguishes missing, not-applicable, and unconfirmed characteristic geometry", () => {
    const explicitStatuses = successful(
      input({
        characteristicGeometry: {
          characteristicThicknessM: null,
          thicknessStatus: "not_applicable",
          characteristicRadiusM: null,
          radiusStatus: "missing",
          geometryMappingStatus: "confirmed_to_workpiece_geometry",
          geometrySourceRef: "explicit-geometry-status-fixture",
          geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
        },
      }),
    );
    expect(explicitStatuses.value.thicknessToDelta).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(explicitStatuses.value.radiusToDelta).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });

    const unconfirmed = successful(
      input({
        characteristicGeometry: {
          ...geometry,
          geometryMappingStatus: "unconfirmed",
        },
      }),
    );
    expect(unconfirmed.value.thicknessToDelta).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(unconfirmed.value.radiusToDelta).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
  });

  it("does not invent a numeric warning threshold for any computed geometry ratio", () => {
    const delta = deltaOf(input({ characteristicGeometry: null }));
    for (const ratio of [0.25, 1, 3, 10, 100]) {
      const result = successful(
        input({
          characteristicGeometry: {
            ...geometry,
            characteristicThicknessM: ratio * delta,
            characteristicRadiusM: ratio * delta,
          },
        }),
      );
      expect(result.warnings, `ratio=${ratio}`).toEqual([]);
      expect(
        result.warnings.some(
          (candidate) =>
            candidate.predicate ===
            "t or R is comparable with a few skin depths",
        ),
      ).toBe(false);
    }
  });

  it.each([
    [
      "thin-wall fields",
      "thin_wall_two_sided_fields",
      "thin-wall fields act from both faces",
    ],
    [
      "unusual geometry",
      "edge_end_slot_or_unusual_geometry",
      "edge, end, slot or unusual geometry",
    ],
  ] as const)(
    "returns a reference-only result with a controlled warning for %s",
    (_name, fieldGeometry, expectedPredicate) => {
      const result = successful(
        input({ applicability: { ...applicability, fieldGeometry } }),
      );
      expect(result.status).toBe("success_with_warnings");
      expect(result.interpretationScope).toBe(
        "reference_only_due_to_declared_geometry_or_curie_state",
      );
      expect(result.warnings.map((warning) => warning.predicate)).toEqual([
        expectedPredicate,
      ]);
      expect(result.value.deltaW.isThermalAffectedDepth).toBe(false);
    },
  );

  it("does not model Curie behavior and only flags an explicit same-state linear snapshot", () => {
    const result = successful(
      input({
        applicability: {
          ...applicability,
          curieState: "at_or_near_curie_transition",
        },
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.warnings.map((warning) => warning.predicate)).toEqual([
      "magnetic saturation or Curie transition",
    ]);
    expect(result.substitution.relativePermeability).toBe(
      permeabilitySnapshot.valueSi,
    );
  });

  it.each([
    ["nonuniform material", { materialHomogeneity: "nonuniform" }],
    ["anisotropic material", { materialIsotropy: "anisotropic" }],
    ["pulse excitation", { excitation: "pulse_or_multiharmonic" }],
    [
      "non-negligible displacement current",
      { displacementCurrentRegime: "not_negligible" },
    ],
  ] as const)("returns not_applicable for %s", (_name, override) => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        applicability: {
          ...applicability,
          ...override,
        } as E01ApplicabilityEvidence,
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect("value" in result).toBe(false);
  });

  it("fails closed for nonlinear saturation and thermal-depth interpretation", () => {
    const nonlinear = evaluateE01WorkpieceSkinDepth(
      input({
        applicability: {
          ...applicability,
          constitutiveRegime: "nonlinear_or_saturated",
        },
      }),
    );
    expect(nonlinear.status).toBe("not_applicable");
    expect(nonlinear.warnings.map((warning) => warning.predicate)).toEqual([
      "magnetic saturation or Curie transition",
    ]);
    expect("value" in nonlinear).toBe(false);

    const thermal = evaluateE01WorkpieceSkinDepth(
      input({
        applicability: {
          ...applicability,
          intendedInterpretation: "thermal_affected_depth",
        },
      }),
    );
    expect(thermal.status).toBe("not_applicable");
    expect(thermal.warnings.map((warning) => warning.predicate)).toEqual([
      "electromagnetic skin depth is called thermal penetration depth",
    ]);
    expect("value" in thermal).toBe(false);
  });

  it.each([
    ["unknown material class", { materialClass: "other_or_unknown" }],
    ["unknown homogeneity", { materialHomogeneity: "unknown" }],
    ["unknown isotropy", { materialIsotropy: "unknown" }],
    ["unknown constitutive regime", { constitutiveRegime: "unknown" }],
    ["unknown excitation", { excitation: "unknown" }],
    [
      "unknown displacement-current regime",
      { displacementCurrentRegime: "unknown" },
    ],
    ["unknown field geometry", { fieldGeometry: "unknown" }],
    ["unknown Curie state", { curieState: "unknown" }],
  ] as const)("returns insufficient_data for %s", (_name, override) => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        applicability: {
          ...applicability,
          ...override,
        } as E01ApplicabilityEvidence,
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it("requires an explicit field state for ferromagnetic property snapshots", () => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        resistivitySnapshot: {
          ...resistivitySnapshot,
          fieldStrengthApm: null,
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          fieldStrengthApm: null,
        },
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it.each([
    ["material", { materialId: "different-material" }],
    ["material revision", { materialRevision: "different-revision" }],
    [
      "material snapshot",
      { sourceSnapshotId: `material:${"f".repeat(64)}` },
    ],
    ["state ID", { materialStateId: "different-state" }],
    ["temperature", { temperatureK: 1_001 }],
    ["field strength", { fieldStrengthApm: 5_001 }],
    ["frequency", { frequencyHz: 19_999 }],
    ["phase", { phaseOrMicrostructureId: "different-phase" }],
  ])("withholds results for mismatched %s property state", (_name, override) => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          ...override,
        } as E01PropertySnapshot,
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it("withholds results for unconfirmed or unknown-quality property provenance", () => {
    for (const resistivity of [
      {
        ...resistivitySnapshot,
        stateMatch: "unconfirmed_or_mismatched" as const,
      },
      { ...resistivitySnapshot, dataQuality: "unknown" as const },
    ]) {
      const result = evaluateE01WorkpieceSkinDepth(
        input({ resistivitySnapshot: resistivity }),
      );
      expect(result.status).toBe("insufficient_data");
      expect("value" in result).toBe(false);
    }
  });

  it.each([
    ["zero frequency", { frequencyHz: 0 }],
    ["NaN frequency", { frequencyHz: Number.NaN }],
    ["infinite frequency", { frequencyHz: Number.POSITIVE_INFINITY }],
  ])("rejects %s", (_name, override) => {
    const result = evaluateE01WorkpieceSkinDepth(input(override));
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it.each([
    ["zero value", { valueSi: 0 }],
    ["negative value", { valueSi: -1 }],
    ["NaN value", { valueSi: Number.NaN }],
    ["infinite value", { valueSi: Number.POSITIVE_INFINITY }],
    ["wrong property", { propertyId: "relative_permeability" }],
    ["wrong dimension", { dimensionId: "dimensionless" }],
    ["wrong unit", { canonicalUnitId: "one" }],
    ["missing source", { sourceRef: "" }],
    ["forged source ref", { sourceRef: "source ref with spaces" }],
    ["wrong snapshot kind", { sourceSnapshotId: `geometry:${"d".repeat(64)}` }],
    ["forged snapshot hash", { sourceSnapshotId: "material:not-a-sha256" }],
    ["uppercase snapshot hash", { sourceSnapshotId: `material:${"A".repeat(64)}` }],
    ["invalid temperature", { temperatureK: 0 }],
    ["invalid field", { fieldStrengthApm: -1 }],
  ])("rejects resistivity snapshot with %s", (_name, override) => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        resistivitySnapshot: {
          ...resistivitySnapshot,
          ...override,
        } as E01PropertySnapshot,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects inconsistent material-class and Curie-state enumerations", () => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        applicability: {
          ...applicability,
          curieState: "not_applicable_nonferromagnetic",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it.each([
    [
      "zero available thickness",
      { ...geometry, characteristicThicknessM: 0 },
    ],
    [
      "non-finite available radius",
      { ...geometry, characteristicRadiusM: Number.POSITIVE_INFINITY },
    ],
    [
      "numeric placeholder for missing thickness",
      {
        ...geometry,
        thicknessStatus: "missing",
        characteristicThicknessM: 0.01,
      },
    ],
    ["blank geometry source", { ...geometry, geometrySourceRef: "" }],
    [
      "forged geometry source",
      { ...geometry, geometrySourceRef: "geometry source with spaces" },
    ],
    [
      "wrong snapshot kind",
      {
        ...geometry,
        geometrySnapshotId: `material:${"e".repeat(64)}`,
      },
    ],
    [
      "forged snapshot hash",
      { ...geometry, geometrySnapshotId: "geometry:not-a-sha256" },
    ],
    [
      "uppercase snapshot hash",
      { ...geometry, geometrySnapshotId: `geometry:${"C".repeat(64)}` },
    ],
  ])("rejects geometry evidence with %s", (_name, candidate) => {
    const result = evaluateE01WorkpieceSkinDepth(
      input({
        characteristicGeometry:
          candidate as E01CharacteristicGeometryEvidence,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("fails closed for formula and ratio overflow or underflow", () => {
    const cases = [
      ["permeability-frequency denominator overflow", input({
        frequencyHz: Number.MAX_VALUE,
        resistivitySnapshot: {
          ...resistivitySnapshot,
          frequencyHz: Number.MAX_VALUE,
          materialStateId: "denominator-overflow-state",
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: Number.MAX_VALUE,
          frequencyHz: Number.MAX_VALUE,
          materialStateId: "denominator-overflow-state",
        },
      })],
      ["denominator underflow", input({
        frequencyHz: Number.MIN_VALUE,
        resistivitySnapshot: {
          ...resistivitySnapshot,
          frequencyHz: Number.MIN_VALUE,
          materialStateId: "minimum-frequency-state",
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          frequencyHz: Number.MIN_VALUE,
          materialStateId: "minimum-frequency-state",
        },
      })],
      ["radicand underflow", input({
        frequencyHz: Number.MAX_VALUE,
        resistivitySnapshot: {
          ...resistivitySnapshot,
          valueSi: Number.MIN_VALUE,
          frequencyHz: Number.MAX_VALUE,
          materialStateId: "underflow-radicand-state",
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: 1,
          frequencyHz: Number.MAX_VALUE,
          materialStateId: "underflow-radicand-state",
        },
      })],
      ["ratio overflow", input({
        resistivitySnapshot: {
          ...resistivitySnapshot,
          valueSi: Number.MIN_VALUE,
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: 1,
        },
        characteristicGeometry: {
          ...geometry,
          characteristicThicknessM: Number.MAX_VALUE,
        },
      })],
      ["ratio underflow", input({
        resistivitySnapshot: {
          ...resistivitySnapshot,
          valueSi: 1e280,
        },
        relativePermeabilitySnapshot: {
          ...permeabilitySnapshot,
          valueSi: 1,
        },
        characteristicGeometry: {
          ...geometry,
          characteristicThicknessM: Number.MIN_VALUE,
        },
      })],
    ] as const;
    for (const [name, candidate] of cases) {
      const result = evaluateE01WorkpieceSkinDepth(candidate);
      expect(result.status, name).toBe("invalid_input");
      expect("value" in result, name).toBe(false);
      if ("failure" in result) {
        expect(result.failure.code, name).toBe(
          "E-01.numeric_resolution_invalid",
        );
      }
    }
  });

  it("rejects a positive-subnormal permeability chain before it can publish a normal but corrupted depth", () => {
    const subnormal =
      (Number.MIN_VALUE / E01_VACUUM_PERMEABILITY_H_PER_M) * 0.75;
    const materialStateId = "subnormal-machine-resolution-state";
    const candidate = input({
      frequencyHz: 1,
      resistivitySnapshot: {
        ...resistivitySnapshot,
        valueSi: subnormal,
        frequencyHz: 1,
        materialStateId,
      },
      relativePermeabilitySnapshot: {
        ...permeabilitySnapshot,
        valueSi: subnormal,
        frequencyHz: 1,
        materialStateId,
      },
    });

    expect(subnormal).toBeGreaterThan(0);
    expect(subnormal).toBeLessThan(E01_BINARY64_MIN_NORMAL);
    const result = evaluateE01WorkpieceSkinDepth(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "E-01.numeric_resolution_invalid" },
    });
    expect("value" in result).toBe(false);

    const knownUnsupported = evaluateE01WorkpieceSkinDepth({
      ...candidate,
      applicability: {
        ...applicability,
        constitutiveRegime: "nonlinear_or_saturated",
      },
    });
    expect(knownUnsupported.status).toBe("not_applicable");
    expect("value" in knownUnsupported).toBe(false);
  });

  it("fails closed without executing top-level or nested accessors and reflection traps", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "frequencyHz",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys trap");
      },
    });
    const propertyAccessor = Object.defineProperty(
      { ...resistivitySnapshot },
      "valueSi",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute property accessor");
        },
      },
    );
    const propertyProxy = new Proxy(permeabilitySnapshot, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile property descriptor trap");
      },
    });
    const applicabilityAccessor = Object.defineProperty(
      { ...applicability },
      "materialClass",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute applicability accessor");
        },
      },
    );
    const geometryProxy = new Proxy(geometry, {
      getPrototypeOf() {
        throw new Error("hostile geometry prototype trap");
      },
    });
    const candidates = [
      topAccessor,
      topProxy,
      input({
        resistivitySnapshot: propertyAccessor as unknown as E01PropertySnapshot,
      }),
      input({ relativePermeabilitySnapshot: propertyProxy }),
      input({
        applicability:
          applicabilityAccessor as unknown as E01ApplicabilityEvidence,
      }),
      input({ characteristicGeometry: geometryProxy }),
    ];
    for (const candidate of candidates) {
      expect(() => evaluateE01WorkpieceSkinDepth(candidate)).not.toThrow();
      const result = evaluateE01WorkpieceSkinDepth(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("does not invoke hostile enum coercion or Proxy get traps", () => {
    const hostileEnum = Object.freeze({
      toString() {
        throw new Error("must not coerce hostile enum");
      },
    });
    const hostileApplicability = input({
      applicability: {
        ...applicability,
        materialClass: hostileEnum as unknown as "ferromagnetic",
      },
    });
    expect(() =>
      evaluateE01WorkpieceSkinDepth(hostileApplicability),
    ).not.toThrow();
    expect(
      evaluateE01WorkpieceSkinDepth(hostileApplicability).status,
    ).toBe("invalid_input");

    const getTrapSnapshot = new Proxy(resistivitySnapshot, {
      get() {
        throw new Error("must not read through Proxy get trap");
      },
    });
    expect(() =>
      evaluateE01WorkpieceSkinDepth(
        input({ resistivitySnapshot: getTrapSnapshot }),
      ),
    ).not.toThrow();
    expect(
      evaluateE01WorkpieceSkinDepth(
        input({ resistivitySnapshot: getTrapSnapshot }),
      ).status,
    ).toBe("success");
  });

  it("rejects extra legacy-result fields without using them as truth", () => {
    const result = evaluateE01WorkpieceSkinDepth({
      ...input(),
      legacyResult: "not-an-input",
    });
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });
});
