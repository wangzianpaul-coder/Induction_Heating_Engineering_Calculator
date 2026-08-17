export {
  APPLICATION_READINESS,
  METHOD_READINESS_ROWS,
  METHOD_READINESS_SUMMARY,
  PARAMETER_DEFINITION_ROWS,
  inspectCurrentCaseFile,
  queryParameterDefinitionRows,
} from "./readModels.js";

export type {
  ConsumingMethodRow,
  ControlledDerivationRow,
  CurrentCaseInspectionResult,
  CurrentCaseSummary,
  MethodReadinessRow,
  MethodRuntimeBlockReason,
  ParameterDefinitionFilters,
  ParameterDefinitionRow,
  UnitDefinitionRow,
} from "./readModels.js";

export {
  MVP_RUNNABLE_METHOD_DEFINITIONS,
  buildMvpWorkspaceDraft,
  calculateMvpWorkspace,
  loadMvpWorkspace,
  saveMvpWorkspace,
} from "./mvpWorkspace.js";

export type {
  MvpInputFieldDefinition,
  MvpInputFieldKind,
  MvpInputFieldOption,
  MvpRunnableMethodDefinition,
  MvpWorkspaceCalculationResult,
  MvpWorkspaceFailure,
  MvpWorkspaceInput,
  MvpWorkspaceLoadResult,
  MvpWorkspaceMethodResult,
  MvpWorkspaceOutput,
  MvpWorkspaceSaveResult,
} from "./mvpWorkspace.js";

export type {
  MvpMethodInput,
  MvpRunnableMethodId,
} from "./mvpCaseService.js";

export {
  MVP_INDUCTANCE_CALCULATION_SCOPE,
  MVP_INDUCTANCE_METHOD_READINESS,
  calculateMvpB03,
  compareMvpInductanceResults,
} from "./mvpInductanceCalculations.js";

export type {
  MvpB03CalculationInput,
  MvpInductanceCalculationResult,
  MvpInductanceComparisonResult,
} from "./mvpInductanceCalculations.js";

export {
  MVP_EQUIVALENT_CALCULATION_SCOPE,
  calculateMvpF01,
} from "./mvpEquivalentCalculations.js";

export type {
  MvpEquivalentCalculationResult,
  MvpF01CalculationInput,
} from "./mvpEquivalentCalculations.js";

export {
  MVP_D04_CALCULATION_SCOPE,
  MVP_D04_METHOD_ID,
  calculateMvpD04,
} from "./mvpSkinDepthCalculations.js";

export type {
  MvpD04CalculationFailure,
  MvpD04CalculationInput,
  MvpD04CalculationOutput,
  MvpD04CalculationResult,
  MvpD04CalculationWarning,
  MvpD04LocalizedText,
  MvpD04PropertyEvidenceInput,
  MvpD04SourceTitle,
} from "./mvpSkinDepthCalculations.js";

export {
  MVP_J03_CALCULATION_SCOPE,
  MVP_J03_METHOD_ID,
  calculateMvpJ03,
} from "./mvpRadiationCalculations.js";

export type {
  MvpJ03CalculationFailure,
  MvpJ03CalculationInput,
  MvpJ03CalculationOutput,
  MvpJ03CalculationResult,
  MvpJ03CalculationWarning,
  MvpJ03LocalizedText,
  MvpJ03SourceTitle,
} from "./mvpRadiationCalculations.js";

export {
  BASIC_CALCULATOR_POLICY,
  BASIC_CALCULATOR_SCHEMA_VERSION,
  calculateBasicCalculator,
} from "./basicCalculator.js";

export {
  LEGACY_BASIC_CALCULATOR_SCHEMA_VERSION,
  LEGACY_BASIC_DEFAULT_INPUT,
  LEGACY_BASIC_MU0,
  LEGACY_NAGAOKA_TABLE,
  calculateLegacyBasicCalculator,
  legacyEllipticBySimpson,
  legacyEvenSegmentCount,
  legacyIdealInductanceMicroH,
  legacyNagaokaCoefficient,
  legacyNagaokaMicroH,
  legacySkinDepthMm,
  legacyTableLookupKn,
  legacyWheelerMultiMicroH,
  legacyWheelerSingleMicroH,
} from "./legacyBasicCalculator.js";

export type {
  LegacyBasicCalculatorInput,
  LegacyBasicCalculatorResult,
  LegacyBasicInvalidResult,
  LegacyBasicValidResult,
  LegacyCalculationIssue,
  LegacyCoilType,
  LegacyEllipticResult,
  LegacyNagaokaInductanceResult,
  LegacyNagaokaLookupResult,
  LegacyNagaokaResult,
  LegacyNagaokaSource,
  LegacySimpsonRow,
} from "./legacyBasicCalculator.js";

export type {
  BasicCalculatorError,
  BasicCalculatorInput,
  BasicCalculatorOutput,
  BasicCalculatorOverallStatus,
  BasicCalculatorResult,
  BasicCalculatorSectionKey,
  BasicCalculatorSectionResult,
  BasicCalculatorSectionStatus,
  BasicCoilInput,
  BasicComplexValue,
  BasicLocalizedText,
  BasicSeriesElectricalInput,
} from "./basicCalculator.js";

export {
  buildVisualizationSceneFromMechanicalInput,
  loadCaseVisualizationScene,
} from "./visualizationService.js";

export type {
  CaseVisualizationLoadResult,
  MechanicalVisualizationBuildResult,
  MechanicalVisualizationInput,
} from "./visualizationService.js";
