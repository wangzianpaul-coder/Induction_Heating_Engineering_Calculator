import type { Brand } from "../domain/ids.js";
import { DIMENSION_DEFINITIONS } from "../units/dimensions.js";
import {
  isDimensionId,
  isUnitId,
  type DimensionId,
  type UnitId,
} from "../units/ids.js";
import { UNIT_DEFINITIONS } from "../units/registry.js";
import {
  cloneAndDeepFreeze,
  ImmutableRegistry,
} from "./immutableRegistry.js";

export type MaterialId = Brand<string, "MaterialId">;
export type MaterialPropertyId = Brand<string, "MaterialPropertyId">;

const MATERIAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;

function stableMaterialIdentifier<T extends string>(
  value: string,
  label: string,
): Brand<string, T> {
  if (!MATERIAL_ID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a stable non-empty machine identifier.`);
  }
  return value as Brand<string, T>;
}

export function materialId(value: string): MaterialId {
  return stableMaterialIdentifier<"MaterialId">(value, "material_id");
}

export function materialPropertyId(value: string): MaterialPropertyId {
  return stableMaterialIdentifier<"MaterialPropertyId">(value, "property_id");
}

export type MaterialLibraryTier =
  | "preset_common"
  | "project_material"
  | "user_defined";

export type MaterialDataQuality =
  | "approved_reference"
  | "engineering_reference"
  | "generic_typical"
  | "project_specific"
  | "user_defined";

export type MaterialApprovalStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "rejected"
  | "superseded";

export type MaterialPropertyValueKind =
  | "constant"
  | "table"
  | "approved_function";

export type MaterialIndependentVariable =
  | "T"
  | "f"
  | "H"
  | "B"
  | "phase"
  | "pressure"
  | "density"
  | "moisture"
  | "aging";

export type MaterialSourceReviewStatus =
  | "pending_release_cross_check"
  | "reviewed_pass"
  | "reviewed_fail";

export interface MaterialPropertyDomainAxis {
  readonly variable: MaterialIndependentVariable;
  readonly unitSi: UnitId;
  readonly minimum: number | string;
  readonly maximum: number | string;
  readonly boundaryPolicy: "inclusive" | "exclusive" | "mixed";
}

export interface MaterialUncertainty {
  readonly kind: "standard" | "expanded" | "interval" | "unknown";
  readonly value: number | null;
  readonly unitSi: UnitId | null;
  readonly coverageFactor: number | null;
  readonly note: string;
}

export interface MaterialPropertyProvenance {
  readonly sourceId: string;
  readonly document: string;
  readonly edition: string;
  readonly pageTableFigureEquation: string;
  readonly fileSha256: string | null;
  readonly sourceReviewStatus: MaterialSourceReviewStatus;
  readonly testCondition: string;
  readonly surfaceState: string;
}

export interface MaterialSourceRecord {
  readonly sourceId: string;
  readonly document: string;
  readonly edition: string;
  readonly fileSha256: string | null;
  readonly sourceReviewStatus: MaterialSourceReviewStatus;
  readonly notes: string;
}

export interface MaterialConstantData {
  readonly valueKind: "constant";
  readonly valueSi: number;
}

export interface MaterialTablePoint {
  readonly coordinates: Readonly<
    Partial<Record<MaterialIndependentVariable, number | string>>
  >;
  readonly valueSi: number;
}

export interface MaterialTableData {
  readonly valueKind: "table";
  readonly points: readonly MaterialTablePoint[];
}

export interface MaterialApprovedFunctionData {
  readonly valueKind: "approved_function";
  /** Stable implementation reference; executable functions are never stored as data. */
  readonly functionId: string;
  readonly parameterSetId: string;
}

export type MaterialPropertyData =
  | MaterialConstantData
  | MaterialTableData
  | MaterialApprovedFunctionData;

export interface MaterialPropertyRecord {
  readonly propertyId: MaterialPropertyId;
  readonly revision: string;
  readonly dimension: DimensionId;
  readonly unitSi: UnitId;
  readonly independentVariables: readonly MaterialIndependentVariable[];
  readonly data: MaterialPropertyData;
  readonly validRange: readonly MaterialPropertyDomainAxis[];
  readonly interpolationMethod: string;
  readonly extrapolationPolicy: "forbid" | "explicitly_approved";
  readonly uncertainty: MaterialUncertainty;
  readonly provenance: MaterialPropertyProvenance;
  readonly dataQuality: MaterialDataQuality;
  readonly approvalStatus: MaterialApprovalStatus;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
}

export interface MaterialRecord {
  readonly materialId: MaterialId;
  readonly revision: string;
  readonly libraryTier: MaterialLibraryTier;
  readonly dataQuality: MaterialDataQuality;
  readonly name: string;
  readonly gradeOrProduct: string;
  readonly standard: string;
  readonly composition: string;
  readonly condition: string;
  readonly batch: string;
  readonly category: string;
  readonly manufacturer: string | null;
  readonly notes: string;
  readonly propertyRecords: readonly MaterialPropertyRecord[];
  readonly sourceRecords: readonly MaterialSourceRecord[];
  readonly approvalStatus: MaterialApprovalStatus;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
}

export type MaterialCatalogKind = "authoring" | "release";

export type MaterialReleaseGateReason =
  | "record_not_approved"
  | "record_approval_metadata_missing"
  | "property_missing"
  | "property_not_approved"
  | "property_approval_metadata_missing"
  | "property_source_not_reviewed"
  | "property_source_hash_missing"
  | "property_table_shape_not_release_supported"
  | "property_interpolation_not_release_registered"
  | "property_function_not_release_registered";

export class MaterialReleaseGateError extends Error {
  public readonly materialId: MaterialId;
  public readonly propertyId: MaterialPropertyId | null;
  public readonly reason: MaterialReleaseGateReason;

  public constructor(
    id: MaterialId,
    reason: MaterialReleaseGateReason,
    property: MaterialPropertyId | null = null,
  ) {
    super(
      `Material ${id}${property === null ? "" : ` property ${property}`} failed release gate: ${reason}`,
    );
    this.name = "MaterialReleaseGateError";
    this.materialId = id;
    this.propertyId = property;
    this.reason = reason;
  }
}

function assertSha256(value: string, context: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${context} fileSha256 must be 64 lowercase hexadecimal characters.`);
  }
}

const INDEPENDENT_VARIABLE_DIMENSIONS = {
  T: "absolute_temperature",
  f: "frequency",
  H: "magnetic_field_strength",
  B: "magnetic_flux_density",
  phase: "dimensionless",
  pressure: "pressure",
  density: "density",
  moisture: "dimensionless",
  aging: "time",
} as const satisfies Readonly<Record<MaterialIndependentVariable, DimensionId>>;

const MATERIAL_LIBRARY_TIER_VALUES: ReadonlySet<string> = new Set([
  "preset_common",
  "project_material",
  "user_defined",
]);
const MATERIAL_DATA_QUALITY_VALUES: ReadonlySet<string> = new Set([
  "approved_reference",
  "engineering_reference",
  "generic_typical",
  "project_specific",
  "user_defined",
]);
const MATERIAL_APPROVAL_STATUS_VALUES: ReadonlySet<string> = new Set([
  "draft",
  "reviewed",
  "approved",
  "rejected",
  "superseded",
]);
const MATERIAL_SOURCE_REVIEW_STATUS_VALUES: ReadonlySet<string> = new Set([
  "pending_release_cross_check",
  "reviewed_pass",
  "reviewed_fail",
]);
const MATERIAL_PROPERTY_VALUE_KIND_VALUES: ReadonlySet<string> = new Set([
  "constant",
  "table",
  "approved_function",
]);
const MATERIAL_INDEPENDENT_VARIABLE_VALUES: ReadonlySet<string> = new Set(
  Object.keys(INDEPENDENT_VARIABLE_DIMENSIONS),
);
const MATERIAL_BOUNDARY_POLICY_VALUES: ReadonlySet<string> = new Set([
  "inclusive",
  "exclusive",
  "mixed",
]);
const MATERIAL_EXTRAPOLATION_POLICY_VALUES: ReadonlySet<string> = new Set([
  "forbid",
  "explicitly_approved",
]);
const MATERIAL_UNCERTAINTY_KIND_VALUES: ReadonlySet<string> = new Set([
  "standard",
  "expanded",
  "interval",
  "unknown",
]);
const MATERIAL_CATALOG_KIND_VALUES: ReadonlySet<string> = new Set([
  "authoring",
  "release",
]);

function assertKnownEnum(
  value: string,
  allowed: ReadonlySet<string>,
  context: string,
): void {
  if (!allowed.has(value)) {
    throw new TypeError(`${context} contains unknown controlled enum value: ${value}`);
  }
}

function assertNonEmpty(value: string, context: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${context} must be non-empty.`);
  }
}

function assertStableId(value: string, context: string): void {
  if (!MATERIAL_ID_PATTERN.test(value)) {
    throw new TypeError(`${context} must be a stable non-empty machine identifier.`);
  }
}

function assertFinite(value: number, context: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${context} must be finite.`);
  }
}

function assertCanonicalIsoTimestamp(value: string, context: string): void {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError(`${context} must be a canonical ISO-8601 UTC timestamp.`);
  }
}

function validateApprovalMetadata(
  approvedBy: string | null,
  approvedAt: string | null,
  context: string,
): void {
  if ((approvedBy === null) !== (approvedAt === null)) {
    throw new TypeError(`${context} approval metadata must be present or absent as a pair.`);
  }
  if (approvedBy !== null && approvedAt !== null) {
    assertNonEmpty(approvedBy, `${context} approvedBy`);
    assertCanonicalIsoTimestamp(approvedAt, `${context} approvedAt`);
  }
}

function assertControlledUnitForDimension(
  unit: string,
  dimension: DimensionId,
  context: string,
  requireCanonical = true,
): asserts unit is UnitId {
  if (!isUnitId(unit)) {
    throw new TypeError(`${context} uses unknown controlled unit_id: ${unit}`);
  }
  if (!UNIT_DEFINITIONS[unit].dimensionIds.includes(dimension)) {
    throw new TypeError(`${context} unit ${unit} is incompatible with ${dimension}.`);
  }
  if (requireCanonical && DIMENSION_DEFINITIONS[dimension].canonicalUnitId !== unit) {
    throw new TypeError(`${context} unit ${unit} is not canonical SI for ${dimension}.`);
  }
}

function validateDomainAxis(
  axis: MaterialPropertyDomainAxis,
  context: string,
): void {
  assertKnownEnum(
    axis.variable,
    MATERIAL_INDEPENDENT_VARIABLE_VALUES,
    `${context} range variable`,
  );
  assertKnownEnum(
    axis.boundaryPolicy,
    MATERIAL_BOUNDARY_POLICY_VALUES,
    `${context} ${axis.variable} boundaryPolicy`,
  );
  const axisDimension = INDEPENDENT_VARIABLE_DIMENSIONS[axis.variable];
  assertControlledUnitForDimension(axis.unitSi, axisDimension, `${context} ${axis.variable}`);

  if (typeof axis.minimum !== typeof axis.maximum) {
    throw new TypeError(`${context} ${axis.variable} range endpoints must have the same type.`);
  }
  if (typeof axis.minimum === "number" && typeof axis.maximum === "number") {
    assertFinite(axis.minimum, `${context} ${axis.variable} minimum`);
    assertFinite(axis.maximum, `${context} ${axis.variable} maximum`);
    if (axis.minimum > axis.maximum) {
      throw new TypeError(`${context} ${axis.variable} range minimum exceeds maximum.`);
    }
  } else if (typeof axis.minimum === "string" && typeof axis.maximum === "string") {
    assertNonEmpty(axis.minimum, `${context} ${axis.variable} minimum`);
    assertNonEmpty(axis.maximum, `${context} ${axis.variable} maximum`);
  } else {
    throw new TypeError(`${context} ${axis.variable} range endpoints are invalid.`);
  }
}

function validatePointCoordinateAgainstDomain(
  coordinate: number | string,
  axis: MaterialPropertyDomainAxis,
  context: string,
): void {
  if (typeof axis.minimum === "number" && typeof axis.maximum === "number") {
    if (typeof coordinate !== "number") {
      throw new TypeError(
        `${context} must be numeric because its declared domain is numeric.`,
      );
    }
    assertFinite(coordinate, context);
    if (coordinate < axis.minimum || coordinate > axis.maximum) {
      throw new TypeError(`${context} is outside its declared domain.`);
    }
    const isEndpoint = coordinate === axis.minimum || coordinate === axis.maximum;
    if (isEndpoint && axis.boundaryPolicy === "exclusive") {
      throw new TypeError(`${context} lies on an excluded domain endpoint.`);
    }
    if (isEndpoint && axis.boundaryPolicy === "mixed") {
      throw new TypeError(
        `${context} endpoint membership is ambiguous under the mixed boundary policy.`,
      );
    }
    return;
  }

  if (typeof axis.minimum !== "string" || typeof axis.maximum !== "string") {
    throw new TypeError(`${context} has an invalid declared domain.`);
  }
  if (typeof coordinate !== "string") {
    throw new TypeError(
      `${context} must be textual because its declared domain is textual.`,
    );
  }
  assertNonEmpty(coordinate, context);
  if (coordinate !== axis.minimum && coordinate !== axis.maximum) {
    throw new TypeError(
      `${context} is not one of the mechanically declared textual domain endpoints.`,
    );
  }
  if (axis.boundaryPolicy === "exclusive") {
    throw new TypeError(`${context} lies on an excluded domain endpoint.`);
  }
  if (axis.boundaryPolicy === "mixed") {
    throw new TypeError(
      `${context} endpoint membership is ambiguous under the mixed boundary policy.`,
    );
  }
}

function tableCoordinateIdentity(
  property: MaterialPropertyRecord,
  point: MaterialTablePoint,
): string {
  return JSON.stringify(
    property.independentVariables.map((variable) => {
      const coordinate = point.coordinates[variable];
      return typeof coordinate === "number"
        ? ["number", coordinate === 0 ? 0 : coordinate]
        : ["string", coordinate];
    }),
  );
}

function validateUncertainty(
  uncertainty: MaterialUncertainty,
  property: MaterialPropertyRecord,
  context: string,
): void {
  assertKnownEnum(
    uncertainty.kind,
    MATERIAL_UNCERTAINTY_KIND_VALUES,
    `${context} uncertainty kind`,
  );
  assertNonEmpty(uncertainty.note, `${context} uncertainty note`);
  if (uncertainty.value !== null) {
    assertFinite(uncertainty.value, `${context} uncertainty value`);
    if (uncertainty.value < 0) {
      throw new TypeError(`${context} uncertainty value must be non-negative.`);
    }
    if (uncertainty.unitSi === null) {
      throw new TypeError(`${context} uncertainty unit is required when a value is present.`);
    }
    assertControlledUnitForDimension(
      uncertainty.unitSi,
      property.dimension,
      `${context} uncertainty`,
    );
  } else if (uncertainty.unitSi !== null) {
    throw new TypeError(`${context} uncertainty unit requires a numeric value.`);
  }
  if (uncertainty.coverageFactor !== null) {
    assertFinite(uncertainty.coverageFactor, `${context} coverageFactor`);
    if (uncertainty.coverageFactor <= 0) {
      throw new TypeError(`${context} coverageFactor must be positive.`);
    }
  }
}

function validatePropertyData(
  property: MaterialPropertyRecord,
  context: string,
): void {
  assertKnownEnum(
    property.data.valueKind,
    MATERIAL_PROPERTY_VALUE_KIND_VALUES,
    `${context} valueKind`,
  );
  if (property.data.valueKind === "constant") {
    assertFinite(property.data.valueSi, `${context} constant valueSi`);
    return;
  }
  if (property.data.valueKind === "approved_function") {
    assertStableId(property.data.functionId, `${context} functionId`);
    assertStableId(property.data.parameterSetId, `${context} parameterSetId`);
    return;
  }
  if (property.independentVariables.length === 0) {
    throw new TypeError(`${context} table must declare at least one independent variable.`);
  }
  if (property.data.points.length === 0) {
    throw new TypeError(`${context} has an empty table.`);
  }
  const declared = new Set<MaterialIndependentVariable>(property.independentVariables);
  const rangeByVariable = new Map(
    property.validRange.map((axis) => [axis.variable, axis] as const),
  );
  const coordinateIdentities = new Set<string>();
  for (const [pointIndex, point] of property.data.points.entries()) {
    assertFinite(point.valueSi, `${context} table point ${pointIndex} valueSi`);
    const coordinateKeys = Object.keys(point.coordinates);
    if (coordinateKeys.length !== declared.size) {
      throw new TypeError(`${context} table point ${pointIndex} has incomplete coordinates.`);
    }
    for (const key of coordinateKeys) {
      if (!declared.has(key as MaterialIndependentVariable)) {
        throw new TypeError(`${context} table point ${pointIndex} has undeclared coordinate ${key}.`);
      }
      const coordinate = point.coordinates[key as MaterialIndependentVariable];
      if (typeof coordinate !== "number" && typeof coordinate !== "string") {
        throw new TypeError(`${context} table point ${pointIndex} is missing coordinate ${key}.`);
      }
      const axis = rangeByVariable.get(key as MaterialIndependentVariable);
      if (axis === undefined) {
        throw new TypeError(
          `${context} table point ${pointIndex} coordinate ${key} has no declared valid range.`,
        );
      }
      validatePointCoordinateAgainstDomain(
        coordinate,
        axis,
        `${context} table point ${pointIndex} coordinate ${key}`,
      );
    }
    const coordinateIdentity = tableCoordinateIdentity(property, point);
    if (coordinateIdentities.has(coordinateIdentity)) {
      throw new TypeError(
        `${context} contains duplicate full table coordinates at point ${pointIndex}.`,
      );
    }
    coordinateIdentities.add(coordinateIdentity);
  }

  if (property.independentVariables.length === 1) {
    const variable = property.independentVariables[0]!;
    const axis = rangeByVariable.get(variable);
    if (
      axis !== undefined &&
      typeof axis.minimum === "number" &&
      typeof axis.maximum === "number"
    ) {
      if (property.data.points.length < 2) {
        throw new TypeError(
          `${context} single-axis numeric table must contain at least two points.`,
        );
      }
      for (let pointIndex = 1; pointIndex < property.data.points.length; pointIndex += 1) {
        const previous = property.data.points[pointIndex - 1]!.coordinates[variable];
        const current = property.data.points[pointIndex]!.coordinates[variable];
        if (typeof previous !== "number" || typeof current !== "number" || current <= previous) {
          throw new TypeError(
            `${context} single-axis numeric table coordinates must be strictly increasing.`,
          );
        }
      }
    }
  }
}

function validateMaterialRecord(record: MaterialRecord): void {
  assertStableId(record.materialId, "material_id");
  assertNonEmpty(record.revision, `Material ${record.materialId} revision`);
  assertNonEmpty(record.name, `Material ${record.materialId} name`);
  assertNonEmpty(record.gradeOrProduct, `Material ${record.materialId} gradeOrProduct`);
  assertNonEmpty(record.standard, `Material ${record.materialId} standard`);
  assertNonEmpty(record.composition, `Material ${record.materialId} composition`);
  assertNonEmpty(record.condition, `Material ${record.materialId} condition`);
  assertNonEmpty(record.batch, `Material ${record.materialId} batch`);
  assertNonEmpty(record.category, `Material ${record.materialId} category`);
  assertKnownEnum(record.libraryTier, MATERIAL_LIBRARY_TIER_VALUES, `Material ${record.materialId} libraryTier`);
  assertKnownEnum(record.dataQuality, MATERIAL_DATA_QUALITY_VALUES, `Material ${record.materialId} dataQuality`);
  assertKnownEnum(record.approvalStatus, MATERIAL_APPROVAL_STATUS_VALUES, `Material ${record.materialId} approvalStatus`);
  validateApprovalMetadata(
    record.approvedBy,
    record.approvedAt,
    `Material ${record.materialId}`,
  );
  if (
    record.approvalStatus === "approved" &&
    (record.approvedBy === null || record.approvedAt === null)
  ) {
    throw new TypeError(`Material ${record.materialId} approved status requires approval metadata.`);
  }

  const ids = new Set<MaterialPropertyId>();
  const sourceById = new Map<string, MaterialSourceRecord>();
  for (const source of record.sourceRecords) {
    assertStableId(source.sourceId, `Material ${record.materialId} source_id`);
    assertNonEmpty(source.document, `Material ${record.materialId} source ${source.sourceId} document`);
    assertNonEmpty(source.edition, `Material ${record.materialId} source ${source.sourceId} edition`);
    assertKnownEnum(
      source.sourceReviewStatus,
      MATERIAL_SOURCE_REVIEW_STATUS_VALUES,
      `Material ${record.materialId} source ${source.sourceId} sourceReviewStatus`,
    );
    if (sourceById.has(source.sourceId)) {
      throw new TypeError(
        `Material ${record.materialId} contains duplicate source_id: ${source.sourceId}`,
      );
    }
    sourceById.set(source.sourceId, source);
    if (source.fileSha256 !== null) {
      assertSha256(
        source.fileSha256,
        `Material ${record.materialId} source ${source.sourceId}`,
      );
    }
  }
  for (const property of record.propertyRecords) {
    const context = `Material ${record.materialId} property ${property.propertyId}`;
    assertStableId(property.propertyId, `${context} property_id`);
    assertNonEmpty(property.revision, `${context} revision`);
    assertNonEmpty(property.interpolationMethod, `${context} interpolationMethod`);
    assertKnownEnum(property.dataQuality, MATERIAL_DATA_QUALITY_VALUES, `${context} dataQuality`);
    assertKnownEnum(property.approvalStatus, MATERIAL_APPROVAL_STATUS_VALUES, `${context} approvalStatus`);
    assertKnownEnum(
      property.extrapolationPolicy,
      MATERIAL_EXTRAPOLATION_POLICY_VALUES,
      `${context} extrapolationPolicy`,
    );
    if (ids.has(property.propertyId)) {
      throw new TypeError(
        `Material ${record.materialId} contains duplicate property_id: ${property.propertyId}`,
      );
    }
    ids.add(property.propertyId);
    if (!isDimensionId(property.dimension)) {
      throw new TypeError(`${context} uses unknown controlled dimension_id: ${property.dimension}`);
    }
    assertControlledUnitForDimension(property.unitSi, property.dimension, context);
    if (new Set(property.independentVariables).size !== property.independentVariables.length) {
      throw new TypeError(`${context} contains duplicate independent variables.`);
    }
    for (const independentVariable of property.independentVariables) {
      assertKnownEnum(
        independentVariable,
        MATERIAL_INDEPENDENT_VARIABLE_VALUES,
        `${context} independent variable`,
      );
    }
    const rangeVariables = new Set<MaterialIndependentVariable>();
    for (const axis of property.validRange) {
      if (!property.independentVariables.includes(axis.variable)) {
        throw new TypeError(`${context} range declares undeclared variable ${axis.variable}.`);
      }
      if (rangeVariables.has(axis.variable)) {
        throw new TypeError(`${context} contains duplicate range variable ${axis.variable}.`);
      }
      rangeVariables.add(axis.variable);
      validateDomainAxis(axis, context);
    }
    for (const independentVariable of property.independentVariables) {
      if (!rangeVariables.has(independentVariable)) {
        throw new TypeError(
          `${context} independent variable ${independentVariable} has no declared valid range.`,
        );
      }
    }
    validatePropertyData(property, context);
    validateUncertainty(property.uncertainty, property, context);
    validateApprovalMetadata(property.approvedBy, property.approvedAt, context);
    if (
      property.approvalStatus === "approved" &&
      (property.approvedBy === null || property.approvedAt === null)
    ) {
      throw new TypeError(`${context} approved status requires approval metadata.`);
    }
    assertStableId(property.provenance.sourceId, `${context} provenance sourceId`);
    assertNonEmpty(property.provenance.document, `${context} provenance document`);
    assertNonEmpty(property.provenance.edition, `${context} provenance edition`);
    assertNonEmpty(
      property.provenance.pageTableFigureEquation,
      `${context} provenance pageTableFigureEquation`,
    );
    assertNonEmpty(property.provenance.testCondition, `${context} provenance testCondition`);
    assertNonEmpty(property.provenance.surfaceState, `${context} provenance surfaceState`);
    assertKnownEnum(
      property.provenance.sourceReviewStatus,
      MATERIAL_SOURCE_REVIEW_STATUS_VALUES,
      `${context} provenance sourceReviewStatus`,
    );
    if (property.provenance.fileSha256 !== null) {
      assertSha256(
        property.provenance.fileSha256,
        context,
      );
    }
    const source = sourceById.get(property.provenance.sourceId);
    if (source === undefined) {
      throw new TypeError(`${context} references missing source_id ${property.provenance.sourceId}.`);
    }
    if (
      source.document !== property.provenance.document ||
      source.edition !== property.provenance.edition ||
      source.fileSha256 !== property.provenance.fileSha256 ||
      source.sourceReviewStatus !== property.provenance.sourceReviewStatus
    ) {
      throw new TypeError(`${context} provenance does not match its source record.`);
    }
  }
}

function validateReleaseRecord(record: MaterialRecord): void {
  if (record.approvalStatus !== "approved") {
    throw new MaterialReleaseGateError(
      record.materialId,
      "record_not_approved",
    );
  }
  if (record.approvedBy === null || record.approvedAt === null) {
    throw new MaterialReleaseGateError(
      record.materialId,
      "record_approval_metadata_missing",
    );
  }
  if (record.propertyRecords.length === 0) {
    throw new MaterialReleaseGateError(record.materialId, "property_missing");
  }
  for (const property of record.propertyRecords) {
    if (property.approvalStatus !== "approved") {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_not_approved",
        property.propertyId,
      );
    }
    if (property.approvedBy === null || property.approvedAt === null) {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_approval_metadata_missing",
        property.propertyId,
      );
    }
    if (property.provenance.sourceReviewStatus !== "reviewed_pass") {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_source_not_reviewed",
        property.propertyId,
      );
    }
    if (property.provenance.fileSha256 === null) {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_source_hash_missing",
        property.propertyId,
      );
    }
  }
}

/**
 * Data-release support is deliberately narrower than the authoring schema.
 * Passing this gate does not make A-01 executable and does not register an
 * interpolation implementation; it only prevents unsupported data shapes from
 * entering a released material catalog.
 */
function validateReleaseDataSupport(record: MaterialRecord): void {
  for (const property of record.propertyRecords) {
    if (property.data.valueKind === "constant") {
      continue;
    }
    if (property.data.valueKind === "approved_function") {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_function_not_release_registered",
        property.propertyId,
      );
    }

    const variable = property.independentVariables[0];
    const axis = property.validRange[0];
    const isSupportedSingleNumericAxis =
      property.independentVariables.length === 1 &&
      property.validRange.length === 1 &&
      variable !== undefined &&
      axis?.variable === variable &&
      typeof axis.minimum === "number" &&
      typeof axis.maximum === "number" &&
      axis.boundaryPolicy !== "mixed" &&
      property.data.points.every(
        (point) => typeof point.coordinates[variable] === "number",
      );
    if (!isSupportedSingleNumericAxis) {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_table_shape_not_release_supported",
        property.propertyId,
      );
    }
    if (property.interpolationMethod !== "piecewise_linear") {
      throw new MaterialReleaseGateError(
        record.materialId,
        "property_interpolation_not_release_registered",
        property.propertyId,
      );
    }
  }
}

export class MaterialRegistry extends ImmutableRegistry<MaterialId, MaterialRecord> {
  public readonly catalogKind: MaterialCatalogKind;

  public constructor(
    records: Iterable<MaterialRecord>,
    catalogKind: MaterialCatalogKind = "authoring",
  ) {
    assertKnownEnum(catalogKind, MATERIAL_CATALOG_KIND_VALUES, "MaterialRegistry catalogKind");
    // Capture one immutable plain-data view before any semantic read. This
    // prevents an accessor or stateful Proxy from presenting one value to the
    // release/schema validators and another value to the registry clone.
    const materialized: MaterialRecord[] = [];
    for (const candidate of records) {
      const record = cloneAndDeepFreeze(candidate);
      if (catalogKind === "release") {
        validateReleaseRecord(record);
      }
      validateMaterialRecord(record);
      if (catalogKind === "release") {
        validateReleaseDataSupport(record);
      }
      materialized.push(record);
    }
    super(materialized, {
      registryName: `MaterialRegistry:${catalogKind}`,
      idOf: (record) => record.materialId,
    });
    this.catalogKind = catalogKind;
    Object.freeze(this);
  }

  public byTier(tier: MaterialLibraryTier): readonly MaterialRecord[] {
    return Object.freeze(
      this.values().filter((record) => record.libraryTier === tier),
    );
  }

  public releasedPresets(): readonly MaterialRecord[] {
    if (this.catalogKind !== "release") {
      return Object.freeze([]);
    }
    return this.byTier("preset_common");
  }
}
