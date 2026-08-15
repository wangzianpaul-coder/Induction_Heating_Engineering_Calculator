import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  H06_BINARY64_MIN_NORMAL,
  H06_CONTRACT_SOURCE_REFS,
  H06_DERIVATION_REFS,
  H06_DHT_SOURCE_PIN,
  H06_IMPLEMENTATION_READINESS,
  H06_METHOD_CHECK_IDS,
  H06_METHOD_MAPPING,
  H06_NUMERIC_POLICY,
  H06_SOURCE_READINESS,
  H06_SOURCE_REFS,
  H06_VALIDATION_CASE_IDS,
  H06_WARNING_PREDICATES,
  evaluateH06LocalPhaseAndNpshGates,
  type H06AvailableDataGate,
  type H06AvailableSaturationTuple,
  type H06AvailableTemperatureEvidence,
  type H06DataGateEvidence,
  type H06DataGateId,
  type H06LocalPhaseAndNpshGatesFailure,
  type H06LocalPhaseAndNpshGatesInput,
  type H06LocalPhaseAndNpshGatesSuccess,
  type H06LocalStateBinding,
  type H06NotApplicableDataGate,
  type H06NpshaEvidence,
  type H06NpshBinding,
  type H06NpshComparisonEvidence,
  type H06NpshrEvidence,
  type H06TemperatureEvidence,
  type H06TemperatureInputId,
  type H06UnknownDataGate,
  type H06UnknownSaturationTuple,
  type H06UnknownTemperatureEvidence,
} from "../../../src/methods/H/h06LocalPhaseAndNpshGates.js";
import * as publicApi from "../../../src/public-api.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT = `case:${"a".repeat(64)}`;
const OTHER_CASE_SNAPSHOT = `case:${"b".repeat(64)}`;
const LOCAL_SOURCE_SNAPSHOT = `case:${"c".repeat(64)}`;
const PROPERTY_SNAPSHOT = `material:${"d".repeat(64)}`;
const FLUID_STATE_SNAPSHOT = `material:${"e".repeat(64)}`;
const OPERATING_POINT_SNAPSHOT = `case:${"f".repeat(64)}`;
const NPSHA_SOURCE_SNAPSHOT = `case:${"1".repeat(64)}`;
const NPSHR_SOURCE_SNAPSHOT = `material:${"2".repeat(64)}`;
const OEM_CURVE_SNAPSHOT = `material:${"3".repeat(64)}`;
const GATE_SOURCE_SNAPSHOT = `case:${"4".repeat(64)}`;

type MutableInput = {
  -readonly [K in keyof H06LocalPhaseAndNpshGatesInput]: H06LocalPhaseAndNpshGatesInput[K];
};

function localBinding(
  overrides: Partial<H06LocalStateBinding> = {},
): H06LocalStateBinding {
  return {
    coolantCircuitId: "coolant-circuit:coil:001",
    branchId: "coolant-branch:coil:001",
    localStationId: "station:coil-hotspot:001",
    localReferencePlaneId: "plane:coil-hotspot:001",
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:loaded-steady:001",
    fluidStateSnapshotId: FLUID_STATE_SNAPSHOT,
    timeBasisId: "time-basis:steady-average",
    measurementWindowId: "window:coincident:001",
    fluidIdentityId: "fluid:ordinary-water:001",
    fluidClass: "ordinary_water",
    sourceSnapshotId: LOCAL_SOURCE_SNAPSHOT,
    ...overrides,
  };
}

function saturationTuple(
  saturationTemperatureK = 380,
  overrides: Partial<H06AvailableSaturationTuple> = {},
): H06AvailableSaturationTuple {
  return {
    kind: "available",
    inputId: "pabs+Tsat",
    pressurePa: 101_325,
    pressureDimensionId: "pressure",
    pressureCanonicalUnitId: "Pa",
    pressureBasis: "absolute",
    saturationTemperatureK,
    temperatureDimensionId: "absolute_temperature",
    temperatureCanonicalUnitId: "K",
    tupleOrigin: "external_precomputed_exact_pressure_tuple",
    providerExecutionClaim: "not_executed_by_h06",
    providerSourceRef: "IAPWS-IF97:REGION4",
    providerReleaseId: "IAPWS-IF97:REGION4",
    providerImplementationId: "external-property-provider:001",
    propertySnapshotId: PROPERTY_SNAPSHOT,
    sourceMethod: "upstream_precomputed_model",
    sourceRef: "IAPWS-IF97:REGION4",
    dataQuality: "approved_reference",
    provenanceId: "provenance:Tsat-at-pabs:001",
    binding: localBinding(),
    ...overrides,
  };
}

function unknownSaturation(
  overrides: Partial<H06UnknownSaturationTuple> = {},
): H06UnknownSaturationTuple {
  return {
    kind: "unknown_applicable",
    inputId: "pabs+Tsat",
    reason: "The exact local saturation tuple is not yet available",
    resolutionSourceRef: "resolution:IAPWS-tuple:001",
    pressureBasis: "unknown_or_unconfirmed",
    tupleOrigin: "unknown_or_unconfirmed",
    providerExecutionClaim: "unknown_or_unconfirmed",
    providerSourceRef: "unknown_or_unconfirmed",
    sourceMethod: "unknown_or_unconfirmed",
    sourceRef: "source:unresolved-saturation:001",
    dataQuality: "unknown",
    provenanceId: "provenance:unresolved-saturation:001",
    binding: localBinding(),
    ...overrides,
  };
}

function temperature(
  inputId: H06TemperatureInputId,
  valueK: number,
  overrides: Partial<H06AvailableTemperatureEvidence> = {},
): H06AvailableTemperatureEvidence {
  return {
    kind: "available",
    inputId,
    valueK,
    dimensionId: "absolute_temperature",
    canonicalUnitId: "K",
    spatialBasis:
      inputId === "Tb"
        ? "local_bulk_at_declared_station"
        : "local_inner_wall_at_declared_station",
    valueOrigin: "measurement_or_upstream_precomputed_local_value",
    sourceMethod: "measurement",
    sourceRef: `measurement:${inputId}:001`,
    dataQuality: "measured",
    provenanceId: `provenance:${inputId}:001`,
    binding: localBinding(),
    ...overrides,
  };
}

function unknownTemperature(
  inputId: H06TemperatureInputId,
  overrides: Partial<H06UnknownTemperatureEvidence> = {},
): H06UnknownTemperatureEvidence {
  return {
    kind: "unknown_applicable",
    inputId,
    reason: `${inputId} is not available at the declared local station`,
    resolutionSourceRef: `resolution:${inputId}:001`,
    spatialBasis: "unknown_or_unconfirmed",
    valueOrigin: "unknown_or_unconfirmed",
    sourceMethod: "unknown_or_unconfirmed",
    sourceRef: `source:unresolved-${inputId}:001`,
    dataQuality: "unknown",
    provenanceId: `provenance:unresolved-${inputId}:001`,
    binding: localBinding(),
    ...overrides,
  };
}

function npshBinding(
  overrides: Partial<H06NpshBinding> = {},
): H06NpshBinding {
  return {
    pumpId: "pump:coil-loop:001",
    coolantCircuitId: "coolant-circuit:coil:001",
    flowRateM3PerS: 0.001,
    flowDimensionId: "volume_flow_rate",
    flowCanonicalUnitId: "m3_per_s",
    pumpSpeedRadPerS: 314.1592653589793,
    speedDimensionId: "angular_velocity",
    speedCanonicalUnitId: "rad_per_s",
    liquidIdentityId: "fluid:ordinary-water:001",
    liquidStateSnapshotId: FLUID_STATE_SNAPSHOT,
    npshDefinitionId: "head_of_pumped_liquid_at_suction_reference_plane",
    suctionReferencePlaneId: "plane:pump-suction:001",
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:loaded-steady:001",
    timeBasisId: "time-basis:steady-average",
    measurementWindowId: "window:coincident:001",
    operatingPointSnapshotId: OPERATING_POINT_SNAPSHOT,
    ...overrides,
  };
}

function npsha(
  valueM = 8,
  overrides: Partial<H06NpshaEvidence> = {},
): H06NpshaEvidence {
  return {
    inputId: "NPSHA",
    valueM,
    dimensionId: "length",
    canonicalUnitId: "m",
    precomputationBasis:
      "upstream_complete_bernoulli_at_declared_reference_plane",
    pressureBasis: "absolute",
    sourceMethod: "measurement_bound_precomputed",
    sourceRef: "measurement:NPSHA:001",
    dataQuality: "measured",
    provenanceId: "provenance:NPSHA:001",
    sourceSnapshotId: NPSHA_SOURCE_SNAPSHOT,
    binding: npshBinding(),
    ...overrides,
  };
}

function npshr(
  valueM = 3,
  overrides: Partial<H06NpshrEvidence> = {},
): H06NpshrEvidence {
  return {
    inputId: "NPSHR",
    valueM,
    dimensionId: "length",
    canonicalUnitId: "m",
    curveBasis: "oem_curve_at_exact_flow_speed_liquid_definition",
    sourceMethod: "oem_pump_curve",
    oemDocumentRef: "OEM:pump:coil-loop:001",
    oemCurveSnapshotId: OEM_CURVE_SNAPSHOT,
    sourceRef: "OEM:pump-curve:NPSHR:001",
    dataQuality: "project_specific",
    provenanceId: "provenance:NPSHR:001",
    sourceSnapshotId: NPSHR_SOURCE_SNAPSHOT,
    binding: npshBinding(),
    ...overrides,
  };
}

function availableNpsh(
  left: H06NpshaEvidence = npsha(),
  right: H06NpshrEvidence = npshr(),
): H06NpshComparisonEvidence {
  return { kind: "available", npsha: left, npshr: right };
}

function unknownNpsh(): H06NpshComparisonEvidence {
  return {
    kind: "unknown_applicable",
    reason: "NPSHA or matching OEM NPSHR is unavailable",
    resolutionSourceRef: "resolution:NPSH-pair:001",
  };
}

function unavailableNpsh(): H06NpshComparisonEvidence {
  return {
    kind: "source_confirmed_not_applicable",
    reason: "No pump is present in this source-confirmed circuit scope",
    resolutionSourceRef: "applicability:no-pump:001",
  };
}

function availableGate(
  gateId: H06DataGateId,
  overrides: Partial<H06AvailableDataGate> = {},
): H06AvailableDataGate {
  return {
    kind: "available",
    gateId,
    scopeEntityId:
      gateId === "pump_operating_evidence"
        ? "pump:coil-loop:001"
        : `scope:${gateId}:001`,
    sourceMethod:
      gateId === "water_quality"
        ? "measurement"
        : gateId === "oem_safety_thresholds"
          ? "oem_document"
          : "measurement",
    sourceRef: `source:${gateId}:001`,
    dataQuality: gateId === "water_quality" ? "measured" : "project_specific",
    provenanceId: `provenance:${gateId}:001`,
    sourceSnapshotId: GATE_SOURCE_SNAPSHOT,
    coolantCircuitId: "coolant-circuit:coil:001",
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:loaded-steady:001",
    timeBasisId: "time-basis:steady-average",
    ...overrides,
  };
}

function unknownGate(
  gateId: H06DataGateId,
  overrides: Partial<H06UnknownDataGate> = {},
): H06UnknownDataGate {
  return {
    kind: "unknown_applicable",
    gateId,
    scopeEntityId: `scope:${gateId}:unresolved`,
    reason: `${gateId} remains unresolved`,
    resolutionSourceRef: `resolution:${gateId}:001`,
    sourceMethod: "unknown_or_unconfirmed",
    sourceRef: `source:unresolved-${gateId}:001`,
    dataQuality: "unknown",
    provenanceId: `provenance:unresolved-${gateId}:001`,
    sourceSnapshotId: GATE_SOURCE_SNAPSHOT,
    coolantCircuitId: "coolant-circuit:coil:001",
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:loaded-steady:001",
    timeBasisId: "time-basis:steady-average",
    ...overrides,
  };
}

function notApplicableGate(
  gateId: H06DataGateId,
  overrides: Partial<H06NotApplicableDataGate> = {},
): H06NotApplicableDataGate {
  return {
    kind: "source_confirmed_not_applicable",
    gateId,
    scopeEntityId: `scope:${gateId}:not-applicable`,
    reason: `${gateId} is source-confirmed outside this circuit scope`,
    resolutionSourceRef: `applicability:${gateId}:001`,
    sourceMethod: "project_specification",
    sourceRef: `source:${gateId}:not-applicable:001`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${gateId}:not-applicable:001`,
    sourceSnapshotId: GATE_SOURCE_SNAPSHOT,
    coolantCircuitId: "coolant-circuit:coil:001",
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:loaded-steady:001",
    timeBasisId: "time-basis:steady-average",
    ...overrides,
  };
}

function baseInput(): MutableInput {
  return {
    requestedInterpretation: "raw_screening_only",
    saturationTuple: saturationTuple(),
    bulkTemperature: temperature("Tb", 350),
    innerWallTemperature: temperature("Twi", 370),
    npshComparison: availableNpsh(),
    waterQualityEvidence: availableGate("water_quality"),
    oemSafetyThresholdEvidence: availableGate("oem_safety_thresholds"),
    pumpEvidence: availableGate("pump_operating_evidence"),
  };
}

function successOf(input: unknown): H06LocalPhaseAndNpshGatesSuccess {
  const result = evaluateH06LocalPhaseAndNpshGates(input);
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error(result.failure.code);
  return result;
}

function failureOf(input: unknown): H06LocalPhaseAndNpshGatesFailure {
  const result = evaluateH06LocalPhaseAndNpshGates(input);
  expect(result.status).not.toBe("success");
  if (result.status === "success") throw new Error("Expected H-06 failure");
  return result;
}

function expectNoFailurePayload(result: H06LocalPhaseAndNpshGatesFailure): void {
  expect(result).not.toHaveProperty("value");
  expect(result).not.toHaveProperty("evidence");
  expect(result).not.toHaveProperty("calculationTrace");
  expect(result).not.toHaveProperty("inputSnapshot");
}

function rawValue(
  result: H06LocalPhaseAndNpshGatesSuccess,
  key:
    | "bulkSaturationMargin"
    | "wallSaturationMargin"
    | "npshRawDifference",
): number {
  const output = result.value[key];
  expect(output.kind).toBe("available");
  if (output.kind !== "available") throw new Error(output.reason);
  return output.valueSi;
}

describe("H-06 local phase, NPSH and data gates", () => {
  it("maps exactly to the frozen registry without activating runtime", () => {
    const spec = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-06"));
    expect(H06_METHOD_MAPPING.methodId).toBe(spec.methodId);
    expect(H06_METHOD_MAPPING.approvalStatus).toBe("approved_with_limitation");
    expect(H06_METHOD_MAPPING.methodType).toBe("analytical");
    expect(H06_SOURCE_REFS).toEqual(spec.sourceRefs);
    expect(H06_CONTRACT_SOURCE_REFS).toEqual(spec.contractSourceRefs);
    expect(H06_DERIVATION_REFS).toEqual(spec.derivationRefs);
    expect(H06_VALIDATION_CASE_IDS).toEqual([]);
    expect(H06_METHOD_CHECK_IDS).toEqual(["COOL-WARN-001"]);
    expect(H06_METHOD_MAPPING.stableWarningIds).toEqual([]);
    expect(H06_WARNING_PREDICATES).toEqual({
      positiveMarginCalledSafe: "a positive raw margin is called safe",
      outletTemperatureAsHotspot:
        "outlet temperature substitutes for hotspot temperature",
      oemOrPumpEvidenceMissing: "OEM data or pump curve is missing",
      gaugePressure: "gauge pressure is used",
    });
    expect(H06_IMPLEMENTATION_READINESS).toMatchObject({
      runtimeActivated: false,
      publicApiExported: false,
    });
    expect("evaluateH06LocalPhaseAndNpshGates" in publicApi).toBe(false);
  });

  it("pins the controlled DHT hash and keeps IAPWS/HI/OEM release gates blocked", () => {
    const pdfUrl = new URL(
      "../../../references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf",
      import.meta.url,
    );
    const digest = createHash("sha256")
      .update(readFileSync(pdfUrl))
      .digest("hex");
    expect(digest).toBe(H06_DHT_SOURCE_PIN.sha256);
    expect(H06_DHT_SOURCE_PIN.auditedPdfPages).toEqual([11, 12, 17]);
    const manifest = readFileSync(
      new URL("../../../SOURCE_MANIFEST.csv", import.meta.url),
      "utf8",
    );
    expect(manifest).toContain(H06_DHT_SOURCE_PIN.relativePath.replaceAll("/", "\\"));
    expect(manifest).toContain(H06_DHT_SOURCE_PIN.sha256);
    expect(H06_SOURCE_READINESS).toMatchObject({
      technicalFreezeId: "IH-EC-V1-G0-2026-08-14-01",
      iapwsRegion4: {
        localPinnedCopyAvailable: false,
        executableProviderAvailable: false,
      },
      hi961: {
        localPinnedEditionAvailable: false,
        safetyMarginEvaluationAvailable: false,
      },
      oemSafetyThresholds: {
        frozenProjectThresholdsAvailable: false,
        safetyDecisionAvailable: false,
      },
    });
  });

  it("publishes only signed raw screening differences for the fully bound path", () => {
    const result = successOf(baseInput());
    expect(result.calculationStatus).toBe("partial");
    expect(rawValue(result, "bulkSaturationMargin")).toBe(30);
    expect(rawValue(result, "wallSaturationMargin")).toBe(10);
    expect(rawValue(result, "npshRawDifference")).toBe(5);
    expect(result.value.safetyConclusion).toBe("not_evaluated");
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([]);
    for (const output of [
      result.value.bulkSaturationMargin,
      result.value.wallSaturationMargin,
      result.value.npshRawDifference,
    ]) {
      expect(output).toMatchObject({
        kind: "available",
        status: "screening_only",
        interpretation: "signed_raw_margin_not_a_safety_conclusion",
        safetyConclusion: "not_evaluated",
      });
    }
    expect(result.calculationTrace.map((item) => item.equation)).toEqual([
      "DeltaT_sub_bulk = Tsat(p_abs) - T_bulk",
      "DeltaT_sub_wall = Tsat(p_abs) - T_wall_inner",
      "NPSH_raw_difference = NPSHA - NPSHR",
    ]);
    expect(result.calculationTrace.every((item) => !item.safetyDecisionPerformed)).toBe(true);
  });

  it("allows a negative bulk raw margin without calling it safe", () => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(340);
    candidate.bulkTemperature = temperature("Tb", 350);
    candidate.innerWallTemperature = unknownTemperature("Twi");
    const result = successOf(candidate);
    expect(rawValue(result, "bulkSaturationMargin")).toBe(-10);
    expect(result.value.wallSaturationMargin).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.value.safetyConclusion).toBe("not_evaluated");
  });

  it("allows a signed negative NPSH raw difference without a cavitation decision", () => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(npsha(2), npshr(3));
    const result = successOf(candidate);
    expect(rawValue(result, "npshRawDifference")).toBe(-1);
    expect(result.value.safetyConclusion).toBe("not_evaluated");
  });

  it("allows exact zero bulk and NPSH differences", () => {
    const candidate = baseInput();
    candidate.bulkTemperature = temperature("Tb", 380);
    candidate.npshComparison = availableNpsh(npsha(3), npshr(3));
    const result = successOf(candidate);
    expect(rawValue(result, "bulkSaturationMargin")).toBe(0);
    expect(rawValue(result, "npshRawDifference")).toBe(0);
  });

  it("leaves the wall margin unavailable when Twi is not supplied", () => {
    const candidate = baseInput();
    candidate.innerWallTemperature = unknownTemperature("Twi");
    const result = successOf(candidate);
    expect(rawValue(result, "bulkSaturationMargin")).toBe(30);
    expect(result.value.wallSaturationMargin).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
      unresolvedItemIds: ["Twi"],
    });
    expect(result.value.wallSaturationMargin).not.toHaveProperty("valueSi");
    expect(result.value.missingData).toContainEqual(
      expect.objectContaining({ itemId: "Twi", category: "local_temperature" }),
    );
  });

  it("keeps saturation outputs unavailable when the exact tuple is unresolved", () => {
    const candidate = baseInput();
    candidate.saturationTuple = unknownSaturation();
    const result = successOf(candidate);
    expect(result.value.bulkSaturationMargin.kind).toBe("unavailable");
    expect(result.value.wallSaturationMargin.kind).toBe("unavailable");
    expect(rawValue(result, "npshRawDifference")).toBe(5);
    expect(result.value.missingData.filter((item) => item.itemId === "pabs+Tsat")).toHaveLength(1);
  });

  it("keeps local saturation outputs unavailable when the water class is unconfirmed", () => {
    const candidate = baseInput();
    const binding = localBinding({ fluidClass: "unknown_or_unconfirmed" });
    candidate.saturationTuple = saturationTuple(380, { binding });
    candidate.bulkTemperature = temperature("Tb", 350, { binding });
    candidate.innerWallTemperature = temperature("Twi", 370, { binding });
    const result = successOf(candidate);
    expect(result.value.bulkSaturationMargin.kind).toBe("unavailable");
    expect(result.value.wallSaturationMargin.kind).toBe("unavailable");
    expect(result.value.missingData).toContainEqual(
      expect.objectContaining({ itemId: "pabs+Tsat" }),
    );
  });

  it.each(["bulkTemperature", "innerWallTemperature"] as const)(
    "keeps %s unavailable when its spatial/value origin remains unknown",
    (key) => {
      const candidate = baseInput();
      candidate[key] = temperature(
        key === "bulkTemperature" ? "Tb" : "Twi",
        key === "bulkTemperature" ? 350 : 370,
        {
          spatialBasis: "unknown_or_unconfirmed",
          valueOrigin: "unknown_or_unconfirmed",
        },
      );
      const result = successOf(candidate);
      const output =
        key === "bulkTemperature"
          ? result.value.bulkSaturationMargin
          : result.value.wallSaturationMargin;
      expect(output).toMatchObject({
        kind: "unavailable",
        status: "insufficient_data",
      });
      expect(output).not.toHaveProperty("valueSi");
    },
  );

  it("keeps NPSH unavailable when the complete pair is unresolved", () => {
    const candidate = baseInput();
    candidate.npshComparison = unknownNpsh();
    candidate.pumpEvidence = unknownGate("pump_operating_evidence");
    const result = successOf(candidate);
    expect(rawValue(result, "bulkSaturationMargin")).toBe(30);
    expect(result.value.npshRawDifference).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
      unresolvedItemIds: ["NPSHA/NPSHR"],
    });
    expect(result.value.npshRawDifference).not.toHaveProperty("valueSi");
  });

  it.each([
    ["waterQualityEvidence", "water_quality"],
    ["oemSafetyThresholdEvidence", "oem_safety_thresholds"],
  ] as const)("reports unknown %s without substituting a threshold", (key, gateId) => {
    const candidate = baseInput();
    candidate[key] = unknownGate(gateId);
    const result = successOf(candidate);
    expect(result.value.missingData).toContainEqual(
      expect.objectContaining({ itemId: gateId, category: gateId }),
    );
    expect(result.value.dataGates).toContainEqual(
      expect.objectContaining({ gateId, disposition: "unknown_missing_data" }),
    );
  });

  it("does not treat source-confirmed N/A water/OEM evidence as zero or a threshold", () => {
    const candidate = baseInput();
    candidate.waterQualityEvidence = notApplicableGate("water_quality");
    candidate.oemSafetyThresholdEvidence = notApplicableGate(
      "oem_safety_thresholds",
    );
    const result = successOf(candidate);
    expect(result.value.missingData.map((item) => item.itemId)).not.toContain(
      "water_quality",
    );
    expect(result.value.dataGates.slice(0, 2).map((item) => item.disposition)).toEqual([
      "source_confirmed_not_applicable",
      "source_confirmed_not_applicable",
    ]);
  });

  it("supports a source-confirmed no-pump route without a numeric unity/zero stand-in", () => {
    const candidate = baseInput();
    candidate.npshComparison = unavailableNpsh();
    candidate.pumpEvidence = notApplicableGate("pump_operating_evidence");
    const result = successOf(candidate);
    expect(result.value.npshRawDifference).toMatchObject({
      kind: "unavailable",
      status: "source_confirmed_not_applicable",
      unresolvedItemIds: [],
    });
    expect(result.value.npshRawDifference).not.toHaveProperty("valueSi");
  });

  it("rejects a requested safe/no-boiling conclusion without returning evidence", () => {
    const candidate = baseInput();
    candidate.requestedInterpretation = "safety_or_no_boiling_claim";
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-06.unsafe_claim_not_applicable" },
    });
    expectNoFailurePayload(result);
  });

  it("keeps schema/enum invalidity ahead of a known unsafe request", () => {
    const candidate = baseInput();
    candidate.requestedInterpretation = "safety_or_no_boiling_claim";
    candidate.waterQualityEvidence = {
      ...availableGate("water_quality"),
      gateId: "wrong-gate",
    } as unknown as H06DataGateEvidence;
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.data_gate_schema_invalid");
  });

  it("rejects an unknown requested interpretation after known-domain checks", () => {
    const candidate = baseInput();
    candidate.requestedInterpretation = "unknown_or_unconfirmed";
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-06.requested_interpretation_unknown" },
    });
    expectNoFailurePayload(result);
  });

  it("rejects gauge pressure before unresolved optional evidence", () => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(380, { pressureBasis: "gauge" });
    candidate.npshComparison = unknownNpsh();
    candidate.pumpEvidence = unknownGate("pump_operating_evidence");
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-06.gauge_pressure_not_applicable" },
    });
  });

  it.each([
    {
      tupleOrigin: "h06_internal_property_provider_claim" as const,
      providerExecutionClaim: "not_executed_by_h06" as const,
    },
    {
      tupleOrigin: "external_precomputed_exact_pressure_tuple" as const,
      providerExecutionClaim: "executable_inside_h06" as const,
    },
  ])("rejects an unpinned executable property route", (overrides) => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(380, overrides);
    const result = failureOf(candidate);
    expect(result.failure.code).toBe(
      "H-06.unpinned_provider_execution_not_applicable",
    );
  });

  it("rejects a saturation tuple from an unapproved source route", () => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(380, {
      providerSourceRef: "generic-steam-table:001",
    });
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.saturation_source_not_applicable",
    );
  });

  it.each([
    ["bulkTemperature", "circuit_outlet_bulk", "measurement_or_upstream_precomputed_local_value"],
    ["bulkTemperature", "local_bulk_at_declared_station", "outlet_temperature_substitution"],
    ["innerWallTemperature", "outlet_substituted_as_hotspot", "measurement_or_upstream_precomputed_local_value"],
    ["innerWallTemperature", "local_inner_wall_at_declared_station", "outlet_temperature_substitution"],
  ] as const)("rejects outlet-as-hotspot evidence on %s", (key, spatialBasis, valueOrigin) => {
    const candidate = baseInput();
    const inputId = key === "bulkTemperature" ? "Tb" : "Twi";
    const valueK = key === "bulkTemperature" ? 350 : 370;
    candidate[key] = temperature(inputId, valueK, { spatialBasis, valueOrigin });
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.outlet_as_hotspot_not_applicable");
  });

  it.each(["bulkTemperature", "innerWallTemperature"] as const)(
    "rejects an internal q/h/Rf temperature derivation on %s",
    (key) => {
      const candidate = baseInput();
      candidate[key] = temperature(
        key === "bulkTemperature" ? "Tb" : "Twi",
        key === "bulkTemperature" ? 350 : 370,
        { valueOrigin: "h06_derived_from_q_h_rf" },
      );
      expect(failureOf(candidate).failure.code).toBe(
        "H-06.wall_derivation_not_applicable",
      );
    },
  );

  it("rejects a non-water/mixture local property route", () => {
    const candidate = baseInput();
    const binding = localBinding({ fluidClass: "other_liquid_or_mixture" });
    candidate.saturationTuple = saturationTuple(380, { binding });
    candidate.bulkTemperature = temperature("Tb", 350, { binding });
    candidate.innerWallTemperature = temperature("Twi", 370, { binding });
    expect(failureOf(candidate).failure.code).toBe("H-06.fluid_not_applicable");
  });

  it.each([
    ["coolantCircuitId", "coolant-circuit:other"],
    ["branchId", "coolant-branch:other"],
    ["localStationId", "station:other"],
    ["localReferencePlaneId", "plane:other"],
    ["caseSnapshotId", OTHER_CASE_SNAPSHOT],
    ["stateSnapshotId", "state:other"],
    ["fluidStateSnapshotId", `material:${"5".repeat(64)}`],
    ["timeBasisId", "time-basis:other"],
    ["measurementWindowId", "window:other"],
    ["fluidIdentityId", "fluid:other-water"],
    ["sourceSnapshotId", `case:${"6".repeat(64)}`],
  ] as const)("rejects a local same-state mismatch in %s", (field, value) => {
    const candidate = baseInput();
    candidate.bulkTemperature = temperature("Tb", 350, {
      binding: localBinding({ [field]: value }),
    });
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.local_state_binding_mismatch");
  });

  it.each([
    ["pumpId", "pump:other"],
    ["flowRateM3PerS", 0.002],
    ["pumpSpeedRadPerS", 400],
    ["liquidIdentityId", "fluid:other"],
    ["liquidStateSnapshotId", `material:${"7".repeat(64)}`],
    ["npshDefinitionId", "other-definition"],
    ["suctionReferencePlaneId", "plane:other-suction"],
    ["caseSnapshotId", OTHER_CASE_SNAPSHOT],
    ["stateSnapshotId", "state:other"],
    ["timeBasisId", "time-basis:other"],
    ["measurementWindowId", "window:other"],
    ["operatingPointSnapshotId", OTHER_CASE_SNAPSHOT],
  ] as const)("rejects an NPSHA/NPSHR binding mismatch in %s", (field, value) => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(
      npsha(),
      npshr(3, { binding: npshBinding({ [field]: value }) }),
    );
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.npsh_binding_mismatch");
  });

  it.each([
    npsha(8, { precomputationBasis: "partial_or_missing_bernoulli_terms" }),
    npsha(8, { pressureBasis: "gauge" }),
    npsha(8, { sourceMethod: "h06_partial_bernoulli_attempt" }),
  ])("rejects partial/gauge H-06 NPSHA construction", (left) => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(left, npshr());
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.npsh_basis_not_applicable",
    );
  });

  it.each([
    npshr(3, { curveBasis: "non_oem_or_unmatched_curve" }),
    npshr(3, { sourceMethod: "generic_or_non_oem_curve" }),
  ])("rejects non-OEM or unmatched NPSHR evidence", (right) => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(npsha(), right);
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.npsh_basis_not_applicable",
    );
  });

  it("rejects a numeric NPSH pair without matching available pump evidence", () => {
    const candidate = baseInput();
    candidate.pumpEvidence = unknownGate("pump_operating_evidence");
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.pump_evidence_contradiction",
    );
  });

  it("rejects inconsistent source-confirmed applicability across pump/NPSH", () => {
    const candidate = baseInput();
    candidate.npshComparison = unavailableNpsh();
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-06.pump_evidence_contradiction" },
    });
  });

  it("rejects a data gate bound to another case before unknown evidence", () => {
    const candidate = baseInput();
    candidate.waterQualityEvidence = unknownGate("water_quality", {
      caseSnapshotId: OTHER_CASE_SNAPSHOT,
    });
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.data_gate_binding_mismatch");
  });

  it.each([380, 390])(
    "returns only single-phase-model not_applicable for wall margin %s K",
    (wallK) => {
      const candidate = baseInput();
      candidate.innerWallTemperature = temperature("Twi", wallK);
      const result = failureOf(candidate);
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "H-06.single_phase_model_not_applicable" },
      });
      expectNoFailurePayload(result);
    },
  );

  it("prioritizes a known Twi >= Tsat exclusion over unknown interpretation", () => {
    const candidate = baseInput();
    candidate.requestedInterpretation = "unknown_or_unconfirmed";
    candidate.saturationTuple = saturationTuple(380);
    candidate.innerWallTemperature = temperature("Twi", 390);
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-06.single_phase_model_not_applicable" },
    });
    expectNoFailurePayload(result);
  });

  it("prioritizes a known Twi >= Tsat exclusion over unrelated bulk subtraction swallowing", () => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(Number.MAX_VALUE);
    candidate.bulkTemperature = temperature("Tb", 1);
    candidate.innerWallTemperature = temperature("Twi", Number.MAX_VALUE);
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-06.single_phase_model_not_applicable" },
    });
    expectNoFailurePayload(result);
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    -1,
    H06_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid saturation temperature %s", (value) => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(value);
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.saturation_value_invalid",
    );
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    -1,
    H06_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid local temperature %s", (value) => {
    const candidate = baseInput();
    candidate.bulkTemperature = temperature("Tb", value);
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.temperature_value_invalid",
    );
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    -0,
    H06_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid OEM NPSHR %s", (value) => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(npsha(), npshr(value));
    expect(failureOf(candidate).failure.code).toBe("H-06.npsh_value_invalid");
  });

  it.each([
    ["flowRateM3PerS", 0],
    ["flowRateM3PerS", H06_BINARY64_MIN_NORMAL / 2],
    ["pumpSpeedRadPerS", Number.POSITIVE_INFINITY],
    ["pumpSpeedRadPerS", -1],
  ] as const)("rejects invalid NPSH binding numeric %s", (field, value) => {
    const candidate = baseInput();
    const binding = npshBinding({ [field]: value });
    candidate.npshComparison = availableNpsh(
      npsha(8, { binding }),
      npshr(3, { binding }),
    );
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.npsh_evidence_schema_invalid",
    );
  });

  it.each([
    [Number.MAX_VALUE, 1],
    [1, Number.MAX_VALUE],
  ] as const)("rejects either swallowed local subtraction operand (%s,%s)", (tsat, bulk) => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(tsat);
    candidate.bulkTemperature = temperature("Tb", bulk);
    candidate.innerWallTemperature = unknownTemperature("Twi");
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.numeric_resolution_invalid");
    expectNoFailurePayload(result);
  });

  it.each([
    [Number.MAX_VALUE, 1],
    [1, Number.MAX_VALUE],
  ] as const)("rejects either swallowed NPSH subtraction operand (%s,%s)", (available, required) => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(npsha(available), npshr(required));
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-06.numeric_resolution_invalid");
    expectNoFailurePayload(result);
  });

  it("rejects NPSH subtraction overflow", () => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(
      npsha(-Number.MAX_VALUE),
      npshr(Number.MAX_VALUE),
    );
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.numeric_resolution_invalid",
    );
  });

  it("rejects a nonzero subnormal local subtraction result", () => {
    const candidate = baseInput();
    candidate.saturationTuple = saturationTuple(
      H06_BINARY64_MIN_NORMAL + Number.MIN_VALUE,
    );
    candidate.bulkTemperature = temperature("Tb", H06_BINARY64_MIN_NORMAL);
    candidate.innerWallTemperature = unknownTemperature("Twi");
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.numeric_resolution_invalid",
    );
  });

  it("rejects a nonzero subnormal NPSH subtraction result", () => {
    const candidate = baseInput();
    candidate.npshComparison = availableNpsh(
      npsha(H06_BINARY64_MIN_NORMAL + Number.MIN_VALUE),
      npshr(H06_BINARY64_MIN_NORMAL),
    );
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.numeric_resolution_invalid",
    );
  });

  it("declares the exact machine-only subtraction policy", () => {
    expect(H06_NUMERIC_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      nonzeroSubnormalInputOrResultPolicy: "fail_closed",
      overflowFalseZeroAndOperandSwallowPolicy: "fail_closed",
      exactZeroDifferencePolicy: "allowed",
      sourceEquationRearranged: false,
      minimumPositiveNormal: H06_BINARY64_MIN_NORMAL,
    });
  });

  it("rejects extra top-level string and symbol keys", () => {
    expect(failureOf({ ...baseInput(), extra: 1 }).failure.code).toBe(
      "H-06.input_schema_invalid",
    );
    const symbol = { ...baseInput() } as Record<PropertyKey, unknown>;
    symbol[Symbol("hostile")] = 1;
    expect(failureOf(symbol).failure.code).toBe("H-06.input_schema_invalid");
  });

  it("does not execute a top-level accessor", () => {
    const candidate = { ...baseInput() } as Record<string, unknown>;
    let executed = false;
    Object.defineProperty(candidate, "saturationTuple", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(failureOf(candidate).failure.code).toBe("H-06.input_schema_invalid");
    expect(executed).toBe(false);
  });

  it("does not execute a nested evidence accessor", () => {
    const candidate = baseInput();
    const bulk = { ...temperature("Tb", 350) } as Record<string, unknown>;
    let executed = false;
    Object.defineProperty(bulk, "valueK", {
      enumerable: true,
      get() {
        executed = true;
        return 0;
      },
    });
    candidate.bulkTemperature = bulk as unknown as H06TemperatureEvidence;
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.temperature_evidence_schema_invalid",
    );
    expect(executed).toBe(false);
  });

  it("contains a throwing Proxy at the trust boundary", () => {
    const hostile = new Proxy(baseInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(failureOf(hostile).failure.code).toBe("H-06.input_schema_invalid");
  });

  it("rejects malformed nested units, snapshots and extra keys", () => {
    const wrongUnit = baseInput();
    wrongUnit.bulkTemperature = {
      ...temperature("Tb", 350),
      canonicalUnitId: "degC",
    } as unknown as H06TemperatureEvidence;
    expect(failureOf(wrongUnit).failure.code).toBe(
      "H-06.temperature_evidence_schema_invalid",
    );

    const wrongSnapshot = baseInput();
    wrongSnapshot.saturationTuple = saturationTuple(380, {
      propertySnapshotId: "property:not-content-addressed",
    });
    expect(failureOf(wrongSnapshot).failure.code).toBe(
      "H-06.saturation_evidence_schema_invalid",
    );

    const extra = baseInput();
    extra.pumpEvidence = {
      ...availableGate("pump_operating_evidence"),
      extra: true,
    } as unknown as H06DataGateEvidence;
    expect(failureOf(extra).failure.code).toBe("H-06.data_gate_schema_invalid");
  });

  it("rejects contradictory tri-state gate provenance", () => {
    const candidate = baseInput();
    candidate.waterQualityEvidence = {
      ...availableGate("water_quality"),
      sourceMethod: "unknown_or_unconfirmed",
      dataQuality: "unknown",
    } as unknown as H06DataGateEvidence;
    expect(failureOf(candidate).failure.code).toBe(
      "H-06.data_gate_schema_invalid",
    );
  });

  it("does not mutate caller input and deep-freezes published evidence", () => {
    const candidate = baseInput();
    const before = JSON.stringify(candidate);
    const result = successOf(candidate);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.missingData)).toBe(true);
    expect(Object.isFrozen(result.value.dataGates)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.saturationTuple)).toBe(true);
    expect(result.calculationTrace.every((item) => Object.isFrozen(item))).toBe(true);
  });

  it("keeps representative failure branches payload-free", () => {
    const gauge = baseInput();
    gauge.saturationTuple = saturationTuple(380, { pressureBasis: "gauge" });
    const unsafe = baseInput();
    unsafe.requestedInterpretation = "safety_or_no_boiling_claim";
    const numeric = baseInput();
    numeric.saturationTuple = saturationTuple(Number.MAX_VALUE);
    numeric.bulkTemperature = temperature("Tb", 1);
    numeric.innerWallTemperature = unknownTemperature("Twi");
    const failures = [
      failureOf(null),
      failureOf(gauge),
      failureOf(unsafe),
      failureOf(numeric),
    ];
    for (const result of failures) expectNoFailurePayload(result);
  });

  it("contains no runtime fetch, historical target or hidden property/NPSH derivation", () => {
    const source = readFileSync(
      new URL(
        "../../../src/methods/H/h06LocalPhaseAndNpshGates.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/fetch\s*\(|localStorage|indexedDB|localhost|https?:\/\//i);
    expect(source).not.toMatch(/783\s*kW|135\s*L\/?min|legacy workbook|historical output/i);
    expect(source).not.toMatch(/function\s+(?:derive|compute)(?:Tsat|NPSHA|Twi)/i);
  });
});
