import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import {
  deepFreeze,
  fingerprint,
  type ContentFingerprint,
  type JsonValue,
} from "../serialization/canonical-json.js";
import type { SnapshotId } from "./ids.js";
import { contentAddressedSnapshotId } from "./ids.js";
import type { Quantity } from "./quantity.js";
import type { DataQuality } from "./status.js";

export type SnapshotKind = "geometry" | "material" | "case";

export interface ImmutableSnapshot<
  TKind extends SnapshotKind,
  TPayload extends object,
> {
  readonly snapshotId: SnapshotId;
  readonly kind: TKind;
  readonly schemaVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly createdAt: string;
  readonly fingerprint: ContentFingerprint;
  readonly payload: Readonly<TPayload>;
}

/** Case exchange uses the same explicit known/unavailable quantity union as the core. */
export type SerializedQuantity = Quantity;

export interface GeometrySnapshotPayload {
  readonly geometrySchemaVersion: string;
  readonly geometryMappingId: string;
  readonly quantities: readonly SerializedQuantity[];
  readonly assumptions: readonly string[];
}

export interface MaterialPropertySnapshot {
  readonly propertyId: string;
  readonly value: SerializedQuantity;
  readonly state: Readonly<Record<string, JsonValue>>;
  readonly dataQuality: DataQuality;
  readonly sourceRefs: readonly string[];
  readonly interpolation: JsonValue;
  readonly extrapolation: JsonValue;
}

export interface MaterialSnapshotPayload {
  readonly materialId: string;
  readonly revision: string;
  readonly libraryTier: "preset_common" | "project_material" | "user_defined";
  readonly approvalStatus: string;
  readonly properties: readonly MaterialPropertySnapshot[];
}

/**
 * Serializable method selection stored in a case. A selection is a request to
 * use a frozen method specification; it is not evidence that an implementation
 * is available or that the method is applicable to a particular input state.
 */
export interface MethodSelectionSnapshot {
  readonly methodId: string;
  readonly methodVersion: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
}

export interface CaseSnapshotPayload {
  readonly caseId: string;
  readonly caseName: string;
  readonly versions: {
    readonly application: string;
    readonly calculationModel: string;
    readonly materialDatabase: string;
    readonly caseSchema: string;
    readonly resultSchema: string;
    readonly geometrySchema: string;
    readonly materialSchema: string;
    readonly unitRegistry: string;
    readonly parameterRegistry: string;
    readonly methodRegistry: string;
    readonly warningRules: string;
    readonly decisionBaseline: string;
    readonly calculationBasis: string;
    readonly calculationContracts: string;
    readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  };
  readonly geometry: ImmutableSnapshot<"geometry", GeometrySnapshotPayload>;
  readonly materials: readonly ImmutableSnapshot<"material", MaterialSnapshotPayload>[];
  readonly operatingConditions: readonly SerializedQuantity[];
  readonly topology: JsonValue;
  readonly phasorConvention: JsonValue;
  readonly methodSelections: readonly MethodSelectionSnapshot[];
  readonly measurementOverrides: readonly JsonValue[];
  readonly femReferenceIds: readonly string[];
  readonly attachmentHashes: readonly ContentFingerprint[];
  readonly userInputs: readonly SerializedQuantity[];
  readonly displayUnits: Readonly<Record<string, string>>;
  readonly explicitOverrides: readonly JsonValue[];
  readonly warningAcknowledgements: readonly JsonValue[];
  readonly solverSettings: Readonly<Record<string, JsonValue>>;
  readonly provenance: readonly JsonValue[];
  readonly migration: {
    readonly sourceSchemaVersion: string;
    readonly appliedMigrationIds: readonly string[];
  };
}

function isoTimestamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Snapshot createdAt must be a valid ISO timestamp.");
  }
  return date.toISOString();
}

export function createSnapshot<
  const TKind extends SnapshotKind,
  const TPayload extends object,
>(input: {
  readonly kind: TKind;
  readonly schemaVersion: string;
  readonly createdAt: string | Date;
  readonly payload: TPayload;
}): ImmutableSnapshot<TKind, TPayload> {
  const content = {
    kind: input.kind,
    schemaVersion: input.schemaVersion,
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    payload: input.payload,
  };
  const contentFingerprint = fingerprint(content);

  return deepFreeze({
    snapshotId: contentAddressedSnapshotId(
      `${input.kind}:${contentFingerprint.value}`,
      input.kind,
    ),
    kind: input.kind,
    schemaVersion: input.schemaVersion,
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    createdAt: isoTimestamp(input.createdAt),
    fingerprint: contentFingerprint,
    payload: input.payload,
  }) as ImmutableSnapshot<TKind, TPayload>;
}

export function createGeometrySnapshot(
  payload: GeometrySnapshotPayload,
  createdAt: string | Date,
): ImmutableSnapshot<"geometry", GeometrySnapshotPayload> {
  return createSnapshot({
    kind: "geometry",
    schemaVersion: VERSION_INFO.geometrySchema,
    createdAt,
    payload,
  });
}

export function createMaterialSnapshot(
  payload: MaterialSnapshotPayload,
  createdAt: string | Date,
): ImmutableSnapshot<"material", MaterialSnapshotPayload> {
  return createSnapshot({
    kind: "material",
    schemaVersion: VERSION_INFO.materialSchema,
    createdAt,
    payload,
  });
}

export function createCaseSnapshot(
  payload: Omit<CaseSnapshotPayload, "versions">,
  createdAt: string | Date,
): ImmutableSnapshot<"case", CaseSnapshotPayload> {
  return createSnapshot({
    kind: "case",
    schemaVersion: VERSION_INFO.caseSchema,
    createdAt,
    payload: {
      ...payload,
      versions: {
        application: VERSION_INFO.application,
        calculationModel: VERSION_INFO.calculationModel,
        materialDatabase: VERSION_INFO.materialDatabase,
        caseSchema: VERSION_INFO.caseSchema,
        resultSchema: VERSION_INFO.resultSchema,
        geometrySchema: VERSION_INFO.geometrySchema,
        materialSchema: VERSION_INFO.materialSchema,
        unitRegistry: VERSION_INFO.unitRegistry,
        parameterRegistry: VERSION_INFO.parameterRegistry,
        methodRegistry: VERSION_INFO.methodRegistry,
        warningRules: VERSION_INFO.warningRules,
        decisionBaseline: VERSION_INFO.decisionBaseline,
        calculationBasis: VERSION_INFO.calculationBasis,
        calculationContracts: VERSION_INFO.calculationContracts,
        technicalFreezeId: TECHNICAL_FREEZE_ID,
      },
    },
  });
}
