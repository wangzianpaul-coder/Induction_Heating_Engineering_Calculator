declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

export type ParameterId = Brand<string, "ParameterId">;
export type MethodId = Brand<string, "MethodId">;
export type WarningId = Brand<string, "WarningId">;
export type TraceNodeId = Brand<string, "TraceNodeId">;
export type SnapshotId = Brand<string, "SnapshotId">;
export type SourceRef = Brand<string, "SourceRef">;
export type ValidationId = Brand<string, "ValidationId">;
export type TopologyId = Brand<string, "TopologyId">;
export type PortId = Brand<string, "PortId">;

const METHOD_ID_PATTERN = /^[A-J]-\d{2}$/u;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;
const CONTENT_ADDRESSED_SNAPSHOT_ID_PATTERN =
  /^(case|geometry|material):[0-9a-f]{64}$/u;

export type ContentAddressedSnapshotKind = "case" | "geometry" | "material";

function assertStableId(value: string, label: string): string {
  if (!STABLE_ID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a stable non-empty machine identifier.`);
  }
  return value;
}

export function parameterId(value: string): ParameterId {
  return assertStableId(value, "parameter_id") as ParameterId;
}

export function methodId(value: string): MethodId {
  if (!METHOD_ID_PATTERN.test(value)) {
    throw new TypeError(`Invalid controlled method_id: ${value}`);
  }
  return value as MethodId;
}

export function warningId(value: string): WarningId {
  return assertStableId(value, "warning_id") as WarningId;
}

export function traceNodeId(value: string): TraceNodeId {
  return assertStableId(value, "trace_node_id") as TraceNodeId;
}

export function snapshotId(value: string): SnapshotId {
  return assertStableId(value, "snapshot_id") as SnapshotId;
}

export function contentAddressedSnapshotId(
  value: string,
  expectedKind?: ContentAddressedSnapshotKind,
): SnapshotId {
  const match = CONTENT_ADDRESSED_SNAPSHOT_ID_PATTERN.exec(value);
  if (match === null || (expectedKind !== undefined && match[1] !== expectedKind)) {
    throw new TypeError(
      `snapshot_id must be ${expectedKind ?? "case|geometry|material"}:<64 lowercase SHA-256 hex>.`,
    );
  }
  return value as SnapshotId;
}

export function isContentAddressedSnapshotId(
  value: unknown,
  expectedKind?: ContentAddressedSnapshotKind,
): value is SnapshotId {
  if (typeof value !== "string") {
    return false;
  }
  const match = CONTENT_ADDRESSED_SNAPSHOT_ID_PATTERN.exec(value);
  return (
    match !== null &&
    (expectedKind === undefined || match[1] === expectedKind)
  );
}

export function sourceRef(value: string): SourceRef {
  return assertStableId(value, "source_ref") as SourceRef;
}

export function validationId(value: string): ValidationId {
  return assertStableId(value, "validation_id") as ValidationId;
}

export function topologyId(value: string): TopologyId {
  return assertStableId(value, "topology_id") as TopologyId;
}

export function portId(value: string): PortId {
  return assertStableId(value, "port_id") as PortId;
}
