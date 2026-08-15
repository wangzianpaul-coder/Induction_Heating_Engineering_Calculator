import { describe, expect, it } from "vitest";

import {
  APPLICABILITY_STATUSES,
  APPROVAL_STATUSES,
  DATASET_ROLES,
  DATA_QUALITIES,
  FAILURE_RESULT_STATUSES,
  LIFECYCLE_STATUSES,
  METHOD_TYPES,
  RESULT_PROVENANCES,
  RESULT_STATUSES,
  SCIENTIFIC_CONFIDENCES,
  SOURCE_REVIEW_STATUSES,
  SPECIFICATION_COMPLETENESS_STATUSES,
  SUCCESS_RESULT_STATUSES,
  VALIDATION_STATUSES,
  WARNING_SEVERITIES,
  assertControlledValue,
  isApplicabilityStatus,
  isApprovalStatus,
  isDataQuality,
  isDatasetRole,
  isFailureResultStatus,
  isLifecycleStatus,
  isMethodType,
  isResultProvenance,
  isResultStatus,
  isScientificConfidence,
  isSourceReviewStatus,
  isSpecificationCompleteness,
  isSuccessResultStatus,
  isValidationStatus,
  isWarningSeverity,
} from "../../src/domain/status.js";

describe("frozen Gate 0 status enums", () => {
  it("matches every controlled machine enum verbatim", () => {
    expect(METHOD_TYPES).toEqual([
      "analytical",
      "engineering_correlation",
      "empirical_calibrated",
      "numerical",
      "measurement_identified",
      "fem_or_experiment_reference",
    ]);
    expect(APPROVAL_STATUSES).toEqual([
      "draft",
      "approved",
      "approved_with_limitation",
      "deferred",
      "insufficient_evidence",
      "reference_only",
      "rejected",
      "superseded",
    ]);
    expect(SPECIFICATION_COMPLETENESS_STATUSES).toEqual([
      "missing",
      "partial",
      "complete",
    ]);
    expect(VALIDATION_STATUSES).toEqual([
      "not_defined",
      "specified",
      "blocked",
      "running",
      "executed_pass",
      "executed_fail",
      "executed_unjudged",
      "not_required",
    ]);
    expect(SOURCE_REVIEW_STATUSES).toEqual([
      "not_required",
      "pending_release_cross_check",
      "reviewed_pass",
      "reviewed_fail",
    ]);
    expect(DATASET_ROLES).toEqual([
      "development",
      "calibration",
      "validation",
      "sealed_holdout",
      "external_validation",
      "audit_only",
    ]);
    expect(LIFECYCLE_STATUSES).toEqual(["active", "deprecated", "retired"]);
    expect(RESULT_STATUSES).toEqual([
      "success",
      "success_with_warnings",
      "not_applicable",
      "insufficient_data",
      "non_converged",
      "no_feasible_solution",
      "invalid_input",
      "inconsistent_measurement",
    ]);
    expect(APPLICABILITY_STATUSES).toEqual([
      "in_domain",
      "at_boundary",
      "out_of_domain",
      "not_evaluated",
    ]);
    expect(RESULT_PROVENANCES).toEqual([
      "predicted",
      "estimated",
      "identified_from_measurement",
      "project_calibrated",
      "imported_fem_reference",
      "identity_only",
    ]);
    expect(SCIENTIFIC_CONFIDENCES).toEqual([
      "high",
      "engineering_approximation",
      "needs_verification",
      "fem_or_experiment_recommended",
      "rejected",
    ]);
    expect(DATA_QUALITIES).toEqual([
      "approved_reference",
      "engineering_reference",
      "generic_typical",
      "project_specific",
      "user_defined",
      "measured",
      "fem_reference",
      "unknown",
    ]);
    expect(WARNING_SEVERITIES).toEqual([
      "info",
      "caution",
      "warning",
      "blocking",
      "fatal",
    ]);
  });

  it("keeps the success/failure partitions exact and immutable", () => {
    expect(SUCCESS_RESULT_STATUSES).toEqual(["success", "success_with_warnings"]);
    expect(FAILURE_RESULT_STATUSES).toEqual([
      "not_applicable",
      "insufficient_data",
      "non_converged",
      "no_feasible_solution",
      "invalid_input",
      "inconsistent_measurement",
    ]);

    for (const values of [
      METHOD_TYPES,
      APPROVAL_STATUSES,
      SPECIFICATION_COMPLETENESS_STATUSES,
      VALIDATION_STATUSES,
      SOURCE_REVIEW_STATUSES,
      DATASET_ROLES,
      LIFECYCLE_STATUSES,
      RESULT_STATUSES,
      SUCCESS_RESULT_STATUSES,
      FAILURE_RESULT_STATUSES,
      APPLICABILITY_STATUSES,
      RESULT_PROVENANCES,
      SCIENTIFIC_CONFIDENCES,
      DATA_QUALITIES,
      WARNING_SEVERITIES,
    ]) {
      expect(Object.isFrozen(values)).toBe(true);
    }
  });

  it("guards every machine-value boundary without accepting display aliases", () => {
    expect(isMethodType("analytical")).toBe(true);
    expect(isApprovalStatus("approved_with_limitation")).toBe(true);
    expect(isSpecificationCompleteness("complete")).toBe(true);
    expect(isValidationStatus("executed_unjudged")).toBe(true);
    expect(isSourceReviewStatus("pending_release_cross_check")).toBe(true);
    expect(isDatasetRole("audit_only")).toBe(true);
    expect(isLifecycleStatus("active")).toBe(true);
    expect(isResultStatus("inconsistent_measurement")).toBe(true);
    expect(isSuccessResultStatus("success_with_warnings")).toBe(true);
    expect(isFailureResultStatus("non_converged")).toBe(true);
    expect(isApplicabilityStatus("at_boundary")).toBe(true);
    expect(isResultProvenance("identity_only")).toBe(true);
    expect(isScientificConfidence("engineering_approximation")).toBe(true);
    expect(isDataQuality("project_specific")).toBe(true);
    expect(isWarningSeverity("fatal")).toBe(true);

    expect(isApprovalStatus("Approved with limitation")).toBe(false);
    expect(isResultStatus("error")).toBe(false);
    expect(isDatasetRole("history")).toBe(false);
    expect(() =>
      assertControlledValue("approval_status", APPROVAL_STATUSES, "approved/deferred"),
    ).toThrow(/approval_status/);
  });
});
