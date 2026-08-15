/**
 * Controlled ID-NUM-01 composite-Simpson numerical primitive.
 *
 * This module reports numerical grid-refinement consistency only. It does not
 * establish integrand applicability, physical-model accuracy, or validation.
 */

export const COMPOSITE_SIMPSON_STATUSES = Object.freeze([
  "converged",
  "non_converged",
] as const);

export type CompositeSimpsonStatus =
  (typeof COMPOSITE_SIMPSON_STATUSES)[number];

export type CompositeSimpsonLevelId = "n" | "2n" | "4n";

export interface CompositeSimpsonInput {
  readonly integrand: (x: number) => number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly segmentCount: number;
  /** Explicit absolute component of the convergence threshold. */
  readonly absoluteTolerance: number;
  /** Explicit relative component, expressed as a non-negative fraction. */
  readonly relativeTolerance: number;
}

export interface CompositeSimpsonEstimate {
  readonly level: CompositeSimpsonLevelId;
  readonly segmentCount: number;
  readonly value: number;
  readonly newFunctionEvaluationCount: number;
  readonly cumulativeFunctionEvaluationCount: number;
}

export interface CompositeSimpsonRefinementDifferences {
  readonly nTo2n: number;
  readonly twoNTo4n: number;
}

export interface CompositeSimpsonToleranceReport {
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  /** The finer, 4n estimate is the declared relative-tolerance scale. */
  readonly relativeScale: number;
  /** absoluteTolerance + relativeTolerance * abs(I_4n). */
  readonly threshold: number;
  /** abs(I_4n - I_2n), compared directly without an unapproved factor. */
  readonly observedDifference: number;
}

export interface CompositeSimpsonFailureToleranceReport {
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly threshold: number;
  readonly observedDifference: number;
}

interface CompositeSimpsonResultBase<TStatus extends CompositeSimpsonStatus> {
  readonly algorithmId: "ID-NUM-01";
  readonly status: TStatus;
  readonly convergenceMeaning: "numerical_grid_refinement_only";
  readonly evaluatedSegmentCounts: Readonly<{
    readonly n: number;
    readonly twoN: number;
    readonly fourN: number;
  }>;
  readonly functionEvaluationCount: number;
}

export interface CompositeSimpsonConvergedResult
  extends CompositeSimpsonResultBase<"converged"> {
  readonly estimates: Readonly<{
    readonly n: CompositeSimpsonEstimate;
    readonly twoN: CompositeSimpsonEstimate;
    readonly fourN: CompositeSimpsonEstimate;
  }>;
  readonly refinementDifferences: CompositeSimpsonRefinementDifferences;
  readonly tolerance: CompositeSimpsonToleranceReport;
}

export interface CompositeSimpsonNonConvergedResult
  extends CompositeSimpsonResultBase<"non_converged"> {
  readonly refinementDifferences: CompositeSimpsonRefinementDifferences;
  readonly tolerance: CompositeSimpsonFailureToleranceReport;
  readonly failure: Readonly<{
    readonly code: "grid_refinement_tolerance_not_satisfied";
    readonly message: string;
    readonly action: string;
  }>;
  readonly estimates?: never;
}

export type CompositeSimpsonResult =
  | CompositeSimpsonConvergedResult
  | CompositeSimpsonNonConvergedResult;

export class CompositeSimpsonInputError extends TypeError {
  public constructor(message: string) {
    super(message);
    this.name = "CompositeSimpsonInputError";
  }
}

export type CompositeSimpsonEvaluationLocation = "endpoint" | "interior";

export class CompositeSimpsonEvaluationError extends Error {
  public readonly x: number;
  public readonly finestGridIndex: number;
  public readonly location: CompositeSimpsonEvaluationLocation;

  public constructor(input: {
    readonly message: string;
    readonly x: number;
    readonly finestGridIndex: number;
    readonly location: CompositeSimpsonEvaluationLocation;
    readonly cause?: unknown;
  }) {
    if (input.cause === undefined) {
      super(input.message);
    } else {
      super(input.message, { cause: input.cause });
    }
    this.name = "CompositeSimpsonEvaluationError";
    this.x = input.x;
    this.finestGridIndex = input.finestGridIndex;
    this.location = input.location;
  }
}

export class CompositeSimpsonNumericalError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CompositeSimpsonNumericalError";
  }
}

interface ValidatedInput extends CompositeSimpsonInput {
  readonly finestSegmentCount: number;
  readonly intervalWidth: number;
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CompositeSimpsonInputError(`${label} must be finite.`);
  }
}

function validateInput(input: CompositeSimpsonInput): ValidatedInput {
  if (typeof input.integrand !== "function") {
    throw new CompositeSimpsonInputError("integrand must be a function.");
  }
  assertFiniteNumber(input.lowerBound, "lowerBound");
  assertFiniteNumber(input.upperBound, "upperBound");
  if (!(input.upperBound > input.lowerBound)) {
    throw new CompositeSimpsonInputError(
      "Composite Simpson requires finite bounds with lowerBound < upperBound.",
    );
  }

  if (
    !Number.isSafeInteger(input.segmentCount) ||
    input.segmentCount < 2 ||
    input.segmentCount % 2 !== 0
  ) {
    throw new CompositeSimpsonInputError(
      "segmentCount must be a positive even safe integer greater than or equal to 2.",
    );
  }
  const finestSegmentCount = input.segmentCount * 4;
  if (!Number.isSafeInteger(finestSegmentCount)) {
    throw new CompositeSimpsonInputError(
      "4 * segmentCount must remain a safe integer.",
    );
  }

  assertFiniteNumber(input.absoluteTolerance, "absoluteTolerance");
  assertFiniteNumber(input.relativeTolerance, "relativeTolerance");
  if (input.absoluteTolerance < 0 || input.relativeTolerance < 0) {
    throw new CompositeSimpsonInputError(
      "Absolute and relative tolerances must be non-negative.",
    );
  }
  if (input.absoluteTolerance === 0 && input.relativeTolerance === 0) {
    throw new CompositeSimpsonInputError(
      "At least one explicit tolerance component must be greater than zero.",
    );
  }

  const intervalWidth = input.upperBound - input.lowerBound;
  if (!Number.isFinite(intervalWidth) || intervalWidth <= 0) {
    throw new CompositeSimpsonInputError(
      "The integration interval width must be positive and finite.",
    );
  }
  const finestStep = intervalWidth / finestSegmentCount;
  if (
    !Number.isFinite(finestStep) ||
    finestStep <= 0 ||
    input.lowerBound + finestStep === input.lowerBound ||
    input.upperBound - finestStep === input.upperBound
  ) {
    throw new CompositeSimpsonInputError(
      "The n,2n,4n grid is not representable at JavaScript number precision.",
    );
  }

  return {
    ...input,
    finestSegmentCount,
    intervalWidth,
  };
}

function frozenEstimate(
  estimate: CompositeSimpsonEstimate,
): CompositeSimpsonEstimate {
  return Object.freeze(estimate);
}

/**
 * Evaluate ID-NUM-01 at n, 2n and 4n.
 *
 * Nested-grid values are cached by their exact 4n-grid index. Consequently,
 * a successful three-level run calls the integrand exactly 4n + 1 times.
 */
export function compositeSimpson(
  input: CompositeSimpsonInput,
): CompositeSimpsonResult {
  const validated = validateInput(input);
  const valueCache = new Map<number, number>();
  let functionEvaluationCount = 0;

  const evaluate = (finestGridIndex: number): number => {
    const cached = valueCache.get(finestGridIndex);
    if (cached !== undefined || valueCache.has(finestGridIndex)) {
      return cached as number;
    }

    const x =
      finestGridIndex === 0
        ? validated.lowerBound
        : finestGridIndex === validated.finestSegmentCount
          ? validated.upperBound
          : validated.lowerBound +
            validated.intervalWidth *
              (finestGridIndex / validated.finestSegmentCount);
    const location: CompositeSimpsonEvaluationLocation =
      finestGridIndex === 0 ||
      finestGridIndex === validated.finestSegmentCount
        ? "endpoint"
        : "interior";

    let value: number;
    try {
      value = validated.integrand(x);
      functionEvaluationCount += 1;
    } catch (cause) {
      functionEvaluationCount += 1;
      throw new CompositeSimpsonEvaluationError({
        message: `Integrand threw at ${location} x=${String(x)}.`,
        x,
        finestGridIndex,
        location,
        cause,
      });
    }
    if (!Number.isFinite(value)) {
      throw new CompositeSimpsonEvaluationError({
        message: `Integrand returned a non-finite value at ${location} x=${String(x)}.`,
        x,
        finestGridIndex,
        location,
      });
    }
    valueCache.set(finestGridIndex, value);
    return value;
  };

  const estimateAt = (
    level: CompositeSimpsonLevelId,
    segmentCount: number,
    finestGridStride: number,
  ): CompositeSimpsonEstimate => {
    const evaluationsBefore = functionEvaluationCount;
    let sum = 0;
    let compensation = 0;

    const addWeightedValue = (weightedValue: number): void => {
      if (!Number.isFinite(weightedValue)) {
        throw new CompositeSimpsonNumericalError(
          `Weighted Simpson term overflowed at level ${level}.`,
        );
      }
      const next = sum + weightedValue;
      if (!Number.isFinite(next)) {
        throw new CompositeSimpsonNumericalError(
          `Composite Simpson accumulation overflowed at level ${level}.`,
        );
      }
      if (Math.abs(sum) >= Math.abs(weightedValue)) {
        compensation += (sum - next) + weightedValue;
      } else {
        compensation += (weightedValue - next) + sum;
      }
      if (!Number.isFinite(compensation)) {
        throw new CompositeSimpsonNumericalError(
          `Composite Simpson compensation overflowed at level ${level}.`,
        );
      }
      sum = next;
    };

    for (let index = 0; index <= segmentCount; index += 1) {
      const value = evaluate(index * finestGridStride);
      const weight =
        index === 0 || index === segmentCount
          ? 1
          : index % 2 === 0
            ? 2
            : 4;
      addWeightedValue(weight * value);
    }

    const correctedSum = sum + compensation;
    const step = validated.intervalWidth / segmentCount;
    const estimate = (step / 3) * correctedSum;
    if (!Number.isFinite(correctedSum) || !Number.isFinite(estimate)) {
      throw new CompositeSimpsonNumericalError(
        `Composite Simpson estimate is non-finite at level ${level}.`,
      );
    }
    return frozenEstimate({
      level,
      segmentCount,
      value: estimate,
      newFunctionEvaluationCount:
        functionEvaluationCount - evaluationsBefore,
      cumulativeFunctionEvaluationCount: functionEvaluationCount,
    });
  };

  // The controlled sequence is always completed; there is no early exit at 2n.
  const n = estimateAt("n", validated.segmentCount, 4);
  const twoN = estimateAt("2n", validated.segmentCount * 2, 2);
  const fourN = estimateAt("4n", validated.finestSegmentCount, 1);

  const nTo2n = Math.abs(twoN.value - n.value);
  const twoNTo4n = Math.abs(fourN.value - twoN.value);
  const relativeScale = Math.abs(fourN.value);
  const threshold =
    validated.absoluteTolerance +
    validated.relativeTolerance * relativeScale;
  if (
    !Number.isFinite(nTo2n) ||
    !Number.isFinite(twoNTo4n) ||
    !Number.isFinite(relativeScale) ||
    !Number.isFinite(threshold)
  ) {
    throw new CompositeSimpsonNumericalError(
      "Refinement difference or tolerance threshold is non-finite.",
    );
  }

  const status: CompositeSimpsonStatus =
    twoNTo4n <= threshold ? "converged" : "non_converged";
  const estimates = Object.freeze({ n, twoN, fourN });
  const refinementDifferences = Object.freeze({ nTo2n, twoNTo4n });
  const tolerance = Object.freeze({
    absoluteTolerance: validated.absoluteTolerance,
    relativeTolerance: validated.relativeTolerance,
    relativeScale,
    threshold,
    observedDifference: twoNTo4n,
  });
  const evaluatedSegmentCounts = Object.freeze({
    n: n.segmentCount,
    twoN: twoN.segmentCount,
    fourN: fourN.segmentCount,
  });
  const common = {
    algorithmId: "ID-NUM-01",
    convergenceMeaning: "numerical_grid_refinement_only",
    evaluatedSegmentCounts,
    functionEvaluationCount,
  } as const;
  if (status === "non_converged") {
    return Object.freeze({
      ...common,
      status,
      refinementDifferences,
      tolerance: Object.freeze({
        absoluteTolerance: tolerance.absoluteTolerance,
        relativeTolerance: tolerance.relativeTolerance,
        threshold: tolerance.threshold,
        observedDifference: tolerance.observedDifference,
      }),
      failure: Object.freeze({
        code: "grid_refinement_tolerance_not_satisfied" as const,
        message:
          "The declared n,2n,4n grid-refinement tolerance was not satisfied; no integral estimate is published.",
        action:
          "Use an approved higher-resolution or transformed integration path and repeat the controlled convergence check.",
      }),
    });
  }
  return Object.freeze({
    ...common,
    status,
    estimates,
    refinementDifferences,
    tolerance,
  });
}
