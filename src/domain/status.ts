/**
 * Frozen machine enums from the Gate 0 controlled status dictionaries.
 *
 * These values are serialization values. Presentation code may localize their
 * labels, but must never rewrite, combine, or extend them at runtime.
 */

export const METHOD_TYPES = Object.freeze([
  "analytical",
  "engineering_correlation",
  "empirical_calibrated",
  "numerical",
  "measurement_identified",
  "fem_or_experiment_reference",
] as const);
export type MethodType = (typeof METHOD_TYPES)[number];

export const APPROVAL_STATUSES = Object.freeze([
  "draft",
  "approved",
  "approved_with_limitation",
  "deferred",
  "insufficient_evidence",
  "reference_only",
  "rejected",
  "superseded",
] as const);
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const SPECIFICATION_COMPLETENESS_STATUSES = Object.freeze([
  "missing",
  "partial",
  "complete",
] as const);
export type SpecificationCompleteness =
  (typeof SPECIFICATION_COMPLETENESS_STATUSES)[number];

export const VALIDATION_STATUSES = Object.freeze([
  "not_defined",
  "specified",
  "blocked",
  "running",
  "executed_pass",
  "executed_fail",
  "executed_unjudged",
  "not_required",
] as const);
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const SOURCE_REVIEW_STATUSES = Object.freeze([
  "not_required",
  "pending_release_cross_check",
  "reviewed_pass",
  "reviewed_fail",
] as const);
export type SourceReviewStatus = (typeof SOURCE_REVIEW_STATUSES)[number];

export const DATASET_ROLES = Object.freeze([
  "development",
  "calibration",
  "validation",
  "sealed_holdout",
  "external_validation",
  "audit_only",
] as const);
export type DatasetRole = (typeof DATASET_ROLES)[number];

export const LIFECYCLE_STATUSES = Object.freeze([
  "active",
  "deprecated",
  "retired",
] as const);
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const RESULT_STATUSES = Object.freeze([
  "success",
  "success_with_warnings",
  "not_applicable",
  "insufficient_data",
  "non_converged",
  "no_feasible_solution",
  "invalid_input",
  "inconsistent_measurement",
] as const);
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const SUCCESS_RESULT_STATUSES = Object.freeze([
  "success",
  "success_with_warnings",
] as const);
export type SuccessResultStatus = (typeof SUCCESS_RESULT_STATUSES)[number];

export const FAILURE_RESULT_STATUSES = Object.freeze([
  "not_applicable",
  "insufficient_data",
  "non_converged",
  "no_feasible_solution",
  "invalid_input",
  "inconsistent_measurement",
] as const);
export type FailureResultStatus = (typeof FAILURE_RESULT_STATUSES)[number];

export const APPLICABILITY_STATUSES = Object.freeze([
  "in_domain",
  "at_boundary",
  "out_of_domain",
  "not_evaluated",
] as const);
export type ApplicabilityStatus = (typeof APPLICABILITY_STATUSES)[number];

export const RESULT_PROVENANCES = Object.freeze([
  "predicted",
  "estimated",
  "identified_from_measurement",
  "project_calibrated",
  "imported_fem_reference",
  "identity_only",
] as const);
export type ResultProvenance = (typeof RESULT_PROVENANCES)[number];

export const SCIENTIFIC_CONFIDENCES = Object.freeze([
  "high",
  "engineering_approximation",
  "needs_verification",
  "fem_or_experiment_recommended",
  "rejected",
] as const);
export type ScientificConfidence = (typeof SCIENTIFIC_CONFIDENCES)[number];

export const DATA_QUALITIES = Object.freeze([
  "approved_reference",
  "engineering_reference",
  "generic_typical",
  "project_specific",
  "user_defined",
  "measured",
  "fem_reference",
  "unknown",
] as const);
export type DataQuality = (typeof DATA_QUALITIES)[number];

export const WARNING_SEVERITIES = Object.freeze([
  "info",
  "caution",
  "warning",
  "blocking",
  "fatal",
] as const);
export type WarningSeverity = (typeof WARNING_SEVERITIES)[number];

function includesControlledValue<TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): value is TValue {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function isMethodType(value: unknown): value is MethodType {
  return includesControlledValue(METHOD_TYPES, value);
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return includesControlledValue(APPROVAL_STATUSES, value);
}

export function isSpecificationCompleteness(
  value: unknown,
): value is SpecificationCompleteness {
  return includesControlledValue(SPECIFICATION_COMPLETENESS_STATUSES, value);
}

export function isValidationStatus(value: unknown): value is ValidationStatus {
  return includesControlledValue(VALIDATION_STATUSES, value);
}

export function isSourceReviewStatus(value: unknown): value is SourceReviewStatus {
  return includesControlledValue(SOURCE_REVIEW_STATUSES, value);
}

export function isDatasetRole(value: unknown): value is DatasetRole {
  return includesControlledValue(DATASET_ROLES, value);
}

export function isLifecycleStatus(value: unknown): value is LifecycleStatus {
  return includesControlledValue(LIFECYCLE_STATUSES, value);
}

export function isResultStatus(value: unknown): value is ResultStatus {
  return includesControlledValue(RESULT_STATUSES, value);
}

export function isSuccessResultStatus(value: unknown): value is SuccessResultStatus {
  return includesControlledValue(SUCCESS_RESULT_STATUSES, value);
}

export function isFailureResultStatus(value: unknown): value is FailureResultStatus {
  return includesControlledValue(FAILURE_RESULT_STATUSES, value);
}

export function isApplicabilityStatus(value: unknown): value is ApplicabilityStatus {
  return includesControlledValue(APPLICABILITY_STATUSES, value);
}

export function isResultProvenance(value: unknown): value is ResultProvenance {
  return includesControlledValue(RESULT_PROVENANCES, value);
}

export function isScientificConfidence(value: unknown): value is ScientificConfidence {
  return includesControlledValue(SCIENTIFIC_CONFIDENCES, value);
}

export function isDataQuality(value: unknown): value is DataQuality {
  return includesControlledValue(DATA_QUALITIES, value);
}

export function isWarningSeverity(value: unknown): value is WarningSeverity {
  return includesControlledValue(WARNING_SEVERITIES, value);
}

export function assertControlledValue<TValue extends string>(
  fieldName: string,
  values: readonly TValue[],
  value: unknown,
): asserts value is TValue {
  if (!includesControlledValue(values, value)) {
    throw new TypeError(
      `${fieldName} must be one of: ${values.join(" | ")}. Received: ${String(value)}`,
    );
  }
}
