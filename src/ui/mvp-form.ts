import type {
  UiMvpFailure,
  UiMvpJsonValue,
  UiMvpMethodInput,
  UiMvpRunnableMethodDefinition,
  UiMvpRunnableMethodId,
  UiMvpWorkspaceInput,
} from "./ui-model.js";

export type UiMvpRawFieldValue = string | boolean;
export type UiMvpFieldState = Readonly<Record<string, UiMvpRawFieldValue>>;
export type UiMvpFormState = Readonly<Partial<Record<UiMvpRunnableMethodId, UiMvpFieldState>>>;

export type UiMvpWorkspaceBuildResult =
  | { readonly status: "success"; readonly workspace: UiMvpWorkspaceInput }
  | { readonly status: "invalid_input"; readonly failure: UiMvpFailure };

type UiMvpWorkspaceFailureResult = Extract<
  UiMvpWorkspaceBuildResult,
  { readonly status: "invalid_input" }
>;

function emptyFields(method: UiMvpRunnableMethodDefinition): UiMvpFieldState {
  return Object.fromEntries(
    method.fields.map((field) => [field.id, field.kind === "boolean" ? false : ""]),
  );
}

export function createEmptyMvpFormState(
  methods: readonly UiMvpRunnableMethodDefinition[],
): UiMvpFormState {
  return Object.fromEntries(methods.map((method) => [method.methodId, emptyFields(method)]));
}

function failure(message: string, action: string): UiMvpWorkspaceFailureResult {
  return {
    status: "invalid_input",
    failure: { code: "MVP.ui_input_invalid", message, action },
  };
}

function isWorkspaceFailure(
  value: Readonly<Record<string, UiMvpJsonValue>> | UiMvpWorkspaceFailureResult,
): value is UiMvpWorkspaceFailureResult {
  return "status" in value && value.status === "invalid_input" && "failure" in value;
}

function parseNumberList(
  methodId: UiMvpRunnableMethodId,
  label: string,
  rawValue: string,
): readonly number[] | null | UiMvpWorkspaceFailureResult {
  const normalized = rawValue.trim();
  if (normalized.length === 0) return null;
  if (normalized === "[]") return [];
  const tokens = rawValue.split(",").map((token) => token.trim());
  if (tokens.some((token) => token.length === 0)) {
    return failure(
      `${methodId} · ${label} contains an empty comma-separated item.`,
      "Enter finite numbers separated by commas, or leave the field blank for an explicit unknown value.",
    );
  }
  const values = tokens.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    return failure(
      `${methodId} · ${label} must contain finite comma-separated numbers.`,
      "Correct the list, or leave the field blank for an explicit unknown value.",
    );
  }
  return values;
}

function methodPayload(
  definition: UiMvpRunnableMethodDefinition,
  state: UiMvpFieldState,
): Readonly<Record<string, UiMvpJsonValue>> | UiMvpWorkspaceFailureResult {
  const payload: Record<string, UiMvpJsonValue> = {};
  for (const field of definition.fields) {
    const rawValue = state[field.id] ?? (field.kind === "boolean" ? false : "");
    if (field.kind === "boolean") {
      payload[field.id] = rawValue === true;
      continue;
    }
    const textValue = typeof rawValue === "string" ? rawValue : "";
    if (field.kind === "number") {
      if (textValue.trim().length === 0) continue;
      const value = Number(textValue);
      if (!Number.isFinite(value)) {
        return failure(
          `${definition.methodId} · ${field.label} must be a finite number.`,
          "Correct the numeric input and calculate again.",
        );
      }
      payload[field.id] = value;
      continue;
    }
    if (field.kind === "number_list_optional") {
      const values = parseNumberList(definition.methodId, field.label, textValue);
      if (typeof values === "object" && values !== null && "status" in values) return values;
      payload[field.id] = values;
      continue;
    }
    payload[field.id] = textValue;
  }
  return payload;
}

export function buildUiMvpWorkspaceInput(
  caseId: string,
  caseName: string,
  selectedMethodIds: readonly UiMvpRunnableMethodId[],
  formState: UiMvpFormState,
  methods: readonly UiMvpRunnableMethodDefinition[],
): UiMvpWorkspaceBuildResult {
  const byId = new Map(methods.map((method) => [method.methodId, method]));
  const methodInputs: UiMvpMethodInput[] = [];
  for (const methodId of selectedMethodIds) {
    const definition = byId.get(methodId);
    if (definition === undefined) {
      return failure(`${methodId} is not present in the controlled MVP catalogue.`, "Reload the application.");
    }
    const payload = methodPayload(definition, formState[methodId] ?? emptyFields(definition));
    if (isWorkspaceFailure(payload)) return payload;
    methodInputs.push({ methodId, payload });
  }
  return {
    status: "success",
    workspace: { caseId, caseName, selectedMethodIds, methodInputs },
  };
}

function restoredValue(value: UiMvpJsonValue | undefined, kind: string): UiMvpRawFieldValue {
  if (kind === "boolean") return value === true;
  if (kind === "number_list_optional") {
    return Array.isArray(value)
      ? value.length === 0 ? "[]" : value.map(String).join(", ")
      : "";
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function restoreMvpFormState(
  methods: readonly UiMvpRunnableMethodDefinition[],
  inputs: readonly UiMvpMethodInput[],
): UiMvpFormState {
  const inputById = new Map(inputs.map((input) => [input.methodId, input]));
  return Object.fromEntries(methods.map((method) => {
    const payload = inputById.get(method.methodId)?.payload ?? {};
    const fields = Object.fromEntries(
      method.fields.map((field) => [field.id, restoredValue(payload[field.id], field.kind)]),
    );
    return [method.methodId, fields];
  }));
}
