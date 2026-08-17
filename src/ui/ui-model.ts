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
  | "D-07"
  | "F-01"
  | "H-01"
  | "H-03";

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
  readonly executionBoundary: "phase_5b_controlled_mvp_adapter";
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
  readonly mvp: UiMvpApplication;
  readonly inspectCaseJson: (text: string) => UiCaseImportResult;
}
