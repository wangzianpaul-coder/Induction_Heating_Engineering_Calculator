import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as publicApi from "../../../src/public-api.js";
import { methodId } from "../../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  F02_BINARY64_MIN_NORMAL,
  F02_CONTRACT_SOURCE_REFS,
  F02_DERIVATION_REFS,
  F02_DHT_CONTROLLED_SOURCE,
  F02_IMPLEMENTATION_READINESS,
  F02_MEASURED_PORT_IMPEDANCE_MAPPING,
  F02_METHOD_CHECK_IDS,
  F02_METHOD_ID,
  F02_METHOD_VERSION,
  F02_NUMERIC_REPRESENTABILITY_POLICY,
  F02_SOURCE_REFS,
  F02_VALIDATION_CASE_IDS,
  F02_WARNING_PREDICATES,
  evaluateF02MeasuredPortImpedance,
  type F02MeasuredPortImpedanceInput,
  type F02MeasuredPortImpedanceSuccess,
  type F02MeasurementBindingEvidence,
  type F02PrecomputedExpandedUncertaintyPackage,
} from "../../../src/methods/F/f02MeasuredPortImpedance.js";

const CASE_SNAPSHOT_A = `case:${"a".repeat(64)}`;
const CASE_SNAPSHOT_B = `case:${"b".repeat(64)}`;
const RAW_ARTIFACT_SHA256 = "c".repeat(64);
const MEASUREMENT_SNAPSHOT_ID = "measurement.f02.hot.10khz.window-001";
const RAW_ARTIFACT_ID = "raw.measurement.artifact.f02.001";
const DERIVATION_RECORD_ID = "measurement.derivation.f02.001";
const DEEMBEDDING_SNAPSHOT_ID = "deembedding.f02.001";
const FREQUENCY_HZ = 10_000;
const CURRENT_A = 10;
const RESISTANCE_OHM = 0.05;
const INDUCTANCE_H = 10e-6;
const REACTANCE_OHM = 2 * Math.PI * FREQUENCY_HZ * INDUCTANCE_H;
const IMPEDANCE_MAGNITUDE_OHM = Math.hypot(
  RESISTANCE_OHM,
  REACTANCE_OHM,
);
const VOLTAGE_V = CURRENT_A * IMPEDANCE_MAGNITUDE_OHM;
const ACTIVE_POWER_W = CURRENT_A ** 2 * RESISTANCE_OHM;

function binding(
  overrides: Partial<F02MeasurementBindingEvidence> = {},
): F02MeasurementBindingEvidence {
  return {
    caseSnapshotId: CASE_SNAPSHOT_A,
    measurementSnapshotId: MEASUREMENT_SNAPSHOT_ID,
    electricalStateSnapshotId: "electrical.loaded.hot.10khz",
    portId: "coil.input.port",
    positiveTerminalId: "coil.input.plus",
    negativeTerminalId: "coil.input.minus",
    referencePlaneId: "coil.deembedded.reference-plane",
    loadedState: "workpiece_hot",
    frequencyHz: FREQUENCY_HZ,
    timeBasisId: "steady.measurement.window",
    measurementWindowId: "window-001",
    temperatureSnapshotId: "temperature.window-001",
    temperatureK: 673.15,
    waveformDefinition: "approximately_sinusoidal_fundamental",
    currentDirection: "into_passive_port",
    phasorTimeConvention: "exp_j_omega_t",
    portModel: "series_equivalent_at_declared_port",
    ...overrides,
  };
}

function uncertainty(
  overrides: Partial<F02PrecomputedExpandedUncertaintyPackage> = {},
): F02PrecomputedExpandedUncertaintyPackage {
  return {
    kind: "precomputed_expanded_uncertainty_package",
    measurementSnapshotId: MEASUREMENT_SNAPSHOT_ID,
    rawArtifactId: RAW_ARTIFACT_ID,
    rawArtifactSha256: RAW_ARTIFACT_SHA256,
    derivationRecordId: DERIVATION_RECORD_ID,
    deembeddingSnapshotId: DEEMBEDDING_SNAPSHOT_ID,
    componentUncertaintySnapshotId: "uncertainty.components.f02.001",
    voltageStandardUncertaintyV: 0,
    currentStandardUncertaintyA: 0,
    activePowerStandardUncertaintyW: 0,
    reactiveSignResolutionUncertaintySnapshotId:
      "uncertainty.reactive-sign.f02.001",
    activePowerMinusApparentPowerExpandedUncertaintyW: 0,
    reactanceSquaredExpandedUncertaintyOhm2: 0,
    impedanceMagnitudeExpandedUncertaintyOhm: 0,
    equivalentResistanceExpandedUncertaintyOhm: 0,
    reactanceExpandedUncertaintyOhm: 0,
    inductanceExpandedUncertaintyH: 0,
    qualityFactorExpandedUncertaintyOne: 0,
    coverageFactor: 2,
    covarianceTreatmentId: "covariance.full-matrix.f02.001",
    propagationMethodId: "measurement-uncertainty-propagation.f02",
    propagationMethodVersion: "1.0.0",
    propagationRecordId: "propagation.f02.001",
    uncertaintySourceRef: "PROJECT-MEAS-UNCERTAINTY:F02:001",
    calibrationCertificateId: "calibration.certificate.001",
    fixtureAndLeadContributionsIncluded: true,
    ...overrides,
  };
}

function input(): F02MeasuredPortImpedanceInput {
  return {
    voltage: {
      kind: "available",
      voltageV: VOLTAGE_V,
      quantityBasis: "fundamental_rms",
      binding: binding(),
    },
    current: {
      kind: "available",
      currentA: CURRENT_A,
      quantityBasis: "fundamental_rms",
      binding: binding(),
    },
    activePower: {
      kind: "available",
      activePowerW: ACTIVE_POWER_W,
      activePowerBasis: "same_waveform_active_power",
      binding: binding(),
    },
    reactiveEvidence: {
      kind: "resolved_reactive_sign",
      classification: "inductive",
      evidenceBasis: "instrument_complex_impedance_sign",
      signResolvedAtExpandedUncertainty: true,
      sourceRef: "PROJECT-MEAS:COMPLEX-Z:SIGN:001",
      binding: binding(),
    },
    deembedding: {
      kind: "already_deembedded_to_declared_reference_plane",
      measurementSnapshotId: MEASUREMENT_SNAPSHOT_ID,
      rawArtifactId: RAW_ARTIFACT_ID,
      rawArtifactSha256: RAW_ARTIFACT_SHA256,
      derivationRecordId: DERIVATION_RECORD_ID,
      fixtureId: "fixture.f02.001",
      leadConfigurationId: "leads.f02.001",
      declaredReferencePlaneId: "coil.deembedded.reference-plane",
      deembeddingMethodId: "fixture-subtraction.f02",
      deembeddingMethodVersion: "1.0.0",
      deembeddingSnapshotId: DEEMBEDDING_SNAPSHOT_ID,
      calibrationCertificateId: "calibration.certificate.001",
      fixtureModelSourceRef: "PROJECT-MEAS:FIXTURE-MODEL:001",
      fixtureAndLeadUncertaintyIncluded: true,
    },
    temperatureStability: {
      kind: "confirmed_stable_under_pre_registered_criterion",
      assessmentId: "temperature-stability.assessment.001",
      criterionId: "temperature-stability.criterion.001",
      sourceRef: "PROJECT-MEAS:TEMP-STABILITY:001",
    },
    provenance: {
      measurementRecordId: "measurement.record.f02.001",
      instrumentRecordId: "instrument.record.f02.001",
      instrumentManufacturer: "Controlled Manufacturer",
      instrumentModel: "Controlled Model",
      instrumentSerialNumber: "SN-F02-001",
      calibrationCertificateId: "calibration.certificate.001",
      calibrationStatus: "confirmed_current_and_traceable_at_measurement",
      samplingSettingsId: "sampling.settings.f02.001",
      rawArtifactId: RAW_ARTIFACT_ID,
      rawArtifactMediaType: "application/octet-stream",
      rawArtifactSha256: RAW_ARTIFACT_SHA256,
      derivationRecordId: DERIVATION_RECORD_ID,
      reviewStatus: "accepted",
      sourceRef: "PROJECT-MEAS:F02:001",
    },
    uncertainty: uncertainty(),
  };
}

function pIOnlyInput(): F02MeasuredPortImpedanceInput {
  const candidate = input();
  return {
    ...candidate,
    voltage: { kind: "not_available", reason: "voltage channel unavailable" },
    reactiveEvidence: {
      kind: "not_available",
      reason: "signed reactive evidence unavailable",
    },
    uncertainty: uncertainty({
      voltageStandardUncertaintyV: null,
      reactiveSignResolutionUncertaintySnapshotId: null,
      activePowerMinusApparentPowerExpandedUncertaintyW: null,
      reactanceSquaredExpandedUncertaintyOhm2: null,
      impedanceMagnitudeExpandedUncertaintyOhm: null,
      reactanceExpandedUncertaintyOhm: null,
      inductanceExpandedUncertaintyH: null,
      qualityFactorExpandedUncertaintyOne: null,
    }),
  };
}

function changed(mutator: (candidate: Record<string, any>) => void): unknown {
  const candidate = structuredClone(input()) as Record<string, any>;
  mutator(candidate);
  return candidate;
}

function positiveBinary64UlpDistance(left: number, right: number): bigint {
  expect(left).toBeGreaterThanOrEqual(0);
  expect(right).toBeGreaterThanOrEqual(0);
  const leftBuffer = new ArrayBuffer(8);
  const rightBuffer = new ArrayBuffer(8);
  const leftView = new DataView(leftBuffer);
  const rightView = new DataView(rightBuffer);
  leftView.setFloat64(0, left, false);
  rightView.setFloat64(0, right, false);
  const leftBits = leftView.getBigUint64(0, false);
  const rightBits = rightView.getBigUint64(0, false);
  return leftBits >= rightBits ? leftBits - rightBits : rightBits - leftBits;
}

function expectPositiveBinary64WithinUlps(
  actual: number,
  expected: number,
  maximumUlps: bigint,
): void {
  expect(positiveBinary64UlpDistance(actual, expected)).toBeLessThanOrEqual(
    maximumUlps,
  );
}

function successOf(
  candidate: F02MeasuredPortImpedanceInput,
): F02MeasuredPortImpedanceSuccess {
  const result = evaluateF02MeasuredPortImpedance(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error("Expected F-02 success, received a failure outcome");
  }
  return result;
}

function expectClosedFailure(
  candidate: unknown,
  expectedStatus:
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable"
    | "inconsistent_measurement",
  expectedCode?: string,
): void {
  const result = evaluateF02MeasuredPortImpedance(
    candidate as F02MeasuredPortImpedanceInput,
  );
  expect(result.status).toBe(expectedStatus);
  expect("value" in result).toBe(false);
  expect("substitution" in result).toBe(false);
  expect("measurementSnapshot" in result).toBe(false);
  expect("consistency" in result).toBe(false);
  expect("resultProvenance" in result).toBe(false);
  expect("trace" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  if (
    result.status !== "success" &&
    result.status !== "success_with_warnings" &&
    expectedCode !== undefined
  ) {
    expect(result.failure?.code).toBe(expectedCode);
  }
}

describe("F-02 measured port impedance identification", () => {
  it("maps exactly to the frozen registry and remains runtime-inactive", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-02"));
    expect(F02_METHOD_ID).toBe("F-02");
    expect(F02_METHOD_VERSION).toBe(specification.methodVersion);
    expect(F02_SOURCE_REFS).toEqual(["ID-MEAS-01", "DHT:PDF17-18"]);
    expect(F02_CONTRACT_SOURCE_REFS).toEqual([
      "ID-MEAS-01",
      "DHT:PDF17-18",
      "DER-CIRCUIT",
    ]);
    expect(F02_DERIVATION_REFS).toEqual(["ID-MEAS-01", "DER-CIRCUIT"]);
    expect(F02_VALIDATION_CASE_IDS).toEqual(["EM-Z-002"]);
    expect(F02_METHOD_CHECK_IDS).toEqual([
      "EM-Z-LOWQ-001",
      "EM-Z-ACTUAL-001",
    ]);
    expect(F02_MEASURED_PORT_IMPEDANCE_MAPPING).toMatchObject({
      methodId: specification.methodId,
      approvalStatus: "approved_with_limitation",
      methodType: "measurement_identified",
      equationRef: "CALCULATION_CONTRACTS.md#F-02:Equation",
      inputParameterIds: [
        "voltage/current_rms",
        "active_power",
        "frequency",
        "reactive_sign/phase",
        "measurement_uncertainty",
      ],
      outputQuantityIds: ["|Z|", "Req", "X", "Leq", "Qs", "uncertainty"],
      recommendationEligibility: "eligible",
      recommendationReason:
        "CALCULATION_BASIS explicitly labels F-02 the actual-equipment Recommended method.",
    });
    expect(F02_MEASURED_PORT_IMPEDANCE_MAPPING.warningPredicates).toEqual([
      "P>VI beyond uncertainty",
      "|Z|^2-Req^2 is negative beyond propagated uncertainty",
      "Leq is emitted from P and I only",
      "true PF and cos(phi) are mixed",
      "temperature drifts during measurement",
    ]);
    expect(F02_WARNING_PREDICATES).toEqual({
      activePowerExceedsApparentPowerBeyondUncertainty:
        "P>VI beyond uncertainty",
      negativeReactanceSquaredBeyondPropagatedUncertainty:
        "|Z|^2-Req^2 is negative beyond propagated uncertainty",
      inductanceEmittedFromActivePowerAndCurrentOnly:
        "Leq is emitted from P and I only",
      truePowerFactorAndCosinePhiMixed: "true PF and cos(phi) are mixed",
      temperatureDrift: "temperature drifts during measurement",
    });
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("F-02"))).toBe(
      false,
    );
    expect("evaluateF02MeasuredPortImpedance" in publicApi).toBe(false);
    expect("F02_MEASURED_PORT_IMPEDANCE_MAPPING" in publicApi).toBe(false);
  });

  it("binds DHT PDF17-18 to the controlled manifest hash", () => {
    const sourceUrl = new URL(
      "../../../references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf",
      import.meta.url,
    );
    const actualHash = createHash("sha256")
      .update(readFileSync(sourceUrl))
      .digest("hex");
    expect(actualHash).toBe(F02_DHT_CONTROLLED_SOURCE.sha256);
    expect(F02_DHT_CONTROLLED_SOURCE).toEqual({
      sourceId: "DHT",
      relativePath:
        "references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf",
      sha256:
        "33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98",
      location: "PDF17-18",
      visualReview:
        "supports measurement at heating frequency and, where practicable, with the component/workpiece present; supplies no uncertainty-propagation or fixture-de-embedding equation",
    });
  });

  it("records the safe-partial gates without inventing propagation or de-embedding", () => {
    expect(F02_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "implemented_safe_partial_not_runtime_activated",
      runtimeActivation: "blocked",
      publicApiExported: false,
      implementedScope:
        "nominal_ID_MEAS_01_identification_consuming_upstream_precomputed_expanded_uncertainty_and_already_deembedded_measurements",
      openGates: [
        {
          gateId: "F-02.component-uncertainty-propagation",
          disposition:
            "not_implemented_no_frozen_uV_uI_uP_uphi_covariance_propagation_rule",
        },
        {
          gateId: "F-02.numeric-phase-reactive-power-adapters",
          disposition:
            "not_implemented_requires_separate_sign_convention_and_uncertainty_contract",
        },
        {
          gateId: "F-02.fixture-deembedding-calculation",
          disposition:
            "not_implemented_requires_versioned_fixture_model_and_calibration_adapter",
        },
        {
          gateId: "F-02.actual-measurement-validation",
          disposition:
            "blocked_by_EM_Z_ACTUAL_001_and_EXP_Z_001_data_acquisition",
        },
      ],
    });
    expect(F02_NUMERIC_REPRESENTABILITY_POLICY).toMatchObject({
      boundaryKind: "machine_numeric_representability_only",
      binary64MinimumNormal: 2 ** -1022,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      overflowPolicy: "fail_closed",
      swallowedNonzeroTermPolicy: "fail_closed",
      negativeRadicandAbsoluteValuePolicy: "prohibited",
      sourceEquationRearranged: false,
      engineeringThreshold: false,
    });
    expect(F02_BINARY64_MIN_NORMAL).toBe(2.2250738585072014e-308);
  });

  it("implements the canonical-SI inductive equations and engineering trace", () => {
    const result = successOf(input());
    expect(result.status).toBe("success");
    expect(result.value.impedanceMagnitude).toMatchObject({
      kind: "available",
      outputId: "|Z|",
      valueSi: IMPEDANCE_MAGNITUDE_OHM,
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
    });
    expect(result.value.equivalentResistance.valueSi).toBeCloseTo(
      RESISTANCE_OHM,
      15,
    );
    expect(result.value.reactance).toMatchObject({
      kind: "available",
      outputId: "X",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "inductive",
    });
    expect(result.value.reactance.kind).toBe("available");
    if (result.value.reactance.kind === "available") {
      expect(result.value.reactance.valueSi).toBeCloseTo(REACTANCE_OHM, 14);
    }
    expect(result.value.equivalentInductance.kind).toBe("available");
    if (result.value.equivalentInductance.kind === "available") {
      expect(result.value.equivalentInductance.valueSi).toBeCloseTo(
        INDUCTANCE_H,
        16,
      );
      expect(result.value.equivalentInductance.canonicalUnitId).toBe("H");
    }
    expect(result.value.seriesQualityFactor.kind).toBe("available");
    if (result.value.seriesQualityFactor.kind === "available") {
      expect(result.value.seriesQualityFactor.valueSi).toBeCloseTo(
        REACTANCE_OHM / RESISTANCE_OHM,
        13,
      );
      expect(result.value.seriesQualityFactor.canonicalUnitId).toBe("one");
    }
    expect(result.equation).toEqual({
      impedanceMagnitude: "|Z| = V_rms / I_rms when V is available",
      equivalentResistance: "Req = P / I_rms^2",
      reactanceSquared: "x2 = |Z|^2 - Req^2",
      reactance: "X = sign(X) * sqrt(x2) when sign evidence is resolved",
      equivalentInductance: "Leq = X / (2*pi*f) for an inductive port",
      qualityFactor: "Qs = (2*pi*f)*Leq/Req when Req > 0",
    });
    expect(result.substitution.resistanceStage).toMatchObject({
      currentA: CURRENT_A,
      activePowerW: ACTIVE_POWER_W,
      currentSquaredA2: CURRENT_A ** 2,
    });
    expect(result.consistency.inputAdjusted).toBe(false);
    expect(result.resultProvenance).toBe("identified_from_measurement");
    expect(result.dataQuality).toBe("measured");
    expect(result.recommendation).toEqual({
      eligible: true,
      isRecommendedForActualEquipment: true,
      reason:
        "CALCULATION_BASIS explicitly labels F-02 the actual-equipment Recommended method.",
    });
    expect(result.sourceRefs).toEqual(["ID-MEAS-01", "DHT:PDF17-18"]);
    expect(result.contractSourceRefs).toEqual([
      "ID-MEAS-01",
      "DHT:PDF17-18",
      "DER-CIRCUIT",
    ]);
    expect(result.validationCaseIds).toEqual(["EM-Z-002"]);
    expect(result.methodCheckIds).toEqual([
      "EM-Z-LOWQ-001",
      "EM-Z-ACTUAL-001",
    ]);
  });

  it("carries, but never derives, the upstream expanded output uncertainties", () => {
    const candidate = {
      ...input(),
      uncertainty: uncertainty({
        impedanceMagnitudeExpandedUncertaintyOhm: 0.011,
        equivalentResistanceExpandedUncertaintyOhm: 0.012,
        reactanceExpandedUncertaintyOhm: 0.013,
        inductanceExpandedUncertaintyH: 0.014,
        qualityFactorExpandedUncertaintyOne: 0.015,
        coverageFactor: 2.5,
        propagationRecordId: "propagation.f02.external.002",
        uncertaintySourceRef: "PROJECT-MEAS-UNCERTAINTY:F02:002",
      }),
    };
    const result = successOf(candidate);
    const outputs = [
      result.value.impedanceMagnitude,
      result.value.equivalentResistance,
      result.value.reactance,
      result.value.equivalentInductance,
      result.value.seriesQualityFactor,
    ];
    expect(outputs.map((output) => output.kind)).toEqual([
      "available",
      "available",
      "available",
      "available",
      "available",
    ]);
    expect(
      outputs.map((output) =>
        output.kind === "available" ? output.uncertainty.valueSi : null,
      ),
    ).toEqual([0.011, 0.012, 0.013, 0.014, 0.015]);
    for (const output of outputs) {
      if (output.kind === "available") {
        expect(output.uncertainty).toMatchObject({
          kind: "expanded",
          coverageFactor: 2.5,
          propagationRecordId: "propagation.f02.external.002",
          uncertaintySourceRef: "PROJECT-MEAS-UNCERTAINTY:F02:002",
        });
      }
    }
  });

  it("implements EM-Z-002 P/I-only as Req with every non-identifiable output unavailable", () => {
    const result = successOf(pIOnlyInput());
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.equivalentResistance.valueSi).toBeCloseTo(
      RESISTANCE_OHM,
      15,
    );
    expect(result.value.impedanceMagnitude).toMatchObject({
      kind: "unavailable",
      outputId: "|Z|",
      status: "insufficient_data",
    });
    expect(result.value.reactance).toMatchObject({
      kind: "unavailable",
      outputId: "X",
      status: "insufficient_data",
    });
    expect(result.value.equivalentInductance).toMatchObject({
      kind: "unavailable",
      outputId: "Leq",
      status: "insufficient_data",
    });
    expect(result.value.seriesQualityFactor).toMatchObject({
      kind: "unavailable",
      outputId: "Qs",
      status: "insufficient_data",
    });
    for (const output of [
      result.value.impedanceMagnitude,
      result.value.reactance,
      result.value.equivalentInductance,
      result.value.seriesQualityFactor,
    ]) {
      expect("valueSi" in output).toBe(false);
      expect("uncertainty" in output).toBe(false);
    }
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.voltage_unavailable_PI_only",
    ]);
    expect(result.substitution.voltageStage.kind).toBe(
      "not_evaluated_voltage_unavailable",
    );
  });

  it("returns |Z| and Req but no X/Leq/Qs when signed reactive evidence is unavailable", () => {
    const candidate: F02MeasuredPortImpedanceInput = {
      ...input(),
      reactiveEvidence: {
        kind: "not_available",
        reason: "instrument did not retain a signed phase or Q channel",
      },
      uncertainty: uncertainty({
        reactiveSignResolutionUncertaintySnapshotId: null,
        reactanceExpandedUncertaintyOhm: null,
        inductanceExpandedUncertaintyH: null,
        qualityFactorExpandedUncertaintyOne: null,
      }),
    };
    const result = successOf(candidate);
    expect(result.value.impedanceMagnitude.kind).toBe("available");
    expect(result.value.equivalentResistance.kind).toBe("available");
    expect(result.value.reactance.kind).toBe("unavailable");
    expect(result.value.equivalentInductance.kind).toBe("unavailable");
    expect(result.value.seriesQualityFactor.kind).toBe("unavailable");
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.reactive_sign_unavailable",
    ]);
  });

  it("retains negative capacitive X and never relabels it as Leq", () => {
    const base = input();
    const candidate: F02MeasuredPortImpedanceInput = {
      ...base,
      reactiveEvidence: {
        ...base.reactiveEvidence,
        classification: "capacitive",
      } as F02MeasuredPortImpedanceInput["reactiveEvidence"],
      uncertainty: uncertainty({
        inductanceExpandedUncertaintyH: null,
        qualityFactorExpandedUncertaintyOne: null,
      }),
    };
    const result = successOf(candidate);
    expect(result.value.reactance.kind).toBe("available");
    if (result.value.reactance.kind === "available") {
      expect(result.value.reactance.valueSi).toBeCloseTo(-REACTANCE_OHM, 14);
      expect(result.value.reactance.interpretation).toBe("capacitive");
    }
    expect(result.value.equivalentInductance).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
      outputId: "Leq",
    });
    expect(result.value.seriesQualityFactor.kind).toBe("unavailable");
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.capacitive_state_has_no_inductive_Leq",
    ]);
  });

  it("handles the zero-reactance analytical limit without an inductance placeholder", () => {
    const base = input();
    const candidate: F02MeasuredPortImpedanceInput = {
      ...base,
      voltage: {
        ...base.voltage,
        voltageV: 5,
      } as F02MeasuredPortImpedanceInput["voltage"],
      activePower: { ...base.activePower, activePowerW: 50 },
      reactiveEvidence: {
        ...base.reactiveEvidence,
        classification: "zero",
      } as F02MeasuredPortImpedanceInput["reactiveEvidence"],
      uncertainty: uncertainty({
        inductanceExpandedUncertaintyH: null,
        qualityFactorExpandedUncertaintyOne: null,
      }),
    };
    const result = successOf(candidate);
    expect(result.value.equivalentResistance.valueSi).toBe(0.5);
    expect(result.value.reactance.kind).toBe("available");
    if (result.value.reactance.kind === "available") {
      expect(result.value.reactance.valueSi).toBe(0);
      expect(Object.is(result.value.reactance.valueSi, -0)).toBe(false);
    }
    expect(result.value.equivalentInductance.kind).toBe("unavailable");
    expect(result.value.seriesQualityFactor.kind).toBe("unavailable");
  });

  it("keeps Qs unavailable at the passive Req=0 boundary", () => {
    const base = input();
    const candidate: F02MeasuredPortImpedanceInput = {
      ...base,
      voltage: {
        ...base.voltage,
        voltageV: 10,
      } as F02MeasuredPortImpedanceInput["voltage"],
      activePower: { ...base.activePower, activePowerW: 0 },
      uncertainty: uncertainty({
        qualityFactorExpandedUncertaintyOne: null,
      }),
    };
    const result = successOf(candidate);
    expect(result.value.equivalentResistance.valueSi).toBe(0);
    expect(result.value.reactance.kind).toBe("available");
    expect(result.value.equivalentInductance.kind).toBe("available");
    expect(result.value.seriesQualityFactor).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
      outputId: "Qs",
    });
    expect("valueSi" in result.value.seriesQualityFactor).toBe(false);
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.Qs_unavailable_zero_Req",
    ]);
  });

  it("limits explicit full-wave totals to |Z| and Req", () => {
    const candidate = changed((value) => {
      value.voltage.quantityBasis = "full_wave_rms";
      value.current.quantityBasis = "full_wave_rms";
      value.voltage.binding.waveformDefinition = "explicit_full_wave_total";
      value.current.binding.waveformDefinition = "explicit_full_wave_total";
      value.activePower.binding.waveformDefinition = "explicit_full_wave_total";
      value.reactiveEvidence = {
        kind: "not_available",
        reason: "no single-frequency sign exists for total-waveform quantities",
      };
      value.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      value.uncertainty.reactanceExpandedUncertaintyOhm = null;
      value.uncertainty.inductanceExpandedUncertaintyH = null;
      value.uncertainty.qualityFactorExpandedUncertaintyOne = null;
    }) as F02MeasuredPortImpedanceInput;
    const result = successOf(candidate);
    expect(result.value.impedanceMagnitude.kind).toBe("available");
    expect(result.value.equivalentResistance.kind).toBe("available");
    expect(result.value.reactance).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(result.value.equivalentInductance.kind).toBe("unavailable");
    expect(result.value.seriesQualityFactor.kind).toBe("unavailable");
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.full_wave_has_no_single_frequency_reactance",
    ]);
  });

  it("is invariant under consistent RMS amplitude scaling", () => {
    const baseline = successOf(input());
    const factor = 7;
    const scaled = changed((candidate) => {
      candidate.voltage.voltageV *= factor;
      candidate.current.currentA *= factor;
      candidate.activePower.activePowerW *= factor ** 2;
    }) as F02MeasuredPortImpedanceInput;
    const result = successOf(scaled);
    expect(result.value.impedanceMagnitude.kind).toBe("available");
    expect(baseline.value.impedanceMagnitude.kind).toBe("available");
    expect(result.value.reactance.kind).toBe("available");
    expect(baseline.value.reactance.kind).toBe("available");
    expect(result.value.equivalentInductance.kind).toBe("available");
    expect(baseline.value.equivalentInductance.kind).toBe("available");
    expect(result.value.seriesQualityFactor.kind).toBe("available");
    expect(baseline.value.seriesQualityFactor.kind).toBe("available");
    if (
      result.value.impedanceMagnitude.kind === "available" &&
      baseline.value.impedanceMagnitude.kind === "available" &&
      result.value.reactance.kind === "available" &&
      baseline.value.reactance.kind === "available" &&
      result.value.equivalentInductance.kind === "available" &&
      baseline.value.equivalentInductance.kind === "available" &&
      result.value.seriesQualityFactor.kind === "available" &&
      baseline.value.seriesQualityFactor.kind === "available"
    ) {
      expectPositiveBinary64WithinUlps(
        result.value.impedanceMagnitude.valueSi,
        baseline.value.impedanceMagnitude.valueSi,
        1n,
      );
      expectPositiveBinary64WithinUlps(
        result.value.reactance.valueSi,
        baseline.value.reactance.valueSi,
        4n,
      );
      expectPositiveBinary64WithinUlps(
        result.value.equivalentInductance.valueSi,
        baseline.value.equivalentInductance.valueSi,
        4n,
      );
      expectPositiveBinary64WithinUlps(
        result.value.seriesQualityFactor.valueSi,
        baseline.value.seriesQualityFactor.valueSi,
        4n,
      );
    }
    expectPositiveBinary64WithinUlps(
      result.value.equivalentResistance.valueSi,
      baseline.value.equivalentResistance.valueSi,
      1n,
    );
  });

  it("applies the inverse-frequency analytical limit to Leq while X and Qs remain fixed", () => {
    const baseline = successOf(input());
    const doubledFrequency = changed((candidate) => {
      candidate.voltage.binding.frequencyHz *= 2;
      candidate.current.binding.frequencyHz *= 2;
      candidate.activePower.binding.frequencyHz *= 2;
      candidate.reactiveEvidence.binding.frequencyHz *= 2;
    }) as F02MeasuredPortImpedanceInput;
    const result = successOf(doubledFrequency);
    expect(result.value.reactance).toEqual(baseline.value.reactance);
    expect(result.value.equivalentInductance.kind).toBe("available");
    expect(baseline.value.equivalentInductance.kind).toBe("available");
    if (
      result.value.equivalentInductance.kind === "available" &&
      baseline.value.equivalentInductance.kind === "available"
    ) {
      expect(result.value.equivalentInductance.valueSi).toBe(
        baseline.value.equivalentInductance.valueSi / 2,
      );
    }
    expect(result.value.seriesQualityFactor).toEqual(
      baseline.value.seriesQualityFactor,
    );
  });

  it("deep-freezes the complete success trace and preserved snapshots", () => {
    const result = successOf(input());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.measurementSnapshot)).toBe(true);
    expect(Object.isFrozen(result.measurementSnapshot.authoritativeBinding)).toBe(
      true,
    );
    expect(Object.isFrozen(result.measurementSnapshot.uncertainty)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });
});

describe("F-02 uncertainty-controlled physical consistency", () => {
  it("fails closed when nominal P exceeds V*I beyond expanded uncertainty", () => {
    const candidate = changed((value) => {
      value.voltage.voltageV = 10;
      value.current.currentA = 10;
      value.activePower.activePowerW = 101;
      value.reactiveEvidence = {
        kind: "not_available",
        reason: "reactive sign unavailable",
      };
      value.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      value.uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW = 0.5;
      value.uncertainty.reactanceSquaredExpandedUncertaintyOhm2 = 1;
      value.uncertainty.reactanceExpandedUncertaintyOhm = null;
      value.uncertainty.inductanceExpandedUncertaintyH = null;
      value.uncertainty.qualityFactorExpandedUncertaintyOne = null;
    });
    expectClosedFailure(
      candidate,
      "inconsistent_measurement",
      "F-02.active_power_exceeds_apparent_power",
    );
  });

  it("warns on nominal P>V*I within expanded uncertainty without changing P, I or Req", () => {
    const candidate = changed((value) => {
      value.voltage.voltageV = 10;
      value.current.currentA = 10;
      value.activePower.activePowerW = 100.1;
      value.reactiveEvidence = {
        kind: "not_available",
        reason: "reactive sign unavailable",
      };
      value.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      value.uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW = 0.2;
      value.uncertainty.reactanceSquaredExpandedUncertaintyOhm2 = 0.01;
      value.uncertainty.reactanceExpandedUncertaintyOhm = null;
      value.uncertainty.inductanceExpandedUncertaintyH = null;
      value.uncertainty.qualityFactorExpandedUncertaintyOne = null;
    }) as F02MeasuredPortImpedanceInput;
    const result = successOf(candidate);
    expect(result.status).toBe("success_with_warnings");
    expect(result.applicabilityStatus).toBe("at_boundary");
    expect(result.value.equivalentResistance.valueSi).toBe(1.001);
    expect(result.measurementSnapshot.activePower.activePowerW).toBe(100.1);
    expect(result.measurementSnapshot.current.currentA).toBe(10);
    expect(result.consistency.inputAdjusted).toBe(false);
    expect(result.consistency.activePowerVsApparentPower).toEqual({
      kind: "evaluated",
      nominalResidualW: 0.09999999999999432,
      expandedResidualUncertaintyW: 0.2,
      classification: "nominal_exceeds_within_expanded_uncertainty",
    });
    expect(result.consistency.reactanceSquared).toMatchObject({
      kind: "evaluated",
      classification:
        "negative_within_expanded_uncertainty_clamped_to_zero",
    });
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      "F-02.nominal_P_exceeds_VI_within_expanded_uncertainty",
      "F-02.negative_x2_clamped_within_expanded_uncertainty",
      "F-02.reactive_sign_unavailable",
    ]);
  });

  it("clamps x2 only when its explicit expanded interval contains zero", () => {
    const candidate = changed((value) => {
      value.voltage.voltageV = 10;
      value.current.currentA = 10;
      value.activePower.activePowerW = 100.1;
      value.reactiveEvidence = {
        kind: "not_available",
        reason: "reactive sign unavailable",
      };
      value.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      value.uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW = 1;
      value.uncertainty.reactanceSquaredExpandedUncertaintyOhm2 = 0.01;
      value.uncertainty.reactanceExpandedUncertaintyOhm = null;
      value.uncertainty.inductanceExpandedUncertaintyH = null;
      value.uncertainty.qualityFactorExpandedUncertaintyOne = null;
    }) as F02MeasuredPortImpedanceInput;
    const result = successOf(candidate);
    expect(result.substitution.voltageStage.kind).toBe("evaluated");
    if (result.substitution.voltageStage.kind === "evaluated") {
      expect(result.substitution.voltageStage.rawReactanceSquaredOhm2).toBeLessThan(
        0,
      );
      expect(result.substitution.voltageStage.usedReactanceSquaredOhm2).toBe(0);
      expect(result.substitution.voltageStage.negativeRadicandClampedToZero).toBe(
        true,
      );
      expect(result.substitution.voltageStage.voltageV).toBe(10);
    }
    expect(result.value.equivalentResistance.valueSi).toBe(1.001);
    expect(result.consistency.inputAdjusted).toBe(false);
  });

  it("returns inconsistent_measurement for negative x2 beyond uncertainty and never applies abs", () => {
    const candidate = changed((value) => {
      value.voltage.voltageV = 10;
      value.current.currentA = 10;
      value.activePower.activePowerW = 100.1;
      value.reactiveEvidence = {
        kind: "not_available",
        reason: "reactive sign unavailable",
      };
      value.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      value.uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW = 1;
      value.uncertainty.reactanceSquaredExpandedUncertaintyOhm2 = 0.001;
      value.uncertainty.reactanceExpandedUncertaintyOhm = null;
      value.uncertainty.inductanceExpandedUncertaintyH = null;
      value.uncertainty.qualityFactorExpandedUncertaintyOne = null;
    });
    const result = evaluateF02MeasuredPortImpedance(
      candidate as F02MeasuredPortImpedanceInput,
    );
    expect(result.status).toBe("inconsistent_measurement");
    if (result.status === "inconsistent_measurement") {
      expect(result.failure.code).toBe("F-02.negative_reactance_squared");
      expect(result.failure.action).toContain("absolute value is prohibited");
    }
    expect("value" in result).toBe(false);
    expect("measurementSnapshot" in result).toBe(false);
  });

  it("requires a complete precomputed voltage-route uncertainty package", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.uncertainty.reactanceSquaredExpandedUncertaintyOhm2 = null;
      }),
      "insufficient_data",
      "F-02.precomputed_output_uncertainty_missing",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.uncertainty.impedanceMagnitudeExpandedUncertaintyOhm = null;
      }),
      "insufficient_data",
      "F-02.precomputed_output_uncertainty_missing",
    );
  });

  it("requires uncertainty for each available output and null for each unavailable output", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
      }),
      "insufficient_data",
      "F-02.precomputed_output_uncertainty_missing",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence = {
          kind: "not_available",
          reason: "reactive sign unavailable",
        };
        candidate.uncertainty.inductanceExpandedUncertaintyH = null;
        candidate.uncertainty.qualityFactorExpandedUncertaintyOne = null;
      }),
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence = {
          kind: "not_available",
          reason: "reactive sign unavailable",
        };
        candidate.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
        candidate.uncertainty.inductanceExpandedUncertaintyH = null;
        candidate.uncertainty.qualityFactorExpandedUncertaintyOne = null;
      }),
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence.classification = "capacitive";
        candidate.uncertainty.qualityFactorExpandedUncertaintyOne = null;
      }),
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
    );
  });

  it("rejects voltage-route uncertainty on the P/I-only information route", () => {
    const candidate = structuredClone(pIOnlyInput()) as Record<string, any>;
    candidate.uncertainty.impedanceMagnitudeExpandedUncertaintyOhm = 0;
    expectClosedFailure(
      candidate,
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
    );
  });

  it("rejects a zero reactive classification when the uncertainty-controlled x2 is positive", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence.classification = "zero";
        candidate.uncertainty.inductanceExpandedUncertaintyH = null;
        candidate.uncertainty.qualityFactorExpandedUncertaintyOne = null;
      }),
      "inconsistent_measurement",
      "F-02.reactive_classification_inconsistent",
    );
  });
});

describe("F-02 immutable measurement boundary and status priority", () => {
  const bindingMismatches: ReadonlyArray<readonly [string, unknown]> = [
    ["caseSnapshotId", CASE_SNAPSHOT_B],
    ["measurementSnapshotId", "measurement.f02.other"],
    ["electricalStateSnapshotId", "electrical.loaded.cold.10khz"],
    ["portId", "other.input.port"],
    ["positiveTerminalId", "other.positive.terminal"],
    ["negativeTerminalId", "other.negative.terminal"],
    ["referencePlaneId", "other.reference-plane"],
    ["loadedState", "workpiece_cold"],
    ["frequencyHz", 11_000],
    ["timeBasisId", "other.time-basis"],
    ["measurementWindowId", "window-002"],
    ["temperatureSnapshotId", "temperature.window-002"],
    ["temperatureK", 674.15],
    ["waveformDefinition", "explicit_full_wave_total"],
  ];

  it.each(bindingMismatches)(
    "fails closed when active power has a different %s binding",
    (field, value) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.activePower.binding[field] = value;
        }),
        "insufficient_data",
        "F-02.port_state_frequency_temperature_window_mismatch",
      );
    },
  );

  it("binds reactive evidence to the exact same port, state, frequency, temperature and window", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence.binding.measurementWindowId = "window-002";
      }),
      "insufficient_data",
      "F-02.port_state_frequency_temperature_window_mismatch",
    );
  });

  it("requires the de-embedded plane and calibration certificate to match every evidence package", () => {
    for (const candidate of [
      changed((value) => {
        value.deembedding.declaredReferencePlaneId = "other.reference-plane";
      }),
      changed((value) => {
        value.deembedding.calibrationCertificateId = "calibration.other";
      }),
      changed((value) => {
        value.uncertainty.calibrationCertificateId = "calibration.other";
      }),
    ]) {
      expectClosedFailure(
        candidate,
        "insufficient_data",
        "F-02.measurement_provenance_mismatch",
      );
    }
  });

  it.each([
    [
      "de-embedding measurement snapshot",
      (value: Record<string, any>) => {
        value.deembedding.measurementSnapshotId = "measurement.f02.unrelated";
      },
    ],
    [
      "uncertainty measurement snapshot",
      (value: Record<string, any>) => {
        value.uncertainty.measurementSnapshotId = "measurement.f02.unrelated";
      },
    ],
    [
      "de-embedding raw artifact",
      (value: Record<string, any>) => {
        value.deembedding.rawArtifactId = "raw.measurement.artifact.unrelated";
      },
    ],
    [
      "uncertainty raw artifact",
      (value: Record<string, any>) => {
        value.uncertainty.rawArtifactId = "raw.measurement.artifact.unrelated";
      },
    ],
    [
      "de-embedding raw artifact hash",
      (value: Record<string, any>) => {
        value.deembedding.rawArtifactSha256 = "d".repeat(64);
      },
    ],
    [
      "uncertainty raw artifact hash",
      (value: Record<string, any>) => {
        value.uncertainty.rawArtifactSha256 = "d".repeat(64);
      },
    ],
    [
      "de-embedding derivation record",
      (value: Record<string, any>) => {
        value.deembedding.derivationRecordId = "measurement.derivation.unrelated";
      },
    ],
    [
      "uncertainty derivation record",
      (value: Record<string, any>) => {
        value.uncertainty.derivationRecordId = "measurement.derivation.unrelated";
      },
    ],
    [
      "uncertainty de-embedding snapshot",
      (value: Record<string, any>) => {
        value.uncertainty.deembeddingSnapshotId = "deembedding.f02.unrelated";
      },
    ],
  ] as const)("rejects an unrelated stable %s ID", (_label, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "insufficient_data",
      "F-02.measurement_provenance_mismatch",
    );
  });

  it("prioritizes an orphan reactive uncertainty route over unknown waveform semantics", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.voltage.binding.waveformDefinition = "unknown_or_unconfirmed";
        candidate.current.binding.waveformDefinition = "unknown_or_unconfirmed";
        candidate.activePower.binding.waveformDefinition =
          "unknown_or_unconfirmed";
        candidate.reactiveEvidence = {
          kind: "not_available",
          reason: "signed reactive evidence unavailable",
        };
        candidate.uncertainty.reactiveSignResolutionUncertaintySnapshotId = null;
        // These otherwise valid values are orphaned by the unavailable route.
        candidate.uncertainty.reactanceExpandedUncertaintyOhm = 0;
        candidate.uncertainty.inductanceExpandedUncertaintyH = 0;
        candidate.uncertainty.qualityFactorExpandedUncertaintyOne = 0;
      }),
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
    );
  });

  it.each([
    [
      "not deembedded",
      (candidate: Record<string, any>) => {
        candidate.deembedding = {
          kind: "not_deembedded",
          fixtureId: "fixture.f02.001",
          reason: "fixture remains in raw measurement",
        };
      },
      "not_applicable",
      "F-02.not_deembedded",
    ],
    [
      "deembedding unknown",
      (candidate: Record<string, any>) => {
        candidate.deembedding = {
          kind: "unknown_or_unconfirmed",
          reason: "reference plane unresolved",
        };
      },
      "insufficient_data",
      "F-02.deembedding_unconfirmed",
    ],
    [
      "temperature drift",
      (candidate: Record<string, any>) => {
        candidate.temperatureStability = {
          kind: "drift_detected",
          assessmentId: "temperature.assessment.drift",
          sourceRef: "PROJECT-MEAS:TEMP-DRIFT:001",
        };
      },
      "not_applicable",
      "F-02.temperature_drift",
    ],
    [
      "temperature unknown",
      (candidate: Record<string, any>) => {
        candidate.temperatureStability = {
          kind: "unknown_or_unconfirmed",
          reason: "stability assessment missing",
        };
      },
      "insufficient_data",
      "F-02.temperature_stability_unconfirmed",
    ],
    [
      "calibration expired",
      (candidate: Record<string, any>) => {
        candidate.provenance.calibrationStatus = "expired_or_not_traceable";
      },
      "not_applicable",
      "F-02.calibration_not_applicable",
    ],
    [
      "calibration unknown",
      (candidate: Record<string, any>) => {
        candidate.provenance.calibrationStatus = "unknown_or_unconfirmed";
      },
      "insufficient_data",
      "F-02.calibration_unconfirmed",
    ],
    [
      "review rejected",
      (candidate: Record<string, any>) => {
        candidate.provenance.reviewStatus = "rejected";
      },
      "not_applicable",
      "F-02.measurement_review_rejected",
    ],
    [
      "review pending",
      (candidate: Record<string, any>) => {
        candidate.provenance.reviewStatus = "pending";
      },
      "insufficient_data",
      "F-02.measurement_review_pending",
    ],
    [
      "fixture uncertainty excluded",
      (candidate: Record<string, any>) => {
        candidate.uncertainty.fixtureAndLeadContributionsIncluded = false;
      },
      "not_applicable",
      "F-02.not_deembedded",
    ],
    [
      "fixture uncertainty unknown",
      (candidate: Record<string, any>) => {
        candidate.uncertainty.fixtureAndLeadContributionsIncluded = null;
      },
      "insufficient_data",
      "F-02.deembedding_unconfirmed",
    ],
  ] as const)("classifies %s evidence without a placeholder", (_name, mutate, status, code) => {
    const candidate = changed((value) => mutate(value));
    expectClosedFailure(candidate, status, code);
  });

  it("gives exact malformed data priority over semantic gates", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.current.quantityBasis = "not_a_controlled_basis";
        candidate.current.binding.waveformDefinition =
          "known_multifrequency_without_single_frequency_equivalent";
      }),
      "invalid_input",
      "F-02.current_evidence_invalid",
    );
  });

  it("gives a known out-of-domain waveform priority over unknown and mixed snapshots", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.voltage.binding.waveformDefinition =
          "known_multifrequency_without_single_frequency_equivalent";
        candidate.current.binding.waveformDefinition = "unknown_or_unconfirmed";
        candidate.activePower.binding.measurementWindowId = "window-mixed";
      }),
      "not_applicable",
      "F-02.waveform_not_applicable",
    );
  });

  it("gives known fixture-uncertainty exclusion priority over unknown measurement fields", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.uncertainty.fixtureAndLeadContributionsIncluded = false;
        candidate.current.quantityBasis = "unknown_or_unconfirmed";
        candidate.activePower.binding.measurementWindowId = "window-mixed";
      }),
      "not_applicable",
      "F-02.not_deembedded",
    );
  });

  it("gives unknown waveform evidence priority over a generic snapshot mismatch", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.voltage.binding.waveformDefinition = "unknown_or_unconfirmed";
        candidate.activePower.binding.measurementWindowId = "window-mixed";
      }),
      "insufficient_data",
      "F-02.waveform_unconfirmed",
    );
  });

  it("rejects cos(phi)-only evidence before mixed-snapshot interpretation", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence = {
          kind: "cos_phi_only",
          sourceRef: "PROJECT-MEAS:COS-PHI:001",
          binding: {
            ...candidate.current.binding,
            measurementWindowId: "window-mixed",
          },
        };
      }),
      "not_applicable",
      "F-02.cos_phi_not_reactive_sign",
    );
  });

  it("does not let an unconfirmed reactive sign fall through to a partial result", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.reactiveEvidence = {
          kind: "unknown_or_unconfirmed",
          reason: "phase sign remains unresolved",
        };
      }),
      "insufficient_data",
      "F-02.reactive_sign_unconfirmed",
    );
  });
});

describe("F-02 hostile and malformed trust boundary", () => {
  it.each([
    ["null", null, "F-02.input_schema_invalid"],
    ["array", [], "F-02.input_schema_invalid"],
    [
      "missing field",
      changed((candidate) => {
        delete candidate.uncertainty;
      }),
      "F-02.input_schema_invalid",
    ],
    [
      "extra top-level key",
      { ...input(), hiddenDefault: 0 },
      "F-02.input_schema_invalid",
    ],
    [
      "NaN voltage",
      changed((candidate) => {
        candidate.voltage.voltageV = Number.NaN;
      }),
      "F-02.voltage_evidence_invalid",
    ],
    [
      "zero current",
      changed((candidate) => {
        candidate.current.currentA = 0;
      }),
      "F-02.current_evidence_invalid",
    ],
    [
      "negative active power",
      changed((candidate) => {
        candidate.activePower.activePowerW = -1;
      }),
      "F-02.active_power_evidence_invalid",
    ],
    [
      "unknown reactive enum",
      changed((candidate) => {
        candidate.reactiveEvidence.classification = "imaginary_guess";
      }),
      "F-02.reactive_evidence_invalid",
    ],
    [
      "unresolved reactive sign asserted false",
      changed((candidate) => {
        candidate.reactiveEvidence.signResolvedAtExpandedUncertainty = false;
      }),
      "F-02.reactive_evidence_invalid",
    ],
    [
      "confirmed deembedding excludes uncertainty",
      changed((candidate) => {
        candidate.deembedding.fixtureAndLeadUncertaintyIncluded = false;
      }),
      "F-02.deembedding_evidence_invalid",
    ],
    [
      "unknown temperature enum",
      changed((candidate) => {
        candidate.temperatureStability.kind = "stable_enough";
      }),
      "F-02.temperature_stability_evidence_invalid",
    ],
    [
      "uppercase raw hash",
      changed((candidate) => {
        candidate.provenance.rawArtifactSha256 = RAW_ARTIFACT_SHA256.toUpperCase();
      }),
      "F-02.provenance_evidence_invalid",
    ],
    [
      "invalid raw hash length",
      changed((candidate) => {
        candidate.provenance.rawArtifactSha256 = "c".repeat(63);
      }),
      "F-02.provenance_evidence_invalid",
    ],
    [
      "negative uncertainty",
      changed((candidate) => {
        candidate.uncertainty.currentStandardUncertaintyA = -1;
      }),
      "F-02.uncertainty_evidence_invalid",
    ],
    [
      "subnormal uncertainty",
      changed((candidate) => {
        candidate.uncertainty.currentStandardUncertaintyA = Number.MIN_VALUE;
      }),
      "F-02.uncertainty_evidence_invalid",
    ],
    [
      "zero coverage factor",
      changed((candidate) => {
        candidate.uncertainty.coverageFactor = 0;
      }),
      "F-02.uncertainty_evidence_invalid",
    ],
    [
      "unknown loaded state",
      changed((candidate) => {
        candidate.current.binding.loadedState = "hot_or_unknown";
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
    [
      "non-content-addressed case snapshot",
      changed((candidate) => {
        candidate.current.binding.caseSnapshotId = "case:mutable";
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
    [
      "identical port terminals",
      changed((candidate) => {
        candidate.current.binding.positiveTerminalId =
          candidate.current.binding.negativeTerminalId;
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
    [
      "invalid passive convention",
      changed((candidate) => {
        candidate.current.binding.currentDirection = "out_of_port";
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
    [
      "invalid phasor convention",
      changed((candidate) => {
        candidate.current.binding.phasorTimeConvention = "exp_minus_j_omega_t";
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
    [
      "invalid port model",
      changed((candidate) => {
        candidate.current.binding.portModel = "parallel_equivalent";
      }),
      "F-02.port_state_frequency_temperature_window_mismatch",
    ],
  ] as const)("rejects %s without a result payload", (_name, candidate, code) => {
    expectClosedFailure(candidate, "invalid_input", code);
  });

  it.each([
    [
      "peak quantities",
      (candidate: Record<string, any>) => {
        candidate.voltage.quantityBasis = "peak";
        candidate.current.quantityBasis = "peak";
      },
      "not_applicable",
      "F-02.quantity_basis_not_applicable",
    ],
    [
      "unknown quantity basis",
      (candidate: Record<string, any>) => {
        candidate.current.quantityBasis = "unknown_or_unconfirmed";
      },
      "insufficient_data",
      "F-02.quantity_basis_unconfirmed",
    ],
    [
      "cos-phi-derived P",
      (candidate: Record<string, any>) => {
        candidate.activePower.activePowerBasis = "cos_phi_derived";
      },
      "not_applicable",
      "F-02.active_power_basis_not_applicable",
    ],
    [
      "unknown P basis",
      (candidate: Record<string, any>) => {
        candidate.activePower.activePowerBasis = "unknown_or_unconfirmed";
      },
      "insufficient_data",
      "F-02.active_power_basis_unconfirmed",
    ],
  ] as const)("classifies %s semantically", (_name, mutate, status, code) => {
    expectClosedFailure(changed((candidate) => mutate(candidate)), status, code);
  });

  it("rejects top-level and nested accessors without invoking them", () => {
    let getterHits = 0;
    const topLevel = { ...input() } as Record<string, unknown>;
    Object.defineProperty(topLevel, "voltage", {
      enumerable: true,
      configurable: true,
      get() {
        getterHits += 1;
        return input().voltage;
      },
    });
    expectClosedFailure(topLevel, "invalid_input", "F-02.input_schema_invalid");

    const nested = structuredClone(input()) as Record<string, any>;
    Object.defineProperty(nested.voltage, "voltageV", {
      enumerable: true,
      configurable: true,
      get() {
        getterHits += 1;
        return VOLTAGE_V;
      },
    });
    expectClosedFailure(
      nested,
      "invalid_input",
      "F-02.voltage_evidence_invalid",
    );
    expect(getterHits).toBe(0);
  });

  it("rejects Proxy reflection traps and never relies on Proxy get coercion", () => {
    let getHits = 0;
    const nestedProxy = new Proxy(input().voltage, {
      get() {
        getHits += 1;
        throw new Error("get trap must not run");
      },
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expectClosedFailure(
      { ...input(), voltage: nestedProxy },
      "invalid_input",
      "F-02.voltage_evidence_invalid",
    );
    const topProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys");
      },
    });
    expectClosedFailure(topProxy, "invalid_input", "F-02.input_schema_invalid");
    expect(getHits).toBe(0);
  });

  it("rejects symbol keys, inherited fields, class instances and nested extras", () => {
    const symbolTop = { ...input() } as Record<PropertyKey, unknown>;
    symbolTop[Symbol("hidden")] = 0;
    expectClosedFailure(
      symbolTop,
      "invalid_input",
      "F-02.input_schema_invalid",
    );

    const symbolNested = structuredClone(input()) as Record<string, any>;
    symbolNested.provenance[Symbol("hidden")] = "not controlled";
    expectClosedFailure(
      symbolNested,
      "invalid_input",
      "F-02.provenance_evidence_invalid",
    );

    const nestedExtra = structuredClone(input()) as Record<string, any>;
    nestedExtra.uncertainty.unfrozenTolerance = 0.05;
    expectClosedFailure(
      nestedExtra,
      "invalid_input",
      "F-02.uncertainty_evidence_invalid",
    );

    class MeasurementInput {
      readonly voltage = input().voltage;
      readonly current = input().current;
      readonly activePower = input().activePower;
      readonly reactiveEvidence = input().reactiveEvidence;
      readonly deembedding = input().deembedding;
      readonly temperatureStability = input().temperatureStability;
      readonly provenance = input().provenance;
      readonly uncertainty = input().uncertainty;
    }
    expectClosedFailure(
      new MeasurementInput(),
      "invalid_input",
      "F-02.input_schema_invalid",
    );

    const inherited = Object.create({ hiddenDefault: 0 }) as Record<
      string,
      unknown
    >;
    Object.assign(inherited, input());
    expectClosedFailure(
      inherited,
      "invalid_input",
      "F-02.input_schema_invalid",
    );
  });
});

describe("F-02 binary64 failure-closed policy", () => {
  it.each([
    [
      "I^2 underflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1e-154;
      },
    ],
    [
      "I^2 overflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1e200;
      },
    ],
    [
      "Req division overflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 0.5;
        candidate.activePower.activePowerW = Number.MAX_VALUE;
      },
    ],
    [
      "Req division becomes subnormal",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1e154;
        candidate.activePower.activePowerW = 1;
      },
    ],
    [
      "V*I overflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1e154;
        candidate.activePower.activePowerW = 1e308;
        candidate.voltage.voltageV = 1e155;
      },
    ],
    [
      "V*I underflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1.5e-154;
        candidate.activePower.activePowerW = 0;
        candidate.voltage.voltageV = F02_BINARY64_MIN_NORMAL;
      },
    ],
    [
      "P-VI swallows apparent power",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 1e308;
        candidate.voltage.voltageV = 1;
      },
    ],
    [
      "P-VI swallows active power",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 1;
        candidate.voltage.voltageV = 1e308;
      },
    ],
    [
      "V/I false zero",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1e154;
        candidate.activePower.activePowerW = 0;
        candidate.voltage.voltageV = F02_BINARY64_MIN_NORMAL;
      },
    ],
    [
      "V/I overflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 0.5;
        candidate.activePower.activePowerW = 0;
        candidate.voltage.voltageV = Number.MAX_VALUE;
      },
    ],
    [
      "|Z|^2 underflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 0;
        candidate.voltage.voltageV = 1e-200;
      },
    ],
    [
      "|Z|^2 overflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 0;
        candidate.voltage.voltageV = 1e200;
      },
    ],
    [
      "Req^2 underflow",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 1e-160;
        candidate.voltage.voltageV = 1e-153;
      },
    ],
    [
      "x2 subtraction swallows Req^2",
      (candidate: Record<string, any>) => {
        candidate.current.currentA = 1;
        candidate.activePower.activePowerW = 1e90;
        candidate.voltage.voltageV = 1e100;
      },
    ],
    [
      "angular frequency overflow",
      (candidate: Record<string, any>) => {
        for (const evidence of [
          candidate.voltage,
          candidate.current,
          candidate.activePower,
          candidate.reactiveEvidence,
        ]) {
          evidence.binding.frequencyHz = 1e308;
        }
      },
    ],
    [
      "Leq underflow",
      (candidate: Record<string, any>) => {
        for (const evidence of [
          candidate.voltage,
          candidate.current,
          candidate.activePower,
          candidate.reactiveEvidence,
        ]) {
          evidence.binding.frequencyHz = 1e307;
        }
      },
    ],
  ] as const)("rejects %s without an output", (_name, mutate) => {
    expectClosedFailure(
      changed((candidate) => mutate(candidate)),
      "invalid_input",
      "F-02.numeric_resolution_invalid",
    );
  });

  it("rejects subnormal numeric inputs before any equation is evaluated", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.activePower.activePowerW = Number.MIN_VALUE;
      }),
      "invalid_input",
      "F-02.active_power_evidence_invalid",
    );
    expectClosedFailure(
      changed((candidate) => {
        candidate.current.binding.frequencyHz = Number.MIN_VALUE;
      }),
      "invalid_input",
      "F-02.port_state_frequency_temperature_window_mismatch",
    );
  });
});
