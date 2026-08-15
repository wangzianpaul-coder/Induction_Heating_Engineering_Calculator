import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import {
  LOADED_STATES,
  PHASOR_CONVENTION,
  QUANTITY_BASES,
  TOPOLOGY_IDS,
} from "../domain/electrical.js";
import {
  contentAddressedSnapshotId,
  methodId,
  parameterId,
  sourceRef,
} from "../domain/ids.js";
import { QUANTITY_SOURCE_KINDS } from "../domain/quantity.js";
import { isApprovalStatus, isDataQuality } from "../domain/status.js";
import {
  METHOD_SPECIFICATION_REGISTRY,
  PARAMETER_REGISTRY,
} from "../registries/index.js";
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
import type {
  CaseFile,
} from "./case-file.js";
import { CASE_FILE_KIND } from "./case-constants.js";
import { fingerprint } from "./canonical-json.js";

export type CaseSchemaFailureCode =
  | "invalid_input"
  | "unsupported_schema_version"
  | "technical_freeze_mismatch"
  | "version_mismatch"
  | "fingerprint_mismatch";

export type CaseSchemaValidationResult =
  | { readonly ok: true; readonly caseFile: CaseFile }
  | {
      readonly ok: false;
      readonly code: CaseSchemaFailureCode;
      readonly message: string;
    };

type UnknownRecord = Record<string, unknown>;
type RegisteredParameter = NonNullable<
  ReturnType<typeof PARAMETER_REGISTRY.find>
>;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_CASE_STRUCTURE_DEPTH = 128;
const MAX_CASE_STRUCTURE_NODES = 250_000;
const TOPOLOGY_ID_SET = new Set<string>(TOPOLOGY_IDS);
const QUANTITY_BASIS_SET = new Set<string>(QUANTITY_BASES);
const LOADED_STATE_SET = new Set<string>(LOADED_STATES);
const QUANTITY_SOURCE_KIND_SET = new Set<string>(QUANTITY_SOURCE_KINDS);

/**
 * Floating-point comparisons at the JSON boundary allow only a small multiple
 * of binary64 rounding error. This is a serialization tolerance, never an
 * engineering, applicability, measurement, or solver tolerance.
 */
export const CASE_NUMERIC_SERIALIZATION_ULP_FACTOR = 32;

function equalWithinCaseSerializationTolerance(
  actual: number,
  recomputed: number,
): boolean {
  if (actual === recomputed) {
    return true;
  }
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

function failure(
  code: CaseSchemaFailureCode,
  message: string,
): CaseSchemaValidationResult {
  return { ok: false, code, message };
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(record: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const controlled = [...expected].sort();
  return (
    actual.length === controlled.length &&
    actual.every((key, index) => key === controlled[index])
  );
}

function hasOnlyKeys(record: UnknownRecord, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(record).every((key) => allowedSet.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isContentFingerprint(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["algorithm", "value"]) &&
    value.algorithm === "sha256" &&
    typeof value.value === "string" &&
    SHA256_PATTERN.test(value.value)
  );
}

function hasRequiredKeys(record: UnknownRecord, required: readonly string[]): boolean {
  return required.every((key) => Object.hasOwn(record, key));
}

function validateRepresentation(
  value: unknown,
  dimensionId: DimensionId,
  path: string,
): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["value", "unitId"]) ||
    !isFiniteNumber(value.value) ||
    typeof value.unitId !== "string" ||
    !isUnitId(value.unitId) ||
    !isDimensionId(dimensionId) ||
    !getUnitDefinition(value.unitId).dimensionIds.includes(dimensionId)
  ) {
    return `${path} must contain a finite value in a unit compatible with ${dimensionId}.`;
  }
  return null;
}

function validateEvaluationMetadata(value: UnknownRecord, path: string): string | null {
  if (value.evaluation !== "standard" && value.evaluation !== "expanded") {
    return `${path}.evaluation must be standard or expanded.`;
  }
  if (
    value.coverageFactor !== undefined &&
    (!isFiniteNumber(value.coverageFactor) || value.coverageFactor <= 0)
  ) {
    return `${path}.coverageFactor must be positive and finite.`;
  }
  if (value.evaluation === "expanded" && value.coverageFactor === undefined) {
    return `${path} expanded uncertainty requires coverageFactor.`;
  }
  if (
    value.confidenceLevel !== undefined &&
    (!isFiniteNumber(value.confidenceLevel) ||
      value.confidenceLevel <= 0 ||
      value.confidenceLevel > 1)
  ) {
    return `${path}.confidenceLevel must be in (0, 1].`;
  }
  return null;
}

function isAllowedUncertaintyRepresentationUnit(
  parameter: RegisteredParameter,
  quantityDimensionId: DimensionId,
  unitId: UnitId,
): boolean {
  const uncertaintyDimensionId =
    quantityDimensionId === "absolute_temperature"
      ? "temperature_difference"
      : quantityDimensionId;
  if (unitId === canonicalUnitIdFor(uncertaintyDimensionId)) {
    return true;
  }
  if (quantityDimensionId === "absolute_temperature") {
    return (
      unitId === "delta_degC" &&
      parameter.allowedDisplayUnits.includes("degC")
    );
  }
  return parameter.allowedDisplayUnits.includes(unitId);
}

function validateQuantityUncertainty(
  value: unknown,
  quantityDimensionId: DimensionId,
  path: string,
  registeredParameter?: RegisteredParameter,
): string | null {
  if (!isRecord(value) || !isNonEmptyString(value.kind)) {
    return `${path} must declare a controlled uncertainty kind.`;
  }
  if (value.kind === "unknown") {
    return hasExactKeys(value, ["kind"])
      ? null
      : `${path} contains unsupported fields for unknown uncertainty.`;
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
      return `${path} must match the controlled relative-uncertainty schema.`;
    }
    return validateEvaluationMetadata(value, path);
  }
  if (value.kind === "absolute") {
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
      return `${path} must match the controlled absolute-uncertainty schema.`;
    }
    const expectedDimension =
      quantityDimensionId === "absolute_temperature"
        ? "temperature_difference"
        : quantityDimensionId;
    if (
      value.dimensionId !== expectedDimension ||
      value.canonicalUnitId !== canonicalUnitIdFor(value.dimensionId)
    ) {
      return `${path} dimension/unit does not match the quantity uncertainty semantics.`;
    }
    const representationError = validateRepresentation(
      value.originalRepresentation,
      value.dimensionId,
      `${path}.originalRepresentation`,
    );
    if (representationError !== null) {
      return representationError;
    }
    const uncertaintyRepresentation = value.originalRepresentation as UnknownRecord;
    const uncertaintyUnitId = uncertaintyRepresentation.unitId as UnitId;
    if (
      registeredParameter !== undefined &&
      !isAllowedUncertaintyRepresentationUnit(
        registeredParameter,
        quantityDimensionId,
        uncertaintyUnitId,
      )
    ) {
      return `${path}.originalRepresentation.unitId is not allowed for the frozen parameter uncertainty semantics.`;
    }
    const evaluationError = validateEvaluationMetadata(value, path);
    if (evaluationError !== null) {
      return evaluationError;
    }
    let recomputedValueSi: number;
    try {
      recomputedValueSi = toCanonicalSI(
        uncertaintyRepresentation.value as number,
        uncertaintyRepresentation.unitId as UnitId,
        value.dimensionId,
      );
    } catch (error) {
      return `${path}.originalRepresentation cannot be converted to canonical SI: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (!equalWithinCaseSerializationTolerance(value.valueSi, recomputedValueSi)) {
      return `${path}.valueSi does not reproduce its original representation within the numeric serialization tolerance.`;
    }
    return null;
  }
  return `${path}.kind is not a controlled uncertainty kind.`;
}

function validateSerializedQuantity(
  value: unknown,
  path: string,
  requireRegisteredParameter = false,
): string | null {
  if (!isRecord(value)) {
    return `${path} must match the controlled serialized-quantity schema.`;
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
    !isNonEmptyString(value.parameterId) ||
    typeof value.dimensionId !== "string" ||
    !isDimensionId(value.dimensionId) ||
    typeof value.canonicalUnitId !== "string" ||
    !isUnitId(value.canonicalUnitId) ||
    value.canonicalUnitId !== canonicalUnitIdFor(value.dimensionId) ||
    typeof value.basis !== "string" ||
    !QUANTITY_BASIS_SET.has(value.basis) ||
    typeof value.sourceKind !== "string" ||
    !QUANTITY_SOURCE_KIND_SET.has(value.sourceKind) ||
    !isNonEmptyString(value.sourceRef) ||
    !isDataQuality(value.dataQuality)
  ) {
    return `${path} contains an invalid identifier, semantic unit, basis, provenance, uncertainty, or non-finite canonical-SI value.`;
  }
  let registeredParameter: ReturnType<typeof PARAMETER_REGISTRY.find>;
  try {
    const normalizedParameterId = parameterId(value.parameterId);
    sourceRef(value.sourceRef);
    if (requireRegisteredParameter) {
      registeredParameter = PARAMETER_REGISTRY.find(normalizedParameterId);
      if (registeredParameter === undefined) {
        return `${path}.parameterId is not present in the frozen parameter registry.`;
      }
      if (
        registeredParameter.dimension !== value.dimensionId ||
        registeredParameter.canonicalUnit !== value.canonicalUnitId
      ) {
        return `${path} dimension/unit does not match the frozen parameter definition.`;
      }
    }
    if (value.derivationMethodId !== undefined) {
      if (value.sourceKind !== "derived") {
        return `${path}.derivationMethodId is permitted only for a derived quantity.`;
      }
      if (!isNonEmptyString(value.derivationMethodId)) {
        return `${path}.derivationMethodId must be a non-empty string.`;
      }
      const derivationId = methodId(value.derivationMethodId);
      const derivationSpecification = METHOD_SPECIFICATION_REGISTRY.find(derivationId);
      if (
        derivationSpecification === undefined ||
        (derivationSpecification.approvalStatus !== "approved" &&
          derivationSpecification.approvalStatus !== "approved_with_limitation")
      ) {
        return `${path}.derivationMethodId is not in the v1 approved method allowlist.`;
      }
    }
    if (value.sourceSnapshotId !== undefined) {
      if (!isNonEmptyString(value.sourceSnapshotId)) {
        return `${path}.sourceSnapshotId must be a non-empty string.`;
      }
      contentAddressedSnapshotId(value.sourceSnapshotId);
    }
  } catch (error) {
    return `${path} contains an unstable parameter or source identifier: ${error instanceof Error ? error.message : String(error)}`;
  }

  if (
    (value.note !== undefined && !isNonEmptyString(value.note)) ||
    (value.stateKey !== undefined && !isNonEmptyString(value.stateKey)) ||
    (value.sourceKind === "derived" && value.derivationMethodId === undefined)
  ) {
    return `${path} contains incomplete state or provenance metadata.`;
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
      typeof value.validDigits !== "number" ||
      !Number.isInteger(value.validDigits) ||
      value.validDigits < 1 ||
      value.validDigits > 17
    ) {
      return `${path} must match the controlled scalar-quantity schema.`;
    }
    const originalError = validateRepresentation(
      value.originalRepresentation,
      value.dimensionId,
      `${path}.originalRepresentation`,
    );
    if (originalError !== null) {
      return originalError;
    }
    const displayError = validateRepresentation(
      value.displayRepresentation,
      value.dimensionId,
      `${path}.displayRepresentation`,
    );
    if (displayError !== null) {
      return displayError;
    }
    const originalRepresentation = value.originalRepresentation as UnknownRecord;
    const displayRepresentation = value.displayRepresentation as UnknownRecord;
    if (registeredParameter !== undefined) {
      const originalUnitId = originalRepresentation.unitId as UnitId;
      const displayUnitId = displayRepresentation.unitId as UnitId;
      if (
        originalUnitId !== registeredParameter.canonicalUnit &&
        !registeredParameter.allowedDisplayUnits.includes(originalUnitId)
      ) {
        return `${path}.originalRepresentation.unitId is not allowed for the frozen parameter semantics.`;
      }
      if (!registeredParameter.allowedDisplayUnits.includes(displayUnitId)) {
        return `${path}.displayRepresentation.unitId is not allowed for the frozen parameter semantics.`;
      }
    }
    let recomputedValueSi: number;
    let recomputedDisplayValue: number;
    try {
      recomputedValueSi = toCanonicalSI(
        originalRepresentation.value as number,
        originalRepresentation.unitId as UnitId,
        value.dimensionId,
      );
      recomputedDisplayValue = fromCanonicalSI(
        value.valueSi,
        displayRepresentation.unitId as UnitId,
        value.dimensionId,
      );
    } catch (error) {
      return `${path} representations cannot be converted consistently: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (!equalWithinCaseSerializationTolerance(value.valueSi, recomputedValueSi)) {
      return `${path}.valueSi does not reproduce originalRepresentation within the numeric serialization tolerance.`;
    }
    if (
      !equalWithinCaseSerializationTolerance(
        displayRepresentation.value as number,
        recomputedDisplayValue,
      )
    ) {
      return `${path}.displayRepresentation does not reproduce valueSi within the numeric serialization tolerance.`;
    }
    return validateQuantityUncertainty(
      value.uncertainty,
      value.dimensionId,
      `${path}.uncertainty`,
      registeredParameter,
    );
  }

  if (value.kind === "unavailable") {
    if (
      !hasRequiredKeys(value, [...commonRequiredKeys, "reason"]) ||
      !hasOnlyKeys(value, [
        ...commonRequiredKeys,
        ...commonOptionalKeys,
        "reason",
      ]) ||
      (value.status !== "missing" && value.status !== "not_applicable") ||
      !isNonEmptyString(value.reason)
    ) {
      return `${path} must match the controlled unavailable-quantity schema and contain no numeric placeholder.`;
    }
    return null;
  }
  return `${path}.kind must be scalar or unavailable.`;
}

function validateQuantityArray(
  value: unknown,
  path: string,
  requireRegisteredParameters = false,
): string | null {
  if (!Array.isArray(value)) {
    return `${path} must be an array.`;
  }
  const parameterIds = new Set<string>();
  for (const [index, quantity] of value.entries()) {
    const error = validateSerializedQuantity(
      quantity,
      `${path}[${index}]`,
      requireRegisteredParameters,
    );
    if (error !== null) {
      return error;
    }
    const parameterId = (quantity as UnknownRecord).parameterId as string;
    if (parameterIds.has(parameterId)) {
      return `${path} contains duplicate parameterId ${parameterId}.`;
    }
    parameterIds.add(parameterId);
  }
  return null;
}

function validateGeometryPayload(value: unknown, path: string): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "geometrySchemaVersion",
      "geometryMappingId",
      "quantities",
      "assumptions",
    ])
  ) {
    return `${path} must match the controlled geometry payload schema.`;
  }
  if (
    value.geometrySchemaVersion !== VERSION_INFO.geometrySchema ||
    !isNonEmptyString(value.geometryMappingId) ||
    !isStringArray(value.assumptions)
  ) {
    return `${path} contains an incompatible geometry version or invalid metadata.`;
  }
  return validateQuantityArray(value.quantities, `${path}.quantities`, true);
}

function validateMaterialProperty(value: unknown, path: string): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "propertyId",
      "value",
      "state",
      "dataQuality",
      "sourceRefs",
      "interpolation",
      "extrapolation",
    ])
  ) {
    return `${path} must match the controlled material-property snapshot schema.`;
  }
  if (
    !isNonEmptyString(value.propertyId) ||
    !isRecord(value.state) ||
    !isDataQuality(value.dataQuality) ||
    !isStringArray(value.sourceRefs) ||
    value.sourceRefs.length === 0
  ) {
    return `${path} has incomplete property provenance or state metadata.`;
  }
  for (const ref of value.sourceRefs) {
    try {
      sourceRef(ref);
    } catch (error) {
      return `${path}.sourceRefs contains an unstable identifier: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  return validateSerializedQuantity(value.value, `${path}.value`, true);
}

function validateMaterialPayload(value: unknown, path: string): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "materialId",
      "revision",
      "libraryTier",
      "approvalStatus",
      "properties",
    ])
  ) {
    return `${path} must match the controlled material payload schema.`;
  }
  if (
    !isNonEmptyString(value.materialId) ||
    !isNonEmptyString(value.revision) ||
    (value.libraryTier !== "preset_common" &&
      value.libraryTier !== "project_material" &&
      value.libraryTier !== "user_defined") ||
    !isApprovalStatus(value.approvalStatus) ||
    !Array.isArray(value.properties)
  ) {
    return `${path} contains invalid material identity, tier, approval, or properties.`;
  }
  const propertyIds = new Set<string>();
  for (const [index, property] of value.properties.entries()) {
    const error = validateMaterialProperty(property, `${path}.properties[${index}]`);
    if (error !== null) {
      return error;
    }
    const propertyId = (property as UnknownRecord).propertyId as string;
    if (propertyIds.has(propertyId)) {
      return `${path}.properties contains duplicate propertyId ${propertyId}.`;
    }
    propertyIds.add(propertyId);
  }
  return null;
}

function validateSnapshot(
  value: unknown,
  path: string,
  expectedKind: "geometry" | "material" | "case",
  expectedSchema: string,
  payloadValidator: (payload: unknown, path: string) => string | null,
): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "snapshotId",
      "kind",
      "schemaVersion",
      "technicalFreezeId",
      "createdAt",
      "fingerprint",
      "payload",
    ])
  ) {
    return `${path} must match the controlled immutable-snapshot envelope.`;
  }
  if (
    value.kind !== expectedKind ||
    value.schemaVersion !== expectedSchema ||
    value.technicalFreezeId !== TECHNICAL_FREEZE_ID ||
    !isContentFingerprint(value.fingerprint) ||
    !isNonEmptyString(value.snapshotId) ||
    !isNonEmptyString(value.createdAt)
  ) {
    return `${path} has an incompatible kind, schema, freeze, identity, or fingerprint.`;
  }
  const parsedDate = new Date(value.createdAt);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== value.createdAt) {
    return `${path}.createdAt must be a canonical ISO-8601 timestamp.`;
  }
  const payloadError = payloadValidator(value.payload, `${path}.payload`);
  if (payloadError !== null) {
    return payloadError;
  }
  const expectedFingerprint = fingerprint({
    kind: value.kind,
    schemaVersion: value.schemaVersion,
    technicalFreezeId: value.technicalFreezeId,
    payload: value.payload,
  });
  const suppliedFingerprint = value.fingerprint as UnknownRecord;
  if (suppliedFingerprint.value !== expectedFingerprint.value) {
    return `${path} content does not match its SHA-256 fingerprint.`;
  }
  if (value.snapshotId !== `${expectedKind}:${expectedFingerprint.value}`) {
    return `${path}.snapshotId is not derived from the controlled content fingerprint.`;
  }
  return null;
}

function validatePort(value: unknown, path: string): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "portId",
      "positiveTerminal",
      "negativeTerminal",
      "currentDirection",
      "quantityBasis",
      "loadedState",
      "frequencyHz",
      "referencePlane",
    ])
  ) {
    return `${path} must match the controlled electrical-port schema.`;
  }
  if (
    !isNonEmptyString(value.portId) ||
    !isNonEmptyString(value.positiveTerminal) ||
    !isNonEmptyString(value.negativeTerminal) ||
    value.positiveTerminal === value.negativeTerminal ||
    value.currentDirection !== "into_passive_port" ||
    typeof value.quantityBasis !== "string" ||
    !QUANTITY_BASIS_SET.has(value.quantityBasis) ||
    typeof value.loadedState !== "string" ||
    !LOADED_STATE_SET.has(value.loadedState) ||
    !isFiniteNumber(value.frequencyHz) ||
    value.frequencyHz <= 0 ||
    !isNonEmptyString(value.referencePlane)
  ) {
    return `${path} contains an invalid port convention or operating state.`;
  }
  return null;
}

function validateTopology(value: unknown, path: string): string | null {
  if (!isRecord(value) || !isNonEmptyString(value.status)) {
    return `${path} must declare a controlled topology-selection status.`;
  }
  if (value.status === "insufficient_data") {
    if (!hasOnlyKeys(value, ["status", "reason"])) {
      return `${path} contains unsupported fields for an incomplete topology.`;
    }
    if (value.reason !== undefined && typeof value.reason !== "string") {
      return `${path}.reason must be a string when supplied.`;
    }
    return null;
  }
  if (value.status !== "selected" || !hasExactKeys(value, ["status", "selection"])) {
    return `${path}.status must be selected or insufficient_data.`;
  }
  const selection = value.selection;
  if (
    !isRecord(selection) ||
    !hasExactKeys(selection, [
      "topologyId",
      "controlledTopologyId",
      "designStateId",
      "ports",
      "approvalStatus",
    ]) ||
    !isNonEmptyString(selection.topologyId) ||
    selection.topologyId !== selection.controlledTopologyId ||
    typeof selection.controlledTopologyId !== "string" ||
    !TOPOLOGY_ID_SET.has(selection.controlledTopologyId) ||
    !isNonEmptyString(selection.designStateId) ||
    !Array.isArray(selection.ports) ||
    selection.ports.length === 0
  ) {
    return `${path}.selection does not identify one controlled topology and its ports.`;
  }
  const expectedApproval =
    selection.controlledTopologyId === "llc_zjl_fig2_6_fundamental_equivalent"
      ? "deferred"
      : "approved_with_limitation";
  if (selection.approvalStatus !== expectedApproval) {
    return `${path}.selection approval does not match the frozen topology status.`;
  }
  const portIds = new Set<string>();
  for (const [index, port] of selection.ports.entries()) {
    const error = validatePort(port, `${path}.selection.ports[${index}]`);
    if (error !== null) {
      return error;
    }
    const portId = (port as UnknownRecord).portId as string;
    if (portIds.has(portId)) {
      return `${path}.selection.ports contains duplicate portId ${portId}.`;
    }
    portIds.add(portId);
  }
  return null;
}

function validatePhasorConvention(value: unknown, path: string): string | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "amplitudeBasis",
      "timeConvention",
      "currentDirection",
      "complexPower",
    ]) ||
    value.amplitudeBasis !== PHASOR_CONVENTION.amplitudeBasis ||
    value.timeConvention !== PHASOR_CONVENTION.timeConvention ||
    value.currentDirection !== PHASOR_CONVENTION.currentDirection ||
    value.complexPower !== PHASOR_CONVENTION.complexPower
  ) {
    return `${path} does not match the frozen RMS phasor convention.`;
  }
  return null;
}

function validateMethodSelections(value: unknown, path: string): string | null {
  if (!Array.isArray(value)) {
    return `${path} must be an array.`;
  }
  const selectedIds = new Set<string>();
  for (const [index, selection] of value.entries()) {
    const selectionPath = `${path}[${index}]`;
    if (
      !isRecord(selection) ||
      !hasExactKeys(selection, ["methodId", "methodVersion", "approvalStatus"]) ||
      !isNonEmptyString(selection.methodId) ||
      !isNonEmptyString(selection.methodVersion) ||
      (selection.approvalStatus !== "approved" &&
        selection.approvalStatus !== "approved_with_limitation")
    ) {
      return `${selectionPath} must identify one approved frozen method and version.`;
    }

    let normalizedMethodId: ReturnType<typeof methodId>;
    try {
      normalizedMethodId = methodId(selection.methodId);
    } catch (error) {
      return `${selectionPath}.methodId is invalid: ${error instanceof Error ? error.message : String(error)}`;
    }
    const specification = METHOD_SPECIFICATION_REGISTRY.find(normalizedMethodId);
    if (specification === undefined) {
      return `${selectionPath}.methodId is not present in the frozen method registry.`;
    }
    if (
      specification.approvalStatus !== "approved" &&
      specification.approvalStatus !== "approved_with_limitation"
    ) {
      return `${selectionPath}.methodId is not in the v1 approved method allowlist.`;
    }
    if (
      selection.methodVersion !== specification.methodVersion ||
      selection.approvalStatus !== specification.approvalStatus
    ) {
      return `${selectionPath} version/approval does not match the frozen method registry.`;
    }
    if (selectedIds.has(selection.methodId)) {
      return `${path} contains duplicate methodId ${selection.methodId}.`;
    }
    selectedIds.add(selection.methodId);
  }
  return null;
}

function validateDisplayUnits(value: unknown, path: string): string | null {
  if (!isRecord(value)) {
    return `${path} must be a parameter-to-unit map.`;
  }
  for (const [rawParameterId, rawUnitId] of Object.entries(value)) {
    let normalizedParameterId: ReturnType<typeof parameterId>;
    try {
      normalizedParameterId = parameterId(rawParameterId);
    } catch (error) {
      return `${path} contains an invalid parameterId: ${error instanceof Error ? error.message : String(error)}`;
    }
    const parameter = PARAMETER_REGISTRY.find(normalizedParameterId);
    if (parameter === undefined) {
      return `${path} contains a parameter absent from the frozen registry: ${rawParameterId}.`;
    }
    if (
      typeof rawUnitId !== "string" ||
      !isUnitId(rawUnitId) ||
      !parameter.allowedDisplayUnits.includes(rawUnitId)
    ) {
      return `${path}.${rawParameterId} is not an allowed display unit for the parameter.`;
    }
  }
  return null;
}

const CASE_VERSION_KEYS = [
  "application",
  "calculationModel",
  "materialDatabase",
  "caseSchema",
  "resultSchema",
  "geometrySchema",
  "materialSchema",
  "unitRegistry",
  "parameterRegistry",
  "methodRegistry",
  "warningRules",
  "decisionBaseline",
  "calculationBasis",
  "calculationContracts",
  "technicalFreezeId",
] as const;

function validateVersions(value: unknown): CaseSchemaValidationResult | null {
  if (!isRecord(value) || !hasExactKeys(value, CASE_VERSION_KEYS)) {
    return failure("invalid_input", "The case has no complete controlled version map.");
  }
  for (const key of CASE_VERSION_KEYS) {
    if (value[key] !== VERSION_INFO[key]) {
      return failure(
        "version_mismatch",
        `The case requires ${key} ${String(value[key])}; this build provides ${VERSION_INFO[key]}.`,
      );
    }
  }
  return null;
}

function validateCasePayload(value: unknown, path: string): CaseSchemaValidationResult | null {
  const keys = [
    "caseId",
    "caseName",
    "versions",
    "geometry",
    "materials",
    "operatingConditions",
    "topology",
    "phasorConvention",
    "methodSelections",
    "measurementOverrides",
    "femReferenceIds",
    "attachmentHashes",
    "userInputs",
    "displayUnits",
    "explicitOverrides",
    "warningAcknowledgements",
    "solverSettings",
    "provenance",
    "migration",
  ] as const;
  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    return failure("invalid_input", `${path} must match the controlled case payload schema.`);
  }
  if (!isNonEmptyString(value.caseId) || !isNonEmptyString(value.caseName)) {
    return failure("invalid_input", `${path} requires non-empty case identity fields.`);
  }
  const versionFailure = validateVersions(value.versions);
  if (versionFailure !== null) {
    return versionFailure;
  }
  const geometryError = validateSnapshot(
    value.geometry,
    `${path}.geometry`,
    "geometry",
    VERSION_INFO.geometrySchema,
    validateGeometryPayload,
  );
  if (geometryError !== null) {
    return failure(
      geometryError.includes("fingerprint") ? "fingerprint_mismatch" : "invalid_input",
      geometryError,
    );
  }
  if (!Array.isArray(value.materials)) {
    return failure("invalid_input", `${path}.materials must be an array.`);
  }
  const materialSnapshotIds = new Set<string>();
  for (const [index, material] of value.materials.entries()) {
    const materialError = validateSnapshot(
      material,
      `${path}.materials[${index}]`,
      "material",
      VERSION_INFO.materialSchema,
      validateMaterialPayload,
    );
    if (materialError !== null) {
      return failure(
        materialError.includes("fingerprint") ? "fingerprint_mismatch" : "invalid_input",
        materialError,
      );
    }
    const materialSnapshotId = (material as UnknownRecord).snapshotId as string;
    if (materialSnapshotIds.has(materialSnapshotId)) {
      return failure(
        "invalid_input",
        `${path}.materials contains duplicate snapshot ${materialSnapshotId}.`,
      );
    }
    materialSnapshotIds.add(materialSnapshotId);
  }
  const operatingError = validateQuantityArray(
    value.operatingConditions,
    `${path}.operatingConditions`,
    true,
  );
  if (operatingError !== null) {
    return failure("invalid_input", operatingError);
  }
  const userInputError = validateQuantityArray(
    value.userInputs,
    `${path}.userInputs`,
    true,
  );
  if (userInputError !== null) {
    return failure("invalid_input", userInputError);
  }
  const topologyError = validateTopology(value.topology, `${path}.topology`);
  if (topologyError !== null) {
    return failure("invalid_input", topologyError);
  }
  const phasorError = validatePhasorConvention(
    value.phasorConvention,
    `${path}.phasorConvention`,
  );
  if (phasorError !== null) {
    return failure("invalid_input", phasorError);
  }
  const methodSelectionError = validateMethodSelections(
    value.methodSelections,
    `${path}.methodSelections`,
  );
  if (methodSelectionError !== null) {
    return failure("invalid_input", methodSelectionError);
  }
  const displayUnitError = validateDisplayUnits(value.displayUnits, `${path}.displayUnits`);
  if (displayUnitError !== null) {
    return failure("invalid_input", displayUnitError);
  }
  if (
    !Array.isArray(value.measurementOverrides) ||
    !isStringArray(value.femReferenceIds) ||
    !Array.isArray(value.attachmentHashes) ||
    !value.attachmentHashes.every(isContentFingerprint) ||
    !Array.isArray(value.explicitOverrides) ||
    !Array.isArray(value.warningAcknowledgements) ||
    !isRecord(value.solverSettings) ||
    !Array.isArray(value.provenance)
  ) {
    return failure("invalid_input", `${path} contains invalid case collections or maps.`);
  }
  if (
    !isRecord(value.migration) ||
    !hasExactKeys(value.migration, ["sourceSchemaVersion", "appliedMigrationIds"]) ||
    value.migration.sourceSchemaVersion !== VERSION_INFO.caseSchema ||
    !isStringArray(value.migration.appliedMigrationIds) ||
    value.migration.appliedMigrationIds.length !== 0
  ) {
    return failure(
      "version_mismatch",
      "The case requires an explicit migration that is not registered in this build.",
    );
  }
  return null;
}

function assertBoundedCaseStructure(value: unknown): void {
  const pending: Array<{
    readonly value: unknown;
    readonly depth: number;
    readonly exit: boolean;
  }> = [
    { value, depth: 0, exit: false },
  ];
  const activePath = new WeakSet<object>();
  let nodeCount = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      break;
    }
    if (current.exit) {
      if (current.value !== null && typeof current.value === "object") {
        activePath.delete(current.value);
      }
      continue;
    }
    nodeCount += 1;
    if (nodeCount > MAX_CASE_STRUCTURE_NODES) {
      throw new TypeError("The case structure exceeds the controlled node-count limit.");
    }
    if (current.depth > MAX_CASE_STRUCTURE_DEPTH) {
      throw new TypeError("The case structure exceeds the controlled nesting-depth limit.");
    }
    if (current.value === null || typeof current.value !== "object") {
      if (typeof current.value === "number" && !Number.isFinite(current.value)) {
        throw new TypeError("The case structure contains a non-finite number.");
      }
      continue;
    }
    if (activePath.has(current.value)) {
      throw new TypeError("The case structure contains a cyclic object reference.");
    }
    activePath.add(current.value);
    pending.push({ value: current.value, depth: current.depth, exit: true });
    for (const key of Reflect.ownKeys(current.value)) {
      if (typeof key !== "string") {
        throw new TypeError("The case structure contains a symbol key.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError("The case structure contains an accessor property.");
      }
      if (descriptor.enumerable) {
        pending.push({
          value: descriptor.value,
          depth: current.depth + 1,
          exit: false,
        });
      }
    }
  }
}

function validateBoundedCaseFileCandidate(value: unknown): CaseSchemaValidationResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "kind",
      "schemaVersion",
      "technicalFreezeId",
      "contentFingerprint",
      "caseSnapshot",
    ]) ||
    value.kind !== CASE_FILE_KIND
  ) {
    return failure("invalid_input", "The JSON does not match the controlled case-file envelope.");
  }
  if (value.schemaVersion !== VERSION_INFO.caseSchema) {
    return failure(
      "unsupported_schema_version",
      `No explicit migration is registered from case schema ${String(value.schemaVersion)}.`,
    );
  }
  if (value.technicalFreezeId !== TECHNICAL_FREEZE_ID) {
    return failure(
      "technical_freeze_mismatch",
      `The case maps to technical freeze ${String(value.technicalFreezeId)}, not ${TECHNICAL_FREEZE_ID}.`,
    );
  }
  if (!isContentFingerprint(value.contentFingerprint)) {
    return failure("invalid_input", "The case file has no valid SHA-256 content fingerprint.");
  }
  const caseSnapshot = value.caseSnapshot;
  const casePayload = isRecord(caseSnapshot) ? caseSnapshot.payload : undefined;
  const payloadFailure = validateCasePayload(casePayload, "$.caseSnapshot.payload");
  if (payloadFailure !== null) {
    return payloadFailure;
  }
  const snapshotError = validateSnapshot(
    caseSnapshot,
    "$.caseSnapshot",
    "case",
    VERSION_INFO.caseSchema,
    () => null,
  );
  if (snapshotError !== null) {
    return failure(
      snapshotError.includes("fingerprint") ? "fingerprint_mismatch" : "invalid_input",
      snapshotError,
    );
  }
  const expectedEnvelopeFingerprint = fingerprint({
    kind: value.kind,
    schemaVersion: value.schemaVersion,
    technicalFreezeId: value.technicalFreezeId,
    caseSnapshot: value.caseSnapshot,
  });
  const suppliedEnvelopeFingerprint = value.contentFingerprint as UnknownRecord;
  if (suppliedEnvelopeFingerprint.value !== expectedEnvelopeFingerprint.value) {
    return failure(
      "fingerprint_mismatch",
      "The case content does not match its SHA-256 fingerprint.",
    );
  }
  return { ok: true, caseFile: value as unknown as CaseFile };
}

/**
 * No-throw validation boundary for parsed JSON and untrusted programmatic input.
 * JSON cannot preserve cycles, so cyclic programmatic inputs are rejected.
 */
export function validateCaseFileCandidate(value: unknown): CaseSchemaValidationResult {
  try {
    assertBoundedCaseStructure(value);
    return validateBoundedCaseFileCandidate(value);
  } catch (error) {
    return failure(
      "invalid_input",
      `The case candidate cannot be safely validated: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
