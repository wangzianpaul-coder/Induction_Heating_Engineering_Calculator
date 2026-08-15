import { describe, expect, it } from "vitest";

import {
  D03_BINARY64_MIN_NORMAL,
  D03_CONTRACT_SOURCE_REFS,
  D03_DC_RESISTANCE_MAPPING,
  D03_DERIVATION_REFS,
  D03_METHOD_CHECK_IDS,
  D03_NUMERIC_REPRESENTABILITY_POLICY,
  D03_SOURCE_REFS,
  D03_VALIDATION_CASE_IDS,
  D03_WARNING_PREDICATES,
  evaluateD03DcResistance,
  type D03CompleteDcResistanceSuccess,
  type D03DcResistanceInput,
  type D03SeriesExtraResistance,
  type D03UniformConductorEvidence,
} from "../../../src/methods/D/d03DcResistance.js";

function input(
  overrides: Partial<D03DcResistanceInput> = {},
): D03DcResistanceInput {
  return {
    conductorLengthM: 5,
    metalAreaM2: 2e-5,
    resistivitySnapshot: {
      valueOhmM: 2e-8,
      materialId: "project-copper-C110-state-373K",
      temperatureK: 373.15,
      sourceRef: "project-material:C110:rho_e:373.15K:v1",
      stateMatch: "same_material_temperature_as_conductor",
    },
    conductorEvidence: {
      materialDistribution: "uniform",
      metalAreaDistribution: "uniform",
      temperatureDistribution: "uniform",
      materialId: "project-copper-C110-state-373K",
      temperatureK: 373.15,
      resistanceBoundary: "conductor_body_only_excludes_series_extras",
    },
    seriesExtraResistances: [],
    seriesBoundary: {
      completeness: "complete",
      referencePlane:
        "terminal_equals_conductor_plus_listed_series_extras",
    },
    ...overrides,
  };
}

function extra(
  overrides: Partial<D03SeriesExtraResistance> = {},
): D03SeriesExtraResistance {
  return {
    componentId: "joint-01",
    componentKind: "joint",
    resistanceOhm: 2e-4,
    sourceRef: "measurement:joint-01:four-wire:v1",
    duplicationEvidence:
      "confirmed_unique_and_excluded_from_conductor_term",
    ...overrides,
  };
}

function requireSuccess(
  result: ReturnType<typeof evaluateD03DcResistance>,
): D03CompleteDcResistanceSuccess {
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(`Expected complete D-03 success, received ${result.status}.`);
  }
  return result;
}

function expectTolId(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-12 * Math.max(1, Math.abs(expected)),
  );
}

describe("D-03 uniform-path DC resistance", () => {
  it("evaluates rho*l/A and an explicitly empty complete terminal list", () => {
    const result = requireSuccess(evaluateD03DcResistance(input()));

    expectTolId(result.value.RconductorDc.value, 0.005);
    expectTolId(result.value.RterminalDc.value, 0.005);
    expect(result.value.seriesExtraAggregate.value).toBe(0);
    expect(result.value.seriesExtraBreakdown).toEqual([]);
    expect(result.warningIds).toEqual([]);
  });

  it("implements ELEC-RDC-001 length and inverse-area scaling", () => {
    const base = requireSuccess(evaluateD03DcResistance(input()));
    const doubleLength = requireSuccess(
      evaluateD03DcResistance(input({ conductorLengthM: 10 })),
    );
    const doubleArea = requireSuccess(
      evaluateD03DcResistance(input({ metalAreaM2: 4e-5 })),
    );

    expectTolId(
      doubleLength.value.RconductorDc.value /
        base.value.RconductorDc.value,
      2,
    );
    expectTolId(
      doubleArea.value.RconductorDc.value / base.value.RconductorDc.value,
      0.5,
    );
  });

  it("implements ELEC-RDC-001 resistivity scaling at the declared state", () => {
    const base = requireSuccess(evaluateD03DcResistance(input()));
    const doubled = requireSuccess(
      evaluateD03DcResistance(
        input({
          resistivitySnapshot: {
            ...input().resistivitySnapshot,
            valueOhmM: 4e-8,
          },
        }),
      ),
    );

    expectTolId(
      doubled.value.RconductorDc.value / base.value.RconductorDc.value,
      2,
    );
  });

  it("implements ELEC-RDC-001 explicit terminal component summation", () => {
    const extras = [
      extra(),
      extra({
        componentId: "busbar-A",
        componentKind: "busbar",
        resistanceOhm: 3e-4,
        sourceRef: "case:busbar-A:same-state:v2",
      }),
    ];
    const result = requireSuccess(
      evaluateD03DcResistance(input({ seriesExtraResistances: extras })),
    );

    expectTolId(result.value.RconductorDc.value, 0.005);
    expectTolId(result.value.seriesExtraAggregate.value, 0.0005);
    expectTolId(result.value.RterminalDc.value, 0.0055);
    expect(result.value.seriesExtraBreakdown).toEqual(extras);
    expect(result.value.seriesExtraBreakdown.map((item) => item.sourceRef)).toEqual([
      "measurement:joint-01:four-wire:v1",
      "case:busbar-A:same-state:v2",
    ]);
  });

  it("binds method, source, derivation, validation, and blocked measurement-check metadata", () => {
    const result = requireSuccess(evaluateD03DcResistance(input()));

    expect(result.methodId).toBe("D-03");
    expect(result.methodVersion).toBe("1.0.0-gate0");
    expect(result.methodApproval).toBe("approved");
    expect(D03_DC_RESISTANCE_MAPPING).toMatchObject({
      methodId: "D-03",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#D-03:Equation",
    });
    expect(result.sourceRefs).toEqual(D03_SOURCE_REFS);
    expect(result.sourceRefs).toEqual(["ID-OHM-01"]);
    expect(result.contractSourceRefs).toEqual(D03_CONTRACT_SOURCE_REFS);
    expect(result.contractSourceRefs).toEqual([
      "ID-OHM-01",
      "DER-CIRCUIT",
      "material source required separately",
    ]);
    expect(result.derivationRefs).toEqual(D03_DERIVATION_REFS);
    expect(result.derivationRefs).toEqual(["ID-OHM-01", "DER-CIRCUIT"]);
    expect(result.validationCaseIds).toEqual(D03_VALIDATION_CASE_IDS);
    expect(result.validationCaseIds).toEqual(["ELEC-RDC-001"]);
    expect(result.methodCheckIds).toEqual(D03_METHOD_CHECK_IDS);
    expect(result.methodCheckIds).toEqual(["ELEC-RDC-MEAS-001"]);
    expect(D03_WARNING_PREDICATES.seriesExtrasUnknown).toBe(
      "joint resistance is unknown",
    );
    expect(D03_DC_RESISTANCE_MAPPING.warningPredicates).toContain(
      D03_WARNING_PREDICATES.seriesExtrasUnknown,
    );
    expect(D03_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(D03_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(D03_DC_RESISTANCE_MAPPING.numericRepresentabilityPolicy).toBe(
      D03_NUMERIC_REPRESENTABILITY_POLICY,
    );
    expect(result.numericRepresentabilityPolicy).toBe(
      D03_NUMERIC_REPRESENTABILITY_POLICY,
    );
  });

  it("publishes the frozen resistance dimensions and output semantics", () => {
    const result = requireSuccess(evaluateD03DcResistance(input()));

    expect(result.value.RconductorDc).toMatchObject({
      kind: "available",
      quantityId: "Rconductor_dc",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "uniform_conductor_body_dc_resistance",
    });
    expect(result.value.RterminalDc).toMatchObject({
      kind: "available",
      quantityId: "Rterminal_dc",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation:
        "terminal_dc_resistance_including_explicit_series_extras",
    });
    expect(result.value.seriesExtraAggregate).toMatchObject({
      kind: "available",
      quantityId: "Rseries_extra_sum",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "sum_of_explicit_unique_series_extras",
    });
    expect(result.units).toEqual({
      resistivity: "ohm_m",
      length: "m",
      area: "m2",
      resistance: "ohm",
      conductorDimensionalIdentity: "(ohm*m)*m/m2=ohm",
      terminalDimensionalIdentity: "ohm+sum(ohm)=ohm",
    });
    expect(result.equations).toEqual([
      "R_conductor,dc = rho_e(T) * ell / A_metal",
      "R_terminal,dc = R_conductor,dc + sum(R_series,explicit)",
    ]);
  });

  it.each([
    ["material", { materialDistribution: "spatially_varying" }],
    ["area", { metalAreaDistribution: "spatially_varying" }],
    ["temperature", { temperatureDistribution: "spatially_varying" }],
  ])("fails closed for a nonuniform %s path without guessing an integral", (_name, evidenceOverride) => {
    const result = evaluateD03DcResistance(
      input({
        conductorEvidence: {
          ...input().conductorEvidence,
          ...(evidenceOverride as Partial<D03UniformConductorEvidence>),
        },
      }),
    );

    expect(result.status).toBe("not_applicable");
    if (result.status !== "not_applicable") {
      throw new Error("Expected a nonuniform D-03 path to be not_applicable.");
    }
    expect(result.failure.code).toBe("D-03.nonuniform_path_not_applicable");
    expect(result.failure.message).not.toMatch(/integral.*value/i);
    expect("value" in result).toBe(false);
  });

  it.each([
    ["material", { materialDistribution: "unknown" }],
    ["area", { metalAreaDistribution: "unknown" }],
    ["temperature", { temperatureDistribution: "unknown" }],
  ])("returns insufficient_data when %s uniformity is unknown", (_name, evidenceOverride) => {
    const result = evaluateD03DcResistance(
      input({
        conductorEvidence: {
          ...input().conductorEvidence,
          ...(evidenceOverride as Partial<D03UniformConductorEvidence>),
        },
      }),
    );

    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it("does not use a cold resistivity snapshot for a hot conductor", () => {
    const result = evaluateD03DcResistance(
      input({
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          temperatureK: 293.15,
          stateMatch: "cold_or_other_material_state",
        },
      }),
    );

    expect(result.status).toBe("insufficient_data");
    if (result.status !== "insufficient_data") {
      throw new Error("Expected same-state resistivity failure.");
    }
    expect(result.failure.code).toBe("D-03.resistivity_state_mismatch");
    expect(result.failure.message).not.toContain("0.005");
    expect("value" in result).toBe(false);
  });

  it("rejects mismatched material IDs even if the state flag claims a match", () => {
    const result = evaluateD03DcResistance(
      input({
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          materialId: "different-material",
        },
      }),
    );

    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it("publishes the body only when series extras are explicitly unresolved", () => {
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances: null,
        seriesBoundary: {
          completeness: "unknown_or_incomplete",
          referencePlane:
            "terminal_equals_conductor_plus_listed_series_extras",
        },
      }),
    );

    expect(result.status).toBe("success_with_warnings");
    if (result.status !== "success_with_warnings") {
      throw new Error("Expected a body-only D-03 warning result.");
    }
    expectTolId(result.value.RconductorDc.value, 0.005);
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        predicate: "joint resistance is unknown",
      }),
    ]);
    expect(result.value.terminalBoundaryStatus).toBe("unknown_or_incomplete");
    expect(result.value.RterminalDc).toEqual({
      kind: "unavailable",
      quantityId: "Rterminal_dc",
      status: "insufficient_data",
      reason:
        "terminal series-extra resistances are explicitly unknown or incomplete",
    });
    expect(result.value.seriesExtraAggregate).toEqual({
      kind: "unavailable",
      quantityId: "Rseries_extra_sum",
      status: "insufficient_data",
      reason:
        "terminal series-extra resistances are explicitly unknown or incomplete",
    });
    for (const unavailable of [
      result.value.RterminalDc,
      result.value.seriesExtraAggregate,
    ]) {
      expect(unavailable).not.toHaveProperty("value");
      expect(unavailable).not.toHaveProperty("dimensionId");
      expect(unavailable).not.toHaveProperty("canonicalUnitId");
    }
    expect(result.value.seriesExtraBreakdown).toBeNull();
    expect(result.substitution.seriesResolution).toEqual({
      kind: "unavailable",
      status: "insufficient_data",
      reason:
        "terminal series-extra resistances are explicitly unknown or incomplete",
    });
  });

  it("requires null for unresolved extras and an array for a complete boundary", () => {
    const missingArray = { ...input() } as Record<string, unknown>;
    delete missingArray.seriesExtraResistances;
    const missing = evaluateD03DcResistance(missingArray);
    const hiddenEmpty = evaluateD03DcResistance(
      input({
        seriesExtraResistances: [],
        seriesBoundary: {
          completeness: "unknown_or_incomplete",
          referencePlane:
            "terminal_equals_conductor_plus_listed_series_extras",
        },
      }),
    );
    const hiddenNull = evaluateD03DcResistance(
      input({ seriesExtraResistances: null }),
    );

    expect(missing.status).toBe("invalid_input");
    expect(hiddenEmpty.status).toBe("invalid_input");
    expect(hiddenNull.status).toBe("invalid_input");
    expect("value" in missing).toBe(false);
    expect("value" in hiddenEmpty).toBe(false);
    expect("value" in hiddenNull).toBe(false);
  });

  it("requires a non-empty source for every explicit series extra", () => {
    const result = evaluateD03DcResistance(
      input({ seriesExtraResistances: [extra({ sourceRef: "   " })] }),
    );

    expect(result.status).toBe("insufficient_data");
    if (result.status !== "insufficient_data") {
      throw new Error("Expected missing series-extra source failure.");
    }
    expect(result.failure.code).toBe("D-03.series_extra_source_missing");
    expect("value" in result).toBe(false);
  });

  it.each([
    "already_included_or_duplicated",
    "unconfirmed",
  ] as const)("fails closed when series-extra duplication evidence is %s", (duplicationEvidence) => {
    const result = evaluateD03DcResistance(
      input({ seriesExtraResistances: [extra({ duplicationEvidence })] }),
    );

    expect(result.status).toBe(
      duplicationEvidence === "already_included_or_duplicated"
        ? "invalid_input"
        : "insufficient_data",
    );
    expect("value" in result).toBe(false);
  });

  it("rejects duplicate component IDs in the explicit sum", () => {
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances: [
          extra(),
          extra({ resistanceOhm: 1e-4, sourceRef: "case:duplicate" }),
        ],
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected duplicate component failure.");
    }
    expect(result.failure.code).toBe("D-03.series_extra_duplicate");
    expect("value" in result).toBe(false);
  });

  it("rejects a conductor term whose boundary already includes terminal extras", () => {
    const result = evaluateD03DcResistance(
      input({
        conductorEvidence: {
          ...input().conductorEvidence,
          resistanceBoundary:
            "includes_series_extras_or_terminal_measurement",
        },
        seriesExtraResistances: [extra()],
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected duplicate conductor-boundary failure.");
    }
    expect(result.failure.code).toBe("D-03.resistance_boundary_duplicate");
    expect("value" in result).toBe(false);
  });

  it.each([
    ["zero length", { conductorLengthM: 0 }],
    ["negative length", { conductorLengthM: -1 }],
    ["NaN length", { conductorLengthM: Number.NaN }],
    ["infinite length", { conductorLengthM: Number.POSITIVE_INFINITY }],
    ["zero area", { metalAreaM2: 0 }],
    ["negative area", { metalAreaM2: -1 }],
    ["NaN area", { metalAreaM2: Number.NaN }],
    ["infinite area", { metalAreaM2: Number.POSITIVE_INFINITY }],
  ])("rejects %s without a result value", (_name, overrides) => {
    const result = evaluateD03DcResistance(input(overrides));

    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects finite inputs whose conductor equation overflows", () => {
    const result = evaluateD03DcResistance(
      input({
        conductorLengthM: Number.MAX_VALUE,
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          valueOhmM: Number.MAX_VALUE,
        },
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected overflow failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect("value" in result).toBe(false);
  });

  it("fails closed before a positive subnormal rho*length product is magnified by area division", () => {
    const resistivityOhmM = 2 ** -500;
    const conductorLengthM = 3 * 2 ** -575;
    const metalAreaM2 = 2 ** -1022;
    const pollutedNumerator = resistivityOhmM * conductorLengthM;
    const pollutedResistance = pollutedNumerator / metalAreaM2;
    const stableIdentityResistance =
      (resistivityOhmM / metalAreaM2) * conductorLengthM;

    expect(resistivityOhmM).toBeGreaterThanOrEqual(D03_BINARY64_MIN_NORMAL);
    expect(conductorLengthM).toBeGreaterThanOrEqual(D03_BINARY64_MIN_NORMAL);
    expect(metalAreaM2).toBe(D03_BINARY64_MIN_NORMAL);
    expect(pollutedNumerator).toBeGreaterThan(0);
    expect(pollutedNumerator).toBeLessThan(D03_BINARY64_MIN_NORMAL);
    expect(pollutedResistance).toBe(2 ** -51);
    expect(stableIdentityResistance).toBe(3 * 2 ** -53);

    const result = evaluateD03DcResistance(
      input({
        conductorLengthM,
        metalAreaM2,
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          valueOhmM: resistivityOhmM,
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected gradual-underflow failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect(result).not.toHaveProperty("value");
    expect(result).not.toHaveProperty("substitution");
    expect(result).not.toHaveProperty("materialSnapshot");
  });

  it("fails closed when the final rho*length/area resistance is positive subnormal", () => {
    const result = evaluateD03DcResistance(
      input({
        conductorLengthM: 1,
        metalAreaM2: Number.MAX_VALUE,
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          valueOhmM: 1,
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected subnormal resistance failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect("value" in result).toBe(false);
  });

  it("keeps known domain and evidence failures ahead of machine representability", () => {
    const machineAttack = {
      conductorLengthM: 3 * 2 ** -575,
      metalAreaM2: 2 ** -1022,
      resistivitySnapshot: {
        ...input().resistivitySnapshot,
        valueOhmM: 2 ** -500,
      },
    } as const;
    const notApplicable = evaluateD03DcResistance(
      input({
        ...machineAttack,
        conductorEvidence: {
          ...input().conductorEvidence,
          materialDistribution: "spatially_varying",
        },
      }),
    );
    const insufficient = evaluateD03DcResistance(
      input({
        ...machineAttack,
        conductorEvidence: {
          ...input().conductorEvidence,
          metalAreaDistribution: "unknown",
        },
      }),
    );

    expect(notApplicable.status).toBe("not_applicable");
    expect(
      "failure" in notApplicable ? notApplicable.failure.code : null,
    ).toBe("D-03.nonuniform_path_not_applicable");
    expect(insufficient.status).toBe("insufficient_data");
    expect("value" in notApplicable).toBe(false);
    expect("value" in insufficient).toBe(false);
  });

  it("rejects finite extras whose sum or terminal addition overflows", () => {
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances: [
          extra({ resistanceOhm: Number.MAX_VALUE }),
          extra({
            componentId: "joint-02",
            resistanceOhm: Number.MAX_VALUE,
            sourceRef: "measurement:joint-02",
          }),
        ],
      }),
    );

    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects a maximum-length sparse array without allocating by declared length", () => {
    const hugeSparse = new Array(0xffffffff);

    expect(() =>
      evaluateD03DcResistance(
        input({
          seriesExtraResistances:
            hugeSparse as unknown as readonly D03SeriesExtraResistance[],
        }),
      ),
    ).not.toThrow();
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances:
          hugeSparse as unknown as readonly D03SeriesExtraResistance[],
      }),
    );
    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected a sparse-array schema failure.");
    }
    expect(result.failure.code).toBe("D-03.series_extra_array_invalid");
    expect("value" in result).toBe(false);
  });

  it("rejects a positive extra swallowed by the accumulated extra sum", () => {
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances: [
          extra({ resistanceOhm: 1e300 }),
          extra({
            componentId: "joint-small",
            resistanceOhm: 1,
            sourceRef: "measurement:joint-small",
          }),
        ],
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected swallowed extra-sum failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect("value" in result).toBe(false);
  });

  it("rejects positive subnormal extras and loss of an earlier extra to a later term", () => {
    for (const seriesExtraResistances of [
      [extra({ resistanceOhm: Number.MIN_VALUE })],
      [
        extra({ resistanceOhm: 1 }),
        extra({
          componentId: "joint-huge",
          resistanceOhm: 1e300,
          sourceRef: "measurement:joint-huge",
        }),
      ],
    ]) {
      const result = evaluateD03DcResistance(
        input({ seriesExtraResistances }),
      );
      expect(result.status).toBe("invalid_input");
      if (result.status !== "invalid_input") {
        throw new Error("Expected series-extra machine-resolution failure.");
      }
      expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
      expect("value" in result).toBe(false);
    }
  });

  it("rejects a positive extra swallowed by terminal-resistance addition", () => {
    const result = evaluateD03DcResistance(
      input({
        conductorLengthM: 1,
        metalAreaM2: 1,
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          valueOhmM: 1e300,
        },
        seriesExtraResistances: [extra({ resistanceOhm: 1 })],
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected swallowed terminal-addition failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect("value" in result).toBe(false);
  });

  it("rejects a positive conductor resistance swallowed by a huge terminal extra", () => {
    const result = evaluateD03DcResistance(
      input({
        conductorLengthM: 1,
        metalAreaM2: 1,
        resistivitySnapshot: {
          ...input().resistivitySnapshot,
          valueOhmM: 1,
        },
        seriesExtraResistances: [extra({ resistanceOhm: 1e300 })],
      }),
    );

    expect(result.status).toBe("invalid_input");
    if (result.status !== "invalid_input") {
      throw new Error("Expected swallowed conductor-resistance failure.");
    }
    expect(result.failure.code).toBe("D-03.numeric_resolution_invalid");
    expect("value" in result).toBe(false);
  });

  it("fails closed for top-level, nested-record, array, and element accessors", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "conductorLengthM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const snapshotAccessor = Object.defineProperty(
      { ...input().resistivitySnapshot },
      "valueOhmM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute snapshot accessor");
        },
      },
    );
    const arrayAccessor: unknown[] = [extra()];
    Object.defineProperty(arrayAccessor, "0", {
      enumerable: true,
      get() {
        throw new Error("must not execute array accessor");
      },
    });
    const elementAccessor = Object.defineProperty(
      { ...extra() },
      "resistanceOhm",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute element accessor");
        },
      },
    );

    for (const candidate of [
      topLevelAccessor,
      input({ resistivitySnapshot: snapshotAccessor as never }),
      input({ seriesExtraResistances: arrayAccessor as never }),
      input({ seriesExtraResistances: [elementAccessor as never] }),
    ]) {
      expect(() => evaluateD03DcResistance(candidate)).not.toThrow();
      const result = evaluateD03DcResistance(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed for hostile top-level, nested-record, array, and element proxies", () => {
    const hostile = <T extends object>(target: T): T =>
      new Proxy(target, {
        ownKeys() {
          throw new Error("hostile ownKeys trap");
        },
      });

    for (const candidate of [
      hostile(input()),
      input({ resistivitySnapshot: hostile(input().resistivitySnapshot) }),
      input({
        conductorEvidence: hostile(input().conductorEvidence),
      }),
      input({ seriesExtraResistances: hostile([extra()]) }),
      input({ seriesExtraResistances: [hostile(extra())] }),
      input({ seriesBoundary: hostile(input().seriesBoundary) }),
    ]) {
      expect(() => evaluateD03DcResistance(candidate)).not.toThrow();
      const result = evaluateD03DcResistance(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("rejects hostile strings without coercion", () => {
    const hostileStringLike = {
      toString() {
        throw new Error("must not coerce identifiers or sources");
      },
    };
    const result = evaluateD03DcResistance(
      input({
        seriesExtraResistances: [
          extra({ sourceRef: hostileStringLike as unknown as string }),
        ],
      }),
    );

    expect(() => evaluateD03DcResistance(result)).not.toThrow();
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
  });

  it("deep-freezes the successful engineering evidence and breakdown", () => {
    const result = requireSuccess(
      evaluateD03DcResistance(input({ seriesExtraResistances: [extra()] })),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.RconductorDc)).toBe(true);
    expect(Object.isFrozen(result.value.RterminalDc)).toBe(true);
    expect(Object.isFrozen(result.value.seriesExtraAggregate)).toBe(true);
    expect(Object.isFrozen(result.value.seriesExtraBreakdown)).toBe(true);
    expect(Object.isFrozen(result.value.seriesExtraBreakdown[0])).toBe(true);
    expect(Object.isFrozen(result.materialSnapshot)).toBe(true);
    expect(Object.isFrozen(result.conductorEvidence)).toBe(true);
    expect(Object.isFrozen(result.seriesBoundary)).toBe(true);
  });
});
