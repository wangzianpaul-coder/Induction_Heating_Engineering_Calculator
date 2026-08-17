import type { ParametricSceneView } from "../visualization/index.js";

export interface UiVersionItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface UiCapability {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  readonly reason: string;
}

export interface UiParameterRecord {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly localizedName: string;
  readonly module: string;
  readonly dimension: string;
  readonly canonicalUnit: string;
  readonly displayUnits: readonly string[];
  readonly role: string;
  readonly requirement: string;
  readonly physicalRange: string;
  readonly applicability: string;
  readonly definition: string;
  readonly help: string;
  readonly consumingMethods: readonly string[];
  readonly sourceReferences: readonly string[];
  readonly defaultPolicy: string;
}

export interface UiMethodRecord {
  readonly id: string;
  readonly methodVersion: string;
  readonly name: string;
  readonly localizedName: string;
  readonly purpose: string;
  readonly module: string;
  readonly methodType: string;
  readonly approvalStatus: string;
  readonly lifecycleStatus: string;
  readonly executionStatus: string;
  readonly executionEnabled: boolean;
  readonly executionReason: string;
  readonly scientificConfidence: string;
  readonly recommendation: string;
  readonly requiresSubmethodSplit: boolean;
  readonly implementationAvailable: boolean;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

export interface UiCaseField {
  readonly label: string;
  readonly value: string;
}

export interface UiCaseInspection {
  readonly caseId: string;
  readonly snapshotId: string;
  readonly fields: readonly UiCaseField[];
}

export type UiMvpRunnableMethodId =
  | "B-02"
  | "B-03"
  | "D-01"
  | "D-03"
  | "D-04"
  | "D-07"
  | "F-01"
  | "H-01"
  | "H-03"
  | "J-03";

export type UiMvpInputFieldKind =
  | "number"
  | "text"
  | "select"
  | "boolean"
  | "number_list_optional";

export interface UiMvpInputFieldOption {
  readonly value: string;
  readonly label: string;
}

export interface UiMvpInputFieldDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly kind: UiMvpInputFieldKind;
  readonly unit: string | null;
  readonly required: boolean;
  readonly placeholder: string;
  readonly options: readonly UiMvpInputFieldOption[];
}

export interface UiMvpRunnableMethodDefinition {
  readonly methodId: UiMvpRunnableMethodId;
  readonly methodVersion: string;
  readonly name: Readonly<{ readonly en: string; readonly zh: string }>;
  readonly moduleId: string;
  readonly purpose: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
  readonly executionBoundary: "v0_9_controlled_application_adapter";
  readonly formalRuntimeActivationClaim: false;
  readonly sourceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly fields: readonly UiMvpInputFieldDefinition[];
}

export type UiMvpJsonValue =
  | boolean
  | number
  | string
  | null
  | readonly UiMvpJsonValue[]
  | { readonly [key: string]: UiMvpJsonValue };

export interface UiMvpMethodInput {
  readonly methodId: UiMvpRunnableMethodId;
  readonly payload: Readonly<Record<string, UiMvpJsonValue>>;
}

export interface UiMvpWorkspaceInput {
  readonly caseId: string;
  readonly caseName: string;
  readonly selectedMethodIds: readonly UiMvpRunnableMethodId[];
  readonly methodInputs: readonly UiMvpMethodInput[];
}

export interface UiMvpFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface UiMvpOutput {
  readonly outputId: string;
  readonly label: Readonly<{ readonly en: string; readonly zh: string }>;
  readonly status: "available" | "unavailable";
  readonly value: number | Readonly<{ readonly real: number; readonly imaginary: number }> | null;
  readonly canonicalUnitId: string | null;
  readonly reason: string | null;
}

export interface UiMvpMethodResult {
  readonly methodId: UiMvpRunnableMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success"
    | "success_with_warnings"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly UiMvpOutput[];
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
  readonly failure: UiMvpFailure | null;
}

export type UiMvpCalculationResult =
  | {
      readonly status: "success";
      readonly snapshotId: string;
      readonly results: readonly UiMvpMethodResult[];
    }
  | {
      readonly status: "invalid_input";
      readonly failure: UiMvpFailure;
    };

export type UiMvpSaveResult =
  | { readonly status: "success"; readonly canonicalJson: string; readonly snapshotId: string }
  | { readonly status: "invalid_input"; readonly failure: UiMvpFailure };

export type UiMvpLoadResult =
  | { readonly status: "success"; readonly workspace: UiMvpWorkspaceInput; readonly snapshotId: string }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: string;
      readonly message: string;
    };

export interface UiMvpApplication {
  readonly methods: readonly UiMvpRunnableMethodDefinition[];
  readonly calculate: (
    input: UiMvpWorkspaceInput,
    calculatedAt: string | Date,
  ) => UiMvpCalculationResult;
  readonly save: (input: UiMvpWorkspaceInput, savedAt: string | Date) => UiMvpSaveResult;
  readonly load: (text: string) => UiMvpLoadResult;
}

export interface UiBasicLocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface UiBasicCoilInput {
  readonly electricalTurnCount: number;
  readonly conductorAxialSizeMm: number;
  readonly windingLengthMm: number;
  readonly currentPathDiameterMm: number;
  readonly windingConstruction: "uniform_identical_single_layer" | "other_or_unknown";
  readonly fullPhysicalWindingLengthConfirmed: boolean;
  readonly nonOverlappingTurnsConfirmed: boolean;
  readonly magneticMedium: "air" | "uniform_linear";
  readonly relativePermeability: number | null;
}

export interface UiBasicSeriesElectricalInput {
  readonly resistanceOhm: number;
  readonly inductanceMicrohenry: number;
  readonly currentA: number;
  readonly frequencyKhz: number;
  readonly portName: string;
  readonly referencePlaneName: string;
  readonly loadedState: "empty" | "workpiece_cold" | "workpiece_hot" | "measured_state" | "user_defined_state";
  readonly equivalentStateName: string;
  readonly currentBasis: "rms" | "fundamental_rms";
  readonly coilSeriesPortConfirmed: boolean;
  readonly linearSinusoidalStateConfirmed: boolean;
}

export interface UiBasicCalculatorInput {
  readonly schemaVersion: "0.9.0";
  readonly coil: UiBasicCoilInput | null;
  readonly seriesElectrical: UiBasicSeriesElectricalInput | null;
}

export interface UiBasicCalculatorOutput {
  readonly key: string;
  readonly label: UiBasicLocalizedText;
  readonly status: "available" | "unavailable";
  readonly value: number | Readonly<{ readonly real: number; readonly imaginary: number }> | null;
  readonly unit: "one" | "µH" | "Ω" | "V" | null;
  readonly note: UiBasicLocalizedText | null;
}

export interface UiBasicCalculatorError {
  readonly code: string;
  readonly message: UiBasicLocalizedText;
  readonly action: UiBasicLocalizedText;
}

export interface UiBasicCalculatorSectionResult {
  readonly section: "coil_fill_factor" | "ideal_long_solenoid_limit" | "series_port_electrical";
  readonly title: UiBasicLocalizedText;
  readonly status: "success" | "success_with_warnings" | "invalid_input" | "insufficient_data" | "not_applicable" | "not_requested";
  readonly outputs: readonly UiBasicCalculatorOutput[];
  readonly warnings: readonly UiBasicLocalizedText[];
  readonly assumptions: readonly UiBasicLocalizedText[];
  readonly limitations: readonly UiBasicLocalizedText[];
  readonly sourceTitles: readonly UiBasicLocalizedText[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly summary: UiBasicLocalizedText;
  }>;
  readonly error: UiBasicCalculatorError | null;
}

export interface UiBasicCalculatorResult {
  readonly schemaVersion: "0.9.0";
  readonly status: "complete" | "partial" | "failed" | "empty" | "invalid_input";
  readonly sections: readonly UiBasicCalculatorSectionResult[];
  readonly notices: readonly UiBasicLocalizedText[];
  readonly error: UiBasicCalculatorError | null;
}

export interface UiBasicCalculatorApplication {
  readonly schemaVersion: "0.9.0";
  readonly calculate: (input: UiBasicCalculatorInput) => UiBasicCalculatorResult;
}

export interface UiLegacyBasicCalculatorInput {
  readonly coilType: "single" | "multi";
  readonly nagaokaSource: "integral" | "table" | "manual";
  readonly coilLengthMm: number;
  readonly coilInnerDiameterMm: number;
  readonly turns: number;
  readonly radialWidthMm: number;
  readonly conductorHeightMm: number;
  readonly simpsonN: number;
  readonly manualKn: number;
  readonly lineVoltageV: number;
  readonly ratedPowerKw: number;
  readonly frequencyKHz: number;
  readonly rectifierFactor: number;
  readonly equivalentResistanceOhm: number;
  readonly targetQ: number;
  readonly copperResistivityMicroOhmCm: number;
  readonly workpieceMuR: number;
  readonly workpieceResistivityMicroOhmCm: number;
  readonly workpieceLengthMm: number;
  readonly workpieceDiameterMm: number;
  readonly coilAcResistanceOhm: number;
  readonly coolingFactor: number;
  readonly inletTempC: number;
  readonly outletTempC: number;
  readonly waterSpecificHeat: number;
  readonly waterDensityKgL: number;
}

export interface UiLegacySimpsonRow {
  readonly i?: number;
  readonly theta?: number;
  readonly weight?: number;
  readonly fF?: number;
  readonly fE?: number;
  readonly gap?: true;
}

export interface UiLegacyNagaokaLookupResult {
  readonly kn: number;
  readonly status: "invalid" | "out-low" | "out-high" | "exact" | "interpolated";
  readonly interval: string;
  readonly low?: readonly [number, number];
  readonly high?: readonly [number, number];
}

export interface UiLegacyCalculationIssue {
  readonly type: "warn" | "error";
  readonly text: string;
}

export interface UiLegacyBasicInvalidResult {
  readonly input: UiLegacyBasicCalculatorInput;
  readonly valid: false;
  readonly error: string;
  readonly issues: readonly UiLegacyCalculationIssue[];
}

export interface UiLegacyBasicValidResult {
  readonly input: UiLegacyBasicCalculatorInput;
  readonly valid: true;
  readonly issues: readonly UiLegacyCalculationIssue[];
  readonly status: "ok" | "warn";
  readonly geometry: Readonly<{
    outerDiameterMm: number;
    meanDiameterMm: number;
    radiusMm: number;
    aspectLD: number;
    aspectDL: number;
    fillFactor: number;
  }>;
  readonly inductance: Readonly<{
    ideal: number;
    nagaokaIntegral: Readonly<{
      kn: number;
      k: number;
      F: number;
      E: number;
      n: number;
      sampleRows: readonly UiLegacySimpsonRow[];
      ideal: number;
      inductance: number;
    }>;
    table: UiLegacyNagaokaLookupResult;
    tableInductance: number;
    selectedKn: number;
    knSourceLabel: string;
    knSourceActual: "integral" | "table" | "manual";
    nagaokaSelectedInductance: number;
    wheelerSingle: number;
    wheelerMulti: number;
    method: string;
    selected: number;
    reason: string;
    routeLabel: string;
  }>;
  readonly material: Readonly<{
    copperSkinDepthMm: number;
    workpieceSkinDepthMm: number;
  }>;
  readonly electrical: Readonly<{
    currentA: number;
    equivalentResistanceOhm: number;
    equivalentInductanceMicroH: number;
    coilVoltageV: number;
    activeVoltageV: number;
    transformerRatio: number;
  }>;
  readonly cooling: Readonly<{
    coilLossKw: number;
    temperatureRiseC: number;
    waterFlowLMin: number;
  }>;
}

export type UiLegacyBasicCalculatorResult =
  | UiLegacyBasicInvalidResult
  | UiLegacyBasicValidResult;

export interface UiLegacyBasicCalculatorApplication {
  readonly schemaVersion: "0.9.0-compat.1";
  readonly defaultInput: UiLegacyBasicCalculatorInput;
  readonly nagaokaTable: readonly (readonly [number, number])[];
  readonly calculate: (
    input: UiLegacyBasicCalculatorInput,
  ) => UiLegacyBasicCalculatorResult;
  readonly lookupKn: (ratio: number) => UiLegacyNagaokaLookupResult;
  readonly nagaokaMicroH: (
    radiusMm: number,
    lengthMm: number,
    turns: number,
    n?: number,
  ) => UiLegacyBasicValidResult["inductance"]["nagaokaIntegral"];
}

export interface UiMechanicalVisualizationInput {
  readonly snapshotCreatedAt: string;
  readonly declaredValidDigits: number;
  readonly workpieceOuterDiameterMm: number;
  readonly workpieceInnerDiameterMm: number;
  readonly workpieceActiveLengthMm: number;
  readonly insulationInnerDiameterMm: number;
  readonly insulationOuterDiameterMm: number;
  readonly radialGapMm: number;
  readonly coilInnerDiameterMm: number;
  readonly coilOuterDiameterMm: number;
  readonly coilMeanDiameterMm: number;
  readonly coilWindingEnvelopeLengthMm: number;
  readonly helixRevolutionCount: number;
  readonly helixAxialAdvanceMm: number;
  readonly leadLengthMm: number;
  readonly conductorRadialSizeMm: number;
  readonly conductorOuterDiameterMm: number;
  readonly conductorInnerDiameterMm: number;
}

export type UiMechanicalVisualizationBuildResult =
  | { readonly status: "success"; readonly scene: ParametricSceneView }
  | {
      readonly status: "failed";
      readonly errorCode:
        | "invalid_mechanical_input"
        | "inconsistent_geometry"
        | "viewer_capacity_exceeded";
      readonly messageZh: string;
      readonly messageEn: string;
    };

export type UiCaseVisualizationLoadResult =
  | { readonly status: "success"; readonly caseName: string; readonly scene: ParametricSceneView }
  | {
      readonly status: "failed";
      readonly errorCode: string;
      readonly messageZh: string;
      readonly messageEn: string;
      readonly missingInputsZh: readonly string[];
    };

export interface UiVisualizationApplication {
  readonly buildFromMechanicalInput: (
    input: UiMechanicalVisualizationInput,
  ) => UiMechanicalVisualizationBuildResult;
  readonly loadCase: (caseJson: string) => UiCaseVisualizationLoadResult;
}

export type UiCaseImportResult =
  | {
      readonly status: "success";
      readonly inspection: UiCaseInspection;
      readonly validatedJson: string;
    }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: string;
      readonly message: string;
    };

export interface UiReferenceModel {
  readonly productName: string;
  readonly productShortName: string;
  readonly phaseLabel: string;
  readonly technicalFreezeId: string;
  readonly parameters: readonly UiParameterRecord[];
  readonly methods: readonly UiMethodRecord[];
  readonly capabilities: readonly UiCapability[];
  readonly versions: readonly UiVersionItem[];
}

export interface EngineeringUiApplication {
  readonly reference: UiReferenceModel;
  readonly basic: UiBasicCalculatorApplication;
  readonly basicMatching: UiLegacyBasicCalculatorApplication;
  readonly visualization: UiVisualizationApplication;
  readonly mvp: UiMvpApplication;
  readonly inspectCaseJson: (text: string) => UiCaseImportResult;
}
