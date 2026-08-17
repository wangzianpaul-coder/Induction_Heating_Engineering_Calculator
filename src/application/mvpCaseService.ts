import { VERSION_INFO } from "../config/versions.js";
import { PHASOR_CONVENTION } from "../domain/electrical.js";
import { methodId } from "../domain/ids.js";
import type { Quantity } from "../domain/quantity.js";
import {
  createCaseSnapshot,
  createGeometrySnapshot,
} from "../domain/snapshot.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";
import {
  createCaseFile,
  parseCaseFile,
  serializeCaseFile,
  type CaseFile,
  type CaseImportFailureCode,
} from "../serialization/case-file.js";
import {
  deepFreeze,
  normalizeJson,
  type JsonValue,
} from "../serialization/canonical-json.js";

/**
 * Application-owned MVP case metadata. This marker is embedded in the
 * authoritative CaseSnapshot provenance collection; it is not a second case
 * envelope or an alternative interchange format.
 */
export const MVP_CASE_DRAFT_KIND = "ih_ec_runnable_mvp_case_draft" as const;
export const MVP_CASE_DRAFT_SCHEMA_VERSION = "1.0.0" as const;
export const MVP_CASE_PROVENANCE_KIND =
  "ih_ec_runnable_mvp_case_provenance" as const;

/**
 * The allowlist names isolated, reviewed method implementations that an MVP
 * calculation adapter may consume. Selection in a case remains a request and
 * deliberately does not alter the frozen runtime-executable registry flags.
 */
export const MVP_RUNNABLE_METHOD_IDS = Object.freeze([
  "B-02",
  "B-03",
  "D-01",
  "D-03",
  "D-04",
  "D-07",
  "F-01",
  "H-01",
  "H-03",
  "J-03",
] as const);

export type MvpRunnableMethodId = (typeof MVP_RUNNABLE_METHOD_IDS)[number];

export type MvpMethodInputPayload = Readonly<Record<string, JsonValue>>;

export interface MvpMethodInput {
  readonly methodId: MvpRunnableMethodId;
  /** Exact method-owned JSON input. The case service never evaluates it. */
  readonly payload: MvpMethodInputPayload;
}

export interface CreateMvpCaseDraftInput {
  readonly caseId: string;
  readonly caseName: string;
  readonly geometryMappingId: string;
  readonly geometryAssumptions: readonly string[];
  readonly geometryQuantities: readonly Quantity[];
  readonly operatingConditions: readonly Quantity[];
  readonly userInputs: readonly Quantity[];
  readonly displayUnits: Readonly<Record<string, string>>;
  readonly selectedMethodIds: readonly MvpRunnableMethodId[];
  readonly methodInputs: readonly MvpMethodInput[];
}

export interface MvpCaseDraft extends CreateMvpCaseDraftInput {
  readonly kind: typeof MVP_CASE_DRAFT_KIND;
  readonly schemaVersion: typeof MVP_CASE_DRAFT_SCHEMA_VERSION;
}

export type MvpCaseDraftPatch = Partial<
  Omit<CreateMvpCaseDraftInput, "caseId">
>;

export type MvpCaseLoadFailureCode =
  | CaseImportFailureCode
  | "not_mvp_case"
  | "invalid_mvp_marker"
  | "unsupported_mvp_schema_version"
  | "mvp_case_state_mismatch";

export type MvpCaseLoadResult =
  | {
      readonly status: "success";
      readonly draft: MvpCaseDraft;
      readonly caseFile: CaseFile;
    }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: MvpCaseLoadFailureCode;
      readonly message: string;
    };

interface MvpCaseProvenanceMarker {
  readonly kind: typeof MVP_CASE_PROVENANCE_KIND;
  readonly schemaVersion: typeof MVP_CASE_DRAFT_SCHEMA_VERSION;
  readonly selectedMethodIds: readonly MvpRunnableMethodId[];
  readonly methodInputs: readonly MvpMethodInput[];
}

type UnknownRecord = Record<string, unknown>;

const MVP_METHOD_ID_SET: ReadonlySet<string> = new Set(
  MVP_RUNNABLE_METHOD_IDS,
);
const MVP_METHOD_ORDER = new Map<string, number>(
  MVP_RUNNABLE_METHOD_IDS.map((id, index) => [id, index]),
);
const VALIDATION_TIMESTAMP = "2000-01-01T00:00:00.000Z";
const MVP_TOPOLOGY_REASON =
  "No controlled electrical topology is selected by this Runnable MVP case.";

const CREATE_INPUT_KEYS = Object.freeze([
  "caseId",
  "caseName",
  "geometryMappingId",
  "geometryAssumptions",
  "geometryQuantities",
  "operatingConditions",
  "userInputs",
  "displayUnits",
  "selectedMethodIds",
  "methodInputs",
] as const);

const DRAFT_KEYS = Object.freeze([
  "kind",
  "schemaVersion",
  ...CREATE_INPUT_KEYS,
] as const);

const PATCH_KEYS: ReadonlySet<string> = new Set(
  CREATE_INPUT_KEYS.filter((key) => key !== "caseId"),
);

const MARKER_KEYS = Object.freeze([
  "kind",
  "schemaVersion",
  "selectedMethodIds",
  "methodInputs",
] as const);

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: UnknownRecord,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const controlled = [...expected].sort();
  return (
    actual.length === controlled.length &&
    actual.every((key, index) => key === controlled[index])
  );
}

function assertNonBlank(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-blank string.`);
  }
}

function assertStringArray(
  value: unknown,
  field: string,
): asserts value is readonly string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new TypeError(`${field} must be a dense JSON string array.`);
  }
}

function isMvpRunnableMethodId(value: unknown): value is MvpRunnableMethodId {
  return typeof value === "string" && MVP_METHOD_ID_SET.has(value);
}

function normalizeMethodState(input: {
  readonly selectedMethodIds: unknown;
  readonly methodInputs: unknown;
}): {
  readonly selectedMethodIds: readonly MvpRunnableMethodId[];
  readonly methodInputs: readonly MvpMethodInput[];
} {
  if (
    !Array.isArray(input.selectedMethodIds) ||
    !input.selectedMethodIds.every(isMvpRunnableMethodId)
  ) {
    throw new TypeError(
      "selectedMethodIds must contain only Runnable MVP allowlisted method IDs.",
    );
  }
  if (new Set(input.selectedMethodIds).size !== input.selectedMethodIds.length) {
    throw new TypeError("selectedMethodIds must not contain duplicates.");
  }
  if (!Array.isArray(input.methodInputs)) {
    throw new TypeError("methodInputs must be a dense JSON array.");
  }

  const inputsByMethod = new Map<MvpRunnableMethodId, MvpMethodInput>();
  for (const [index, candidate] of input.methodInputs.entries()) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["methodId", "payload"]) ||
      !isMvpRunnableMethodId(candidate.methodId) ||
      !isRecord(candidate.payload)
    ) {
      throw new TypeError(
        `methodInputs[${String(index)}] must contain exactly an allowlisted methodId and a JSON-object payload.`,
      );
    }
    if (inputsByMethod.has(candidate.methodId)) {
      throw new TypeError(
        `methodInputs contains duplicate methodId ${candidate.methodId}.`,
      );
    }
    inputsByMethod.set(candidate.methodId, {
      methodId: candidate.methodId,
      payload: candidate.payload as MvpMethodInputPayload,
    });
  }

  const selected = [...input.selectedMethodIds].sort(
    (left, right) =>
      (MVP_METHOD_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (MVP_METHOD_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  const selectedSet = new Set<MvpRunnableMethodId>(selected);
  if (
    selected.length !== inputsByMethod.size ||
    selected.some((id) => !inputsByMethod.has(id)) ||
    [...inputsByMethod.keys()].some((id) => !selectedSet.has(id))
  ) {
    throw new TypeError(
      "methodInputs must account for every selected Runnable MVP method exactly once and contain no unselected method.",
    );
  }

  return {
    selectedMethodIds: Object.freeze(selected),
    methodInputs: Object.freeze(
      selected.map((methodId) => inputsByMethod.get(methodId)!),
    ),
  };
}

function normalizeDraftCandidate(
  candidate: unknown,
  includesEnvelope: boolean,
): MvpCaseDraft {
  const normalized = normalizeJson(candidate);
  if (
    !isRecord(normalized) ||
    !hasExactKeys(normalized, includesEnvelope ? DRAFT_KEYS : CREATE_INPUT_KEYS)
  ) {
    throw new TypeError(
      includesEnvelope
        ? "MvpCaseDraft fields do not match the controlled schema."
        : "CreateMvpCaseDraftInput fields do not match the controlled schema.",
    );
  }
  if (includesEnvelope) {
    if (
      normalized.kind !== MVP_CASE_DRAFT_KIND ||
      normalized.schemaVersion !== MVP_CASE_DRAFT_SCHEMA_VERSION
    ) {
      throw new TypeError("MvpCaseDraft kind or schemaVersion is unsupported.");
    }
  }

  assertNonBlank(normalized.caseId, "caseId");
  assertNonBlank(normalized.caseName, "caseName");
  assertNonBlank(normalized.geometryMappingId, "geometryMappingId");
  assertStringArray(normalized.geometryAssumptions, "geometryAssumptions");
  if (
    !Array.isArray(normalized.geometryQuantities) ||
    !Array.isArray(normalized.operatingConditions) ||
    !Array.isArray(normalized.userInputs) ||
    !isRecord(normalized.displayUnits)
  ) {
    throw new TypeError(
      "MvpCaseDraft quantity collections and displayUnits must be JSON arrays/maps.",
    );
  }

  const methodState = normalizeMethodState({
    selectedMethodIds: normalized.selectedMethodIds,
    methodInputs: normalized.methodInputs,
  });
  const draft = {
    kind: MVP_CASE_DRAFT_KIND,
    schemaVersion: MVP_CASE_DRAFT_SCHEMA_VERSION,
    caseId: normalized.caseId,
    caseName: normalized.caseName,
    geometryMappingId: normalized.geometryMappingId,
    geometryAssumptions: normalized.geometryAssumptions,
    geometryQuantities: normalized.geometryQuantities as unknown as readonly Quantity[],
    operatingConditions: normalized.operatingConditions as unknown as readonly Quantity[],
    userInputs: normalized.userInputs as unknown as readonly Quantity[],
    displayUnits: normalized.displayUnits as Readonly<Record<string, string>>,
    selectedMethodIds: methodState.selectedMethodIds,
    methodInputs: methodState.methodInputs,
  } satisfies MvpCaseDraft;

  return deepFreeze(draft) as MvpCaseDraft;
}

function markerFor(draft: MvpCaseDraft): MvpCaseProvenanceMarker {
  return deepFreeze({
    kind: MVP_CASE_PROVENANCE_KIND,
    schemaVersion: MVP_CASE_DRAFT_SCHEMA_VERSION,
    selectedMethodIds: draft.selectedMethodIds,
    methodInputs: draft.methodInputs,
  }) as MvpCaseProvenanceMarker;
}

function materializeCaseFile(
  draft: MvpCaseDraft,
  savedAt: string | Date,
): CaseFile {
  const geometry = createGeometrySnapshot(
    {
      geometrySchemaVersion: VERSION_INFO.geometrySchema,
      geometryMappingId: draft.geometryMappingId,
      quantities: draft.geometryQuantities,
      assumptions: draft.geometryAssumptions,
    },
    savedAt,
  );
  const methodSelections = draft.selectedMethodIds.map((id) => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
    if (
      specification.approvalStatus !== "approved" &&
      specification.approvalStatus !== "approved_with_limitation"
    ) {
      throw new TypeError(
        `Runnable MVP method ${id} is not in the frozen approved allowlist.`,
      );
    }
    return {
      methodId: specification.methodId,
      methodVersion: specification.methodVersion,
      approvalStatus: specification.approvalStatus,
    } as const;
  });
  const caseSnapshot = createCaseSnapshot(
    {
      caseId: draft.caseId,
      caseName: draft.caseName,
      geometry,
      materials: [],
      operatingConditions: draft.operatingConditions,
      topology: {
        status: "insufficient_data",
        reason: MVP_TOPOLOGY_REASON,
      },
      phasorConvention: PHASOR_CONVENTION,
      methodSelections,
      measurementOverrides: [],
      femReferenceIds: [],
      attachmentHashes: [],
      userInputs: draft.userInputs,
      displayUnits: draft.displayUnits,
      explicitOverrides: [],
      warningAcknowledgements: [],
      solverSettings: {},
      provenance: [markerFor(draft) as unknown as JsonValue],
      migration: {
        sourceSchemaVersion: VERSION_INFO.caseSchema,
        appliedMigrationIds: [],
      },
    },
    savedAt,
  );
  return createCaseFile(caseSnapshot);
}

function assertCaseProjectionIsValid(draft: MvpCaseDraft): void {
  materializeCaseFile(draft, VALIDATION_TIMESTAMP);
}

export function createMvpCaseDraft(
  input: CreateMvpCaseDraftInput,
): MvpCaseDraft {
  const draft = normalizeDraftCandidate(input, false);
  assertCaseProjectionIsValid(draft);
  return draft;
}

export function editMvpCaseDraft(
  draft: MvpCaseDraft,
  patch: MvpCaseDraftPatch,
): MvpCaseDraft {
  const current = normalizeDraftCandidate(draft, true);
  const normalizedPatch = normalizeJson(patch);
  if (
    !isRecord(normalizedPatch) ||
    Object.keys(normalizedPatch).some((key) => !PATCH_KEYS.has(key))
  ) {
    throw new TypeError(
      "MvpCaseDraftPatch contains an unsupported field; caseId and version fields are immutable.",
    );
  }
  const next = normalizeDraftCandidate(
    { ...current, ...normalizedPatch },
    true,
  );
  assertCaseProjectionIsValid(next);
  return next;
}

export function saveMvpCaseDraft(
  draft: MvpCaseDraft,
  savedAt: string | Date,
  readable = true,
): string {
  const normalized = normalizeDraftCandidate(draft, true);
  return serializeCaseFile(
    materializeCaseFile(normalized, savedAt),
    readable,
  );
}

function invalidLoad(
  code: MvpCaseLoadFailureCode,
  message: string,
  status: "invalid_input" | "insufficient_data" = "invalid_input",
): MvpCaseLoadResult {
  return { status, code, message };
}

function hasExactEmptyCollections(caseFile: CaseFile): boolean {
  const payload = caseFile.caseSnapshot.payload;
  return (
    payload.materials.length === 0 &&
    payload.measurementOverrides.length === 0 &&
    payload.femReferenceIds.length === 0 &&
    payload.attachmentHashes.length === 0 &&
    payload.explicitOverrides.length === 0 &&
    payload.warningAcknowledgements.length === 0 &&
    Object.keys(payload.solverSettings).length === 0
  );
}

function topologyMatchesMvp(caseFile: CaseFile): boolean {
  const topology = caseFile.caseSnapshot.payload.topology;
  return (
    isRecord(topology) &&
    hasExactKeys(topology, ["status", "reason"]) &&
    topology.status === "insufficient_data" &&
    topology.reason === MVP_TOPOLOGY_REASON
  );
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Load a Runnable MVP draft only after the canonical current-version CaseFile
 * boundary succeeds. This function never treats an ordinary CaseFile as an MVP
 * draft and does not migrate unknown MVP marker versions.
 */
export function loadMvpCaseDraft(text: string): MvpCaseLoadResult {
  const imported = parseCaseFile(text);
  if (imported.status !== "success") {
    return imported;
  }
  try {
    const caseFile = imported.caseFile;
    const payload = caseFile.caseSnapshot.payload;
    const markerCandidates = payload.provenance.filter(
      (entry): entry is Readonly<Record<string, JsonValue>> =>
        isRecord(entry) && entry.kind === MVP_CASE_PROVENANCE_KIND,
    );
    if (markerCandidates.length === 0) {
      return invalidLoad(
        "not_mvp_case",
        "The case is valid, but it has no Runnable MVP provenance marker.",
      );
    }
    if (markerCandidates.length !== 1 || payload.provenance.length !== 1) {
      return invalidLoad(
        "invalid_mvp_marker",
        "A Runnable MVP case must contain exactly one provenance marker and no ambiguous provenance entries.",
      );
    }
    const marker = markerCandidates[0]!;
    if (!hasExactKeys(marker, MARKER_KEYS)) {
      return invalidLoad(
        "invalid_mvp_marker",
        "The Runnable MVP provenance marker fields do not match the controlled schema.",
      );
    }
    if (marker.schemaVersion !== MVP_CASE_DRAFT_SCHEMA_VERSION) {
      return invalidLoad(
        "unsupported_mvp_schema_version",
        `No Runnable MVP migration is registered from marker version ${String(marker.schemaVersion)}.`,
        "insufficient_data",
      );
    }
    if (!hasExactEmptyCollections(caseFile) || !topologyMatchesMvp(caseFile)) {
      return invalidLoad(
        "mvp_case_state_mismatch",
        "The case contains state outside the controlled Runnable MVP projection.",
      );
    }

    const selectedFromCase = payload.methodSelections.map(
      (selection) => selection.methodId,
    );
    const selectionsMatchFrozenSpecifications = payload.methodSelections.every(
      (selection) => {
        if (!isMvpRunnableMethodId(selection.methodId)) return false;
        const controlled = METHOD_SPECIFICATION_REGISTRY.get(methodId(selection.methodId));
        return (
          selection.methodVersion === controlled.methodVersion &&
          selection.approvalStatus === controlled.approvalStatus
        );
      },
    );
    if (
      !selectionsMatchFrozenSpecifications ||
      !Array.isArray(marker.selectedMethodIds) ||
      !arraysEqual(
        selectedFromCase,
        marker.selectedMethodIds.filter(
          (id): id is string => typeof id === "string",
        ),
      ) ||
      marker.selectedMethodIds.length !== selectedFromCase.length
    ) {
      return invalidLoad(
        "mvp_case_state_mismatch",
        "The Runnable MVP method ID, version, approval, or marker selection does not match the frozen authoritative CaseSnapshot selection.",
      );
    }

    let draft: MvpCaseDraft;
    try {
      draft = normalizeDraftCandidate(
        {
          kind: MVP_CASE_DRAFT_KIND,
          schemaVersion: MVP_CASE_DRAFT_SCHEMA_VERSION,
          caseId: payload.caseId,
          caseName: payload.caseName,
          geometryMappingId: payload.geometry.payload.geometryMappingId,
          geometryAssumptions: payload.geometry.payload.assumptions,
          geometryQuantities: payload.geometry.payload.quantities,
          operatingConditions: payload.operatingConditions,
          userInputs: payload.userInputs,
          displayUnits: payload.displayUnits,
          selectedMethodIds: marker.selectedMethodIds,
          methodInputs: marker.methodInputs,
        },
        true,
      );
      assertCaseProjectionIsValid(draft);
    } catch {
      return invalidLoad(
        "invalid_mvp_marker",
        "The Runnable MVP marker cannot be reconstructed safely.",
      );
    }
    const projected = materializeCaseFile(
      draft,
      caseFile.caseSnapshot.createdAt,
    );
    if (
      projected.caseSnapshot.snapshotId !== caseFile.caseSnapshot.snapshotId
    ) {
      return invalidLoad(
        "mvp_case_state_mismatch",
        "The authoritative CaseSnapshot does not exactly match the controlled Runnable MVP projection.",
      );
    }
    return { status: "success", draft, caseFile };
  } catch {
    return invalidLoad(
      "invalid_mvp_marker",
      "The Runnable MVP case cannot be inspected safely.",
    );
  }
}
