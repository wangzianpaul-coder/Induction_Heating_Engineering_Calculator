import { describe, expect, it } from "vitest";

import {
  CompositeSimpsonEvaluationError,
  CompositeSimpsonInputError,
  compositeSimpson,
  type CompositeSimpsonInput,
} from "../../src/numerics/compositeSimpson.js";

function input(
  integrand: (x: number) => number,
  overrides: Partial<CompositeSimpsonInput> = {},
): CompositeSimpsonInput {
  return {
    integrand,
    lowerBound: 0,
    upperBound: 1,
    segmentCount: 4,
    absoluteTolerance: 1e-12,
    relativeTolerance: 1e-12,
    ...overrides,
  };
}

function expectMachinePrecision(actual: number, expected: number): void {
  const scale = Math.max(1, Math.abs(expected));
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    32 * Number.EPSILON * scale,
  );
}

describe("ID-NUM-01 composite Simpson", () => {
  it.each([
    ["constant", (_x: number) => 1, 1],
    ["linear", (x: number) => x, 0.5],
    ["quadratic", (x: number) => x * x, 1 / 3],
    ["cubic", (x: number) => x * x * x, 0.25],
  ])(
    "meets NUM-SIMP-001 machine precision for a %s polynomial",
    (_name, integrand, expected) => {
      const result = compositeSimpson(input(integrand));

      expect(result.status).toBe("converged");
      if (result.status !== "converged") {
        throw new Error(result.failure.message);
      }
      expectMachinePrecision(result.estimates.n.value, expected);
      expectMachinePrecision(result.estimates.twoN.value, expected);
      expectMachinePrecision(result.estimates.fourN.value, expected);
      expect(result.status).toBe("converged");
      expect(result.algorithmId).toBe("ID-NUM-01");
      expect(result.convergenceMeaning).toBe(
        "numerical_grid_refinement_only",
      );
    },
  );

  it("strictly executes n,2n,4n while caching all shared grid nodes", () => {
    let callCount = 0;
    const initialSegments = 6;
    const result = compositeSimpson(
      input(
        (x) => {
          callCount += 1;
          return x * x + 2 * x + 3;
        },
        { segmentCount: initialSegments },
      ),
    );

    expect(result.status).toBe("converged");
    if (result.status !== "converged") {
      throw new Error(result.failure.message);
    }
    expect(result.estimates.n.segmentCount).toBe(initialSegments);
    expect(result.estimates.twoN.segmentCount).toBe(2 * initialSegments);
    expect(result.estimates.fourN.segmentCount).toBe(4 * initialSegments);
    expect(result.estimates.n.newFunctionEvaluationCount).toBe(
      initialSegments + 1,
    );
    expect(result.estimates.twoN.newFunctionEvaluationCount).toBe(
      initialSegments,
    );
    expect(result.estimates.fourN.newFunctionEvaluationCount).toBe(
      2 * initialSegments,
    );
    expect(result.estimates.n.cumulativeFunctionEvaluationCount).toBe(
      initialSegments + 1,
    );
    expect(result.estimates.twoN.cumulativeFunctionEvaluationCount).toBe(
      2 * initialSegments + 1,
    );
    expect(result.estimates.fourN.cumulativeFunctionEvaluationCount).toBe(
      4 * initialSegments + 1,
    );
    expect(result.functionEvaluationCount).toBe(4 * initialSegments + 1);
    expect(callCount).toBe(4 * initialSegments + 1);
  });

  it("preserves integral, refinement-difference, and tolerance scaling", () => {
    const scaleFactor = 1e6;
    const integrand = (x: number) => x ** 4 + 2;
    const base = compositeSimpson(
      input(integrand, {
        segmentCount: 4,
        absoluteTolerance: 1e-12,
        relativeTolerance: 1e-4,
      }),
    );
    const scaled = compositeSimpson(
      input((x) => scaleFactor * integrand(x), {
        segmentCount: 4,
        absoluteTolerance: scaleFactor * 1e-12,
        relativeTolerance: 1e-4,
      }),
    );

    expect(base.status).toBe("converged");
    expect(scaled.status).toBe("converged");
    if (base.status !== "converged" || scaled.status !== "converged") {
      throw new Error("Scaling fixture must satisfy its declared tolerance.");
    }

    for (const level of ["n", "twoN", "fourN"] as const) {
      expect(scaled.estimates[level].value).toBeCloseTo(
        scaleFactor * base.estimates[level].value,
        8,
      );
    }
    expect(scaled.refinementDifferences.nTo2n).toBeCloseTo(
      scaleFactor * base.refinementDifferences.nTo2n,
      8,
    );
    expect(scaled.refinementDifferences.twoNTo4n).toBeCloseTo(
      scaleFactor * base.refinementDifferences.twoNTo4n,
      8,
    );
    expect(scaled.tolerance.threshold).toBeCloseTo(
      scaleFactor * base.tolerance.threshold,
      8,
    );
    expect(scaled.status).toBe(base.status);
  });

  it("uses the explicit absolute-plus-relative threshold on the 4n estimate", () => {
    const absoluteTolerance = 2e-5;
    const relativeTolerance = 3e-5;
    const result = compositeSimpson(
      input((x) => Math.exp(x), {
        segmentCount: 4,
        absoluteTolerance,
        relativeTolerance,
      }),
    );

    expect(result.status).toBe("converged");
    if (result.status !== "converged") {
      throw new Error(result.failure.message);
    }
    expect(result.tolerance.relativeScale).toBe(
      Math.abs(result.estimates.fourN.value),
    );
    expect(result.tolerance.threshold).toBe(
      absoluteTolerance +
        relativeTolerance * Math.abs(result.estimates.fourN.value),
    );
    expect(result.tolerance.observedDifference).toBe(
      result.refinementDifferences.twoNTo4n,
    );
  });

  it.each([
    ["odd segment count", { segmentCount: 3 }],
    ["segment count below two", { segmentCount: 0 }],
    ["fractional segment count", { segmentCount: 2.5 }],
    [
      "unsafe 4n segment count",
      { segmentCount: Number.MAX_SAFE_INTEGER - 1 },
    ],
    ["equal bounds", { lowerBound: 1, upperBound: 1 }],
    ["reversed bounds", { lowerBound: 2, upperBound: 1 }],
    ["non-finite lower bound", { lowerBound: Number.NEGATIVE_INFINITY }],
    ["non-finite upper bound", { upperBound: Number.POSITIVE_INFINITY }],
    ["negative absolute tolerance", { absoluteTolerance: -1 }],
    ["negative relative tolerance", { relativeTolerance: -1 }],
    ["non-finite absolute tolerance", { absoluteTolerance: Number.NaN }],
    ["zero absolute and relative tolerance", {
      absoluteTolerance: 0,
      relativeTolerance: 0,
    }],
  ])("rejects %s", (_name, overrides) => {
    expect(() =>
      compositeSimpson(input((x) => x, overrides)),
    ).toThrow(CompositeSimpsonInputError);
  });

  it("rejects an omitted tolerance instead of supplying a hidden default", () => {
    const missingTolerance = {
      integrand: (x: number) => x,
      lowerBound: 0,
      upperBound: 1,
      segmentCount: 4,
      relativeTolerance: 1e-8,
    } as unknown as CompositeSimpsonInput;

    expect(() => compositeSimpson(missingTolerance)).toThrow(
      /absoluteTolerance must be finite/,
    );
  });

  it("fails closed on a non-finite endpoint without applying a transformation", () => {
    try {
      compositeSimpson(
        input((x) => (x === 0 ? Number.POSITIVE_INFINITY : 1 / Math.sqrt(x))),
      );
      throw new Error("Expected endpoint singularity rejection.");
    } catch (error) {
      expect(error).toBeInstanceOf(CompositeSimpsonEvaluationError);
      expect((error as CompositeSimpsonEvaluationError).location).toBe(
        "endpoint",
      );
      expect((error as CompositeSimpsonEvaluationError).x).toBe(0);
    }
  });

  it("fails closed on a non-finite interior evaluation", () => {
    try {
      compositeSimpson(input((x) => (x === 0.5 ? Number.NaN : x)));
      throw new Error("Expected interior non-finite rejection.");
    } catch (error) {
      expect(error).toBeInstanceOf(CompositeSimpsonEvaluationError);
      expect((error as CompositeSimpsonEvaluationError).location).toBe(
        "interior",
      );
      expect((error as CompositeSimpsonEvaluationError).x).toBe(0.5);
    }
  });

  it("wraps an integrand exception with its grid location and cause", () => {
    const cause = new Error("fixture integrand failure");
    try {
      compositeSimpson(
        input((x) => {
          if (x === 0.25) {
            throw cause;
          }
          return x;
        }),
      );
      throw new Error("Expected integrand exception rejection.");
    } catch (error) {
      expect(error).toBeInstanceOf(CompositeSimpsonEvaluationError);
      expect((error as CompositeSimpsonEvaluationError).location).toBe(
        "interior",
      );
      expect((error as CompositeSimpsonEvaluationError).x).toBe(0.25);
      expect((error as Error).cause).toBe(cause);
    }
  });

  it("returns non_converged after 4n when the declared tolerance is not met", () => {
    const result = compositeSimpson(
      input((x) => x ** 4, {
        segmentCount: 2,
        absoluteTolerance: Number.MIN_VALUE,
        relativeTolerance: 0,
      }),
    );

    expect(result.status).toBe("non_converged");
    if (result.status !== "non_converged") {
      throw new Error("Expected the strict fixture tolerance to fail.");
    }
    expect(result.refinementDifferences.twoNTo4n).toBeGreaterThan(
      result.tolerance.threshold,
    );
    expect("estimates" in result).toBe(false);
    expect("relativeScale" in result.tolerance).toBe(false);
    expect(result.evaluatedSegmentCounts.fourN).toBe(8);
    expect(result.functionEvaluationCount).toBe(9);
    expect(result.failure.code).toBe(
      "grid_refinement_tolerance_not_satisfied",
    );
    expect(JSON.stringify(result)).not.toContain('"value"');
  });

  it("rejects a finest grid that collapses at number precision", () => {
    expect(() =>
      compositeSimpson(
        input((x) => x, {
          lowerBound: 1,
          upperBound: 1 + Number.EPSILON,
          segmentCount: 2,
        }),
      ),
    ).toThrow(/grid is not representable/);
  });
});
