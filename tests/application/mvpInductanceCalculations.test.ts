import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  MVP_B03_CODATA22_LOCAL_SOURCE_PIN,
  MVP_INDUCTANCE_CALCULATION_SCOPE,
  MVP_INDUCTANCE_METHOD_IDS,
  MVP_INDUCTANCE_METHOD_READINESS,
  calculateMvpB03,
  calculateMvpB04,
  calculateMvpB05,
  compareMvpInductanceResults,
  type MvpB03CalculationInput,
  type MvpInductanceCalculationResult,
} from "../../src/application/mvpInductanceCalculations.js";
import { methodId } from "../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../src/registries/methodSpecificationRegistry.js";

const B03_INPUT = Object.freeze({
  methodId: "B-03",
  purpose: "analytical_limit_check",
  currentPathDiameterM: 0.1,
  windingEnvelopeLengthM: 0.5,
  electricalTurnCount: 10,
  mediumKind: "air",
  relativePermeability: null,
} as const satisfies MvpB03CalculationInput);

function scalarValue(result: MvpInductanceCalculationResult): number {
  const output = result.outputs.find((candidate) =>
    candidate.outputId === "L_inf");
  expect(output).toBeDefined();
  if (output === undefined) throw new Error("Expected B-03 output.");
  return output.value;
}

describe("controlled Runnable MVP inductance boundary", () => {
  it("keeps formal registry activation unchanged and publishes exact readiness", () => {
    expect(MVP_INDUCTANCE_METHOD_IDS).toEqual(["B-03", "B-04", "B-05"]);
    expect(MVP_INDUCTANCE_CALCULATION_SCOPE).toMatchObject({
      formalRuntimeActivationClaim: false,
      numericallyCallableMethodIds: ["B-03"],
    });
    expect(MVP_INDUCTANCE_METHOD_READINESS.map((item) => ({
      methodId: item.methodId,
      callable: item.applicationCallable,
      formal: item.formalRuntimeActivation,
    }))).toEqual([
      { methodId: "B-03", callable: true, formal: "blocked" },
      { methodId: "B-04", callable: false, formal: "blocked" },
      { methodId: "B-05", callable: false, formal: "blocked" },
    ]);
    for (const id of MVP_INDUCTANCE_METHOD_IDS) {
      const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
      expect(specification.implementationAvailable).toBe(false);
      expect(specification.executable).toBe(false);
    }
    expect(Object.isFrozen(MVP_INDUCTANCE_METHOD_READINESS)).toBe(true);
  });

  it("binds B-03 to the locally pinned and visually verified CODATA22 source", () => {
    const sourceUrl = new URL(
      "../../references/external_sources/NIST_CODATA_2022_JPCRD.pdf",
      import.meta.url,
    );
    const bytes = readFileSync(sourceUrl);
    expect(bytes.byteLength).toBe(MVP_B03_CODATA22_LOCAL_SOURCE_PIN.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      MVP_B03_CODATA22_LOCAL_SOURCE_PIN.sha256,
    );
    expect(MVP_B03_CODATA22_LOCAL_SOURCE_PIN).toMatchObject({
      sourceId: "CODATA22",
      location: "PDF45:TableXXXIII",
      visualReviewStatus: "rendered_and_visually_verified",
      evaluatorValueHPerM: 1.25663706127e-6,
    });
  });

  it("calculates the real B-03 air-core analytical limit without promoting it", () => {
    const result = calculateMvpB03(B03_INPUT);
    const radiusM = B03_INPUT.currentPathDiameterM / 2;
    const expected =
      (MVP_B03_CODATA22_LOCAL_SOURCE_PIN.evaluatorValueHPerM *
        B03_INPUT.electricalTurnCount ** 2 *
        Math.PI *
        radiusM ** 2) /
      B03_INPUT.windingEnvelopeLengthM;
    expect(result).toMatchObject({
      methodId: "B-03",
      methodVersion: "1.0.0-gate0",
      status: "success_with_warnings",
      role: "analytical_limit_only",
      formalRuntimeActivationClaim: false,
      recommendation: { isRecommended: false, eligibility: "not_eligible" },
      applicability: { status: "in_domain" },
      geometryBoundary: {
        geometrySnapshotId: null,
        currentPathDiameterM: 0.1,
        windingEnvelopeLengthM: 0.5,
        electricalTurnCount: 10,
      },
      failure: null,
    });
    expect(scalarValue(result)).toBeCloseTo(expected, 20);
    expect(result.outputs[0]?.unit).toBe("H");
    expect(result.sources).toContain("CODATA22");
    expect(result.sources).toContain(
      MVP_B03_CODATA22_LOCAL_SOURCE_PIN.controlledRef,
    );
    expect(result.assumptions).toContain(
      "infinite_length_uniform_current_sheet",
    );
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: null,
      predicate: "finite-length result is presented as the primary result",
    }));
  });

  it("supports an explicit uniform-linear medium and applies no permeability default", () => {
    const air = calculateMvpB03(B03_INPUT);
    const linear = calculateMvpB03({
      ...B03_INPUT,
      mediumKind: "uniform_linear",
      relativePermeability: 2.5,
    });
    expect(linear.status).toBe("success_with_warnings");
    expect(scalarValue(linear)).toBeCloseTo(scalarValue(air) * 2.5, 20);

    const missing = calculateMvpB03({
      ...B03_INPUT,
      mediumKind: "uniform_linear",
      relativePermeability: null,
    });
    expect(missing).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "invalid_relative_permeability" },
    });
  });

  it("rejects conflicting air permeability instead of silently ignoring it", () => {
    const result = calculateMvpB03({
      ...B03_INPUT,
      relativePermeability: 1,
    });
    expect(result).toMatchObject({
      status: "invalid_input",
      outputs: [],
      geometryBoundary: null,
      failure: { code: "MVP-B-03.air_medium_permeability_conflict" },
    });
  });

  it("failure-closes invalid geometry through the evaluator and publishes no value", () => {
    const result = calculateMvpB03({
      ...B03_INPUT,
      currentPathDiameterM: 0,
    });
    expect(result).toMatchObject({
      status: "invalid_input",
      outputs: [],
      geometryBoundary: null,
      failure: { code: "invalid_current_path_diameter" },
    });
  });

  it("delegates unsupported purpose and the single-turn route to evaluator failures with no value", () => {
    const unsupported = calculateMvpB03({
      ...B03_INPUT,
      purpose: "finite_coil_prediction",
    });
    expect(unsupported).toMatchObject({
      status: "not_applicable",
      outputs: [],
      failure: { code: "unsupported_purpose" },
    });

    const singleTurn = calculateMvpB03({
      ...B03_INPUT,
      electricalTurnCount: 1,
    });
    expect(singleTurn).toMatchObject({
      status: "not_applicable",
      outputs: [],
      failure: { code: "single_turn_current_sheet_not_applicable" },
    });
  });

  it("keeps B-04 and B-05 disabled with their exact independent gates", () => {
    const b04 = calculateMvpB04({});
    const b05 = calculateMvpB05({});
    expect(b04).toMatchObject({
      status: "disabled",
      outputs: [],
      role: "conditionally_recommended_finite_current_sheet",
      recommendation: { isRecommended: false, eligibility: "conditionally_eligible" },
      failure: { code: "MVP-B-04.release_gates_open" },
    });
    expect(b05).toMatchObject({
      status: "disabled",
      outputs: [],
      role: "quick_comparison_only",
      recommendation: { isRecommended: false, eligibility: "not_eligible" },
      failure: { code: "MVP-B-05.release_gates_open" },
    });
    expect(MVP_INDUCTANCE_METHOD_READINESS.find((item) =>
      item.methodId === "B-04")?.openGates.map((gate) => gate.gateId)).toEqual([
      "B-04.EM-L-003.release-source-cross-check",
      "B-04.stable-warning-ids-and-policy",
      "B-04.formal-snapshot-result-trace-warning-adapter",
    ]);
    expect(MVP_INDUCTANCE_METHOD_READINESS.find((item) =>
      item.methodId === "B-05")?.openGates.map((gate) => gate.gateId)).toEqual([
      "B-05.stable-warning-ids-and-trigger-policy",
      "B-05.formal-snapshot-result-trace-warning-adapter",
    ]);
  });

  it("rejects extra fields and hostile accessors without invoking them", () => {
    const extra = calculateMvpB03({
      ...B03_INPUT,
      hiddenCorrection: 1.1,
    });
    expect(extra).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-B-03.input_schema_invalid" },
    });

    const getter = vi.fn(() => B03_INPUT.currentPathDiameterM);
    const hostile = { ...B03_INPUT } as Record<string, unknown>;
    Object.defineProperty(hostile, "currentPathDiameterM", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const result = calculateMvpB03(hostile);
    expect(result).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP-B-03.input_schema_invalid" },
    });
    expect(getter).not.toHaveBeenCalled();
  });

  it("builds an honest side-by-side view without averaging, ranking, or a false Recommended result", () => {
    const b03 = calculateMvpB03(B03_INPUT);
    const b04 = calculateMvpB04(null);
    const b05 = calculateMvpB05(null);
    const comparison = compareMvpInductanceResults([b03, b04, b05]);
    expect(comparison).toMatchObject({
      status: "insufficient_data",
      formalComparisonClaim: false,
      recommendedMethodId: null,
      policy: {
        sameGeometryBoundaryRequired: true,
        averaged: false,
        ranked: false,
        normalizedDifferencesComputed: false,
        agreementIsValidation: false,
      },
      failure: { code: "MVP-INDUCTANCE.no_safe_comparable_pair" },
    });
    expect(comparison.rows.map((row) => row.methodId)).toEqual([
      "B-03",
      "B-04",
      "B-05",
    ]);
    expect(comparison.rows[0]?.inductanceH).toBeCloseTo(
      scalarValue(b03),
      20,
    );
    expect(comparison.rows[1]?.isRecommended).toBe(false);
    expect(comparison.rows[2]?.inductanceH).toBeNull();
    expect(comparison.recommendedReason).toContain("B-04");
  });

  it("rejects duplicated or forged success from a currently disabled route", () => {
    const b03 = calculateMvpB03(B03_INPUT);
    expect(compareMvpInductanceResults([b03, b03])).toMatchObject({
      status: "invalid_input",
      rows: [],
      failure: { code: "MVP-INDUCTANCE.comparison_method_set_invalid" },
    });

    const forgedB05 = {
      ...calculateMvpB05(null),
      status: "success_with_warnings",
      outputs: [{
        outputId: "L_Wheeler",
        label: { en: "forged", zh: "伪造" },
        status: "available",
        value: 1,
        unit: "H",
      }],
    } as unknown as MvpInductanceCalculationResult;
    expect(compareMvpInductanceResults([forgedB05])).toMatchObject({
      status: "invalid_input",
      rows: [],
      failure: { code: "MVP-INDUCTANCE.comparison_result_untrusted" },
    });
  });
});
