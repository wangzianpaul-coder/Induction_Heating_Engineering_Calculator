import { describe, expect, it } from "vitest";

import {
  B01_GEOMETRY_NORMALIZATION_MAPPING,
  B01_IMPLEMENTATION_READINESS,
  B01_WARNING_PREDICATES,
  evaluateB01GeometryNormalization,
  type B01GeometryApplicabilityEvidence,
  type B01GeometryNormalizationInput,
  type B01GeometryNormalizationSuccess,
  type B01HelixPathInput,
  type B01TurnCenterInput,
} from "../../../src/methods/B/b01GeometryNormalization.js";

const BASE_GEOMETRY = Object.freeze({
  windingClass: "uniform_single_layer",
  cylindricalAxisDefinition: "explicit",
  conductorSectionDirections: "radial_and_axial_explicit",
  measurementDatums: "consistent",
  identicalTurnSections: true,
  identityCheckBasis: "exact_identity",
} as const satisfies B01GeometryApplicabilityEvidence);

const ABSENT_TURN_CENTERS = Object.freeze({
  positionsM: null,
  coordinateSystemId: null,
  ordering: "unconfirmed",
} as const satisfies B01TurnCenterInput);

const ABSENT_HELIX_PATH = Object.freeze({
  revolutionCount: null,
  axialAdvanceM: null,
  leadLengthM: null,
  revolutionCountBasis: "other_or_unknown",
  axialAdvanceBasis: "other_or_unknown",
} as const satisfies B01HelixPathInput);

type InputOverrides = Partial<
  Omit<B01GeometryNormalizationInput, "geometry" | "turnCenters" | "helixPath">
> & {
  readonly geometry?: Partial<B01GeometryApplicabilityEvidence>;
  readonly turnCenters?: Partial<B01TurnCenterInput>;
  readonly helixPath?: Partial<B01HelixPathInput>;
};

function input(overrides: InputOverrides = {}): B01GeometryNormalizationInput {
  const { geometry, turnCenters, helixPath, ...scalars } = overrides;
  return {
    electricalTurnCount: 5,
    innerDiameterM: 0.2,
    outerDiameterM: 0.22,
    meanDiameterM: null,
    currentPathDiameterM: null,
    currentPathBasis: "unresolved_default_to_mean_diameter",
    conductorRadialSizeM: 0.01,
    conductorAxialSizeM: 0.01,
    pitchCenterM: 0.015,
    geometry: { ...BASE_GEOMETRY, ...geometry },
    turnCenters: { ...ABSENT_TURN_CENTERS, ...turnCenters },
    helixPath: { ...ABSENT_HELIX_PATH, ...helixPath },
    ...scalars,
  };
}

function successOf(
  candidate: unknown,
): B01GeometryNormalizationSuccess {
  const result = evaluateB01GeometryNormalization(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    return result;
  }
  throw new Error(`Expected a B-01 success outcome, received ${result.status}.`);
}

function expectTolId(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-12 * Math.max(1, Math.abs(expected)),
  );
}

describe("B-01 frozen geometry normalization", () => {
  it("binds exactly to the frozen registry, controlled derivations, and GEO cases", () => {
    expect(B01_GEOMETRY_NORMALIZATION_MAPPING).toMatchObject({
      methodId: "B-01",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#B-01:Equation",
      sourceRefs: ["ID-GEO-01"],
      contractSourceRefs: [
        "ID-GEO-01",
        "ADR-0003",
        "DER-GEO",
        "ENGINEERING_PARAMETER_DICTIONARY",
      ],
      derivationRefs: ["ID-GEO-01", "DER-GEO"],
      validationCaseIds: ["GEO-001", "GEO-002"],
      methodCheckIds: [],
      stableWarningIds: [],
    });
    expect(B01_WARNING_PREDICATES.currentCentroidUnknown).toBe(
      "effective current centroid is unknown",
    );
    expect(B01_GEOMETRY_NORMALIZATION_MAPPING.warningPredicates).toContain(
      B01_WARNING_PREDICATES.currentCentroidUnknown,
    );
    expect(B01_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        expect.objectContaining({
          gateId: "B-01.measurement_identity_uncertainty_rule",
        }),
        expect.objectContaining({ gateId: "B-01.stable_warning_ids" }),
      ],
    });
  });

  it("reproduces GEO-001 identities while honoring the contract-required explicit D_o", () => {
    const result = successOf(input());

    expect(result.status).toBe("success_with_warnings");
    expectTolId(result.value.outerDiameter.valueSi, 0.22);
    expectTolId(result.value.meanDiameter.valueSi, 0.21);
    expectTolId(result.value.currentPathDiameter.valueSi, 0.21);
    expect(result.value.currentPathDiameter.provenance).toBe(
      "derived_ADR_0003_default",
    );
    expect(result.value.pitchCenter.kind).toBe("available");
    expect(result.value.turnClearanceAxial.kind).toBe("available");
    if (result.value.turnClearanceAxial.kind === "available") {
      expectTolId(result.value.turnClearanceAxial.valueSi, 0.005);
    }
    expectTolId(result.value.firstLastCenterSpan.valueSi, 0.06);
    expectTolId(result.value.windingEnvelopeLength.valueSi, 0.07);
    expect(result.value.electricalTurnCount.valueSi).toBe(5);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        predicate: "effective current centroid is unknown",
      }),
    ]);
    expect(result.warningIds).toEqual([]);
    expect(result.warnings[0]).not.toHaveProperty("warningId");
  });

  it("keeps every mechanical, electromagnetic, axial, and path semantic distinct", () => {
    const result = successOf(
      input({
        outerDiameterM: 0.22,
        meanDiameterM: 0.21,
        currentPathDiameterM: 0.208,
        currentPathBasis: "explicit_method_or_state_bound",
        helixPath: {
          revolutionCount: 4.25,
          axialAdvanceM: 0.058,
          leadLengthM: 0.4,
          revolutionCountBasis: "actual_mechanical_or_cad_path",
          axialAdvanceBasis: "actual_path_endpoint_advance",
        },
      }),
    );

    expect(result.status).toBe("success");
    expect(result.value.innerDiameter.valueSi).toBe(0.2);
    expect(result.value.outerDiameter.valueSi).toBeCloseTo(0.22, 15);
    expect(result.value.meanDiameter.valueSi).toBeCloseTo(0.21, 15);
    expect(result.value.currentPathDiameter.valueSi).toBe(0.208);
    expect(result.value.conductorRadialSize.valueSi).toBe(0.01);
    expect(result.value.conductorAxialSize.valueSi).toBe(0.01);
    expect(result.value.firstLastCenterSpan.valueSi).toBeCloseTo(0.06, 15);
    expect(result.value.windingEnvelopeLength.valueSi).toBeCloseTo(0.07, 15);
    expect(result.value.helixRevolutionCount.kind).toBe("available");
    if (result.value.helixRevolutionCount.kind === "available") {
      expect(result.value.helixRevolutionCount.valueSi).toBe(4.25);
      expect(result.value.helixRevolutionCount.valueSi).not.toBe(
        result.value.electricalTurnCount.valueSi,
      );
    }
    expect(result.value.helixAxialAdvance.kind).toBe("available");
    if (result.value.helixAxialAdvance.kind === "available") {
      expect(result.value.helixAxialAdvance.valueSi).toBe(0.058);
      expect(result.value.helixAxialAdvance.valueSi).not.toBe(
        result.value.firstLastCenterSpan.valueSi,
      );
    }
    expect(result.semanticBoundaries).toEqual({
      diametersRemainDistinct: ["D_i", "D_o", "D_m", "D_c"],
      axialLengthsRemainDistinct: [
        "p",
        "g",
        "b_cc",
        "b_env",
        "delta_z_helix",
      ],
      revolutionCountsRemainDistinct: ["N", "N_rev"],
      helixRevolutionPolicy: "N_rev_never_inferred_from_N",
      thermalRadialGapPolicy:
        "thermal.radial_gap_is_not_consumed_or_derived",
    });
  });

  it("publishes dimensions, units, explicit ratio denominators, and analytical identities", () => {
    const result = successOf(
      input({
        currentPathDiameterM: 0.21,
        currentPathBasis: "explicit_method_or_state_bound",
      }),
    );

    for (const output of [
      result.value.innerDiameter,
      result.value.outerDiameter,
      result.value.meanDiameter,
      result.value.currentPathDiameter,
      result.value.conductorRadialSize,
      result.value.conductorAxialSize,
      result.value.firstLastCenterSpan,
      result.value.windingEnvelopeLength,
    ]) {
      expect(output.dimensionId).toBe("length");
      expect(output.canonicalUnitId).toBe("m");
    }
    expect(result.value.dimensionlessRatios).toMatchObject({
      windingEnvelopeToCurrentPathDiameter: {
        numeratorParameterId: "coil.winding_envelope_length",
        denominatorParameterId: "coil.current_path_diameter",
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
      },
      pitchToConductorAxialSize: {
        numeratorParameterId: "coil.pitch_center",
        denominatorParameterId: "conductor.axial_size",
      },
      conductorRadialSizeToCurrentPathDiameter: {
        numeratorParameterId: "conductor.radial_size",
        denominatorParameterId: "coil.current_path_diameter",
      },
    });
    expectTolId(
      result.value.dimensionlessRatios.windingEnvelopeToCurrentPathDiameter
        .valueSi,
      1 / 3,
    );
    expect(result.equations).toEqual([
      "D_o = D_i + 2*d_rad",
      "D_m = (D_i + D_o)/2 = D_i + d_rad",
      "g = p - d_ax when N>1",
      "b_cc = (N-1)*p when N>1; b_cc=0 when N=1",
      "b_env = b_cc + d_ax",
    ]);
    expect(result.identityChecks.every((check) => check.toleranceId === "TOL-ID")).toBe(
      true,
    );
    expect(
      result.identityChecks.every(
        (check) => check.tolerancePurpose === "identity_only",
      ),
    ).toBe(true);
  });

  it("implements the GEO-002 N=1 boundary without inventing p, g, N_rev, or path endpoints", () => {
    const result = successOf(
      input({
        electricalTurnCount: 1,
        pitchCenterM: null,
      }),
    );

    expect(result.value.firstLastCenterSpan.valueSi).toBe(0);
    expect(result.value.windingEnvelopeLength.valueSi).toBe(0.01);
    expect(result.value.pitchCenter).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
      parameterId: "coil.pitch_center",
    });
    expect(result.value.turnClearanceAxial).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
      parameterId: "coil.turn_clearance_axial",
    });
    expect(result.value.helixRevolutionCount).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.value.helixAxialAdvance).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(
      result.value.dimensionlessRatios.pitchToConductorAxialSize,
    ).toMatchObject({ kind: "unavailable", status: "not_applicable" });
    for (const unavailable of [
      result.value.pitchCenter,
      result.value.turnClearanceAxial,
      result.value.helixRevolutionCount,
      result.value.helixAxialAdvance,
      result.value.leadLength,
      result.value.turnCenterZ,
      result.value.dimensionlessRatios.pitchToConductorAxialSize,
    ]) {
      expect(unavailable).not.toHaveProperty("valueSi");
      expect(unavailable).not.toHaveProperty("dimensionId");
      expect(unavailable).not.toHaveProperty("canonicalUnitId");
    }
  });

  it("rejects a pitch for N=1 and requires p for N>=2", () => {
    const singleWithPitch = evaluateB01GeometryNormalization(
      input({ electricalTurnCount: 1 }),
    );
    const multiWithoutPitch = evaluateB01GeometryNormalization(
      input({ pitchCenterM: null }),
    );

    expect(singleWithPitch.status).toBe("invalid_input");
    expect(multiWithoutPitch.status).toBe("insufficient_data");
    if (singleWithPitch.status === "invalid_input") {
      expect(singleWithPitch.failure.code).toBe("B-01.single_turn_pitch_invalid");
    }
    if (multiWithoutPitch.status === "insufficient_data") {
      expect(multiWithoutPitch.failure.code).toBe("B-01.pitch_missing");
    }
    expect("value" in singleWithPitch).toBe(false);
    expect("value" in multiWithoutPitch).toBe(false);
  });

  it("preserves negative clearance with the frozen g<0 warning and no threshold", () => {
    const result = successOf(
      input({
        pitchCenterM: 0.009,
        currentPathDiameterM: 0.21,
        currentPathBasis: "explicit_method_or_state_bound",
      }),
    );
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.turnClearanceAxial.kind).toBe("available");
    if (result.value.turnClearanceAxial.kind === "available") {
      expect(result.value.turnClearanceAxial.valueSi).toBeCloseTo(-0.001, 15);
    }
    expect(result.warnings).toEqual([
      expect.objectContaining({ predicate: "g<0" }),
    ]);
    expect(result.warningIds).toEqual([]);
  });

  it("accepts exact zero clearance as a genuine boundary", () => {
    const result = successOf(input({ pitchCenterM: 0.01 }));
    expect(result.value.turnClearanceAxial.kind).toBe("available");
    if (result.value.turnClearanceAxial.kind === "available") {
      expect(result.value.turnClearanceAxial.valueSi).toBe(0);
    }
    expect(result.value.windingEnvelopeLength.valueSi).toBeCloseTo(0.05, 15);
  });

  it("fails closed for multilayer, unknown, mixed-section, or datum-invalid routes", () => {
    const candidates = [
      [
        "not_applicable",
        input({ geometry: { windingClass: "multilayer" } }),
      ],
      [
        "insufficient_data",
        input({ geometry: { windingClass: "other_or_unknown" } }),
      ],
      [
        "insufficient_data",
        input({ geometry: { identicalTurnSections: false } }),
      ],
      [
        "insufficient_data",
        input({
          geometry: { conductorSectionDirections: "unconfirmed" },
        }),
      ],
      [
        "invalid_input",
        input({ geometry: { measurementDatums: "inconsistent" } }),
      ],
    ] as const;
    for (const [status, candidate] of candidates) {
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe(status);
      expect("value" in result).toBe(false);
    }
  });

  it("uses TOL-ID only for exact redundant identities and does not overwrite conflicts", () => {
    const consistent = successOf(
      input({ outerDiameterM: 0.22, meanDiameterM: 0.21 }),
    );
    expect(consistent.identityChecks.map((check) => check.identityId)).toEqual(
      expect.arrayContaining([
        "D_o=D_i+2d_rad",
        "D_m=D_i+d_rad",
        "D_m=(D_i+D_o)/2",
      ]),
    );

    for (const candidate of [
      input({ outerDiameterM: 0.225 }),
      input({ meanDiameterM: 0.215 }),
    ]) {
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe("invalid_input");
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-01.geometry_identity_inconsistent");
      }
      expect("value" in result).toBe(false);
    }
  });

  it("refuses to use TOL-ID as a real measurement-uncertainty rule", () => {
    const result = evaluateB01GeometryNormalization(
      input({
        outerDiameterM: 0.22,
        geometry: {
          identityCheckBasis: "measurement_uncertainty_required",
        },
      }),
    );
    expect(result.status).toBe("insufficient_data");
    if (result.status === "insufficient_data") {
      expect(result.failure.code).toBe(
        "B-01.redundant_identity_uncertainty_unresolved",
      );
    }
    expect("value" in result).toBe(false);
  });

  it("requires an explicit D_c decision and never overwrites an explicit value", () => {
    const explicit = successOf(
      input({
        currentPathDiameterM: 0.205,
        currentPathBasis: "explicit_method_or_state_bound",
      }),
    );
    expect(explicit.status).toBe("success");
    expect(explicit.value.currentPathDiameter.valueSi).toBe(0.205);
    expect(explicit.value.meanDiameter.valueSi).not.toBe(
      explicit.value.currentPathDiameter.valueSi,
    );

    const candidates = [
      input({
        currentPathDiameterM: null,
        currentPathBasis: "explicit_method_or_state_bound",
      }),
      input({
        currentPathDiameterM: 0.21,
        currentPathBasis: "unresolved_default_to_mean_diameter",
      }),
      input({
        currentPathDiameterM: null,
        currentPathBasis: "other_or_unknown",
      }),
    ];
    expect(evaluateB01GeometryNormalization(candidates[0]).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(candidates[1]).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(candidates[2]).status).toBe(
      "insufficient_data",
    );
  });

  it("preserves actual helix data even when N_rev and delta_z_helix differ from N and b_cc", () => {
    const result = successOf(
      input({
        helixPath: {
          revolutionCount: 4.5,
          axialAdvanceM: -0.055,
          leadLengthM: 0,
          revolutionCountBasis: "actual_mechanical_or_cad_path",
          axialAdvanceBasis: "actual_path_endpoint_advance",
        },
      }),
    );
    expect(result.value.helixRevolutionCount.kind).toBe("available");
    expect(result.value.helixAxialAdvance.kind).toBe("available");
    expect(result.value.leadLength.kind).toBe("available");
    if (
      result.value.helixRevolutionCount.kind === "available" &&
      result.value.helixAxialAdvance.kind === "available" &&
      result.value.leadLength.kind === "available"
    ) {
      expect(result.value.helixRevolutionCount.valueSi).toBe(4.5);
      expect(result.value.helixAxialAdvance.valueSi).toBe(-0.055);
      expect(result.value.leadLength.valueSi).toBe(0);
    }
  });

  it("rejects guessed, incomplete, unproven, or invalid helix paths", () => {
    const cases = [
      [
        "invalid_input",
        input({
          helixPath: {
            revolutionCount: 5,
            axialAdvanceM: 0.06,
            revolutionCountBasis: "guessed_from_electrical_turn_count",
            axialAdvanceBasis: "actual_path_endpoint_advance",
          },
        }),
      ],
      [
        "invalid_input",
        input({
          helixPath: {
            revolutionCount: 4.5,
            axialAdvanceM: 0.06,
            revolutionCountBasis: "actual_mechanical_or_cad_path",
            axialAdvanceBasis: "guessed_from_turn_center_span",
          },
        }),
      ],
      [
        "insufficient_data",
        input({
          helixPath: {
            revolutionCount: 4.5,
            axialAdvanceM: null,
            revolutionCountBasis: "actual_mechanical_or_cad_path",
          },
        }),
      ],
      [
        "insufficient_data",
        input({
          helixPath: {
            revolutionCount: 4.5,
            axialAdvanceM: 0.06,
            revolutionCountBasis: "other_or_unknown",
            axialAdvanceBasis: "actual_path_endpoint_advance",
          },
        }),
      ],
      [
        "invalid_input",
        input({
          helixPath: {
            revolutionCount: 0,
            axialAdvanceM: 0.06,
            revolutionCountBasis: "actual_mechanical_or_cad_path",
            axialAdvanceBasis: "actual_path_endpoint_advance",
          },
        }),
      ],
    ] as const;
    for (const [expectedStatus, candidate] of cases) {
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe(expectedStatus);
      expect("value" in result).toBe(false);
    }
  });

  it("validates exact ascending and descending z_i without fitting or sorting", () => {
    for (const turnCenters of [
      {
        positionsM: [0, 0.015, 0.03, 0.045, 0.06],
        coordinateSystemId: "coil-axis-datum-A",
        ordering: "ascending" as const,
      },
      {
        positionsM: [0.06, 0.045, 0.03, 0.015, 0],
        coordinateSystemId: "coil-axis-datum-A",
        ordering: "descending" as const,
      },
    ]) {
      const result = successOf(input({ turnCenters }));
      expect(result.value.turnCenterZ.kind).toBe("available");
      if (result.value.turnCenterZ.kind === "available") {
        expect(result.value.turnCenterZ.valueSi).toEqual(
          turnCenters.positionsM,
        );
        expect(result.value.turnCenterZ.ordering).toBe(turnCenters.ordering);
      }
      expect(
        result.identityChecks.filter(
          (check) => check.identityId === "z_interval=p",
        ),
      ).toHaveLength(4);
      expect(
        result.identityChecks.some(
          (check) => check.identityId === "z_span=b_cc",
        ),
      ).toBe(true);
    }
  });

  it("rejects z_i count, order, pitch, and measurement-uncertainty ambiguity", () => {
    const cases = [
      input({
        turnCenters: {
          positionsM: [0, 0.015],
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      }),
      input({
        turnCenters: {
          positionsM: [0, 0.015, 0.014, 0.045, 0.06],
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      }),
      input({
        turnCenters: {
          positionsM: [0, 0.015, 0.031, 0.045, 0.06],
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      }),
      input({
        geometry: {
          identityCheckBasis: "measurement_uncertainty_required",
        },
        turnCenters: {
          positionsM: [0, 0.015, 0.03, 0.045, 0.06],
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      }),
    ];
    expect(evaluateB01GeometryNormalization(cases[0]).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(cases[1]).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(cases[2]).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(cases[3]).status).toBe(
      "insufficient_data",
    );
  });

  it.each([
    ["zero N", { electricalTurnCount: 0 }],
    ["fractional N", { electricalTurnCount: 1.5 }],
    ["unsafe N", { electricalTurnCount: Number.MAX_SAFE_INTEGER + 1 }],
    ["zero D_i", { innerDiameterM: 0 }],
    ["negative d_rad", { conductorRadialSizeM: -1 }],
    ["NaN d_ax", { conductorAxialSizeM: Number.NaN }],
    ["infinite D_i", { innerDiameterM: Number.POSITIVE_INFINITY }],
    ["missing required D_o", { outerDiameterM: null }],
    ["invalid D_o", { outerDiameterM: 0.19 }],
    ["invalid D_m", { outerDiameterM: 0.22, meanDiameterM: 0.23 }],
  ])("rejects %s without a result value", (_name, overrides) => {
    const result = evaluateB01GeometryNormalization(
      input(overrides as InputOverrides),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("fails closed for derived overflow, swallowed positive additions, and ratio underflow", () => {
    const cases = [
      input({
        innerDiameterM: 8e307,
        outerDiameterM: 1.7e308,
        conductorRadialSizeM: 5e307,
      }),
      input({
        innerDiameterM: 1e300,
        outerDiameterM: 1.0000000000000002e300,
        conductorRadialSizeM: 1,
      }),
      input({
        electricalTurnCount: Number.MAX_SAFE_INTEGER,
        pitchCenterM: Number.MAX_VALUE,
      }),
      input({
        electricalTurnCount: 2,
        pitchCenterM: 1e300,
        conductorAxialSizeM: 1,
      }),
      input({
        innerDiameterM: Number.MIN_VALUE,
        outerDiameterM: 3 * Number.MIN_VALUE,
        conductorRadialSizeM: Number.MIN_VALUE,
        currentPathDiameterM: Number.MAX_VALUE,
        currentPathBasis: "explicit_method_or_state_bound",
      }),
    ];
    for (const candidate of cases) {
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("B-01.numeric_resolution_invalid");
      }
    }
  });

  it("rejects sparse, extra-property, accessor, and maximum-length z_i arrays quickly", () => {
    const sparse = new Array(5);
    sparse[0] = 0;
    const extraProperty = [0, 0.015, 0.03, 0.045, 0.06];
    Object.defineProperty(extraProperty, "metadata", {
      value: "uncontrolled",
      enumerable: true,
    });
    const accessor = [0, 0.015, 0.03, 0.045, 0.06];
    Object.defineProperty(accessor, "2", {
      enumerable: true,
      get() {
        throw new Error("must not execute z_i getter");
      },
    });
    const hugeSparse = new Array(0xffffffff);

    for (const positionsM of [sparse, extraProperty, accessor, hugeSparse]) {
      const candidate = input({
        turnCenters: {
          positionsM,
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      });
      expect(() => evaluateB01GeometryNormalization(candidate)).not.toThrow();
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed without executing top-level or nested accessors and Proxy traps", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "innerDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level getter");
        },
      },
    );
    const geometryAccessor = Object.defineProperty(
      { ...BASE_GEOMETRY },
      "windingClass",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute nested getter");
        },
      },
    );
    const topProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level reflection trap");
      },
    });
    const pathProxy = new Proxy(ABSENT_HELIX_PATH, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile nested reflection trap");
      },
    });

    for (const candidate of [
      topAccessor,
      { ...input(), geometry: geometryAccessor },
      topProxy,
      { ...input(), helixPath: pathProxy },
    ]) {
      expect(() => evaluateB01GeometryNormalization(candidate)).not.toThrow();
      const result = evaluateB01GeometryNormalization(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("copies Proxy data descriptors without invoking hostile get traps", () => {
    const geometry = new Proxy(BASE_GEOMETRY, {
      get() {
        throw new Error("B-01 must consume copied data descriptors");
      },
    });
    const candidate = { ...input(), geometry };
    expect(() => evaluateB01GeometryNormalization(candidate)).not.toThrow();
    expect(
      evaluateB01GeometryNormalization(candidate).status,
    ).toBe("success_with_warnings");
  });

  it("rejects hostile enum objects and extra top-level fields without coercion", () => {
    const hostileEnum = Object.freeze({
      toString() {
        throw new Error("must not coerce hostile enum");
      },
    });
    const hostile = input({
      currentPathBasis:
        hostileEnum as unknown as B01GeometryNormalizationInput["currentPathBasis"],
    });
    const extra = {
      ...input(),
      thermalRadialGapM: 0.02,
    };
    expect(() => evaluateB01GeometryNormalization(hostile)).not.toThrow();
    expect(evaluateB01GeometryNormalization(hostile).status).toBe(
      "invalid_input",
    );
    expect(evaluateB01GeometryNormalization(extra).status).toBe(
      "invalid_input",
    );
  });

  it("does not read, output, or derive thermal.radial_gap from axial g", () => {
    const result = successOf(input());
    expect(result.value.turnClearanceAxial.kind).toBe("available");
    expect(result.value).not.toHaveProperty("thermalRadialGap");
    expect(result.value).not.toHaveProperty("radialGap");
    expect(result.semanticBoundaries.thermalRadialGapPolicy).toBe(
      "thermal.radial_gap_is_not_consumed_or_derived",
    );
  });

  it("deep-freezes successful geometry, identities, warnings, and coordinate arrays", () => {
    const result = successOf(
      input({
        turnCenters: {
          positionsM: [0, 0.015, 0.03, 0.045, 0.06],
          coordinateSystemId: "axis",
          ordering: "ascending",
        },
      }),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.outerDiameter)).toBe(true);
    expect(Object.isFrozen(result.value.dimensionlessRatios)).toBe(true);
    expect(Object.isFrozen(result.identityChecks)).toBe(true);
    expect(Object.isFrozen(result.geometryEvidence)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    if (result.value.turnCenterZ.kind === "available") {
      expect(Object.isFrozen(result.value.turnCenterZ)).toBe(true);
      expect(Object.isFrozen(result.value.turnCenterZ.valueSi)).toBe(true);
    }
  });
});
