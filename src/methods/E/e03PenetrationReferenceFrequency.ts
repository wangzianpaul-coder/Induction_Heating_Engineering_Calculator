/**
 * E-03 solid-cylinder penetration parameter and reference-frequency relation.
 *
 * This canonical-SI implementation is intentionally isolated from the runtime
 * and public API. It evaluates only the frozen reference relation and never
 * performs process optimization or selects a material property or criterion.
 */

import { isWithinTolId, TOL_ID } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("E-03"));
const E01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("E-01"));

export const E03_METHOD_ID = "E-03" as const;
export const E03_METHOD_VERSION = SPECIFICATION.methodVersion;
export const E03_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;

export const E03_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const E03_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const E03_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const E03_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const E03_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const E03_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: E03_SOURCE_REFS,
  contractSourceRefs: E03_CONTRACT_SOURCE_REFS,
  derivationRefs: E03_DERIVATION_REFS,
  validationCaseIds: E03_VALIDATION_CASE_IDS,
  methodCheckIds: E03_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
});

export const E03_M04_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "M04" as const,
  relativePath:
    "references/project_uploads/电源频率和功率在透热感应加热中的选择_马建平.pdf" as const,
  sha256:
    "441b880074454c5a06da76c1ea8f599ea923e55c668a48d636cb5ef6264dfdcb" as const,
  location: "PDF2-3:PRINT72-73:eq1-5" as const,
});

const SI_REFERENCE_FREQUENCY_COEFFICIENT =
  16 / (Math.PI * E03_VACUUM_PERMEABILITY_H_PER_M);

/** Exact coefficients derived from CODATA mu0 and exact unit conversions. */
export const E03_ENGINEERING_UNIT_COEFFICIENTS = Object.freeze({
  siForPiDEquals2: SI_REFERENCE_FREQUENCY_COEFFICIENT,
  ohmCentimetreForPiDEquals2:
    SI_REFERENCE_FREQUENCY_COEFFICIENT * 100,
  microOhmCentimetreForPiDEquals2:
    SI_REFERENCE_FREQUENCY_COEFFICIENT / 10_000,
  printedApproximateOhmCentimetre: 4.05285e8,
  printedApproximateMicroOhmCentimetre: 405.285,
  calculationBasis:
    "derived_from_codata_mu0_and_exact_unit_conversions" as const,
});

export const E03_SOURCE_UNIT_DISPOSITION = Object.freeze({
  sourceConflict:
    "M04 Equation 4 labels rho as microohm-centimetres while its 4e8 coefficient and worked substitution use the ohm-centimetre route." as const,
  implementationRoute:
    "canonical_si_only_engineering_units_are_identity_wrappers" as const,
  printedRoundedCoefficientsUsedForCalculation: false as const,
});

export const E03_CRITERION_POLICY = Object.freeze({
  frozenCriterion: 2 as const,
  meaning: "Pi_D=D/(2*delta)=2" as const,
  selectionPolicy: "explicit_selection_required_no_runtime_default" as const,
  otherCriteria: "not_implemented_without_separate_approval" as const,
});

export const E03_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  openGates: Object.freeze([
    Object.freeze({
      gateId: "E-03.stable-warning-ids" as const,
      reason:
        "The frozen registry supplies warning prose but no stable warning IDs; the isolated implementation does not invent IDs." as const,
    }),
    Object.freeze({
      gateId: "E-03.parameter-id-mapping-closure" as const,
      reason:
        "The E-03 contract/metadata input IDs do not yet have a complete controlled alias mapping to the parameter registry, whose E-03 consumer declarations also include frequency and skin_depth." as const,
    }),
    Object.freeze({
      gateId: "E-03.codata22-local-pin" as const,
      reason:
        "CODATA22 remains an online-only controlled dependency without a locally pinned file hash in the frozen source manifest." as const,
    }),
    Object.freeze({
      gateId: "E-03.frequency-state-orchestration" as const,
      reason:
        "A-01 rho and effective mu_r must be resolved at the exact E-01 frequency or at the self-consistent f_ref point; the isolated method does not iterate or extrapolate material properties." as const,
    }),
  ]),
  penetrationParameterRoute: Object.freeze({
    contractDependency: "E-01" as const,
    evidencePolicy:
      "require_successful_same_snapshot_e01_depth_no_hidden_frequency_or_depth" as const,
  }),
});

const UNIT_CONSTANT_MIX_PREDICATE =
  "ohm-centimetre and microohm-centimetre constants are mixed" as const;
const THIN_WALL_PREDICATE = "thin-wall workpiece" as const;
const COLD_PROPERTY_PREDICATE =
  "cold properties are used for the hot state" as const;
const OPTIMUM_LABEL_PREDICATE =
  "result is labelled recommended or optimum without process optimization" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `E-03 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const E03_WARNING_PREDICATES = Object.freeze({
  unitConstantMix: controlledWarningPredicate(UNIT_CONSTANT_MIX_PREDICATE),
  thinWallWorkpiece: controlledWarningPredicate(THIN_WALL_PREDICATE),
  coldPropertiesForHotState: controlledWarningPredicate(
    COLD_PROPERTY_PREDICATE,
  ),
  optimumOrRecommendedLabel: controlledWarningPredicate(
    OPTIMUM_LABEL_PREDICATE,
  ),
});

export type E03CalculationRoute =
  | "penetration_parameter_from_e01_depth"
  | "reference_frequency_for_historical_pi_d_2";

export type E03WorkpieceForm =
  | "solid_cylinder"
  | "thin_wall_tube"
  | "other_hollow_or_non_solid"
  | "other_or_unknown";

export interface E03GeometryEvidence {
  readonly contractParameterId: "workpiece.diameter";
  readonly canonicalParameterId: "workpiece.outer_diameter";
  readonly normalizedDiameterM: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly geometrySnapshotId: string;
  readonly geometrySourceRef: string;
  readonly mappingStatus:
    | "confirmed_same_solid_cylinder_snapshot"
    | "unconfirmed";
  readonly workpieceForm: E03WorkpieceForm;
}

export interface E03TargetMaterialState {
  readonly materialId: string;
  readonly materialRevision: string;
  readonly materialSnapshotId: string;
  readonly materialStateId: string;
  readonly temperatureK: number;
  readonly fieldStrengthApm: number | null;
  /** Point frequency at which both A-01 property values were resolved. */
  readonly frequencyHz: number;
  readonly phaseOrMicrostructureId: string;
  readonly statePurpose: "target_heating_state";
  readonly stateConfirmation: "confirmed" | "unconfirmed";
}

export type E03PropertyId =
  | "electrical_resistivity"
  | "relative_permeability";

export interface E03PropertySnapshot {
  readonly contractParameterId:
    | "rho_at_target_state"
    | "mu_r_at_target_state";
  readonly parameterId: "resistivity" | "relative_permeability";
  readonly propertyId: E03PropertyId;
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistivity" | "dimensionless";
  readonly canonicalUnitId: "ohm_m" | "one";
  readonly materialId: string;
  readonly materialRevision: string;
  readonly propertyRevision: string;
  readonly materialSnapshotId: string;
  readonly materialStateId: string;
  readonly temperatureK: number;
  readonly fieldStrengthApm: number | null;
  /** Point frequency bound to this immutable property value. */
  readonly frequencyHz: number;
  readonly phaseOrMicrostructureId: string;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly stateMatch:
    | "confirmed_for_target_state"
    | "unconfirmed_or_mismatched";
}

export interface E03PenetrationCriterionEvidence {
  readonly contractParameterId: "penetration_criterion";
  readonly selection:
    | "historical_pi_d_equals_2"
    | "not_used_penetration_parameter_route"
    | "unconfirmed";
  readonly valueSi: 2 | null;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly explicitlySelected: boolean;
  readonly sourceRef: "M04:PDF2-3:PRINT72-73:eq1-5" | null;
}

export interface E03E01SkinDepthEvidence {
  readonly sourceMethodId: "E-01";
  readonly sourceMethodVersion: string;
  readonly sourceOutcome: "success";
  readonly sourceResultId: string;
  readonly skinDepthM: number;
  readonly frequencyHz: number;
  readonly interpretation: "electromagnetic_field_amplitude_1_over_e_depth";
  readonly isThermalAffectedDepth: false;
  readonly materialSnapshotId: string;
  readonly materialStateId: string;
  readonly temperatureK: number;
  readonly fieldStrengthApm: number | null;
  readonly phaseOrMicrostructureId: string;
  readonly geometrySnapshotId: string;
  readonly resistivityOhmM: number;
  readonly relativePermeability: number;
  readonly stateMappingStatus:
    | "confirmed_same_target_and_geometry_snapshots"
    | "unconfirmed";
}

export interface E03ApplicabilityEvidence {
  readonly workpieceForm: E03WorkpieceForm;
  readonly materialClass:
    | "ferromagnetic"
    | "nonferromagnetic"
    | "other_or_unknown";
  readonly materialHomogeneity: "homogeneous" | "nonuniform" | "unknown";
  readonly materialIsotropy: "isotropic" | "anisotropic" | "unknown";
  readonly constitutiveRegime:
    | "effective_linear_good_conductor"
    | "nonlinear_or_unresolved"
    | "unknown";
  readonly propertyStateUse:
    | "confirmed_target_state"
    | "cold_properties_for_hot_target"
    | "unconfirmed";
  readonly intendedInterpretation:
    | "reference_relation_not_optimum"
    | "recommended_or_optimum_without_process_optimization"
    | "other_or_unknown";
}

export interface E03PenetrationReferenceFrequencyInput {
  readonly route: E03CalculationRoute;
  readonly diameterM: number;
  readonly geometryEvidence: E03GeometryEvidence;
  readonly targetState: E03TargetMaterialState;
  readonly resistivitySnapshot: E03PropertySnapshot;
  readonly relativePermeabilitySnapshot: E03PropertySnapshot;
  readonly penetrationCriterion: E03PenetrationCriterionEvidence;
  readonly skinDepthEvidence: E03E01SkinDepthEvidence | null;
  readonly applicability: E03ApplicabilityEvidence;
}

export interface E03PenetrationParameterOutput {
  readonly kind: "available";
  readonly outputId: "Pi_D";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: "solid_cylinder_diameter_to_twice_electromagnetic_skin_depth";
  readonly isRecommendedFrequencyCriterion: false;
  readonly isOptimumCriterion: false;
}

export interface E03ReferenceFrequencyOutput {
  readonly kind: "available";
  readonly outputId: "fref";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "frequency";
  readonly canonicalUnitId: "Hz";
  readonly interpretation: "solid_cylinder_empirical_reference_frequency";
  readonly isRecommendedFrequency: false;
  readonly isOptimumFrequency: false;
}

export interface E03SkinDepthTraceOutput {
  readonly kind: "available";
  readonly outputId: "delta_reference" | "delta_from_E01";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation: "electromagnetic_field_amplitude_1_over_e_depth";
}

export interface E03IdentityCheck {
  readonly identityId:
    | "Pi_D_from_E01_depth_matches_material_equation"
    | "Pi_D_equals_D_over_2delta"
    | "reference_delta_equals_D_over_2Pi_D"
    | "reference_frequency_reproduces_Pi_D"
    | "ohm_centimetre_wrapper_matches_SI"
    | "microohm_centimetre_wrapper_matches_SI";
  readonly actualSi: number;
  readonly referenceSi: number;
  readonly absoluteResidualSi: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "synthetic_identity_only";
  readonly passed: true;
}

export interface E03PenetrationParameterValue {
  readonly route: "penetration_parameter_from_e01_depth";
  readonly penetrationParameter: E03PenetrationParameterOutput;
  readonly skinDepth: E03SkinDepthTraceOutput;
  readonly frequencyHz: number;
  readonly referenceFrequency?: never;
}

export interface E03ReferenceFrequencyValue {
  readonly route: "reference_frequency_for_historical_pi_d_2";
  readonly penetrationParameter: E03PenetrationParameterOutput;
  readonly referenceFrequency: E03ReferenceFrequencyOutput;
  readonly skinDepth: E03SkinDepthTraceOutput;
  readonly frequencyHz?: never;
}

export type E03PenetrationReferenceFrequencyValue =
  | E03PenetrationParameterValue
  | E03ReferenceFrequencyValue;

export interface E03Warning {
  readonly predicate:
    | typeof UNIT_CONSTANT_MIX_PREDICATE
    | typeof THIN_WALL_PREDICATE
    | typeof COLD_PROPERTY_PREDICATE
    | typeof OPTIMUM_LABEL_PREDICATE;
  readonly message: string;
}

interface E03CommonEvidence {
  readonly geometry: Readonly<E03GeometryEvidence>;
  readonly targetState: Readonly<E03TargetMaterialState>;
  readonly resistivitySnapshot: Readonly<E03PropertySnapshot>;
  readonly relativePermeabilitySnapshot: Readonly<E03PropertySnapshot>;
  readonly criterion: Readonly<E03PenetrationCriterionEvidence>;
  readonly applicability: Readonly<E03ApplicabilityEvidence>;
  readonly sourceUnitDisposition: typeof E03_SOURCE_UNIT_DISPOSITION;
  readonly sourceRefs: typeof E03_SOURCE_REFS;
  readonly contractSourceRefs: typeof E03_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof E03_DERIVATION_REFS;
  readonly validationCaseIds: typeof E03_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof E03_METHOD_CHECK_IDS;
  readonly units: Readonly<{
    readonly diameter: "m";
    readonly skinDepth: "m";
    readonly resistivity: "ohm_m";
    readonly relativePermeability: "one";
    readonly penetrationParameter: "one";
    readonly referenceFrequency: "Hz";
    readonly dimensionalIdentity:
      "(ohm*m)/((H/m)*m^2)=1/s=Hz";
  }>;
  readonly assumptions: readonly [
    "solid homogeneous isotropic cylinder",
    "effective linear good-conductor material properties at one explicit target state",
    "Pi_D is a penetration reference relation, not a process optimum",
    "no thin-wall, thermal-diffusion, power-density, heating-time, supply-capability, or Curie optimization model",
  ];
}

export interface E03PenetrationEvidence extends E03CommonEvidence {
  readonly route: "penetration_parameter_from_e01_depth";
  readonly equation:
    "Pi_D=D/(2*delta_E01); delta_E01=sqrt(rho/(pi*f*mu0*mu_r))";
  readonly skinDepthEvidence: Readonly<E03E01SkinDepthEvidence>;
  readonly identities: readonly E03IdentityCheck[];
  readonly engineeringUnitWrappers?: never;
}

export interface E03ReferenceFrequencyEvidence extends E03CommonEvidence {
  readonly route: "reference_frequency_for_historical_pi_d_2";
  readonly equation:
    "f_ref=4*rho*Pi_D^2/(pi*mu0*mu_r*D^2); Pi_D=2";
  readonly identities: readonly E03IdentityCheck[];
  readonly skinDepthEvidence?: never;
  readonly engineeringUnitWrappers: Readonly<{
    readonly ohmCentimetreFrequencyHz: number;
    readonly microOhmCentimetreFrequencyHz: number;
    readonly exactCoefficients: typeof E03_ENGINEERING_UNIT_COEFFICIENTS;
    readonly printedRoundedCoefficientsUsedForCalculation: false;
  }>;
}

export type E03Evidence =
  | E03PenetrationEvidence
  | E03ReferenceFrequencyEvidence;

export interface E03PenetrationReferenceFrequencySuccess {
  readonly methodId: typeof E03_METHOD_ID;
  readonly methodVersion: typeof E03_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly E03Warning[];
  readonly value: E03PenetrationReferenceFrequencyValue;
  readonly evidence: E03Evidence;
  readonly failure?: never;
}

export type E03FailureCode =
  | "E-03.input_schema_invalid"
  | "E-03.calculation_route_invalid"
  | "E-03.penetration_criterion_missing"
  | "E-03.penetration_criterion_invalid"
  | "E-03.penetration_criterion_unconfirmed"
  | "E-03.penetration_criterion_not_approved"
  | "E-03.diameter_invalid"
  | "E-03.geometry_evidence_missing"
  | "E-03.geometry_evidence_invalid"
  | "E-03.geometry_mapping_unconfirmed"
  | "E-03.geometry_snapshot_value_mismatch"
  | "E-03.target_state_missing"
  | "E-03.target_state_invalid"
  | "E-03.target_state_unconfirmed"
  | "E-03.property_snapshot_missing"
  | "E-03.property_snapshot_schema_invalid"
  | "E-03.property_snapshot_invalid"
  | "E-03.property_provenance_insufficient"
  | "E-03.property_state_mismatch"
  | "E-03.property_frequency_state_mismatch"
  | "E-03.ferromagnetic_field_state_missing"
  | "E-03.applicability_evidence_missing"
  | "E-03.applicability_evidence_invalid"
  | "E-03.applicability_unconfirmed"
  | "E-03.method_regime_not_applicable"
  | "E-03.thin_wall_not_applicable"
  | "E-03.target_property_state_unconfirmed"
  | "E-03.optimum_interpretation_not_applicable"
  | "E-03.skin_depth_evidence_missing"
  | "E-03.skin_depth_evidence_invalid"
  | "E-03.skin_depth_state_mismatch"
  | "E-03.skin_depth_route_conflict"
  | "E-03.numeric_resolution_invalid"
  | "E-03.identity_check_failed";

export interface E03PenetrationReferenceFrequencyFailure {
  readonly methodId: typeof E03_METHOD_ID;
  readonly methodVersion: typeof E03_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly E03Warning[];
  readonly failure: Readonly<{
    readonly code: E03FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type E03PenetrationReferenceFrequencyOutcome =
  | E03PenetrationReferenceFrequencySuccess
  | E03PenetrationReferenceFrequencyFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly E03Warning[];

function warning(
  predicate: E03Warning["predicate"],
  message: string,
): E03Warning {
  return Object.freeze({ predicate, message });
}

function failure(
  status: E03PenetrationReferenceFrequencyFailure["status"],
  code: E03FailureCode,
  message: string,
  action: string,
  warnings: readonly E03Warning[] = EMPTY_WARNINGS,
): E03PenetrationReferenceFrequencyFailure {
  return Object.freeze({
    methodId: E03_METHOD_ID,
    methodVersion: E03_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    failure: Object.freeze({ code, message, action }),
  });
}

function isNonBlankControlledString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim()
  );
}

function isStrictSourceRef(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    sourceRef(value);
    return true;
  } catch {
    return false;
  }
}

function isDataQuality(value: unknown): value is DataQuality {
  return (
    typeof value === "string" &&
    DATA_QUALITIES.some((candidate) => candidate === value)
  );
}

type GeometryResult =
  | { readonly ok: true; readonly evidence: Readonly<E03GeometryEvidence> }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validateGeometry(
  value: unknown,
  diameterM: number,
): GeometryResult {
  const geometry = readExactPlainDataRecord(value, [
    "contractParameterId",
    "canonicalParameterId",
    "normalizedDiameterM",
    "dimensionId",
    "canonicalUnitId",
    "geometrySnapshotId",
    "geometrySourceRef",
    "mappingStatus",
    "workpieceForm",
  ]);
  if (geometry === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-03.geometry_evidence_missing"
          : "E-03.geometry_evidence_invalid",
        missing
          ? "E-03 requires a content-addressed solid-cylinder diameter mapping."
          : "E-03 geometry evidence must be an exact controlled plain-data record.",
        "Provide the canonical workpiece.outer_diameter value bound to one geometry snapshot.",
      ),
    };
  }
  if (
    geometry.contractParameterId !== "workpiece.diameter" ||
    geometry.canonicalParameterId !== "workpiece.outer_diameter" ||
    typeof geometry.normalizedDiameterM !== "number" ||
    !Number.isFinite(geometry.normalizedDiameterM) ||
    geometry.normalizedDiameterM <= 0 ||
    geometry.dimensionId !== "length" ||
    geometry.canonicalUnitId !== "m" ||
    !isContentAddressedSnapshotId(
      geometry.geometrySnapshotId,
      "geometry",
    ) ||
    !isStrictSourceRef(geometry.geometrySourceRef) ||
    (geometry.mappingStatus !==
      "confirmed_same_solid_cylinder_snapshot" &&
      geometry.mappingStatus !== "unconfirmed") ||
    (geometry.workpieceForm !== "solid_cylinder" &&
      geometry.workpieceForm !== "thin_wall_tube" &&
      geometry.workpieceForm !== "other_hollow_or_non_solid" &&
      geometry.workpieceForm !== "other_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.geometry_evidence_invalid",
        "E-03 geometry evidence has an uncontrolled identity, unit, value, snapshot, or form.",
        "Use canonical metres and the frozen solid-cylinder diameter mapping without coercion.",
      ),
    };
  }
  if (geometry.mappingStatus === "unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.geometry_mapping_unconfirmed",
        "The workpiece diameter mapping is unconfirmed.",
        "Resolve the workpiece.outer_diameter value and geometry snapshot before evaluating E-03.",
      ),
    };
  }
  if (geometry.normalizedDiameterM !== diameterM) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.geometry_snapshot_value_mismatch",
        "The top-level D value differs from the immutable value bound to the declared geometry snapshot.",
        "Use the exact snapshot-bound solid-cylinder diameter.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      contractParameterId: "workpiece.diameter" as const,
      canonicalParameterId: "workpiece.outer_diameter" as const,
      normalizedDiameterM: geometry.normalizedDiameterM,
      dimensionId: "length" as const,
      canonicalUnitId: "m" as const,
      geometrySnapshotId: geometry.geometrySnapshotId,
      geometrySourceRef: geometry.geometrySourceRef,
      mappingStatus: "confirmed_same_solid_cylinder_snapshot" as const,
      workpieceForm: geometry.workpieceForm as E03WorkpieceForm,
    }),
  };
}

type TargetStateResult =
  | {
      readonly ok: true;
      readonly evidence: Readonly<E03TargetMaterialState>;
    }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validateTargetState(value: unknown): TargetStateResult {
  const state = readExactPlainDataRecord(value, [
    "materialId",
    "materialRevision",
    "materialSnapshotId",
    "materialStateId",
    "temperatureK",
    "fieldStrengthApm",
    "frequencyHz",
    "phaseOrMicrostructureId",
    "statePurpose",
    "stateConfirmation",
  ]);
  if (state === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing ? "E-03.target_state_missing" : "E-03.target_state_invalid",
        missing
          ? "E-03 requires an explicit target material state."
          : "E-03 target state must be an exact controlled plain-data record.",
        "Provide a content-addressed material snapshot with explicit temperature, field, frequency, and phase state.",
      ),
    };
  }
  if (
    !isNonBlankControlledString(state.materialId) ||
    !isNonBlankControlledString(state.materialRevision) ||
    !isContentAddressedSnapshotId(
      state.materialSnapshotId,
      "material",
    ) ||
    !isNonBlankControlledString(state.materialStateId) ||
    typeof state.temperatureK !== "number" ||
    !Number.isFinite(state.temperatureK) ||
    state.temperatureK <= 0 ||
    (state.fieldStrengthApm !== null &&
      (typeof state.fieldStrengthApm !== "number" ||
        !Number.isFinite(state.fieldStrengthApm) ||
        state.fieldStrengthApm < 0)) ||
    typeof state.frequencyHz !== "number" ||
    !Number.isFinite(state.frequencyHz) ||
    state.frequencyHz <= 0 ||
    !isNonBlankControlledString(state.phaseOrMicrostructureId) ||
    state.statePurpose !== "target_heating_state" ||
    (state.stateConfirmation !== "confirmed" &&
      state.stateConfirmation !== "unconfirmed")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.target_state_invalid",
        "E-03 target material state contains a non-finite, non-physical, uncontrolled, or incomplete field.",
        "Use an explicit canonical-SI target material state without defaults.",
      ),
    };
  }
  if (state.stateConfirmation === "unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.target_state_unconfirmed",
        "The E-03 target material state is unconfirmed.",
        "Confirm the target temperature, field, frequency, phase, material revision, and content-addressed snapshot.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      materialId: state.materialId,
      materialRevision: state.materialRevision,
      materialSnapshotId: state.materialSnapshotId,
      materialStateId: state.materialStateId,
      temperatureK: state.temperatureK,
      fieldStrengthApm: state.fieldStrengthApm as number | null,
      frequencyHz: state.frequencyHz,
      phaseOrMicrostructureId: state.phaseOrMicrostructureId,
      statePurpose: "target_heating_state" as const,
      stateConfirmation: "confirmed" as const,
    }),
  };
}

type PropertyResult =
  | {
      readonly ok: true;
      readonly snapshot: Readonly<E03PropertySnapshot>;
    }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validatePropertySnapshot(
  value: unknown,
  expectedPropertyId: E03PropertyId,
): PropertyResult {
  const snapshot = readExactPlainDataRecord(value, [
    "contractParameterId",
    "parameterId",
    "propertyId",
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "materialId",
    "materialRevision",
    "propertyRevision",
    "materialSnapshotId",
    "materialStateId",
    "temperatureK",
    "fieldStrengthApm",
    "frequencyHz",
    "phaseOrMicrostructureId",
    "sourceRef",
    "dataQuality",
    "stateMatch",
  ]);
  if (snapshot === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-03.property_snapshot_missing"
          : "E-03.property_snapshot_schema_invalid",
        missing
          ? `E-03 requires an explicit ${expectedPropertyId} target-state snapshot.`
          : "E-03 property snapshots must be exact controlled plain-data records.",
        "Resolve both A-01 properties with canonical SI, state, revision, source, quality, and material snapshot provenance.",
      ),
    };
  }
  const expectedContractParameterId =
    expectedPropertyId === "electrical_resistivity"
      ? "rho_at_target_state"
      : "mu_r_at_target_state";
  const expectedParameterId =
    expectedPropertyId === "electrical_resistivity"
      ? "resistivity"
      : "relative_permeability";
  const expectedDimensionId =
    expectedPropertyId === "electrical_resistivity"
      ? "electrical_resistivity"
      : "dimensionless";
  const expectedUnitId =
    expectedPropertyId === "electrical_resistivity" ? "ohm_m" : "one";
  const unitMixWarning =
    expectedPropertyId === "electrical_resistivity" &&
    (snapshot.canonicalUnitId === "ohm_cm" ||
      snapshot.canonicalUnitId === "microohm_cm")
      ? Object.freeze([
          warning(
            E03_WARNING_PREDICATES.unitConstantMix,
            "A non-SI resistivity value was presented at the calculation-core boundary; E-03 does not select an engineering-unit coefficient.",
          ),
        ])
      : EMPTY_WARNINGS;
  if (
    snapshot.contractParameterId !== expectedContractParameterId ||
    snapshot.parameterId !== expectedParameterId ||
    snapshot.propertyId !== expectedPropertyId ||
    typeof snapshot.valueSi !== "number" ||
    !Number.isFinite(snapshot.valueSi) ||
    snapshot.valueSi <= 0 ||
    snapshot.dimensionId !== expectedDimensionId ||
    snapshot.canonicalUnitId !== expectedUnitId ||
    !isNonBlankControlledString(snapshot.materialId) ||
    !isNonBlankControlledString(snapshot.materialRevision) ||
    !isNonBlankControlledString(snapshot.propertyRevision) ||
    !isContentAddressedSnapshotId(
      snapshot.materialSnapshotId,
      "material",
    ) ||
    !isNonBlankControlledString(snapshot.materialStateId) ||
    typeof snapshot.temperatureK !== "number" ||
    !Number.isFinite(snapshot.temperatureK) ||
    snapshot.temperatureK <= 0 ||
    (snapshot.fieldStrengthApm !== null &&
      (typeof snapshot.fieldStrengthApm !== "number" ||
        !Number.isFinite(snapshot.fieldStrengthApm) ||
        snapshot.fieldStrengthApm < 0)) ||
    typeof snapshot.frequencyHz !== "number" ||
    !Number.isFinite(snapshot.frequencyHz) ||
    snapshot.frequencyHz <= 0 ||
    !isNonBlankControlledString(snapshot.phaseOrMicrostructureId) ||
    !isStrictSourceRef(snapshot.sourceRef) ||
    !isDataQuality(snapshot.dataQuality) ||
    (snapshot.stateMatch !== "confirmed_for_target_state" &&
      snapshot.stateMatch !== "unconfirmed_or_mismatched")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.property_snapshot_invalid",
        `The E-03 ${expectedPropertyId} snapshot has an uncontrolled, non-SI, non-finite, non-positive, or incomplete field.`,
        "Use the frozen property identity and canonical unit with explicit target-state provenance.",
        unitMixWarning,
      ),
    };
  }
  return {
    ok: true,
    snapshot: Object.freeze({
      contractParameterId: expectedContractParameterId,
      parameterId: expectedParameterId,
      propertyId: expectedPropertyId,
      valueSi: snapshot.valueSi,
      dimensionId: expectedDimensionId,
      canonicalUnitId: expectedUnitId,
      materialId: snapshot.materialId,
      materialRevision: snapshot.materialRevision,
      propertyRevision: snapshot.propertyRevision,
      materialSnapshotId: snapshot.materialSnapshotId,
      materialStateId: snapshot.materialStateId,
      temperatureK: snapshot.temperatureK,
      fieldStrengthApm: snapshot.fieldStrengthApm as number | null,
      frequencyHz: snapshot.frequencyHz,
      phaseOrMicrostructureId: snapshot.phaseOrMicrostructureId,
      sourceRef: snapshot.sourceRef,
      dataQuality: snapshot.dataQuality as DataQuality,
      stateMatch: snapshot.stateMatch as E03PropertySnapshot["stateMatch"],
    }),
  };
}

function propertyMatchesTarget(
  property: Readonly<E03PropertySnapshot>,
  target: Readonly<E03TargetMaterialState>,
): boolean {
  return (
    property.materialId === target.materialId &&
    property.materialRevision === target.materialRevision &&
    property.materialSnapshotId === target.materialSnapshotId &&
    property.materialStateId === target.materialStateId &&
    property.temperatureK === target.temperatureK &&
    property.fieldStrengthApm === target.fieldStrengthApm &&
    property.frequencyHz === target.frequencyHz &&
    property.phaseOrMicrostructureId === target.phaseOrMicrostructureId
  );
}

type ApplicabilityResult =
  | {
      readonly ok: true;
      readonly evidence: Readonly<E03ApplicabilityEvidence>;
    }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validateApplicability(
  value: unknown,
  geometryForm: E03WorkpieceForm,
): ApplicabilityResult {
  const evidence = readExactPlainDataRecord(value, [
    "workpieceForm",
    "materialClass",
    "materialHomogeneity",
    "materialIsotropy",
    "constitutiveRegime",
    "propertyStateUse",
    "intendedInterpretation",
  ]);
  if (evidence === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-03.applicability_evidence_missing"
          : "E-03.applicability_evidence_invalid",
        missing
          ? "E-03 requires explicit solid-cylinder, material-regime, property-state, and interpretation evidence."
          : "E-03 applicability evidence must be an exact controlled plain-data record.",
        "Provide every frozen E-03 applicability field without defaults or coercion.",
      ),
    };
  }
  if (
    (evidence.workpieceForm !== "solid_cylinder" &&
      evidence.workpieceForm !== "thin_wall_tube" &&
      evidence.workpieceForm !== "other_hollow_or_non_solid" &&
      evidence.workpieceForm !== "other_or_unknown") ||
    (evidence.materialClass !== "ferromagnetic" &&
      evidence.materialClass !== "nonferromagnetic" &&
      evidence.materialClass !== "other_or_unknown") ||
    (evidence.materialHomogeneity !== "homogeneous" &&
      evidence.materialHomogeneity !== "nonuniform" &&
      evidence.materialHomogeneity !== "unknown") ||
    (evidence.materialIsotropy !== "isotropic" &&
      evidence.materialIsotropy !== "anisotropic" &&
      evidence.materialIsotropy !== "unknown") ||
    (evidence.constitutiveRegime !==
      "effective_linear_good_conductor" &&
      evidence.constitutiveRegime !== "nonlinear_or_unresolved" &&
      evidence.constitutiveRegime !== "unknown") ||
    (evidence.propertyStateUse !== "confirmed_target_state" &&
      evidence.propertyStateUse !== "cold_properties_for_hot_target" &&
      evidence.propertyStateUse !== "unconfirmed") ||
    (evidence.intendedInterpretation !==
      "reference_relation_not_optimum" &&
      evidence.intendedInterpretation !==
        "recommended_or_optimum_without_process_optimization" &&
      evidence.intendedInterpretation !== "other_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.applicability_evidence_invalid",
        "E-03 applicability evidence contains an uncontrolled value.",
        "Use the frozen E-03 applicability enumeration without coercion.",
      ),
    };
  }
  if (evidence.workpieceForm !== geometryForm) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.applicability_evidence_invalid",
        "The applicability workpiece form conflicts with the geometry snapshot.",
        "Bind applicability and diameter evidence to the same workpiece form.",
      ),
    };
  }
  if (evidence.workpieceForm === "thin_wall_tube") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-03.thin_wall_not_applicable",
        "The frozen E-03 solid-cylinder diameter criterion is not applicable to a thin-wall workpiece.",
        "Use an approved wall-thickness/two-sided-field method or FEM; do not substitute outer diameter into E-03.",
        [
          warning(
            E03_WARNING_PREDICATES.thinWallWorkpiece,
            "A thin-wall workpiece cannot use the solid-cylinder diameter penetration criterion.",
          ),
        ],
      ),
    };
  }
  if (evidence.workpieceForm === "other_hollow_or_non_solid") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-03.method_regime_not_applicable",
        "E-03 is frozen only for a solid cylinder.",
        "Use a method whose characteristic geometry matches the hollow or non-solid workpiece.",
      ),
    };
  }
  if (
    evidence.materialHomogeneity === "nonuniform" ||
    evidence.materialIsotropy === "anisotropic" ||
    evidence.constitutiveRegime === "nonlinear_or_unresolved"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-03.method_regime_not_applicable",
        "E-03 requires a homogeneous isotropic effective linear good conductor.",
        "Use state-dependent nonlinear electromagnetic analysis or validated FEM for the declared regime.",
      ),
    };
  }
  if (
    evidence.intendedInterpretation ===
    "recommended_or_optimum_without_process_optimization"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-03.optimum_interpretation_not_applicable",
        "E-03 does not calculate a recommended or optimum process frequency.",
        "Label the result only as a solid-cylinder empirical penetration reference and evaluate process constraints separately.",
        [
          warning(
            E03_WARNING_PREDICATES.optimumOrRecommendedLabel,
            "The requested label claims recommendation or optimization that E-03 does not perform.",
          ),
        ],
      ),
    };
  }
  if (evidence.propertyStateUse === "cold_properties_for_hot_target") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.target_property_state_unconfirmed",
        "Cold properties cannot stand in for the declared hot target state.",
        "Resolve rho and effective mu_r at the explicit target material state.",
        [
          warning(
            E03_WARNING_PREDICATES.coldPropertiesForHotState,
            "The supplied property-state evidence declares cold properties for a hot target state.",
          ),
        ],
      ),
    };
  }
  if (
    evidence.workpieceForm === "other_or_unknown" ||
    evidence.materialClass === "other_or_unknown" ||
    evidence.materialHomogeneity === "unknown" ||
    evidence.materialIsotropy === "unknown" ||
    evidence.constitutiveRegime === "unknown" ||
    evidence.propertyStateUse === "unconfirmed" ||
    evidence.intendedInterpretation === "other_or_unknown"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.applicability_unconfirmed",
        "At least one E-03 applicability predicate remains unconfirmed.",
        "Confirm the solid-cylinder geometry, material regime, target-state properties, and reference-only interpretation.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      workpieceForm: "solid_cylinder" as const,
      materialClass: evidence.materialClass as
        | "ferromagnetic"
        | "nonferromagnetic",
      materialHomogeneity: "homogeneous" as const,
      materialIsotropy: "isotropic" as const,
      constitutiveRegime: "effective_linear_good_conductor" as const,
      propertyStateUse: "confirmed_target_state" as const,
      intendedInterpretation: "reference_relation_not_optimum" as const,
    }),
  };
}

type CriterionResult =
  | {
      readonly ok: true;
      readonly evidence: Readonly<E03PenetrationCriterionEvidence>;
    }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validateCriterion(
  value: unknown,
  route: E03CalculationRoute,
): CriterionResult {
  const criterion = readExactPlainDataRecord(value, [
    "contractParameterId",
    "selection",
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "explicitlySelected",
    "sourceRef",
  ]);
  if (criterion === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-03.penetration_criterion_missing"
          : "E-03.penetration_criterion_invalid",
        missing
          ? "The penetration-criterion decision is missing; E-03 never injects the nominal value 2."
          : "Penetration-criterion evidence must be an exact controlled plain-data record.",
        "Explicitly select the frozen historical Pi_D=2 criterion for f_ref, or explicitly mark it unused for the Pi_D route.",
      ),
    };
  }
  if (
    criterion.contractParameterId !== "penetration_criterion" ||
    (criterion.selection !== "historical_pi_d_equals_2" &&
      criterion.selection !== "not_used_penetration_parameter_route" &&
      criterion.selection !== "unconfirmed") ||
    (criterion.valueSi !== 2 && criterion.valueSi !== null) ||
    criterion.dimensionId !== "dimensionless" ||
    criterion.canonicalUnitId !== "one" ||
    typeof criterion.explicitlySelected !== "boolean" ||
    (criterion.sourceRef !==
      "M04:PDF2-3:PRINT72-73:eq1-5" &&
      criterion.sourceRef !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.penetration_criterion_invalid",
        "Penetration-criterion evidence contains an uncontrolled identity, value, unit, or source.",
        "Use an explicit controlled criterion decision; arbitrary penetration criteria are not approved.",
      ),
    };
  }
  if (criterion.selection === "unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.penetration_criterion_unconfirmed",
        "The E-03 penetration criterion remains unconfirmed.",
        "Explicitly select the historical Pi_D=2 scenario before calculating f_ref.",
      ),
    };
  }
  if (route === "reference_frequency_for_historical_pi_d_2") {
    if (
      criterion.selection !== "historical_pi_d_equals_2" ||
      criterion.valueSi !== 2 ||
      criterion.explicitlySelected !== true ||
      criterion.sourceRef !== "M04:PDF2-3:PRINT72-73:eq1-5"
    ) {
      return {
        ok: false,
        failure: failure(
          "not_applicable",
          "E-03.penetration_criterion_not_approved",
          "The f_ref route is approved only for an explicitly selected Pi_D=2 historical reference scenario.",
          "Do not infer or optimize another criterion; obtain separate approval for a different scenario.",
        ),
      };
    }
  } else if (
    criterion.selection !== "not_used_penetration_parameter_route" ||
    criterion.valueSi !== null ||
    criterion.explicitlySelected !== true ||
    criterion.sourceRef !== null
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.penetration_criterion_invalid",
        "The Pi_D route derives the actual penetration parameter from E-01 depth evidence and must not silently apply a design criterion.",
        "Explicitly mark penetration_criterion as unused for this route.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      contractParameterId: "penetration_criterion" as const,
      selection: criterion.selection as
        | "historical_pi_d_equals_2"
        | "not_used_penetration_parameter_route",
      valueSi: criterion.valueSi as 2 | null,
      dimensionId: "dimensionless" as const,
      canonicalUnitId: "one" as const,
      explicitlySelected: true,
      sourceRef: criterion.sourceRef as
        | "M04:PDF2-3:PRINT72-73:eq1-5"
        | null,
    }),
  };
}

type SkinDepthEvidenceResult =
  | {
      readonly ok: true;
      readonly evidence: Readonly<E03E01SkinDepthEvidence>;
    }
  | {
      readonly ok: false;
      readonly failure: E03PenetrationReferenceFrequencyFailure;
    };

function validateSkinDepthEvidence(
  value: unknown,
  geometry: Readonly<E03GeometryEvidence>,
  target: Readonly<E03TargetMaterialState>,
  resistivity: Readonly<E03PropertySnapshot>,
  permeability: Readonly<E03PropertySnapshot>,
): SkinDepthEvidenceResult {
  const evidence = readExactPlainDataRecord(value, [
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceOutcome",
    "sourceResultId",
    "skinDepthM",
    "frequencyHz",
    "interpretation",
    "isThermalAffectedDepth",
    "materialSnapshotId",
    "materialStateId",
    "temperatureK",
    "fieldStrengthApm",
    "phaseOrMicrostructureId",
    "geometrySnapshotId",
    "resistivityOhmM",
    "relativePermeability",
    "stateMappingStatus",
  ]);
  if (evidence === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-03.skin_depth_evidence_missing"
          : "E-03.skin_depth_evidence_invalid",
        missing
          ? "The Pi_D route requires a successful E-01 skin-depth result at the same material and geometry snapshots."
          : "E-01 skin-depth evidence must be an exact controlled plain-data record.",
        "Provide a versioned successful E-01 result; E-03 does not infer frequency or skin depth.",
      ),
    };
  }
  if (
    evidence.sourceMethodId !== "E-01" ||
    evidence.sourceMethodVersion !== E01_SPECIFICATION.methodVersion ||
    evidence.sourceOutcome !== "success" ||
    !isNonBlankControlledString(evidence.sourceResultId) ||
    typeof evidence.skinDepthM !== "number" ||
    !Number.isFinite(evidence.skinDepthM) ||
    evidence.skinDepthM <= 0 ||
    typeof evidence.frequencyHz !== "number" ||
    !Number.isFinite(evidence.frequencyHz) ||
    evidence.frequencyHz <= 0 ||
    evidence.interpretation !==
      "electromagnetic_field_amplitude_1_over_e_depth" ||
    evidence.isThermalAffectedDepth !== false ||
    !isContentAddressedSnapshotId(
      evidence.materialSnapshotId,
      "material",
    ) ||
    !isNonBlankControlledString(evidence.materialStateId) ||
    typeof evidence.temperatureK !== "number" ||
    !Number.isFinite(evidence.temperatureK) ||
    evidence.temperatureK <= 0 ||
    (evidence.fieldStrengthApm !== null &&
      (typeof evidence.fieldStrengthApm !== "number" ||
        !Number.isFinite(evidence.fieldStrengthApm) ||
        evidence.fieldStrengthApm < 0)) ||
    !isNonBlankControlledString(evidence.phaseOrMicrostructureId) ||
    !isContentAddressedSnapshotId(
      evidence.geometrySnapshotId,
      "geometry",
    ) ||
    typeof evidence.resistivityOhmM !== "number" ||
    !Number.isFinite(evidence.resistivityOhmM) ||
    evidence.resistivityOhmM <= 0 ||
    typeof evidence.relativePermeability !== "number" ||
    !Number.isFinite(evidence.relativePermeability) ||
    evidence.relativePermeability <= 0 ||
    (evidence.stateMappingStatus !==
      "confirmed_same_target_and_geometry_snapshots" &&
      evidence.stateMappingStatus !== "unconfirmed")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.skin_depth_evidence_invalid",
        "E-01 skin-depth evidence contains an uncontrolled, non-finite, non-positive, unversioned, or mislabelled field.",
        "Use a successful E-01 electromagnetic 1/e depth with complete same-snapshot provenance.",
      ),
    };
  }
  if (evidence.stateMappingStatus === "unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-03.skin_depth_state_mismatch",
        "The E-01 skin-depth result is not confirmed for the E-03 target and geometry snapshots.",
        "Resolve a same-state, same-geometry E-01 result before calculating Pi_D.",
      ),
    };
  }
  if (
    evidence.materialSnapshotId !== target.materialSnapshotId ||
    evidence.materialStateId !== target.materialStateId ||
    evidence.temperatureK !== target.temperatureK ||
    evidence.fieldStrengthApm !== target.fieldStrengthApm ||
    evidence.frequencyHz !== target.frequencyHz ||
    evidence.phaseOrMicrostructureId !== target.phaseOrMicrostructureId ||
    evidence.geometrySnapshotId !== geometry.geometrySnapshotId ||
    evidence.resistivityOhmM !== resistivity.valueSi ||
    evidence.relativePermeability !== permeability.valueSi
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.skin_depth_state_mismatch",
        "The E-01 skin-depth evidence values do not match the declared E-03 material, point-frequency, or geometry snapshots.",
        "Use immutable values copied from one E-01 result and the exact E-03 target/geometry snapshots.",
      ),
    };
  }

  const absolutePermeability =
    E03_VACUUM_PERMEABILITY_H_PER_M * permeability.valueSi;
  const denominator =
    Math.PI * evidence.frequencyHz * absolutePermeability;
  const radicand = resistivity.valueSi / denominator;
  const expectedSkinDepthM = Math.sqrt(radicand);
  if (
    !Number.isFinite(absolutePermeability) ||
    absolutePermeability <= 0 ||
    !Number.isFinite(denominator) ||
    denominator <= 0 ||
    !Number.isFinite(radicand) ||
    radicand <= 0 ||
    !Number.isFinite(expectedSkinDepthM) ||
    expectedSkinDepthM <= 0 ||
    evidence.skinDepthM !== expectedSkinDepthM
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-03.skin_depth_evidence_invalid",
        "The claimed successful E-01 depth does not exactly reproduce E-01 from the bound inputs at binary64 resolution.",
        "Provide the unmodified E-01 result; no uncertainty or engineering tolerance is inferred for snapshot identity.",
      ),
    };
  }

  return {
    ok: true,
    evidence: Object.freeze({
      sourceMethodId: "E-01" as const,
      sourceMethodVersion: E01_SPECIFICATION.methodVersion,
      sourceOutcome: "success" as const,
      sourceResultId: evidence.sourceResultId,
      skinDepthM: evidence.skinDepthM,
      frequencyHz: evidence.frequencyHz,
      interpretation:
        "electromagnetic_field_amplitude_1_over_e_depth" as const,
      isThermalAffectedDepth: false as const,
      materialSnapshotId: evidence.materialSnapshotId,
      materialStateId: evidence.materialStateId,
      temperatureK: evidence.temperatureK,
      fieldStrengthApm: evidence.fieldStrengthApm as number | null,
      phaseOrMicrostructureId: evidence.phaseOrMicrostructureId,
      geometrySnapshotId: evidence.geometrySnapshotId,
      resistivityOhmM: evidence.resistivityOhmM,
      relativePermeability: evidence.relativePermeability,
      stateMappingStatus:
        "confirmed_same_target_and_geometry_snapshots" as const,
    }),
  };
}

function positiveFromNaturalLog(logValue: number): number | null {
  if (!Number.isFinite(logValue)) {
    return null;
  }
  const value = Math.exp(logValue);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function identityCheck(
  identityId: E03IdentityCheck["identityId"],
  actualSi: number,
  referenceSi: number,
): E03IdentityCheck | null {
  if (!isWithinTolId(actualSi, referenceSi)) {
    return null;
  }
  const absoluteResidualSi = Math.abs(actualSi - referenceSi);
  if (!Number.isFinite(absoluteResidualSi)) {
    return null;
  }
  return Object.freeze({
    identityId,
    actualSi,
    referenceSi,
    absoluteResidualSi,
    toleranceId: TOL_ID.id,
    tolerancePurpose: "synthetic_identity_only",
    passed: true,
  });
}

const COMMON_UNITS = Object.freeze({
  diameter: "m" as const,
  skinDepth: "m" as const,
  resistivity: "ohm_m" as const,
  relativePermeability: "one" as const,
  penetrationParameter: "one" as const,
  referenceFrequency: "Hz" as const,
  dimensionalIdentity: "(ohm*m)/((H/m)*m^2)=1/s=Hz" as const,
});

const COMMON_ASSUMPTIONS = Object.freeze([
  "solid homogeneous isotropic cylinder",
  "effective linear good-conductor material properties at one explicit target state",
  "Pi_D is a penetration reference relation, not a process optimum",
  "no thin-wall, thermal-diffusion, power-density, heating-time, supply-capability, or Curie optimization model",
] as const);

function penetrationOutput(valueSi: number): E03PenetrationParameterOutput {
  return Object.freeze({
    kind: "available",
    outputId: "Pi_D",
    status: "available",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    interpretation:
      "solid_cylinder_diameter_to_twice_electromagnetic_skin_depth",
    isRecommendedFrequencyCriterion: false,
    isOptimumCriterion: false,
  });
}

function skinDepthOutput(
  outputId: E03SkinDepthTraceOutput["outputId"],
  valueSi: number,
): E03SkinDepthTraceOutput {
  return Object.freeze({
    kind: "available",
    outputId,
    status: "available",
    valueSi,
    dimensionId: "length",
    canonicalUnitId: "m",
    interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
  });
}

/** Evaluate E-03 using exact canonical-SI and snapshot-bound evidence. */
export function evaluateE03PenetrationReferenceFrequency(
  input: unknown,
): E03PenetrationReferenceFrequencyOutcome {
  const expectedKeys = [
    "route",
    "diameterM",
    "geometryEvidence",
    "targetState",
    "resistivitySnapshot",
    "relativePermeabilitySnapshot",
    "penetrationCriterion",
    "skinDepthEvidence",
    "applicability",
  ] as const;
  const controlledInput = readExactPlainDataRecord(input, expectedKeys);
  if (controlledInput === null) {
    const withoutCriterion = readExactPlainDataRecord(
      input,
      expectedKeys.filter((key) => key !== "penetrationCriterion"),
    );
    if (withoutCriterion !== null) {
      return failure(
        "insufficient_data",
        "E-03.penetration_criterion_missing",
        "penetration_criterion was omitted; the nominal Pi_D=2 scenario is never inserted as a hidden default.",
        "Provide an explicit controlled criterion decision for either E-03 route.",
      );
    }
    return failure(
      "invalid_input",
      "E-03.input_schema_invalid",
      "E-03 input must be an exact controlled canonical-SI plain-data record.",
      "Remove extra fields and provide every route, snapshot, criterion, dependency, and applicability field.",
    );
  }
  if (
    controlledInput.route !== "penetration_parameter_from_e01_depth" &&
    controlledInput.route !==
      "reference_frequency_for_historical_pi_d_2"
  ) {
    return failure(
      "invalid_input",
      "E-03.calculation_route_invalid",
      "E-03 calculation route contains an uncontrolled value.",
      "Select the explicit Pi_D-from-E-01 or historical-Pi_D=2 f_ref route.",
    );
  }
  const route = controlledInput.route;
  if (
    typeof controlledInput.diameterM !== "number" ||
    !Number.isFinite(controlledInput.diameterM) ||
    controlledInput.diameterM <= 0
  ) {
    return failure(
      "invalid_input",
      "E-03.diameter_invalid",
      "E-03 requires a positive finite solid-cylinder diameter in canonical SI metres.",
      "Provide the snapshot-bound workpiece.outer_diameter without a hidden unit conversion.",
    );
  }

  const geometryResult = validateGeometry(
    controlledInput.geometryEvidence,
    controlledInput.diameterM,
  );
  if (!geometryResult.ok) {
    return geometryResult.failure;
  }
  const applicabilityResult = validateApplicability(
    controlledInput.applicability,
    geometryResult.evidence.workpieceForm,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.failure;
  }
  const targetStateResult = validateTargetState(controlledInput.targetState);
  if (!targetStateResult.ok) {
    return targetStateResult.failure;
  }
  const resistivityResult = validatePropertySnapshot(
    controlledInput.resistivitySnapshot,
    "electrical_resistivity",
  );
  if (!resistivityResult.ok) {
    return resistivityResult.failure;
  }
  const permeabilityResult = validatePropertySnapshot(
    controlledInput.relativePermeabilitySnapshot,
    "relative_permeability",
  );
  if (!permeabilityResult.ok) {
    return permeabilityResult.failure;
  }
  if (
    resistivityResult.snapshot.dataQuality === "unknown" ||
    permeabilityResult.snapshot.dataQuality === "unknown" ||
    resistivityResult.snapshot.stateMatch !== "confirmed_for_target_state" ||
    permeabilityResult.snapshot.stateMatch !== "confirmed_for_target_state"
  ) {
    return failure(
      "insufficient_data",
      "E-03.property_provenance_insufficient",
      "E-03 property quality or target-state provenance is unknown or unconfirmed.",
      "Resolve both A-01 property snapshots at the declared target material state.",
    );
  }
  if (
    !propertyMatchesTarget(
      resistivityResult.snapshot,
      targetStateResult.evidence,
    ) ||
    !propertyMatchesTarget(
      permeabilityResult.snapshot,
      targetStateResult.evidence,
    )
  ) {
    return failure(
      "insufficient_data",
      "E-03.property_state_mismatch",
      "rho and effective mu_r do not share the declared content-addressed target material snapshot, revision, temperature, field, and phase state.",
      "Resolve same-state A-01 properties; do not combine cold, hot, phase-mismatched, or different-material values.",
    );
  }
  if (
    applicabilityResult.evidence.materialClass === "ferromagnetic" &&
    targetStateResult.evidence.fieldStrengthApm === null
  ) {
    return failure(
      "insufficient_data",
      "E-03.ferromagnetic_field_state_missing",
      "Ferromagnetic effective mu_r requires an explicit field-strength state.",
      "Resolve rho and effective mu_r at an explicit target T, H, and phase state.",
    );
  }

  const criterionResult = validateCriterion(
    controlledInput.penetrationCriterion,
    route,
  );
  if (!criterionResult.ok) {
    return criterionResult.failure;
  }

  const logDiameter = Math.log(controlledInput.diameterM);
  const logResistivity = Math.log(resistivityResult.snapshot.valueSi);
  const logRelativePermeability = Math.log(
    permeabilityResult.snapshot.valueSi,
  );
  const logVacuumPermeability = Math.log(
    E03_VACUUM_PERMEABILITY_H_PER_M,
  );
  if (
    !Number.isFinite(logDiameter) ||
    !Number.isFinite(logResistivity) ||
    !Number.isFinite(logRelativePermeability) ||
    !Number.isFinite(logVacuumPermeability)
  ) {
    return failure(
      "invalid_input",
      "E-03.numeric_resolution_invalid",
      "A positive E-03 input could not be represented in logarithmic binary64 scaling.",
      "Use finite representable canonical-SI geometry and properties.",
    );
  }

  const commonEvidence = {
    geometry: geometryResult.evidence,
    targetState: targetStateResult.evidence,
    resistivitySnapshot: resistivityResult.snapshot,
    relativePermeabilitySnapshot: permeabilityResult.snapshot,
    criterion: criterionResult.evidence,
    applicability: applicabilityResult.evidence,
    sourceUnitDisposition: E03_SOURCE_UNIT_DISPOSITION,
    sourceRefs: E03_SOURCE_REFS,
    contractSourceRefs: E03_CONTRACT_SOURCE_REFS,
    derivationRefs: E03_DERIVATION_REFS,
    validationCaseIds: E03_VALIDATION_CASE_IDS,
    methodCheckIds: E03_METHOD_CHECK_IDS,
    units: COMMON_UNITS,
    assumptions: COMMON_ASSUMPTIONS,
  } as const;

  if (route === "penetration_parameter_from_e01_depth") {
    const skinDepthResult = validateSkinDepthEvidence(
      controlledInput.skinDepthEvidence,
      geometryResult.evidence,
      targetStateResult.evidence,
      resistivityResult.snapshot,
      permeabilityResult.snapshot,
    );
    if (!skinDepthResult.ok) {
      return skinDepthResult.failure;
    }
    const logSkinDepth = Math.log(skinDepthResult.evidence.skinDepthM);
    const logFrequency = Math.log(skinDepthResult.evidence.frequencyHz);
    const penetrationParameter = positiveFromNaturalLog(
      logDiameter - Math.log(2) - logSkinDepth,
    );
    const penetrationFromMaterialEquation = positiveFromNaturalLog(
      logDiameter -
        Math.log(2) +
        0.5 *
          (Math.log(Math.PI) +
            logFrequency +
            logVacuumPermeability +
            logRelativePermeability -
            logResistivity),
    );
    if (
      !Number.isFinite(logSkinDepth) ||
      !Number.isFinite(logFrequency) ||
      penetrationParameter === null ||
      penetrationFromMaterialEquation === null
    ) {
      return failure(
        "invalid_input",
        "E-03.numeric_resolution_invalid",
        "The positive Pi_D route underflowed, overflowed, or became non-finite at binary64 resolution.",
        "Use representable same-snapshot diameter, frequency, and E-01 depth values.",
      );
    }
    const identities = [
      identityCheck(
        "Pi_D_from_E01_depth_matches_material_equation",
        penetrationParameter,
        penetrationFromMaterialEquation,
      ),
      identityCheck(
        "Pi_D_equals_D_over_2delta",
        penetrationParameter,
        positiveFromNaturalLog(
          logDiameter - Math.log(2) - logSkinDepth,
        ) ?? Number.NaN,
      ),
    ];
    if (identities.some((identity) => identity === null)) {
      return failure(
        "invalid_input",
        "E-03.identity_check_failed",
        "The E-03 penetration-parameter synthetic identities did not close under TOL-ID.",
        "Resolve the exact E-01 depth and bound property snapshots; TOL-ID is not a physical uncertainty allowance.",
      );
    }
    const frozenIdentities = Object.freeze(
      identities as E03IdentityCheck[],
    );
    const value = Object.freeze({
      route,
      penetrationParameter: penetrationOutput(penetrationParameter),
      skinDepth: skinDepthOutput(
        "delta_from_E01",
        skinDepthResult.evidence.skinDepthM,
      ),
      frequencyHz: skinDepthResult.evidence.frequencyHz,
    }) as E03PenetrationParameterValue;
    const evidence = Object.freeze({
      ...commonEvidence,
      route,
      equation:
        "Pi_D=D/(2*delta_E01); delta_E01=sqrt(rho/(pi*f*mu0*mu_r))" as const,
      skinDepthEvidence: skinDepthResult.evidence,
      identities: frozenIdentities,
    }) as E03PenetrationEvidence;
    return Object.freeze({
      methodId: E03_METHOD_ID,
      methodVersion: E03_METHOD_VERSION,
      methodApproval: "approved_with_limitation",
      status: "success",
      applicabilityStatus: "in_domain",
      warningIds: EMPTY_WARNING_IDS,
      warnings: EMPTY_WARNINGS,
      value,
      evidence,
    });
  }

  if (controlledInput.skinDepthEvidence !== null) {
    return failure(
      "invalid_input",
      "E-03.skin_depth_route_conflict",
      "The f_ref route received an E-01 depth even though its frequency is solved from the explicitly selected criterion.",
      "Use null for skinDepthEvidence on the f_ref route; the result trace will calculate its reference depth independently.",
    );
  }
  const criterion = criterionResult.evidence.valueSi;
  if (criterion !== 2) {
    return failure(
      "not_applicable",
      "E-03.penetration_criterion_not_approved",
      "Only the explicitly selected historical Pi_D=2 scenario is frozen for the f_ref route.",
      "Obtain separate approval before evaluating another penetration criterion.",
    );
  }
  const logCriterion = Math.log(criterion);
  const logReferenceFrequency =
    Math.log(4) +
    logResistivity +
    2 * logCriterion -
    Math.log(Math.PI) -
    logVacuumPermeability -
    logRelativePermeability -
    2 * logDiameter;
  const referenceFrequencyHz = positiveFromNaturalLog(
    logReferenceFrequency,
  );
  const referenceSkinDepthM = positiveFromNaturalLog(
    logDiameter - Math.log(2) - logCriterion,
  );
  if (referenceFrequencyHz === null || referenceSkinDepthM === null) {
    return failure(
      "invalid_input",
      "E-03.numeric_resolution_invalid",
      "The positive f_ref or reference depth underflowed, overflowed, or became non-finite at binary64 resolution.",
      "Use finite representable canonical-SI D, rho, and effective mu_r; no zero or infinite placeholder is published.",
    );
  }
  if (targetStateResult.evidence.frequencyHz !== referenceFrequencyHz) {
    return failure(
      "insufficient_data",
      "E-03.property_frequency_state_mismatch",
      "The solved f_ref does not exactly match the point frequency bound to the target-state rho and effective mu_r snapshots.",
      "Resolve both A-01 property values at the computed f_ref point and rerun E-03; this isolated method does not extrapolate or iterate material properties.",
    );
  }

  const deltaFromReferenceFrequency = positiveFromNaturalLog(
    0.5 *
      (logResistivity -
        Math.log(Math.PI) -
        Math.log(referenceFrequencyHz) -
        logVacuumPermeability -
        logRelativePermeability),
  );
  const penetrationReproduced =
    deltaFromReferenceFrequency === null
      ? null
      : positiveFromNaturalLog(
          logDiameter - Math.log(2) - Math.log(deltaFromReferenceFrequency),
        );

  const log100 = Math.log(100);
  const ohmCentimetreFrequencyHz = positiveFromNaturalLog(
    Math.log(
      E03_ENGINEERING_UNIT_COEFFICIENTS.ohmCentimetreForPiDEquals2,
    ) +
      (logResistivity + log100) -
      logRelativePermeability -
      2 * (logDiameter + log100),
  );
  const microOhmCentimetreFrequencyHz = positiveFromNaturalLog(
    Math.log(
      E03_ENGINEERING_UNIT_COEFFICIENTS.microOhmCentimetreForPiDEquals2,
    ) +
      (logResistivity + Math.log(1e8)) -
      logRelativePermeability -
      2 * (logDiameter + log100),
  );
  if (
    deltaFromReferenceFrequency === null ||
    penetrationReproduced === null ||
    ohmCentimetreFrequencyHz === null ||
    microOhmCentimetreFrequencyHz === null
  ) {
    return failure(
      "invalid_input",
      "E-03.numeric_resolution_invalid",
      "An E-03 cross-check or exact engineering-unit wrapper was not representable in binary64.",
      "Use representable canonical-SI inputs; printed rounded engineering coefficients are never substituted.",
    );
  }

  const identities = [
    identityCheck(
      "reference_delta_equals_D_over_2Pi_D",
      deltaFromReferenceFrequency,
      referenceSkinDepthM,
    ),
    identityCheck(
      "reference_frequency_reproduces_Pi_D",
      penetrationReproduced,
      criterion,
    ),
    identityCheck(
      "ohm_centimetre_wrapper_matches_SI",
      ohmCentimetreFrequencyHz,
      referenceFrequencyHz,
    ),
    identityCheck(
      "microohm_centimetre_wrapper_matches_SI",
      microOhmCentimetreFrequencyHz,
      referenceFrequencyHz,
    ),
  ];
  if (identities.some((identity) => identity === null)) {
    return failure(
      "invalid_input",
      "E-03.identity_check_failed",
      "The E-03 SI, skin-depth, or engineering-unit wrapper identities did not close under TOL-ID.",
      "Correct the canonical-SI route; TOL-ID is not an engineering precision or source-conflict tolerance.",
    );
  }
  const frozenIdentities = Object.freeze(
    identities as E03IdentityCheck[],
  );
  const value = Object.freeze({
    route,
    penetrationParameter: penetrationOutput(criterion),
    referenceFrequency: Object.freeze({
      kind: "available" as const,
      outputId: "fref" as const,
      status: "available" as const,
      valueSi: referenceFrequencyHz,
      dimensionId: "frequency" as const,
      canonicalUnitId: "Hz" as const,
      interpretation: "solid_cylinder_empirical_reference_frequency" as const,
      isRecommendedFrequency: false as const,
      isOptimumFrequency: false as const,
    }),
    skinDepth: skinDepthOutput(
      "delta_reference",
      referenceSkinDepthM,
    ),
  }) as E03ReferenceFrequencyValue;
  const evidence = Object.freeze({
    ...commonEvidence,
    route,
    equation:
      "f_ref=4*rho*Pi_D^2/(pi*mu0*mu_r*D^2); Pi_D=2" as const,
    identities: frozenIdentities,
    engineeringUnitWrappers: Object.freeze({
      ohmCentimetreFrequencyHz,
      microOhmCentimetreFrequencyHz,
      exactCoefficients: E03_ENGINEERING_UNIT_COEFFICIENTS,
      printedRoundedCoefficientsUsedForCalculation: false as const,
    }),
  }) as E03ReferenceFrequencyEvidence;
  return Object.freeze({
    methodId: E03_METHOD_ID,
    methodVersion: E03_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value,
    evidence,
  });
}
