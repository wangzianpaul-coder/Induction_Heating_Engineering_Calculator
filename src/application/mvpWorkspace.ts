import { methodId } from "../domain/ids.js";
import type { JsonValue } from "../serialization/canonical-json.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import {
  calculateMvpB02,
  calculateMvpD01,
  calculateMvpD03,
  calculateMvpD07,
  type MvpB02CalculationInput,
  type MvpD01CalculationInput,
  type MvpD03CalculationInput,
  type MvpD07CalculationInput,
  type MvpEmCalculationResult,
} from "./mvpEmCalculations.js";
import {
  calculateMvpThermal,
  type MvpThermalCalculationResult,
} from "./mvpThermalCalculations.js";
import {
  calculateMvpB03,
  type MvpB03CalculationInput,
  type MvpInductanceCalculationResult,
} from "./mvpInductanceCalculations.js";
import {
  calculateMvpF01,
  type MvpEquivalentCalculationResult,
  type MvpF01CalculationInput,
} from "./mvpEquivalentCalculations.js";
import {
  calculateMvpD04,
  type MvpD04CalculationInput,
  type MvpD04CalculationResult,
} from "./mvpSkinDepthCalculations.js";
import {
  calculateMvpJ03,
  type MvpJ03CalculationResult,
} from "./mvpRadiationCalculations.js";
import {
  MVP_RUNNABLE_METHOD_IDS,
  createMvpCaseDraft,
  loadMvpCaseDraft,
  saveMvpCaseDraft,
  type MvpCaseDraft,
  type MvpCaseLoadFailureCode,
  type MvpMethodInput,
  type MvpRunnableMethodId,
} from "./mvpCaseService.js";

export type MvpInputFieldKind =
  | "number"
  | "text"
  | "select"
  | "boolean"
  | "number_list_optional";

export interface MvpInputFieldOption {
  readonly value: string;
  readonly label: string;
}

export interface MvpInputFieldDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly kind: MvpInputFieldKind;
  readonly unit: string | null;
  readonly required: boolean;
  readonly placeholder: string;
  readonly options: readonly MvpInputFieldOption[];
}

export interface MvpRunnableMethodDefinition {
  readonly methodId: MvpRunnableMethodId;
  readonly methodVersion: string;
  readonly name: Readonly<{ readonly en: string; readonly zh: string }>;
  readonly moduleId: string;
  readonly purpose: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
  readonly executionBoundary: "v0_9_controlled_application_adapter";
  readonly formalRuntimeActivationClaim: false;
  readonly sourceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly fields: readonly MvpInputFieldDefinition[];
}

export interface MvpWorkspaceInput {
  readonly caseId: string;
  readonly caseName: string;
  readonly selectedMethodIds: readonly MvpRunnableMethodId[];
  readonly methodInputs: readonly MvpMethodInput[];
}

export interface MvpWorkspaceFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpWorkspaceOutput {
  readonly outputId: string;
  readonly label: Readonly<{ readonly en: string; readonly zh: string }>;
  readonly status: "available" | "unavailable";
  readonly value: number | Readonly<{ readonly real: number; readonly imaginary: number }> | null;
  readonly canonicalUnitId: string | null;
  readonly reason: string | null;
}

export interface MvpWorkspaceMethodResult {
  readonly methodId: MvpRunnableMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success"
    | "success_with_warnings"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly MvpWorkspaceOutput[];
  readonly warnings: readonly Readonly<{
    readonly code: string | null;
    readonly predicate: string | null;
    readonly message: string;
  }>[];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly scope: string;
    readonly limitations: readonly string[];
  }>;
  readonly failure: MvpWorkspaceFailure | null;
}

export type MvpWorkspaceBuildResult =
  | {
      readonly status: "success";
      readonly draft: MvpCaseDraft;
    }
  | {
      readonly status: "invalid_input";
      readonly failure: MvpWorkspaceFailure;
    };

export type MvpWorkspaceSaveResult =
  | {
      readonly status: "success";
      readonly canonicalJson: string;
      readonly snapshotId: string;
    }
  | {
      readonly status: "invalid_input";
      readonly failure: MvpWorkspaceFailure;
    };

export type MvpWorkspaceLoadResult =
  | {
      readonly status: "success";
      readonly workspace: MvpWorkspaceInput;
      readonly snapshotId: string;
    }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: MvpCaseLoadFailureCode;
      readonly message: string;
    };

export type MvpWorkspaceCalculationResult =
  | {
      readonly status: "success";
      readonly snapshotId: string;
      readonly results: readonly MvpWorkspaceMethodResult[];
    }
  | {
      readonly status: "invalid_input";
      readonly failure: MvpWorkspaceFailure;
    };

const option = (value: string, label: string): MvpInputFieldOption => ({ value, label });

function field(
  id: string,
  label: string,
  description: string,
  kind: MvpInputFieldKind,
  unit: string | null = null,
  options: readonly MvpInputFieldOption[] = [],
  required = true,
  placeholder = "",
): MvpInputFieldDefinition {
  return { id, label, description, kind, unit, required, placeholder, options };
}

const yesNoQualityOptions = Object.freeze([
  option("user_defined", "User-defined, source stated"),
  option("project_specific", "Project-specific"),
  option("measured", "Measured"),
  option("engineering_reference", "Engineering reference"),
  option("approved_reference", "Approved reference"),
] as const);

const sourceMethodOptions = Object.freeze([
  option("measurement", "Measurement"),
  option("analytical_estimate", "Analytical estimate"),
  option("fem", "FEM result"),
] as const);

const f01ParameterSourceOptions = Object.freeze([
  option("measurement", "Measurement"),
  option("limited_analytical", "Limited analytical result"),
  option("fem", "FEM result"),
  option("user_input_with_source", "User input with source"),
] as const);

const loadedStateOptions = Object.freeze([
  option("empty", "Empty coil"),
  option("workpiece_cold", "Workpiece cold"),
  option("workpiece_hot", "Workpiece hot"),
  option("measured_state", "Measured state"),
  option("user_defined_state", "User-defined state"),
] as const);

const dispositionOptions = Object.freeze([
  option("known_applicable", "Included, known applicable"),
  option("source_confirmed_not_applicable", "Source-confirmed not applicable"),
] as const);

const j03ConfigurationOptions = Object.freeze([
  option("radiation_to_large_surroundings", "Radiation to large surroundings"),
  option("long_concentric_two_gray_surfaces", "Long concentric two-gray-surface enclosure"),
] as const);

const j03ConcentricEvidenceOptions = Object.freeze([
  option("confirmed", "Confirmed"),
  option("confirmed_not_satisfied", "Confirmed not satisfied"),
  option("unconfirmed", "Unconfirmed"),
  option("not_applicable", "Not applicable to large-surroundings route"),
] as const);

function specification(id: MvpRunnableMethodId) {
  return METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
}

function definition(
  id: MvpRunnableMethodId,
  fields: readonly MvpInputFieldDefinition[],
  limitations: readonly string[],
): MvpRunnableMethodDefinition {
  const spec = specification(id);
  if (spec.approvalStatus !== "approved" && spec.approvalStatus !== "approved_with_limitation") {
    throw new Error(`Runnable MVP method ${id} is not approved.`);
  }
  return Object.freeze({
    methodId: id,
    methodVersion: spec.methodVersion,
    name: spec.engineeringName,
    moduleId: spec.moduleId,
    purpose: spec.purpose,
    approvalStatus: spec.approvalStatus,
    executionBoundary: "v0_9_controlled_application_adapter",
    formalRuntimeActivationClaim: false,
    sourceRefs: spec.sourceRefs,
    limitations,
    fields,
  });
}

const B02_FIELDS = Object.freeze([
  field("electricalTurnCount", "Electrical turn count", "Integer electrical turns.", "number", "1"),
  field("conductorAxialSizeM", "Conductor axial size", "Axial projected conductor size.", "number", "m"),
  field("windingEnvelopeLengthM", "Full winding envelope", "ADR-0003 full axial envelope.", "number", "m"),
  field("windingClass", "Winding class", "Choose the actual winding class.", "select", null, [
    option("uniform_single_layer", "Uniform single layer"),
    option("multilayer", "Multilayer"),
    option("other", "Other"),
  ]),
  field("envelopeDefinition", "Envelope definition", "Confirm whether ADR-0003 full-envelope semantics are used.", "select", null, [
    option("ADR-0003_full_axial_envelope", "ADR-0003 full axial envelope"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("identicalTurnSections", "Identical turn sections confirmed", "All turns have identical projected sections.", "boolean"),
  field("nonOverlappingAxialProjection", "No axial overlap confirmed", "Projected turn sections do not overlap.", "boolean"),
]);

const B03_FIELDS = Object.freeze([
  field("currentPathDiameterM", "Current-path diameter", "Explicit coil current-path diameter; no outside/inside-diameter guess is made.", "number", "m"),
  field("windingEnvelopeLengthM", "Winding envelope length", "ADR-0003 full axial winding envelope used as the ideal current-sheet length.", "number", "m"),
  field("electricalTurnCount", "Electrical turn count", "Electrical turns in the ideal long-solenoid analytical limit.", "number", "1"),
  field("mediumKind", "Magnetic medium", "Air or a uniform linear medium only.", "select", null, [
    option("air", "Air core"),
    option("uniform_linear", "Uniform linear medium"),
  ]),
  field("relativePermeability", "Relative permeability", "Required only for a uniform linear medium; air is fixed to 1 by the method.", "number", "1", [], false),
]);

const D01_FIELDS = Object.freeze([
  field("meanMechanicalPathDiameterM", "Mechanical centre-path diameter", "Mechanical/CAD conductor centre path, not electromagnetic effective diameter.", "number", "m"),
  field("helixRevolutionCount", "Mechanical revolutions", "Actual revolutions, including partial turns.", "number", "1"),
  field("helixAxialAdvanceM", "Helix endpoint axial advance", "Signed endpoint advance for the same path.", "number", "m"),
  field("leadSegmentLengthsM", "Lead segment lengths", "Comma-separated metres; [] means confirmed none; blank means explicitly unknown.", "number_list_optional", "m", [], false, "0.25, 0.25"),
  field("busSegmentLengthsM", "Bus segment lengths", "Comma-separated metres; [] means confirmed none; blank means explicitly unknown.", "number_list_optional", "m", [], false, "[]"),
  field("pathGeometry", "Path geometry", "Actual path classification.", "select", null, [
    option("uniform_cylindrical_helix", "Uniform cylindrical helix"),
    option("noncircular_or_multilayer", "Non-circular or multilayer"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("meanDiameterBasis", "Mean-diameter basis", "Origin of the supplied diameter.", "select", null, [
    option("mechanical_or_cad_conductor_center_path", "Mechanical/CAD conductor centre path"),
    option("electromagnetic_effective_current_path", "Electromagnetic effective path"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("revolutionCountBasis", "Revolution-count basis", "Origin of the supplied revolution count.", "select", null, [
    option("actual_mechanical_or_cad_path", "Actual mechanical/CAD path"),
    option("guessed_from_electrical_turn_count", "Guessed from electrical turns"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("axialAdvanceBasis", "Axial-advance basis", "Origin of the supplied endpoint advance.", "select", null, [
    option("actual_path_endpoint_advance", "Actual path endpoint advance"),
    option("guessed_from_turn_center_span", "Guessed from turn-centre span"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("turnCenterSpanConsistency", "Turn-centre consistency", "Comparison with the available turn-centre span.", "select", null, [
    option("consistent", "Consistent"),
    option("inconsistent", "Inconsistent"),
    option("not_available", "Not available"),
  ]),
]);

const D03_FIELDS = Object.freeze([
  field("conductorLengthM", "Conductor-body length", "Length at the declared conductor-body boundary.", "number", "m"),
  field("metalAreaM2", "Conducting metal area", "Metal area only; never coolant flow area.", "number", "m²"),
  field("resistivityOhmM", "Electrical resistivity", "Explicit state-matched value; no copper default is supplied.", "number", "Ω·m"),
  field("materialId", "Material ID", "Stable material identity shared by conductor and property.", "text", null, [], true, "project.copper.coil"),
  field("temperatureK", "Material temperature", "Absolute temperature shared by conductor and property.", "number", "K"),
  field("resistivitySourceRef", "Resistivity source reference", "Project, measurement, or approved property reference.", "text", null, [], true, "project.material.rho@state-1"),
  field("resistivityStateMatch", "Property-state match", "State relation between the property and conductor.", "select", null, [
    option("same_material_temperature_as_conductor", "Same material and temperature"),
    option("cold_or_other_material_state", "Cold or other material state"),
    option("unconfirmed", "Unconfirmed"),
  ]),
  field("materialDistribution", "Material distribution", "Uniformity along the conductor body.", "select", null, [option("uniform", "Uniform"), option("spatially_varying", "Spatially varying"), option("unknown", "Unknown")]),
  field("metalAreaDistribution", "Metal-area distribution", "Area uniformity along the conductor body.", "select", null, [option("uniform", "Uniform"), option("spatially_varying", "Spatially varying"), option("unknown", "Unknown")]),
  field("temperatureDistribution", "Temperature distribution", "Temperature uniformity along the conductor body.", "select", null, [option("uniform", "Uniform"), option("spatially_varying", "Spatially varying"), option("unknown", "Unknown")]),
  field("resistanceBoundary", "Resistance boundary", "Choose the boundary represented by the length/area term.", "select", null, [
    option("conductor_body_only_excludes_series_extras", "Conductor body only; excludes extras"),
    option("includes_series_extras_or_terminal_measurement", "Already includes extras or terminal measurement"),
    option("unknown", "Unknown"),
  ]),
  field("seriesExtrasMode", "Series extras", "This first MVP supports either a confirmed empty list or an explicitly unknown list.", "select", null, [
    option("confirmed_none", "Complete boundary; no series extras"),
    option("unknown", "Unknown or incomplete"),
  ]),
]);

const D04_FIELDS = Object.freeze([
  field("frequencyHz", "Excitation frequency", "Sinusoidal operating frequency for the declared copper-property state.", "number", "Hz"),
  field("resistivityOhmM", "Copper electrical resistivity", "Explicit copper resistivity at the declared material temperature and frequency state; no default is supplied.", "number", "Ω·m"),
  field("relativePermeability", "Copper relative permeability", "Explicit relative permeability from the same copper-property state; no implicit value of one is supplied.", "number", "1"),
  field("materialClass", "Conductor material class", "Select copper only when the stated property evidence actually belongs to copper.", "select", null, [
    option("copper", "Copper"),
    option("other", "Other material"),
  ]),
  field("propertyStateMatch", "Property-state match", "Confirm whether resistivity and relative permeability belong to the same material, temperature and frequency state.", "select", null, [
    option("same_material_temperature_frequency_state", "Same material, temperature and frequency state"),
    option("unconfirmed_or_mismatched", "Unconfirmed or mismatched"),
  ]),
  field("calculationTemperatureK", "Copper calculation temperature", "Absolute copper temperature represented by the calculation state.", "number", "K"),
  field("constitutiveRegime", "Conductor response model", "The supported route requires a linear isotropic good conductor.", "select", null, [
    option("linear_isotropic_good_conductor", "Linear isotropic good conductor"),
    option("nonlinear_or_unknown", "Nonlinear or unknown"),
  ]),
  field("excitation", "Excitation state", "The supported route requires sinusoidal steady-state excitation.", "select", null, [
    option("sinusoidal_steady_state", "Sinusoidal steady state"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("fieldModel", "Local field model", "Confirm whether the locally planar reference model is applicable to the conductor surface.", "select", null, [
    option("locally_planar_reference", "Locally planar reference"),
    option("other_or_unknown", "Other or unknown"),
  ]),
  field("materialSnapshotId", "Material evidence fingerprint", "Content-addressed fingerprint for the exact copper-property evidence set.", "text", null, [], true, "material:<64 lowercase SHA-256 hex>"),
  field("materialDisplayName", "Material and state name", "Human-readable name for the copper grade and declared state.", "text", null, [], true, "C110 copper at declared state"),
  field("propertyTemperatureK", "Property-source temperature", "Absolute temperature at which the supplied resistivity and permeability apply; it must exactly match the calculation state.", "number", "K"),
  field("propertyFrequencyHz", "Property-source frequency", "Frequency represented by the supplied property evidence; it must exactly match the calculation state.", "number", "Hz"),
  field("sameMaterialStateConfirmed", "One material state confirmed", "Confirm both supplied properties belong to the same content-addressed copper state.", "boolean"),
  field("resistivitySourceRef", "Resistivity source record", "Stable project, measurement, datasheet or approved-reference record for the supplied resistivity.", "text", null, [], true, "project.copper.resistivity.state-1"),
  field("relativePermeabilitySourceRef", "Relative-permeability source record", "Stable project, measurement, datasheet or approved-reference record for the supplied relative permeability.", "text", null, [], true, "project.copper.relative-permeability.state-1"),
]);

const D07_FIELDS = Object.freeze([
  field("resistanceOhm", "Series resistance", "State- and boundary-matched series resistance.", "number", "Ω"),
  field("inductanceH", "Series inductance", "Externally established inductance at the same state; this form does not calculate L.", "number", "H"),
  field("currentA", "Port current", "RMS or fundamental-RMS current at the same port.", "number", "A"),
  field("frequencyHz", "Frequency", "Common sinusoidal frequency.", "number", "Hz"),
  field("portId", "Port ID", "Stable coil series-port identity.", "text", null, [], true, "coil.series.port"),
  field("referencePlaneId", "Reference plane ID", "Shared R/L/I reference plane.", "text", null, [], true, "coil.terminals"),
  field("loadedState", "Loaded state", "State shared by R, L, and I.", "select", null, [
    option("empty", "Empty coil"), option("workpiece_cold", "Workpiece cold"), option("workpiece_hot", "Workpiece hot"), option("measured_state", "Measured state"), option("user_defined_state", "User-defined state"),
  ]),
  field("seriesEquivalentId", "Series-equivalent ID", "Stable identity shared by the R/L evidence.", "text", null, [], true, "coil.series-equivalent.state-1"),
  field("quantityBasis", "Current basis", "Controlled current basis.", "select", null, [option("rms", "RMS"), option("fundamental_rms", "Fundamental RMS")]),
  field("confirmCoilSeriesPort", "Coil series-equivalent port confirmed", "Not a grid-side or whole-tank port.", "boolean"),
  field("confirmLinearSinusoidal", "Linear sinusoidal steady state confirmed", "Required D-07 model regime.", "boolean"),
]);

const F01_FIELDS = Object.freeze([
  field("primaryResistanceOhm", "Primary resistance R1", "Primary series resistance at the declared state and reference plane.", "number", "Ω"),
  field("primaryInductanceH", "Primary inductance Lp", "Primary self-inductance at the same state.", "number", "H"),
  field("secondaryResistanceOhm", "Secondary resistance R2", "Secondary equivalent resistance at the declared state.", "number", "Ω"),
  field("secondaryInductanceH", "Secondary inductance Ls", "Secondary self-inductance at the same state.", "number", "H"),
  field("mutualInductanceH", "Mutual inductance M", "Signed mutual inductance with explicit provenance; never guessed from geometry.", "number", "H"),
  field("frequencyHz", "Frequency", "One shared sinusoidal operating frequency.", "number", "Hz"),
  field("primaryPortId", "Primary port ID", "Stable primary equivalent-port identity.", "text", null, [], true, "coil.primary.port"),
  field("secondaryPortId", "Secondary port ID", "Stable and distinct secondary equivalent-port identity.", "text", null, [], true, "workpiece.secondary.port"),
  field("primaryReferencePlaneId", "Primary reference plane", "Primary R/L reference plane.", "text", null, [], true, "coil.terminals"),
  field("secondaryReferencePlaneId", "Secondary reference plane", "Secondary R/L reference plane.", "text", null, [], true, "workpiece.equivalent-plane"),
  field("quantityBasis", "Quantity basis", "RMS or fundamental-RMS phasor basis shared by every parameter.", "select", null, [
    option("rms", "RMS"),
    option("fundamental_rms", "Fundamental RMS"),
  ]),
  field("loadedState", "Loaded state", "One loading state shared by R1/Lp, R2/Ls and M.", "select", null, loadedStateOptions),
  field("primaryMaterialStateId", "Primary material-state ID", "Stable primary material-state identity.", "text", null, [], true, "coil.material-state.1"),
  field("secondaryMaterialStateId", "Secondary material-state ID", "Stable secondary material-state identity.", "text", null, [], true, "workpiece.material-state.1"),
  field("primaryTemperatureK", "Primary temperature", "Absolute primary material temperature.", "number", "K"),
  field("secondaryTemperatureK", "Secondary temperature", "Absolute secondary material temperature.", "number", "K"),
  field("primaryMaterialSnapshotId", "Primary material snapshot ID", "Content-addressed primary material snapshot.", "text", null, [], true, "material:<64 lowercase SHA-256 hex>"),
  field("secondaryMaterialSnapshotId", "Secondary material snapshot ID", "Content-addressed secondary material snapshot.", "text", null, [], true, "material:<64 lowercase SHA-256 hex>"),
  field("coupledCircuitStateId", "Coupled-circuit state ID", "Stable identity for this complete coupled operating state.", "text", null, [], true, "coupled-circuit.state-1"),
  field("primaryParameterSourceKind", "Primary parameter source", "Controlled provenance class for R1 and Lp.", "select", null, f01ParameterSourceOptions),
  field("secondaryParameterSourceKind", "Secondary parameter source", "Controlled provenance class for R2 and Ls.", "select", null, f01ParameterSourceOptions),
  field("mutualParameterSourceKind", "Mutual-inductance source", "Controlled provenance class for M.", "select", null, f01ParameterSourceOptions),
  field("primarySourceRef", "Primary source reference", "Source reference for R1 and Lp.", "text", null, [], true, "project.primary-equivalent.state-1"),
  field("secondarySourceRef", "Secondary source reference", "Source reference for R2 and Ls.", "text", null, [], true, "project.secondary-equivalent.state-1"),
  field("mutualSourceRef", "Mutual-inductance source reference", "Source reference for M.", "text", null, [], true, "project.mutual.state-1"),
  field("primaryStateMatch", "Primary state match", "Whether primary parameters are confirmed for this exact declared state.", "select", null, [
    option("confirmed_for_declared_state", "Confirmed for declared state"),
    option("unconfirmed_or_mismatched", "Unconfirmed or mismatched"),
  ]),
  field("secondaryStateMatch", "Secondary state match", "Whether secondary parameters are confirmed for this exact declared state.", "select", null, [
    option("confirmed_for_declared_state", "Confirmed for declared state"),
    option("unconfirmed_or_mismatched", "Unconfirmed or mismatched"),
  ]),
  field("mutualStateMatch", "Mutual state match", "Whether M is confirmed for the same declared state.", "select", null, [
    option("confirmed_for_declared_state", "Confirmed for declared state"),
    option("unconfirmed_or_mismatched", "Unconfirmed or mismatched"),
  ]),
  field("modelRegime", "Model regime", "F-01 requires a linear lumped two-winding sinusoidal steady-state model.", "select", null, [
    option("linear_lumped_sinusoidal_steady_state", "Linear lumped sinusoidal steady state"),
    option("nonlinear_distributed_or_non_sinusoidal_or_unknown", "Nonlinear, distributed, non-sinusoidal, or unknown"),
  ]),
]);

const H03_FIELDS = Object.freeze([
  field("volumeFlowM3PerS", "Branch volume flow", "Explicit flow for one declared branch.", "number", "m³/s"),
  field("flowAreaM2", "Hydraulic flow area", "D-02 hydraulic area from the same geometry.", "number", "m²"),
  field("wettedPerimeterM", "Wetted perimeter", "D-02 wetted perimeter from the same geometry.", "number", "m"),
  field("branchId", "Branch ID", "Stable branch identity.", "text", null, [], true, "cooling.branch.1"),
  field("coolantNetworkId", "Coolant network ID", "Stable network identity.", "text", null, [], true, "cooling.network.1"),
  field("timeBasisId", "Time basis ID", "Shared operating-state time basis.", "text", null, [], true, "steady-state.1"),
  field("flowSourceMethod", "Flow source method", "Origin of the explicit branch flow.", "select", null, [option("measurement", "Measurement"), option("case_input", "Case input")]),
  field("flowSourceRef", "Flow source reference", "Reference for the supplied branch flow.", "text", null, [], true, "case.flow.branch.1"),
  field("flowDataQuality", "Flow data quality", "Controlled data-quality classification.", "select", null, yesNoQualityOptions),
  field("flowSourceSnapshotId", "Measurement flow snapshot ID", "Required only for measurement flow. A case_input flow is bound mechanically to the current saved CaseSnapshot.", "text", null, [], false, "case:<64 lowercase SHA-256 hex>"),
  field("flowProvenanceId", "Flow provenance ID", "Stable upstream flow provenance record identity.", "text", null, [], true, "flow.provenance.state-1"),
  field("d02SourceRef", "D-02 geometry source reference", "Reference to the verified D-02 round-section result.", "text", null, [], true, "case.geometry.d02.branch.1"),
  field("d02DataQuality", "D-02 data quality", "Controlled data-quality classification.", "select", null, yesNoQualityOptions),
  field("d02ProvenanceId", "D-02 provenance ID", "Stable upstream D-02 result provenance identity.", "text", null, [], true, "d02.provenance.state-1"),
  field("d02SourceSnapshotId", "D-02 source snapshot ID", "Content-addressed snapshot that actually contains the verified D-02 result evidence.", "text", null, [], true, "geometry:<64 lowercase SHA-256 hex>"),
  field("d02GeometrySnapshotId", "D-02 geometry snapshot ID", "The exact content-addressed geometry snapshot used by D-02.", "text", null, [], true, "geometry:<64 lowercase SHA-256 hex>"),
  field("hydraulicGeometryId", "Hydraulic geometry ID", "Identity shared by area and perimeter.", "text", null, [], true, "hydraulic-geometry.1"),
  field("oneDeclaredBranchConfirmed", "One declared branch confirmed", "The supplied flow is not total network flow.", "boolean"),
  field("verifiedD02Snapshot", "Verified D-02 snapshot confirmed", "Area and perimeter came from a valid D-02 round-section result.", "boolean"),
  field("sameD02HydraulicGeometryConfirmed", "Same D-02 geometry confirmed", "Area and perimeter are from the same geometry snapshot.", "boolean"),
]);

function heatTermFields(
  prefix: string,
  labelText: string,
  termIsConditional = false,
): readonly MvpInputFieldDefinition[] {
  return [
    field(`${prefix}Disposition`, `${labelText} disposition`, "Include a known value or record source-confirmed non-applicability.", "select", null, dispositionOptions, !termIsConditional),
    field(`${prefix}ValueW`, `${labelText} value`, "Required only when included.", "number", "W", [], false),
    field(`${prefix}SourceMethod`, `${labelText} source method`, "Origin of this heat term or exclusion.", "select", null, sourceMethodOptions, !termIsConditional),
    field(`${prefix}SourceRef`, `${labelText} source reference`, "Stable source reference.", "text", null, [], !termIsConditional, `${prefix}.source.state-1`),
    field(`${prefix}DataQuality`, `${labelText} data quality`, "Controlled data quality.", "select", null, yesNoQualityOptions, !termIsConditional),
    field(`${prefix}SourceSnapshotId`, `${labelText} source snapshot ID`, "Content-addressed snapshot of the stated measurement, analysis, or FEM source.", "text", null, [], !termIsConditional, "case:<64 lowercase SHA-256 hex>"),
    field(`${prefix}ProvenanceId`, `${labelText} provenance ID`, "Stable provenance record identity from the upstream source.", "text", null, [], !termIsConditional, `${prefix}.provenance.state-1`),
    field(`${prefix}HeatPathId`, `${labelText} heat-path ID`, "Stable physical heat-path identity.", "text", null, [], !termIsConditional, `${prefix}.heat-path.1`),
    field(`${prefix}PhysicalHeatSourceId`, `${labelText} physical source ID`, "Stable physical source identity used for duplicate prevention.", "text", null, [], !termIsConditional, `${prefix}.physical-source.1`),
    field(`${prefix}Reason`, `${labelText} exclusion reason`, "Required only when source-confirmed not applicable.", "text", null, [], false),
  ];
}

const H01_FIELDS = Object.freeze([
  field("controlVolumeId", "Control volume ID", "One declared coil coolant control volume.", "text", null, [], true, "coil.coolant.cv.1"),
  field("coolantCircuitId", "Coolant circuit ID", "One declared coolant circuit.", "text", null, [], true, "coil.coolant.circuit.1"),
  field("timeBasisId", "Time basis ID", "Common time basis for every heat term.", "text", null, [], true, "steady-state.1"),
  ...heatTermFields("copper", "Coil copper loss"),
  ...heatTermFields("pickup", "External heat pickup to coil"),
  ...heatTermFields("magnetic", "Magnetic material loss"),
  ...heatTermFields("other", "One optional other cooled load", true),
  field("otherLoadPresent", "Other cooled load is present", "When off, the other-load list is explicitly empty.", "boolean"),
  field("singleDeclaredCircuitConfirmed", "Single circuit confirmed", "No aggregate of multiple coolant circuits.", "boolean"),
  field("boundaryCompleteConfirmed", "Control-volume boundary complete", "Every applicable heat path entering this circuit is represented.", "boolean"),
  field("forbiddenHeatClassesExcludedConfirmed", "Forbidden heat classes excluded", "Useful workpiece heat, ambient loss, reactive power, and plant losses are excluded.", "boolean"),
  field("multiCircuitAggregationAbsentConfirmed", "No multi-circuit aggregation", "This is one declared circuit only.", "boolean"),
  field("otherLoadsEnumerationComplete", "Other-load enumeration complete", "No unknown applicable other cooled load remains.", "boolean"),
  field("otherLoadsEnumerationSourceRef", "Other-load enumeration source", "Explicit source supporting the complete enumeration.", "text", null, [], true, "cooling.other-load-enumeration.state-1"),
  field("pairwiseDisjointPathsConfirmed", "Heat paths pairwise disjoint", "No path is counted twice.", "boolean"),
  field("physicalSourceIdentityChecked", "Physical source identities checked", "No physical heat source is duplicated.", "boolean"),
  field("overlapAssessmentSourceRef", "Overlap assessment source", "Explicit source for the pairwise path/source identity assessment.", "text", null, [], true, "cooling.overlap-assessment.state-1"),
  field("designMarginNotRequested", "No design margin requested", "The design-margin equation is not frozen and remains unavailable.", "boolean"),
]);

const J03_FIELDS = Object.freeze([
  field("configuration", "Radiation boundary", "Choose the actual supported radiation network; topology is never inferred from temperatures or areas.", "select", null, j03ConfigurationOptions),
  field("surface1TemperatureK", "Surface 1 temperature", "Absolute temperature of the radiating surface.", "number", "K"),
  field("surface1Emissivity", "Surface 1 emissivity", "Explicit total hemispherical emissivity at the declared surface state; no default is supplied.", "number", "1"),
  field("surface1AreaM2", "Surface 1 radiating area", "Area participating in the declared radiation network.", "number", "m²"),
  field("surface1MaterialSnapshotId", "Surface 1 material evidence fingerprint", "Content-addressed material and emissivity evidence for surface 1.", "text", null, [], true, "material:<64 lowercase SHA-256 hex>"),
  field("surface1EmissivitySourceRef", "Surface 1 emissivity source record", "Stable source record for surface 1 emissivity.", "text", null, [], true, "project.surface-1.emissivity.state-1"),
  field("surface1EmissivityStateTemperatureK", "Surface 1 emissivity-source temperature", "Absolute temperature represented by the surface 1 emissivity evidence; it must exactly match surface temperature.", "number", "K"),
  field("counterpartKind", "Other radiating boundary", "Select large surroundings or an explicit concentric outer surface consistently with the radiation boundary.", "select", null, [
    option("large_surroundings", "Large surroundings"),
    option("concentric_outer_surface", "Concentric outer surface"),
  ]),
  field("counterpartTemperatureK", "Other-boundary temperature", "Absolute temperature of the surroundings or concentric outer surface.", "number", "K"),
  field("surface2Emissivity", "Outer-surface emissivity", "Required only for the long-concentric route; no default is supplied.", "number", "1", [], false),
  field("surface2AreaM2", "Outer-surface radiating area", "Required only for the long-concentric route and must come from the same geometry evidence.", "number", "m²", [], false),
  field("surface2MaterialSnapshotId", "Outer-surface material evidence fingerprint", "Required only for the long-concentric route.", "text", null, [], false, "material:<64 lowercase SHA-256 hex>"),
  field("surface2EmissivitySourceRef", "Outer-surface emissivity source record", "Required only for the long-concentric route.", "text", null, [], false, "project.surface-2.emissivity.state-1"),
  field("surface2EmissivityStateTemperatureK", "Outer-surface emissivity-source temperature", "Required only for the long-concentric route and must match the outer-surface temperature.", "number", "K", [], false),
  field("geometrySnapshotId", "Geometry evidence fingerprint", "Content-addressed geometry evidence for the selected configuration and both radiating areas.", "text", null, [], true, "geometry:<64 lowercase SHA-256 hex>"),
  field("snapshotConfiguration", "Geometry-evidence configuration", "Configuration recorded in the immutable geometry evidence; it must exactly match the selected radiation boundary.", "select", null, j03ConfigurationOptions),
  field("snapshotSurface1AreaM2", "Geometry-evidence surface 1 area", "Surface 1 area recorded in the immutable geometry evidence.", "number", "m²"),
  field("snapshotSurface2AreaM2", "Geometry-evidence outer-surface area", "Required for the long-concentric route; leave blank for large surroundings.", "number", "m²", [], false),
  field("temperatureScale", "Temperature scale", "Fourth-power radiation equations require absolute kelvin.", "select", null, [
    option("absolute_kelvin", "Absolute kelvin"),
  ]),
  field("diffuseGraySurfacesConfirmed", "Diffuse-gray surfaces confirmed", "Confirm the stated emissivities represent diffuse gray surfaces in the declared state.", "boolean"),
  field("viewFactor", "Surface 1 view factor", "Explicit geometric view factor. This controlled route supports exactly one.", "number", "1"),
  field("noUnmodelledOpeningsOrObstructionsConfirmed", "No unmodelled openings or obstructions", "Confirm that no opening, shield or obstruction changes the declared radiation network.", "boolean"),
  field("longConcentricEndEffectsStatus", "Concentric end-effect evidence", "For the long-concentric route, confirm negligible end effects; select not applicable for large surroundings.", "select", null, j03ConcentricEvidenceOptions),
  field("surface1RoleStatus", "Surface 1 concentric role", "For the long-concentric route, confirm surface 1 is the inner surface; select not applicable for large surroundings.", "select", null, j03ConcentricEvidenceOptions),
]);

export const MVP_RUNNABLE_METHOD_DEFINITIONS = Object.freeze([
  definition("B-02", B02_FIELDS, ["Uniform identical single-layer turns only.", "ADR-0003 full-envelope semantics and non-overlap must be explicit."]),
  definition("B-03", B03_FIELDS, ["Analytical long-solenoid limit only; no frozen aspect-ratio threshold is applied.", "The result is never a finite-coil Recommended method and does not include end, leakage, lead, or conductor cross-section effects."]),
  definition("D-01", D01_FIELDS, ["Uniform cylindrical mechanical/CAD centre path only.", "Unknown lead or bus groups produce a lower-bound result and warning."]),
  definition("D-03", D03_FIELDS, ["No default resistivity or material state is supplied.", "This MVP form supports either no series extras or an explicitly incomplete terminal boundary."]),
  definition("D-04", D04_FIELDS, ["Electromagnetic field-amplitude 1/e depth only; never a thermal affected depth.", "Linear homogeneous copper, sinusoidal steady state, and locally planar good-conductor approximation only."]),
  definition("D-07", D07_FIELDS, ["Requires externally established R and L at one coil series port.", "Component voltages are not grid-side or whole-tank voltage."]),
  definition("F-01", F01_FIELDS, ["Estimated linear lumped two-winding reflected-impedance model only; F-02 same-state measurement is preferred for actual equipment.", "Mutual inductance must be supplied with same-state provenance and is never inferred from geometry."]),
  definition("H-01", H01_FIELDS, ["One complete, non-overlapping coil coolant circuit only.", "Design-margin arithmetic is not available in this MVP."]),
  definition("H-03", H03_FIELDS, ["One explicit branch flow and verified D-02 geometry only.", "No OEM/project velocity acceptance or safety conclusion is produced."]),
  definition("J-03", J03_FIELDS, ["Only large surroundings with view factor one or a long concentric two-gray-surface enclosure are supported.", "Emissivity, area, absolute temperature, material evidence, openings, obstructions and concentric end effects must be explicit."]),
] as const);

const DEFINITION_BY_ID = new Map(MVP_RUNNABLE_METHOD_DEFINITIONS.map((item) => [item.methodId, item]));

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function numeric(record: Record<string, JsonValue>, key: string): number {
  return typeof record[key] === "number" ? record[key] : Number.NaN;
}

function text(record: Record<string, JsonValue>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function bool(record: Record<string, JsonValue>, key: string): boolean {
  return record[key] === true;
}

function optionalNumberList(record: Record<string, JsonValue>, key: string): readonly number[] | null {
  const value = record[key];
  return Array.isArray(value) && value.every((entry) => typeof entry === "number")
    ? value as number[]
    : null;
}

function optionalNumeric(record: Record<string, JsonValue>, key: string): number | null {
  return typeof record[key] === "number" ? record[key] : null;
}

function j03ConcentricEvidence(
  record: Record<string, JsonValue>,
  key: "longConcentricEndEffectsStatus" | "surface1RoleStatus",
  configuration: string,
): true | false | null | string {
  const status = text(record, key);
  if (configuration === "radiation_to_large_surroundings") {
    return status === "not_applicable" ? null : status;
  }
  if (status === "confirmed") return true;
  if (status === "confirmed_not_satisfied") return false;
  if (status === "unconfirmed") return null;
  return status;
}

function hasJ03Surface2Data(record: Record<string, JsonValue>): boolean {
  return [
    "surface2Emissivity",
    "surface2AreaM2",
    "surface2MaterialSnapshotId",
    "surface2EmissivitySourceRef",
    "surface2EmissivityStateTemperatureK",
  ].some((key) => {
    const value = record[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function workspaceFailure(code: string, message: string, action: string): MvpWorkspaceFailure {
  return { code, message, action };
}

function payloadFieldIsControlled(
  field: MvpInputFieldDefinition,
  value: JsonValue,
): boolean {
  switch (field.kind) {
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "text":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "select":
      return (
        typeof value === "string" &&
        (value === "" || field.options.some((option) => option.value === value))
      );
    case "number_list_optional":
      return (
        value === null ||
        (Array.isArray(value) &&
          value.every((entry) => typeof entry === "number" && Number.isFinite(entry)))
      );
  }
}

function validateWorkspaceShape(input: MvpWorkspaceInput): void {
  const workspaceKeys = Object.keys(input).sort();
  if (
    workspaceKeys.length !== 4 ||
    !["caseId", "caseName", "methodInputs", "selectedMethodIds"].every(
      (key, index) => workspaceKeys[index] === key,
    )
  ) {
    throw new TypeError("The Runnable MVP workspace contains unsupported fields.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(input.caseId)) {
    throw new TypeError("caseId must be a stable identifier containing letters, digits, dot, underscore, or hyphen.");
  }
  if (input.caseName.trim().length === 0) throw new TypeError("caseName must not be blank.");
  if (input.selectedMethodIds.length === 0) throw new TypeError("Select at least one Runnable MVP method.");
  if (new Set(input.selectedMethodIds).size !== input.selectedMethodIds.length) throw new TypeError("Selected methods must be unique.");
  if (input.methodInputs.length !== input.selectedMethodIds.length) throw new TypeError("Each selected method requires exactly one input payload.");
  for (const [index, entry] of input.methodInputs.entries()) {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join("|") !== "methodId|payload" ||
      !isRecord(entry.payload)
    ) {
      throw new TypeError(`methodInputs[${String(index)}] does not match the controlled envelope.`);
    }
    const definition = DEFINITION_BY_ID.get(entry.methodId);
    if (definition === undefined) {
      throw new TypeError(`Method ${entry.methodId} is not allowlisted.`);
    }
    const fieldsById = new Map(definition.fields.map((field) => [field.id, field]));
    const unsupported = Object.keys(entry.payload).filter(
      (key) => !fieldsById.has(key),
    );
    if (unsupported.length !== 0) {
      throw new TypeError(
        `Method ${entry.methodId} contains unsupported input field ${unsupported[0]}.`,
      );
    }
    for (const [key, value] of Object.entries(entry.payload)) {
      const field = fieldsById.get(key)!;
      if (!payloadFieldIsControlled(field, value)) {
        throw new TypeError(
          `Method ${entry.methodId} input field ${key} does not match its controlled type or enumeration.`,
        );
      }
    }
  }
  for (const id of input.selectedMethodIds) {
    if (!MVP_RUNNABLE_METHOD_IDS.includes(id) || DEFINITION_BY_ID.get(id) === undefined) throw new TypeError(`Method ${id} is not allowlisted.`);
    if (!input.methodInputs.some((entry) => entry.methodId === id)) throw new TypeError(`Method ${id} has no input payload.`);
  }
}

export function buildMvpWorkspaceDraft(input: MvpWorkspaceInput): MvpWorkspaceBuildResult {
  try {
    // Capture one immutable descriptor-only view before reading any caller
    // property. This keeps the public application boundary from executing
    // accessors or validating one Proxy view and projecting another.
    const controlledInput = cloneAndDeepFreeze(input);
    validateWorkspaceShape(controlledInput);
    return {
      status: "success",
      draft: createMvpCaseDraft({
        caseId: controlledInput.caseId,
        caseName: controlledInput.caseName,
        geometryMappingId: "phase5b.method_input_provenance_only.v1",
        geometryAssumptions: [
          "Method inputs are retained in the controlled provenance marker; no generic Quantity precision is inferred by the MVP adapter.",
        ],
        geometryQuantities: [],
        operatingConditions: [],
        userInputs: [],
        displayUnits: {},
        selectedMethodIds: controlledInput.selectedMethodIds,
        methodInputs: controlledInput.methodInputs,
      }),
    };
  } catch {
    return {
      status: "invalid_input",
      failure: workspaceFailure(
        "MVP.workspace_invalid",
        "The MVP workspace input is invalid or is not stable plain JSON data.",
        "Correct the case identity, method selection, or controlled input fields.",
      ),
    };
  }
}

export function saveMvpWorkspace(
  input: MvpWorkspaceInput,
  savedAt: string | Date,
): MvpWorkspaceSaveResult {
  const built = buildMvpWorkspaceDraft(input);
  if (built.status !== "success") return built;
  try {
    const canonicalJson = saveMvpCaseDraft(built.draft, savedAt, true);
    const loaded = loadMvpCaseDraft(canonicalJson);
    if (loaded.status !== "success") throw new TypeError(loaded.message);
    return { status: "success", canonicalJson, snapshotId: loaded.caseFile.caseSnapshot.snapshotId };
  } catch {
    return {
      status: "invalid_input",
      failure: workspaceFailure(
        "MVP.case_save_failed",
        "The canonical MVP case could not be saved.",
        "Correct the case data and try again.",
      ),
    };
  }
}

export function loadMvpWorkspace(textValue: string): MvpWorkspaceLoadResult {
  const loaded = loadMvpCaseDraft(textValue);
  if (loaded.status !== "success") return loaded;
  const workspace: MvpWorkspaceInput = {
      caseId: loaded.draft.caseId,
      caseName: loaded.draft.caseName,
      selectedMethodIds: loaded.draft.selectedMethodIds,
      methodInputs: loaded.draft.methodInputs,
  };
  const projected = buildMvpWorkspaceDraft(workspace);
  if (projected.status !== "success") {
    return {
      status: "invalid_input",
      code: "mvp_case_state_mismatch",
      message: "The saved Runnable MVP inputs cannot reproduce a controlled workspace projection.",
    };
  }
  try {
    const projectedJson = saveMvpCaseDraft(
      projected.draft,
      loaded.caseFile.caseSnapshot.createdAt,
      false,
    );
    const projectedCase = loadMvpCaseDraft(projectedJson);
    if (
      projectedCase.status !== "success" ||
      projectedCase.caseFile.caseSnapshot.snapshotId !==
        loaded.caseFile.caseSnapshot.snapshotId
    ) {
      return {
        status: "invalid_input",
        code: "mvp_case_state_mismatch",
        message: "The authoritative CaseSnapshot quantities do not exactly match the saved Runnable MVP calculation inputs.",
      };
    }
  } catch {
    return {
      status: "invalid_input",
      code: "mvp_case_state_mismatch",
      message: "The saved Runnable MVP case cannot be reproduced safely.",
    };
  }
  return {
    status: "success",
    workspace,
    snapshotId: loaded.caseFile.caseSnapshot.snapshotId,
  };
}

function normalizeEm(result: MvpEmCalculationResult): MvpWorkspaceMethodResult {
  return {
    methodId: result.methodId,
    methodVersion: result.methodVersion,
    approvalStatus: result.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: item.label,
      status: item.status,
      value: item.value,
      canonicalUnitId: item.unit,
      reason: item.reason,
    })),
    warnings: result.warnings,
    assumptions: result.assumptions,
    sources: result.sources,
    applicability: {
      status: result.applicability.status,
      scope: result.applicability.domain,
      limitations: DEFINITION_BY_ID.get(result.methodId)?.limitations ?? [],
    },
    failure: result.failure,
  };
}

function normalizeInductance(
  result: MvpInductanceCalculationResult,
): MvpWorkspaceMethodResult {
  return {
    methodId: "B-03",
    methodVersion: result.methodVersion,
    approvalStatus: result.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: result.status === "disabled" ? "insufficient_data" : result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: item.label,
      status: item.status,
      value: item.value,
      canonicalUnitId: item.unit,
      reason: null,
    })),
    warnings: result.warnings,
    assumptions: result.assumptions,
    sources: result.sources,
    applicability: {
      status: result.applicability.status,
      scope: result.applicability.domain,
      limitations: result.limitations,
    },
    failure: result.failure,
  };
}

function normalizeEquivalent(
  result: MvpEquivalentCalculationResult,
): MvpWorkspaceMethodResult {
  return {
    methodId: result.methodId,
    methodVersion: result.methodVersion,
    approvalStatus: result.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: item.label,
      status: "available" as const,
      value: item.value,
      canonicalUnitId: item.unit,
      reason: null,
    })),
    warnings: result.warnings,
    assumptions: result.assumptions,
    sources: result.sources,
    applicability: {
      status: result.applicability.status,
      scope: result.applicability.domain,
      limitations: result.limitations,
    },
    failure: result.failure,
  };
}

function normalizeThermal(result: MvpThermalCalculationResult, id: "H-01" | "H-03"): MvpWorkspaceMethodResult {
  return {
    methodId: id,
    methodVersion: result.methodVersion ?? specification(id).methodVersion,
    approvalStatus: result.methodApproval ?? "approved",
    formalRuntimeActivationClaim: false,
    status: result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: { en: item.outputId, zh: item.outputId },
      status: "available",
      value: item.valueSi,
      canonicalUnitId: item.canonicalUnitId,
      reason: null,
    })),
    warnings: result.warnings.map((warning) => ({ code: null, predicate: warning.predicate, message: warning.message })),
    assumptions: result.assumptions,
    sources: [...result.sources.sourceRefs, ...result.sources.contractSourceRefs],
    applicability: {
      status: result.applicability.status,
      scope: result.applicability.scope,
      limitations: result.applicability.limitations,
    },
    failure: result.failure,
  };
}

function bilingual(value: Readonly<{ readonly zh: string; readonly en: string }>): string {
  return `${value.zh} / ${value.en}`;
}

function normalizeSkinDepth(
  result: MvpD04CalculationResult,
): MvpWorkspaceMethodResult {
  return {
    methodId: "D-04",
    methodVersion: result.methodVersion,
    approvalStatus: result.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: item.label,
      status: "available" as const,
      value: item.value,
      canonicalUnitId: item.canonicalUnit,
      reason: null,
    })),
    warnings: result.warnings.map((warning) => ({
      code: null,
      predicate: null,
      message: bilingual(warning.message),
    })),
    assumptions: result.assumptions.map(bilingual),
    sources: result.sourceTitles.map((source) => bilingual(source.title)),
    applicability: {
      status: result.applicability.status,
      scope: bilingual(result.applicability.domain),
      limitations: DEFINITION_BY_ID.get("D-04")?.limitations ?? [],
    },
    failure: result.failure,
  };
}

function normalizeRadiation(
  result: MvpJ03CalculationResult,
): MvpWorkspaceMethodResult {
  return {
    methodId: "J-03",
    methodVersion: result.methodVersion,
    approvalStatus: result.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: result.status,
    outputs: result.outputs.map((item) => ({
      outputId: item.outputId,
      label: item.label,
      status: "available" as const,
      value: item.value,
      canonicalUnitId: item.canonicalUnit,
      reason: null,
    })),
    warnings: result.warnings.map((warning) => ({
      code: null,
      predicate: null,
      message: bilingual(warning.message),
    })),
    assumptions: result.assumptions.map(bilingual),
    sources: result.sourceTitles.map((source) => bilingual(source.title)),
    applicability: {
      status: result.applicability.status,
      scope: bilingual(result.applicability.domain),
      limitations: DEFINITION_BY_ID.get("J-03")?.limitations ?? [],
    },
    failure: result.failure,
  };
}

function heatTerm(record: Record<string, JsonValue>, prefix: string) {
  const disposition = text(record, `${prefix}Disposition`);
  const common = {
    sourceMethod: text(record, `${prefix}SourceMethod`),
    sourceRef: text(record, `${prefix}SourceRef`),
    dataQuality: text(record, `${prefix}DataQuality`),
    provenanceId: text(record, `${prefix}ProvenanceId`),
    sourceSnapshotId: text(record, `${prefix}SourceSnapshotId`),
    heatPathId: text(record, `${prefix}HeatPathId`),
    physicalHeatSourceId: text(record, `${prefix}PhysicalHeatSourceId`),
  };
  if (disposition === "known_applicable") {
    return { ...common, disposition, valueW: numeric(record, `${prefix}ValueW`) };
  }
  if (disposition === "source_confirmed_not_applicable") {
    return {
        ...common,
        disposition,
        reason: text(record, `${prefix}Reason`),
        resolutionSourceRef: text(record, `${prefix}SourceRef`),
      };
  }
  return null;
}

function hasConditionalOtherTermData(record: Record<string, JsonValue>): boolean {
  return [
    "otherValueW",
    "otherSourceMethod",
    "otherSourceRef",
    "otherDataQuality",
    "otherSourceSnapshotId",
    "otherProvenanceId",
    "otherHeatPathId",
    "otherPhysicalHeatSourceId",
    "otherReason",
  ].some((key) => {
    const value = record[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function calculateOne(
  item: MvpMethodInput,
  context: { readonly caseSnapshotId: string },
): MvpWorkspaceMethodResult {
  const payload = isRecord(item.payload) ? item.payload : {};
  switch (item.methodId) {
    case "B-02":
      return normalizeEm(calculateMvpB02(payload as unknown as MvpB02CalculationInput));
    case "B-03":
      return normalizeInductance(calculateMvpB03({
        methodId: "B-03",
        purpose: "analytical_limit_check",
        currentPathDiameterM: numeric(payload, "currentPathDiameterM"),
        windingEnvelopeLengthM: numeric(payload, "windingEnvelopeLengthM"),
        electricalTurnCount: numeric(payload, "electricalTurnCount"),
        mediumKind: text(payload, "mediumKind"),
        relativePermeability: text(payload, "mediumKind") === "air"
          ? null
          : numeric(payload, "relativePermeability"),
      } as MvpB03CalculationInput));
    case "D-01":
      return normalizeEm(calculateMvpD01({
        ...payload,
        leadSegmentLengthsM: optionalNumberList(payload, "leadSegmentLengthsM"),
        busSegmentLengthsM: optionalNumberList(payload, "busSegmentLengthsM"),
      } as unknown as MvpD01CalculationInput));
    case "D-03": {
      const extrasMode = text(payload, "seriesExtrasMode");
      return normalizeEm(calculateMvpD03({
        conductorLengthM: numeric(payload, "conductorLengthM"),
        metalAreaM2: numeric(payload, "metalAreaM2"),
        resistivityOhmM: numeric(payload, "resistivityOhmM"),
        resistivityMaterialId: text(payload, "materialId"),
        resistivityTemperatureK: numeric(payload, "temperatureK"),
        resistivitySourceRef: text(payload, "resistivitySourceRef"),
        resistivityStateMatch: text(payload, "resistivityStateMatch"),
        materialDistribution: text(payload, "materialDistribution"),
        metalAreaDistribution: text(payload, "metalAreaDistribution"),
        temperatureDistribution: text(payload, "temperatureDistribution"),
        conductorMaterialId: text(payload, "materialId"),
        conductorTemperatureK: numeric(payload, "temperatureK"),
        resistanceBoundary: text(payload, "resistanceBoundary"),
        seriesExtraResistances: extrasMode === "confirmed_none" ? [] : null,
        seriesBoundaryCompleteness: extrasMode === "confirmed_none" ? "complete" : "unknown_or_incomplete",
        seriesBoundaryReferencePlane: extrasMode === "confirmed_none"
          ? "terminal_equals_conductor_plus_listed_series_extras"
          : "other_or_unknown",
      } as unknown as MvpD03CalculationInput));
    }
    case "D-04":
      return normalizeSkinDepth(calculateMvpD04({
        methodId: "D-04",
        frequencyHz: numeric(payload, "frequencyHz"),
        resistivityOhmM: numeric(payload, "resistivityOhmM"),
        relativePermeability: numeric(payload, "relativePermeability"),
        state: {
          materialClass: text(payload, "materialClass"),
          propertyStateMatch: text(payload, "propertyStateMatch"),
          temperatureK: numeric(payload, "calculationTemperatureK"),
          constitutiveRegime: text(payload, "constitutiveRegime"),
          excitation: text(payload, "excitation"),
          fieldModel: text(payload, "fieldModel"),
        },
        propertyEvidence: {
          materialSnapshotId: text(payload, "materialSnapshotId"),
          materialDisplayName: text(payload, "materialDisplayName"),
          propertyTemperatureK: numeric(payload, "propertyTemperatureK"),
          propertyFrequencyHz: numeric(payload, "propertyFrequencyHz"),
          sameMaterialStateConfirmed: bool(payload, "sameMaterialStateConfirmed"),
          resistivitySourceRef: text(payload, "resistivitySourceRef"),
          relativePermeabilitySourceRef: text(payload, "relativePermeabilitySourceRef"),
        },
      } as unknown as MvpD04CalculationInput));
    case "D-07":
      return normalizeEm(calculateMvpD07({
        resistanceOhm: numeric(payload, "resistanceOhm"),
        inductanceH: numeric(payload, "inductanceH"),
        currentA: numeric(payload, "currentA"),
        frequencyHz: numeric(payload, "frequencyHz"),
        portId: text(payload, "portId"),
        referencePlaneId: text(payload, "referencePlaneId"),
        loadedState: text(payload, "loadedState"),
        seriesEquivalentId: text(payload, "seriesEquivalentId"),
        quantityBasis: text(payload, "quantityBasis"),
        portInterpretation: bool(payload, "confirmCoilSeriesPort") ? "coil_series_equivalent_port" : "other_or_unknown",
        modelRegime: bool(payload, "confirmLinearSinusoidal") ? "linear_sinusoidal_steady_state" : "nonlinear_or_non_sinusoidal_or_unknown",
      } as unknown as MvpD07CalculationInput));
    case "F-01":
      return normalizeEquivalent(calculateMvpF01({
        primaryResistanceOhm: numeric(payload, "primaryResistanceOhm"),
        primaryInductanceH: numeric(payload, "primaryInductanceH"),
        secondaryResistanceOhm: numeric(payload, "secondaryResistanceOhm"),
        secondaryInductanceH: numeric(payload, "secondaryInductanceH"),
        mutualInductanceH: numeric(payload, "mutualInductanceH"),
        frequencyHz: numeric(payload, "frequencyHz"),
        primaryPortId: text(payload, "primaryPortId"),
        secondaryPortId: text(payload, "secondaryPortId"),
        primaryReferencePlaneId: text(payload, "primaryReferencePlaneId"),
        secondaryReferencePlaneId: text(payload, "secondaryReferencePlaneId"),
        quantityBasis: text(payload, "quantityBasis"),
        loadedState: text(payload, "loadedState"),
        primaryMaterialStateId: text(payload, "primaryMaterialStateId"),
        secondaryMaterialStateId: text(payload, "secondaryMaterialStateId"),
        primaryTemperatureK: numeric(payload, "primaryTemperatureK"),
        secondaryTemperatureK: numeric(payload, "secondaryTemperatureK"),
        caseSnapshotId: context.caseSnapshotId,
        primaryMaterialSnapshotId: text(payload, "primaryMaterialSnapshotId"),
        secondaryMaterialSnapshotId: text(payload, "secondaryMaterialSnapshotId"),
        coupledCircuitStateId: text(payload, "coupledCircuitStateId"),
        primaryParameterSourceKind: text(payload, "primaryParameterSourceKind"),
        secondaryParameterSourceKind: text(payload, "secondaryParameterSourceKind"),
        mutualParameterSourceKind: text(payload, "mutualParameterSourceKind"),
        primarySourceRef: text(payload, "primarySourceRef"),
        secondarySourceRef: text(payload, "secondarySourceRef"),
        mutualSourceRef: text(payload, "mutualSourceRef"),
        primaryStateMatch: text(payload, "primaryStateMatch"),
        secondaryStateMatch: text(payload, "secondaryStateMatch"),
        mutualStateMatch: text(payload, "mutualStateMatch"),
        modelRegime: text(payload, "modelRegime"),
      } as MvpF01CalculationInput));
    case "H-03":
      {
        const flowSourceMethod = text(payload, "flowSourceMethod");
      return normalizeThermal(calculateMvpThermal({
        methodId: "H-03",
        binding: {
          caseSnapshotId: context.caseSnapshotId,
          coolantNetworkId: text(payload, "coolantNetworkId"),
          branchId: text(payload, "branchId"),
          timeBasisId: text(payload, "timeBasisId"),
        },
        explicitBranchFlow: {
          volumeFlowM3PerS: numeric(payload, "volumeFlowM3PerS"),
          oneDeclaredBranchConfirmed: bool(payload, "oneDeclaredBranchConfirmed"),
          sourceMethod: flowSourceMethod,
          sourceRef: text(payload, "flowSourceRef"),
          dataQuality: text(payload, "flowDataQuality"),
          provenanceId: text(payload, "flowProvenanceId"),
          sourceSnapshotId: flowSourceMethod === "case_input"
            ? context.caseSnapshotId
            : text(payload, "flowSourceSnapshotId"),
        },
        d02Geometry: {
          flowAreaM2: numeric(payload, "flowAreaM2"),
          wettedPerimeterM: numeric(payload, "wettedPerimeterM"),
          sourceMethodId: "D-02",
          verifiedD02Snapshot: bool(payload, "verifiedD02Snapshot"),
          sameD02HydraulicGeometryConfirmed: bool(payload, "sameD02HydraulicGeometryConfirmed"),
          sourceRef: text(payload, "d02SourceRef"),
          dataQuality: text(payload, "d02DataQuality"),
          provenanceId: text(payload, "d02ProvenanceId"),
          sourceSnapshotId: text(payload, "d02SourceSnapshotId"),
          geometrySnapshotId: text(payload, "d02GeometrySnapshotId"),
          hydraulicGeometryId: text(payload, "hydraulicGeometryId"),
        },
      }), "H-03");
      }
    case "H-01": {
      const otherLoadPresent = bool(payload, "otherLoadPresent");
      const otherDisposition = text(payload, "otherDisposition");
      const otherTerm = heatTerm(payload, "other");
      const otherLoads = otherLoadPresent
        ? otherDisposition === "known_applicable" ? [otherTerm] : [null]
        : otherDisposition === "source_confirmed_not_applicable"
          ? [otherTerm]
          : otherDisposition === "" && !hasConditionalOtherTermData(payload)
            ? []
            : [null];
      return normalizeThermal(calculateMvpThermal({
        methodId: "H-01",
        controlVolume: {
          controlVolumeId: text(payload, "controlVolumeId"),
          coolantCircuitId: text(payload, "coolantCircuitId"),
          caseSnapshotId: context.caseSnapshotId,
          timeBasisId: text(payload, "timeBasisId"),
          singleDeclaredCircuitConfirmed: bool(payload, "singleDeclaredCircuitConfirmed"),
          boundaryCompleteConfirmed: bool(payload, "boundaryCompleteConfirmed"),
          forbiddenHeatClassesExcludedConfirmed: bool(payload, "forbiddenHeatClassesExcludedConfirmed"),
          multiCircuitAggregationAbsentConfirmed: bool(payload, "multiCircuitAggregationAbsentConfirmed"),
        },
        copperLoss: heatTerm(payload, "copper"),
        externalHeatPickupToCoil: heatTerm(payload, "pickup"),
        magneticMaterialLoss: heatTerm(payload, "magnetic"),
        otherCooledLoads: otherLoads,
        otherLoadsEnumerationComplete: bool(payload, "otherLoadsEnumerationComplete"),
        otherLoadsEnumerationSourceRef: text(payload, "otherLoadsEnumerationSourceRef"),
        pairwiseDisjointPathsConfirmed: bool(payload, "pairwiseDisjointPathsConfirmed"),
        physicalSourceIdentityChecked: bool(payload, "physicalSourceIdentityChecked"),
        overlapAssessmentSourceRef: text(payload, "overlapAssessmentSourceRef"),
        designMarginStatus: bool(payload, "designMarginNotRequested") ? "not_requested" : "requested",
      }), "H-01");
    }
    case "J-03": {
      const configuration = text(payload, "configuration");
      const counterpartKind = text(payload, "counterpartKind");
      const counterpart: Record<string, unknown> = {
        kind: counterpartKind,
        temperatureK: numeric(payload, "counterpartTemperatureK"),
      };
      if (counterpartKind === "concentric_outer_surface") {
        Object.assign(counterpart, {
          emissivity: numeric(payload, "surface2Emissivity"),
          areaM2: numeric(payload, "surface2AreaM2"),
          materialSnapshotId: text(payload, "surface2MaterialSnapshotId"),
          emissivitySourceRef: text(payload, "surface2EmissivitySourceRef"),
          emissivityStateTemperatureK: numeric(
            payload,
            "surface2EmissivityStateTemperatureK",
          ),
        });
      } else if (hasJ03Surface2Data(payload)) {
        // Preserve contradictory caller data as extra evaluator fields so the
        // exact-schema boundary rejects it instead of silently discarding it.
        Object.assign(counterpart, {
          emissivity: optionalNumeric(payload, "surface2Emissivity"),
          areaM2: optionalNumeric(payload, "surface2AreaM2"),
          materialSnapshotId: text(payload, "surface2MaterialSnapshotId"),
          emissivitySourceRef: text(payload, "surface2EmissivitySourceRef"),
          emissivityStateTemperatureK: optionalNumeric(
            payload,
            "surface2EmissivityStateTemperatureK",
          ),
        });
      }
      return normalizeRadiation(calculateMvpJ03({
        methodId: "J-03",
        configuration,
        surface1: {
          temperatureK: numeric(payload, "surface1TemperatureK"),
          emissivity: numeric(payload, "surface1Emissivity"),
          areaM2: numeric(payload, "surface1AreaM2"),
          materialSnapshotId: text(payload, "surface1MaterialSnapshotId"),
          emissivitySourceRef: text(payload, "surface1EmissivitySourceRef"),
          emissivityStateTemperatureK: numeric(
            payload,
            "surface1EmissivityStateTemperatureK",
          ),
        },
        counterpart,
        boundaryEvidence: {
          geometrySnapshotId: text(payload, "geometrySnapshotId"),
          snapshotConfiguration: text(payload, "snapshotConfiguration"),
          snapshotSurface1AreaM2: numeric(payload, "snapshotSurface1AreaM2"),
          snapshotSurface2AreaM2: optionalNumeric(
            payload,
            "snapshotSurface2AreaM2",
          ),
          temperatureScale: text(payload, "temperatureScale"),
          diffuseGraySurfacesConfirmed: bool(
            payload,
            "diffuseGraySurfacesConfirmed",
          ),
          viewFactor: numeric(payload, "viewFactor"),
          noUnmodelledOpeningsOrObstructionsConfirmed: bool(
            payload,
            "noUnmodelledOpeningsOrObstructionsConfirmed",
          ),
          longConcentricEndEffectsNegligible: j03ConcentricEvidence(
            payload,
            "longConcentricEndEffectsStatus",
            configuration,
          ),
          surface1IsInnerSurface: j03ConcentricEvidence(
            payload,
            "surface1RoleStatus",
            configuration,
          ),
        },
      }));
    }
  }
}

export function calculateMvpWorkspace(
  input: MvpWorkspaceInput,
  calculatedAt: string | Date,
): MvpWorkspaceCalculationResult {
  const built = buildMvpWorkspaceDraft(input);
  if (built.status !== "success") return built;
  try {
    const canonicalJson = saveMvpCaseDraft(built.draft, calculatedAt, false);
    const loaded = loadMvpCaseDraft(canonicalJson);
    if (loaded.status !== "success") throw new TypeError(loaded.message);
    const context = {
      caseSnapshotId: loaded.caseFile.caseSnapshot.snapshotId,
    };
    const byId = new Map(built.draft.methodInputs.map((item) => [item.methodId, item]));
    const results = built.draft.selectedMethodIds.map((id) => calculateOne(byId.get(id)!, context));
    return { status: "success", snapshotId: context.caseSnapshotId, results };
  } catch {
    return {
      status: "invalid_input",
      failure: workspaceFailure(
        "MVP.calculation_failed",
        "The MVP calculation request could not be evaluated.",
        "Correct the case input and try again.",
      ),
    };
  }
}
