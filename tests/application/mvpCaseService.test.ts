import { describe, expect, it } from "vitest";

import { VERSION_INFO } from "../../src/config/versions.js";
import { createScalarQuantity } from "../../src/controlled-quantity-factory.js";
import { methodId, parameterId, sourceRef } from "../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../src/registries/methodSpecificationRegistry.js";
import {
  MVP_CASE_DRAFT_KIND,
  MVP_CASE_DRAFT_SCHEMA_VERSION,
  MVP_CASE_PROVENANCE_KIND,
  MVP_RUNNABLE_METHOD_IDS,
  createMvpCaseDraft,
  editMvpCaseDraft,
  loadMvpCaseDraft,
  saveMvpCaseDraft,
  type CreateMvpCaseDraftInput,
} from "../../src/application/mvpCaseService.js";
import {
  fingerprint,
  type JsonValue,
} from "../../src/serialization/canonical-json.js";
import { parseCaseFile } from "../../src/serialization/case-file.js";

const geometryQuantities = Object.freeze([
  createScalarQuantity({
    parameterId: parameterId("coil.electrical_turn_count"),
    value: 8,
    unitId: "one",
    dimensionId: "dimensionless",
    displayUnitId: "one",
    basis: "total",
    uncertainty: { kind: "unknown" },
    provenance: {
      sourceKind: "user",
      sourceRef: sourceRef("case.input.coil.electrical_turn_count"),
      dataQuality: "user_defined",
    },
    status: "known",
    validDigits: 1,
  }),
  createScalarQuantity({
    parameterId: parameterId("conductor.axial_size"),
    value: 10,
    unitId: "mm",
    dimensionId: "length",
    displayUnitId: "mm",
    basis: "total",
    uncertainty: { kind: "unknown" },
    provenance: {
      sourceKind: "user",
      sourceRef: sourceRef("case.input.conductor.axial_size"),
      dataQuality: "user_defined",
    },
    status: "known",
    validDigits: 2,
  }),
  createScalarQuantity({
    parameterId: parameterId("coil.winding_envelope_length"),
    value: 100,
    unitId: "mm",
    dimensionId: "length",
    displayUnitId: "mm",
    basis: "total",
    uncertainty: { kind: "unknown" },
    provenance: {
      sourceKind: "user",
      sourceRef: sourceRef("case.input.coil.winding_envelope_length"),
      dataQuality: "user_defined",
    },
    status: "known",
    validDigits: 3,
  }),
]);

const operatingConditions = Object.freeze([
  createScalarQuantity({
    parameterId: parameterId("frequency"),
    value: 20,
    unitId: "kHz",
    dimensionId: "frequency",
    displayUnitId: "kHz",
    basis: "fundamental_rms",
    uncertainty: { kind: "unknown" },
    provenance: {
      sourceKind: "user",
      sourceRef: sourceRef("case.input.frequency"),
      dataQuality: "user_defined",
    },
    status: "known",
    validDigits: 2,
  }),
]);

function createInput(
  overrides: Partial<CreateMvpCaseDraftInput> = {},
): CreateMvpCaseDraftInput {
  return {
    caseId: "mvp-case-001",
    caseName: "Runnable MVP case",
    geometryMappingId: "mvp.uniform_single_layer.v1",
    geometryAssumptions: ["uniform_single_layer"],
    geometryQuantities,
    operatingConditions,
    userInputs: [],
    displayUnits: {
      "coil.electrical_turn_count": "one",
      "conductor.axial_size": "mm",
      "coil.winding_envelope_length": "mm",
      frequency: "kHz",
    },
    selectedMethodIds: ["H-01", "B-02"],
    methodInputs: [
      {
        methodId: "H-01",
        payload: {
          controlVolumeId: "coolant-circuit-1",
          heatSources: [],
          designMargin: { status: "not_requested" },
        },
      },
      {
        methodId: "B-02",
        payload: {
          electricalTurnCount: 8,
          conductorAxialSizeM: 0.01,
          windingEnvelopeLengthM: 0.1,
          geometry: {
            windingClass: "uniform_single_layer",
            envelopeDefinition: "ADR-0003_full_axial_envelope",
            identicalTurnSections: true,
            nonOverlappingAxialProjection: true,
          },
        },
      },
    ],
    ...overrides,
  };
}

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

function recomputeCaseFingerprints(caseFile: MutableRecord): void {
  const caseSnapshot = caseFile.caseSnapshot as MutableRecord;
  recomputeSnapshotIdentity(caseSnapshot);
  caseFile.contentFingerprint = fingerprint({
    kind: caseFile.kind,
    schemaVersion: caseFile.schemaVersion,
    technicalFreezeId: caseFile.technicalFreezeId,
    caseSnapshot,
  });
}

function parsedMutableCase(text: string): MutableRecord {
  return JSON.parse(text) as MutableRecord;
}

function casePayload(caseFile: MutableRecord): MutableRecord {
  return (caseFile.caseSnapshot as MutableRecord).payload as MutableRecord;
}

describe("Runnable MVP authoritative CaseSnapshot service", () => {
  it("creates a strict frozen draft and canonicalizes only method ordering", () => {
    const draft = createMvpCaseDraft(createInput());

    expect(draft.kind).toBe(MVP_CASE_DRAFT_KIND);
    expect(draft.schemaVersion).toBe(MVP_CASE_DRAFT_SCHEMA_VERSION);
    expect(draft.selectedMethodIds).toEqual(["B-02", "H-01"]);
    expect(draft.methodInputs.map((entry) => entry.methodId)).toEqual([
      "B-02",
      "H-01",
    ]);
    expect(Object.isFrozen(draft)).toBe(true);
    expect(Object.isFrozen(draft.methodInputs[0]?.payload)).toBe(true);
    expect(MVP_RUNNABLE_METHOD_IDS).toEqual([
      "B-02",
      "D-01",
      "D-03",
      "D-07",
      "H-01",
      "H-03",
    ]);
  });

  it("saves through the existing CaseFile schema and loads the same editable draft", () => {
    const draft = createMvpCaseDraft(createInput());
    const text = saveMvpCaseDraft(draft, "2026-08-15T10:00:00+08:00");
    const imported = parseCaseFile(text);

    expect(imported.status).toBe("success");
    if (imported.status === "success") {
      const payload = imported.caseFile.caseSnapshot.payload;
      expect(payload.geometry.payload.quantities).toEqual(geometryQuantities);
      expect(payload.operatingConditions).toEqual(operatingConditions);
      expect(payload.userInputs).toEqual([]);
      expect(payload.methodSelections).toEqual([
        {
          methodId: "B-02",
          methodVersion: VERSION_INFO.calculationModel,
          approvalStatus: "approved",
        },
        {
          methodId: "H-01",
          methodVersion: VERSION_INFO.calculationModel,
          approvalStatus: "approved",
        },
      ]);
      expect(payload.provenance).toEqual([
        {
          kind: MVP_CASE_PROVENANCE_KIND,
          schemaVersion: MVP_CASE_DRAFT_SCHEMA_VERSION,
          selectedMethodIds: ["B-02", "H-01"],
          methodInputs: draft.methodInputs,
        },
      ]);
      expect(payload.materials).toEqual([]);
      expect(payload.solverSettings).toEqual({});
    }

    const loaded = loadMvpCaseDraft(text);
    expect(loaded.status).toBe("success");
    if (loaded.status === "success") {
      expect(loaded.draft).toEqual(draft);
      expect(Object.isFrozen(loaded.draft)).toBe(true);
      expect(loaded.caseFile.caseSnapshot.payload.caseId).toBe(draft.caseId);
    }
  });

  it("edits immutably, keeps caseId/version fixed, and requires atomic method state", () => {
    const original = createMvpCaseDraft(createInput());
    const edited = editMvpCaseDraft(original, {
      caseName: "Edited Runnable MVP case",
      selectedMethodIds: ["B-02"],
      methodInputs: [original.methodInputs[0]!],
    });

    expect(edited.caseId).toBe(original.caseId);
    expect(edited.caseName).toBe("Edited Runnable MVP case");
    expect(edited.selectedMethodIds).toEqual(["B-02"]);
    expect(original.caseName).toBe("Runnable MVP case");
    expect(() =>
      editMvpCaseDraft(original, {
        selectedMethodIds: ["B-02"],
      }),
    ).toThrow(/methodInputs must account/u);
    expect(() =>
      editMvpCaseDraft(
        original,
        { caseId: "replacement-id" } as unknown as Parameters<
          typeof editMvpCaseDraft
        >[1],
      ),
    ).toThrow(/unsupported field/u);
  });

  it("rejects non-allowlisted, duplicate, unmatched, and non-JSON method state", () => {
    expect(() =>
      createMvpCaseDraft(
        createInput({
          selectedMethodIds: ["A-01"] as unknown as readonly "B-02"[],
          methodInputs: [
            {
              methodId: "A-01",
              payload: {},
            } as unknown as CreateMvpCaseDraftInput["methodInputs"][number],
          ],
        }),
      ),
    ).toThrow(/allowlisted/u);

    expect(() =>
      createMvpCaseDraft(
        createInput({
          selectedMethodIds: ["B-02", "B-02"],
          methodInputs: [createInput().methodInputs[1]!],
        }),
      ),
    ).toThrow(/duplicates/u);

    expect(() =>
      createMvpCaseDraft(
        createInput({
          selectedMethodIds: ["B-02"],
          methodInputs: [],
        }),
      ),
    ).toThrow(/account for every selected/u);

    const accessorPayload: Record<string, JsonValue> = {};
    Object.defineProperty(accessorPayload, "value", {
      enumerable: true,
      get: () => 1,
    });
    expect(() =>
      createMvpCaseDraft(
        createInput({
          selectedMethodIds: ["B-02"],
          methodInputs: [{ methodId: "B-02", payload: accessorPayload }],
        }),
      ),
    ).toThrow(/accessors/u);
  });

  it("rejects ordinary cases and byte-level tampering without throwing", () => {
    const text = saveMvpCaseDraft(
      createMvpCaseDraft(createInput()),
      "2026-08-15T10:00:00Z",
    );
    const ordinary = parsedMutableCase(text);
    casePayload(ordinary).provenance = [];
    recomputeCaseFingerprints(ordinary);
    expect(loadMvpCaseDraft(JSON.stringify(ordinary))).toMatchObject({
      status: "invalid_input",
      code: "not_mvp_case",
    });

    const tampered = parsedMutableCase(text);
    casePayload(tampered).caseName = "tampered without fingerprints";
    expect(loadMvpCaseDraft(JSON.stringify(tampered))).toMatchObject({
      status: "invalid_input",
      code: "fingerprint_mismatch",
    });

    const loadUntrusted = loadMvpCaseDraft as unknown as (
      value: unknown,
    ) => ReturnType<typeof loadMvpCaseDraft>;
    expect(() => loadUntrusted(null)).not.toThrow();
    expect(loadUntrusted(null)).toMatchObject({
      status: "invalid_input",
      code: "invalid_input",
    });
  });

  it("rejects an unknown marker version after a valid CaseFile re-fingerprint", () => {
    const candidate = parsedMutableCase(
      saveMvpCaseDraft(
        createMvpCaseDraft(createInput()),
        "2026-08-15T10:00:00Z",
      ),
    );
    const payload = casePayload(candidate);
    const marker = (payload.provenance as MutableRecord[])[0]!;
    marker.schemaVersion = "9.0.0";
    recomputeCaseFingerprints(candidate);

    expect(loadMvpCaseDraft(JSON.stringify(candidate))).toMatchObject({
      status: "insufficient_data",
      code: "unsupported_mvp_schema_version",
    });
  });

  it("rejects a re-fingerprinted selection/marker mismatch", () => {
    const candidate = parsedMutableCase(
      saveMvpCaseDraft(
        createMvpCaseDraft(createInput({
          selectedMethodIds: ["B-02"],
          methodInputs: [createInput().methodInputs[1]!],
        })),
        "2026-08-15T10:00:00Z",
      ),
    );
    const payload = casePayload(candidate);
    payload.methodSelections = [
      ...(payload.methodSelections as unknown[]),
      {
        methodId: "D-01",
        methodVersion: VERSION_INFO.calculationModel,
        approvalStatus: "approved",
      },
    ];
    recomputeCaseFingerprints(candidate);

    expect(parseCaseFile(JSON.stringify(candidate)).status).toBe("success");
    expect(loadMvpCaseDraft(JSON.stringify(candidate))).toMatchObject({
      status: "invalid_input",
      code: "mvp_case_state_mismatch",
    });
  });

  it("rejects re-fingerprinted method version or approval drift", () => {
    for (const mutation of [
      { methodVersion: "forged-version" },
      { approvalStatus: "approved_with_limitation" },
    ]) {
      const candidate = parsedMutableCase(
        saveMvpCaseDraft(
          createMvpCaseDraft(createInput({
            selectedMethodIds: ["B-02"],
            methodInputs: [createInput().methodInputs[1]!],
          })),
          "2026-08-15T10:00:00Z",
        ),
      );
      const selection = (casePayload(candidate).methodSelections as MutableRecord[])[0]!;
      Object.assign(selection, mutation);
      recomputeCaseFingerprints(candidate);

      expect(loadMvpCaseDraft(JSON.stringify(candidate))).toMatchObject({
        status: "invalid_input",
      });
    }
  });

  it("rejects a re-fingerprinted non-canonical method order", () => {
    const candidate = parsedMutableCase(
      saveMvpCaseDraft(
        createMvpCaseDraft(createInput()),
        "2026-08-15T10:00:00Z",
      ),
    );
    const payload = casePayload(candidate);
    payload.methodSelections = [
      ...(payload.methodSelections as unknown[]),
    ].reverse();
    const marker = (payload.provenance as MutableRecord[])[0]!;
    marker.selectedMethodIds = [
      ...(marker.selectedMethodIds as unknown[]),
    ].reverse();
    marker.methodInputs = [
      ...(marker.methodInputs as unknown[]),
    ].reverse();
    recomputeCaseFingerprints(candidate);

    expect(parseCaseFile(JSON.stringify(candidate)).status).toBe("success");
    expect(loadMvpCaseDraft(JSON.stringify(candidate))).toMatchObject({
      status: "invalid_input",
      code: "mvp_case_state_mismatch",
    });
  });

  it("does not alter frozen runtime-executable registry flags", () => {
    for (const id of MVP_RUNNABLE_METHOD_IDS) {
      expect(
        METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId(id)),
      ).toBe(false);
    }
  });
});
