import { getDimensionDefinition } from "./dimensions.js";
import type { DimensionId, UnitId } from "./ids.js";
import { getUnitDefinition, type UnitDefinition } from "./registry.js";

export type UnitConversionErrorCode =
  | "non_finite_value"
  | "dimension_mismatch"
  | "ambiguous_dimension"
  | "below_absolute_zero";

export class UnitConversionError extends TypeError {
  readonly code: UnitConversionErrorCode;

  constructor(code: UnitConversionErrorCode, message: string) {
    super(message);
    this.name = "UnitConversionError";
    this.code = code;
  }
}

export function assertFiniteQuantityValue(value: number, label = "Quantity value"): void {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError("non_finite_value", `${label} must be finite; NaN and Infinity are forbidden.`);
  }
}

function assertExpectedDimension(unit: UnitDefinition, expectedDimensionId: DimensionId): void {
  if (!unit.dimensionIds.includes(expectedDimensionId)) {
    throw new UnitConversionError(
      "dimension_mismatch",
      `Unit ${unit.id} does not support dimension ${expectedDimensionId}.`,
    );
  }
}

function resolveUnitDimension(unit: UnitDefinition, expectedDimensionId?: DimensionId): DimensionId {
  if (expectedDimensionId !== undefined) {
    assertExpectedDimension(unit, expectedDimensionId);
    return expectedDimensionId;
  }
  const [onlyDimension] = unit.dimensionIds;
  if (unit.dimensionIds.length !== 1 || onlyDimension === undefined) {
    throw new UnitConversionError(
      "ambiguous_dimension",
      `Unit ${unit.id} requires an explicit semantic dimension.`,
    );
  }
  return onlyDimension;
}

function resolveCompatibleDimension(
  from: UnitDefinition,
  to: UnitDefinition,
  expectedDimensionId?: DimensionId,
): DimensionId {
  if (expectedDimensionId !== undefined) {
    assertExpectedDimension(from, expectedDimensionId);
    assertExpectedDimension(to, expectedDimensionId);
    return expectedDimensionId;
  }

  const sharedDimensions = from.dimensionIds.filter((id) => to.dimensionIds.includes(id));
  if (sharedDimensions.length === 0) {
    throw new UnitConversionError(
      "dimension_mismatch",
      `Cannot convert ${from.id} to ${to.id}; they have no shared semantic dimension.`,
    );
  }
  const [onlyDimension] = sharedDimensions;
  if (sharedDimensions.length !== 1 || onlyDimension === undefined) {
    throw new UnitConversionError(
      "ambiguous_dimension",
      `Conversion from ${from.id} to ${to.id} requires an explicit semantic dimension.`,
    );
  }
  return onlyDimension;
}

function assertPhysicalAbsoluteTemperature(valueSI: number, dimensionId: DimensionId): void {
  if (dimensionId === "absolute_temperature" && valueSI < 0) {
    throw new UnitConversionError(
      "below_absolute_zero",
      `Absolute temperature cannot be below 0 K; received ${valueSI} K.`,
    );
  }
}

export function canonicalUnitIdFor(dimensionId: DimensionId): UnitId {
  return getDimensionDefinition(dimensionId).canonicalUnitId;
}

export function toCanonicalSI(
  value: number,
  fromUnitId: UnitId,
  expectedDimensionId?: DimensionId,
): number {
  assertFiniteQuantityValue(value, `Value in ${fromUnitId}`);
  const from = getUnitDefinition(fromUnitId);
  const resolvedDimensionId = resolveUnitDimension(from, expectedDimensionId);

  const canonical = value * from.scaleToSI + from.offsetToSI;
  assertFiniteQuantityValue(canonical, `Canonical value converted from ${fromUnitId}`);
  assertPhysicalAbsoluteTemperature(canonical, resolvedDimensionId);
  return canonical;
}

export function fromCanonicalSI(
  valueSI: number,
  toUnitId: UnitId,
  expectedDimensionId?: DimensionId,
): number {
  assertFiniteQuantityValue(valueSI, "Canonical SI value");
  const to = getUnitDefinition(toUnitId);
  const resolvedDimensionId = resolveUnitDimension(to, expectedDimensionId);
  assertPhysicalAbsoluteTemperature(valueSI, resolvedDimensionId);

  const converted = (valueSI - to.offsetToSI) / to.scaleToSI;
  assertFiniteQuantityValue(converted, `Value converted to ${toUnitId}`);
  return converted;
}

export function convertUnit(
  value: number,
  fromUnitId: UnitId,
  toUnitId: UnitId,
  expectedDimensionId?: DimensionId,
): number {
  const from = getUnitDefinition(fromUnitId);
  const to = getUnitDefinition(toUnitId);
  const resolvedDimensionId = resolveCompatibleDimension(from, to, expectedDimensionId);
  const canonical = toCanonicalSI(value, fromUnitId, resolvedDimensionId);
  return fromCanonicalSI(canonical, toUnitId, resolvedDimensionId);
}
