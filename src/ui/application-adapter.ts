import {
  APPLICATION_READINESS,
  BASIC_CALCULATOR_SCHEMA_VERSION,
  LEGACY_BASIC_CALCULATOR_SCHEMA_VERSION,
  LEGACY_BASIC_DEFAULT_INPUT,
  LEGACY_NAGAOKA_TABLE,
  METHOD_READINESS_ROWS,
  MVP_RUNNABLE_METHOD_DEFINITIONS,
  PARAMETER_DEFINITION_ROWS,
  calculateMvpWorkspace,
  calculateBasicCalculator,
  calculateLegacyBasicCalculator,
  legacyNagaokaMicroH,
  legacyTableLookupKn,
  buildVisualizationSceneFromMechanicalInput,
  inspectCurrentCaseFile,
  loadCaseVisualizationScene,
  loadMvpWorkspace,
  saveMvpWorkspace,
  type CurrentCaseSummary,
  type MethodReadinessRow,
  type ParameterDefinitionRow,
} from "../application/public-api.js";

import type {
  EngineeringUiApplication,
  UiCapability,
  UiCaseField,
  UiCaseImportResult,
  UiMethodRecord,
  UiParameterRecord,
  UiVersionItem,
} from "./ui-model.js";

function words(value: string): string {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function title(value: string): string {
  return words(value).replaceAll(/\b\w/g, (character) => character.toLocaleUpperCase("en-US"));
}

function parameterRow(row: ParameterDefinitionRow): UiParameterRecord {
  const derivation = row.controlledDerivation;
  return {
    id: row.parameterId,
    symbol: row.symbol,
    name: row.engineeringName.en,
    localizedName: row.engineeringName.zh,
    module: row.ownerModule,
    dimension: row.dimensionName,
    canonicalUnit: row.canonicalUnit.symbol,
    displayUnits: row.allowedDisplayUnits.map((unit) => `${unit.symbol} [${unit.unitId}]`),
    role: row.role,
    requirement: row.requirement,
    physicalRange: row.physicalRange,
    applicability: row.applicability,
    definition: row.definition,
    help: row.help,
    consumingMethods: row.consumingMethods.map((method) => method.methodId),
    sourceReferences: row.definitionSourceRefs,
    defaultPolicy: derivation === null
      ? "No controlled derivation is declared."
      : `Metadata-only ${words(derivation.kind)} through ${derivation.derivationMethodId}; execution is unavailable.`,
  };
}

function methodRow(row: MethodReadinessRow): UiMethodRecord {
  return {
    id: row.methodId,
    methodVersion: row.methodVersion,
    name: row.engineeringName.en,
    localizedName: row.engineeringName.zh,
    purpose: row.purpose,
    module: row.moduleId,
    methodType: row.methodType ?? "not resolved before submethod split",
    approvalStatus: row.approvalStatus,
    lifecycleStatus: row.lifecycleStatus,
    executionStatus: row.runtimeExecutable ? "runtime executable" : "release gated",
    executionEnabled: row.runtimeExecutable,
    executionReason: row.runtimeBlockReason === null
      ? "The application boundary reports this method as runtime executable."
      : `Runtime blocked: ${words(row.runtimeBlockReason)}.`,
    scientificConfidence: row.scientificConfidence ?? "not normalized",
    recommendation: row.recommendationEligibility ?? "not defined",
    requiresSubmethodSplit: row.requiresSubmethodSplit,
    implementationAvailable: row.implementationAvailable,
    inputs: row.inputParameterIds,
    outputs: row.outputQuantityIds,
  };
}

function versionRows(): readonly UiVersionItem[] {
  return Object.entries(APPLICATION_READINESS.versions).map(([id, value]) => ({
    id,
    label: title(id),
    value,
  }));
}

function capability(
  id: string,
  label: string,
  source: { readonly status: string; readonly reason: string },
): UiCapability {
  return { id, label, available: source.status === "available", reason: source.reason };
}

function capabilityRows(): readonly UiCapability[] {
  const capabilities = APPLICATION_READINESS.capabilities;
  return [
    capability("parameters", "Parameters", capabilities.parameterDefinitions),
    capability("method-readiness", "Method Readiness", capabilities.methodReadiness),
    capability("case-inspector", "Case Inspector", capabilities.currentCaseInspection),
    capability("results", "Results", capabilities.resultProduction),
    capability("material-comparison", "Material Comparison", capabilities.materialComparison),
    capability("geometry-3d", "3D", capabilities.geometry3d),
    capability("calculation-trace", "Trace", capabilities.calculationTrace),
    capability("engineering-report", "Engineering Report", capabilities.engineeringReport),
  ];
}

function summaryFields(summary: CurrentCaseSummary): readonly UiCaseField[] {
  const fields: UiCaseField[] = [
    { label: "Case name", value: summary.caseName },
    { label: "Created at", value: summary.createdAt },
    { label: "Case schema", value: summary.schemaVersion },
    { label: "Technical freeze", value: summary.technicalFreezeId },
    { label: "Geometry quantities", value: String(summary.counts.geometryQuantities) },
    { label: "Material snapshots", value: String(summary.counts.materials) },
    { label: "Operating conditions", value: String(summary.counts.operatingConditions) },
    { label: "Method selections", value: String(summary.counts.methodSelections) },
    { label: "User inputs", value: String(summary.counts.userInputs) },
    { label: "Measurement overrides", value: String(summary.counts.measurementOverrides) },
    { label: "FEM references", value: String(summary.counts.femReferences) },
    { label: "Attachments", value: String(summary.counts.attachments) },
    { label: "Material IDs", value: summary.materialIds.length === 0 ? "None" : summary.materialIds.join(", ") },
    { label: "Selected method IDs", value: summary.selectedMethodIds.length === 0 ? "None" : summary.selectedMethodIds.join(", ") },
  ];
  for (const [id, value] of Object.entries(summary.versions)) {
    fields.push({ label: `Version · ${title(id)}`, value });
  }
  return fields;
}

function inspectCaseJson(text: string): UiCaseImportResult {
  const result = inspectCurrentCaseFile(text);
  if (result.status !== "success") {
    return result;
  }
  return {
    status: "success",
    inspection: {
      caseId: result.summary.caseId,
      snapshotId: result.summary.snapshotId,
      fields: summaryFields(result.summary),
    },
    validatedJson: result.canonicalReexport,
  };
}

export const ENGINEERING_UI_APPLICATION: EngineeringUiApplication = {
  reference: {
    productName: "Induction Heating Engineering Calculator",
    productShortName: "IH Engineering Calculator",
    phaseLabel: "Version 0.9 controlled application workspace",
    technicalFreezeId: APPLICATION_READINESS.versions.technicalFreezeId,
    parameters: PARAMETER_DEFINITION_ROWS.map(parameterRow),
    methods: METHOD_READINESS_ROWS.map(methodRow),
    capabilities: capabilityRows(),
    versions: versionRows(),
  },
  basic: {
    schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
    calculate: calculateBasicCalculator,
  },
  basicMatching: {
    schemaVersion: LEGACY_BASIC_CALCULATOR_SCHEMA_VERSION,
    defaultInput: LEGACY_BASIC_DEFAULT_INPUT,
    nagaokaTable: LEGACY_NAGAOKA_TABLE,
    calculate: calculateLegacyBasicCalculator,
    lookupKn: legacyTableLookupKn,
    nagaokaMicroH: legacyNagaokaMicroH,
  },
  visualization: {
    buildFromMechanicalInput: buildVisualizationSceneFromMechanicalInput,
    loadCase: loadCaseVisualizationScene,
  },
  mvp: {
    methods: MVP_RUNNABLE_METHOD_DEFINITIONS,
    calculate: calculateMvpWorkspace,
    save: saveMvpWorkspace,
    load: loadMvpWorkspace,
  },
  inspectCaseJson,
};
