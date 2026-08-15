import { describe, expect, it } from "vitest";

import {
  createScalarQuantity,
  createUnavailableQuantity,
} from "../../src/controlled-quantity-factory.js";
import {
  methodId,
  parameterId,
  snapshotId,
  sourceRef,
} from "../../src/domain/ids.js";
import type { CreateScalarQuantityInput } from "../../src/domain/quantity.js";

function lengthInput(): CreateScalarQuantityInput {
  return {
    parameterId: parameterId("coil.inner_diameter"),
    value: 25,
    unitId: "mm",
    dimensionId: "length",
    displayUnitId: "cm",
    basis: "local",
    uncertainty: {
      kind: "absolute",
      evaluation: "standard",
      value: 0.1,
      unitId: "mm",
    },
    provenance: {
      sourceKind: "measurement",
      sourceRef: sourceRef("drawing:coil-001"),
      dataQuality: "measured",
    },
    status: "measured",
    validDigits: 4,
    stateKey: "geometry:approved",
  };
}

describe("ScalarQuantity", () => {
  it("stores canonical SI while preserving original and display representations", () => {
    const quantity = createScalarQuantity(lengthInput());

    expect(quantity).toMatchObject({
      kind: "scalar",
      parameterId: "coil.inner_diameter",
      valueSi: 0.025,
      dimensionId: "length",
      canonicalUnitId: "m",
      originalRepresentation: { value: 25, unitId: "mm" },
      displayRepresentation: { value: 2.5, unitId: "cm" },
      basis: "local",
      status: "measured",
      validDigits: 4,
      sourceKind: "measurement",
      sourceRef: "drawing:coil-001",
      dataQuality: "measured",
    });
    expect(quantity.uncertainty).toMatchObject({
      kind: "absolute",
      valueSi: 0.0001,
      dimensionId: "length",
      canonicalUnitId: "m",
    });
  });

  it("uses K canonically for both temperature kinds without mixing their semantics", () => {
    const quantity = createScalarQuantity({
      parameterId: parameterId("water.bulk_temperature"),
      value: 20,
      unitId: "degC",
      dimensionId: "absolute_temperature",
      displayUnitId: "degC",
      basis: "average",
      uncertainty: {
        kind: "absolute",
        evaluation: "expanded",
        value: 0.4,
        unitId: "delta_degC",
        coverageFactor: 2,
        confidenceLevel: 0.95,
      },
      provenance: {
        sourceKind: "measurement",
        sourceRef: sourceRef("sensor:water-inlet"),
        dataQuality: "measured",
      },
      status: "measured",
      validDigits: 4,
    });

    expect(quantity.valueSi).toBeCloseTo(293.15, 12);
    expect(quantity.canonicalUnitId).toBe("K");
    expect(quantity.uncertainty).toMatchObject({
      kind: "absolute",
      valueSi: 0.4,
      dimensionId: "temperature_difference",
      canonicalUnitId: "K",
      coverageFactor: 2,
    });

    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        unitId: "degC",
        dimensionId: "temperature_difference",
      }),
    ).toThrowError(/frozen parameter definition|not allowed/u);
  });

  it("always accepts canonical SI while keeping power display families semantic", () => {
    const reactivePower = createScalarQuantity({
      parameterId: parameterId("port.reactive_power"),
      value: 1250,
      unitId: "W",
      dimensionId: "power",
      displayUnitId: "kvar",
      basis: "rms",
      uncertainty: { kind: "unknown" },
      provenance: {
        sourceKind: "measurement",
        sourceRef: sourceRef("meter:reactive-power"),
        dataQuality: "measured",
      },
      status: "measured",
      validDigits: 4,
    });
    expect(reactivePower.valueSi).toBe(1250);
    expect(reactivePower.displayRepresentation).toEqual({
      value: 1.25,
      unitId: "kvar",
    });

    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        parameterId: parameterId("port.reactive_power"),
        value: 1.25,
        unitId: "kW",
        dimensionId: "power",
        displayUnitId: "kvar",
      }),
    ).toThrowError(/input unit kW is not allowed/u);

    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        parameterId: parameterId("P_grid"),
        value: 1250,
        unitId: "W",
        dimensionId: "power",
        displayUnitId: "kW",
        basis: "rms",
        uncertainty: {
          kind: "absolute",
          evaluation: "standard",
          value: 1,
          unitId: "kvar",
        },
      }),
    ).toThrowError(/Absolute uncertainty unit kvar.*P_grid/u);
  });

  it("rejects non-finite values and invalid uncertainty metadata", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => createScalarQuantity({ ...lengthInput(), value })).toThrowError(/finite/u);
    }
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        uncertainty: {
          kind: "relative",
          evaluation: "expanded",
          fraction: 0.02,
        },
      }),
    ).toThrowError(/coverageFactor/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        uncertainty: {
          kind: "relative",
          evaluation: "forged" as never,
          fraction: 0.02,
        },
      }),
    ).toThrowError(/evaluation must be standard or expanded/u);
    expect(() =>
      createScalarQuantity({ ...lengthInput(), status: "missing" as never }),
    ).toThrowError(/cannot have status/u);
  });

  it("rejects unregistered parameters and frozen dimension mismatches", () => {
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        parameterId: parameterId("unregistered.parameter"),
      }),
    ).toThrowError(/frozen parameter registry/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        dimensionId: "area",
        unitId: "m2",
        displayUnitId: "mm2",
      }),
    ).toThrowError(/frozen parameter definition/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        parameterId: "invalid parameter id" as never,
      }),
    ).toThrowError(/stable non-empty machine identifier/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        parameterId: 42 as never,
      }),
    ).toThrowError(/parameterId must be a non-empty string/u);
  });

  it("enforces controlled data quality and provenance relationships", () => {
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          dataQuality: "forged" as never,
        },
      }),
    ).toThrowError(/dataQuality/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          sourceRef: "invalid source ref" as never,
        },
      }),
    ).toThrowError(/stable non-empty machine identifier/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          sourceRef: 42 as never,
        },
      }),
    ).toThrowError(/sourceRef must be a non-empty string/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          sourceRef: {
            toString: () => "drawing:coerced-source",
          } as never,
        },
      }),
    ).toThrowError(/sourceRef must be a non-empty string/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          sourceKind: "derived",
          sourceRef: sourceRef("method:B-01"),
          dataQuality: "engineering_reference",
        },
      }),
    ).toThrowError(/requires an approved derivationMethodId/u);

    const derived = createScalarQuantity({
      ...lengthInput(),
      provenance: {
        sourceKind: "derived",
        sourceRef: sourceRef("method:B-01"),
        dataQuality: "engineering_reference",
        derivationMethodId: methodId("B-01"),
        sourceSnapshotId: snapshotId(`geometry:${"a".repeat(64)}`),
      },
      status: "estimated",
    });
    expect(derived.derivationMethodId).toBe("B-01");
    expect(derived.sourceSnapshotId).toBe(`geometry:${"a".repeat(64)}`);

    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          sourceKind: "derived",
          sourceRef: sourceRef("method:F-03"),
          dataQuality: "unknown",
          derivationMethodId: methodId("F-03"),
        },
      }),
    ).toThrowError(/approved method allowlist/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          sourceKind: "derived",
          sourceRef: sourceRef("method:B-01"),
          dataQuality: "engineering_reference",
          derivationMethodId: 42 as never,
        },
      }),
    ).toThrowError(/derivationMethodId must be a non-empty string/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          sourceSnapshotId: snapshotId("geometry:not-a-content-hash"),
        },
      }),
    ).toThrowError(/snapshot_id/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          sourceSnapshotId: 42 as never,
        },
      }),
    ).toThrowError(/sourceSnapshotId must be a non-empty string/u);
    expect(() =>
      createScalarQuantity({
        ...lengthInput(),
        provenance: {
          ...lengthInput().provenance,
          derivationMethodId: methodId("B-01"),
        },
      }),
    ).toThrowError(/Only a derived quantity/u);
  });

  it("is recursively immutable and JSON serializable", () => {
    const quantity = createScalarQuantity(lengthInput());
    expect(Object.isFrozen(quantity)).toBe(true);
    expect(Object.isFrozen(quantity.originalRepresentation)).toBe(true);
    expect(Object.isFrozen(quantity.displayRepresentation)).toBe(true);
    expect(Object.isFrozen(quantity.uncertainty)).toBe(true);

    const roundTrip = JSON.parse(JSON.stringify(quantity)) as Record<string, unknown>;
    expect(roundTrip.valueSi).toBe(0.025);
    expect(roundTrip.originalRepresentation).toEqual({ value: 25, unitId: "mm" });
  });
});

describe("unavailable Quantity", () => {
  it("represents missing data without a numeric placeholder and carries data quality", () => {
    const unavailable = createUnavailableQuantity({
      parameterId: parameterId("water.mass_flow"),
      dimensionId: "mass_flow_rate",
      basis: "total",
      provenance: {
        sourceKind: "user",
        sourceRef: sourceRef("case:missing-flow"),
        dataQuality: "unknown",
      },
      status: "missing",
      reason: "No mass-flow measurement or approved derivation is available.",
    });

    expect(unavailable.status).toBe("missing");
    expect(unavailable.dataQuality).toBe("unknown");
    expect("valueSi" in unavailable).toBe(false);
    expect("originalRepresentation" in unavailable).toBe(false);
    expect("uncertainty" in unavailable).toBe(false);
    expect(Object.isFrozen(unavailable)).toBe(true);

    const legitimateZero = createScalarQuantity({
      ...lengthInput(),
      parameterId: parameterId("thermal.radial_gap"),
      value: 0,
      unitId: "m",
      displayUnitId: "mm",
      status: "known",
    });
    expect(legitimateZero.valueSi).toBe(0);
    expect(legitimateZero.status).toBe("known");
  });
});
