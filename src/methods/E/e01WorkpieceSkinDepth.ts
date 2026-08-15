import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("E-01"));

export const E01_METHOD_ID = "E-01" as const;
export const E01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const E01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const E01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const E01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const E01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const E01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** CODATA22 value frozen by the E-01 registry source mapping. */
export const E01_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;

/** IEEE-754 machine boundary only; never an engineering/model threshold. */
export const E01_BINARY64_MIN_NORMAL = 2 ** -1022;

export const E01_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: E01_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const E01_WORKPIECE_SKIN_DEPTH_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: E01_SOURCE_REFS,
  contractSourceRefs: E01_CONTRACT_SOURCE_REFS,
  derivationRefs: E01_DERIVATION_REFS,
  validationCaseIds: E01_VALIDATION_CASE_IDS,
  methodCheckIds: E01_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: E01_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness:
    "isolated_non_activatable_validation_naming_conflict" as const,
  validationNamingConflict: Object.freeze({
    calculationBasisMethodCheckLabel: "E-SKIN-001" as const,
    calculationContractsAndRegistryMethodCheckIds: E01_METHOD_CHECK_IDS,
    registryValidationCaseIds: E01_VALIDATION_CASE_IDS,
    relatedValidationDocumentCaseId: "ELEC-SKIN-001" as const,
    resolution: "unresolved_no_alias_no_runtime_activation" as const,
  }),
});

const GEOMETRY_SCALE_PREDICATE =
  "t or R is comparable with a few skin depths" as const;
const SATURATION_OR_CURIE_PREDICATE =
  "magnetic saturation or Curie transition" as const;
const THIN_WALL_TWO_FACE_PREDICATE =
  "thin-wall fields act from both faces" as const;
const UNUSUAL_GEOMETRY_PREDICATE =
  "edge, end, slot or unusual geometry" as const;
const THERMAL_MISLABEL_PREDICATE =
  "electromagnetic skin depth is called thermal penetration depth" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `E-01 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const E01_WARNING_PREDICATES = Object.freeze({
  geometryComparableWithFewSkinDepths: controlledWarningPredicate(
    GEOMETRY_SCALE_PREDICATE,
  ),
  saturationOrCurie: controlledWarningPredicate(
    SATURATION_OR_CURIE_PREDICATE,
  ),
  thinWallTwoFaceField: controlledWarningPredicate(
    THIN_WALL_TWO_FACE_PREDICATE,
  ),
  edgeEndSlotOrUnusualGeometry: controlledWarningPredicate(
    UNUSUAL_GEOMETRY_PREDICATE,
  ),
  thermalMislabel: controlledWarningPredicate(THERMAL_MISLABEL_PREDICATE),
});

/**
 * The freeze says only "comparable with a few skin depths" and supplies no
 * numeric decision boundary. E-01 therefore reports ratios but never invents
 * an automatic warning threshold.
 */
export const E01_GEOMETRY_SCALE_WARNING_POLICY = Object.freeze({
  predicate: E01_WARNING_PREDICATES.geometryComparableWithFewSkinDepths,
  automationStatus: "not_automated_no_frozen_numeric_threshold" as const,
  reason:
    "The frozen method contains no numerical boundary for 'comparable with a few skin depths'.",
});

export type E01PropertyId =
  | "electrical_resistivity"
  | "relative_permeability";

export interface E01PropertySnapshot {
  readonly propertyId: E01PropertyId;
  /** Canonical-SI value: ohm metres for rho, dimensionless for mu_r. */
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistivity" | "dimensionless";
  readonly canonicalUnitId: "ohm_m" | "one";
  readonly materialId: string;
  readonly materialRevision: string;
  readonly propertyRevision: string;
  readonly materialStateId: string;
  readonly temperatureK: number;
  /** Field-strength magnitude in A/m; null is allowed only for nonferromagnets. */
  readonly fieldStrengthApm: number | null;
  readonly frequencyHz: number;
  readonly phaseOrMicrostructureId: string;
  readonly sourceRef: string;
  readonly sourceSnapshotId: string;
  readonly dataQuality: DataQuality;
  readonly stateMatch:
    | "confirmed_for_declared_state"
    | "unconfirmed_or_mismatched";
}

export interface E01CharacteristicGeometryEvidence {
  readonly characteristicThicknessM: number | null;
  readonly thicknessStatus: "available" | "not_applicable" | "missing";
  readonly characteristicRadiusM: number | null;
  readonly radiusStatus: "available" | "not_applicable" | "missing";
  readonly geometryMappingStatus:
    | "confirmed_to_workpiece_geometry"
    | "unconfirmed";
  readonly geometrySourceRef: string;
  readonly geometrySnapshotId: string;
}

export interface E01ApplicabilityEvidence {
  readonly materialClass:
    | "ferromagnetic"
    | "nonferromagnetic"
    | "other_or_unknown";
  readonly materialHomogeneity: "homogeneous" | "nonuniform" | "unknown";
  readonly materialIsotropy: "isotropic" | "anisotropic" | "unknown";
  readonly constitutiveRegime:
    | "linear_effective_good_conductor"
    | "nonlinear_or_saturated"
    | "unknown";
  readonly excitation:
    | "sinusoidal_steady_state"
    | "pulse_or_multiharmonic"
    | "unknown";
  readonly displacementCurrentRegime:
    | "negligible"
    | "not_negligible"
    | "unknown";
  readonly fieldGeometry:
    | "locally_planar_semi_infinite_reference"
    | "thin_wall_two_sided_fields"
    | "edge_end_slot_or_unusual_geometry"
    | "unknown";
  readonly curieState:
    | "outside_transition_and_unsaturated"
    | "at_or_near_curie_transition"
    | "not_applicable_nonferromagnetic"
    | "unknown";
  readonly intendedInterpretation:
    | "electromagnetic_amplitude_reference_depth"
    | "thermal_affected_depth";
}

export interface E01WorkpieceSkinDepthInput {
  /** Frozen fundamental frequency in canonical SI hertz. */
  readonly frequencyHz: number;
  readonly resistivitySnapshot: E01PropertySnapshot;
  readonly relativePermeabilitySnapshot: E01PropertySnapshot;
  /** Explicit null means that no mapped characteristic t or R is available. */
  readonly characteristicGeometry: E01CharacteristicGeometryEvidence | null;
  readonly applicability: E01ApplicabilityEvidence;
}

export interface E01AvailableSkinDepthOutput {
  readonly kind: "available";
  readonly outputId: "delta_w";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation: "electromagnetic_field_amplitude_1_over_e_depth";
  readonly isThermalAffectedDepth: false;
}

export interface E01AvailableGeometryRatioOutput {
  readonly kind: "available";
  readonly outputId: "t/delta" | "R/delta";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation:
    | "characteristic_thickness_to_skin_depth"
    | "characteristic_radius_to_skin_depth";
}

export interface E01UnavailableGeometryRatioOutput {
  readonly kind: "unavailable";
  readonly outputId: "t/delta" | "R/delta";
  readonly status: "not_applicable" | "insufficient_data";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface E01PropertyProvenanceOutput {
  readonly kind: "available";
  readonly outputId: "property provenance";
  readonly status: "available";
  readonly resistivitySnapshot: Readonly<E01PropertySnapshot>;
  readonly relativePermeabilitySnapshot: Readonly<E01PropertySnapshot>;
}

export interface E01WorkpieceSkinDepthValue {
  readonly deltaW: E01AvailableSkinDepthOutput;
  readonly thicknessToDelta:
    | E01AvailableGeometryRatioOutput
    | E01UnavailableGeometryRatioOutput;
  readonly radiusToDelta:
    | E01AvailableGeometryRatioOutput
    | E01UnavailableGeometryRatioOutput;
  readonly propertyProvenance: E01PropertyProvenanceOutput;
}

export interface E01Warning {
  readonly predicate:
    | typeof GEOMETRY_SCALE_PREDICATE
    | typeof SATURATION_OR_CURIE_PREDICATE
    | typeof THIN_WALL_TWO_FACE_PREDICATE
    | typeof UNUSUAL_GEOMETRY_PREDICATE
    | typeof THERMAL_MISLABEL_PREDICATE;
  readonly message: string;
}

export interface E01WorkpieceSkinDepthSuccess {
  readonly methodId: typeof E01_METHOD_ID;
  readonly methodVersion: typeof E01_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly interpretationScope:
    | "direct_linear_reference"
    | "reference_only_due_to_declared_geometry_or_curie_state";
  readonly warningIds: readonly [];
  readonly warnings: readonly E01Warning[];
  readonly value: E01WorkpieceSkinDepthValue;
  readonly equation: "delta_w = sqrt(rho_w / (pi * f * mu0 * mu_r_w))";
  readonly substitution: Readonly<{
    readonly resistivityOhmM: number;
    readonly frequencyHz: number;
    readonly vacuumPermeabilityHPerM: number;
    readonly relativePermeability: number;
    readonly absolutePermeabilityHPerM: number;
    readonly denominator: number;
    readonly radicandM2: number;
  }>;
  readonly applicability: Readonly<E01ApplicabilityEvidence>;
  readonly characteristicGeometry:
    | Readonly<E01CharacteristicGeometryEvidence>
    | null;
  readonly geometryScaleWarningPolicy: typeof E01_GEOMETRY_SCALE_WARNING_POLICY;
  readonly numericRepresentabilityPolicy:
    typeof E01_NUMERIC_REPRESENTABILITY_POLICY;
  readonly sourceRefs: typeof E01_SOURCE_REFS;
  readonly contractSourceRefs: typeof E01_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof E01_DERIVATION_REFS;
  readonly validationCaseIds: typeof E01_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof E01_METHOD_CHECK_IDS;
  readonly units: Readonly<{
    readonly resistivity: "ohm_m";
    readonly frequency: "Hz";
    readonly permeability: "H_per_m";
    readonly skinDepth: "m";
    readonly geometryRatio: "one";
    readonly dimensionalIdentity: "sqrt((ohm*m)/(Hz*(H/m)))=m";
  }>;
  readonly assumptions: readonly [
    "linear homogeneous isotropic good conductor",
    "sinusoidal steady state with negligible displacement current",
    "delta_w is a locally planar semi-infinite electromagnetic amplitude scale",
    "rho and effective mu_r are explicit A-01 snapshots at one material, temperature, field, frequency, and phase state",
    "delta_w is not a thermal affected depth",
  ];
  readonly failure?: never;
}

export type E01FailureCode =
  | "E-01.input_schema_invalid"
  | "E-01.frequency_invalid"
  | "E-01.property_snapshot_missing"
  | "E-01.property_snapshot_schema_invalid"
  | "E-01.property_snapshot_invalid"
  | "E-01.property_provenance_insufficient"
  | "E-01.property_state_mismatch"
  | "E-01.ferromagnetic_field_state_missing"
  | "E-01.applicability_evidence_missing"
  | "E-01.applicability_evidence_invalid"
  | "E-01.applicability_state_inconsistent"
  | "E-01.applicability_unconfirmed"
  | "E-01.method_regime_not_applicable"
  | "E-01.thermal_interpretation_not_applicable"
  | "E-01.geometry_evidence_schema_invalid"
  | "E-01.geometry_evidence_invalid"
  | "E-01.numeric_resolution_invalid";

export interface E01WorkpieceSkinDepthFailure {
  readonly methodId: typeof E01_METHOD_ID;
  readonly methodVersion: typeof E01_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly E01Warning[];
  readonly failure: Readonly<{
    readonly code: E01FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type E01WorkpieceSkinDepthOutcome =
  | E01WorkpieceSkinDepthSuccess
  | E01WorkpieceSkinDepthFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly E01Warning[];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= E01_BINARY64_MIN_NORMAL;
}

function e01Warning(
  predicate: E01Warning["predicate"],
  message: string,
): E01Warning {
  return Object.freeze({ predicate, message });
}

function failure(
  status: E01WorkpieceSkinDepthFailure["status"],
  code: E01FailureCode,
  message: string,
  action: string,
  warnings: readonly E01Warning[] = EMPTY_WARNINGS,
): E01WorkpieceSkinDepthFailure {
  return Object.freeze({
    methodId: E01_METHOD_ID,
    methodVersion: E01_METHOD_VERSION,
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

function validatePropertySnapshot(
  value: unknown,
  expectedPropertyId: E01PropertyId,
):
  | { readonly ok: true; readonly snapshot: Readonly<E01PropertySnapshot> }
  | { readonly ok: false; readonly failure: E01WorkpieceSkinDepthFailure } {
  const snapshot = readExactPlainDataRecord(value, [
    "propertyId",
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "materialId",
    "materialRevision",
    "propertyRevision",
    "materialStateId",
    "temperatureK",
    "fieldStrengthApm",
    "frequencyHz",
    "phaseOrMicrostructureId",
    "sourceRef",
    "sourceSnapshotId",
    "dataQuality",
    "stateMatch",
  ]);
  if (snapshot === null) {
    const missing = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-01.property_snapshot_missing"
          : "E-01.property_snapshot_schema_invalid",
        missing
          ? `E-01 requires an explicit ${expectedPropertyId} property snapshot.`
          : "E-01 property snapshots must be exact controlled plain-data records without accessors or extra fields.",
        "Resolve A-01 property values with explicit material, state, source, revision, and data-quality provenance.",
      ),
    };
  }
  const expectedDimension =
    expectedPropertyId === "electrical_resistivity"
      ? "electrical_resistivity"
      : "dimensionless";
  const expectedUnit =
    expectedPropertyId === "electrical_resistivity" ? "ohm_m" : "one";
  if (
    snapshot.propertyId !== expectedPropertyId ||
    typeof snapshot.valueSi !== "number" ||
    !Number.isFinite(snapshot.valueSi) ||
    snapshot.valueSi <= 0 ||
    snapshot.dimensionId !== expectedDimension ||
    snapshot.canonicalUnitId !== expectedUnit ||
    !isNonBlankControlledString(snapshot.materialId) ||
    !isNonBlankControlledString(snapshot.materialRevision) ||
    !isNonBlankControlledString(snapshot.propertyRevision) ||
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
    !isContentAddressedSnapshotId(snapshot.sourceSnapshotId, "material") ||
    !isDataQuality(snapshot.dataQuality) ||
    (snapshot.stateMatch !== "confirmed_for_declared_state" &&
      snapshot.stateMatch !== "unconfirmed_or_mismatched")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-01.property_snapshot_invalid",
        `The E-01 ${expectedPropertyId} snapshot has an uncontrolled, non-SI, non-finite, non-positive, or incomplete provenance field.`,
        "Use the frozen property identity and canonical unit with positive finite values and explicit state/source metadata.",
      ),
    };
  }
  return {
    ok: true,
    snapshot: Object.freeze({
      propertyId: snapshot.propertyId,
      valueSi: snapshot.valueSi,
      dimensionId: snapshot.dimensionId,
      canonicalUnitId: snapshot.canonicalUnitId,
      materialId: snapshot.materialId,
      materialRevision: snapshot.materialRevision,
      propertyRevision: snapshot.propertyRevision,
      materialStateId: snapshot.materialStateId,
      temperatureK: snapshot.temperatureK,
      fieldStrengthApm: snapshot.fieldStrengthApm,
      frequencyHz: snapshot.frequencyHz,
      phaseOrMicrostructureId: snapshot.phaseOrMicrostructureId,
      sourceRef: snapshot.sourceRef,
      sourceSnapshotId: snapshot.sourceSnapshotId,
      dataQuality: snapshot.dataQuality,
      stateMatch: snapshot.stateMatch,
    }) as Readonly<E01PropertySnapshot>,
  };
}

function validateApplicability(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly evidence: Readonly<E01ApplicabilityEvidence>;
      readonly warnings: readonly E01Warning[];
    }
  | { readonly ok: false; readonly failure: E01WorkpieceSkinDepthFailure } {
  const evidence = readExactPlainDataRecord(value, [
    "materialClass",
    "materialHomogeneity",
    "materialIsotropy",
    "constitutiveRegime",
    "excitation",
    "displacementCurrentRegime",
    "fieldGeometry",
    "curieState",
    "intendedInterpretation",
  ]);
  if (evidence === null) {
    const missing = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "E-01.applicability_evidence_missing"
          : "E-01.applicability_evidence_invalid",
        missing
          ? "E-01 requires explicit material, constitutive, excitation, field-geometry, Curie, and interpretation evidence."
          : "E-01 applicability evidence must be an exact controlled plain-data record.",
        "Provide every frozen E-01 applicability field without defaults or coercion.",
      ),
    };
  }
  if (
    (evidence.materialClass !== "ferromagnetic" &&
      evidence.materialClass !== "nonferromagnetic" &&
      evidence.materialClass !== "other_or_unknown") ||
    (evidence.materialHomogeneity !== "homogeneous" &&
      evidence.materialHomogeneity !== "nonuniform" &&
      evidence.materialHomogeneity !== "unknown") ||
    (evidence.materialIsotropy !== "isotropic" &&
      evidence.materialIsotropy !== "anisotropic" &&
      evidence.materialIsotropy !== "unknown") ||
    (evidence.constitutiveRegime !== "linear_effective_good_conductor" &&
      evidence.constitutiveRegime !== "nonlinear_or_saturated" &&
      evidence.constitutiveRegime !== "unknown") ||
    (evidence.excitation !== "sinusoidal_steady_state" &&
      evidence.excitation !== "pulse_or_multiharmonic" &&
      evidence.excitation !== "unknown") ||
    (evidence.displacementCurrentRegime !== "negligible" &&
      evidence.displacementCurrentRegime !== "not_negligible" &&
      evidence.displacementCurrentRegime !== "unknown") ||
    (evidence.fieldGeometry !==
      "locally_planar_semi_infinite_reference" &&
      evidence.fieldGeometry !== "thin_wall_two_sided_fields" &&
      evidence.fieldGeometry !== "edge_end_slot_or_unusual_geometry" &&
      evidence.fieldGeometry !== "unknown") ||
    (evidence.curieState !== "outside_transition_and_unsaturated" &&
      evidence.curieState !== "at_or_near_curie_transition" &&
      evidence.curieState !== "not_applicable_nonferromagnetic" &&
      evidence.curieState !== "unknown") ||
    (evidence.intendedInterpretation !==
      "electromagnetic_amplitude_reference_depth" &&
      evidence.intendedInterpretation !== "thermal_affected_depth")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-01.applicability_evidence_invalid",
        "E-01 applicability evidence contains an uncontrolled value.",
        "Use the frozen E-01 applicability enumeration without string coercion.",
      ),
    };
  }
  const controlledEvidence = Object.freeze({
    materialClass: evidence.materialClass,
    materialHomogeneity: evidence.materialHomogeneity,
    materialIsotropy: evidence.materialIsotropy,
    constitutiveRegime: evidence.constitutiveRegime,
    excitation: evidence.excitation,
    displacementCurrentRegime: evidence.displacementCurrentRegime,
    fieldGeometry: evidence.fieldGeometry,
    curieState: evidence.curieState,
    intendedInterpretation: evidence.intendedInterpretation,
  }) as Readonly<E01ApplicabilityEvidence>;

  if (
    (controlledEvidence.materialClass === "ferromagnetic" &&
      controlledEvidence.curieState ===
        "not_applicable_nonferromagnetic") ||
    (controlledEvidence.materialClass === "nonferromagnetic" &&
      controlledEvidence.curieState !== "not_applicable_nonferromagnetic")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-01.applicability_state_inconsistent",
        "The declared material class conflicts with the Curie-state enumeration.",
        "Use a ferromagnetic Curie state or the explicit nonferromagnetic not-applicable state as appropriate.",
      ),
    };
  }
  if (controlledEvidence.intendedInterpretation === "thermal_affected_depth") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-01.thermal_interpretation_not_applicable",
        "E-01 produces an electromagnetic 1/e amplitude scale, not a thermal affected depth.",
        "Use a thermal diffusion or coupled heating model for thermal affected depth.",
        [
          e01Warning(
            E01_WARNING_PREDICATES.thermalMislabel,
            "The requested interpretation incorrectly labels electromagnetic skin depth as thermal penetration depth.",
          ),
        ],
      ),
    };
  }
  if (
    controlledEvidence.materialClass === "other_or_unknown" ||
    controlledEvidence.materialHomogeneity === "unknown" ||
    controlledEvidence.materialIsotropy === "unknown" ||
    controlledEvidence.constitutiveRegime === "unknown" ||
    controlledEvidence.excitation === "unknown" ||
    controlledEvidence.displacementCurrentRegime === "unknown" ||
    controlledEvidence.fieldGeometry === "unknown" ||
    controlledEvidence.curieState === "unknown"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "E-01.applicability_unconfirmed",
        "At least one E-01 applicability predicate remains unconfirmed.",
        "Resolve material class, homogeneity, isotropy, constitutive regime, excitation, displacement current, geometry, and Curie state.",
      ),
    };
  }
  if (
    controlledEvidence.materialHomogeneity !== "homogeneous" ||
    controlledEvidence.materialIsotropy !== "isotropic" ||
    controlledEvidence.excitation !== "sinusoidal_steady_state" ||
    controlledEvidence.displacementCurrentRegime !== "negligible"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-01.method_regime_not_applicable",
        "E-01 requires a homogeneous isotropic good conductor, sinusoidal steady state, and negligible displacement current.",
        "Select a method matching the declared workpiece and excitation regime.",
      ),
    };
  }
  if (controlledEvidence.constitutiveRegime !== "linear_effective_good_conductor") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "E-01.method_regime_not_applicable",
        "E-01 is not applicable to a nonlinear or magnetically saturated constitutive state.",
        "Use a state-dependent nonlinear electromagnetic model or validated FEM.",
        [
          e01Warning(
            E01_WARNING_PREDICATES.saturationOrCurie,
            "The declared constitutive regime is nonlinear or saturated.",
          ),
        ],
      ),
    };
  }

  const warnings: E01Warning[] = [];
  if (controlledEvidence.curieState === "at_or_near_curie_transition") {
    warnings.push(
      e01Warning(
        E01_WARNING_PREDICATES.saturationOrCurie,
        "The linear effective property snapshot is at or near a declared Curie transition; delta_w is reference-only.",
      ),
    );
  }
  if (controlledEvidence.fieldGeometry === "thin_wall_two_sided_fields") {
    warnings.push(
      e01Warning(
        E01_WARNING_PREDICATES.thinWallTwoFaceField,
        "Fields act from both faces of a thin wall; delta_w remains only a material reference scale.",
      ),
    );
  }
  if (
    controlledEvidence.fieldGeometry ===
    "edge_end_slot_or_unusual_geometry"
  ) {
    warnings.push(
      e01Warning(
        E01_WARNING_PREDICATES.edgeEndSlotOrUnusualGeometry,
        "Edge, end, slot, or unusual geometry invalidates a direct local-plane field interpretation; delta_w remains reference-only.",
      ),
    );
  }
  return {
    ok: true,
    evidence: controlledEvidence,
    warnings: Object.freeze(warnings),
  };
}

function validateGeometry(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly evidence: Readonly<E01CharacteristicGeometryEvidence> | null;
    }
  | { readonly ok: false; readonly failure: E01WorkpieceSkinDepthFailure } {
  if (value === null) {
    return { ok: true, evidence: null };
  }
  const geometry = readExactPlainDataRecord(value, [
    "characteristicThicknessM",
    "thicknessStatus",
    "characteristicRadiusM",
    "radiusStatus",
    "geometryMappingStatus",
    "geometrySourceRef",
    "geometrySnapshotId",
  ]);
  if (geometry === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-01.geometry_evidence_schema_invalid",
        "Supplied E-01 characteristic geometry must be an exact controlled plain-data record.",
        "Use explicit thickness/radius availability states and canonical-SI values, or null when no geometry is available.",
      ),
    };
  }
  if (
    (geometry.thicknessStatus !== "available" &&
      geometry.thicknessStatus !== "not_applicable" &&
      geometry.thicknessStatus !== "missing") ||
    (geometry.radiusStatus !== "available" &&
      geometry.radiusStatus !== "not_applicable" &&
      geometry.radiusStatus !== "missing") ||
    (geometry.geometryMappingStatus !==
      "confirmed_to_workpiece_geometry" &&
      geometry.geometryMappingStatus !== "unconfirmed") ||
    !isStrictSourceRef(geometry.geometrySourceRef) ||
    !isContentAddressedSnapshotId(
      geometry.geometrySnapshotId,
      "geometry",
    ) ||
    (geometry.thicknessStatus === "available"
      ? typeof geometry.characteristicThicknessM !== "number" ||
        !Number.isFinite(geometry.characteristicThicknessM) ||
        geometry.characteristicThicknessM <= 0
      : geometry.characteristicThicknessM !== null) ||
    (geometry.radiusStatus === "available"
      ? typeof geometry.characteristicRadiusM !== "number" ||
        !Number.isFinite(geometry.characteristicRadiusM) ||
        geometry.characteristicRadiusM <= 0
      : geometry.characteristicRadiusM !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "E-01.geometry_evidence_invalid",
        "E-01 geometry availability, mapping, source, and canonical-SI values are inconsistent or invalid.",
        "Use a finite positive value only with status=available; other statuses require explicit null.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      characteristicThicknessM: geometry.characteristicThicknessM,
      thicknessStatus: geometry.thicknessStatus,
      characteristicRadiusM: geometry.characteristicRadiusM,
      radiusStatus: geometry.radiusStatus,
      geometryMappingStatus: geometry.geometryMappingStatus,
      geometrySourceRef: geometry.geometrySourceRef,
      geometrySnapshotId: geometry.geometrySnapshotId,
    }) as Readonly<E01CharacteristicGeometryEvidence>,
  };
}

function unavailableRatio(
  outputId: E01UnavailableGeometryRatioOutput["outputId"],
  status: E01UnavailableGeometryRatioOutput["status"],
  reason: string,
): E01UnavailableGeometryRatioOutput {
  return Object.freeze({ kind: "unavailable", outputId, status, reason });
}

type GeometryRatioResolution =
  | {
      readonly ok: true;
      readonly output:
        | E01AvailableGeometryRatioOutput
        | E01UnavailableGeometryRatioOutput;
    }
  | { readonly ok: false };

function resolveGeometryRatio(
  outputId: E01AvailableGeometryRatioOutput["outputId"],
  availability: "available" | "not_applicable" | "missing",
  characteristicLengthM: number | null,
  geometryMappingStatus: E01CharacteristicGeometryEvidence["geometryMappingStatus"],
  skinDepthM: number,
): GeometryRatioResolution {
  if (availability === "not_applicable") {
    return {
      ok: true,
      output: unavailableRatio(
        outputId,
        "not_applicable",
        `${outputId} is not applicable to the declared workpiece geometry.`,
      ),
    };
  }
  if (availability === "missing") {
    return {
      ok: true,
      output: unavailableRatio(
        outputId,
        "insufficient_data",
        `${outputId} requires a mapped characteristic workpiece length.`,
      ),
    };
  }
  if (
    geometryMappingStatus !== "confirmed_to_workpiece_geometry" ||
    characteristicLengthM === null
  ) {
    return {
      ok: true,
      output: unavailableRatio(
        outputId,
        "insufficient_data",
        `${outputId} was withheld because the characteristic geometry mapping is unconfirmed.`,
      ),
    };
  }
  const ratio = characteristicLengthM / skinDepthM;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { ok: false };
  }
  return {
    ok: true,
    output: Object.freeze({
      kind: "available",
      outputId,
      status: "available",
      valueSi: ratio,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation:
        outputId === "t/delta"
          ? "characteristic_thickness_to_skin_depth"
          : "characteristic_radius_to_skin_depth",
    }),
  };
}

function samePropertyState(
  resistivity: Readonly<E01PropertySnapshot>,
  permeability: Readonly<E01PropertySnapshot>,
  frequencyHz: number,
): boolean {
  return (
    resistivity.materialId === permeability.materialId &&
    resistivity.materialRevision === permeability.materialRevision &&
    resistivity.sourceSnapshotId === permeability.sourceSnapshotId &&
    resistivity.materialStateId === permeability.materialStateId &&
    resistivity.temperatureK === permeability.temperatureK &&
    resistivity.fieldStrengthApm === permeability.fieldStrengthApm &&
    resistivity.frequencyHz === permeability.frequencyHz &&
    resistivity.frequencyHz === frequencyHz &&
    resistivity.phaseOrMicrostructureId ===
      permeability.phaseOrMicrostructureId
  );
}

/** Isolated canonical-SI, deliberately non-activated E-01 implementation. */
export function evaluateE01WorkpieceSkinDepth(
  input: unknown,
): E01WorkpieceSkinDepthOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "frequencyHz",
    "resistivitySnapshot",
    "relativePermeabilitySnapshot",
    "characteristicGeometry",
    "applicability",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "E-01.input_schema_invalid",
      "E-01 input must be an exact controlled canonical-SI plain-data record.",
      "Provide frequency, both A-01 property snapshots, explicit geometry-or-null, and applicability evidence.",
    );
  }
  if (
    typeof controlledInput.frequencyHz !== "number" ||
    !Number.isFinite(controlledInput.frequencyHz) ||
    controlledInput.frequencyHz <= 0
  ) {
    return failure(
      "invalid_input",
      "E-01.frequency_invalid",
      "E-01 requires a finite positive fundamental frequency in canonical SI hertz.",
      "Correct the frequency quantity without applying a hidden default.",
    );
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
    resistivityResult.snapshot.stateMatch !== "confirmed_for_declared_state" ||
    permeabilityResult.snapshot.stateMatch !== "confirmed_for_declared_state"
  ) {
    return failure(
      "insufficient_data",
      "E-01.property_provenance_insufficient",
      "E-01 property quality or state provenance is unknown or unconfirmed.",
      "Resolve both A-01 snapshots at the declared material state before evaluating E-01.",
    );
  }
  if (
    !samePropertyState(
      resistivityResult.snapshot,
      permeabilityResult.snapshot,
      controlledInput.frequencyHz,
    )
  ) {
    return failure(
      "insufficient_data",
      "E-01.property_state_mismatch",
      "Resistivity and effective permeability do not share one content-addressed material snapshot, revision, temperature, field, frequency, and phase state.",
      "Resolve same-state A-01 property snapshots; do not combine cold and hot or unmatched magnetic data.",
    );
  }

  const applicabilityResult = validateApplicability(
    controlledInput.applicability,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.failure;
  }
  if (
    applicabilityResult.evidence.materialClass === "ferromagnetic" &&
    resistivityResult.snapshot.fieldStrengthApm === null
  ) {
    return failure(
      "insufficient_data",
      "E-01.ferromagnetic_field_state_missing",
      "Ferromagnetic E-01 properties require an explicit field-strength state.",
      "Resolve effective mu_r and rho at an explicit T, H, f, and material state.",
    );
  }

  const geometryResult = validateGeometry(
    controlledInput.characteristicGeometry,
  );
  if (!geometryResult.ok) {
    return geometryResult.failure;
  }

  const absolutePermeabilityHPerM =
    E01_VACUUM_PERMEABILITY_H_PER_M *
    permeabilityResult.snapshot.valueSi;
  const piTimesFrequencyPerSecond = Math.PI * controlledInput.frequencyHz;
  const denominator =
    piTimesFrequencyPerSecond * absolutePermeabilityHPerM;
  const radicandM2 = resistivityResult.snapshot.valueSi / denominator;
  const skinDepthM = Math.sqrt(radicandM2);
  if (
    !isPositiveNormalBinary64(controlledInput.frequencyHz) ||
    !isPositiveNormalBinary64(resistivityResult.snapshot.valueSi) ||
    !isPositiveNormalBinary64(permeabilityResult.snapshot.valueSi) ||
    !isPositiveNormalBinary64(absolutePermeabilityHPerM) ||
    !isPositiveNormalBinary64(piTimesFrequencyPerSecond) ||
    !isPositiveNormalBinary64(denominator) ||
    !isPositiveNormalBinary64(radicandM2) ||
    !isPositiveNormalBinary64(skinDepthM)
  ) {
    return failure(
      "invalid_input",
      "E-01.numeric_resolution_invalid",
      "The frozen E-01 equation produced a non-finite or non-positive electromagnetic depth.",
      "Use finite, representable canonical-SI frequency and same-state property snapshots.",
    );
  }

  let thicknessToDelta:
    | E01AvailableGeometryRatioOutput
    | E01UnavailableGeometryRatioOutput;
  let radiusToDelta:
    | E01AvailableGeometryRatioOutput
    | E01UnavailableGeometryRatioOutput;
  if (geometryResult.evidence === null) {
    thicknessToDelta = unavailableRatio(
      "t/delta",
      "insufficient_data",
      "No characteristic workpiece geometry was supplied for t/delta.",
    );
    radiusToDelta = unavailableRatio(
      "R/delta",
      "insufficient_data",
      "No characteristic workpiece geometry was supplied for R/delta.",
    );
  } else {
    const thicknessResult = resolveGeometryRatio(
      "t/delta",
      geometryResult.evidence.thicknessStatus,
      geometryResult.evidence.characteristicThicknessM,
      geometryResult.evidence.geometryMappingStatus,
      skinDepthM,
    );
    const radiusResult = resolveGeometryRatio(
      "R/delta",
      geometryResult.evidence.radiusStatus,
      geometryResult.evidence.characteristicRadiusM,
      geometryResult.evidence.geometryMappingStatus,
      skinDepthM,
    );
    if (!thicknessResult.ok || !radiusResult.ok) {
      return failure(
        "invalid_input",
        "E-01.numeric_resolution_invalid",
        "An E-01 characteristic-geometry ratio is non-finite or non-positive at binary64 resolution.",
        "Use finite, representable canonical-SI characteristic geometry and property values.",
      );
    }
    thicknessToDelta = thicknessResult.output;
    radiusToDelta = radiusResult.output;
  }

  const warnings = Object.freeze([...applicabilityResult.warnings]);
  const propertyProvenance = Object.freeze({
    kind: "available",
    outputId: "property provenance",
    status: "available",
    resistivitySnapshot: resistivityResult.snapshot,
    relativePermeabilitySnapshot: permeabilityResult.snapshot,
  }) as E01PropertyProvenanceOutput;
  return Object.freeze({
    methodId: E01_METHOD_ID,
    methodVersion: E01_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    interpretationScope:
      warnings.length === 0
        ? "direct_linear_reference"
        : "reference_only_due_to_declared_geometry_or_curie_state",
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value: Object.freeze({
      deltaW: Object.freeze({
        kind: "available",
        outputId: "delta_w",
        status: "available",
        valueSi: skinDepthM,
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
        isThermalAffectedDepth: false,
      }),
      thicknessToDelta,
      radiusToDelta,
      propertyProvenance,
    }),
    equation: "delta_w = sqrt(rho_w / (pi * f * mu0 * mu_r_w))",
    substitution: Object.freeze({
      resistivityOhmM: resistivityResult.snapshot.valueSi,
      frequencyHz: controlledInput.frequencyHz,
      vacuumPermeabilityHPerM: E01_VACUUM_PERMEABILITY_H_PER_M,
      relativePermeability: permeabilityResult.snapshot.valueSi,
      absolutePermeabilityHPerM,
      denominator,
      radicandM2,
    }),
    applicability: applicabilityResult.evidence,
    characteristicGeometry: geometryResult.evidence,
    geometryScaleWarningPolicy: E01_GEOMETRY_SCALE_WARNING_POLICY,
    numericRepresentabilityPolicy: E01_NUMERIC_REPRESENTABILITY_POLICY,
    sourceRefs: E01_SOURCE_REFS,
    contractSourceRefs: E01_CONTRACT_SOURCE_REFS,
    derivationRefs: E01_DERIVATION_REFS,
    validationCaseIds: E01_VALIDATION_CASE_IDS,
    methodCheckIds: E01_METHOD_CHECK_IDS,
    units: Object.freeze({
      resistivity: "ohm_m",
      frequency: "Hz",
      permeability: "H_per_m",
      skinDepth: "m",
      geometryRatio: "one",
      dimensionalIdentity: "sqrt((ohm*m)/(Hz*(H/m)))=m",
    }),
    assumptions: Object.freeze([
      "linear homogeneous isotropic good conductor",
      "sinusoidal steady state with negligible displacement current",
      "delta_w is a locally planar semi-infinite electromagnetic amplitude scale",
      "rho and effective mu_r are explicit A-01 snapshots at one material, temperature, field, frequency, and phase state",
      "delta_w is not a thermal affected depth",
    ]) as E01WorkpieceSkinDepthSuccess["assumptions"],
  });
}
