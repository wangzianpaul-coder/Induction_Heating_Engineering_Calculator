import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import {
  METHOD_SPECIFICATION_REGISTRY,
  type MethodSpecification,
} from "../registries/methodSpecificationRegistry.js";
import {
  deepFreeze,
  normalizeJson,
  type JsonValue,
} from "../serialization/canonical-json.js";
import {
  canonicalUnitIdFor,
  dimensionId,
  unitId,
  type DimensionId,
  type UnitId,
} from "../units/index.js";
import type { MethodId, SnapshotId, SourceRef } from "./ids.js";
import {
  contentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "./ids.js";
import {
  APPLICABILITY_STATUSES,
  APPROVAL_STATUSES,
  DATA_QUALITIES,
  FAILURE_RESULT_STATUSES,
  RESULT_PROVENANCES,
  SCIENTIFIC_CONFIDENCES,
  SUCCESS_RESULT_STATUSES,
  VALIDATION_STATUSES,
  assertControlledValue,
  isFailureResultStatus,
  isSuccessResultStatus,
  type ApplicabilityStatus,
  type ApprovalStatus,
  type DataQuality,
  type FailureResultStatus,
  type ResultProvenance,
  type ScientificConfidence,
  type SuccessResultStatus,
  type ValidationStatus,
} from "./status.js";
import type { CalculationTrace, TraceNode } from "./trace.js";
import { assertCalculationTrace } from "./trace.js";
import type { WarningRecord } from "./warning.js";
import { assertWarningRecord, hasBlockingWarning } from "./warning.js";

export const SOLVER_TERMINATION_STATUSES = Object.freeze([
  "not_required",
  "converged",
  "not_applicable",
  "insufficient_data",
  "non_converged",
  "no_feasible_solution",
  "invalid_input",
  "inconsistent_measurement",
] as const);
export type SolverTerminationStatus =
  (typeof SOLVER_TERMINATION_STATUSES)[number];

export interface SolverResidual {
  readonly residualId: string;
  readonly valueSi: number;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly toleranceSi: number | null;
  readonly satisfied: boolean | null;
}

export interface SolverReport {
  readonly terminationStatus: SolverTerminationStatus;
  readonly iterationCount: number;
  readonly residuals: readonly SolverResidual[];
  readonly reason: string;
}

export type EngineeringOutputStatus =
  | "available"
  | "not_applicable"
  | "insufficient_data";

interface EngineeringOutputBase<
  TKind extends string,
  TStatus extends EngineeringOutputStatus,
> {
  readonly kind: TKind;
  readonly outputId: string;
  readonly status: TStatus;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
}

export interface ScalarEngineeringOutput
  extends EngineeringOutputBase<"scalar", "available"> {
  readonly valueSi: number;
}

export interface VectorEngineeringOutput
  extends EngineeringOutputBase<"vector", "available"> {
  readonly valuesSi: readonly number[];
}

export interface CategoricalEngineeringOutput
  extends EngineeringOutputBase<"categorical", "available"> {
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly value: string;
}

export interface BooleanEngineeringOutput
  extends EngineeringOutputBase<"boolean", "available"> {
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly value: boolean;
}

/**
 * Accounts for a contract output that is conditionally unavailable without
 * inserting zero, NaN, an empty vector, or a previous iterate as a placeholder.
 */
export interface UnavailableEngineeringOutput
{
  readonly kind: "unavailable";
  readonly outputId: string;
  readonly reason: string;
  readonly status: "not_applicable" | "insufficient_data";
}

export type EngineeringOutput =
  | ScalarEngineeringOutput
  | VectorEngineeringOutput
  | CategoricalEngineeringOutput
  | BooleanEngineeringOutput
  | UnavailableEngineeringOutput;

export interface EngineeringOutputEnvelope {
  readonly kind: "engineering_output_envelope";
  readonly status: "complete";
  readonly outputs: readonly [EngineeringOutput, ...EngineeringOutput[]];
}

export interface ResultVersionStamp {
  readonly application: string;
  readonly calculationModel: string;
  readonly materialDatabase: string;
  readonly caseSchema: string;
  readonly resultSchema: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly methodRegistry: string;
  readonly warningRules: string;
  readonly inputSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotIds: readonly string[];
}

export interface ResultRecommendation {
  readonly isRecommended: boolean;
  readonly recommendedMethodId: MethodId | null;
  readonly recommendedMethodVersion: string | null;
  readonly reason: string;
}

export interface ResultContext {
  readonly scientificConfidence: ScientificConfidence | null;
  readonly scientificConfidenceReason: string;
  readonly dataQuality: DataQuality;
  readonly validationStatus: ValidationStatus;
  readonly sourceRefs: readonly SourceRef[];
  readonly assumptions: readonly string[];
  readonly engineeringPrecision: Readonly<Record<string, JsonValue>>;
  readonly solverReport: SolverReport;
  readonly recommendation: ResultRecommendation;
  readonly versions: ResultVersionStamp;
}

export interface FailureDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly action: string;
  readonly details: Readonly<Record<string, JsonValue>>;
}

interface CalculationResultBase<
  TStatus extends SuccessResultStatus | FailureResultStatus,
> {
  readonly schemaVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly status: TStatus;
  readonly methodId: MethodId;
  readonly methodVersion: string;
  readonly methodApproval: ApprovalStatus;
  readonly applicabilityStatus: ApplicabilityStatus;
  readonly warnings: readonly WarningRecord[];
  readonly trace: CalculationTrace;
  readonly context: ResultContext;
}

export interface SuccessfulCalculationResult
  extends CalculationResultBase<SuccessResultStatus> {
  readonly status: SuccessResultStatus;
  readonly methodApproval: "approved" | "approved_with_limitation";
  readonly value: EngineeringOutputEnvelope;
  readonly provenance: ResultProvenance;
  readonly failure?: never;
}

export interface FailedCalculationResult
  extends CalculationResultBase<FailureResultStatus> {
  readonly status: FailureResultStatus;
  readonly failure: FailureDiagnostic;
  readonly value?: never;
  readonly provenance?: never;
}

export type CalculationResult =
  | SuccessfulCalculationResult
  | FailedCalculationResult;

interface ResultInputBase<
  TStatus extends SuccessResultStatus | FailureResultStatus,
> {
  readonly status: TStatus;
  readonly methodId: string;
  readonly methodVersion: string;
  readonly methodApproval: ApprovalStatus;
  readonly applicabilityStatus: ApplicabilityStatus;
  readonly warnings: readonly WarningRecord[];
  readonly trace: CalculationTrace;
  readonly context: Omit<ResultContext, "sourceRefs" | "recommendation"> & {
    readonly sourceRefs: readonly string[];
    readonly recommendation: Omit<
      ResultRecommendation,
      "recommendedMethodId"
    > & {
      readonly recommendedMethodId: string | null;
    };
  };
}

export interface SuccessfulCalculationResultInput
  extends ResultInputBase<SuccessResultStatus> {
  readonly status: SuccessResultStatus;
  readonly methodApproval: "approved" | "approved_with_limitation";
  readonly value: EngineeringOutputEnvelope;
  readonly provenance: ResultProvenance;
  readonly failure?: never;
}

export interface FailedCalculationResultInput
  extends ResultInputBase<FailureResultStatus> {
  readonly status: FailureResultStatus;
  readonly failure: FailureDiagnostic;
  readonly value?: never;
  readonly provenance?: never;
}

export type CalculationResultInput =
  | SuccessfulCalculationResultInput
  | FailedCalculationResultInput;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const controlled = [...expected].sort();
  return (
    actual.length === controlled.length &&
    actual.every((key, index) => key === controlled[index])
  );
}

function assertNonBlank(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-blank string.`);
  }
}

function normalizeRecord(
  value: Readonly<Record<string, JsonValue>>,
  fieldName: string,
): Readonly<Record<string, JsonValue>> {
  const normalized = normalizeJson(value);
  if (!isRecord(normalized)) {
    throw new TypeError(`${fieldName} must be a JSON object.`);
  }
  return normalized as Readonly<Record<string, JsonValue>>;
}

function normalizeResidual(value: unknown): SolverResidual {
  const normalized = normalizeJson(value);
  if (
    !isRecord(normalized) ||
    !hasExactKeys(normalized, [
      "residualId",
      "valueSi",
      "dimensionId",
      "canonicalUnitId",
      "toleranceSi",
      "satisfied",
    ])
  ) {
    throw new TypeError("Solver residual fields do not match the controlled schema.");
  }
  assertNonBlank(normalized.residualId, "solver residual residualId");
  sourceRef(normalized.residualId);
  if (typeof normalized.valueSi !== "number" || !Number.isFinite(normalized.valueSi)) {
    throw new TypeError("Solver residual valueSi must be finite.");
  }
  assertNonBlank(normalized.dimensionId, "solver residual dimensionId");
  assertNonBlank(normalized.canonicalUnitId, "solver residual canonicalUnitId");
  const controlledDimensionId = dimensionId(normalized.dimensionId);
  const controlledUnitId = unitId(normalized.canonicalUnitId);
  if (canonicalUnitIdFor(controlledDimensionId) !== controlledUnitId) {
    throw new TypeError(
      "Solver residual canonicalUnitId must be canonical for its dimensionId.",
    );
  }
  if (
    normalized.toleranceSi !== null &&
    (typeof normalized.toleranceSi !== "number" ||
      !Number.isFinite(normalized.toleranceSi) ||
      normalized.toleranceSi < 0)
  ) {
    throw new TypeError("Solver residual toleranceSi must be null or non-negative and finite.");
  }
  if (
    normalized.satisfied !== null &&
    typeof normalized.satisfied !== "boolean"
  ) {
    throw new TypeError("Solver residual satisfied must be boolean or null.");
  }
  return {
    residualId: normalized.residualId,
    valueSi: normalized.valueSi,
    dimensionId: controlledDimensionId,
    canonicalUnitId: controlledUnitId,
    toleranceSi: normalized.toleranceSi,
    satisfied: normalized.satisfied,
  };
}

function normalizeSolverReport(value: unknown): SolverReport {
  const normalized = normalizeJson(value);
  if (
    !isRecord(normalized) ||
    !hasExactKeys(normalized, [
      "terminationStatus",
      "iterationCount",
      "residuals",
      "reason",
    ]) ||
    !Array.isArray(normalized.residuals)
  ) {
    throw new TypeError("SolverReport fields do not match the controlled schema.");
  }
  assertControlledValue(
    "result.context.solverReport.terminationStatus",
    SOLVER_TERMINATION_STATUSES,
    normalized.terminationStatus,
  );
  if (
    typeof normalized.iterationCount !== "number" ||
    !Number.isSafeInteger(normalized.iterationCount) ||
    normalized.iterationCount < 0
  ) {
    throw new TypeError("SolverReport.iterationCount must be a non-negative safe integer.");
  }
  assertNonBlank(normalized.reason, "result.context.solverReport.reason");
  const residuals = normalized.residuals.map(normalizeResidual);
  if (new Set(residuals.map((residual) => residual.residualId)).size !== residuals.length) {
    throw new TypeError("SolverReport residual IDs must be unique.");
  }
  if (
    normalized.terminationStatus === "not_required" &&
    (normalized.iterationCount !== 0 || residuals.length !== 0)
  ) {
    throw new TypeError(
      "terminationStatus=not_required requires zero iterations and no residuals.",
    );
  }
  if (
    normalized.terminationStatus === "converged" &&
    (residuals.length === 0 ||
      residuals.some(
        (residual) =>
          residual.toleranceSi === null || residual.satisfied !== true,
      ))
  ) {
    throw new TypeError(
      "terminationStatus=converged requires at least one tolerance-bearing satisfied residual.",
    );
  }
  return {
    terminationStatus: normalized.terminationStatus,
    iterationCount: normalized.iterationCount,
    residuals,
    reason: normalized.reason,
  };
}

function assertSolverResultConsistency(
  resultStatus: SuccessResultStatus | FailureResultStatus,
  terminationStatus: SolverTerminationStatus,
): void {
  if (isSuccessResultStatus(resultStatus)) {
    if (terminationStatus !== "not_required" && terminationStatus !== "converged") {
      throw new TypeError(
        `Successful result status ${resultStatus} is inconsistent with solver termination ${terminationStatus}.`,
      );
    }
    return;
  }
  if (terminationStatus !== resultStatus) {
    throw new TypeError(
      `Failure result status ${resultStatus} requires solver terminationStatus=${resultStatus}.`,
    );
  }
}

function validateWarnings(
  warnings: readonly WarningRecord[],
  specification: MethodSpecification,
): void {
  for (const warning of warnings) {
    assertWarningRecord(warning);
    if (
      warning.methodId !== specification.methodId ||
      warning.moduleId !== specification.moduleId
    ) {
      throw new TypeError(
        `Warning ${warning.warningId} must be owned by method ${specification.methodId} and module ${specification.moduleId}.`,
      );
    }
  }
}

function normalizeContext(
  input: ResultInputBase<
    SuccessResultStatus | FailureResultStatus
  >["context"],
  resultStatus: SuccessResultStatus | FailureResultStatus,
): ResultContext {
  if (input.scientificConfidence !== null) {
    assertControlledValue(
      "result.scientificConfidence",
      SCIENTIFIC_CONFIDENCES,
      input.scientificConfidence,
    );
  }
  assertNonBlank(
    input.scientificConfidenceReason,
    "result.scientificConfidenceReason",
  );
  assertControlledValue("result.dataQuality", DATA_QUALITIES, input.dataQuality);
  assertControlledValue(
    "result.validationStatus",
    VALIDATION_STATUSES,
    input.validationStatus,
  );

  if (input.sourceRefs.length === 0) {
    throw new TypeError(
      "result.context.sourceRefs must contain at least one source reference.",
    );
  }
  if (new Set(input.sourceRefs).size !== input.sourceRefs.length) {
    throw new TypeError("result.context.sourceRefs must not contain duplicates.");
  }
  for (const assumption of input.assumptions) {
    assertNonBlank(assumption, "result.context.assumptions[]");
  }
  if (typeof input.recommendation.isRecommended !== "boolean") {
    throw new TypeError(
      "result.context.recommendation.isRecommended must be boolean.",
    );
  }
  assertNonBlank(
    input.recommendation.reason,
    "result.context.recommendation.reason",
  );
  const recommendedMethodId = input.recommendation.recommendedMethodId;
  const recommendedMethodVersion =
    input.recommendation.recommendedMethodVersion;
  if ((recommendedMethodId === null) !== (recommendedMethodVersion === null)) {
    throw new TypeError(
      "Recommended method ID and version must either both be present or both be null.",
    );
  }
  if (input.recommendation.isRecommended && recommendedMethodId === null) {
    throw new TypeError(
      "isRecommended=true requires a recommended method ID and version.",
    );
  }
  const normalizedRecommendedMethodId =
    recommendedMethodId === null ? null : methodId(recommendedMethodId);
  if (recommendedMethodVersion !== null) {
    assertNonBlank(
      recommendedMethodVersion,
      "result.context.recommendation.recommendedMethodVersion",
    );
  }

  const versions = input.versions;
  const expectedVersions = {
    application: VERSION_INFO.application,
    calculationModel: VERSION_INFO.calculationModel,
    materialDatabase: VERSION_INFO.materialDatabase,
    caseSchema: VERSION_INFO.caseSchema,
    resultSchema: VERSION_INFO.resultSchema,
    methodRegistry: VERSION_INFO.methodRegistry,
    warningRules: VERSION_INFO.warningRules,
  } as const;
  for (const [field, expected] of Object.entries(expectedVersions)) {
    if (versions[field as keyof typeof expectedVersions] !== expected) {
      throw new TypeError(
        `Result version ${field} must be ${expected} for this build.`,
      );
    }
  }
  if (versions.technicalFreezeId !== TECHNICAL_FREEZE_ID) {
    throw new TypeError(
      `Result technical freeze ${String(versions.technicalFreezeId)} does not match ${TECHNICAL_FREEZE_ID}.`,
    );
  }
  const inputSnapshotId = contentAddressedSnapshotId(
    versions.inputSnapshotId,
    "case",
  );
  const geometrySnapshotId = contentAddressedSnapshotId(
    versions.geometrySnapshotId,
    "geometry",
  );
  const materialSnapshotIds = versions.materialSnapshotIds.map((snapshot) =>
    contentAddressedSnapshotId(snapshot, "material"),
  );
  if (new Set(materialSnapshotIds).size !== materialSnapshotIds.length) {
    throw new TypeError("Result materialSnapshotIds must not contain duplicates.");
  }

  const engineeringPrecision = normalizeRecord(
    input.engineeringPrecision,
    "result.context.engineeringPrecision",
  );
  if (Object.keys(engineeringPrecision).length === 0) {
    throw new TypeError(
      "result.context.engineeringPrecision must be explicit.",
    );
  }
  const solverReport = normalizeSolverReport(input.solverReport);
  assertSolverResultConsistency(resultStatus, solverReport.terminationStatus);

  return {
    scientificConfidence: input.scientificConfidence,
    scientificConfidenceReason: input.scientificConfidenceReason,
    dataQuality: input.dataQuality,
    validationStatus: input.validationStatus,
    sourceRefs: input.sourceRefs.map((ref) => sourceRef(ref)),
    assumptions: [...input.assumptions],
    engineeringPrecision,
    solverReport,
    recommendation: {
      isRecommended: input.recommendation.isRecommended,
      recommendedMethodId: normalizedRecommendedMethodId,
      recommendedMethodVersion,
      reason: input.recommendation.reason,
    },
    versions: {
      application: versions.application,
      calculationModel: versions.calculationModel,
      materialDatabase: versions.materialDatabase,
      caseSchema: versions.caseSchema,
      resultSchema: versions.resultSchema,
      technicalFreezeId: versions.technicalFreezeId,
      methodRegistry: versions.methodRegistry,
      warningRules: versions.warningRules,
      inputSnapshotId,
      geometrySnapshotId,
      materialSnapshotIds,
    },
  };
}

function tracePayloadString(
  node: TraceNode,
  fieldName: string,
): string | undefined {
  const value = node.payload[fieldName];
  return typeof value === "string" ? value : undefined;
}

function assertTraceBoundaryConsistency(
  trace: CalculationTrace,
  input: ResultInputBase<SuccessResultStatus | FailureResultStatus>,
  context: ResultContext,
): void {
  const expectedSnapshots: readonly SnapshotId[] = [
    contentAddressedSnapshotId(context.versions.inputSnapshotId, "case"),
    contentAddressedSnapshotId(context.versions.geometrySnapshotId, "geometry"),
    ...context.versions.materialSnapshotIds.map((id) =>
      contentAddressedSnapshotId(id, "material"),
    ),
  ];
  const traceSnapshots = trace.nodes
    .filter((node) => node.kind === "input_snapshot")
    .map((node) => tracePayloadString(node, "snapshotId"));
  if (
    traceSnapshots.some((value) => value === undefined) ||
    new Set(traceSnapshots).size !== traceSnapshots.length ||
    traceSnapshots.length !== expectedSnapshots.length ||
    expectedSnapshots.some((id) => !traceSnapshots.includes(id))
  ) {
    throw new TypeError(
      "Trace input_snapshot nodes must exactly match the result case, geometry, and material snapshot IDs.",
    );
  }

  const outerMethodNodes = trace.nodes.filter(
    (node) =>
      node.kind === "method" && node.payload.role === "result_method",
  );
  if (outerMethodNodes.length !== 1) {
    throw new TypeError(
      "Trace must contain exactly one method node with role=result_method.",
    );
  }
  const outerMethodNode = outerMethodNodes[0];
  if (
    outerMethodNode === undefined ||
    tracePayloadString(outerMethodNode, "methodId") !== input.methodId ||
    tracePayloadString(outerMethodNode, "methodVersion") !==
      input.methodVersion ||
    tracePayloadString(outerMethodNode, "methodApproval") !==
      input.methodApproval
  ) {
    throw new TypeError(
      "Trace result_method identity, version, and approval must match the outer result.",
    );
  }

  const resultNode = trace.nodes.find(
    (node) => node.nodeId === trace.resultNodeId,
  );
  if (
    resultNode === undefined ||
    resultNode.kind !== "result" ||
    tracePayloadString(resultNode, "status") !== input.status
  ) {
    throw new TypeError(
      "Trace result-node status must match the outer result status.",
    );
  }
}

function assertRecommendation(
  input: ResultInputBase<SuccessResultStatus | FailureResultStatus>,
  methodSpecification: MethodSpecification,
  context: ResultContext,
): void {
  const recommendedMethodId = context.recommendation.recommendedMethodId;
  if (recommendedMethodId !== null) {
    const recommendedSpecification =
      METHOD_SPECIFICATION_REGISTRY.find(recommendedMethodId);
    if (
      recommendedSpecification === undefined ||
      (recommendedSpecification.approvalStatus !== "approved" &&
        recommendedSpecification.approvalStatus !==
          "approved_with_limitation")
    ) {
      throw new TypeError(
        "The recommended method must be present in the v1 approved method allowlist.",
      );
    }
    if (
      recommendedSpecification.recommendationEligibility !== "eligible" &&
      recommendedSpecification.recommendationEligibility !==
        "conditionally_eligible"
    ) {
      throw new TypeError(
        `Method ${recommendedMethodId} is not recommendation-eligible under the frozen policy.`,
      );
    }
    if (
      context.recommendation.recommendedMethodVersion !==
      recommendedSpecification.methodVersion
    ) {
      throw new TypeError(
        `The recommended method version must be ${recommendedSpecification.methodVersion}.`,
      );
    }
  }
  if (
    context.recommendation.isRecommended &&
    (context.recommendation.recommendedMethodId !==
      methodSpecification.methodId ||
      context.recommendation.recommendedMethodVersion !== input.methodVersion)
  ) {
    throw new TypeError(
      "isRecommended=true requires the recommended method ID/version to match this result.",
    );
  }
  if (
    !context.recommendation.isRecommended &&
    context.recommendation.recommendedMethodId === methodSpecification.methodId
  ) {
    throw new TypeError(
      "A result matching the recommended method ID/version must set isRecommended=true.",
    );
  }
}

function normalizeBase<
  TStatus extends SuccessResultStatus | FailureResultStatus,
>(input: ResultInputBase<TStatus>): {
  readonly base: CalculationResultBase<TStatus>;
  readonly methodSpecification: MethodSpecification;
} {
  assertNonBlank(input.methodVersion, "result.methodVersion");
  assertControlledValue(
    "result.methodApproval",
    APPROVAL_STATUSES,
    input.methodApproval,
  );
  assertControlledValue(
    "result.applicabilityStatus",
    APPLICABILITY_STATUSES,
    input.applicabilityStatus,
  );
  assertCalculationTrace(input.trace);

  const normalizedMethodId = methodId(input.methodId);
  const methodSpecification =
    METHOD_SPECIFICATION_REGISTRY.find(normalizedMethodId);
  if (methodSpecification === undefined) {
    throw new TypeError(
      `result.methodId ${input.methodId} is not present in the frozen method registry.`,
    );
  }
  if (input.methodVersion !== methodSpecification.methodVersion) {
    throw new TypeError(
      `result.methodVersion must be ${methodSpecification.methodVersion} for ${input.methodId}.`,
    );
  }
  if (input.methodApproval !== methodSpecification.approvalStatus) {
    throw new TypeError(
      `result.methodApproval must be ${methodSpecification.approvalStatus} for ${input.methodId}.`,
    );
  }
  validateWarnings(input.warnings, methodSpecification);
  const normalizedContext = normalizeContext(input.context, input.status);
  if (
    methodSpecification.scientificConfidence !== null &&
    normalizedContext.scientificConfidence !==
      methodSpecification.scientificConfidence
  ) {
    throw new TypeError(
      `result.scientificConfidence must be ${methodSpecification.scientificConfidence} for ${input.methodId}.`,
    );
  }
  const missingMethodSources = methodSpecification.sourceRefs.filter(
    (registeredSource) =>
      !normalizedContext.sourceRefs.includes(registeredSource),
  );
  if (missingMethodSources.length > 0) {
    throw new TypeError(
      `result.context.sourceRefs for ${input.methodId} omits required frozen sources: ${missingMethodSources.join(", ")}.`,
    );
  }
  assertRecommendation(input, methodSpecification, normalizedContext);
  assertTraceBoundaryConsistency(input.trace, input, normalizedContext);

  return {
    methodSpecification,
    base: {
      schemaVersion: normalizedContext.versions.resultSchema,
      technicalFreezeId: normalizedContext.versions.technicalFreezeId,
      status: input.status,
      methodId: normalizedMethodId,
      methodVersion: input.methodVersion,
      methodApproval: input.methodApproval,
      applicabilityStatus: input.applicabilityStatus,
      warnings: [...input.warnings],
      trace: input.trace,
      context: normalizedContext,
    },
  };
}

function normalizeEngineeringOutput(
  value: unknown,
  specification: MethodSpecification,
): EngineeringOutput {
  const normalized = normalizeJson(value);
  if (!isRecord(normalized)) {
    throw new TypeError("Every engineering output must be a JSON object.");
  }
  assertNonBlank(normalized.kind, "engineering output kind");
  const commonKeys = [
    "kind",
    "outputId",
    "status",
    "dimensionId",
    "canonicalUnitId",
  ] as const;
  if (normalized.kind === "unavailable") {
    if (
      !hasExactKeys(normalized, ["kind", "outputId", "status", "reason"])
    ) {
      throw new TypeError(
        "Unavailable engineering output fields do not match the controlled discriminator.",
      );
    }
    assertNonBlank(normalized.outputId, "engineering output outputId");
    if (!specification.outputQuantityIds.includes(normalized.outputId)) {
      throw new TypeError(
        `Engineering output ${normalized.outputId} is not registered for method ${specification.methodId}.`,
      );
    }
    if (
      normalized.status !== "not_applicable" &&
      normalized.status !== "insufficient_data"
    ) {
      throw new TypeError(
        "Unavailable engineering output status must be not_applicable or insufficient_data.",
      );
    }
    assertNonBlank(normalized.reason, "unavailable engineering output reason");
    return {
      kind: "unavailable",
      outputId: normalized.outputId,
      status: normalized.status,
      reason: normalized.reason,
    };
  }
  const valueKey =
    normalized.kind === "scalar"
      ? "valueSi"
      : normalized.kind === "vector"
        ? "valuesSi"
        : normalized.kind === "categorical" || normalized.kind === "boolean"
          ? "value"
          : null;
  if (
    valueKey === null ||
    !hasExactKeys(normalized, [...commonKeys, valueKey])
  ) {
    throw new TypeError(
      "Engineering output fields do not match a controlled discriminator.",
    );
  }
  assertNonBlank(normalized.outputId, "engineering output outputId");
  if (!specification.outputQuantityIds.includes(normalized.outputId)) {
    throw new TypeError(
      `Engineering output ${normalized.outputId} is not registered for method ${specification.methodId}.`,
    );
  }
  if (normalized.status !== "available") {
    throw new TypeError(
      "A successful engineering output must have status=available.",
    );
  }
  assertNonBlank(normalized.dimensionId, "engineering output dimensionId");
  assertNonBlank(
    normalized.canonicalUnitId,
    "engineering output canonicalUnitId",
  );
  const controlledDimensionId = dimensionId(normalized.dimensionId);
  const controlledUnitId = unitId(normalized.canonicalUnitId);
  if (canonicalUnitIdFor(controlledDimensionId) !== controlledUnitId) {
    throw new TypeError(
      "Engineering output canonicalUnitId must be canonical for its dimensionId.",
    );
  }

  const common = {
    outputId: normalized.outputId,
    status: "available" as const,
    dimensionId: controlledDimensionId,
    canonicalUnitId: controlledUnitId,
  };
  if (normalized.kind === "scalar") {
    if (
      typeof normalized.valueSi !== "number" ||
      !Number.isFinite(normalized.valueSi)
    ) {
      throw new TypeError("Scalar engineering output valueSi must be finite.");
    }
    return { kind: "scalar", ...common, valueSi: normalized.valueSi };
  }
  if (normalized.kind === "vector") {
    if (
      !Array.isArray(normalized.valuesSi) ||
      normalized.valuesSi.length === 0 ||
      !normalized.valuesSi.every(
        (entry) => typeof entry === "number" && Number.isFinite(entry),
      )
    ) {
      throw new TypeError(
        "Vector engineering output valuesSi must be a non-empty finite-number array.",
      );
    }
    return { kind: "vector", ...common, valuesSi: normalized.valuesSi };
  }
  if (
    controlledDimensionId !== "dimensionless" ||
    controlledUnitId !== "one"
  ) {
    throw new TypeError(
      "Categorical and boolean outputs must use dimensionless/one canonical units.",
    );
  }
  if (normalized.kind === "categorical") {
    assertNonBlank(normalized.value, "categorical engineering output value");
    return {
      kind: "categorical",
      ...common,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      value: normalized.value,
    };
  }
  if (typeof normalized.value !== "boolean") {
    throw new TypeError("Boolean engineering output value must be boolean.");
  }
  return {
    kind: "boolean",
    ...common,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    value: normalized.value,
  };
}

function normalizeEngineeringOutputEnvelope(
  value: unknown,
  specification: MethodSpecification,
): EngineeringOutputEnvelope {
  const normalized = normalizeJson(value);
  if (
    !isRecord(normalized) ||
    !hasExactKeys(normalized, ["kind", "status", "outputs"]) ||
    normalized.kind !== "engineering_output_envelope" ||
    normalized.status !== "complete" ||
    !Array.isArray(normalized.outputs) ||
    normalized.outputs.length === 0
  ) {
    throw new TypeError(
      "Successful value must be a non-empty engineering_output_envelope with status=complete.",
    );
  }
  const outputs = normalized.outputs.map((output) =>
    normalizeEngineeringOutput(output, specification),
  );
  if (new Set(outputs.map((output) => output.outputId)).size !== outputs.length) {
    throw new TypeError("Engineering output IDs must not be duplicated.");
  }
  const outputIds = new Set(outputs.map((output) => output.outputId));
  const missingOutputIds = specification.outputQuantityIds.filter(
    (outputId) => !outputIds.has(outputId),
  );
  if (
    outputs.length !== specification.outputQuantityIds.length ||
    missingOutputIds.length > 0
  ) {
    throw new TypeError(
      `Complete engineering output envelope for ${specification.methodId} must account for every registered output exactly once; missing: ${missingOutputIds.join(", ") || "none"}.`,
    );
  }
  if (outputs.every((output) => output.status !== "available")) {
    throw new TypeError(
      "A successful engineering output envelope must contain at least one available output; otherwise publish an explicit failure result.",
    );
  }
  return {
    kind: "engineering_output_envelope",
    status: "complete",
    outputs: outputs as [EngineeringOutput, ...EngineeringOutput[]],
  };
}

function assertSuccessfulMethodEvidence(
  specification: MethodSpecification,
  context: ResultContext,
  trace: CalculationTrace,
): void {
  const missingContextSources = specification.sourceRefs.filter(
    (requiredSource) => !context.sourceRefs.includes(requiredSource),
  );
  if (missingContextSources.length > 0) {
    throw new TypeError(
      `Successful result for ${specification.methodId} must include every required frozen source: ${missingContextSources.join(", ")}.`,
    );
  }

  const equationNodes = trace.nodes.filter(
    (node) => node.kind === "equation",
  );
  for (const requiredEquationRef of specification.equationRefs) {
    const mappedNodes = equationNodes.filter(
      (node) =>
        tracePayloadString(node, "equationRef") === requiredEquationRef,
    );
    if (mappedNodes.length === 0) {
      throw new TypeError(
        `Trace for ${specification.methodId} omits required equation ${requiredEquationRef}.`,
      );
    }
    const mappedSources = new Set(
      mappedNodes.flatMap((node) => [...node.sourceRefs]),
    );
    const missingEquationSources = specification.sourceRefs.filter(
      (requiredSource) => !mappedSources.has(requiredSource),
    );
    if (missingEquationSources.length > 0) {
      throw new TypeError(
        `Trace equation ${requiredEquationRef} omits required frozen sources: ${missingEquationSources.join(", ")}.`,
      );
    }
  }
}

export function createSuccessfulCalculationResult(
  input: SuccessfulCalculationResultInput,
): SuccessfulCalculationResult {
  assertControlledValue(
    "result.status",
    SUCCESS_RESULT_STATUSES,
    input.status,
  );
  assertControlledValue(
    "result.provenance",
    RESULT_PROVENANCES,
    input.provenance,
  );
  if (
    input.methodApproval !== "approved" &&
    input.methodApproval !== "approved_with_limitation"
  ) {
    throw new TypeError(
      "A successful result requires methodApproval=approved or approved_with_limitation.",
    );
  }
  if (
    input.applicabilityStatus !== "in_domain" &&
    input.applicabilityStatus !== "at_boundary"
  ) {
    throw new TypeError(
      "A successful result requires applicabilityStatus=in_domain or at_boundary.",
    );
  }
  if (
    input.context.scientificConfidence === null ||
    input.context.scientificConfidence === "rejected"
  ) {
    throw new TypeError(
      "A successful value requires a resolved, non-rejected scientific-confidence state.",
    );
  }
  if (hasBlockingWarning(input.warnings)) {
    throw new TypeError(
      "A blocking or fatal warning forbids a successful numeric result.",
    );
  }
  if (input.status === "success" && input.warnings.length !== 0) {
    throw new TypeError("status=success requires an empty warnings array.");
  }
  if (
    input.status === "success_with_warnings" &&
    input.warnings.length === 0
  ) {
    throw new TypeError(
      "status=success_with_warnings requires at least one warning.",
    );
  }
  if (
    input.applicabilityStatus === "at_boundary" &&
    input.status !== "success_with_warnings"
  ) {
    throw new TypeError(
      "An at-boundary value must use status=success_with_warnings.",
    );
  }

  const { base, methodSpecification } = normalizeBase(input);
  if (methodSpecification.requiresSubmethodSplit) {
    throw new TypeError(
      `Method ${base.methodId} cannot publish a successful value before its controlled child methods are split and registered.`,
    );
  }
  const value = normalizeEngineeringOutputEnvelope(
    input.value,
    methodSpecification,
  );
  assertSuccessfulMethodEvidence(
    methodSpecification,
    base.context,
    base.trace,
  );
  // This is the publication gate. In Phase 1 the runtime registry is empty,
  // so even a structurally valid result fails closed as implementation_unavailable.
  METHOD_SPECIFICATION_REGISTRY.resolveRuntime(base.methodId);

  const result = {
    ...base,
    methodApproval: input.methodApproval,
    value,
    provenance: input.provenance,
  } satisfies SuccessfulCalculationResult;

  return deepFreeze(
    normalizeJson(result),
  ) as unknown as SuccessfulCalculationResult;
}

function normalizeFailureDiagnostic(
  input: FailureDiagnostic,
): FailureDiagnostic {
  assertNonBlank(input.code, "result.failure.code");
  sourceRef(input.code);
  assertNonBlank(input.message, "result.failure.message");
  assertNonBlank(input.action, "result.failure.action");

  return {
    code: input.code,
    message: input.message,
    action: input.action,
    details: normalizeRecord(input.details, "result.failure.details"),
  };
}

export function createFailedCalculationResult(
  input: FailedCalculationResultInput,
): FailedCalculationResult {
  assertControlledValue(
    "result.status",
    FAILURE_RESULT_STATUSES,
    input.status,
  );
  if ("value" in input) {
    throw new TypeError(
      "Failure result statuses must not contain a value property.",
    );
  }
  if ("provenance" in input) {
    throw new TypeError(
      "A result without a value must not claim numeric provenance.",
    );
  }
  if (
    input.status === "not_applicable" &&
    input.applicabilityStatus !== "out_of_domain"
  ) {
    throw new TypeError(
      "status=not_applicable requires applicabilityStatus=out_of_domain.",
    );
  }

  const { base } = normalizeBase(input);
  const result = {
    ...base,
    failure: normalizeFailureDiagnostic(input.failure),
  } satisfies FailedCalculationResult;

  return deepFreeze(normalizeJson(result)) as unknown as FailedCalculationResult;
}

export function createCalculationResult(
  input: CalculationResultInput,
): CalculationResult {
  if (isSuccessResultStatus(input.status)) {
    return createSuccessfulCalculationResult(
      input as SuccessfulCalculationResultInput,
    );
  }
  if (isFailureResultStatus(input.status)) {
    return createFailedCalculationResult(input as FailedCalculationResultInput);
  }
  throw new TypeError(`Unknown frozen result status: ${String(input.status)}`);
}
