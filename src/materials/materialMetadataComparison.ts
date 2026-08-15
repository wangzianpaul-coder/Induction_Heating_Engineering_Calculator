/**
 * Isolated Material Comparison metadata boundary.
 *
 * This module deliberately does not implement A-01, interpolate or extrapolate
 * a property, merge sources, rank candidates, or calculate a sensitivity. It
 * can only validate and compare already-frozen material snapshots at an exact
 * caller-supplied serialized state. It is intentionally absent from the public
 * API and runtime registries.
 */

import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import { QUANTITY_BASES } from "../domain/electrical.js";
import {
  contentAddressedSnapshotId,
  methodId,
  parameterId,
  sourceRef,
} from "../domain/ids.js";
import {
  QUANTITY_SOURCE_KINDS,
  type Quantity,
} from "../domain/quantity.js";
import { DATA_QUALITIES } from "../domain/status.js";
import { RELEASED_MATERIAL_REGISTRY } from "../registries/materialCatalog.js";
import type {
  MaterialApprovalStatus,
  MaterialDataQuality,
  MaterialLibraryTier,
} from "../registries/materialRegistry.js";
import {
  METHOD_SPECIFICATION_REGISTRY,
  PARAMETER_REGISTRY,
} from "../registries/index.js";
import {
  canonicalStringify,
  deepFreeze,
  fingerprint,
  type ContentFingerprint,
  type JsonValue,
} from "../serialization/canonical-json.js";
import { CASE_NUMERIC_SERIALIZATION_ULP_FACTOR } from "../serialization/case-schema.js";
import {
  canonicalUnitIdFor,
  fromCanonicalSI,
  getUnitDefinition,
  isDimensionId,
  isUnitId,
  toCanonicalSI,
  type DimensionId,
  type UnitId,
} from "../units/index.js";

const SNAPSHOT_ENVELOPE_KEYS = [
  "snapshotId",
  "kind",
  "schemaVersion",
  "technicalFreezeId",
  "createdAt",
  "fingerprint",
  "payload",
] as const;

const MATERIAL_PAYLOAD_KEYS = [
  "materialId",
  "revision",
  "libraryTier",
  "approvalStatus",
  "properties",
] as const;

const MATERIAL_PROPERTY_KEYS = [
  "propertyId",
  "value",
  "state",
  "dataQuality",
  "sourceRefs",
  "interpolation",
  "extrapolation",
] as const;

const INPUT_KEYS = [
  "comparisonCaseId",
  "nonMaterialInputFingerprint",
  "candidateSource",
  "requiredPropertyIds",
  "propertyExpectations",
  "candidates",
] as const;

const EXPECTATION_KEYS = [
  "propertyId",
  "quantityParameterId",
  "dimensionId",
  "canonicalUnitId",
  "expectedState",
] as const;

const MATERIAL_LIBRARY_TIERS: ReadonlySet<string> = new Set([
  "preset_common",
  "project_material",
  "user_defined",
]);

/** ADR-0005 material-record approval enum, not the method approval enum. */
export const MATERIAL_METADATA_APPROVAL_STATUSES = Object.freeze([
  "draft",
  "reviewed",
  "approved",
  "rejected",
  "superseded",
] as const satisfies readonly MaterialApprovalStatus[]);

/** ADR-0005 property-quality enum; measured/FEM/unknown are not material grades. */
export const MATERIAL_METADATA_DATA_QUALITIES = Object.freeze([
  "approved_reference",
  "engineering_reference",
  "generic_typical",
  "project_specific",
  "user_defined",
] as const satisfies readonly MaterialDataQuality[]);

const MATERIAL_APPROVAL_STATUS_SET: ReadonlySet<string> = new Set(
  MATERIAL_METADATA_APPROVAL_STATUSES,
);
const MATERIAL_DATA_QUALITY_SET: ReadonlySet<string> = new Set(
  MATERIAL_METADATA_DATA_QUALITIES,
);
const QUANTITY_BASIS_SET: ReadonlySet<string> = new Set(QUANTITY_BASES);
const QUANTITY_SOURCE_KIND_SET: ReadonlySet<string> = new Set(
  QUANTITY_SOURCE_KINDS,
);
const QUANTITY_DATA_QUALITY_SET: ReadonlySet<string> = new Set(DATA_QUALITIES);

const STABLE_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_INPUT_DEPTH = 128;
const MAX_INPUT_NODES = 250_000;

export const MATERIAL_METADATA_COMPARISON_READINESS = deepFreeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  comparisonScope: "exact_snapshot_metadata_only" as const,
  releasedCatalogRecordCount: RELEASED_MATERIAL_REGISTRY.size,
  arithmeticPerformed: false as const,
  stateMatchPolicy: "canonical_json_exact" as const,
  gates: {
    a01PropertyResolution: {
      status: "blocked" as const,
      reason:
        "A-01 executable property lookup, interpolation, segmentation and uncertainty propagation are unavailable.",
    },
    materialSnapshotSchema: {
      status: "blocked" as const,
      reason:
        "The current shared snapshot type is broader than ADR-0005, lacks a controlled state-grid/domain/property-revision result schema, and does not define uniqueness or membership semantics between property.sourceRefs and quantity.sourceRef.",
    },
    kCaseOrchestration: {
      status: "blocked" as const,
      reason:
        "CaseSnapshot materials have no frozen role/slot binding or replayable proof that only one material slot changed.",
    },
    downstreamResults: {
      status: "blocked" as const,
      reason:
        "No released downstream comparison adapter or controlled material-sensitivity definition is available.",
    },
  },
  prohibitedOperations: [
    "property_interpolation",
    "property_extrapolation",
    "source_averaging",
    "curve_splicing",
    "difference_or_percentage",
    "candidate_sorting_or_ranking",
    "recommended_selection",
    "sensitivity_calculation",
  ] as const,
});

export type MaterialMetadataCandidateSource =
  | "explicit_snapshots"
  | "released_catalog";

export interface MaterialMetadataPropertyExpectation {
  readonly propertyId: string;
  readonly quantityParameterId: string;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly expectedState: Readonly<Record<string, JsonValue>>;
}

export interface MaterialMetadataComparisonInput {
  readonly comparisonCaseId: string | null;
  readonly nonMaterialInputFingerprint: ContentFingerprint | null;
  readonly candidateSource: MaterialMetadataCandidateSource;
  readonly requiredPropertyIds: readonly string[];
  readonly propertyExpectations: readonly MaterialMetadataPropertyExpectation[];
  readonly candidates: readonly unknown[];
}

export type MaterialMetadataCellFailureReason =
  | "property_missing"
  | "state_mismatch"
  | "quantity_parameter_mismatch"
  | "quantity_dimension_mismatch"
  | "quantity_canonical_unit_mismatch"
  | "quantity_unavailable";

export interface MaterialMetadataObservedProperty {
  readonly state: Readonly<Record<string, JsonValue>>;
  readonly stateFingerprint: ContentFingerprint;
  readonly dataQuality: MaterialDataQuality;
  readonly sourceRefs: readonly string[];
  readonly interpolation: JsonValue;
  readonly extrapolation: JsonValue;
  readonly quantitySemantics: Readonly<{
    readonly kind: Quantity["kind"];
    readonly parameterId: string;
    readonly dimensionId: DimensionId;
    readonly canonicalUnitId: UnitId;
    readonly status: string;
  }>;
}

export interface MaterialMetadataAvailableCell {
  readonly propertyId: string;
  readonly status: "available";
  readonly engineeringUsable: false;
  readonly expectedStateFingerprint: ContentFingerprint;
  readonly observed: MaterialMetadataObservedProperty;
  /** Exact snapshot quantity; it is not an A-01 resolved engineering value. */
  readonly value: Quantity;
}

export interface MaterialMetadataInsufficientCell {
  readonly propertyId: string;
  readonly status: "insufficient_data";
  readonly engineeringUsable: false;
  readonly expectedStateFingerprint: ContentFingerprint;
  readonly reasons: readonly MaterialMetadataCellFailureReason[];
  readonly observed: MaterialMetadataObservedProperty | null;
  readonly value?: never;
}

export type MaterialMetadataPropertyCell =
  | MaterialMetadataAvailableCell
  | MaterialMetadataInsufficientCell;

export interface MaterialMetadataCandidateResult {
  readonly status: "success" | "insufficient_data";
  readonly snapshotId: string;
  readonly schemaVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly createdAt: string;
  readonly fingerprint: ContentFingerprint;
  readonly materialId: string;
  readonly revision: string;
  readonly libraryTier: MaterialLibraryTier;
  readonly approvalStatus: MaterialApprovalStatus;
  readonly properties: readonly MaterialMetadataPropertyCell[];
}

export interface MaterialMetadataComparisonSuccess {
  readonly kind: "material_metadata_comparison";
  readonly status: "success";
  readonly comparisonCaseId: string | null;
  readonly nonMaterialInputFingerprint: ContentFingerprint | null;
  readonly candidateSource: "explicit_snapshots";
  readonly requiredPropertyIds: readonly string[];
  readonly propertyExpectations: readonly (MaterialMetadataPropertyExpectation & {
    readonly expectedStateFingerprint: ContentFingerprint;
  })[];
  readonly candidates: readonly MaterialMetadataCandidateResult[];
  readonly readiness: typeof MATERIAL_METADATA_COMPARISON_READINESS;
  readonly failure?: never;
}

export type MaterialMetadataComparisonFailureReason =
  | "input_schema_invalid"
  | "comparison_case_binding_invalid"
  | "required_property_contract_invalid"
  | "duplicate_required_property_id"
  | "duplicate_property_expectation"
  | "required_property_expectation_mismatch"
  | "candidate_source_invalid"
  | "candidate_snapshot_invalid"
  | "duplicate_candidate_snapshot"
  | "released_catalog_candidates_forbidden"
  | "released_catalog_empty"
  | "released_catalog_snapshot_resolution_unavailable"
  | "explicit_candidates_missing";

export interface MaterialMetadataComparisonFailure {
  readonly kind: "material_metadata_comparison";
  readonly status: "invalid_input" | "insufficient_data";
  readonly readiness: typeof MATERIAL_METADATA_COMPARISON_READINESS;
  readonly failure: Readonly<{
    readonly reason: MaterialMetadataComparisonFailureReason;
    readonly message: string;
  }>;
  readonly candidates?: never;
}

export type MaterialMetadataComparisonOutcome =
  | MaterialMetadataComparisonSuccess
  | MaterialMetadataComparisonFailure;

type JsonRecord = Record<string, JsonValue>;

interface JsonCopyBudget {
  nodes: number;
}

class MaterialMetadataBoundaryError extends TypeError {}

const BOUNDARY_ERROR_MESSAGES = new WeakMap<object, string>();

class ControlledMaterialMetadataBoundaryError extends MaterialMetadataBoundaryError {
  public constructor(message: string) {
    super(message);
    BOUNDARY_ERROR_MESSAGES.set(this, message);
  }
}

const UNSAFE_INSPECTION_MESSAGE =
  "The comparison input could not be safely inspected.";

function boundaryError(message: string): never {
  throw new ControlledMaterialMetadataBoundaryError(message);
}

function isControlledBoundaryError(error: unknown): error is object {
  return (
    typeof error === "object" &&
    error !== null &&
    BOUNDARY_ERROR_MESSAGES.has(error)
  );
}

function controlledBoundaryMessage(error: unknown): string {
  if (!isControlledBoundaryError(error)) return UNSAFE_INSPECTION_MESSAGE;
  return BOUNDARY_ERROR_MESSAGES.get(error) ?? UNSAFE_INSPECTION_MESSAGE;
}

/** Copy JSON data using descriptors only; getters and Proxy failures never escape. */
function copyPlainJson(
  value: unknown,
  path: string,
  depth: number,
  active: WeakSet<object>,
  budget: JsonCopyBudget,
): JsonValue {
  budget.nodes += 1;
  if (budget.nodes > MAX_INPUT_NODES) {
    return boundaryError("The comparison input exceeds the controlled node-count limit.");
  }
  if (depth > MAX_INPUT_DEPTH) {
    return boundaryError("The comparison input exceeds the controlled nesting-depth limit.");
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return boundaryError(`${path} contains a non-finite number.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    return boundaryError(`${path} contains a non-JSON value.`);
  }
  if (active.has(value)) {
    return boundaryError(`${path} contains a cyclic reference.`);
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        return boundaryError(`${path} must be a plain array.`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > MAX_INPUT_NODES
      ) {
        return boundaryError(`${path} has an invalid array length.`);
      }
      const length = lengthDescriptor.value as number;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== length + 1) {
        return boundaryError(`${path} contains a sparse slot or non-JSON array property.`);
      }
      const ownKeySet = new Set<PropertyKey>(ownKeys);
      const output: JsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!ownKeySet.has(key)) {
          return boundaryError(`${path} contains a sparse array slot.`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          descriptor.enumerable !== true
        ) {
          return boundaryError(`${path}[${key}] must be an enumerable data property.`);
        }
        output.push(
          copyPlainJson(
            descriptor.value,
            `${path}[${key}]`,
            depth + 1,
            active,
            budget,
          ),
        );
      }
      if (
        ownKeys.some(
          (key) =>
            typeof key !== "string" ||
            (key !== "length" && !/^0$|^[1-9][0-9]*$/u.test(key)),
        )
      ) {
        return boundaryError(`${path} contains a non-JSON array property.`);
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return boundaryError(`${path} must contain plain data objects only.`);
    }
    const ownKeys = Reflect.ownKeys(value);
    const output: JsonRecord = Object.create(null) as JsonRecord;
    for (const key of ownKeys) {
      if (typeof key !== "string") {
        return boundaryError(`${path} contains a symbol key.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return boundaryError(`${path}.${key} must be an enumerable data property.`);
      }
      output[key] = copyPlainJson(
        descriptor.value,
        `${path}.${key}`,
        depth + 1,
        active,
        budget,
      );
    }
    return output;
  } finally {
    active.delete(value);
  }
}

function safeJsonCopy(value: unknown): JsonValue {
  try {
    return copyPlainJson(value, "$", 0, new WeakSet<object>(), { nodes: 0 });
  } catch (error) {
    if (isControlledBoundaryError(error)) {
      throw error;
    }
    return boundaryError(UNSAFE_INSPECTION_MESSAGE);
  }
}

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  record: JsonRecord,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(record);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.hasOwn(record, key))
  );
}

function hasRequiredKeys(
  record: JsonRecord,
  required: readonly string[],
): boolean {
  return required.every((key) => Object.hasOwn(record, key));
}

function hasOnlyKeys(record: JsonRecord, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(record).every((key) => allowedSet.has(key));
}

function isNonBlank(value: JsonValue | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStableIdentifier(value: JsonValue | undefined): value is string {
  return typeof value === "string" && STABLE_IDENTIFIER_PATTERN.test(value);
}

function isFiniteNumber(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isContentFingerprint(
  value: JsonValue | undefined,
): value is JsonRecord & ContentFingerprint {
  return (
    value !== undefined &&
    isRecord(value) &&
    hasExactKeys(value, ["algorithm", "value"]) &&
    value.algorithm === "sha256" &&
    typeof value.value === "string" &&
    SHA256_PATTERN.test(value.value)
  );
}

function equalWithinSerializationTolerance(
  actual: number,
  recomputed: number,
): boolean {
  if (actual === recomputed) return true;
  const magnitude = Math.max(
    Math.abs(actual),
    Math.abs(recomputed),
    Number.MIN_VALUE,
  );
  return (
    Math.abs(actual - recomputed) <=
    CASE_NUMERIC_SERIALIZATION_ULP_FACTOR * Number.EPSILON * magnitude
  );
}

function validateRepresentation(
  value: JsonValue | undefined,
  dimension: DimensionId,
): string | null {
  if (
    value === undefined ||
    !isRecord(value) ||
    !hasExactKeys(value, ["value", "unitId"]) ||
    !isFiniteNumber(value.value) ||
    typeof value.unitId !== "string" ||
    !isUnitId(value.unitId) ||
    !getUnitDefinition(value.unitId).dimensionIds.includes(dimension)
  ) {
    return `Quantity representation must be finite and compatible with ${dimension}.`;
  }
  return null;
}

function validateEvaluationMetadata(value: JsonRecord): string | null {
  if (value.evaluation !== "standard" && value.evaluation !== "expanded") {
    return "Uncertainty evaluation must be standard or expanded.";
  }
  if (
    value.coverageFactor !== undefined &&
    (!isFiniteNumber(value.coverageFactor) || value.coverageFactor <= 0)
  ) {
    return "Uncertainty coverageFactor must be positive and finite.";
  }
  if (value.evaluation === "expanded" && value.coverageFactor === undefined) {
    return "Expanded uncertainty requires coverageFactor.";
  }
  if (
    value.confidenceLevel !== undefined &&
    (!isFiniteNumber(value.confidenceLevel) ||
      value.confidenceLevel <= 0 ||
      value.confidenceLevel > 1)
  ) {
    return "Uncertainty confidenceLevel must be in (0, 1].";
  }
  return null;
}

type RegisteredParameter = NonNullable<
  ReturnType<typeof PARAMETER_REGISTRY.find>
>;

function isAllowedUncertaintyRepresentationUnit(
  registeredParameter: RegisteredParameter,
  quantityDimension: DimensionId,
  unit: UnitId,
): boolean {
  const uncertaintyDimension =
    quantityDimension === "absolute_temperature"
      ? "temperature_difference"
      : quantityDimension;
  if (unit === canonicalUnitIdFor(uncertaintyDimension)) return true;
  if (quantityDimension === "absolute_temperature") {
    return (
      unit === "delta_degC" &&
      registeredParameter.allowedDisplayUnits.includes("degC")
    );
  }
  return registeredParameter.allowedDisplayUnits.includes(unit);
}

function validateQuantityUncertainty(
  value: JsonValue | undefined,
  quantityDimension: DimensionId,
  registeredParameter: RegisteredParameter,
): string | null {
  if (value === undefined || !isRecord(value) || !isNonBlank(value.kind)) {
    return "Quantity uncertainty must declare a controlled kind.";
  }
  if (value.kind === "unknown") {
    return hasExactKeys(value, ["kind"])
      ? null
      : "Unknown uncertainty contains unsupported fields.";
  }
  if (value.kind === "relative") {
    if (
      !hasRequiredKeys(value, ["kind", "evaluation", "fraction"]) ||
      !hasOnlyKeys(value, [
        "kind",
        "evaluation",
        "fraction",
        "coverageFactor",
        "confidenceLevel",
      ]) ||
      !isFiniteNumber(value.fraction) ||
      value.fraction < 0
    ) {
      return "Relative uncertainty does not match the controlled schema.";
    }
    return validateEvaluationMetadata(value);
  }
  if (value.kind !== "absolute") {
    return "Quantity uncertainty kind is not controlled.";
  }
  if (
    !hasRequiredKeys(value, [
      "kind",
      "evaluation",
      "valueSi",
      "dimensionId",
      "canonicalUnitId",
      "originalRepresentation",
    ]) ||
    !hasOnlyKeys(value, [
      "kind",
      "evaluation",
      "valueSi",
      "dimensionId",
      "canonicalUnitId",
      "originalRepresentation",
      "coverageFactor",
      "confidenceLevel",
    ]) ||
    !isFiniteNumber(value.valueSi) ||
    value.valueSi < 0 ||
    typeof value.dimensionId !== "string" ||
    !isDimensionId(value.dimensionId) ||
    typeof value.canonicalUnitId !== "string" ||
    !isUnitId(value.canonicalUnitId)
  ) {
    return "Absolute uncertainty does not match the controlled schema.";
  }
  const expectedDimension =
    quantityDimension === "absolute_temperature"
      ? "temperature_difference"
      : quantityDimension;
  if (
    value.dimensionId !== expectedDimension ||
    value.canonicalUnitId !== canonicalUnitIdFor(value.dimensionId)
  ) {
    return "Absolute uncertainty dimension/unit contradicts the quantity.";
  }
  const representationError = validateRepresentation(
    value.originalRepresentation,
    value.dimensionId,
  );
  if (representationError !== null) return representationError;
  const representation = value.originalRepresentation as JsonRecord;
  const representationUnit = representation.unitId as UnitId;
  if (
    !isAllowedUncertaintyRepresentationUnit(
      registeredParameter,
      quantityDimension,
      representationUnit,
    )
  ) {
    return "Absolute uncertainty representation unit is not allowed for the parameter.";
  }
  const evaluationError = validateEvaluationMetadata(value);
  if (evaluationError !== null) return evaluationError;
  try {
    const recomputed = toCanonicalSI(
      representation.value as number,
      representationUnit,
      value.dimensionId,
    );
    if (!equalWithinSerializationTolerance(value.valueSi, recomputed)) {
      return "Absolute uncertainty valueSi does not reproduce its original representation.";
    }
  } catch {
    return "Absolute uncertainty representation cannot be converted.";
  }
  return null;
}

interface ValidatedQuantity {
  readonly value: Quantity;
  readonly parameterId: string;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
}

function validateQuantity(value: JsonValue | undefined):
  | Readonly<{ readonly ok: true; readonly quantity: ValidatedQuantity }>
  | Readonly<{ readonly ok: false; readonly message: string }> {
  if (value === undefined || !isRecord(value)) {
    return { ok: false, message: "Material property value is not a quantity record." };
  }
  const commonRequiredKeys = [
    "kind",
    "parameterId",
    "dimensionId",
    "canonicalUnitId",
    "basis",
    "status",
    "sourceKind",
    "sourceRef",
    "dataQuality",
  ] as const;
  const commonOptionalKeys = [
    "derivationMethodId",
    "sourceSnapshotId",
    "note",
    "stateKey",
  ] as const;
  if (
    !hasRequiredKeys(value, commonRequiredKeys) ||
    !isStableIdentifier(value.parameterId) ||
    typeof value.dimensionId !== "string" ||
    !isDimensionId(value.dimensionId) ||
    typeof value.canonicalUnitId !== "string" ||
    !isUnitId(value.canonicalUnitId) ||
    value.canonicalUnitId !== canonicalUnitIdFor(value.dimensionId) ||
    typeof value.basis !== "string" ||
    !QUANTITY_BASIS_SET.has(value.basis) ||
    typeof value.sourceKind !== "string" ||
    !QUANTITY_SOURCE_KIND_SET.has(value.sourceKind) ||
    !isStableIdentifier(value.sourceRef) ||
    typeof value.dataQuality !== "string" ||
    !QUANTITY_DATA_QUALITY_SET.has(value.dataQuality)
  ) {
    return {
      ok: false,
      message:
        "Material property quantity has invalid identity, unit, basis, status, or provenance metadata.",
    };
  }

  let registeredParameter: ReturnType<typeof PARAMETER_REGISTRY.find>;
  try {
    const normalizedParameterId = parameterId(value.parameterId);
    sourceRef(value.sourceRef);
    registeredParameter = PARAMETER_REGISTRY.find(normalizedParameterId);
    if (
      registeredParameter === undefined ||
      registeredParameter.dimension !== value.dimensionId ||
      registeredParameter.canonicalUnit !== value.canonicalUnitId
    ) {
      return {
        ok: false,
        message:
          "Material property quantity does not match a frozen parameter dimension/unit.",
      };
    }
    if (value.derivationMethodId !== undefined) {
      if (
        value.sourceKind !== "derived" ||
        !isStableIdentifier(value.derivationMethodId)
      ) {
        return {
          ok: false,
          message:
            "derivationMethodId is allowed only for a derived quantity and must be stable.",
        };
      }
      const derivation = METHOD_SPECIFICATION_REGISTRY.find(
        methodId(value.derivationMethodId),
      );
      if (
        derivation === undefined ||
        (derivation.approvalStatus !== "approved" &&
          derivation.approvalStatus !== "approved_with_limitation")
      ) {
        return {
          ok: false,
          message: "Quantity derivation method is not in the approved v1 allowlist.",
        };
      }
    }
    if (value.sourceSnapshotId !== undefined) {
      if (!isNonBlank(value.sourceSnapshotId)) {
        return {
          ok: false,
          message: "Quantity sourceSnapshotId must be a stable snapshot ID.",
        };
      }
      contentAddressedSnapshotId(value.sourceSnapshotId);
    }
  } catch {
    return {
      ok: false,
      message: "Quantity contains an unstable controlled identifier.",
    };
  }
  if (registeredParameter === undefined) {
    return { ok: false, message: "Quantity parameter is not registered." };
  }
  if (
    (value.note !== undefined && !isNonBlank(value.note)) ||
    (value.stateKey !== undefined && !isNonBlank(value.stateKey)) ||
    (value.sourceKind === "derived" && value.derivationMethodId === undefined)
  ) {
    return { ok: false, message: "Quantity state/provenance metadata is incomplete." };
  }

  if (value.kind === "scalar") {
    if (
      !hasRequiredKeys(value, [
        ...commonRequiredKeys,
        "valueSi",
        "originalRepresentation",
        "displayRepresentation",
        "uncertainty",
        "validDigits",
      ]) ||
      !hasOnlyKeys(value, [
        ...commonRequiredKeys,
        ...commonOptionalKeys,
        "valueSi",
        "originalRepresentation",
        "displayRepresentation",
        "uncertainty",
        "validDigits",
      ]) ||
      !isFiniteNumber(value.valueSi) ||
      (value.status !== "known" &&
        value.status !== "estimated" &&
        value.status !== "measured") ||
      !isFiniteNumber(value.validDigits) ||
      !Number.isInteger(value.validDigits) ||
      value.validDigits < 1 ||
      value.validDigits > 17
    ) {
      return { ok: false, message: "Scalar material quantity schema is invalid." };
    }
    const originalError = validateRepresentation(
      value.originalRepresentation,
      value.dimensionId,
    );
    if (originalError !== null) return { ok: false, message: originalError };
    const displayError = validateRepresentation(
      value.displayRepresentation,
      value.dimensionId,
    );
    if (displayError !== null) return { ok: false, message: displayError };
    const original = value.originalRepresentation as JsonRecord;
    const display = value.displayRepresentation as JsonRecord;
    const originalUnit = original.unitId as UnitId;
    const displayUnit = display.unitId as UnitId;
    if (
      (originalUnit !== registeredParameter.canonicalUnit &&
        !registeredParameter.allowedDisplayUnits.includes(originalUnit)) ||
      !registeredParameter.allowedDisplayUnits.includes(displayUnit)
    ) {
      return {
        ok: false,
        message: "Quantity representation unit is not allowed for the parameter.",
      };
    }
    try {
      const recomputedValueSi = toCanonicalSI(
        original.value as number,
        originalUnit,
        value.dimensionId,
      );
      const recomputedDisplayValue = fromCanonicalSI(
        value.valueSi,
        displayUnit,
        value.dimensionId,
      );
      if (
        !equalWithinSerializationTolerance(value.valueSi, recomputedValueSi) ||
        !equalWithinSerializationTolerance(
          display.value as number,
          recomputedDisplayValue,
        )
      ) {
        return {
          ok: false,
          message: "Quantity representations do not reproduce canonical SI.",
        };
      }
    } catch {
      return {
        ok: false,
        message: "Quantity representation conversion failed.",
      };
    }
    const uncertaintyError = validateQuantityUncertainty(
      value.uncertainty,
      value.dimensionId,
      registeredParameter,
    );
    if (uncertaintyError !== null) {
      return { ok: false, message: uncertaintyError };
    }
  } else if (value.kind === "unavailable") {
    if (
      !hasRequiredKeys(value, [...commonRequiredKeys, "reason"]) ||
      !hasOnlyKeys(value, [
        ...commonRequiredKeys,
        ...commonOptionalKeys,
        "reason",
      ]) ||
      (value.status !== "missing" && value.status !== "not_applicable") ||
      !isNonBlank(value.reason)
    ) {
      return {
        ok: false,
        message:
          "Unavailable material quantity schema is invalid or contains a numeric placeholder.",
      };
    }
  } else {
    return { ok: false, message: "Material quantity kind is not controlled." };
  }

  return {
    ok: true,
    quantity: {
      value: value as unknown as Quantity,
      parameterId: value.parameterId,
      dimensionId: value.dimensionId,
      canonicalUnitId: value.canonicalUnitId,
    },
  };
}

interface ValidatedMaterialProperty {
  readonly propertyId: string;
  readonly value: Quantity;
  readonly state: JsonRecord;
  readonly dataQuality: MaterialDataQuality;
  readonly sourceRefs: readonly string[];
  readonly interpolation: JsonValue;
  readonly extrapolation: JsonValue;
}

interface ValidatedMaterialSnapshot {
  readonly snapshotId: string;
  readonly schemaVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly createdAt: string;
  readonly fingerprint: ContentFingerprint;
  readonly materialId: string;
  readonly revision: string;
  readonly libraryTier: MaterialLibraryTier;
  readonly approvalStatus: MaterialApprovalStatus;
  readonly properties: readonly ValidatedMaterialProperty[];
}

function validateMaterialProperty(value: JsonValue, path: string):
  | Readonly<{ readonly ok: true; readonly property: ValidatedMaterialProperty }>
  | Readonly<{ readonly ok: false; readonly message: string }> {
  if (!isRecord(value) || !hasExactKeys(value, MATERIAL_PROPERTY_KEYS)) {
    return {
      ok: false,
      message: `${path} does not match the exact material-property snapshot schema.`,
    };
  }
  if (
    !isStableIdentifier(value.propertyId) ||
    !isRecord(value.state) ||
    typeof value.dataQuality !== "string" ||
    !MATERIAL_DATA_QUALITY_SET.has(value.dataQuality) ||
    !Array.isArray(value.sourceRefs) ||
    value.sourceRefs.length === 0 ||
    !value.sourceRefs.every(isStableIdentifier)
  ) {
    return {
      ok: false,
      message: `${path} has invalid ADR-0005 property identity, state, quality, or source metadata.`,
    };
  }
  try {
    for (const ref of value.sourceRefs) sourceRef(ref);
  } catch {
    return {
      ok: false,
      message: `${path} has an unstable source reference.`,
    };
  }
  const quantityResult = validateQuantity(value.value);
  if (!quantityResult.ok) {
    return { ok: false, message: `${path}: ${quantityResult.message}` };
  }
  return {
    ok: true,
    property: {
      propertyId: value.propertyId,
      value: quantityResult.quantity.value,
      state: value.state,
      dataQuality: value.dataQuality as MaterialDataQuality,
      sourceRefs: value.sourceRefs as string[],
      interpolation: value.interpolation as JsonValue,
      extrapolation: value.extrapolation as JsonValue,
    },
  };
}

function validateMaterialSnapshot(value: JsonValue, index: number):
  | Readonly<{ readonly ok: true; readonly snapshot: ValidatedMaterialSnapshot }>
  | Readonly<{ readonly ok: false; readonly message: string }> {
  const path = `$.candidates[${index}]`;
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_ENVELOPE_KEYS)) {
    return {
      ok: false,
      message: `${path} does not match the exact immutable-snapshot envelope.`,
    };
  }
  if (
    value.kind !== "material" ||
    value.schemaVersion !== VERSION_INFO.materialSchema ||
    value.technicalFreezeId !== TECHNICAL_FREEZE_ID ||
    !isStableIdentifier(value.snapshotId) ||
    !isNonBlank(value.createdAt) ||
    !isContentFingerprint(value.fingerprint) ||
    !isRecord(value.payload)
  ) {
    return {
      ok: false,
      message: `${path} has an incompatible kind, schema, freeze, identity, timestamp, or fingerprint.`,
    };
  }
  const date = new Date(value.createdAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.createdAt) {
    return {
      ok: false,
      message: `${path}.createdAt must be a canonical ISO-8601 UTC timestamp.`,
    };
  }
  if (!hasExactKeys(value.payload, MATERIAL_PAYLOAD_KEYS)) {
    return {
      ok: false,
      message: `${path}.payload does not match the exact material snapshot payload.`,
    };
  }
  const payload = value.payload;
  if (
    !isStableIdentifier(payload.materialId) ||
    !isNonBlank(payload.revision) ||
    typeof payload.libraryTier !== "string" ||
    !MATERIAL_LIBRARY_TIERS.has(payload.libraryTier) ||
    typeof payload.approvalStatus !== "string" ||
    !MATERIAL_APPROVAL_STATUS_SET.has(payload.approvalStatus) ||
    !Array.isArray(payload.properties)
  ) {
    return {
      ok: false,
      message: `${path}.payload violates the ADR-0005 material identity, tier, or approval schema.`,
    };
  }
  const properties: ValidatedMaterialProperty[] = [];
  const propertyIds = new Set<string>();
  for (const [propertyIndex, propertyValue] of payload.properties.entries()) {
    const propertyResult = validateMaterialProperty(
      propertyValue,
      `${path}.payload.properties[${propertyIndex}]`,
    );
    if (!propertyResult.ok) return propertyResult;
    if (propertyIds.has(propertyResult.property.propertyId)) {
      return {
        ok: false,
        message: `${path}.payload contains duplicate propertyId ${propertyResult.property.propertyId}.`,
      };
    }
    propertyIds.add(propertyResult.property.propertyId);
    properties.push(propertyResult.property);
  }
  const expectedFingerprint = fingerprint({
    kind: value.kind,
    schemaVersion: value.schemaVersion,
    technicalFreezeId: value.technicalFreezeId,
    payload: value.payload,
  });
  if (
    value.fingerprint.algorithm !== expectedFingerprint.algorithm ||
    value.fingerprint.value !== expectedFingerprint.value ||
    value.snapshotId !== `material:${expectedFingerprint.value}`
  ) {
    return {
      ok: false,
      message: `${path} content fingerprint or snapshotId does not match its controlled content.`,
    };
  }
  return {
    ok: true,
    snapshot: {
      snapshotId: value.snapshotId,
      schemaVersion: value.schemaVersion,
      technicalFreezeId: TECHNICAL_FREEZE_ID,
      createdAt: value.createdAt,
      fingerprint: value.fingerprint,
      materialId: payload.materialId,
      revision: payload.revision,
      libraryTier: payload.libraryTier as MaterialLibraryTier,
      approvalStatus: payload.approvalStatus as MaterialApprovalStatus,
      properties,
    },
  };
}

interface ValidatedExpectation extends MaterialMetadataPropertyExpectation {
  readonly expectedStateFingerprint: ContentFingerprint;
  readonly expectedStateCanonicalJson: string;
}

function validateExpectation(value: JsonValue, index: number):
  | Readonly<{ readonly ok: true; readonly expectation: ValidatedExpectation }>
  | Readonly<{ readonly ok: false; readonly message: string }> {
  const path = `$.propertyExpectations[${index}]`;
  if (!isRecord(value) || !hasExactKeys(value, EXPECTATION_KEYS)) {
    return {
      ok: false,
      message: `${path} does not match the exact property-expectation schema.`,
    };
  }
  if (
    !isStableIdentifier(value.propertyId) ||
    !isStableIdentifier(value.quantityParameterId) ||
    typeof value.dimensionId !== "string" ||
    !isDimensionId(value.dimensionId) ||
    typeof value.canonicalUnitId !== "string" ||
    !isUnitId(value.canonicalUnitId) ||
    value.canonicalUnitId !== canonicalUnitIdFor(value.dimensionId) ||
    !isRecord(value.expectedState)
  ) {
    return {
      ok: false,
      message: `${path} has invalid property, quantity, canonical unit, or state metadata.`,
    };
  }
  let parameter: ReturnType<typeof PARAMETER_REGISTRY.find>;
  try {
    parameter = PARAMETER_REGISTRY.find(parameterId(value.quantityParameterId));
  } catch {
    return {
      ok: false,
      message: `${path}.quantityParameterId is unstable.`,
    };
  }
  if (
    parameter === undefined ||
    parameter.dimension !== value.dimensionId ||
    parameter.canonicalUnit !== value.canonicalUnitId
  ) {
    return {
      ok: false,
      message: `${path} does not match the frozen parameter registry dimension/unit.`,
    };
  }
  return {
    ok: true,
    expectation: {
      propertyId: value.propertyId,
      quantityParameterId: value.quantityParameterId,
      dimensionId: value.dimensionId,
      canonicalUnitId: value.canonicalUnitId,
      expectedState: value.expectedState,
      expectedStateFingerprint: fingerprint(value.expectedState),
      expectedStateCanonicalJson: canonicalStringify(value.expectedState),
    },
  };
}

function comparisonFailure(
  status: MaterialMetadataComparisonFailure["status"],
  reason: MaterialMetadataComparisonFailureReason,
  message: string,
): MaterialMetadataComparisonFailure {
  return deepFreeze({
    kind: "material_metadata_comparison",
    status,
    readiness: MATERIAL_METADATA_COMPARISON_READINESS,
    failure: { reason, message },
  }) as MaterialMetadataComparisonFailure;
}

function observedProperty(
  property: ValidatedMaterialProperty,
): MaterialMetadataObservedProperty {
  return {
    state: property.state,
    stateFingerprint: fingerprint(property.state),
    dataQuality: property.dataQuality,
    sourceRefs: [...property.sourceRefs],
    interpolation: property.interpolation,
    extrapolation: property.extrapolation,
    quantitySemantics: {
      kind: property.value.kind,
      parameterId: property.value.parameterId,
      dimensionId: property.value.dimensionId,
      canonicalUnitId: property.value.canonicalUnitId,
      status: property.value.status,
    },
  };
}

function compareProperty(
  propertyById: ReadonlyMap<string, ValidatedMaterialProperty>,
  expectation: ValidatedExpectation,
): MaterialMetadataPropertyCell {
  const property = propertyById.get(expectation.propertyId);
  if (property === undefined) {
    return {
      propertyId: expectation.propertyId,
      status: "insufficient_data",
      engineeringUsable: false,
      expectedStateFingerprint: expectation.expectedStateFingerprint,
      reasons: ["property_missing"],
      observed: null,
    };
  }
  const reasons: MaterialMetadataCellFailureReason[] = [];
  if (
    canonicalStringify(property.state) !==
    expectation.expectedStateCanonicalJson
  ) {
    reasons.push("state_mismatch");
  }
  if (property.value.parameterId !== expectation.quantityParameterId) {
    reasons.push("quantity_parameter_mismatch");
  }
  if (property.value.dimensionId !== expectation.dimensionId) {
    reasons.push("quantity_dimension_mismatch");
  }
  if (property.value.canonicalUnitId !== expectation.canonicalUnitId) {
    reasons.push("quantity_canonical_unit_mismatch");
  }
  if (property.value.kind === "unavailable") {
    reasons.push("quantity_unavailable");
  }
  const observed = observedProperty(property);
  if (reasons.length > 0) {
    return {
      propertyId: expectation.propertyId,
      status: "insufficient_data",
      engineeringUsable: false,
      expectedStateFingerprint: expectation.expectedStateFingerprint,
      reasons,
      observed,
    };
  }
  return {
    propertyId: expectation.propertyId,
    status: "available",
    engineeringUsable: false,
    expectedStateFingerprint: expectation.expectedStateFingerprint,
    observed,
    value: property.value,
  };
}

function compareCandidate(
  snapshot: ValidatedMaterialSnapshot,
  expectations: readonly ValidatedExpectation[],
): MaterialMetadataCandidateResult {
  const propertyById = new Map(
    snapshot.properties.map((property) => [property.propertyId, property] as const),
  );
  const properties = expectations.map((expectation) =>
    compareProperty(propertyById, expectation),
  );
  return {
    status: properties.every((property) => property.status === "available")
      ? "success"
      : "insufficient_data",
    snapshotId: snapshot.snapshotId,
    schemaVersion: snapshot.schemaVersion,
    technicalFreezeId: snapshot.technicalFreezeId,
    createdAt: snapshot.createdAt,
    fingerprint: snapshot.fingerprint,
    materialId: snapshot.materialId,
    revision: snapshot.revision,
    libraryTier: snapshot.libraryTier,
    approvalStatus: snapshot.approvalStatus,
    properties,
  };
}

/**
 * Compare only metadata from exact, content-addressed material snapshots.
 *
 * The function is a no-throw trust boundary. A globally malformed request is
 * invalid_input. A missing property or state mismatch affects only that
 * candidate. An empty released catalog is explicit insufficient_data.
 */
export function compareMaterialSnapshotMetadata(
  input: unknown,
): MaterialMetadataComparisonOutcome {
  let copied: JsonValue;
  try {
    copied = safeJsonCopy(input);
  } catch (error) {
    return comparisonFailure(
      "invalid_input",
      "input_schema_invalid",
      controlledBoundaryMessage(error),
    );
  }
  if (!isRecord(copied) || !hasExactKeys(copied, INPUT_KEYS)) {
    return comparisonFailure(
      "invalid_input",
      "input_schema_invalid",
      "Material metadata comparison requires exactly the six controlled input fields.",
    );
  }

  const hasCaseId = isStableIdentifier(copied.comparisonCaseId);
  const hasNonMaterialFingerprint = isContentFingerprint(
    copied.nonMaterialInputFingerprint,
  );
  if (
    (copied.comparisonCaseId !== null && !hasCaseId) ||
    (copied.nonMaterialInputFingerprint !== null &&
      !hasNonMaterialFingerprint) ||
    hasCaseId === hasNonMaterialFingerprint
  ) {
    return comparisonFailure(
      "invalid_input",
      "comparison_case_binding_invalid",
      "Provide exactly one stable comparisonCaseId or SHA-256 nonMaterialInputFingerprint.",
    );
  }

  if (
    copied.candidateSource !== "explicit_snapshots" &&
    copied.candidateSource !== "released_catalog"
  ) {
    return comparisonFailure(
      "invalid_input",
      "candidate_source_invalid",
      "candidateSource must be explicit_snapshots or released_catalog.",
    );
  }
  if (
    !Array.isArray(copied.requiredPropertyIds) ||
    copied.requiredPropertyIds.length === 0 ||
    !copied.requiredPropertyIds.every(isStableIdentifier) ||
    !Array.isArray(copied.propertyExpectations) ||
    !Array.isArray(copied.candidates)
  ) {
    return comparisonFailure(
      "invalid_input",
      "required_property_contract_invalid",
      "Required property IDs, exact property expectations, and candidates must be controlled arrays.",
    );
  }

  const requiredPropertyIds = copied.requiredPropertyIds as string[];
  if (new Set(requiredPropertyIds).size !== requiredPropertyIds.length) {
    return comparisonFailure(
      "invalid_input",
      "duplicate_required_property_id",
      "requiredPropertyIds must not contain duplicates.",
    );
  }
  const expectations: ValidatedExpectation[] = [];
  const expectationIds = new Set<string>();
  for (const [index, value] of copied.propertyExpectations.entries()) {
    const result = validateExpectation(value, index);
    if (!result.ok) {
      return comparisonFailure(
        "invalid_input",
        "required_property_contract_invalid",
        result.message,
      );
    }
    if (expectationIds.has(result.expectation.propertyId)) {
      return comparisonFailure(
        "invalid_input",
        "duplicate_property_expectation",
        `propertyExpectations contains duplicate propertyId ${result.expectation.propertyId}.`,
      );
    }
    expectationIds.add(result.expectation.propertyId);
    expectations.push(result.expectation);
  }
  if (
    expectations.length !== requiredPropertyIds.length ||
    requiredPropertyIds.some((id) => !expectationIds.has(id)) ||
    expectations.some((expectation) =>
      !requiredPropertyIds.includes(expectation.propertyId),
    )
  ) {
    return comparisonFailure(
      "invalid_input",
      "required_property_expectation_mismatch",
      "requiredPropertyIds and propertyExpectations must define the same unique property set.",
    );
  }
  const expectationById = new Map(
    expectations.map((expectation) => [expectation.propertyId, expectation]),
  );
  const orderedExpectations = requiredPropertyIds.map(
    (id) => expectationById.get(id) as ValidatedExpectation,
  );

  if (copied.candidateSource === "released_catalog") {
    if (copied.candidates.length !== 0) {
      return comparisonFailure(
        "invalid_input",
        "released_catalog_candidates_forbidden",
        "released_catalog requests must not inject explicit snapshot candidates.",
      );
    }
    if (RELEASED_MATERIAL_REGISTRY.size === 0) {
      return comparisonFailure(
        "insufficient_data",
        "released_catalog_empty",
        "The released material catalog contains no approved records; no candidate snapshot is fabricated.",
      );
    }
    return comparisonFailure(
      "insufficient_data",
      "released_catalog_snapshot_resolution_unavailable",
      "Released records cannot become state-resolved snapshots until the A-01 adapter is released.",
    );
  }

  if (copied.candidates.length === 0) {
    return comparisonFailure(
      "insufficient_data",
      "explicit_candidates_missing",
      "No explicit material snapshots were supplied.",
    );
  }
  const snapshots: ValidatedMaterialSnapshot[] = [];
  const snapshotIds = new Set<string>();
  for (const [index, value] of copied.candidates.entries()) {
    const result = validateMaterialSnapshot(value, index);
    if (!result.ok) {
      return comparisonFailure(
        "invalid_input",
        "candidate_snapshot_invalid",
        result.message,
      );
    }
    if (snapshotIds.has(result.snapshot.snapshotId)) {
      return comparisonFailure(
        "invalid_input",
        "duplicate_candidate_snapshot",
        `Candidate snapshot ${result.snapshot.snapshotId} is duplicated.`,
      );
    }
    snapshotIds.add(result.snapshot.snapshotId);
    snapshots.push(result.snapshot);
  }

  const outputExpectations = orderedExpectations.map((expectation) => ({
    propertyId: expectation.propertyId,
    quantityParameterId: expectation.quantityParameterId,
    dimensionId: expectation.dimensionId,
    canonicalUnitId: expectation.canonicalUnitId,
    expectedState: expectation.expectedState,
    expectedStateFingerprint: expectation.expectedStateFingerprint,
  }));
  const result: MaterialMetadataComparisonSuccess = {
    kind: "material_metadata_comparison",
    status: "success",
    comparisonCaseId: hasCaseId ? (copied.comparisonCaseId as string) : null,
    nonMaterialInputFingerprint: hasNonMaterialFingerprint
      ? (copied.nonMaterialInputFingerprint as unknown as ContentFingerprint)
      : null,
    candidateSource: "explicit_snapshots",
    requiredPropertyIds: [...requiredPropertyIds],
    propertyExpectations: outputExpectations,
    candidates: snapshots.map((snapshot) =>
      compareCandidate(snapshot, orderedExpectations),
    ),
    readiness: MATERIAL_METADATA_COMPARISON_READINESS,
  };
  return deepFreeze(result) as MaterialMetadataComparisonSuccess;
}
