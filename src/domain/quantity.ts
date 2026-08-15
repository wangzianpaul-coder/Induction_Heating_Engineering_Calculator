import { QUANTITY_BASES, type QuantityBasis } from "./electrical.js";
import {
  contentAddressedSnapshotId,
  methodId,
  parameterId,
  sourceRef,
  type MethodId,
  type ParameterId,
  type SnapshotId,
  type SourceRef,
} from "./ids.js";
import {
  DATA_QUALITIES,
  assertControlledValue,
  type ApprovalStatus,
  type DataQuality,
} from "./status.js";
import {
  canonicalUnitIdFor,
  convertUnit,
  getUnitDefinition,
  toCanonicalSI,
  type DimensionId,
  type UnitId,
} from "../units/index.js";

export const QUANTITY_SOURCE_KINDS = Object.freeze([
  "user",
  "derived",
  "material",
  "measurement",
  "fem",
  "approved_default",
] as const);
export type QuantitySourceKind = (typeof QUANTITY_SOURCE_KINDS)[number];

export type ScalarQuantityStatus = "known" | "estimated" | "measured";
export type UnavailableQuantityStatus = "missing" | "not_applicable";
export type UncertaintyEvaluation = "standard" | "expanded";

export interface QuantityRepresentation {
  readonly value: number;
  readonly unitId: UnitId;
}

export interface UnknownQuantityUncertainty {
  readonly kind: "unknown";
}

export interface AbsoluteQuantityUncertainty {
  readonly kind: "absolute";
  readonly evaluation: UncertaintyEvaluation;
  readonly valueSi: number;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly originalRepresentation: QuantityRepresentation;
  readonly coverageFactor?: number;
  readonly confidenceLevel?: number;
}

export interface RelativeQuantityUncertainty {
  readonly kind: "relative";
  readonly evaluation: UncertaintyEvaluation;
  /** Non-negative fraction; 0.02 means 2 %. */
  readonly fraction: number;
  readonly coverageFactor?: number;
  readonly confidenceLevel?: number;
}

export type QuantityUncertainty =
  | UnknownQuantityUncertainty
  | AbsoluteQuantityUncertainty
  | RelativeQuantityUncertainty;

export type QuantityUncertaintyInput =
  | UnknownQuantityUncertainty
  | {
      readonly kind: "absolute";
      readonly evaluation: UncertaintyEvaluation;
      readonly value: number;
      readonly unitId: UnitId;
      readonly coverageFactor?: number;
      readonly confidenceLevel?: number;
    }
  | {
      readonly kind: "relative";
      readonly evaluation: UncertaintyEvaluation;
      readonly fraction: number;
      readonly coverageFactor?: number;
      readonly confidenceLevel?: number;
    };

/** Provenance fields are kept flat on Quantity for snapshot compatibility. */
export interface QuantityProvenance {
  readonly sourceKind: QuantitySourceKind;
  readonly sourceRef: SourceRef;
  readonly dataQuality: DataQuality;
  readonly derivationMethodId?: MethodId;
  readonly sourceSnapshotId?: SnapshotId;
  readonly note?: string;
}

export interface ScalarQuantity extends QuantityProvenance {
  readonly kind: "scalar";
  readonly parameterId: ParameterId;
  readonly valueSi: number;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly originalRepresentation: QuantityRepresentation;
  readonly displayRepresentation: QuantityRepresentation;
  readonly basis: QuantityBasis;
  readonly uncertainty: QuantityUncertainty;
  readonly status: ScalarQuantityStatus;
  readonly validDigits: number;
  readonly stateKey?: string;
}

/**
 * Missing and not-applicable values are represented without a numeric field.
 * They therefore cannot leak a placeholder zero, NaN, or last iterate into a
 * formula node.
 */
export interface UnavailableQuantity extends QuantityProvenance {
  readonly kind: "unavailable";
  readonly parameterId: ParameterId;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly basis: QuantityBasis;
  readonly status: UnavailableQuantityStatus;
  readonly reason: string;
  readonly stateKey?: string;
}

export type Quantity = ScalarQuantity | UnavailableQuantity;

export interface CreateScalarQuantityInput {
  readonly parameterId: ParameterId;
  readonly value: number;
  readonly unitId: UnitId;
  readonly dimensionId: DimensionId;
  readonly displayUnitId?: UnitId;
  readonly basis: QuantityBasis;
  readonly uncertainty: QuantityUncertaintyInput;
  readonly provenance: QuantityProvenance;
  readonly status: ScalarQuantityStatus;
  readonly validDigits: number;
  readonly stateKey?: string;
}

export interface CreateUnavailableQuantityInput {
  readonly parameterId: ParameterId;
  readonly dimensionId: DimensionId;
  readonly basis: QuantityBasis;
  readonly provenance: QuantityProvenance;
  readonly status: UnavailableQuantityStatus;
  readonly reason: string;
  readonly stateKey?: string;
}

/** Minimal read-only projections keep the domain constructor registry-agnostic. */
export interface QuantityParameterControl {
  readonly parameterId: ParameterId;
  readonly dimensionId: DimensionId;
  readonly canonicalUnitId: UnitId;
  readonly allowedRepresentationUnitIds: readonly UnitId[];
}

export interface QuantityMethodControl {
  readonly methodId: MethodId;
  readonly approvalStatus: ApprovalStatus;
}

export interface QuantityControlLookup {
  readonly findParameter: (
    id: ParameterId,
  ) => QuantityParameterControl | undefined;
  readonly findMethod: (id: MethodId) => QuantityMethodControl | undefined;
}

export interface ControlledQuantityFactory {
  readonly createScalarQuantity: (
    input: CreateScalarQuantityInput,
  ) => ScalarQuantity;
  readonly createUnavailableQuantity: (
    input: CreateUnavailableQuantityInput,
  ) => UnavailableQuantity;
}

const sourceKinds: ReadonlySet<string> = new Set(QUANTITY_SOURCE_KINDS);
const quantityBases: ReadonlySet<string> = new Set(QUANTITY_BASES);
const scalarStatuses: ReadonlySet<string> = new Set(["known", "estimated", "measured"]);
const unavailableStatuses: ReadonlySet<string> = new Set(["missing", "not_applicable"]);

function assertNonEmptyString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function assertBasis(value: QuantityBasis): void {
  if (!quantityBases.has(value)) {
    throw new TypeError(`Unknown controlled quantity basis: ${String(value)}`);
  }
}

function validateEvaluationMetadata(input: {
  readonly evaluation: UncertaintyEvaluation;
  readonly coverageFactor?: number;
  readonly confidenceLevel?: number;
}): void {
  if (input.evaluation !== "standard" && input.evaluation !== "expanded") {
    throw new TypeError(
      "Uncertainty evaluation must be standard or expanded.",
    );
  }
  if (input.coverageFactor !== undefined) {
    if (!Number.isFinite(input.coverageFactor) || input.coverageFactor <= 0) {
      throw new TypeError("Uncertainty coverageFactor must be positive and finite.");
    }
  }
  if (input.evaluation === "expanded" && input.coverageFactor === undefined) {
    throw new TypeError("Expanded uncertainty requires an explicit positive coverageFactor.");
  }
  if (input.confidenceLevel !== undefined) {
    if (!Number.isFinite(input.confidenceLevel) || input.confidenceLevel <= 0 || input.confidenceLevel > 1) {
      throw new TypeError("Uncertainty confidenceLevel must be finite in the interval (0, 1].");
    }
  }
}

function uncertaintyMetadata(input: {
  readonly coverageFactor?: number;
  readonly confidenceLevel?: number;
}): { readonly coverageFactor?: number; readonly confidenceLevel?: number } {
  return {
    ...(input.coverageFactor === undefined ? {} : { coverageFactor: input.coverageFactor }),
    ...(input.confidenceLevel === undefined ? {} : { confidenceLevel: input.confidenceLevel }),
  };
}

function representation(value: number, unitId: UnitId): QuantityRepresentation {
  return Object.freeze({ value, unitId });
}

function createUncertainty(
  input: QuantityUncertaintyInput,
  parameter: QuantityParameterControl,
): QuantityUncertainty {
  if (input.kind === "unknown") {
    return Object.freeze({ kind: "unknown" });
  }

  validateEvaluationMetadata(input);
  if (input.kind === "relative") {
    if (!Number.isFinite(input.fraction) || input.fraction < 0) {
      throw new TypeError("Relative uncertainty must be a non-negative finite fraction.");
    }
    return Object.freeze({
      kind: "relative",
      evaluation: input.evaluation,
      fraction: input.fraction,
      ...uncertaintyMetadata(input),
    });
  }

  if (!Number.isFinite(input.value) || input.value < 0) {
    throw new TypeError("Absolute uncertainty must be a non-negative finite value.");
  }

  const uncertaintyDimensionId =
    parameter.dimensionId === "absolute_temperature"
      ? "temperature_difference"
      : parameter.dimensionId;
  const allowedByParameter =
    input.unitId === canonicalUnitIdFor(uncertaintyDimensionId) ||
    (parameter.dimensionId === "absolute_temperature"
      ? input.unitId === "delta_degC" &&
        parameter.allowedRepresentationUnitIds.includes("degC")
      : parameter.allowedRepresentationUnitIds.includes(input.unitId));
  if (!allowedByParameter) {
    throw new TypeError(
      `Absolute uncertainty unit ${input.unitId} is not allowed for frozen parameter ${parameter.parameterId}.`,
    );
  }
  const valueSi = toCanonicalSI(input.value, input.unitId, uncertaintyDimensionId);
  return Object.freeze({
    kind: "absolute",
    evaluation: input.evaluation,
    valueSi,
    dimensionId: uncertaintyDimensionId,
    canonicalUnitId: canonicalUnitIdFor(uncertaintyDimensionId),
    originalRepresentation: representation(input.value, input.unitId),
    ...uncertaintyMetadata(input),
  });
}

function cloneProvenance(
  provenance: QuantityProvenance,
  controls: QuantityControlLookup,
): Readonly<QuantityProvenance> {
  if (!sourceKinds.has(provenance.sourceKind)) {
    throw new TypeError(`Unknown controlled quantity source kind: ${String(provenance.sourceKind)}`);
  }
  assertNonEmptyString(provenance.sourceRef, "Quantity provenance sourceRef");
  const normalizedSourceRef = sourceRef(provenance.sourceRef);
  assertControlledValue("quantity.dataQuality", DATA_QUALITIES, provenance.dataQuality);
  if (provenance.note !== undefined) {
    assertNonEmptyString(provenance.note, "Quantity provenance note");
  }

  let normalizedDerivationMethodId: MethodId | undefined;
  if (provenance.derivationMethodId !== undefined) {
    if (provenance.sourceKind !== "derived") {
      throw new TypeError("Only a derived quantity may declare derivationMethodId.");
    }
    assertNonEmptyString(
      provenance.derivationMethodId,
      "Quantity provenance derivationMethodId",
    );
    normalizedDerivationMethodId = methodId(provenance.derivationMethodId);
    const method = controls.findMethod(normalizedDerivationMethodId);
    if (
      method === undefined ||
      (method.approvalStatus !== "approved" &&
        method.approvalStatus !== "approved_with_limitation")
    ) {
      throw new TypeError(
        `Quantity derivation method ${normalizedDerivationMethodId} is not in the v1 approved method allowlist.`,
      );
    }
  } else if (provenance.sourceKind === "derived") {
    throw new TypeError("A derived quantity requires an approved derivationMethodId.");
  }

  let normalizedSourceSnapshotId: SnapshotId | undefined;
  if (provenance.sourceSnapshotId !== undefined) {
    assertNonEmptyString(
      provenance.sourceSnapshotId,
      "Quantity provenance sourceSnapshotId",
    );
    normalizedSourceSnapshotId = contentAddressedSnapshotId(
      provenance.sourceSnapshotId,
    );
  }

  return Object.freeze({
    sourceKind: provenance.sourceKind,
    sourceRef: normalizedSourceRef,
    dataQuality: provenance.dataQuality,
    ...(normalizedDerivationMethodId === undefined
      ? {}
      : { derivationMethodId: normalizedDerivationMethodId }),
    ...(normalizedSourceSnapshotId === undefined
      ? {}
      : { sourceSnapshotId: normalizedSourceSnapshotId }),
    ...(provenance.note === undefined ? {} : { note: provenance.note }),
  });
}

function validateParameter(
  input: {
    readonly parameterId: ParameterId;
    readonly dimensionId: DimensionId;
    readonly basis: QuantityBasis;
    readonly stateKey?: string;
  },
  controls: QuantityControlLookup,
): QuantityParameterControl {
  assertNonEmptyString(input.parameterId, "Quantity parameterId");
  const normalizedParameterId = parameterId(input.parameterId);
  const definition = controls.findParameter(normalizedParameterId);
  if (definition === undefined) {
    throw new TypeError(
      `Quantity parameterId ${normalizedParameterId} is absent from the frozen parameter registry.`,
    );
  }
  const expectedCanonicalUnitId = canonicalUnitIdFor(input.dimensionId);
  if (
    definition.dimensionId !== input.dimensionId ||
    definition.canonicalUnitId !== expectedCanonicalUnitId
  ) {
    throw new TypeError(
      `Quantity ${normalizedParameterId} dimension/canonical unit does not match the frozen parameter definition.`,
    );
  }
  assertBasis(input.basis);
  if (input.stateKey !== undefined) {
    assertNonEmptyString(input.stateKey, "Quantity stateKey");
  }
  return definition;
}

function assertAllowedRepresentationUnit(
  definition: QuantityParameterControl,
  unitId: UnitId,
  label: string,
  allowCanonicalSi = false,
): void {
  if (
    !(allowCanonicalSi && unitId === definition.canonicalUnitId) &&
    !definition.allowedRepresentationUnitIds.includes(unitId)
  ) {
    throw new TypeError(
      `${label} ${unitId} is not allowed for frozen parameter ${definition.parameterId}.`,
    );
  }
}

/**
 * Build constructors against an explicit controlled lookup. The production
 * binding lives outside the domain module, so this file never imports runtime
 * registry singletons and cannot create a domain-to-registry cycle.
 */
export function createControlledQuantityFactory(
  controls: QuantityControlLookup,
): ControlledQuantityFactory {
  const createScalarQuantity = (input: CreateScalarQuantityInput): ScalarQuantity => {
    const definition = validateParameter(input, controls);
    if (!scalarStatuses.has(input.status)) {
      throw new TypeError(`Scalar quantity cannot have status ${String(input.status)}.`);
    }
    if (!Number.isInteger(input.validDigits) || input.validDigits < 1 || input.validDigits > 17) {
      throw new TypeError("Quantity validDigits must be an integer from 1 through 17.");
    }

    // The calculation boundary always accepts canonical SI. Display units are
    // additionally restricted by parameter semantics (for example W/var/VA).
    assertAllowedRepresentationUnit(
      definition,
      input.unitId,
      "Quantity input unit",
      true,
    );
    const sourceUnit = getUnitDefinition(input.unitId);
    if (!sourceUnit.dimensionIds.includes(input.dimensionId)) {
      throw new TypeError(
        `Unit ${input.unitId} is not permitted for quantity dimension ${input.dimensionId}.`,
      );
    }
    const valueSi = toCanonicalSI(input.value, input.unitId, input.dimensionId);
    const displayUnitId = input.displayUnitId ?? input.unitId;
    assertAllowedRepresentationUnit(definition, displayUnitId, "Quantity display unit");
    const displayValue = convertUnit(input.value, input.unitId, displayUnitId, input.dimensionId);
    const provenance = cloneProvenance(input.provenance, controls);

    return Object.freeze({
      kind: "scalar",
      parameterId: definition.parameterId,
      valueSi,
      dimensionId: definition.dimensionId,
      canonicalUnitId: definition.canonicalUnitId,
      originalRepresentation: representation(input.value, input.unitId),
      displayRepresentation: representation(displayValue, displayUnitId),
      basis: input.basis,
      uncertainty: createUncertainty(input.uncertainty, definition),
      status: input.status,
      validDigits: input.validDigits,
      ...provenance,
      ...(input.stateKey === undefined ? {} : { stateKey: input.stateKey }),
    });
  };

  const createUnavailableQuantity = (
    input: CreateUnavailableQuantityInput,
  ): UnavailableQuantity => {
    const definition = validateParameter(input, controls);
    if (!unavailableStatuses.has(input.status)) {
      throw new TypeError(`Unavailable quantity cannot have status ${String(input.status)}.`);
    }
    assertNonEmptyString(input.reason, "Unavailable quantity reason");
    const provenance = cloneProvenance(input.provenance, controls);

    return Object.freeze({
      kind: "unavailable",
      parameterId: definition.parameterId,
      dimensionId: definition.dimensionId,
      canonicalUnitId: definition.canonicalUnitId,
      basis: input.basis,
      status: input.status,
      reason: input.reason,
      ...provenance,
      ...(input.stateKey === undefined ? {} : { stateKey: input.stateKey }),
    });
  };

  return Object.freeze({ createScalarQuantity, createUnavailableQuantity });
}
