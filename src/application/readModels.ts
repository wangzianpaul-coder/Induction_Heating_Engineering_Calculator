import { VERSION_INFO } from "../config/versions.js";
import type { MethodId, ParameterId } from "../domain/ids.js";
import type { SnapshotId } from "../domain/ids.js";
import type { CaseSnapshotPayload } from "../domain/snapshot.js";
import { RELEASED_MATERIAL_RECORDS } from "../registries/materialCatalog.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import {
  METHOD_SPECIFICATION_REGISTRY,
  type EngineeringModuleId,
  type MethodApprovalStatus,
  type MethodScientificConfidence,
  type RecommendationEligibility,
  type RegistryLifecycleStatus,
  type RegistryMethodType,
} from "../registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "../registries/parameterCatalog.js";
import type {
  ParameterDefault,
  ParameterDimension,
  ParameterRequirement,
  ParameterRole,
} from "../registries/parameterRegistry.js";
import {
  parseCaseFile,
  serializeCaseFile,
  type CaseImportFailureCode,
} from "../serialization/case-file.js";
import { DIMENSION_DEFINITIONS } from "../units/dimensions.js";
import type { DimensionId, UnitId } from "../units/ids.js";
import { getUnitDefinition } from "../units/registry.js";
import { MVP_RUNNABLE_METHOD_DEFINITIONS } from "./mvpWorkspace.js";

export type MethodRuntimeBlockReason =
  | "deferred"
  | "not_approved"
  | "requires_submethod_split"
  | "implementation_unavailable"
  | "execution_disabled";

export interface MethodReadinessRow {
  readonly methodId: MethodId;
  readonly methodVersion: string;
  readonly moduleId: EngineeringModuleId;
  readonly engineeringName: { readonly en: string; readonly zh: string };
  readonly purpose: string;
  readonly methodType: RegistryMethodType | null;
  readonly approvalStatus: MethodApprovalStatus;
  readonly lifecycleStatus: RegistryLifecycleStatus;
  readonly scientificConfidence: MethodScientificConfidence | null;
  readonly recommendationEligibility: RecommendationEligibility;
  readonly requiresSubmethodSplit: boolean;
  readonly implementationAvailable: boolean;
  readonly runtimeExecutable: boolean;
  readonly runtimeBlockReason: MethodRuntimeBlockReason | null;
  readonly inputParameterIds: readonly string[];
  readonly outputQuantityIds: readonly string[];
}

function runtimeBlockReason(
  specification: ReturnType<typeof METHOD_SPECIFICATION_REGISTRY.values>[number],
): MethodRuntimeBlockReason | null {
  if (specification.approvalStatus === "deferred") return "deferred";
  if (
    specification.approvalStatus !== "approved" &&
    specification.approvalStatus !== "approved_with_limitation"
  ) return "not_approved";
  if (specification.requiresSubmethodSplit) return "requires_submethod_split";
  if (!specification.implementationAvailable) return "implementation_unavailable";
  if (!specification.executable) return "execution_disabled";
  return null;
}

export const METHOD_READINESS_ROWS: readonly MethodReadinessRow[] = cloneAndDeepFreeze(
  METHOD_SPECIFICATION_REGISTRY.values().map((specification) => {
    const reason = runtimeBlockReason(specification);
    const runtimeExecutable = METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(
      specification.methodId,
    );
    if (runtimeExecutable !== (reason === null)) {
      throw new Error(`Method readiness mismatch for ${specification.methodId}.`);
    }
    return {
      methodId: specification.methodId,
      methodVersion: specification.methodVersion,
      moduleId: specification.moduleId,
      engineeringName: specification.engineeringName,
      purpose: specification.purpose,
      methodType: specification.methodType,
      approvalStatus: specification.approvalStatus,
      lifecycleStatus: specification.lifecycleStatus,
      scientificConfidence: specification.scientificConfidence,
      recommendationEligibility: specification.recommendationEligibility,
      requiresSubmethodSplit: specification.requiresSubmethodSplit,
      implementationAvailable: specification.implementationAvailable,
      runtimeExecutable,
      runtimeBlockReason: reason,
      inputParameterIds: specification.inputParameterIds,
      outputQuantityIds: specification.outputQuantityIds,
    };
  }),
);

export const METHOD_READINESS_SUMMARY = cloneAndDeepFreeze({
  specificationCount: METHOD_READINESS_ROWS.length,
  runtimeExecutableCount: METHOD_READINESS_ROWS.filter((row) => row.runtimeExecutable).length,
  blockedCount: METHOD_READINESS_ROWS.filter((row) => !row.runtimeExecutable).length,
});

export interface UnitDefinitionRow {
  readonly unitId: UnitId;
  readonly symbol: string;
  readonly dimensionIds: readonly DimensionId[];
  readonly conversionKind: "linear" | "affine";
  readonly isCanonical: boolean;
}

export interface ConsumingMethodRow {
  readonly methodId: MethodId;
  readonly moduleId: EngineeringModuleId;
  readonly engineeringName: { readonly en: string; readonly zh: string };
  readonly runtimeExecutable: boolean;
}

export interface ControlledDerivationRow {
  readonly scope: "metadata_only";
  readonly executionAvailable: false;
  readonly kind: ParameterDefault["kind"];
  readonly sourceParameterIds: readonly ParameterId[];
  readonly derivationMethodId: MethodId;
  readonly sourceRefs: readonly string[];
  readonly warningPredicateRefs: readonly string[];
}

export interface ParameterDefinitionRow {
  readonly parameterId: ParameterId;
  readonly symbol: string;
  readonly engineeringName: { readonly en: string; readonly zh: string };
  readonly definition: string;
  readonly help: string;
  readonly ownerModule: EngineeringModuleId;
  readonly dimension: ParameterDimension;
  readonly dimensionName: string;
  readonly canonicalUnit: UnitDefinitionRow;
  readonly allowedDisplayUnits: readonly UnitDefinitionRow[];
  readonly role: ParameterRole;
  readonly requirement: ParameterRequirement;
  readonly physicalRange: string;
  readonly applicability: string;
  readonly definitionSourceRefs: readonly string[];
  readonly controlledDerivation: ControlledDerivationRow | null;
  /** Explicit consumers from the parameter registry; never inferred from method outputs. */
  readonly consumingMethods: readonly ConsumingMethodRow[];
}

function unitRow(unitId: UnitId): UnitDefinitionRow {
  const definition = getUnitDefinition(unitId);
  return {
    unitId: definition.id,
    symbol: definition.symbol,
    dimensionIds: definition.dimensionIds,
    conversionKind: definition.conversionKind,
    isCanonical: definition.isCanonical,
  };
}

const methodRowsById = new Map(METHOD_READINESS_ROWS.map((row) => [row.methodId, row]));

export const PARAMETER_DEFINITION_ROWS: readonly ParameterDefinitionRow[] = cloneAndDeepFreeze(
  PARAMETER_REGISTRY.values().map((record) => ({
    parameterId: record.parameterId,
    symbol: record.symbol,
    engineeringName: record.engineeringName,
    definition: record.definition,
    help: record.help,
    ownerModule: record.ownerModule,
    dimension: record.dimension,
    dimensionName: DIMENSION_DEFINITIONS[record.dimension].name,
    canonicalUnit: unitRow(record.canonicalUnit),
    allowedDisplayUnits: record.allowedDisplayUnits.map(unitRow),
    role: record.role,
    requirement: record.requirement,
    physicalRange: record.physicalRange,
    applicability: record.applicability,
    definitionSourceRefs: record.definitionSourceRefs,
    controlledDerivation: record.default === null
      ? null
      : {
          scope: "metadata_only",
          executionAvailable: false,
          kind: record.default.kind,
          sourceParameterIds: record.default.sourceParameterIds,
          derivationMethodId: record.default.derivationMethodId,
          sourceRefs: record.default.sourceRefs,
          warningPredicateRefs: record.default.warningPredicateRefs,
        },
    consumingMethods: record.consumingMethods.map((methodId) => {
      const method = methodRowsById.get(methodId);
      if (method === undefined) {
        throw new Error(`Parameter ${record.parameterId} references unknown method ${methodId}.`);
      }
      return {
        methodId: method.methodId,
        moduleId: method.moduleId,
        engineeringName: method.engineeringName,
        runtimeExecutable: method.runtimeExecutable,
      };
    }),
  })),
);

export interface ParameterDefinitionFilters {
  readonly search?: string;
  readonly ownerModule?: EngineeringModuleId;
  readonly dimension?: ParameterDimension;
  readonly role?: ParameterRole;
  readonly requirement?: ParameterRequirement;
  readonly consumingMethodId?: MethodId;
  readonly hasControlledDerivation?: boolean;
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").trim();
}

function canonicalSearchText(row: ParameterDefinitionRow): string {
  return normalizeSearch([
    row.parameterId,
    row.symbol,
    row.engineeringName.en,
    row.engineeringName.zh,
    row.definition,
    row.help,
    row.ownerModule,
    row.dimension,
    row.dimensionName,
    row.canonicalUnit.unitId,
    row.canonicalUnit.symbol,
    ...row.allowedDisplayUnits.flatMap((unit) => [unit.unitId, unit.symbol]),
    row.role,
    row.requirement,
    row.physicalRange,
    row.applicability,
    ...row.definitionSourceRefs,
    ...row.consumingMethods.flatMap((method) => [
      method.methodId,
      method.engineeringName.en,
      method.engineeringName.zh,
    ]),
  ].join("\n"));
}

const parameterSearchText = new Map(
  PARAMETER_DEFINITION_ROWS.map((row) => [row.parameterId, canonicalSearchText(row)]),
);

/** Search covers canonical metadata and explicit joins; migration aliases are omitted by design. */
export function queryParameterDefinitionRows(
  filters: ParameterDefinitionFilters = {},
): readonly ParameterDefinitionRow[] {
  const search = filters.search === undefined ? "" : normalizeSearch(filters.search);
  return Object.freeze(PARAMETER_DEFINITION_ROWS.filter((row) =>
    (search.length === 0 || parameterSearchText.get(row.parameterId)?.includes(search) === true) &&
    (filters.ownerModule === undefined || row.ownerModule === filters.ownerModule) &&
    (filters.dimension === undefined || row.dimension === filters.dimension) &&
    (filters.role === undefined || row.role === filters.role) &&
    (filters.requirement === undefined || row.requirement === filters.requirement) &&
    (filters.consumingMethodId === undefined ||
      row.consumingMethods.some((method) => method.methodId === filters.consumingMethodId)) &&
    (filters.hasControlledDerivation === undefined ||
      (row.controlledDerivation !== null) === filters.hasControlledDerivation)
  ));
}

export const APPLICATION_READINESS = cloneAndDeepFreeze({
  versions: VERSION_INFO,
  counts: {
    parameterDefinitions: PARAMETER_DEFINITION_ROWS.length,
    controlledDerivations: PARAMETER_DEFINITION_ROWS.filter(
      (row) => row.controlledDerivation !== null,
    ).length,
    methodSpecifications: METHOD_READINESS_SUMMARY.specificationCount,
    runtimeExecutableMethods: METHOD_READINESS_SUMMARY.runtimeExecutableCount,
    runnableMvpAdapters: MVP_RUNNABLE_METHOD_DEFINITIONS.length,
    releasedMaterials: RELEASED_MATERIAL_RECORDS.length,
  },
  builds: [
    {
      buildKind: "phase5-ui-standard-static",
      currentArtifactScope: "phase_5b_runnable_mvp_ui",
      phase5UiTarget: "static_web_product_ui",
      phase5UiTargetReadiness: "automated_artifact_gate_verified",
      reason: "The Standard Runnable MVP manifest, hashes, local assets, and offline/runtime policy pass the automated artifact gate; final Phase-7 product acceptance remains pending.",
    },
    {
      buildKind: "phase5-ui-portable-offline",
      currentArtifactScope: "phase_5b_runnable_mvp_ui",
      phase5UiTarget: "file_scheme_product_ui",
      phase5UiTargetReadiness: "automated_artifact_gate_verified",
      reason: "The Portable Runnable MVP classic-IIFE artifact passes the automated hash/offline gate; clean-PC and final Phase-7 acceptance remain pending.",
    },
  ],
  capabilities: {
    parameterDefinitions: { status: "available", reason: "67 frozen canonical parameter records are available read-only." },
    methodReadiness: { status: "available", reason: "52 frozen method specifications are visible; eight reviewed narrow routes are callable through the controlled MVP adapter while formal registry activation remains unchanged." },
    releasedMaterials: { status: "insufficient_data", reason: "The released material catalog is empty." },
    currentCaseInspection: { status: "available", reason: "Current-version case JSON can be validated, inspected, and canonically re-exported." },
    caseCreation: { status: "available", reason: "The Runnable MVP creates a current-version canonical CaseFile with an exact controlled provenance marker." },
    caseEditing: { status: "available", reason: "Runnable MVP inputs can be edited locally and re-saved as a new content-addressed case snapshot." },
    caseMigration: { status: "blocked", reason: "No case migration adapter is activated." },
    resultProduction: { status: "available", reason: "Six reviewed isolated evaluators are callable through the Phase-5B controlled MVP adapter; this is not formal registry runtime activation." },
    materialComparison: { status: "blocked", reason: "The released material catalog is empty and no runtime comparison workflow is activated." },
    geometry3d: { status: "blocked", reason: "The Phase-6 parametric 3D snapshot adapter and viewer are not activated." },
    calculationTrace: { status: "blocked", reason: "The MVP returns normalized method results, but no formal CalculationResult trace adapter is activated." },
    engineeringReport: { status: "blocked", reason: "No formal CalculationResult, trace, or engineering-report adapter is activated." },
  },
});

export interface CurrentCaseSummary {
  readonly caseId: string;
  readonly caseName: string;
  readonly snapshotId: SnapshotId;
  readonly createdAt: string;
  readonly schemaVersion: string;
  readonly technicalFreezeId: string;
  readonly versions: CaseSnapshotPayload["versions"];
  readonly counts: {
    readonly geometryQuantities: number;
    readonly materials: number;
    readonly operatingConditions: number;
    readonly methodSelections: number;
    readonly userInputs: number;
    readonly measurementOverrides: number;
    readonly femReferences: number;
    readonly attachments: number;
  };
  readonly materialIds: readonly string[];
  readonly selectedMethodIds: readonly string[];
}

export type CurrentCaseInspectionResult =
  | {
      readonly status: "success";
      readonly summary: CurrentCaseSummary;
      readonly canonicalReexport: string;
    }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: CaseImportFailureCode;
      readonly message: string;
    };

/** Current-version, read-only import boundary. It creates no case and performs no migration. */
export function inspectCurrentCaseFile(text: string): CurrentCaseInspectionResult {
  const imported = parseCaseFile(text);
  if (imported.status !== "success") {
    return cloneAndDeepFreeze(imported);
  }
  const snapshot = imported.caseFile.caseSnapshot;
  const payload = snapshot.payload;
  return cloneAndDeepFreeze({
    status: "success",
    summary: {
      caseId: payload.caseId,
      caseName: payload.caseName,
      snapshotId: snapshot.snapshotId,
      createdAt: snapshot.createdAt,
      schemaVersion: imported.caseFile.schemaVersion,
      technicalFreezeId: imported.caseFile.technicalFreezeId,
      versions: payload.versions,
      counts: {
        geometryQuantities: payload.geometry.payload.quantities.length,
        materials: payload.materials.length,
        operatingConditions: payload.operatingConditions.length,
        methodSelections: payload.methodSelections.length,
        userInputs: payload.userInputs.length,
        measurementOverrides: payload.measurementOverrides.length,
        femReferences: payload.femReferenceIds.length,
        attachments: payload.attachmentHashes.length,
      },
      materialIds: payload.materials.map((material) => material.payload.materialId),
      selectedMethodIds: payload.methodSelections.map((selection) => selection.methodId),
    },
    canonicalReexport: serializeCaseFile(imported.caseFile, false),
  });
}
