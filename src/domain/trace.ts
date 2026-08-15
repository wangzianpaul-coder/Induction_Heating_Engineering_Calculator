import {
  deepFreeze,
  normalizeJson,
  type JsonValue,
} from "../serialization/canonical-json.js";
import type { SourceRef, TraceNodeId } from "./ids.js";
import { sourceRef, traceNodeId } from "./ids.js";

export const TRACE_NODE_KINDS = Object.freeze([
  "input_snapshot",
  "method",
  "material",
  "equation",
  "substitution",
  "source",
  "assumption",
  "applicability_check",
  "warning",
  "solver_residual",
  "result",
] as const);
export type TraceNodeKind = (typeof TRACE_NODE_KINDS)[number];

export interface TraceNode<TKind extends TraceNodeKind = TraceNodeKind> {
  readonly nodeId: TraceNodeId;
  readonly kind: TKind;
  readonly label: string;
  readonly dependsOn: readonly TraceNodeId[];
  readonly payload: Readonly<Record<string, JsonValue>>;
  readonly sourceRefs: readonly SourceRef[];
}

export interface TraceNodeInput<TKind extends TraceNodeKind = TraceNodeKind> {
  readonly nodeId: string;
  readonly kind: TKind;
  readonly label: string;
  readonly dependsOn?: readonly string[];
  readonly payload: Readonly<Record<string, JsonValue>>;
  readonly sourceRefs?: readonly string[];
}

export interface CalculationTrace {
  readonly schemaVersion: "1.0.0-alpha.1";
  readonly nodes: readonly TraceNode[];
  readonly inputNodeIds: readonly TraceNodeId[];
  readonly resultNodeId: TraceNodeId;
  readonly topologicalOrder: readonly TraceNodeId[];
}

export type TraceValidationIssueCode =
  | "empty_trace"
  | "invalid_node"
  | "duplicate_node_id"
  | "duplicate_dependency"
  | "missing_dependency"
  | "self_dependency"
  | "invalid_input_root"
  | "invalid_result_sink"
  | "cycle"
  | "disconnected_from_input"
  | "disconnected_from_result";

export interface TraceValidationIssue {
  readonly code: TraceValidationIssueCode;
  readonly nodeId?: string;
  readonly dependencyId?: string;
  readonly message: string;
}

export type TraceValidationResult =
  | {
      readonly valid: true;
      readonly inputNodeIds: readonly TraceNodeId[];
      readonly resultNodeId: TraceNodeId;
      readonly topologicalOrder: readonly TraceNodeId[];
    }
  | {
      readonly valid: false;
      readonly issues: readonly TraceValidationIssue[];
    };

export class TraceValidationError extends TypeError {
  public readonly issues: readonly TraceValidationIssue[];

  public constructor(issues: readonly TraceValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "TraceValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const controlled = [...expected].sort();
  return (
    actual.length === controlled.length &&
    actual.every((key, index) => key === controlled[index])
  );
}

function isTraceNodeKind(value: unknown): value is TraceNodeKind {
  return (
    typeof value === "string" &&
    (TRACE_NODE_KINDS as readonly string[]).includes(value)
  );
}

function assertNonBlank(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-blank string.`);
  }
}

function normalizePayload(
  payload: Readonly<Record<string, JsonValue>>,
): Readonly<Record<string, JsonValue>> {
  const normalized = normalizeJson(payload);
  if (!isRecord(normalized)) {
    throw new TypeError("Trace node payload must be a JSON object.");
  }
  return normalized as Readonly<Record<string, JsonValue>>;
}

export function createTraceNode<const TKind extends TraceNodeKind>(
  input: TraceNodeInput<TKind>,
): TraceNode<TKind> {
  if (!isTraceNodeKind(input.kind)) {
    throw new TypeError(`Unknown trace node kind: ${String(input.kind)}`);
  }
  assertNonBlank(input.label, "trace node label");

  const node = {
    nodeId: traceNodeId(input.nodeId),
    kind: input.kind,
    label: input.label,
    dependsOn: (input.dependsOn ?? []).map((id) => traceNodeId(id)),
    payload: normalizePayload(input.payload),
    sourceRefs: (input.sourceRefs ?? []).map((ref) => sourceRef(ref)),
  } satisfies TraceNode<TKind>;

  return deepFreeze(normalizeJson(node)) as unknown as TraceNode<TKind>;
}

function addIssue(
  issues: TraceValidationIssue[],
  issue: TraceValidationIssue,
): void {
  issues.push(Object.freeze(issue));
}

export function validateTraceDag(nodes: readonly TraceNode[]): TraceValidationResult {
  if (nodes.length === 0) {
    return {
      valid: false,
      issues: Object.freeze([
        {
          code: "empty_trace",
          message: "A calculation trace must contain at least one input and one result node.",
        },
      ]),
    };
  }

  const issues: TraceValidationIssue[] = [];
  const nodeById = new Map<string, TraceNode>();

  for (const node of nodes) {
    if (
      !isRecord(node) ||
      !hasExactKeys(node, [
        "nodeId",
        "kind",
        "label",
        "dependsOn",
        "payload",
        "sourceRefs",
      ]) ||
      typeof node.nodeId !== "string" ||
      !isTraceNodeKind(node.kind) ||
      typeof node.label !== "string" ||
      node.label.trim().length === 0 ||
      !Array.isArray(node.dependsOn) ||
      !node.dependsOn.every((dependency) => typeof dependency === "string") ||
      !Array.isArray(node.sourceRefs) ||
      !node.sourceRefs.every((ref) => typeof ref === "string") ||
      !isRecord(node.payload)
    ) {
      addIssue(issues, {
        code: "invalid_node",
        message: "Every trace node must match the controlled, JSON-serializable node schema.",
      });
      continue;
    }

    try {
      traceNodeId(node.nodeId);
      for (const ref of node.sourceRefs) {
        sourceRef(ref);
      }
      normalizeJson(node);
    } catch (error) {
      addIssue(issues, {
        code: "invalid_node",
        nodeId: node.nodeId,
        message: `Trace node ${node.nodeId} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    if (nodeById.has(node.nodeId)) {
      addIssue(issues, {
        code: "duplicate_node_id",
        nodeId: node.nodeId,
        message: `Trace node ID ${node.nodeId} is duplicated.`,
      });
      continue;
    }
    nodeById.set(node.nodeId, node);
  }

  const dependents = new Map<string, Set<string>>();
  for (const id of nodeById.keys()) {
    dependents.set(id, new Set<string>());
  }

  for (const node of nodeById.values()) {
    const seenDependencies = new Set<string>();
    for (const dependencyId of node.dependsOn) {
      if (seenDependencies.has(dependencyId)) {
        addIssue(issues, {
          code: "duplicate_dependency",
          nodeId: node.nodeId,
          dependencyId,
          message: `Trace node ${node.nodeId} repeats dependency ${dependencyId}.`,
        });
        continue;
      }
      seenDependencies.add(dependencyId);

      if (dependencyId === node.nodeId) {
        addIssue(issues, {
          code: "self_dependency",
          nodeId: node.nodeId,
          dependencyId,
          message: `Trace node ${node.nodeId} cannot depend on itself.`,
        });
        continue;
      }

      const dependency = nodeById.get(dependencyId);
      if (dependency === undefined) {
        addIssue(issues, {
          code: "missing_dependency",
          nodeId: node.nodeId,
          dependencyId,
          message: `Trace node ${node.nodeId} references missing dependency ${dependencyId}.`,
        });
        continue;
      }

      dependents.get(dependencyId)?.add(node.nodeId);
    }
  }

  const inputNodes = [...nodeById.values()].filter(
    (node) => node.kind === "input_snapshot",
  );
  const resultNodes = [...nodeById.values()].filter((node) => node.kind === "result");

  if (inputNodes.length === 0) {
    addIssue(issues, {
      code: "invalid_input_root",
      message: "A calculation trace must contain at least one input_snapshot root.",
    });
  }
  for (const node of inputNodes) {
    if (node.dependsOn.length !== 0) {
      addIssue(issues, {
        code: "invalid_input_root",
        nodeId: node.nodeId,
        message: `Input snapshot node ${node.nodeId} must not have dependencies.`,
      });
    }
  }
  for (const node of nodeById.values()) {
    if (node.kind !== "input_snapshot" && node.dependsOn.length === 0) {
      addIssue(issues, {
        code: "invalid_input_root",
        nodeId: node.nodeId,
        message: `Non-input trace node ${node.nodeId} must have at least one dependency.`,
      });
    }
  }

  if (resultNodes.length !== 1) {
    addIssue(issues, {
      code: "invalid_result_sink",
      message: `A single-result CalculationTrace requires exactly one result node; found ${String(resultNodes.length)}.`,
    });
  }
  for (const node of resultNodes) {
    if ((dependents.get(node.nodeId)?.size ?? 0) !== 0) {
      addIssue(issues, {
        code: "invalid_result_sink",
        nodeId: node.nodeId,
        message: `Result node ${node.nodeId} must be the terminal sink.`,
      });
    }
  }

  const indegree = new Map<string, number>();
  for (const node of nodeById.values()) {
    const existingDependencies = new Set(
      node.dependsOn.filter((id) => id !== node.nodeId && nodeById.has(id)),
    );
    indegree.set(node.nodeId, existingDependencies.size);
  }

  const ready = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort();
  const topologicalOrder: string[] = [];

  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) {
      break;
    }
    topologicalOrder.push(id);
    for (const dependentId of [...(dependents.get(id) ?? [])].sort()) {
      const nextDegree = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, nextDegree);
      if (nextDegree === 0) {
        ready.push(dependentId);
        ready.sort();
      }
    }
  }

  if (topologicalOrder.length !== nodeById.size) {
    addIssue(issues, {
      code: "cycle",
      message: "The calculation trace contains a dependency cycle.",
    });
  }

  const reachableFromInput = new Set<string>();
  const forwardQueue: string[] = inputNodes.map((node) => node.nodeId);
  while (forwardQueue.length > 0) {
    const id = forwardQueue.shift();
    if (id === undefined || reachableFromInput.has(id)) {
      continue;
    }
    reachableFromInput.add(id);
    forwardQueue.push(...(dependents.get(id) ?? []));
  }
  for (const id of nodeById.keys()) {
    if (!reachableFromInput.has(id)) {
      addIssue(issues, {
        code: "disconnected_from_input",
        nodeId: id,
        message: `Trace node ${id} is not reachable from an input snapshot.`,
      });
    }
  }

  const reachesResult = new Set<string>();
  const reverseQueue: string[] = resultNodes.map((node) => node.nodeId);
  while (reverseQueue.length > 0) {
    const id = reverseQueue.shift();
    if (id === undefined || reachesResult.has(id)) {
      continue;
    }
    reachesResult.add(id);
    const node = nodeById.get(id);
    if (node !== undefined) {
      reverseQueue.push(...node.dependsOn);
    }
  }
  for (const id of nodeById.keys()) {
    if (!reachesResult.has(id)) {
      addIssue(issues, {
        code: "disconnected_from_result",
        nodeId: id,
        message: `Trace node ${id} does not contribute to the result sink.`,
      });
    }
  }

  if (issues.length > 0 || inputNodes.length === 0 || resultNodes.length !== 1) {
    return {
      valid: false,
      issues: deepFreeze(issues) as readonly TraceValidationIssue[],
    };
  }

  const resultNode = resultNodes[0];
  if (resultNode === undefined) {
    throw new TypeError("Trace result-node validation reached an impossible state.");
  }

  return deepFreeze({
    valid: true,
    inputNodeIds: inputNodes.map((node) => node.nodeId),
    resultNodeId: resultNode.nodeId,
    topologicalOrder: topologicalOrder.map((id) => traceNodeId(id)),
  }) as TraceValidationResult;
}

export function createCalculationTrace(input: {
  readonly nodes: readonly TraceNodeInput[];
}): CalculationTrace {
  const nodes = input.nodes.map((node) => createTraceNode(node));
  const validation = validateTraceDag(nodes);
  if (!validation.valid) {
    throw new TraceValidationError(validation.issues);
  }

  const trace = {
    schemaVersion: "1.0.0-alpha.1",
    nodes,
    inputNodeIds: validation.inputNodeIds,
    resultNodeId: validation.resultNodeId,
    topologicalOrder: validation.topologicalOrder,
  } satisfies CalculationTrace;

  return deepFreeze(normalizeJson(trace)) as unknown as CalculationTrace;
}

export function assertCalculationTrace(value: unknown): asserts value is CalculationTrace {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "nodes",
      "inputNodeIds",
      "resultNodeId",
      "topologicalOrder",
    ]) ||
    !Array.isArray(value.nodes)
  ) {
    throw new TypeError("CalculationTrace must be a JSON object with a nodes array.");
  }
  if (value.schemaVersion !== "1.0.0-alpha.1") {
    throw new TypeError(`Unsupported CalculationTrace schema: ${String(value.schemaVersion)}`);
  }

  const validation = validateTraceDag(value.nodes as unknown as readonly TraceNode[]);
  if (!validation.valid) {
    throw new TraceValidationError(validation.issues);
  }

  if (
    value.resultNodeId !== validation.resultNodeId ||
    !Array.isArray(value.inputNodeIds) ||
    !Array.isArray(value.topologicalOrder) ||
    JSON.stringify(value.inputNodeIds) !== JSON.stringify(validation.inputNodeIds) ||
    JSON.stringify(value.topologicalOrder) !== JSON.stringify(validation.topologicalOrder)
  ) {
    throw new TypeError("CalculationTrace derived DAG indexes do not match its nodes.");
  }
  normalizeJson(value);
}
