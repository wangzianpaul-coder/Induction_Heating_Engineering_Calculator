import { describe, expect, it } from "vitest";

import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../../src/config/versions.js";
import {
  createScalarQuantity,
  createUnavailableQuantity,
} from "../../src/controlled-quantity-factory.js";
import { parameterId, sourceRef } from "../../src/domain/ids.js";
import {
  createCaseSnapshot,
  createGeometrySnapshot,
  createMaterialSnapshot,
  type GeometrySnapshotPayload,
  type MaterialSnapshotPayload,
} from "../../src/domain/snapshot.js";
import {
  createCaseFile,
  parseCaseFile,
  serializeCaseFile,
} from "../../src/serialization/case-file.js";
import { fingerprint } from "../../src/serialization/canonical-json.js";
import { validateCaseFileCandidate } from "../../src/serialization/case-schema.js";

const geometryPayload = {
  geometrySchemaVersion: "1.0.0-alpha.1",
  geometryMappingId: "canonical_single_layer_v1",
  quantities: [
    createScalarQuantity({
      parameterId: parameterId("coil.inner_diameter"),
      value: 0.2,
      unitId: "m",
      dimensionId: "length",
      displayUnitId: "mm",
      basis: "total",
      uncertainty: { kind: "unknown" },
      provenance: {
        sourceKind: "user",
        sourceRef: sourceRef("case.input.coil.inner_diameter"),
        dataQuality: "user_defined",
      },
      status: "known",
      validDigits: 4,
    }),
  ],
  assumptions: [],
} as const satisfies GeometrySnapshotPayload;

const materialPayload = {
  materialId: "user_defined.copper_candidate",
  revision: "draft-1",
  libraryTier: "user_defined",
  approvalStatus: "draft",
  properties: [],
} as const satisfies MaterialSnapshotPayload;

const missingFrequency = createUnavailableQuantity({
  parameterId: parameterId("frequency"),
  dimensionId: "frequency",
  basis: "total",
  provenance: {
    sourceKind: "user",
    sourceRef: sourceRef("case.input.frequency"),
    dataQuality: "unknown",
  },
  status: "missing",
  reason: "The user has not entered the operating frequency.",
});

const gridActivePower = createScalarQuantity({
  parameterId: parameterId("P_grid"),
  value: 1.25,
  unitId: "kW",
  dimensionId: "power",
  displayUnitId: "kW",
  basis: "total",
  uncertainty: { kind: "unknown" },
  provenance: {
    sourceKind: "user",
    sourceRef: sourceRef("case.input.P_grid"),
    dataQuality: "user_defined",
  },
  status: "known",
  validDigits: 3,
});

type MutableRecord = Record<string, unknown>;

function recomputeSnapshotIdentity(snapshot: MutableRecord): void {
  const recalculated = fingerprint({
    kind: snapshot.kind,
    schemaVersion: snapshot.schemaVersion,
    technicalFreezeId: snapshot.technicalFreezeId,
    payload: snapshot.payload,
  });
  snapshot.fingerprint = recalculated;
  snapshot.snapshotId = `${String(snapshot.kind)}:${recalculated.value}`;
}

function recomputeAllCaseFingerprints(caseFile: MutableRecord): void {
  const caseSnapshot = caseFile.caseSnapshot as MutableRecord;
  const payload = caseSnapshot.payload as MutableRecord;
  recomputeSnapshotIdentity(payload.geometry as MutableRecord);
  for (const material of payload.materials as MutableRecord[]) {
    recomputeSnapshotIdentity(material);
  }
  recomputeSnapshotIdentity(caseSnapshot);
  caseFile.contentFingerprint = fingerprint({
    kind: caseFile.kind,
    schemaVersion: caseFile.schemaVersion,
    technicalFreezeId: caseFile.technicalFreezeId,
    caseSnapshot,
  });
}

describe("immutable snapshots and case exchange", () => {
  it("rejects invalid JSON without throwing", () => {
    expect(parseCaseFile("{not-json")).toMatchObject({
      status: "invalid_input",
      code: "invalid_json",
    });
  });

  it("uses a reproducible content hash independent of createdAt", () => {
    const first = createGeometrySnapshot(geometryPayload, "2026-08-14T00:00:00Z");
    const second = createGeometrySnapshot(geometryPayload, "2026-08-15T00:00:00Z");

    expect(first.snapshotId).toBe(second.snapshotId);
    expect(first.fingerprint).toEqual(second.fingerprint);
    expect(first.createdAt).not.toBe(second.createdAt);
    expect(Object.isFrozen(first.payload.quantities)).toBe(true);
  });

  it("round-trips a readable, version-pinned JSON case", () => {
    const geometry = createGeometrySnapshot(geometryPayload, "2026-08-14T01:00:00Z");
    const material = createMaterialSnapshot(materialPayload, "2026-08-14T01:00:00Z");
    const caseSnapshot = createCaseSnapshot(
      {
        caseId: "case-foundation-001",
        caseName: "Foundation serialization fixture",
        geometry,
        materials: [material],
        operatingConditions: [missingFrequency],
        topology: { status: "insufficient_data", reason: "not_selected" },
        phasorConvention: {
          amplitudeBasis: "rms",
          timeConvention: "exp_j_omega_t",
          currentDirection: "into_passive_port",
          complexPower: "S_equals_V_times_conjugate_I",
        },
        methodSelections: [
          {
            methodId: "B-01",
            methodVersion: VERSION_INFO.calculationModel,
            approvalStatus: "approved",
          },
        ],
        measurementOverrides: [],
        femReferenceIds: [],
        attachmentHashes: [],
        userInputs: [],
        displayUnits: { "coil.inner_diameter": "mm" },
        explicitOverrides: [],
        warningAcknowledgements: [],
        solverSettings: {},
        provenance: [{ datasetRole: "development", source: "synthetic_fixture" }],
        migration: {
          sourceSchemaVersion: VERSION_INFO.caseSchema,
          appliedMigrationIds: [],
        },
      },
      "2026-08-14T01:00:00Z",
    );
    const caseFile = createCaseFile(caseSnapshot);
    const text = serializeCaseFile(caseFile);
    const imported = parseCaseFile(text);

    expect(text).toContain("\n  \"caseSnapshot\"");
    expect(imported.status).toBe("success");
    if (imported.status === "success") {
      expect(imported.caseFile.caseSnapshot.snapshotId).toBe(caseSnapshot.snapshotId);
      expect(imported.caseFile.technicalFreezeId).toBe(TECHNICAL_FREEZE_ID);
      expect(imported.caseFile.caseSnapshot.payload.methodSelections).toEqual([
        {
          methodId: "B-01",
          methodVersion: VERSION_INFO.calculationModel,
          approvalStatus: "approved",
        },
      ]);
      expect(
        "valueSi" in imported.caseFile.caseSnapshot.payload.operatingConditions[0]!,
      ).toBe(false);
      expect(Object.isFrozen(imported.caseFile)).toBe(true);
    }
  });

  it("fails closed for tampering, unknown schema, and freeze mismatch", () => {
    const geometry = createGeometrySnapshot(geometryPayload, "2026-08-14T01:00:00Z");
    const caseSnapshot = createCaseSnapshot(
      {
        caseId: "case-foundation-002",
        caseName: "Failure-closed fixture",
        geometry,
        materials: [],
        operatingConditions: [gridActivePower],
        topology: { status: "insufficient_data" },
        phasorConvention: {
          amplitudeBasis: "rms",
          timeConvention: "exp_j_omega_t",
          currentDirection: "into_passive_port",
          complexPower: "S_equals_V_times_conjugate_I",
        },
        methodSelections: [
          {
            methodId: "B-01",
            methodVersion: VERSION_INFO.calculationModel,
            approvalStatus: "approved",
          },
        ],
        measurementOverrides: [],
        femReferenceIds: [],
        attachmentHashes: [],
        userInputs: [],
        displayUnits: {},
        explicitOverrides: [],
        warningAcknowledgements: [],
        solverSettings: {},
        provenance: [],
        migration: {
          sourceSchemaVersion: VERSION_INFO.caseSchema,
          appliedMigrationIds: [],
        },
      },
      "2026-08-14T01:00:00Z",
    );
    const json = JSON.parse(serializeCaseFile(createCaseFile(caseSnapshot))) as Record<
      string,
      unknown
    >;

    const tampered = structuredClone(json) as Record<string, unknown>;
    (tampered.caseSnapshot as { payload: { caseName: string } }).payload.caseName = "tampered";
    expect(parseCaseFile(JSON.stringify(tampered))).toMatchObject({
      status: "invalid_input",
      code: "fingerprint_mismatch",
    });

    const unknownSchema = structuredClone(json);
    unknownSchema.schemaVersion = "9.0.0";
    expect(parseCaseFile(JSON.stringify(unknownSchema))).toMatchObject({
      status: "insufficient_data",
      code: "unsupported_schema_version",
    });

    const wrongFreeze = structuredClone(json);
    wrongFreeze.technicalFreezeId = "IH-EC-V1-G0-OTHER";
    expect(parseCaseFile(JSON.stringify(wrongFreeze))).toMatchObject({
      status: "insufficient_data",
      code: "technical_freeze_mismatch",
    });

    const wrongModel = structuredClone(json) as Record<string, unknown>;
    const wrongModelSnapshot = wrongModel.caseSnapshot as {
      payload: { versions: { calculationModel: string } };
    };
    wrongModelSnapshot.payload.versions.calculationModel = "9.0.0-unknown";
    expect(parseCaseFile(JSON.stringify(wrongModel))).toMatchObject({
      status: "insufficient_data",
      code: "version_mismatch",
    });

    const wrongPhasor = structuredClone(json) as Record<string, unknown>;
    const wrongPhasorSnapshot = wrongPhasor.caseSnapshot as {
      payload: { phasorConvention: { amplitudeBasis: string } };
    };
    wrongPhasorSnapshot.payload.phasorConvention.amplitudeBasis = "peak";
    expect(parseCaseFile(JSON.stringify(wrongPhasor))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
    });

    for (const invalidSelection of [
      {
        methodId: "F-03",
        methodVersion: VERSION_INFO.calculationModel,
        approvalStatus: "deferred",
      },
      {
        methodId: "A-99",
        methodVersion: VERSION_INFO.calculationModel,
        approvalStatus: "approved",
      },
      {
        methodId: "B-01",
        methodVersion: "9.0.0-unknown",
        approvalStatus: "approved",
      },
      {
        methodId: "B-01",
        methodVersion: VERSION_INFO.calculationModel,
        approvalStatus: "approved_with_limitation",
      },
    ]) {
      const wrongMethod = structuredClone(json) as Record<string, unknown>;
      const wrongMethodSnapshot = wrongMethod.caseSnapshot as {
        payload: { methodSelections: unknown[] };
      };
      wrongMethodSnapshot.payload.methodSelections = [invalidSelection];
      expect(parseCaseFile(JSON.stringify(wrongMethod))).toMatchObject({
        status: "invalid_input",
        code: "invalid_input",
      });
    }

    const extraEnvelopeField = structuredClone(json) as Record<string, unknown>;
    extraEnvelopeField.legacyResult = "forbidden_uncontrolled_field";
    expect(parseCaseFile(JSON.stringify(extraEnvelopeField))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
    });

    const contradictoryQuantity = structuredClone(json) as MutableRecord;
    const contradictoryCaseSnapshot = contradictoryQuantity.caseSnapshot as MutableRecord;
    const contradictoryPayload = contradictoryCaseSnapshot.payload as MutableRecord;
    const contradictoryGeometry = contradictoryPayload.geometry as MutableRecord;
    const contradictoryGeometryPayload = contradictoryGeometry.payload as MutableRecord;
    const quantity = (contradictoryGeometryPayload.quantities as MutableRecord[])[0]!;
    quantity.valueSi = 999;
    quantity.originalRepresentation = { value: 200, unitId: "mm" };
    quantity.displayRepresentation = { value: -42, unitId: "mm" };
    quantity.uncertainty = {
      kind: "absolute",
      evaluation: "standard",
      valueSi: 999,
      dimensionId: "length",
      canonicalUnitId: "m",
      originalRepresentation: { value: 1, unitId: "mm" },
    };
    recomputeAllCaseFingerprints(contradictoryQuantity);
    expect(parseCaseFile(JSON.stringify(contradictoryQuantity))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/valueSi.*originalRepresentation/u),
    });

    const contradictoryDisplay = structuredClone(json) as MutableRecord;
    const displayCaseSnapshot = contradictoryDisplay.caseSnapshot as MutableRecord;
    const displayPayload = displayCaseSnapshot.payload as MutableRecord;
    const displayGeometry = displayPayload.geometry as MutableRecord;
    const displayGeometryPayload = displayGeometry.payload as MutableRecord;
    const displayQuantity = (displayGeometryPayload.quantities as MutableRecord[])[0]!;
    displayQuantity.displayRepresentation = { value: -42, unitId: "mm" };
    recomputeAllCaseFingerprints(contradictoryDisplay);
    expect(parseCaseFile(JSON.stringify(contradictoryDisplay))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/displayRepresentation.*valueSi/u),
    });

    const contradictoryUncertainty = structuredClone(json) as MutableRecord;
    const uncertaintyCaseSnapshot = contradictoryUncertainty.caseSnapshot as MutableRecord;
    const uncertaintyPayload = uncertaintyCaseSnapshot.payload as MutableRecord;
    const uncertaintyGeometry = uncertaintyPayload.geometry as MutableRecord;
    const uncertaintyGeometryPayload = uncertaintyGeometry.payload as MutableRecord;
    const uncertaintyQuantity = (uncertaintyGeometryPayload.quantities as MutableRecord[])[0]!;
    uncertaintyQuantity.uncertainty = {
      kind: "absolute",
      evaluation: "standard",
      valueSi: 999,
      dimensionId: "length",
      canonicalUnitId: "m",
      originalRepresentation: { value: 1, unitId: "mm" },
    };
    recomputeAllCaseFingerprints(contradictoryUncertainty);
    expect(parseCaseFile(JSON.stringify(contradictoryUncertainty))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/uncertainty\.valueSi.*original representation/u),
    });

    const uncontrolledDataQuality = structuredClone(json) as MutableRecord;
    const qualityCaseSnapshot = uncontrolledDataQuality.caseSnapshot as MutableRecord;
    const qualityPayload = qualityCaseSnapshot.payload as MutableRecord;
    const qualityGeometry = qualityPayload.geometry as MutableRecord;
    const qualityGeometryPayload = qualityGeometry.payload as MutableRecord;
    const qualityQuantity = (qualityGeometryPayload.quantities as MutableRecord[])[0]!;
    qualityQuantity.dataQuality = "legacy_uncontrolled_grade";
    recomputeAllCaseFingerprints(uncontrolledDataQuality);
    expect(parseCaseFile(JSON.stringify(uncontrolledDataQuality))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
    });

    const semanticallyWrongPowerUnit = structuredClone(json) as MutableRecord;
    const powerCaseSnapshot = semanticallyWrongPowerUnit.caseSnapshot as MutableRecord;
    const powerPayload = powerCaseSnapshot.payload as MutableRecord;
    const powerQuantity = (powerPayload.operatingConditions as MutableRecord[])[0]!;
    powerQuantity.originalRepresentation = { value: 1250, unitId: "W" };
    powerQuantity.displayRepresentation = { value: 1250, unitId: "var" };
    recomputeAllCaseFingerprints(semanticallyWrongPowerUnit);
    expect(parseCaseFile(JSON.stringify(semanticallyWrongPowerUnit))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/displayRepresentation\.unitId.*parameter semantics/u),
    });

    const semanticallyWrongPowerUncertainty = structuredClone(json) as MutableRecord;
    const powerUncertaintyCaseSnapshot =
      semanticallyWrongPowerUncertainty.caseSnapshot as MutableRecord;
    const powerUncertaintyPayload =
      powerUncertaintyCaseSnapshot.payload as MutableRecord;
    const powerUncertaintyQuantity = (
      powerUncertaintyPayload.operatingConditions as MutableRecord[]
    )[0]!;
    powerUncertaintyQuantity.uncertainty = {
      kind: "absolute",
      evaluation: "standard",
      valueSi: 1000,
      dimensionId: "power",
      canonicalUnitId: "W",
      originalRepresentation: { value: 1, unitId: "kvar" },
    };
    recomputeAllCaseFingerprints(semanticallyWrongPowerUncertainty);
    expect(
      parseCaseFile(JSON.stringify(semanticallyWrongPowerUncertainty)),
    ).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(
        /uncertainty\.originalRepresentation\.unitId.*parameter uncertainty semantics/u,
      ),
    });

    const numericDerivationId = structuredClone(json) as MutableRecord;
    const numericDerivationCaseSnapshot =
      numericDerivationId.caseSnapshot as MutableRecord;
    const numericDerivationPayload =
      numericDerivationCaseSnapshot.payload as MutableRecord;
    const numericDerivationGeometry =
      numericDerivationPayload.geometry as MutableRecord;
    const numericDerivationGeometryPayload =
      numericDerivationGeometry.payload as MutableRecord;
    const numericDerivationQuantity = (
      numericDerivationGeometryPayload.quantities as MutableRecord[]
    )[0]!;
    numericDerivationQuantity.sourceKind = "derived";
    numericDerivationQuantity.sourceRef = "method:B-01";
    numericDerivationQuantity.derivationMethodId = 42;
    recomputeAllCaseFingerprints(numericDerivationId);
    expect(parseCaseFile(JSON.stringify(numericDerivationId))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/derivationMethodId.*non-empty string/u),
    });

    const numericSourceSnapshotId = structuredClone(json) as MutableRecord;
    const numericSourceCaseSnapshot =
      numericSourceSnapshotId.caseSnapshot as MutableRecord;
    const numericSourcePayload = numericSourceCaseSnapshot.payload as MutableRecord;
    const numericSourceGeometry = numericSourcePayload.geometry as MutableRecord;
    const numericSourceGeometryPayload =
      numericSourceGeometry.payload as MutableRecord;
    const numericSourceQuantity = (
      numericSourceGeometryPayload.quantities as MutableRecord[]
    )[0]!;
    numericSourceQuantity.sourceSnapshotId = 42;
    recomputeAllCaseFingerprints(numericSourceSnapshotId);
    expect(parseCaseFile(JSON.stringify(numericSourceSnapshotId))).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
      message: expect.stringMatching(/sourceSnapshotId.*non-empty string/u),
    });

    const cyclicCandidate = structuredClone(json) as Record<string, unknown>;
    const cyclicSnapshot = cyclicCandidate.caseSnapshot as {
      payload: { solverSettings: Record<string, unknown> };
    };
    cyclicSnapshot.payload.solverSettings.self = cyclicSnapshot.payload.solverSettings;
    expect(validateCaseFileCandidate(cyclicCandidate)).toMatchObject({
      ok: false,
      code: "invalid_input",
    });
  });
});
