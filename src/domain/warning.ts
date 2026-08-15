import {
  deepFreeze,
  normalizeJson,
  type JsonValue,
} from "../serialization/canonical-json.js";
import type { MethodId, ParameterId, SourceRef, WarningId } from "./ids.js";
import {
  methodId,
  parameterId,
  sourceRef,
  warningId,
} from "./ids.js";
import {
  WARNING_SEVERITIES,
  assertControlledValue,
  isWarningSeverity,
  type WarningSeverity,
} from "./status.js";

export interface WarningRecord {
  readonly warningId: WarningId;
  readonly severity: WarningSeverity;
  readonly moduleId?: string;
  readonly methodId?: MethodId;
  readonly parameterIds: readonly ParameterId[];
  readonly predicate: string;
  readonly observedValues: Readonly<Record<string, JsonValue>>;
  readonly message: string;
  readonly engineeringConsequence: string;
  readonly recommendedAction: string;
  readonly sourceRefs: readonly SourceRef[];
  readonly blocksResult: boolean;
}

export interface WarningRecordInput {
  readonly warningId: string;
  readonly severity: WarningSeverity;
  readonly moduleId?: string;
  readonly methodId?: string;
  readonly parameterIds?: readonly string[];
  readonly predicate: string;
  readonly observedValues: Readonly<Record<string, JsonValue>>;
  readonly message: string;
  readonly engineeringConsequence: string;
  readonly recommendedAction: string;
  readonly sourceRefs: readonly string[];
  readonly blocksResult: boolean;
}

function assertNonBlank(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-blank string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const WARNING_REQUIRED_KEYS = Object.freeze([
  "warningId",
  "severity",
  "parameterIds",
  "predicate",
  "observedValues",
  "message",
  "engineeringConsequence",
  "recommendedAction",
  "sourceRefs",
  "blocksResult",
] as const);

function assertWarningKeys(value: Record<string, unknown>): void {
  const allowed = new Set<string>([
    ...WARNING_REQUIRED_KEYS,
    "moduleId",
    "methodId",
  ]);
  if (
    WARNING_REQUIRED_KEYS.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new TypeError("WarningRecord fields do not match the controlled schema.");
  }
}

function normalizeObservedValues(
  observedValues: Readonly<Record<string, JsonValue>>,
): Readonly<Record<string, JsonValue>> {
  const normalized = normalizeJson(observedValues);
  if (!isRecord(normalized)) {
    throw new TypeError("observedValues must be a JSON object.");
  }
  if (Object.keys(normalized).length === 0) {
    throw new TypeError(
      "observedValues must record at least one value or explicit missing-state observation.",
    );
  }
  return normalized as Readonly<Record<string, JsonValue>>;
}

export function isBlockingSeverity(severity: WarningSeverity): boolean {
  return severity === "blocking" || severity === "fatal";
}

function assertBlockingSemantics(
  severity: WarningSeverity,
  blocksResult: boolean,
): void {
  if (blocksResult !== isBlockingSeverity(severity)) {
    throw new TypeError(
      `${severity} warning severity requires blocksResult=${String(isBlockingSeverity(severity))}.`,
    );
  }
}

export function createWarningRecord(input: WarningRecordInput): WarningRecord {
  assertControlledValue("warning.severity", WARNING_SEVERITIES, input.severity);
  assertNonBlank(input.predicate, "warning.predicate");
  assertNonBlank(input.message, "warning.message");
  assertNonBlank(input.engineeringConsequence, "warning.engineeringConsequence");
  assertNonBlank(input.recommendedAction, "warning.recommendedAction");
  if (input.moduleId !== undefined) {
    assertNonBlank(input.moduleId, "warning.moduleId");
  }
  if (input.sourceRefs.length === 0) {
    throw new TypeError("warning.sourceRefs must contain at least one controlled source reference.");
  }
  if (new Set(input.parameterIds ?? []).size !== (input.parameterIds ?? []).length) {
    throw new TypeError("warning.parameterIds must not contain duplicates.");
  }
  if (new Set(input.sourceRefs).size !== input.sourceRefs.length) {
    throw new TypeError("warning.sourceRefs must not contain duplicates.");
  }
  assertBlockingSemantics(input.severity, input.blocksResult);

  const record = {
    warningId: warningId(input.warningId),
    severity: input.severity,
    ...(input.moduleId === undefined ? {} : { moduleId: input.moduleId }),
    ...(input.methodId === undefined ? {} : { methodId: methodId(input.methodId) }),
    parameterIds: (input.parameterIds ?? []).map((value) => parameterId(value)),
    predicate: input.predicate,
    observedValues: normalizeObservedValues(input.observedValues),
    message: input.message,
    engineeringConsequence: input.engineeringConsequence,
    recommendedAction: input.recommendedAction,
    sourceRefs: input.sourceRefs.map((value) => sourceRef(value)),
    blocksResult: input.blocksResult,
  } satisfies WarningRecord;

  return deepFreeze(normalizeJson(record)) as unknown as WarningRecord;
}

/**
 * Runtime guard used at serialization and result boundaries. It deliberately
 * validates machine semantics as well as shape, so a cast cannot bypass the
 * blocking-warning invariant.
 */
export function assertWarningRecord(value: unknown): asserts value is WarningRecord {
  if (!isRecord(value)) {
    throw new TypeError("WarningRecord must be a plain JSON object.");
  }
  assertWarningKeys(value);

  const severity = value.severity;
  if (!isWarningSeverity(severity)) {
    throw new TypeError("WarningRecord has an unknown frozen severity.");
  }
  if (typeof value.blocksResult !== "boolean") {
    throw new TypeError("WarningRecord.blocksResult must be boolean.");
  }
  assertBlockingSemantics(severity, value.blocksResult);

  assertNonBlank(value.warningId, "warning.warningId");
  warningId(value.warningId);
  assertNonBlank(value.predicate, "warning.predicate");
  assertNonBlank(value.message, "warning.message");
  assertNonBlank(value.engineeringConsequence, "warning.engineeringConsequence");
  assertNonBlank(value.recommendedAction, "warning.recommendedAction");

  if (!isRecord(value.observedValues) || Object.keys(value.observedValues).length === 0) {
    throw new TypeError("WarningRecord.observedValues must be a non-empty JSON object.");
  }
  normalizeJson(value.observedValues);

  if (!Array.isArray(value.parameterIds)) {
    throw new TypeError("WarningRecord.parameterIds must be an array.");
  }
  for (const id of value.parameterIds) {
    assertNonBlank(id, "warning.parameterIds[]");
    parameterId(id);
  }
  if (new Set(value.parameterIds).size !== value.parameterIds.length) {
    throw new TypeError("WarningRecord.parameterIds must not contain duplicates.");
  }

  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    throw new TypeError("WarningRecord.sourceRefs must be a non-empty array.");
  }
  for (const ref of value.sourceRefs) {
    assertNonBlank(ref, "warning.sourceRefs[]");
    sourceRef(ref);
  }
  if (new Set(value.sourceRefs).size !== value.sourceRefs.length) {
    throw new TypeError("WarningRecord.sourceRefs must not contain duplicates.");
  }

  if (value.methodId !== undefined) {
    assertNonBlank(value.methodId, "warning.methodId");
    methodId(value.methodId);
  }
  if (value.moduleId !== undefined) {
    assertNonBlank(value.moduleId, "warning.moduleId");
  }

  normalizeJson(value);
}

export function hasBlockingWarning(warnings: readonly WarningRecord[]): boolean {
  return warnings.some(
    (record) => record.blocksResult || isBlockingSeverity(record.severity),
  );
}
