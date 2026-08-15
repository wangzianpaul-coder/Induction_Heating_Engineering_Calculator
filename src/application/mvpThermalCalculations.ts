/**
 * Narrow Phase-5B thermal/cooling calculation adapters.
 *
 * These adapters do not change the frozen method registry. They expose only
 * two explicitly allowlisted routes and mechanically delegate all engineering
 * arithmetic and method-domain validation to the existing H-01/H-03
 * evaluators. The application layer supplies binding evidence and converts the
 * controlled outcomes into a small, UI-oriented result envelope.
 */

import type { DataQuality } from "../domain/status.js";
import {
  H01_CONTRACT_SOURCE_REFS,
  H01_DERIVATION_REFS,
  H01_METHOD_CHECK_IDS,
  H01_METHOD_ID,
  H01_METHOD_VERSION,
  H01_SOURCE_REFS,
  H01_VALIDATION_CASE_IDS,
  evaluateH01CoolingHeatLoad,
} from "../methods/H/h01CoolingHeatLoad.js";
import {
  H03_CONTRACT_SOURCE_REFS,
  H03_DERIVATION_REFS,
  H03_METHOD_CHECK_IDS,
  H03_METHOD_ID,
  H03_METHOD_VERSION,
  H03_SOURCE_REFS,
  H03_VALIDATION_CASE_IDS,
  evaluateH03BranchFlowGeometry,
} from "../methods/H/h03BranchFlowGeometry.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";

export const MVP_THERMAL_METHOD_ALLOWLIST = Object.freeze([
  H01_METHOD_ID,
  H03_METHOD_ID,
] as const);

export type MvpThermalMethodId =
  (typeof MVP_THERMAL_METHOD_ALLOWLIST)[number];

export type MvpThermalCalculationStatus =
  | "success"
  | "invalid_input"
  | "insufficient_data"
  | "not_applicable";

export interface MvpThermalOutput {
  readonly outputId: string;
  readonly parameterId: string | null;
  readonly valueSi: number;
  readonly dimensionId: string;
  readonly canonicalUnitId: string;
  readonly interpretation: string;
}

export interface MvpThermalWarning {
  readonly sourceMethodId: MvpThermalMethodId;
  /** Frozen method warning predicate; this adapter never invents warning IDs. */
  readonly predicate: string;
  readonly message: string;
}

export interface MvpThermalSourceSummary {
  readonly sourceRefs: readonly string[];
  readonly contractSourceRefs: readonly string[];
  readonly derivationRefs: readonly string[];
  readonly validationCaseIds: readonly string[];
  readonly methodCheckIds: readonly string[];
}

export interface MvpThermalApplicabilitySummary {
  readonly status: "in_domain" | "not_evaluated" | "out_of_domain";
  readonly scope: string;
  readonly checks: readonly string[];
  readonly limitations: readonly string[];
}

export interface MvpThermalFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpThermalCalculationResult {
  readonly methodId: MvpThermalMethodId | null;
  readonly methodVersion: string | null;
  readonly methodApproval: "approved" | null;
  readonly status: MvpThermalCalculationStatus;
  readonly outputs: readonly MvpThermalOutput[];
  readonly warnings: readonly MvpThermalWarning[];
  readonly assumptions: readonly string[];
  readonly sources: MvpThermalSourceSummary;
  readonly applicability: MvpThermalApplicabilitySummary;
  readonly failure: MvpThermalFailure | null;
}

export type MvpH01TermSourceMethod =
  | "measurement"
  | "analytical_estimate"
  | "fem";

interface MvpH01TermProvenance {
  readonly sourceMethod: MvpH01TermSourceMethod;
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly heatPathId: string;
  readonly physicalHeatSourceId: string;
}

export interface MvpH01KnownHeatTermInput extends MvpH01TermProvenance {
  readonly disposition: "known_applicable";
  readonly valueW: number;
}

export interface MvpH01NotApplicableHeatTermInput
  extends MvpH01TermProvenance {
  readonly disposition: "source_confirmed_not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type MvpH01HeatTermInput =
  | MvpH01KnownHeatTermInput
  | MvpH01NotApplicableHeatTermInput;

export interface MvpH01ControlVolumeInput {
  readonly controlVolumeId: string;
  readonly coolantCircuitId: string;
  readonly caseSnapshotId: string;
  readonly timeBasisId: string;
  readonly singleDeclaredCircuitConfirmed: true;
  readonly boundaryCompleteConfirmed: true;
  readonly forbiddenHeatClassesExcludedConfirmed: true;
  readonly multiCircuitAggregationAbsentConfirmed: true;
}

export interface MvpH01CoolingHeatLoadInput {
  readonly methodId: "H-01";
  readonly controlVolume: MvpH01ControlVolumeInput;
  readonly copperLoss: MvpH01HeatTermInput;
  readonly externalHeatPickupToCoil: MvpH01HeatTermInput;
  readonly magneticMaterialLoss: MvpH01HeatTermInput;
  readonly otherCooledLoads: readonly MvpH01HeatTermInput[];
  readonly otherLoadsEnumerationComplete: true;
  readonly otherLoadsEnumerationSourceRef: string;
  readonly pairwiseDisjointPathsConfirmed: true;
  readonly physicalSourceIdentityChecked: true;
  readonly overlapAssessmentSourceRef: string;
  readonly designMarginStatus: "not_requested";
}

export interface MvpH03BindingInput {
  readonly caseSnapshotId: string;
  readonly coolantNetworkId: string;
  readonly branchId: string;
  readonly timeBasisId: string;
}

export interface MvpH03ExplicitBranchFlowInput {
  readonly volumeFlowM3PerS: number;
  readonly oneDeclaredBranchConfirmed: true;
  readonly sourceMethod: "measurement" | "case_input";
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
}

export interface MvpH03D02GeometryInput {
  readonly flowAreaM2: number;
  readonly wettedPerimeterM: number;
  readonly sourceMethodId: "D-02";
  readonly verifiedD02Snapshot: true;
  readonly sameD02HydraulicGeometryConfirmed: true;
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly hydraulicGeometryId: string;
}

export interface MvpH03BranchFlowGeometryInput {
  readonly methodId: "H-03";
  readonly binding: MvpH03BindingInput;
  readonly explicitBranchFlow: MvpH03ExplicitBranchFlowInput;
  readonly d02Geometry: MvpH03D02GeometryInput;
}

export type MvpThermalCalculationInput =
  | MvpH01CoolingHeatLoadInput
  | MvpH03BranchFlowGeometryInput;

const EMPTY = Object.freeze([]) as readonly [];

const H01_SCOPE =
  "one explicitly declared coil-coolant circuit with resolved, non-overlapping heat-source paths";
const H03_SCOPE =
  "one explicit branch volume flow and one verified D-02 hydraulic-geometry snapshot";

const H01_LIMITATIONS = Object.freeze([
  "Design-margin arithmetic is not frozen; this MVP route accepts not_requested only.",
  "Unknown applicable heat sources are not replaced by zero.",
  "Useful workpiece heat, ambient loss, reactive power, and plant-wide loss are outside this coolant control volume.",
] as const);

const H03_LIMITATIONS = Object.freeze([
  "Equal-split total-flow routing is outside this MVP adapter.",
  "Velocity acceptance requires a separately sourced OEM or project specification; no acceptance threshold is applied.",
  "The result is a mean branch velocity and hydraulic diameter, not a safety qualification.",
] as const);

function sources(
  sourceRefs: readonly string[],
  contractSourceRefs: readonly string[],
  derivationRefs: readonly string[],
  validationCaseIds: readonly string[],
  methodCheckIds: readonly string[],
): MvpThermalSourceSummary {
  return {
    sourceRefs: [...sourceRefs],
    contractSourceRefs: [...contractSourceRefs],
    derivationRefs: [...derivationRefs],
    validationCaseIds: [...validationCaseIds],
    methodCheckIds: [...methodCheckIds],
  };
}

const H01_SOURCES = cloneAndDeepFreeze(
  sources(
    H01_SOURCE_REFS,
    H01_CONTRACT_SOURCE_REFS,
    H01_DERIVATION_REFS,
    H01_VALIDATION_CASE_IDS,
    H01_METHOD_CHECK_IDS,
  ),
);

const H03_SOURCES = cloneAndDeepFreeze(
  sources(
    H03_SOURCE_REFS,
    H03_CONTRACT_SOURCE_REFS,
    H03_DERIVATION_REFS,
    H03_VALIDATION_CASE_IDS,
    H03_METHOD_CHECK_IDS,
  ),
);

function safeCloneInput(value: unknown): unknown | null {
  try {
    return cloneAndDeepFreeze(value);
  } catch {
    return null;
  }
}

function warnings(
  value: readonly Readonly<{
    readonly sourceMethodId: MvpThermalMethodId;
    readonly predicate: string;
    readonly message: string;
  }>[],
): readonly MvpThermalWarning[] {
  return value.map((warning) => ({
    sourceMethodId: warning.sourceMethodId,
    predicate: warning.predicate,
    message: warning.message,
  }));
}

function adapterFailure(
  methodId: MvpThermalMethodId | null,
  status: Exclude<MvpThermalCalculationStatus, "success">,
  code: string,
  message: string,
  action: string,
): MvpThermalCalculationResult {
  const isH01 = methodId === H01_METHOD_ID;
  const isH03 = methodId === H03_METHOD_ID;
  return cloneAndDeepFreeze({
    methodId,
    methodVersion: isH01
      ? H01_METHOD_VERSION
      : isH03
        ? H03_METHOD_VERSION
        : null,
    methodApproval: methodId === null ? null : "approved",
    status,
    outputs: EMPTY,
    warnings: EMPTY,
    assumptions: EMPTY,
    sources: isH01 ? H01_SOURCES : isH03 ? H03_SOURCES : {
      sourceRefs: EMPTY,
      contractSourceRefs: EMPTY,
      derivationRefs: EMPTY,
      validationCaseIds: EMPTY,
      methodCheckIds: EMPTY,
    },
    applicability: {
      status: status === "not_applicable" ? "out_of_domain" : "not_evaluated",
      scope: isH01 ? H01_SCOPE : isH03 ? H03_SCOPE : "allowlisted H-01 or H-03 MVP route",
      checks: EMPTY,
      limitations: isH01 ? H01_LIMITATIONS : isH03 ? H03_LIMITATIONS : EMPTY,
    },
    failure: { code, message, action },
  });
}

const H01_TOP_LEVEL_KEYS = [
  "methodId",
  "controlVolume",
  "copperLoss",
  "externalHeatPickupToCoil",
  "magneticMaterialLoss",
  "otherCooledLoads",
  "otherLoadsEnumerationComplete",
  "otherLoadsEnumerationSourceRef",
  "pairwiseDisjointPathsConfirmed",
  "physicalSourceIdentityChecked",
  "overlapAssessmentSourceRef",
  "designMarginStatus",
] as const;

const H01_CONTROL_VOLUME_KEYS = [
  "controlVolumeId",
  "coolantCircuitId",
  "caseSnapshotId",
  "timeBasisId",
  "singleDeclaredCircuitConfirmed",
  "boundaryCompleteConfirmed",
  "forbiddenHeatClassesExcludedConfirmed",
  "multiCircuitAggregationAbsentConfirmed",
] as const;

const H01_KNOWN_TERM_KEYS = [
  "disposition",
  "valueW",
  "sourceMethod",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
  "heatPathId",
  "physicalHeatSourceId",
] as const;

const H01_NOT_APPLICABLE_TERM_KEYS = [
  "disposition",
  "reason",
  "resolutionSourceRef",
  "sourceMethod",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
  "heatPathId",
  "physicalHeatSourceId",
] as const;

type H01TermRecord = Readonly<Record<string, unknown>>;

function readH01Term(value: unknown): H01TermRecord | null {
  const known = readExactPlainDataRecord(value, H01_KNOWN_TERM_KEYS);
  if (known?.disposition === "known_applicable") {
    return known;
  }
  const notApplicable = readExactPlainDataRecord(
    value,
    H01_NOT_APPLICABLE_TERM_KEYS,
  );
  if (notApplicable?.disposition === "source_confirmed_not_applicable") {
    return notApplicable;
  }
  return null;
}

const H01_HEAT_SOURCE_CLASSES = Object.freeze({
  Pcu: "coil_copper_loss" as const,
  Qpickup_to_coil: "external_heat_pickup_to_coil" as const,
  Pmag: "magnetic_material_loss" as const,
  Pother: "other_explicit_cooled_load" as const,
});

function evaluatorH01Term(
  inputId: keyof typeof H01_HEAT_SOURCE_CLASSES,
  term: H01TermRecord,
  controlVolume: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const boundary = {
    inputId,
    heatSourceClass: H01_HEAT_SOURCE_CLASSES[inputId],
    sourceMethod: term.sourceMethod,
    sourceRef: term.sourceRef,
    dataQuality: term.dataQuality,
    provenanceId: term.provenanceId,
    sourceSnapshotId: term.sourceSnapshotId,
    controlVolumeId: controlVolume.controlVolumeId,
    coolantCircuitId: controlVolume.coolantCircuitId,
    caseSnapshotId: controlVolume.caseSnapshotId,
    timeBasisId: controlVolume.timeBasisId,
    heatPathId: term.heatPathId,
    physicalHeatSourceId: term.physicalHeatSourceId,
  };
  if (term.disposition === "known_applicable") {
    return {
      kind: "known_applicable",
      ...boundary,
      valueW: term.valueW,
      dimensionId: "power",
      canonicalUnitId: "W",
      valueResolution: "known_value",
      heatDestination: "declared_coil_coolant_circuit",
    };
  }
  return {
    kind: "source_confirmed_not_applicable",
    ...boundary,
    reason: term.reason,
    resolutionSourceRef: term.resolutionSourceRef,
    heatDestination: "source_confirmed_not_entering_declared_circuit",
  };
}

/** Evaluate the allowlisted H-01 no-design-margin route. */
export function calculateMvpH01CoolingHeatLoad(
  input: unknown,
): MvpThermalCalculationResult {
  const cloned = safeCloneInput(input);
  const top = readExactPlainDataRecord(cloned, H01_TOP_LEVEL_KEYS);
  if (top === null || top.methodId !== H01_METHOD_ID) {
    return adapterFailure(
      H01_METHOD_ID,
      "invalid_input",
      "MVP-H-01.input_schema_invalid",
      "The H-01 MVP input does not match the exact controlled adapter schema.",
      "Provide the exact H-01 MVP fields without aliases, omissions, or extra keys.",
    );
  }
  const controlVolume = readExactPlainDataRecord(
    top.controlVolume,
    H01_CONTROL_VOLUME_KEYS,
  );
  const copperLoss = readH01Term(top.copperLoss);
  const pickup = readH01Term(top.externalHeatPickupToCoil);
  const magneticLoss = readH01Term(top.magneticMaterialLoss);
  if (
    controlVolume === null ||
    copperLoss === null ||
    pickup === null ||
    magneticLoss === null ||
    !Array.isArray(top.otherCooledLoads)
  ) {
    return adapterFailure(
      H01_METHOD_ID,
      "invalid_input",
      "MVP-H-01.input_schema_invalid",
      "The H-01 control-volume or heat-source evidence is malformed.",
      "Provide explicit source, provenance, snapshot, path, and disposition evidence for every term.",
    );
  }
  const otherTerms = top.otherCooledLoads.map(readH01Term);
  if (otherTerms.some((term) => term === null)) {
    return adapterFailure(
      H01_METHOD_ID,
      "invalid_input",
      "MVP-H-01.input_schema_invalid",
      "At least one other cooled-load record is malformed or unresolved.",
      "Use only known_applicable or source_confirmed_not_applicable records with full provenance.",
    );
  }
  if (
    controlVolume.singleDeclaredCircuitConfirmed !== true ||
    controlVolume.boundaryCompleteConfirmed !== true ||
    controlVolume.forbiddenHeatClassesExcludedConfirmed !== true ||
    controlVolume.multiCircuitAggregationAbsentConfirmed !== true ||
    top.otherLoadsEnumerationComplete !== true ||
    top.pairwiseDisjointPathsConfirmed !== true ||
    top.physicalSourceIdentityChecked !== true
  ) {
    return adapterFailure(
      H01_METHOD_ID,
      "insufficient_data",
      "MVP-H-01.control_volume_evidence_incomplete",
      "The narrow H-01 route requires a complete single-circuit boundary and confirmed non-overlapping heat paths.",
      "Complete the control-volume, enumeration, and overlap evidence before calculating.",
    );
  }
  if (top.designMarginStatus !== "not_requested") {
    return adapterFailure(
      H01_METHOD_ID,
      "insufficient_data",
      "H-01.design_margin_route_unresolved",
      "Design-margin arithmetic is not frozen for H-01 and is not available in this MVP route.",
      "Set designMarginStatus to not_requested or defer the margin scenario.",
    );
  }

  const Pcu = evaluatorH01Term("Pcu", copperLoss, controlVolume);
  const Qpickup = evaluatorH01Term("Qpickup_to_coil", pickup, controlVolume);
  const Pmag = evaluatorH01Term("Pmag", magneticLoss, controlVolume);
  const Pother = (otherTerms as readonly H01TermRecord[]).map((term) =>
    evaluatorH01Term("Pother", term, controlVolume),
  );
  const includedPathIds = [Pcu, Qpickup, Pmag, ...Pother]
    .filter((term) => term.kind === "known_applicable")
    .map((term) => term.heatPathId);

  const outcome = evaluateH01CoolingHeatLoad({
    controlVolume: {
      controlVolumeId: controlVolume.controlVolumeId,
      coolantCircuitId: controlVolume.coolantCircuitId,
      caseSnapshotId: controlVolume.caseSnapshotId,
      timeBasisId: controlVolume.timeBasisId,
      heatDestination: "declared_coil_coolant_circuit",
      circuitScope: "single_declared_circuit",
      boundaryCompleteConfirmed: true,
      forbiddenHeatClassesExcludedConfirmed: true,
      multiCircuitAggregationAbsentConfirmed: true,
    },
    Pcu,
    Qpickup_to_coil: Qpickup,
    Pmag,
    Pother: {
      enumerationStatus: "complete",
      enumerationSourceRef: top.otherLoadsEnumerationSourceRef,
      loads: Pother,
    },
    overlapAssessment: {
      status: "confirmed_pairwise_disjoint",
      assessedHeatPathIds: includedPathIds,
      physicalSourceIdentityChecked: true,
      assessmentSourceRef: top.overlapAssessmentSourceRef,
    },
    design_margin: { status: "not_requested" },
  });

  if (outcome.status !== "success") {
    return cloneAndDeepFreeze({
      methodId: H01_METHOD_ID,
      methodVersion: H01_METHOD_VERSION,
      methodApproval: "approved" as const,
      status: outcome.status,
      outputs: EMPTY,
      warnings: warnings(outcome.warnings),
      assumptions: EMPTY,
      sources: H01_SOURCES,
      applicability: {
        status: outcome.applicabilityStatus,
        scope: H01_SCOPE,
        checks: EMPTY,
        limitations: H01_LIMITATIONS,
      },
      failure: outcome.failure,
    });
  }

  return cloneAndDeepFreeze({
    methodId: H01_METHOD_ID,
    methodVersion: H01_METHOD_VERSION,
    methodApproval: "approved" as const,
    status: "success" as const,
    outputs: [{
      outputId: outcome.value.Qcool.outputId,
      parameterId: null,
      valueSi: outcome.value.Qcool.valueSi,
      dimensionId: outcome.value.Qcool.dimensionId,
      canonicalUnitId: outcome.value.Qcool.canonicalUnitId,
      interpretation: outcome.value.Qcool.interpretation,
    }],
    warnings: warnings(outcome.warnings),
    assumptions: [...outcome.assumptions],
    sources: H01_SOURCES,
    applicability: {
      status: outcome.applicabilityStatus,
      scope: H01_SCOPE,
      checks: [...outcome.applicabilityChecks],
      limitations: H01_LIMITATIONS,
    },
    failure: null,
  });
}

const H03_TOP_LEVEL_KEYS = [
  "methodId",
  "binding",
  "explicitBranchFlow",
  "d02Geometry",
] as const;

const H03_BINDING_KEYS = [
  "caseSnapshotId",
  "coolantNetworkId",
  "branchId",
  "timeBasisId",
] as const;

const H03_FLOW_KEYS = [
  "volumeFlowM3PerS",
  "oneDeclaredBranchConfirmed",
  "sourceMethod",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
] as const;

const H03_GEOMETRY_KEYS = [
  "flowAreaM2",
  "wettedPerimeterM",
  "sourceMethodId",
  "verifiedD02Snapshot",
  "sameD02HydraulicGeometryConfirmed",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
  "geometrySnapshotId",
  "hydraulicGeometryId",
] as const;

/** Evaluate the allowlisted explicit-one-branch H-03 route. */
export function calculateMvpH03BranchFlowGeometry(
  input: unknown,
): MvpThermalCalculationResult {
  const cloned = safeCloneInput(input);
  const top = readExactPlainDataRecord(cloned, H03_TOP_LEVEL_KEYS);
  if (top === null || top.methodId !== H03_METHOD_ID) {
    return adapterFailure(
      H03_METHOD_ID,
      "invalid_input",
      "MVP-H-03.input_schema_invalid",
      "The H-03 MVP input does not match the exact controlled adapter schema.",
      "Provide the exact explicit-branch and verified D-02 evidence fields without aliases.",
    );
  }
  const binding = readExactPlainDataRecord(top.binding, H03_BINDING_KEYS);
  const flow = readExactPlainDataRecord(top.explicitBranchFlow, H03_FLOW_KEYS);
  const geometry = readExactPlainDataRecord(top.d02Geometry, H03_GEOMETRY_KEYS);
  if (binding === null || flow === null || geometry === null) {
    return adapterFailure(
      H03_METHOD_ID,
      "invalid_input",
      "MVP-H-03.input_schema_invalid",
      "The H-03 branch, flow, or D-02 geometry evidence is malformed.",
      "Provide explicit source, provenance, snapshot, branch, and geometry bindings.",
    );
  }
  if (flow.oneDeclaredBranchConfirmed !== true) {
    return adapterFailure(
      H03_METHOD_ID,
      "not_applicable",
      "MVP-H-03.explicit_branch_route_not_confirmed",
      "This MVP adapter accepts only an explicit volume flow for one declared branch.",
      "Provide a branch-scoped flow or use a future controlled network adapter.",
    );
  }
  if (
    geometry.sourceMethodId !== "D-02" ||
    geometry.verifiedD02Snapshot !== true ||
    geometry.sameD02HydraulicGeometryConfirmed !== true
  ) {
    return adapterFailure(
      H03_METHOD_ID,
      "insufficient_data",
      "MVP-H-03.verified_D02_geometry_required",
      "Flow area and wetted perimeter must come from one verified D-02 hydraulic-geometry snapshot.",
      "Verify the D-02 snapshot and confirm that Ah and Pwetted describe the same passage.",
    );
  }
  if (flow.sourceMethod !== "measurement" && flow.sourceMethod !== "case_input") {
    return adapterFailure(
      H03_METHOD_ID,
      "not_applicable",
      "MVP-H-03.flow_source_route_not_allowed",
      "The narrow MVP adapter accepts only measured or explicit case-input branch volume flow.",
      "Use an explicit branch value; H-02, H-05, and equal-split orchestration remain outside this adapter.",
    );
  }

  const geometryBoundary = {
    sourceMethodId: "D-02" as const,
    sourceRef: geometry.sourceRef,
    dataQuality: geometry.dataQuality,
    provenanceId: geometry.provenanceId,
    sourceSnapshotId: geometry.sourceSnapshotId,
    branchId: binding.branchId,
    coolantNetworkId: binding.coolantNetworkId,
    hydraulicGeometryId: geometry.hydraulicGeometryId,
    caseSnapshotId: binding.caseSnapshotId,
    geometrySnapshotId: geometry.geometrySnapshotId,
  };

  const outcome = evaluateH03BranchFlowGeometry({
    flow: {
      kind: "explicit_branch_volume_flow",
      valueSi: flow.volumeFlowM3PerS,
      quantityKind: "volume_flow_rate",
      dimensionId: "volume_flow_rate",
      canonicalUnitId: "m3_per_s",
      valueResolution: "known_value",
      flowScope: "one_declared_branch",
      sourceMethod: flow.sourceMethod,
      sourceRef: flow.sourceRef,
      dataQuality: flow.dataQuality,
      provenanceId: flow.provenanceId,
      sourceSnapshotId: flow.sourceSnapshotId,
      branchId: binding.branchId,
      coolantNetworkId: binding.coolantNetworkId,
      caseSnapshotId: binding.caseSnapshotId,
      timeBasisId: binding.timeBasisId,
    },
    hydraulicGeometry: {
      Ah: {
        kind: "available",
        contractInputId: "Ah",
        parameterId: "coolant.flow_area",
        sourceQuantityId: "Ahydraulic",
        valueSi: geometry.flowAreaM2,
        dimensionId: "area",
        canonicalUnitId: "m2",
        interpretation: "internal_coolant_flow_cross_section",
        ...geometryBoundary,
      },
      Pwetted: {
        kind: "available",
        contractInputId: "Pwetted",
        parameterId: "coolant.wetted_perimeter",
        sourceQuantityId: "Pwetted",
        valueSi: geometry.wettedPerimeterM,
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation: "internal_coolant_wetted_perimeter",
        ...geometryBoundary,
      },
      sameD02HydraulicGeometryConfirmed: true,
    },
  });

  if (outcome.status !== "success") {
    return cloneAndDeepFreeze({
      methodId: H03_METHOD_ID,
      methodVersion: H03_METHOD_VERSION,
      methodApproval: "approved" as const,
      status: outcome.status,
      outputs: EMPTY,
      warnings: warnings(outcome.warnings),
      assumptions: EMPTY,
      sources: H03_SOURCES,
      applicability: {
        status: outcome.applicabilityStatus,
        scope: H03_SCOPE,
        checks: EMPTY,
        limitations: H03_LIMITATIONS,
      },
      failure: outcome.failure,
    });
  }

  return cloneAndDeepFreeze({
    methodId: H03_METHOD_ID,
    methodVersion: H03_METHOD_VERSION,
    methodApproval: "approved" as const,
    status: "success" as const,
    outputs: [
      {
        outputId: outcome.value.v.outputId,
        parameterId: outcome.value.v.parameterId,
        valueSi: outcome.value.v.valueSi,
        dimensionId: outcome.value.v.dimensionId,
        canonicalUnitId: outcome.value.v.canonicalUnitId,
        interpretation: outcome.value.v.interpretation,
      },
      {
        outputId: outcome.value.Dh.outputId,
        parameterId: outcome.value.Dh.parameterId,
        valueSi: outcome.value.Dh.valueSi,
        dimensionId: outcome.value.Dh.dimensionId,
        canonicalUnitId: outcome.value.Dh.canonicalUnitId,
        interpretation: outcome.value.Dh.interpretation,
      },
    ],
    warnings: warnings(outcome.warnings),
    assumptions: [...outcome.assumptions],
    sources: H03_SOURCES,
    applicability: {
      status: outcome.applicabilityStatus,
      scope: H03_SCOPE,
      checks: [...outcome.applicabilityChecks],
      limitations: H03_LIMITATIONS,
    },
    failure: null,
  });
}

/** Dispatch only to the frozen MVP allowlist. */
export function calculateMvpThermal(
  input: unknown,
): MvpThermalCalculationResult {
  const cloned = safeCloneInput(input);
  if (cloned === null || typeof cloned !== "object" || Array.isArray(cloned)) {
    return adapterFailure(
      null,
      "invalid_input",
      "MVP.input_schema_invalid",
      "The calculation request must be a controlled plain data record.",
      "Provide an H-01 or H-03 MVP input record.",
    );
  }
  const descriptor = Object.getOwnPropertyDescriptor(cloned, "methodId");
  const selectedMethodId =
    descriptor !== undefined && "value" in descriptor
      ? descriptor.value
      : null;
  if (selectedMethodId === H01_METHOD_ID) {
    return calculateMvpH01CoolingHeatLoad(cloned);
  }
  if (selectedMethodId === H03_METHOD_ID) {
    return calculateMvpH03BranchFlowGeometry(cloned);
  }
  return adapterFailure(
    null,
    "not_applicable",
    "MVP.method_not_allowlisted",
    "The requested method is not in the controlled MVP thermal allowlist.",
    "Select H-01 or H-03; other thermal and cooling methods remain disabled.",
  );
}
