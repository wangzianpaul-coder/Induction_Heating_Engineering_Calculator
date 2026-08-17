import { describe, expect, it, vi } from "vitest";

import {
  MVP_J03_CALCULATION_SCOPE,
  calculateMvpJ03,
  type MvpJ03CalculationInput,
} from "../../src/application/mvpRadiationCalculations.js";
import { J03_STEFAN_BOLTZMANN_W_PER_M2_K4 } from "../../src/methods/J/j03GrayBodyRadiation.js";

const MATERIAL_1 = `material:${"a".repeat(64)}`;
const MATERIAL_2 = `material:${"b".repeat(64)}`;
const GEOMETRY = `geometry:${"c".repeat(64)}`;

function largeInput(): MvpJ03CalculationInput {
  return {
    methodId: "J-03",
    configuration: "radiation_to_large_surroundings",
    surface1: {
      temperatureK: 500,
      emissivity: 0.8,
      areaM2: 2,
      materialSnapshotId: MATERIAL_1,
      emissivitySourceRef: "datasheet:surface-1:emissivity:500K",
      emissivityStateTemperatureK: 500,
    },
    counterpart: {
      kind: "large_surroundings",
      temperatureK: 300,
    },
    boundaryEvidence: {
      geometrySnapshotId: GEOMETRY,
      snapshotConfiguration: "radiation_to_large_surroundings",
      snapshotSurface1AreaM2: 2,
      snapshotSurface2AreaM2: null,
      temperatureScale: "absolute_kelvin",
      diffuseGraySurfacesConfirmed: true,
      viewFactor: 1,
      noUnmodelledOpeningsOrObstructionsConfirmed: true,
      longConcentricEndEffectsNegligible: null,
      surface1IsInnerSurface: null,
    },
  };
}

function concentricInput(): MvpJ03CalculationInput {
  return {
    methodId: "J-03",
    configuration: "long_concentric_two_gray_surfaces",
    surface1: {
      temperatureK: 500,
      emissivity: 0.8,
      areaM2: 2,
      materialSnapshotId: MATERIAL_1,
      emissivitySourceRef: "datasheet:surface-1:emissivity:500K",
      emissivityStateTemperatureK: 500,
    },
    counterpart: {
      kind: "concentric_outer_surface",
      temperatureK: 300,
      emissivity: 0.6,
      areaM2: 4,
      materialSnapshotId: MATERIAL_2,
      emissivitySourceRef: "datasheet:surface-2:emissivity:300K",
      emissivityStateTemperatureK: 300,
    },
    boundaryEvidence: {
      geometrySnapshotId: GEOMETRY,
      snapshotConfiguration: "long_concentric_two_gray_surfaces",
      snapshotSurface1AreaM2: 2,
      snapshotSurface2AreaM2: 4,
      temperatureScale: "absolute_kelvin",
      diffuseGraySurfacesConfirmed: true,
      viewFactor: 1,
      noUnmodelledOpeningsOrObstructionsConfirmed: true,
      longConcentricEndEffectsNegligible: true,
      surface1IsInnerSurface: true,
    },
  };
}

describe("runnable gray-body radiation application adapter", () => {
  it("calculates radiation to large surroundings with explicit source and boundary evidence", () => {
    const input = largeInput();
    const result = calculateMvpJ03(input);
    const expected =
      0.8 *
      J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
      2 *
      (500 ** 4 - 300 ** 4);

    expect(result).toMatchObject({
      methodId: "J-03",
      approvalStatus: "approved",
      formalRuntimeActivationClaim: false,
      status: "success",
      failure: null,
      applicability: { status: "in_domain" },
    });
    expect(result.outputs.find((item) => item.outputId === "radiative_heat_rate"))
      .toMatchObject({ value: expected, canonicalUnit: "W" });
    expect(result.outputs.find((item) => item.outputId === "radiation_network_factor"))
      .toMatchObject({ value: 0.8, canonicalUnit: "one" });
    expect(result.warnings).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(MVP_J03_CALCULATION_SCOPE.formalRuntimeActivationClaim).toBe(false);
  });

  it("calculates the full concentric two-gray-surface network", () => {
    const result = calculateMvpJ03(concentricInput());
    const denominator = 1 / 0.8 + (2 / 4) * (1 / 0.6 - 1);
    const expected =
      (J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        (500 ** 4 - 300 ** 4)) /
      denominator;

    expect(result.status).toBe("success");
    expect(result.outputs.find((item) => item.outputId === "radiative_heat_rate")?.value)
      .toBeCloseTo(expected, 11);
    expect(result.outputs.find((item) => item.outputId === "radiation_network_factor")?.value)
      .toBeCloseTo(1 / denominator, 15);
  });

  it("publishes Chinese-first labels and source titles without ordinary trace identifiers", () => {
    const result = calculateMvpJ03(largeInput());
    const publicPresentation = JSON.stringify({
      outputs: result.outputs,
      warnings: result.warnings,
      sourceTitles: result.sourceTitles,
      applicability: result.applicability,
      assumptions: result.assumptions,
    });

    expect(result.outputs[0]?.label.zh).toBe("净辐射换热量");
    expect(result.sourceTitles.every((source) => source.title.zh.length > 0)).toBe(true);
    expect(publicPresentation).not.toMatch(/(?:ADR|DER|ID-[A-Z]|J-03)/u);
    expect(publicPresentation).toContain("正值表示热量由表面 1");
  });

  it("fails closed when material, property, or boundary evidence is missing", () => {
    const missingBoundary = calculateMvpJ03({
      ...largeInput(),
      boundaryEvidence: null,
    } as unknown as MvpJ03CalculationInput);
    expect(missingBoundary).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "J-03.boundary_evidence_schema_invalid" },
    });

    const baseNoSource = largeInput();
    const noEmissivitySource = {
      ...baseNoSource,
      surface1: {
        ...baseNoSource.surface1,
        emissivitySourceRef: "",
      },
    };
    expect(calculateMvpJ03(noEmissivitySource)).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "J-03.emissivity_provenance_invalid" },
    });

    const baseStateMismatch = largeInput();
    const stateMismatch = {
      ...baseStateMismatch,
      surface1: {
        ...baseStateMismatch.surface1,
        emissivityStateTemperatureK: 300,
      },
    };
    expect(calculateMvpJ03(stateMismatch)).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "J-03.emissivity_state_mismatch" },
    });
  });

  it("preserves exact zero, numeric limits, and unsupported-boundary failures", () => {
    const equalTemperature = {
      ...largeInput(),
      counterpart: {
        kind: "large_surroundings" as const,
        temperatureK: 500,
      },
    };
    const zero = calculateMvpJ03(equalTemperature);
    expect(zero.status).toBe("success");
    expect(zero.outputs.find((item) => item.outputId === "radiative_heat_rate")?.value)
      .toBe(0);

    const baseInvalidEmissivity = largeInput();
    const invalidEmissivity = {
      ...baseInvalidEmissivity,
      surface1: {
        ...baseInvalidEmissivity.surface1,
        emissivity: 0,
      },
    };
    expect(calculateMvpJ03(invalidEmissivity)).toMatchObject({
      status: "invalid_input",
      outputs: [],
    });

    const baseOverflow = largeInput();
    const overflow = {
      ...baseOverflow,
      surface1: {
        ...baseOverflow.surface1,
        temperatureK: 1e200,
        emissivityStateTemperatureK: 1e200,
      },
    };
    expect(calculateMvpJ03(overflow)).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "J-03.temperature_power_not_representable" },
    });

    const baseObstructed = largeInput();
    const obstructed = {
      ...baseObstructed,
      boundaryEvidence: {
        ...baseObstructed.boundaryEvidence,
        noUnmodelledOpeningsOrObstructionsConfirmed: false,
      },
    };
    expect(calculateMvpJ03(obstructed as unknown as MvpJ03CalculationInput)).toMatchObject({
      status: "not_applicable",
      outputs: [],
      applicability: { status: "out_of_domain" },
      failure: { code: "J-03.view_or_surface_model_not_applicable" },
    });
  });

  it("rejects extra fields and hostile getters without executing them", () => {
    const extra = calculateMvpJ03({
      ...largeInput(),
      hiddenViewFactorDefault: 1,
    } as MvpJ03CalculationInput);
    expect(extra).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-J-03.input_schema_invalid" },
    });

    const getter = vi.fn(() => largeInput().surface1);
    const hostile = { ...largeInput() } as Record<string, unknown>;
    Object.defineProperty(hostile, "surface1", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const hostileResult = calculateMvpJ03(hostile);
    expect(hostileResult).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-J-03.input_schema_invalid" },
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
