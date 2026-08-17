import { describe, expect, it, vi } from "vitest";

import {
  MVP_D04_CALCULATION_SCOPE,
  calculateMvpD04,
  type MvpD04CalculationInput,
} from "../../src/application/mvpSkinDepthCalculations.js";
import { D04_VACUUM_PERMEABILITY_H_PER_M } from "../../src/methods/D/d04CopperSkinDepth.js";

const MATERIAL_SNAPSHOT = `material:${"a".repeat(64)}`;

const D04_INPUT = Object.freeze({
  methodId: "D-04",
  frequencyHz: 20_000,
  resistivityOhmM: 2e-8,
  relativePermeability: 1,
  state: {
    materialClass: "copper",
    propertyStateMatch: "same_material_temperature_frequency_state",
    temperatureK: 373.15,
    constitutiveRegime: "linear_isotropic_good_conductor",
    excitation: "sinusoidal_steady_state",
    fieldModel: "locally_planar_reference",
  },
  propertyEvidence: {
    materialSnapshotId: MATERIAL_SNAPSHOT,
    materialDisplayName: "C110 copper at declared state",
    propertyTemperatureK: 373.15,
    propertyFrequencyHz: 20_000,
    sameMaterialStateConfirmed: true,
    resistivitySourceRef: "datasheet:C110:resistivity:373.15K",
    relativePermeabilitySourceRef: "datasheet:C110:relative-permeability:20kHz",
  },
} as const satisfies MvpD04CalculationInput);

describe("runnable copper skin-depth application adapter", () => {
  it("calculates the controlled nominal value without activating the formal registry", () => {
    const result = calculateMvpD04(D04_INPUT);
    const expected = Math.sqrt(
      D04_INPUT.resistivityOhmM /
        (Math.PI *
          D04_INPUT.frequencyHz *
          D04_VACUUM_PERMEABILITY_H_PER_M *
          D04_INPUT.relativePermeability),
    );

    expect(result).toMatchObject({
      methodId: "D-04",
      approvalStatus: "approved_with_limitation",
      formalRuntimeActivationClaim: false,
      status: "success_with_warnings",
      failure: null,
      applicability: { status: "in_domain" },
    });
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toMatchObject({
      outputId: "copper_skin_depth",
      canonicalUnit: "m",
      suggestedDisplayUnit: "mm",
    });
    expect(result.outputs[0]?.value).toBeCloseTo(expected, 15);
    expect(result.warnings).toHaveLength(2);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sourceTitles)).toBe(true);
    expect(MVP_D04_CALCULATION_SCOPE.formalRuntimeActivationClaim).toBe(false);
  });

  it("publishes Chinese-first output, limitation, and source titles without ordinary trace identifiers", () => {
    const result = calculateMvpD04(D04_INPUT);
    const publicPresentation = JSON.stringify({
      outputs: result.outputs,
      warnings: result.warnings,
      sourceTitles: result.sourceTitles,
      applicability: result.applicability,
      assumptions: result.assumptions,
    });

    expect(result.outputs[0]?.label.zh).toBe("铜导体电磁趋肤深度");
    expect(result.sourceTitles.every((source) => source.title.zh.length > 0)).toBe(true);
    expect(publicPresentation).not.toMatch(/(?:ADR|DER|ID-[A-Z]|D-04)/u);
    expect(publicPresentation).toContain("不是温度变化深度");
  });

  it("requires complete, source-bound material evidence and an exact matching state", () => {
    const missing = calculateMvpD04({
      ...D04_INPUT,
      propertyEvidence: null,
    } as unknown as MvpD04CalculationInput);
    expect(missing).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "MVP-D-04.property_evidence_missing" },
    });

    const unsourced = calculateMvpD04({
      ...D04_INPUT,
      propertyEvidence: {
        ...D04_INPUT.propertyEvidence,
        resistivitySourceRef: "",
      },
    });
    expect(unsourced).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-D-04.property_evidence_invalid" },
    });

    const mismatchedTemperature = calculateMvpD04({
      ...D04_INPUT,
      propertyEvidence: {
        ...D04_INPUT.propertyEvidence,
        propertyTemperatureK: 293.15,
      },
    });
    expect(mismatchedTemperature).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "MVP-D-04.property_state_mismatch" },
    });
  });

  it("preserves evaluator applicability and numeric boundaries without defaults or partial values", () => {
    const otherMaterial = calculateMvpD04({
      ...D04_INPUT,
      state: { ...D04_INPUT.state, materialClass: "other" },
    });
    expect(otherMaterial).toMatchObject({
      status: "not_applicable",
      outputs: [],
      applicability: { status: "out_of_domain" },
      failure: { code: "D-04.material_not_copper" },
    });

    const zeroFrequency = calculateMvpD04({
      ...D04_INPUT,
      frequencyHz: 0,
      propertyEvidence: {
        ...D04_INPUT.propertyEvidence,
        propertyFrequencyHz: 0,
      },
    });
    expect(zeroFrequency).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-D-04.property_evidence_invalid" },
    });

    const overflow = calculateMvpD04({
      ...D04_INPUT,
      frequencyHz: Number.MAX_VALUE,
      relativePermeability: Number.MAX_VALUE,
      propertyEvidence: {
        ...D04_INPUT.propertyEvidence,
        propertyFrequencyHz: Number.MAX_VALUE,
      },
    });
    expect(overflow).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "D-04.numeric_resolution_invalid" },
    });
  });

  it("fails hostile and non-exact application records closed without executing getters", () => {
    const extra = calculateMvpD04({
      ...D04_INPUT,
      hiddenDefault: 1,
    } as MvpD04CalculationInput);
    expect(extra).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP-D-04.input_schema_invalid" },
    });

    const getter = vi.fn(() => D04_INPUT.frequencyHz);
    const hostile = { ...D04_INPUT } as Record<string, unknown>;
    Object.defineProperty(hostile, "frequencyHz", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const hostileResult = calculateMvpD04(hostile);
    expect(hostileResult).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-D-04.input_schema_invalid" },
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
