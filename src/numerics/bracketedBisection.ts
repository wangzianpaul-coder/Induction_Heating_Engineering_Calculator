/**
 * Controlled ID-NUM-01 bracketed scalar bisection primitive.
 *
 * The caller owns the physical domain, units, scan strategy and tolerance
 * selection. This primitive has no hidden tolerance or engineering threshold.
 * A failure never exposes the last midpoint as a candidate result.
 */

export const BRACKETED_BISECTION_STATUSES = Object.freeze([
  "converged",
  "invalid_bracket",
  "non_converged",
] as const);

export type BracketedBisectionStatus =
  (typeof BRACKETED_BISECTION_STATUSES)[number];

export interface BracketedBisectionInput {
  readonly evaluate: (x: number) => number;
  readonly lowerBound: number;
  readonly upperBound: number;
  /** Explicit absolute residual threshold in the evaluator's output unit. */
  readonly residualTolerance: number;
  /** Explicit absolute bracket-width threshold in the input unit. */
  readonly bracketWidthTolerance: number;
  readonly maxIterations: number;
}

export interface BracketedBisectionToleranceReport {
  readonly residualTolerance: number;
  readonly bracketWidthTolerance: number;
}

interface BracketedBisectionBase<TStatus extends BracketedBisectionStatus> {
  readonly algorithmId: "ID-NUM-01:bracketed-bisection";
  readonly status: TStatus;
  readonly tolerance: BracketedBisectionToleranceReport;
  readonly iterationCount: number;
  readonly functionEvaluationCount: number;
}

export interface BracketedBisectionConvergedResult
  extends BracketedBisectionBase<"converged"> {
  readonly root: number;
  readonly residual: number;
  readonly residualMagnitude: number;
  readonly finalBracket: Readonly<{
    readonly lowerBound: number;
    readonly upperBound: number;
    readonly width: number;
  }>;
  readonly terminationReason:
    | "exact_zero_at_lower_bound"
    | "exact_zero_at_upper_bound"
    | "exact_zero_at_midpoint"
    | "residual_and_bracket_tolerances_satisfied";
  readonly failure?: never;
}

export interface BracketedBisectionInvalidBracketResult
  extends BracketedBisectionBase<"invalid_bracket"> {
  readonly bracketWidth: number;
  readonly endpointResidualMagnitudes: Readonly<{
    readonly lower: number;
    readonly upper: number;
  }>;
  readonly terminationReason: "endpoint_sign_change_not_proven";
  readonly failure: Readonly<{
    readonly code: "endpoint_sign_change_not_proven";
    readonly message: string;
    readonly action: string;
  }>;
  readonly root?: never;
  readonly residual?: never;
  readonly finalBracket?: never;
}

export interface BracketedBisectionNonConvergedResult
  extends BracketedBisectionBase<"non_converged"> {
  readonly bracketWidth: number;
  readonly bestResidualMagnitude: number;
  readonly terminationReason:
    | "max_iterations_reached"
    | "machine_resolution_exhausted";
  readonly failure: Readonly<{
    readonly code:
      | "max_iterations_reached"
      | "machine_resolution_exhausted";
    readonly message: string;
    readonly action: string;
  }>;
  readonly root?: never;
  readonly residual?: never;
  readonly finalBracket?: never;
}

export type BracketedBisectionResult =
  | BracketedBisectionConvergedResult
  | BracketedBisectionInvalidBracketResult
  | BracketedBisectionNonConvergedResult;

export class BracketedBisectionInputError extends TypeError {
  public constructor(message: string) {
    super(message);
    this.name = "BracketedBisectionInputError";
  }
}

export class BracketedBisectionEvaluationError extends Error {
  public readonly x: number;

  public constructor(input: {
    readonly x: number;
    readonly message: string;
    readonly cause?: unknown;
  }) {
    if (input.cause === undefined) {
      super(input.message);
    } else {
      super(input.message, { cause: input.cause });
    }
    this.name = "BracketedBisectionEvaluationError";
    this.x = input.x;
  }
}

interface ValidatedBisectionInput extends BracketedBisectionInput {
  readonly initialWidth: number;
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BracketedBisectionInputError(`${label} must be finite.`);
  }
}

function validateInput(
  input: BracketedBisectionInput,
): ValidatedBisectionInput {
  if (typeof input.evaluate !== "function") {
    throw new BracketedBisectionInputError("evaluate must be a function.");
  }
  assertFiniteNumber(input.lowerBound, "lowerBound");
  assertFiniteNumber(input.upperBound, "upperBound");
  if (!(input.upperBound > input.lowerBound)) {
    throw new BracketedBisectionInputError(
      "Bisection requires lowerBound < upperBound.",
    );
  }
  const initialWidth = input.upperBound - input.lowerBound;
  if (!Number.isFinite(initialWidth) || initialWidth <= 0) {
    throw new BracketedBisectionInputError(
      "The initial bracket width must be positive and finite.",
    );
  }
  assertFiniteNumber(input.residualTolerance, "residualTolerance");
  assertFiniteNumber(
    input.bracketWidthTolerance,
    "bracketWidthTolerance",
  );
  if (input.residualTolerance <= 0 || input.bracketWidthTolerance <= 0) {
    throw new BracketedBisectionInputError(
      "Both explicit tolerance values must be greater than zero.",
    );
  }
  if (!Number.isSafeInteger(input.maxIterations) || input.maxIterations < 1) {
    throw new BracketedBisectionInputError(
      "maxIterations must be a positive safe integer.",
    );
  }
  return { ...input, initialWidth };
}

function frozenTolerance(
  input: ValidatedBisectionInput,
): BracketedBisectionToleranceReport {
  return Object.freeze({
    residualTolerance: input.residualTolerance,
    bracketWidthTolerance: input.bracketWidthTolerance,
  });
}

function oppositeSigns(left: number, right: number): boolean {
  return (left < 0 && right > 0) || (left > 0 && right < 0);
}

/**
 * Solve one already-selected finite bracket by bisection.
 *
 * Except for an exact-zero endpoint/midpoint, convergence requires both the
 * declared residual and bracket-width tolerances. Bracket discovery and the
 * distinction between no physical root and an unsuitable bracket remain the
 * responsibility of the calling method.
 */
export function bracketedBisection(
  input: BracketedBisectionInput,
): BracketedBisectionResult {
  const validated = validateInput(input);
  const tolerance = frozenTolerance(validated);
  let functionEvaluationCount = 0;

  const evaluate = (x: number): number => {
    let value: number;
    try {
      value = validated.evaluate(x);
      functionEvaluationCount += 1;
    } catch (cause) {
      functionEvaluationCount += 1;
      throw new BracketedBisectionEvaluationError({
        x,
        message: `Root evaluator threw at x=${String(x)}.`,
        cause,
      });
    }
    if (!Number.isFinite(value)) {
      throw new BracketedBisectionEvaluationError({
        x,
        message: `Root evaluator returned a non-finite value at x=${String(x)}.`,
      });
    }
    return value;
  };

  let lower = validated.lowerBound;
  let upper = validated.upperBound;
  let fLower = evaluate(lower);
  let fUpper = evaluate(upper);

  const converged = (
    root: number,
    residual: number,
    iterationCount: number,
    terminationReason: BracketedBisectionConvergedResult["terminationReason"],
  ): BracketedBisectionConvergedResult =>
    Object.freeze({
      algorithmId: "ID-NUM-01:bracketed-bisection" as const,
      status: "converged" as const,
      tolerance,
      iterationCount,
      functionEvaluationCount,
      root,
      residual,
      residualMagnitude: Math.abs(residual),
      finalBracket: Object.freeze({
        lowerBound: lower,
        upperBound: upper,
        width: upper - lower,
      }),
      terminationReason,
    });

  if (fLower === 0) {
    return converged(lower, fLower, 0, "exact_zero_at_lower_bound");
  }
  if (fUpper === 0) {
    return converged(upper, fUpper, 0, "exact_zero_at_upper_bound");
  }
  if (!oppositeSigns(fLower, fUpper)) {
    return Object.freeze({
      algorithmId: "ID-NUM-01:bracketed-bisection" as const,
      status: "invalid_bracket" as const,
      tolerance,
      iterationCount: 0,
      functionEvaluationCount,
      bracketWidth: validated.initialWidth,
      endpointResidualMagnitudes: Object.freeze({
        lower: Math.abs(fLower),
        upper: Math.abs(fUpper),
      }),
      terminationReason: "endpoint_sign_change_not_proven" as const,
      failure: Object.freeze({
        code: "endpoint_sign_change_not_proven" as const,
        message:
          "The finite endpoints are nonzero and do not prove a sign-changing root bracket.",
        action:
          "Return to the calling method's finite physical-domain scan; do not relabel this condition as numerical non-convergence or publish a midpoint.",
      }),
    });
  }

  let bestRoot = Math.abs(fLower) <= Math.abs(fUpper) ? lower : upper;
  let bestResidual = bestRoot === lower ? fLower : fUpper;
  let bestResidualMagnitude = Math.abs(bestResidual);
  if (
    validated.initialWidth <= validated.bracketWidthTolerance &&
    bestResidualMagnitude <= validated.residualTolerance
  ) {
    return converged(
      bestRoot,
      bestResidual,
      0,
      "residual_and_bracket_tolerances_satisfied",
    );
  }
  for (let iterationCount = 1; iterationCount <= validated.maxIterations; iterationCount += 1) {
    const width = upper - lower;
    const midpoint = lower + width / 2;
    if (!Number.isFinite(midpoint) || midpoint === lower || midpoint === upper) {
      return Object.freeze({
        algorithmId: "ID-NUM-01:bracketed-bisection" as const,
        status: "non_converged" as const,
        tolerance,
        iterationCount: iterationCount - 1,
        functionEvaluationCount,
        bracketWidth: width,
        bestResidualMagnitude,
        terminationReason: "machine_resolution_exhausted" as const,
        failure: Object.freeze({
          code: "machine_resolution_exhausted" as const,
          message:
            "No distinct binary64 midpoint remains inside the proven bracket before both declared tolerances were satisfied.",
          action:
            "Use an approved higher-precision solver path or rescale the variable; do not publish either endpoint as the root.",
        }),
      });
    }

    const fMidpoint = evaluate(midpoint);
    if (fMidpoint === 0) {
      lower = midpoint;
      upper = midpoint;
      return converged(
        midpoint,
        fMidpoint,
        iterationCount,
        "exact_zero_at_midpoint",
      );
    }

    if (oppositeSigns(fLower, fMidpoint)) {
      upper = midpoint;
      fUpper = fMidpoint;
    } else if (oppositeSigns(fMidpoint, fUpper)) {
      lower = midpoint;
      fLower = fMidpoint;
    } else {
      // With finite deterministic values and a proven sign-changing bracket,
      // this branch is unreachable except for a violated evaluator contract.
      throw new BracketedBisectionEvaluationError({
        x: midpoint,
        message:
          "The evaluator did not preserve the proven sign-changing bracket.",
      });
    }

    // Re-select only from the two endpoints of the retained bracket. A point
    // discarded by the sign update must never later be published as its root.
    bestRoot = Math.abs(fLower) <= Math.abs(fUpper) ? lower : upper;
    bestResidual = bestRoot === lower ? fLower : fUpper;
    bestResidualMagnitude = Math.abs(bestResidual);
    const updatedWidth = upper - lower;
    if (
      bestResidualMagnitude <= validated.residualTolerance &&
      updatedWidth <= validated.bracketWidthTolerance
    ) {
      return converged(
        bestRoot,
        bestResidual,
        iterationCount,
        "residual_and_bracket_tolerances_satisfied",
      );
    }
  }

  return Object.freeze({
    algorithmId: "ID-NUM-01:bracketed-bisection" as const,
    status: "non_converged" as const,
    tolerance,
    iterationCount: validated.maxIterations,
    functionEvaluationCount,
    bracketWidth: upper - lower,
    bestResidualMagnitude,
    terminationReason: "max_iterations_reached" as const,
    failure: Object.freeze({
      code: "max_iterations_reached" as const,
      message:
        "The proven bracket did not satisfy both declared tolerances within maxIterations.",
      action:
        "Review the explicit solver settings and physical model, then rerun; do not publish the last midpoint as a result.",
    }),
  });
}
