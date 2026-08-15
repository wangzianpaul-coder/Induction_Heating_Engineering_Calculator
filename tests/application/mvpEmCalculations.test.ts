import { describe, expect, it, vi } from "vitest";

import {
  MVP_EM_CALCULATION_SCOPE,
  MVP_EM_METHOD_IDS,
  calculateMvpB02,
  calculateMvpD01,
  calculateMvpD03,
  calculateMvpD07,
  type MvpB02CalculationInput,
  type MvpD01CalculationInput,
  type MvpD03CalculationInput,
  type MvpD07CalculationInput,
} from "../../src/application/mvpEmCalculations.js";
import { methodId } from "../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../src/registries/methodSpecificationRegistry.js";

const B02_INPUT = Object.freeze({
  electricalTurnCount: 8,
  conductorAxialSizeM: 0.01,
  windingEnvelopeLengthM: 0.1,
  windingClass: "uniform_single_layer",
  envelopeDefinition: "ADR-0003_full_axial_envelope",
  identicalTurnSections: true,
  nonOverlappingAxialProjection: true,
} as const satisfies MvpB02CalculationInput);

const D01_INPUT = Object.freeze({
  meanMechanicalPathDiameterM: 3 / Math.PI,
  helixRevolutionCount: 1,
  helixAxialAdvanceM: 4,
  leadSegmentLengthsM: [1, 2],
  busSegmentLengthsM: [0.25, 0.75],
  pathGeometry: "uniform_cylindrical_helix",
  meanDiameterBasis: "mechanical_or_cad_conductor_center_path",
  revolutionCountBasis: "actual_mechanical_or_cad_path",
  axialAdvanceBasis: "actual_path_endpoint_advance",
  turnCenterSpanConsistency: "consistent",
} as const satisfies MvpD01CalculationInput);

const D03_INPUT = Object.freeze({
  conductorLengthM: 5,
  metalAreaM2: 2e-5,
  resistivityOhmM: 2e-8,
  resistivityMaterialId: "project-copper-C110-state-373K",
  resistivityTemperatureK: 373.15,
  resistivitySourceRef: "project-material:C110:rho_e:373.15K:v1",
  resistivityStateMatch: "same_material_temperature_as_conductor",
  materialDistribution: "uniform",
  metalAreaDistribution: "uniform",
  temperatureDistribution: "uniform",
  conductorMaterialId: "project-copper-C110-state-373K",
  conductorTemperatureK: 373.15,
  resistanceBoundary: "conductor_body_only_excludes_series_extras",
  seriesExtraResistances: [],
  seriesBoundaryCompleteness: "complete",
  seriesBoundaryReferencePlane:
    "terminal_equals_conductor_plus_listed_series_extras",
} as const satisfies MvpD03CalculationInput);

const D07_INPUT = Object.freeze({
  resistanceOhm: 0.2,
  inductanceH: 50e-6,
  currentA: 100,
  frequencyHz: 10_000,
  portId: "coil-terminal-port",
  referencePlaneId: "coil-lead-deembedded-plane",
  loadedState: "workpiece_hot",
  seriesEquivalentId: "coil-series-equivalent-hot-v1",
  quantityBasis: "rms",
  portInterpretation: "coil_series_equivalent_port",
  modelRegime: "linear_sinusoidal_steady_state",
} as const satisfies MvpD07CalculationInput);

function scalarOutput(
  result: ReturnType<typeof calculateMvpB02>,
  outputId: string,
): number {
  const candidate = result.outputs.find((item) => item.outputId === outputId);
  expect(candidate?.status).toBe("available");
  expect(typeof candidate?.value).toBe("number");
  if (candidate === undefined || typeof candidate.value !== "number") {
    throw new Error(`Expected scalar MVP output ${outputId}.`);
  }
  return candidate.value;
}

describe("controlled Phase-5B EM MVP calculation adapters", () => {
  it("allowlists exactly four isolated evaluators without changing formal registry activation", () => {
    expect(MVP_EM_METHOD_IDS).toEqual(["B-02", "D-01", "D-03", "D-07"]);
    expect(MVP_EM_CALCULATION_SCOPE.formalRuntimeActivationClaim).toBe(false);
    expect(Object.isFrozen(MVP_EM_METHOD_IDS)).toBe(true);
    expect(Object.isFrozen(MVP_EM_CALCULATION_SCOPE.constraints)).toBe(true);
    for (const id of MVP_EM_METHOD_IDS) {
      const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
      expect(specification.implementationAvailable).toBe(false);
      expect(specification.executable).toBe(false);
    }
  });

  it("calculates B-02 only after all single-layer and envelope confirmations are explicit", () => {
    const result = calculateMvpB02(B02_INPUT);
    expect(result).toMatchObject({
      methodId: "B-02",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      formalRuntimeActivationClaim: false,
      status: "success",
      failure: null,
      applicability: { status: "in_domain" },
    });
    expect(scalarOutput(result, "k_fill_axial")).toBeCloseTo(0.8, 15);
    expect(result.outputs[0]?.unit).toBe("one");
    expect(result.sources).toEqual(["ID-GEO-01", "ADR-0003", "DER-GEO"]);
    expect(Object.isFrozen(result.outputs)).toBe(true);

    const overlap = calculateMvpB02({
      ...B02_INPUT,
      nonOverlappingAxialProjection: false,
    });
    expect(overlap).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "B-02.axial_overlap" },
    });
  });

  it("calculates D-01 complete paths and keeps unknown lead/bus paths visible as unavailable", () => {
    const complete = calculateMvpD01(D01_INPUT);
    expect(complete.status).toBe("success");
    expect(scalarOutput(complete, "ell_helix")).toBeCloseTo(5, 14);
    expect(scalarOutput(complete, "ell_total")).toBeCloseTo(9, 14);
    expect(complete.sources).toEqual(["ID-GEO-02", "DER-GEO"]);

    const incomplete = calculateMvpD01({
      ...D01_INPUT,
      leadSegmentLengthsM: null,
      busSegmentLengthsM: null,
      turnCenterSpanConsistency: "not_available",
    });
    expect(incomplete.status).toBe("success_with_warnings");
    expect(incomplete.outputs.find((item) => item.outputId === "ell_total"))
      .toMatchObject({
        status: "unavailable",
        value: null,
        unit: "m",
        reason: "pathCompleteness=lower_bound_only",
      });
    expect(incomplete.warnings.some((warning) =>
      warning.predicate === "lead length is unknown" && warning.code === null))
      .toBe(true);

    const guessed = calculateMvpD01({
      ...D01_INPUT,
      revolutionCountBasis: "guessed_from_electrical_turn_count",
    });
    expect(guessed).toMatchObject({
      status: "insufficient_data",
      failure: { code: "D-01.revolution_count_guessed" },
    });
  });

  it("calculates D-03 only from caller-sourced, same-state resistivity and explicit boundaries", () => {
    const complete = calculateMvpD03(D03_INPUT);
    expect(complete.status).toBe("success");
    expect(scalarOutput(complete, "Rconductor_dc")).toBeCloseTo(0.005, 15);
    expect(scalarOutput(complete, "Rterminal_dc")).toBeCloseTo(0.005, 15);
    expect(complete.sources).toEqual([
      "ID-OHM-01",
      "DER-CIRCUIT",
      "material source required separately",
    ]);

    const incomplete = calculateMvpD03({
      ...D03_INPUT,
      seriesExtraResistances: null,
      seriesBoundaryCompleteness: "unknown_or_incomplete",
    });
    expect(incomplete.status).toBe("success_with_warnings");
    expect(incomplete.outputs.find((item) => item.outputId === "Rterminal_dc"))
      .toMatchObject({ status: "unavailable", value: null, unit: null });
    expect(incomplete.warnings[0]).toMatchObject({
      code: null,
      predicate: "joint resistance is unknown",
    });

    const unsourced = calculateMvpD03({
      ...D03_INPUT,
      resistivitySourceRef: "",
    });
    expect(unsourced).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "D-03.resistivity_snapshot_invalid" },
    });
    const mismatched = calculateMvpD03({
      ...D03_INPUT,
      resistivityStateMatch: "cold_or_other_material_state",
    });
    expect(mismatched).toMatchObject({
      status: "insufficient_data",
      failure: { code: "D-03.resistivity_state_mismatch" },
    });
  });

  it("calculates exact D-07 series-port outputs and never emits a finite Q at zero resistance", () => {
    const result = calculateMvpD07(D07_INPUT);
    const omegaL = 2 * Math.PI * D07_INPUT.frequencyHz * D07_INPUT.inductanceH;
    expect(result.status).toBe("success");
    expect(scalarOutput(result, "XL")).toBeCloseTo(omegaL, 14);
    expect(scalarOutput(result, "|Z|")).toBeCloseTo(
      Math.hypot(D07_INPUT.resistanceOhm, omegaL),
      14,
    );
    expect(result.outputs.find((item) => item.outputId === "Zcomplex"))
      .toMatchObject({
        value: { real: D07_INPUT.resistanceOhm, imaginary: omegaL },
        unit: "ohm",
      });
    expect(result.outputs.some((item) =>
      item.outputId.toLocaleLowerCase("en-US").includes("approx"))).toBe(false);

    const zeroResistance = calculateMvpD07({ ...D07_INPUT, resistanceOhm: 0 });
    expect(zeroResistance.status).toBe("success_with_warnings");
    expect(zeroResistance.outputs.find((item) => item.outputId === "Qs"))
      .toMatchObject({
        status: "unavailable",
        value: null,
        unit: null,
        reason: "series quality factor is undefined/infinite at R_s=0",
      });
    expect(zeroResistance.warnings[0]).toMatchObject({
      code: "D-07.quality_factor_unavailable_zero_resistance",
      predicate: "Rs=0 but a finite Q is emitted",
    });
  });

  it("failure-closes extra fields and accessors without invoking them", () => {
    const extraField = calculateMvpB02({
      ...B02_INPUT,
      hiddenDefault: 1,
    } as MvpB02CalculationInput);
    expect(extraField).toMatchObject({
      status: "invalid_input",
      failure: { code: "B-02.input_schema_invalid" },
    });

    const getter = vi.fn(() => D07_INPUT.frequencyHz);
    const hostile = { ...D07_INPUT } as Record<string, unknown>;
    Object.defineProperty(hostile, "frequencyHz", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const hostileResult = calculateMvpD07(
      hostile as unknown as MvpD07CalculationInput,
    );
    expect(hostileResult).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-07.input_schema_invalid" },
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
