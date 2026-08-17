export const TECHNICAL_FREEZE_ID = "IH-EC-V1-G0-2026-08-14-01" as const;

export const VERSION_INFO = Object.freeze({
  application: "0.3.0-mvp.1",
  calculationModel: "1.0.0-gate0",
  materialDatabase: "0.0.0-unreleased",
  caseSchema: "1.0.0-alpha.1",
  resultSchema: "1.0.0-alpha.1",
  geometrySchema: "1.0.0-alpha.1",
  materialSchema: "1.0.0-alpha.1",
  unitRegistry: "1.0.0-gate0",
  parameterRegistry: "1.0.0-gate0",
  methodRegistry: "1.0.0-gate0",
  warningRules: "1.0.0-gate0",
  decisionBaseline: "ADR-0002..ADR-0009@IH-EC-V1-G0-2026-08-14-01",
  calculationBasis: "CALCULATION_BASIS@IH-EC-V1-G0-2026-08-14-01",
  calculationContracts: "CALCULATION_CONTRACTS@IH-EC-V1-G0-2026-08-14-01",
  technicalFreezeId: TECHNICAL_FREEZE_ID,
  implementationPhase: "phase_5b_runnable_mvp",
} as const);

export type VersionInfo = typeof VERSION_INFO;
