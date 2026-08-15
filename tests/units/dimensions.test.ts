import { describe, expect, it } from "vitest";

import {
  DIMENSION_DEFINITIONS,
  DIMENSION_IDS,
  SI_BASE_DIMENSION_ORDER,
  addDimensionVectors,
  dimensionVectorsEqual,
  getDimensionDefinition,
  scaleDimensionVector,
  subtractDimensionVectors,
} from "../../src/units/index.js";

describe("controlled SI dimensions", () => {
  it("uses the frozen seven-base-dimension vector order", () => {
    expect(SI_BASE_DIMENSION_ORDER).toEqual([
      "mass",
      "length",
      "time",
      "electric_current",
      "thermodynamic_temperature",
      "amount_of_substance",
      "luminous_intensity",
    ]);
    expect(Object.isFrozen(SI_BASE_DIMENSION_ORDER)).toBe(true);

    for (const id of DIMENSION_IDS) {
      const definition = getDimensionDefinition(id);
      expect(definition.vector).toHaveLength(7);
      expect(definition.vector.every(Number.isFinite)).toBe(true);
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.vector)).toBe(true);
    }
  });

  it("keeps semantic IDs distinct even when exponent vectors are equal", () => {
    const absolute = DIMENSION_DEFINITIONS.absolute_temperature;
    const difference = DIMENSION_DEFINITIONS.temperature_difference;

    expect(absolute.id).not.toBe(difference.id);
    expect(dimensionVectorsEqual(absolute.vector, difference.vector)).toBe(true);
    expect(absolute.canonicalUnitId).toBe("K");
    expect(difference.canonicalUnitId).toBe("K");

    expect(
      dimensionVectorsEqual(
        DIMENSION_DEFINITIONS.kinematic_viscosity.vector,
        DIMENSION_DEFINITIONS.thermal_diffusivity.vector,
      ),
    ).toBe(true);
    expect(DIMENSION_DEFINITIONS.kinematic_viscosity.id).not.toBe(
      DIMENSION_DEFINITIONS.thermal_diffusivity.id,
    );
  });

  it("supports dimensional algebra for formula-level tests", () => {
    const resistanceTimesCurrent = addDimensionVectors(
      DIMENSION_DEFINITIONS.electrical_resistance.vector,
      DIMENSION_DEFINITIONS.electric_current.vector,
    );
    expect(dimensionVectorsEqual(resistanceTimesCurrent, DIMENSION_DEFINITIONS.voltage.vector)).toBe(
      true,
    );

    const energyOverTime = subtractDimensionVectors(
      DIMENSION_DEFINITIONS.energy.vector,
      DIMENSION_DEFINITIONS.time.vector,
    );
    expect(dimensionVectorsEqual(energyOverTime, DIMENSION_DEFINITIONS.power.vector)).toBe(true);

    expect(
      dimensionVectorsEqual(
        scaleDimensionVector(DIMENSION_DEFINITIONS.length.vector, 2),
        DIMENSION_DEFINITIONS.area.vector,
      ),
    ).toBe(true);
  });
});
