import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import type { CaseSnapshotPayload, ImmutableSnapshot } from "../domain/snapshot.js";
import {
  canonicalStringify,
  deepFreeze,
  fingerprint,
  readableStableStringify,
  type ContentFingerprint,
} from "./canonical-json.js";
import { validateCaseFileCandidate } from "./case-schema.js";
import { CASE_FILE_KIND } from "./case-constants.js";

export { CASE_FILE_KIND } from "./case-constants.js";

export const MAX_CASE_FILE_CHARACTERS = 32 * 1024 * 1024;

export interface CaseFile {
  readonly kind: typeof CASE_FILE_KIND;
  readonly schemaVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly contentFingerprint: ContentFingerprint;
  readonly caseSnapshot: ImmutableSnapshot<"case", CaseSnapshotPayload>;
}

export type CaseImportFailureCode =
  | "invalid_json"
  | "invalid_input"
  | "case_file_too_large"
  | "unsupported_schema_version"
  | "technical_freeze_mismatch"
  | "version_mismatch"
  | "fingerprint_mismatch";

export type CaseImportResult =
  | {
      readonly status: "success";
      readonly caseFile: CaseFile;
    }
  | {
      readonly status: "invalid_input" | "insufficient_data";
      readonly code: CaseImportFailureCode;
      readonly message: string;
    };

function payloadForFingerprint(caseFile: Omit<CaseFile, "contentFingerprint">): unknown {
  return {
    kind: caseFile.kind,
    schemaVersion: caseFile.schemaVersion,
    technicalFreezeId: caseFile.technicalFreezeId,
    caseSnapshot: caseFile.caseSnapshot,
  };
}

export function createCaseFile(
  caseSnapshot: ImmutableSnapshot<"case", CaseSnapshotPayload>,
): CaseFile {
  const envelope = {
    kind: CASE_FILE_KIND,
    schemaVersion: VERSION_INFO.caseSchema,
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    caseSnapshot,
  } as const;
  const candidate = deepFreeze({
    ...envelope,
    contentFingerprint: fingerprint(payloadForFingerprint(envelope)),
  }) as CaseFile;
  const validation = validateCaseFileCandidate(candidate);
  if (!validation.ok) {
    throw new TypeError(`Cannot create case file: ${validation.message}`);
  }
  return validation.caseFile;
}

export function serializeCaseFile(caseFile: CaseFile, readable = true): string {
  const validation = validateCaseFileCandidate(caseFile);
  if (!validation.ok) {
    throw new TypeError(`Cannot serialize invalid case file: ${validation.message}`);
  }
  return readable ? readableStableStringify(caseFile) : canonicalStringify(caseFile);
}

export function parseCaseFile(text: string): CaseImportResult {
  if (typeof text !== "string") {
    return {
      status: "invalid_input",
      code: "invalid_input",
      message: "The selected case must be provided as JSON text.",
    };
  }
  if (text.length > MAX_CASE_FILE_CHARACTERS) {
    return {
      status: "invalid_input",
      code: "case_file_too_large",
      message: `The selected case exceeds the ${String(MAX_CASE_FILE_CHARACTERS)}-character safety limit.`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      status: "invalid_input",
      code: "invalid_json",
      message: "The selected file is not valid JSON.",
    };
  }

  const validation = validateCaseFileCandidate(parsed);
  if (!validation.ok) {
    return {
      status:
        validation.code === "unsupported_schema_version" ||
        validation.code === "technical_freeze_mismatch" ||
        validation.code === "version_mismatch"
          ? "insufficient_data"
          : "invalid_input",
      code: validation.code,
      message: validation.message,
    };
  }

  return {
    status: "success",
    caseFile: deepFreeze(validation.caseFile) as CaseFile,
  };
}
