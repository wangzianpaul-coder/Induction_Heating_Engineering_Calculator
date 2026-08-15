import { describe, expect, it } from "vitest";

import {
  D06_BINARY64_MIN_NORMAL,
  D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING,
  D06_IMPLEMENTATION_READINESS,
  D06_NUMERIC_REPRESENTABILITY_POLICY,
  D06_WARNING_PREDICATES,
  evaluateD06CurrentDensityAndCopperLoss,
  type D06CurrentDensityAndCopperLossInput,
  type D06EffectiveAreaEvidence,
  type D06RacEvidence,
} from "../../../src/methods/D/d06CurrentDensityAndCopperLoss.js";
import { toCanonicalSI } from "../../../src/units/conversion.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"a".repeat(64)}`;
const OTHER_GEOMETRY_SNAPSHOT_ID = `geometry:${"b".repeat(64)}`;

const matchingRac = Object.freeze({
  resistanceOhm: 0.01,
  source: "F-02_same_state_measurement",
  sourceOutcome: "success",
  sourceResultId: "f02-result-001",
  derivationBasis: "independent_resistance_result",
  resistanceBoundaryId: "coil-copper-loss-boundary-v1",
  deembeddingBoundaryId: "coil-copper-deembedded-boundary-v1",
  copperLossBoundaryConfirmed: true,
  currentBasis: "rms",
  coilMeanTemperatureK: 333.15,
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  frequencyHz: 20_000,
  portId: "coil_terminal",
  referencePlane: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
} as const satisfies D06RacEvidence);

const matchingEffectiveArea = Object.freeze({
  effectiveAreaM2: 5e-5,
  source: "D-05_approved_estimate",
  sourceOutcome: "success_with_warnings",
  sourceResultId: "d05-screening-001",
  currentBasis: "rms",
  coilMeanTemperatureK: 333.15,
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  frequencyHz: 20_000,
  portId: "coil_terminal",
  referencePlane: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
} as const satisfies D06EffectiveAreaEvidence);

function input(
  overrides: Partial<D06CurrentDensityAndCopperLossInput> = {},
): D06CurrentDensityAndCopperLossInput {
  return {
    currentRmsA: 2_000,
    currentBasis: "rms",
    coilMeanTemperatureK: 333.15,
    geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
    frequencyHz: 20_000,
    portId: "coil_terminal",
    referencePlane: "coil-lead-deembedded-plane",
    loadedState: "workpiece_hot",
    metalAreaM2: 2e-4,
    rac: matchingRac,
    effectiveArea: matchingEffectiveArea,
    ...overrides,
  };
}

function successful(
  candidate: D06CurrentDensityAndCopperLossInput,
) {
  const result = evaluateD06CurrentDensityAndCopperLoss(candidate);
  expect(result.status).toMatch(/^success/);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(
      "failure" in result && result.failure !== undefined
        ? result.failure.message
        : `unexpected D-06 status: ${result.status}`,
    );
  }
  return result;
}

describe("D-06 current density and copper loss", () => {
  it("is isolated from the runtime public API until formal activation", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateD06CurrentDensityAndCopperLoss" in publicApi).toBe(false);
    expect(
      "D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING" in publicApi,
    ).toBe(false);
  });

  it("maps exactly to the frozen registry, ID-OHM-02, and ELEC-PCU-001", () => {
    expect(D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING).toMatchObject({
      methodId: "D-06",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#D-06:Equation",
      sourceRefs: ["ID-OHM-02"],
      derivationRefs: ["ID-OHM-02"],
      validationCaseIds: ["EXP-RAC-001"],
      methodCheckIds: ["ELEC-PCU-001"],
      outputQuantityIds: ["Jdc", "J_eff", "Pcu"],
      stableWarningIds: [],
      implementationReadiness: {
        implementationStatus: "isolated_not_runtime_activated",
        activationStatus: "non_activatable",
        blockingGate: "parameter_dictionary_conflict",
      },
    });
    expect(
      D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING.contractSourceRefs,
    ).toEqual([
      "ID-OHM-02",
      "D-05 or F-02 same-state Rac provenance required",
    ]);
    expect(Object.values(D06_WARNING_PREDICATES)).toEqual([
      "peak current is used as RMS",
      "Aeff is not approved",
      "Rac is back-calculated from the same Pcu and creates a cycle",
      "a local peak is labelled an average",
    ]);
    expect(D06_IMPLEMENTATION_READINESS).toEqual({
      implementationStatus: "isolated_not_runtime_activated",
      activationStatus: "non_activatable",
      blockingGate: "parameter_dictionary_conflict",
      conflict: {
        parameterIds: ["frequency", "coil.mean_temperature"],
        frequencyDeclaresD06Consumer: false,
        coilMeanTemperatureDeclaresD06Consumer: true,
        requiredResolution:
          "Resolve the controlled parameter dictionary before runtime activation; do not edit it from D-06.",
      },
    });
    expect(Object.isFrozen(D06_IMPLEMENTATION_READINESS)).toBe(true);
    expect(Object.isFrozen(D06_IMPLEMENTATION_READINESS.conflict)).toBe(true);
  });

  it("passes the ELEC-PCU-001 canonical-SI identity", () => {
    const result = successful(input());
    expect(result.status).toBe("success");
    expect(result.value.Jdc).toMatchObject({
      kind: "available",
      outputId: "Jdc",
      status: "available",
      valueSi: 1e7,
      dimensionId: "electric_current_density",
      canonicalUnitId: "A_per_m2",
      isLocalPeak: false,
    });
    expect(result.value.J_eff).toMatchObject({
      kind: "available",
      outputId: "J_eff",
      status: "available",
      valueSi: 4e7,
      dimensionId: "electric_current_density",
      canonicalUnitId: "A_per_m2",
      isLocalPeak: false,
    });
    expect(result.value.Pcu).toMatchObject({
      kind: "available",
      outputId: "Pcu",
      status: "available",
      valueSi: 40_000,
      dimensionId: "power",
      canonicalUnitId: "W",
    });
    expect(result.racEvidence.source).toBe("F-02_same_state_measurement");
    expect(result.electricalState).toEqual({
      currentBasis: "rms",
      coilMeanTemperatureK: 333.15,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
      frequencyHz: 20_000,
      portId: "coil_terminal",
      referencePlane: "coil-lead-deembedded-plane",
      loadedState: "workpiece_hot",
    });
    expect(result.racEvidence).toMatchObject({
      resistanceBoundaryId: "coil-copper-loss-boundary-v1",
      deembeddingBoundaryId: "coil-copper-deembedded-boundary-v1",
      copperLossBoundaryConfirmed: true,
    });
    expect(result.methodCheckIds).toEqual(["ELEC-PCU-001"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Pcu)).toBe(true);
  });

  it("accepts a successful D-05 approved Rac estimate at the same state", () => {
    const result = successful(
      input({
        currentBasis: "fundamental_rms",
        rac: {
          ...matchingRac,
          currentBasis: "fundamental_rms",
          source: "D-05_approved_estimate",
          sourceOutcome: "success_with_warnings",
          sourceResultId: "d05-rac-screening-001",
        },
        effectiveArea: {
          ...matchingEffectiveArea,
          currentBasis: "fundamental_rms",
        },
      }),
    );
    expect(result.electricalState.currentBasis).toBe("fundamental_rms");
    expect(result.racEvidence.source).toBe("D-05_approved_estimate");
    expect(result.value.Pcu.valueSi).toBe(40_000);
  });

  it("uses the unit layer at the boundary and retains canonical-SI dimensions", () => {
    const result = successful(
      input({
        currentRmsA: toCanonicalSI(2, "kA", "electric_current"),
        metalAreaM2: toCanonicalSI(200, "mm2", "area"),
        rac: {
          ...matchingRac,
          resistanceOhm: toCanonicalSI(
            10,
            "milliohm",
            "electrical_resistance",
          ),
        },
      }),
    );
    expect(result.value.Jdc.valueSi).toBeCloseTo(1e7, 15);
    expect(result.value.Pcu.valueSi).toBeCloseTo(40_000, 15);
  });

  it("obeys current, area, and resistance scaling identities", () => {
    const base = successful(input());
    const currentScaled = successful(input({ currentRmsA: 6_000 }));
    const metalAreaScaled = successful(input({ metalAreaM2: 8e-4 }));
    const resistanceScaled = successful(
      input({ rac: { ...matchingRac, resistanceOhm: 0.05 } }),
    );
    const effectiveAreaScaled = successful(
      input({
        effectiveArea: {
          ...matchingEffectiveArea,
          effectiveAreaM2: 2e-4,
        },
      }),
    );

    expect(currentScaled.value.Jdc.valueSi).toBeCloseTo(
      3 * base.value.Jdc.valueSi,
      15,
    );
    expect(currentScaled.value.Pcu.valueSi).toBeCloseTo(
      9 * base.value.Pcu.valueSi,
      15,
    );
    expect(metalAreaScaled.value.Jdc.valueSi).toBeCloseTo(
      base.value.Jdc.valueSi / 4,
      15,
    );
    expect(metalAreaScaled.value.Pcu.valueSi).toBe(base.value.Pcu.valueSi);
    expect(resistanceScaled.value.Pcu.valueSi).toBeCloseTo(
      5 * base.value.Pcu.valueSi,
      15,
    );
    expect(effectiveAreaScaled.value.J_eff.kind).toBe("available");
    expect(base.value.J_eff.kind).toBe("available");
    if (
      effectiveAreaScaled.value.J_eff.kind === "available" &&
      base.value.J_eff.kind === "available"
    ) {
      expect(effectiveAreaScaled.value.J_eff.valueSi).toBeCloseTo(
        base.value.J_eff.valueSi / 4,
        15,
      );
    }
  });

  it("treats I=0 as a valid exact analytical limit", () => {
    const result = successful(input({ currentRmsA: 0 }));
    expect(result.value.Jdc.valueSi).toBe(0);
    expect(result.value.J_eff.kind).toBe("available");
    if (result.value.J_eff.kind === "available") {
      expect(result.value.J_eff.valueSi).toBe(0);
    }
    expect(result.value.Pcu.valueSi).toBe(0);
  });

  it("preserves the exact I>0, Rac=0 analytical limit Pcu=0", () => {
    const result = successful(
      input({
        currentRmsA: 2_000,
        rac: { ...matchingRac, resistanceOhm: 0 },
      }),
    );
    expect(result.value.Jdc.valueSi).toBe(1e7);
    expect(result.value.Pcu.valueSi).toBe(0);
  });

  it("does not impose an invented universal upper limit on average density", () => {
    const result = successful(
      input({ currentRmsA: 1e6, metalAreaM2: 1e-8 }),
    );
    expect(result.value.Jdc.valueSi).toBe(1e14);
  });

  it("publishes J_eff as unavailable without value or unit placeholders when Aeff is absent", () => {
    const result = successful(input({ effectiveArea: null }));
    expect(result.status).toBe("success");
    expect(result.value.J_eff).toEqual({
      kind: "unavailable",
      outputId: "J_eff",
      status: "insufficient_data",
      reason:
        "No D-05 effective-area result was supplied; D-06 does not infer Aeff.",
    });
    expect("valueSi" in result.value.J_eff).toBe(false);
    expect("dimensionId" in result.value.J_eff).toBe(false);
    expect("canonicalUnitId" in result.value.J_eff).toBe(false);
    expect(result.substitution.effectiveAreaM2).toBeNull();
  });

  it.each([
    [
      "unapproved source",
      { ...matchingEffectiveArea, source: "other_or_unapproved" },
      "insufficient_data",
    ],
    [
      "failed D-05 result",
      {
        ...matchingEffectiveArea,
        sourceOutcome: "failure_or_unavailable",
      },
      "insufficient_data",
    ],
    [
      "current-basis mismatch",
      { ...matchingEffectiveArea, currentBasis: "fundamental_rms" },
      "not_applicable",
    ],
    [
      "coil-temperature mismatch",
      { ...matchingEffectiveArea, coilMeanTemperatureK: 343.15 },
      "not_applicable",
    ],
    [
      "geometry-snapshot mismatch",
      {
        ...matchingEffectiveArea,
        geometrySnapshotId: OTHER_GEOMETRY_SNAPSHOT_ID,
      },
      "not_applicable",
    ],
    [
      "frequency mismatch",
      { ...matchingEffectiveArea, frequencyHz: 30_000 },
      "not_applicable",
    ],
    [
      "port mismatch",
      { ...matchingEffectiveArea, portId: "inverter_output" },
      "not_applicable",
    ],
    [
      "reference-plane mismatch",
      { ...matchingEffectiveArea, referencePlane: "inverter-output-plane" },
      "not_applicable",
    ],
    [
      "loaded-state mismatch",
      { ...matchingEffectiveArea, loadedState: "workpiece_cold" },
      "not_applicable",
    ],
  ] as const)(
    "withholds J_eff for %s while preserving independent Jdc and Pcu",
    (_name, effectiveArea, expectedOutputStatus) => {
      const result = successful(
        input({
          effectiveArea:
            effectiveArea as unknown as D06EffectiveAreaEvidence,
        }),
      );
      expect(result.status).toBe("success_with_warnings");
      expect(result.value.J_eff.kind).toBe("unavailable");
      if (result.value.J_eff.kind === "unavailable") {
        expect(result.value.J_eff.status).toBe(expectedOutputStatus);
        expect("valueSi" in result.value.J_eff).toBe(false);
        expect("canonicalUnitId" in result.value.J_eff).toBe(false);
      }
      expect(result.value.Jdc.valueSi).toBe(1e7);
      expect(result.value.Pcu.valueSi).toBe(40_000);
      expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
        "Aeff is not approved",
      ]);
    },
  );

  it("rejects peak-as-RMS and full-wave RMS without emitting a result", () => {
    const peak = evaluateD06CurrentDensityAndCopperLoss(
      input({ currentBasis: "peak" }),
    );
    expect(peak.status).toBe("invalid_input");
    expect("value" in peak).toBe(false);
    expect(peak.warnings.map((candidate) => candidate.predicate)).toEqual([
      "peak current is used as RMS",
    ]);

    const fullWave = evaluateD06CurrentDensityAndCopperLoss(
      input({ currentBasis: "full_wave_rms" }),
    );
    expect(fullWave.status).toBe("not_applicable");
    expect("value" in fullWave).toBe(false);
  });

  it("rejects a Rac circularly back-calculated from the same Pcu", () => {
    const result = evaluateD06CurrentDensityAndCopperLoss(
      input({
        rac: {
          ...matchingRac,
          derivationBasis: "back_calculated_from_same_pcu",
        },
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect(result.warnings.map((candidate) => candidate.predicate)).toEqual([
      "Rac is back-calculated from the same Pcu and creates a cycle",
    ]);
  });

  it.each([
    [
      "loaded-port total resistance",
      {
        ...matchingRac,
        resistanceBoundaryId: "loaded-port-total-resistance",
        copperLossBoundaryConfirmed: false,
      },
    ],
    [
      "blank resistance boundary ID",
      { ...matchingRac, resistanceBoundaryId: "" },
    ],
    [
      "blank de-embedding boundary ID",
      { ...matchingRac, deembeddingBoundaryId: "   " },
    ],
  ] as const)("rejects Rac with %s", (_name, rac) => {
    const result = evaluateD06CurrentDensityAndCopperLoss(
      input({ rac: rac as unknown as D06RacEvidence }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    if ("failure" in result) {
      expect(result.failure.code).toBe("D-06.rac_evidence_invalid");
    }
  });

  it.each([
    [
      "unapproved source",
      { ...matchingRac, source: "other_or_unapproved" },
      "insufficient_data",
    ],
    [
      "failed source result",
      { ...matchingRac, sourceOutcome: "failure_or_unavailable" },
      "insufficient_data",
    ],
    [
      "current-basis mismatch",
      { ...matchingRac, currentBasis: "fundamental_rms" },
      "not_applicable",
    ],
    [
      "coil-temperature mismatch",
      { ...matchingRac, coilMeanTemperatureK: 343.15 },
      "not_applicable",
    ],
    [
      "geometry-snapshot mismatch",
      { ...matchingRac, geometrySnapshotId: OTHER_GEOMETRY_SNAPSHOT_ID },
      "not_applicable",
    ],
    [
      "frequency mismatch",
      { ...matchingRac, frequencyHz: 30_000 },
      "not_applicable",
    ],
    [
      "port mismatch",
      { ...matchingRac, portId: "grid_input" },
      "not_applicable",
    ],
    [
      "reference-plane mismatch",
      { ...matchingRac, referencePlane: "grid-input-plane" },
      "not_applicable",
    ],
    [
      "loaded-state mismatch",
      { ...matchingRac, loadedState: "workpiece_cold" },
      "not_applicable",
    ],
  ] as const)("fails closed for Rac %s", (_name, rac, expectedStatus) => {
    const result = evaluateD06CurrentDensityAndCopperLoss(
      input({ rac: rac as unknown as D06RacEvidence }),
    );
    expect(result.status).toBe(expectedStatus);
    expect("value" in result).toBe(false);
  });

  it.each([
    ["negative current", { currentRmsA: -1 }],
    ["NaN current", { currentRmsA: Number.NaN }],
    ["infinite current", { currentRmsA: Number.POSITIVE_INFINITY }],
    ["zero metal area", { metalAreaM2: 0 }],
    ["negative metal area", { metalAreaM2: -1 }],
    ["infinite metal area", { metalAreaM2: Number.POSITIVE_INFINITY }],
    ["zero coil mean temperature", { coilMeanTemperatureK: 0 }],
    ["infinite coil mean temperature", { coilMeanTemperatureK: Infinity }],
    ["invalid geometry snapshot", { geometrySnapshotId: "geometry:legacy" }],
    ["zero frequency", { frequencyHz: 0 }],
    ["blank port", { portId: "" }],
    ["blank reference plane", { referencePlane: " " }],
  ])("rejects %s without a numeric result", (_name, overrides) => {
    const result = evaluateD06CurrentDensityAndCopperLoss(input(overrides));
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it.each([
    ["wrong snapshot kind", `material:${"a".repeat(64)}`],
    ["short digest", `geometry:${"a".repeat(63)}`],
    ["uppercase digest", `geometry:${"A".repeat(64)}`],
  ] as const)(
    "strictly rejects %s at input, Rac, and Aeff geometry boundaries",
    (_name, geometrySnapshotId) => {
      const candidates = [
        input({ geometrySnapshotId }),
        input({
          rac: {
            ...matchingRac,
            geometrySnapshotId,
          },
        }),
        input({
          effectiveArea: {
            ...matchingEffectiveArea,
            geometrySnapshotId,
          },
        }),
      ];

      for (const candidate of candidates) {
        expect(() =>
          evaluateD06CurrentDensityAndCopperLoss(candidate),
        ).not.toThrow();
        const result = evaluateD06CurrentDensityAndCopperLoss(candidate);
        expect(result.status).toBe("invalid_input");
        expect("value" in result).toBe(false);
      }
    },
  );

  it.each([
    ["negative Rac", { ...matchingRac, resistanceOhm: -1 }],
    ["NaN Rac", { ...matchingRac, resistanceOhm: Number.NaN }],
    [
      "infinite Rac",
      { ...matchingRac, resistanceOhm: Number.POSITIVE_INFINITY },
    ],
  ])("rejects %s evidence", (_name, rac) => {
    const result = evaluateD06CurrentDensityAndCopperLoss(
      input({ rac: rac as D06RacEvidence }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects non-finite or non-positive supplied Aeff evidence", () => {
    for (const effectiveAreaM2 of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const result = evaluateD06CurrentDensityAndCopperLoss(
        input({
          effectiveArea: {
            ...matchingEffectiveArea,
            effectiveAreaM2,
          },
        }),
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed when representable inputs overflow mandatory or optional equations", () => {
    for (const candidate of [
      input({ currentRmsA: Number.MAX_VALUE }),
      input({ currentRmsA: 1, metalAreaM2: Number.MIN_VALUE }),
      input({
        currentRmsA: 1,
        effectiveArea: {
          ...matchingEffectiveArea,
          effectiveAreaM2: Number.MIN_VALUE,
        },
      }),
    ]) {
      const result = evaluateD06CurrentDensityAndCopperLoss(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      if ("failure" in result) {
        expect(result.failure.code).toBe("D-06.numeric_resolution_invalid");
      }
    }
  });

  it("fails closed when positive analytical terms underflow to binary64 zero", () => {
    const underflowCases = [
      [
        "I squared",
        input({
          currentRmsA: Number.MIN_VALUE,
          metalAreaM2: Number.MIN_VALUE,
          rac: { ...matchingRac, resistanceOhm: 0 },
          effectiveArea: null,
        }),
      ],
      [
        "Jdc through a very large metal area",
        input({
          currentRmsA: 1e-160,
          metalAreaM2: Number.MAX_VALUE,
          rac: { ...matchingRac, resistanceOhm: 0 },
          effectiveArea: null,
        }),
      ],
      [
        "Pcu from positive I squared and Rac",
        input({
          currentRmsA: 1e-100,
          metalAreaM2: 1,
          rac: { ...matchingRac, resistanceOhm: 1e-200 },
          effectiveArea: null,
        }),
      ],
      [
        "J_eff through a very large effective area",
        input({
          currentRmsA: 1e-160,
          metalAreaM2: 1e-200,
          rac: { ...matchingRac, resistanceOhm: 0 },
          effectiveArea: {
            ...matchingEffectiveArea,
            effectiveAreaM2: Number.MAX_VALUE,
          },
        }),
      ],
    ] as const;

    for (const [name, candidate] of underflowCases) {
      const result = evaluateD06CurrentDensityAndCopperLoss(candidate);
      expect(result.status, name).toBe("invalid_input");
      expect("value" in result, name).toBe(false);
      if ("failure" in result) {
        expect(result.failure.code, name).toBe(
          "D-06.numeric_resolution_invalid",
        );
      }
    }
  });

  it("fails closed when a positive subnormal I squared term is magnified into a plausible normal copper loss", () => {
    const currentRmsA = 2.5e-162;
    const resistanceOhm = 1e308;
    const contaminatedCurrentSquared = currentRmsA * currentRmsA;
    const contaminatedPcu = contaminatedCurrentSquared * resistanceOhm;
    const stableIdentityOracle = (currentRmsA * resistanceOhm) * currentRmsA;

    expect(contaminatedCurrentSquared).toBeGreaterThan(0);
    expect(contaminatedCurrentSquared).toBeLessThan(D06_BINARY64_MIN_NORMAL);
    expect(Number.isFinite(contaminatedPcu)).toBe(true);
    expect(Number.isFinite(stableIdentityOracle)).toBe(true);
    expect(contaminatedPcu).not.toBe(stableIdentityOracle);

    const result = evaluateD06CurrentDensityAndCopperLoss(
      input({
        currentRmsA,
        metalAreaM2: 1,
        rac: { ...matchingRac, resistanceOhm },
        effectiveArea: null,
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-06.numeric_resolution_invalid" },
    });
    expect("value" in result).toBe(false);
    expect("substitution" in result).toBe(false);
  });

  it("records the binary64 guard as a machine-only, non-engineering policy", () => {
    expect(D06_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalIntermediatePolicy: "fail_closed",
      sourceEquationRearranged: false,
      minimumPositiveNormal: D06_BINARY64_MIN_NORMAL,
    });
    expect(
      D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING.numericRepresentabilityPolicy,
    ).toBe(D06_NUMERIC_REPRESENTABILITY_POLICY);
    const result = successful(input());
    expect(result.numericRepresentabilityPolicy).toBe(
      D06_NUMERIC_REPRESENTABILITY_POLICY,
    );
  });

  it("fails closed without executing top-level or nested accessors and reflection traps", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "currentRmsA",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topLevelProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys trap");
      },
    });
    const racAccessor = Object.defineProperty(
      { ...matchingRac },
      "resistanceOhm",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute Rac accessor");
        },
      },
    );
    const racProxy = new Proxy(matchingRac, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile Rac descriptor trap");
      },
    });
    const aeffAccessor = Object.defineProperty(
      { ...matchingEffectiveArea },
      "effectiveAreaM2",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute Aeff accessor");
        },
      },
    );
    const aeffProxy = new Proxy(matchingEffectiveArea, {
      getPrototypeOf() {
        throw new Error("hostile Aeff prototype trap");
      },
    });

    for (const candidate of [
      topLevelAccessor,
      topLevelProxy,
      input({ rac: racAccessor as unknown as D06RacEvidence }),
      input({ rac: racProxy }),
      input({
        effectiveArea: aeffAccessor as unknown as D06EffectiveAreaEvidence,
      }),
      input({ effectiveArea: aeffProxy }),
    ]) {
      expect(() =>
        evaluateD06CurrentDensityAndCopperLoss(
          candidate as D06CurrentDensityAndCopperLossInput,
        ),
      ).not.toThrow();
      const result = evaluateD06CurrentDensityAndCopperLoss(
        candidate as D06CurrentDensityAndCopperLossInput,
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("does not invoke hostile enum coercion or a Proxy get trap", () => {
    const hostileEnum = Object.freeze({
      toString() {
        throw new Error("must not coerce enum");
      },
    });
    const hostileBasis = input({
      currentBasis: hostileEnum as unknown as "rms",
    });
    expect(() =>
      evaluateD06CurrentDensityAndCopperLoss(hostileBasis),
    ).not.toThrow();
    expect(evaluateD06CurrentDensityAndCopperLoss(hostileBasis).status).toBe(
      "invalid_input",
    );

    const getTrapRac = new Proxy(matchingRac, {
      get() {
        throw new Error("must not read through Proxy get trap");
      },
    });
    expect(() =>
      evaluateD06CurrentDensityAndCopperLoss(input({ rac: getTrapRac })),
    ).not.toThrow();
    expect(
      evaluateD06CurrentDensityAndCopperLoss(input({ rac: getTrapRac }))
        .status,
    ).toBe("success");
  });

  it("fails closed without coercing every same-state and Rac-boundary field", () => {
    const hostileValue = Object.freeze({
      valueOf() {
        throw new Error("must not coerce hostile state value");
      },
      toString() {
        throw new Error("must not stringify hostile state value");
      },
    });
    const sameStateFields = [
      "currentBasis",
      "coilMeanTemperatureK",
      "geometrySnapshotId",
      "frequencyHz",
      "portId",
      "referencePlane",
      "loadedState",
    ] as const;

    const candidates: D06CurrentDensityAndCopperLossInput[] = [];
    for (const field of sameStateFields) {
      candidates.push({
        ...input(),
        [field]: hostileValue,
      } as unknown as D06CurrentDensityAndCopperLossInput);
      candidates.push(
        input({
          rac: {
            ...matchingRac,
            [field]: hostileValue,
          } as unknown as D06RacEvidence,
        }),
      );
      candidates.push(
        input({
          effectiveArea: {
            ...matchingEffectiveArea,
            [field]: hostileValue,
          } as unknown as D06EffectiveAreaEvidence,
        }),
      );
    }
    for (const field of [
      "resistanceBoundaryId",
      "deembeddingBoundaryId",
      "copperLossBoundaryConfirmed",
    ] as const) {
      candidates.push(
        input({
          rac: {
            ...matchingRac,
            [field]: hostileValue,
          } as unknown as D06RacEvidence,
        }),
      );
    }

    for (const candidate of candidates) {
      expect(() =>
        evaluateD06CurrentDensityAndCopperLoss(candidate),
      ).not.toThrow();
      const result = evaluateD06CurrentDensityAndCopperLoss(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("rejects extra fields rather than silently accepting legacy inputs", () => {
    const result = evaluateD06CurrentDensityAndCopperLoss({
      ...input(),
      legacyCopperLossKw: 123.456,
    } as D06CurrentDensityAndCopperLossInput);
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });
});
