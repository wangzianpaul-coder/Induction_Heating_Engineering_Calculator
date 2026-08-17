import { describe, expect, it, vi } from "vitest";

import {
  MVP_EQUIVALENT_CALCULATION_SCOPE,
  MVP_EQUIVALENT_METHOD_IDS,
  calculateMvpF01,
  type MvpF01CalculationInput,
} from "../../src/application/mvpEquivalentCalculations.js";
import { methodId } from "../../src/domain/ids.js";
import { evaluateF01ReflectedImpedance } from "../../src/methods/F/f01ReflectedImpedance.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT = `case:${"a".repeat(64)}`;
const PRIMARY_MATERIAL_SNAPSHOT = `material:${"1".repeat(64)}`;
const SECONDARY_MATERIAL_SNAPSHOT = `material:${"2".repeat(64)}`;

const INPUT = Object.freeze({
  primaryResistanceOhm: 0.05,
  primaryInductanceH: 20e-6,
  secondaryResistanceOhm: 0.01,
  secondaryInductanceH: 1e-6,
  mutualInductanceH: 0.5 * Math.sqrt(20e-6 * 1e-6),
  frequencyHz: 10_000,
  primaryPortId: "coil.primary.port",
  secondaryPortId: "workpiece.secondary.equivalent",
  primaryReferencePlaneId: "coil.primary.terminals",
  secondaryReferencePlaneId: "workpiece.secondary.model-plane",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  primaryMaterialStateId: "copper.primary.673K",
  secondaryMaterialStateId: "steel.secondary.1173K",
  primaryTemperatureK: 673,
  secondaryTemperatureK: 1173,
  caseSnapshotId: CASE_SNAPSHOT,
  primaryMaterialSnapshotId: PRIMARY_MATERIAL_SNAPSHOT,
  secondaryMaterialSnapshotId: SECONDARY_MATERIAL_SNAPSHOT,
  coupledCircuitStateId: "state.loaded.hot.10kHz",
  primaryParameterSourceKind: "measurement",
  secondaryParameterSourceKind: "limited_analytical",
  mutualParameterSourceKind: "fem",
  primarySourceRef: "PROJECT-MEAS:R1-LP:001",
  secondarySourceRef: "MODEL:secondary-equivalent:001",
  mutualSourceRef: "FEM:coupling:M:001",
  primaryStateMatch: "confirmed_for_declared_state",
  secondaryStateMatch: "confirmed_for_declared_state",
  mutualStateMatch: "confirmed_for_declared_state",
  modelRegime: "linear_lumped_sinusoidal_steady_state",
} as const satisfies MvpF01CalculationInput);

function outputValue(
  result: ReturnType<typeof calculateMvpF01>,
  outputId: "Req" | "Rref" | "Leq" | "k",
): number {
  const candidate = result.outputs.find((output) => output.outputId === outputId);
  expect(typeof candidate?.value).toBe("number");
  if (candidate === undefined || typeof candidate.value !== "number") {
    throw new Error(`Expected scalar F-01 MVP output ${outputId}.`);
  }
  return candidate.value;
}

describe("controlled F-01 equivalent-circuit MVP adapter", () => {
  it("keeps formal activation false and retains the frozen limited approval", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-01"));
    expect(MVP_EQUIVALENT_METHOD_IDS).toEqual(["F-01"]);
    expect(MVP_EQUIVALENT_CALCULATION_SCOPE).toMatchObject({
      formalRuntimeActivationClaim: false,
      methodIds: ["F-01"],
    });
    expect(specification.approvalStatus).toBe("approved_with_limitation");
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(Object.isFrozen(MVP_EQUIVALENT_CALCULATION_SCOPE.constraints)).toBe(true);
  });

  it("normalizes the actual evaluator outputs without recalculating or replacing them", () => {
    const actual = calculateMvpF01(INPUT);
    const evaluator = evaluateF01ReflectedImpedance({
      primary: {
        resistanceOhm: INPUT.primaryResistanceOhm,
        inductanceH: INPUT.primaryInductanceH,
        frequencyHz: INPUT.frequencyHz,
        portId: INPUT.primaryPortId,
        referencePlaneId: INPUT.primaryReferencePlaneId,
        quantityBasis: INPUT.quantityBasis,
        loadedState: INPUT.loadedState,
        materialStateId: INPUT.primaryMaterialStateId,
        temperatureK: INPUT.primaryTemperatureK,
        caseSnapshotId: INPUT.caseSnapshotId,
        materialSnapshotId: INPUT.primaryMaterialSnapshotId,
        coupledCircuitStateId: INPUT.coupledCircuitStateId,
        parameterSourceKind: INPUT.primaryParameterSourceKind,
        sourceRef: INPUT.primarySourceRef,
        stateMatch: INPUT.primaryStateMatch,
      },
      secondary: {
        resistanceOhm: INPUT.secondaryResistanceOhm,
        inductanceH: INPUT.secondaryInductanceH,
        frequencyHz: INPUT.frequencyHz,
        portId: INPUT.secondaryPortId,
        referencePlaneId: INPUT.secondaryReferencePlaneId,
        quantityBasis: INPUT.quantityBasis,
        loadedState: INPUT.loadedState,
        materialStateId: INPUT.secondaryMaterialStateId,
        temperatureK: INPUT.secondaryTemperatureK,
        caseSnapshotId: INPUT.caseSnapshotId,
        materialSnapshotId: INPUT.secondaryMaterialSnapshotId,
        coupledCircuitStateId: INPUT.coupledCircuitStateId,
        parameterSourceKind: INPUT.secondaryParameterSourceKind,
        sourceRef: INPUT.secondarySourceRef,
        stateMatch: INPUT.secondaryStateMatch,
      },
      mutual: {
        mutualInductanceH: INPUT.mutualInductanceH,
        frequencyHz: INPUT.frequencyHz,
        primaryPortId: INPUT.primaryPortId,
        secondaryPortId: INPUT.secondaryPortId,
        primaryReferencePlaneId: INPUT.primaryReferencePlaneId,
        secondaryReferencePlaneId: INPUT.secondaryReferencePlaneId,
        quantityBasis: INPUT.quantityBasis,
        loadedState: INPUT.loadedState,
        primaryMaterialStateId: INPUT.primaryMaterialStateId,
        secondaryMaterialStateId: INPUT.secondaryMaterialStateId,
        primaryTemperatureK: INPUT.primaryTemperatureK,
        secondaryTemperatureK: INPUT.secondaryTemperatureK,
        caseSnapshotId: INPUT.caseSnapshotId,
        primaryMaterialSnapshotId: INPUT.primaryMaterialSnapshotId,
        secondaryMaterialSnapshotId: INPUT.secondaryMaterialSnapshotId,
        coupledCircuitStateId: INPUT.coupledCircuitStateId,
        parameterSourceKind: INPUT.mutualParameterSourceKind,
        sourceRef: INPUT.mutualSourceRef,
        stateMatch: INPUT.mutualStateMatch,
      },
      modelRegime: INPUT.modelRegime,
    });
    expect(actual.status).toBe("success");
    expect(evaluator.status).toBe("success");
    if (evaluator.status !== "success") {
      throw new Error("Expected controlled F-01 evaluator success.");
    }
    expect(outputValue(actual, "Req")).toBe(evaluator.value.Req.valueSi);
    expect(outputValue(actual, "Rref")).toBe(evaluator.value.Rref.valueSi);
    expect(outputValue(actual, "Leq")).toBe(evaluator.value.Leq.valueSi);
    expect(outputValue(actual, "k")).toBe(evaluator.value.k.valueSi);
    expect(actual.outputs.find((output) => output.outputId === "Zin")?.value)
      .toEqual({
        real: evaluator.value.Zin.valueSi.realOhm,
        imaginary: evaluator.value.Zin.valueSi.imaginaryOhm,
      });
  });

  it("makes estimated and not-Recommended limitations explicit", () => {
    const result = calculateMvpF01(INPUT);
    expect(result).toMatchObject({
      approvalStatus: "approved_with_limitation",
      formalRuntimeActivationClaim: false,
      status: "success",
      resultProvenance: "estimated",
      recommendation: {
        eligibility: "not_eligible",
        isRecommended: false,
        preferredActualEquipmentMethodId: "F-02",
      },
      failure: null,
    });
    expect(result.recommendation.reason.length).toBeGreaterThan(0);
    expect(result.limitations.join(" ")).toContain("never guessed from geometry");
    expect(result.sources).toEqual([
      "ID-Z-01",
      "L13:PDF1-6",
      "J08:PDF2-3",
      "DER-CIRCUIT",
      "J08:PDF2-3:scope-only",
      "L13:PDF1-6:scope-only",
      "EM-Z-001",
      "EM-Z-PASSIVITY-001",
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.outputs)).toBe(true);
  });

  it("rejects unproven geometry provenance and never emits fallback values", () => {
    const result = calculateMvpF01({
      ...INPUT,
      mutualParameterSourceKind: "geometry_guess_or_unproven",
    });
    expect(result).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      resultProvenance: null,
      failure: { code: "F-01.parameter_provenance_insufficient" },
    });
  });

  it("fails closed for out-of-domain coupling and duplicate port identities", () => {
    const coupling = calculateMvpF01({
      ...INPUT,
      mutualInductanceH:
        1.01 * Math.sqrt(INPUT.primaryInductanceH * INPUT.secondaryInductanceH),
    });
    expect(coupling).toMatchObject({
      status: "not_applicable",
      outputs: [],
      failure: { code: "F-01.coupling_out_of_domain" },
    });

    const duplicatePort = calculateMvpF01({
      ...INPUT,
      secondaryPortId: INPUT.primaryPortId,
    });
    expect(duplicatePort).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "F-01.port_mapping_invalid" },
    });
  });

  it("retains independent provenance confirmation for all three parameter snapshots", () => {
    const result = calculateMvpF01({
      ...INPUT,
      secondaryStateMatch: "unconfirmed_or_mismatched",
    });
    expect(result).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "F-01.parameter_provenance_insufficient" },
    });
  });

  it("failure-closes extra fields and accessors without invoking them", () => {
    const extra = calculateMvpF01({
      ...INPUT,
      inferMutualFromGeometry: true,
    } as MvpF01CalculationInput);
    expect(extra).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "F-01.input_schema_invalid" },
    });

    const getter = vi.fn(() => INPUT.mutualInductanceH);
    const hostile = { ...INPUT } as Record<string, unknown>;
    Object.defineProperty(hostile, "mutualInductanceH", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const result = calculateMvpF01(
      hostile as unknown as MvpF01CalculationInput,
    );
    expect(getter).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "F-01.input_schema_invalid" },
    });
  });
});
