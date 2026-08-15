import { describe, expect, it } from "vitest";

import {
  BRACKETED_BISECTION_STATUSES,
  BracketedBisectionEvaluationError,
  BracketedBisectionInputError,
  bracketedBisection,
} from "../../src/numerics/bracketedBisection.js";

describe("ID-NUM-01 bracketed bisection", () => {
  it("converges on a proven bracket only after both explicit tolerances pass", () => {
    const result = bracketedBisection({
      evaluate: (x) => x * x - 2,
      lowerBound: 1,
      upperBound: 2,
      residualTolerance: 1e-12,
      bracketWidthTolerance: 1e-12,
      maxIterations: 100,
    });
    expect(result.status).toBe("converged");
    if (result.status !== "converged") {
      throw new Error("Expected converged bisection result.");
    }
    expect(result.root).toBeCloseTo(Math.SQRT2, 12);
    expect(result.residualMagnitude).toBeLessThanOrEqual(1e-12);
    expect(result.finalBracket.width).toBeLessThanOrEqual(1e-12);
    expect(result.terminationReason).toBe(
      "residual_and_bracket_tolerances_satisfied",
    );
    expect(result.functionEvaluationCount).toBe(result.iterationCount + 2);
  });

  it.each([
    ["lower", 1, 3, "exact_zero_at_lower_bound"],
    ["upper", -1, 1, "exact_zero_at_upper_bound"],
  ] as const)("accepts an exact-zero %s endpoint", (_name, lowerBound, upperBound, reason) => {
    const result = bracketedBisection({
      evaluate: (x) => x - 1,
      lowerBound,
      upperBound,
      residualTolerance: 1e-30,
      bracketWidthTolerance: 1e-30,
      maxIterations: 1,
    });
    expect(result).toMatchObject({
      status: "converged",
      iterationCount: 0,
      terminationReason: reason,
    });
  });

  it("accepts an exact-zero midpoint without inventing a tolerance shortcut", () => {
    const result = bracketedBisection({
      evaluate: (x) => x - 2,
      lowerBound: 0,
      upperBound: 4,
      residualTolerance: Number.MIN_VALUE,
      bracketWidthTolerance: Number.MIN_VALUE,
      maxIterations: 1,
    });
    expect(result).toMatchObject({
      status: "converged",
      root: 2,
      residual: 0,
      iterationCount: 1,
      terminationReason: "exact_zero_at_midpoint",
    });
  });

  it("separates an invalid bracket from numerical non-convergence", () => {
    const result = bracketedBisection({
      evaluate: (x) => x * x + 1,
      lowerBound: -1,
      upperBound: 1,
      residualTolerance: 1e-12,
      bracketWidthTolerance: 1e-12,
      maxIterations: 20,
    });
    expect(result).toMatchObject({
      status: "invalid_bracket",
      iterationCount: 0,
      terminationReason: "endpoint_sign_change_not_proven",
      failure: { code: "endpoint_sign_change_not_proven" },
    });
    expect("root" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain('"root"');
  });

  it("returns non_converged without the last midpoint when maxIterations is exhausted", () => {
    const result = bracketedBisection({
      evaluate: (x) => x * x - 2,
      lowerBound: 1,
      upperBound: 2,
      residualTolerance: Number.MIN_VALUE,
      bracketWidthTolerance: Number.MIN_VALUE,
      maxIterations: 1,
    });
    expect(result).toMatchObject({
      status: "non_converged",
      iterationCount: 1,
      terminationReason: "max_iterations_reached",
      failure: { code: "max_iterations_reached" },
    });
    expect("root" in result).toBe(false);
    expect("residual" in result).toBe(false);
    expect("finalBracket" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain('"root"');
  });

  it("fails closed when no distinct binary64 midpoint remains", () => {
    const lowerBound = 1;
    const upperBound = 1 + Number.EPSILON;
    const result = bracketedBisection({
      evaluate: (x) => (x === lowerBound ? -1 : 1),
      lowerBound,
      upperBound,
      residualTolerance: 0.5,
      bracketWidthTolerance: Number.MIN_VALUE,
      maxIterations: 5,
    });
    expect(result).toMatchObject({
      status: "non_converged",
      iterationCount: 0,
      terminationReason: "machine_resolution_exhausted",
      failure: { code: "machine_resolution_exhausted" },
    });
    expect("root" in result).toBe(false);
  });

  it("accepts an already tolerance-satisfying adjacent-float bracket before midpoint exhaustion", () => {
    const lowerBound = 1;
    const upperBound = 1 + Number.EPSILON;
    const result = bracketedBisection({
      evaluate: (x) => (x === lowerBound ? -Number.MIN_VALUE : 1),
      lowerBound,
      upperBound,
      residualTolerance: Number.MIN_VALUE,
      bracketWidthTolerance: Number.EPSILON,
      maxIterations: 5,
    });
    expect(result).toMatchObject({
      status: "converged",
      root: lowerBound,
      residual: -Number.MIN_VALUE,
      residualMagnitude: Number.MIN_VALUE,
      iterationCount: 0,
      functionEvaluationCount: 2,
      terminationReason: "residual_and_bracket_tolerances_satisfied",
      finalBracket: {
        lowerBound,
        upperBound,
        width: Number.EPSILON,
      },
    });
  });

  it("never publishes a low-residual endpoint after the sign update discards it", () => {
    const result = bracketedBisection({
      evaluate: (x) => {
        if (x === 0) return -0.1;
        if (x === 1) return -0.2;
        if (x === 2) return 1;
        throw new Error("unexpected evaluation point");
      },
      lowerBound: 0,
      upperBound: 2,
      residualTolerance: 0.15,
      bracketWidthTolerance: 1,
      maxIterations: 1,
    });
    expect(result).toMatchObject({
      status: "non_converged",
      bracketWidth: 1,
      bestResidualMagnitude: 0.2,
      terminationReason: "max_iterations_reached",
    });
    expect("root" in result).toBe(false);
  });

  it("preserves a negative-to-positive bracket and scale invariance", () => {
    const solve = (scale: number) =>
      bracketedBisection({
        evaluate: (x) => scale * (x + 0.25),
        lowerBound: -2,
        upperBound: 1,
        residualTolerance: scale * 1e-12,
        bracketWidthTolerance: 1e-12,
        maxIterations: 100,
      });
    const first = solve(1);
    const scaled = solve(1e6);
    expect(first.status).toBe("converged");
    expect(scaled.status).toBe("converged");
    if (first.status === "converged" && scaled.status === "converged") {
      expect(first.root).toBe(scaled.root);
      expect(first.root).toBeCloseTo(-0.25, 12);
    }
  });

  it.each([
    ["nonfunction evaluator", { evaluate: 1 }],
    ["nonfinite lower", { lowerBound: Number.NaN }],
    ["nonfinite upper", { upperBound: Number.POSITIVE_INFINITY }],
    ["reversed bounds", { lowerBound: 2, upperBound: 1 }],
    ["infinite width", { lowerBound: -Number.MAX_VALUE, upperBound: Number.MAX_VALUE }],
    ["zero residual tolerance", { residualTolerance: 0 }],
    ["negative width tolerance", { bracketWidthTolerance: -1 }],
    ["zero iterations", { maxIterations: 0 }],
    ["fractional iterations", { maxIterations: 1.5 }],
  ] as const)("rejects %s", (_name, overrides) => {
    expect(() =>
      bracketedBisection({
        evaluate: (x: number) => x,
        lowerBound: -1,
        upperBound: 1,
        residualTolerance: 1e-12,
        bracketWidthTolerance: 1e-12,
        maxIterations: 20,
        ...overrides,
      } as never),
    ).toThrow(BracketedBisectionInputError);
  });

  it("wraps evaluator exceptions with the evaluated coordinate", () => {
    let calls = 0;
    expect(() =>
      bracketedBisection({
        evaluate: (x) => {
          calls += 1;
          if (calls === 2) {
            throw new Error("hostile evaluator");
          }
          return x;
        },
        lowerBound: -1,
        upperBound: 1,
        residualTolerance: 1e-12,
        bracketWidthTolerance: 1e-12,
        maxIterations: 20,
      }),
    ).toThrow(BracketedBisectionEvaluationError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite evaluator output %s",
    (value) => {
      expect(() =>
        bracketedBisection({
          evaluate: () => value,
          lowerBound: -1,
          upperBound: 1,
          residualTolerance: 1e-12,
          bracketWidthTolerance: 1e-12,
          maxIterations: 20,
        }),
      ).toThrow(BracketedBisectionEvaluationError);
    },
  );

  it("deep-freezes success and failure records", () => {
    const success = bracketedBisection({
      evaluate: (x) => x,
      lowerBound: -1,
      upperBound: 1,
      residualTolerance: 1e-12,
      bracketWidthTolerance: 1e-12,
      maxIterations: 20,
    });
    const failure = bracketedBisection({
      evaluate: (x) => x * x + 1,
      lowerBound: -1,
      upperBound: 1,
      residualTolerance: 1e-12,
      bracketWidthTolerance: 1e-12,
      maxIterations: 20,
    });
    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(success.tolerance)).toBe(true);
    if (success.status === "converged") {
      expect(Object.isFrozen(success.finalBracket)).toBe(true);
    }
    expect(Object.isFrozen(failure)).toBe(true);
    expect(Object.isFrozen(failure.tolerance)).toBe(true);
    if (failure.status === "invalid_bracket") {
      expect(Object.isFrozen(failure.failure)).toBe(true);
      expect(Object.isFrozen(failure.endpointResidualMagnitudes)).toBe(true);
    }
  });

  it("publishes only the controlled status vocabulary", () => {
    expect(BRACKETED_BISECTION_STATUSES).toEqual([
      "converged",
      "invalid_bracket",
      "non_converged",
    ]);
  });
});
