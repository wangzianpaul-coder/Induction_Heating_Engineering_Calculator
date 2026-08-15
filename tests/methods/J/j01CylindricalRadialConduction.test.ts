import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isWithinTolId } from "../../../src/config/tolerances.js";
import { methodId } from "../../../src/domain/ids.js";
import {
  J01_ASSUMPTIONS,
  J01_BINARY64_MIN_NORMAL,
  J01_GB8175_CONTROLLED_SOURCE,
  J01_IMPLEMENTATION_READINESS,
  J01_MAX_LAYER_RECORDS,
  J01_METHOD_MAPPING,
  J01_WARNING_PREDICATES,
  evaluateJ01CylindricalRadialConduction,
  type J01CylindricalRadialConductionInput,
  type J01CylindricalRadialConductionSuccess,
  type J01LayerInput,
  type J01ScopeEvidence,
  type J01SnapshotEvidence,
} from "../../../src/methods/J/j01CylindricalRadialConduction.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_ID = `case:${"1".repeat(64)}`;
const GEOMETRY_ID = `geometry:${"2".repeat(64)}`;
const MATERIAL_ID = `material:${"3".repeat(64)}`;
const PROPERTY_STATE_ID = `property-state:${"4".repeat(64)}`;

interface ScalarInput {
  readonly innerRadiusM: number;
  readonly outerRadiusM: number;
  readonly lengthM: number;
  readonly innerTemperatureK: number;
  readonly outerTemperatureK: number;
}

const BASE_SCALARS = Object.freeze({
  innerRadiusM: 0.05,
  outerRadiusM: 0.1,
  lengthM: 1,
  innerTemperatureK: 400,
  outerTemperatureK: 300,
});

function snapshot(
  scalars: ScalarInput,
  layerCount: number | null,
  layerBoundaryRadiiM: readonly number[] | null,
  overrides: Partial<J01SnapshotEvidence> = {},
): J01SnapshotEvidence {
  return {
    caseSnapshotId: CASE_ID,
    geometrySnapshotId: GEOMETRY_ID,
    materialSnapshotId: MATERIAL_ID,
    propertyStateId: PROPERTY_STATE_ID,
    normalizedInnerRadiusM: scalars.innerRadiusM,
    normalizedOuterRadiusM: scalars.outerRadiusM,
    normalizedLengthM: scalars.lengthM,
    normalizedInnerTemperatureK: scalars.innerTemperatureK,
    normalizedOuterTemperatureK: scalars.outerTemperatureK,
    normalizedLayerCount: layerCount,
    normalizedLayerBoundaryRadiiM: layerBoundaryRadiiM,
    radiusSemantics: "confirmed_radii_not_diameters",
    layerOrderStatus: "confirmed_inner_to_outer_adjacent",
    ...overrides,
  };
}

function scope(
  propertyTreatment: J01ScopeEvidence["propertyTreatment"],
  overrides: Partial<J01ScopeEvidence> = {},
): J01ScopeEvidence {
  return {
    caseSnapshotId: CASE_ID,
    geometrySnapshotId: GEOMETRY_ID,
    materialSnapshotId: MATERIAL_ID,
    propertyStateId: PROPERTY_STATE_ID,
    modelScope: "steady_1d_radial_cylindrical_sidewall",
    heatFlowSignConvention: "positive_inner_to_outer",
    endAndBridgeTreatment: "excluded_separate_paths_acknowledged",
    sourceEquationPolicy: "ID_HT_01_adjacent_layer_Fourier_only",
    propertyTreatment,
    ...overrides,
  };
}

function layer(
  index: number,
  innerRadiusM: number,
  outerRadiusM: number,
  conductivityWPerMK: number,
  overrides: Partial<J01LayerInput> = {},
): J01LayerInput {
  return {
    layerIndex: index,
    innerRadiusM,
    outerRadiusM,
    conductivityWPerMK,
    conductivityModel: "constant",
    materialId: `material:layer-${index}`,
    materialSnapshotId: MATERIAL_ID,
    propertyStateId: PROPERTY_STATE_ID,
    conductivitySourceRef: `PROJECT-MATERIAL:layer-${index}:k`,
    conductivityApplicability: "confirmed_no_extrapolation",
    moistureState: "dry",
    wetStatePropertyStatus: "not_required_dry",
    validTemperatureLowerK: 250,
    validTemperatureUpperK: 600,
    ...overrides,
  };
}

function singleInput(
  scalarOverrides: Partial<ScalarInput> = {},
  layerOverrides: Partial<J01LayerInput> = {},
): J01CylindricalRadialConductionInput {
  const scalars = { ...BASE_SCALARS, ...scalarOverrides };
  return {
    route: "constant_k_single_layer",
    ...scalars,
    layers: [
      layer(
        0,
        scalars.innerRadiusM,
        scalars.outerRadiusM,
        0.1,
        layerOverrides,
      ),
    ],
    snapshotEvidence: snapshot(scalars, 1, [
      scalars.innerRadiusM,
      scalars.outerRadiusM,
    ]),
    scopeEvidence: scope("constant_k_single_layer"),
  };
}

function multilayerInput(
  scalarOverrides: Partial<ScalarInput> = {},
  layerOverrides?: readonly J01LayerInput[],
): J01CylindricalRadialConductionInput {
  const scalars = {
    innerRadiusM: 0.05,
    outerRadiusM: 0.1,
    lengthM: 2,
    innerTemperatureK: 500,
    outerTemperatureK: 300,
    ...scalarOverrides,
  };
  const layers =
    layerOverrides ??
    [layer(0, scalars.innerRadiusM, 0.08, 0.1), layer(1, 0.08, scalars.outerRadiusM, 0.2)];
  const firstLayer = layers[0];
  const layerBoundaryRadiiM =
    firstLayer === undefined
      ? []
      : [firstLayer.innerRadiusM, ...layers.map((item) => item.outerRadiusM)];
  return {
    route: "piecewise_constant_k_multilayer",
    ...scalars,
    layers,
    snapshotEvidence: snapshot(
      scalars,
      layers.length,
      layerBoundaryRadiiM,
    ),
    scopeEvidence: scope("piecewise_constant_k_layers"),
  };
}

function variableInput(): J01CylindricalRadialConductionInput {
  return {
    route: "temperature_dependent_k_integration",
    ...BASE_SCALARS,
    layers: null,
    snapshotEvidence: snapshot(BASE_SCALARS, null, null),
    scopeEvidence: scope("temperature_dependent_k_integration_requested"),
  };
}

function successOf(value: unknown): J01CylindricalRadialConductionSuccess {
  const result = evaluateJ01CylindricalRadialConduction(value);
  expect(result.status).toBe("success");
  if (result.status === "success") {
    return result;
  }
  throw new Error(`Expected success, received ${result.status}.`);
}

function expectFailureWithoutPayload(value: unknown): void {
  const result = evaluateJ01CylindricalRadialConduction(value);
  expect(["invalid_input", "insufficient_data"]).toContain(result.status);
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect(result.methodMapping).toBe(J01_METHOD_MAPPING);
}

describe("J-01 cylindrical radial conduction", () => {
  it("maps exactly to the frozen parent family without inventing child IDs", () => {
    expect(J01_METHOD_MAPPING).toMatchObject({
      methodId: "J-01",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      methodType: "numerical",
      equationRef: "CALCULATION_CONTRACTS.md#J-01:Equation",
      sourceRefs: ["ID-HT-01", "GB8175:PDF7:eq7:REJECTED-AS-PRINTED"],
      contractSourceRefs: [
        "ID-HT-01",
        "Fourier",
        "DER-THERM",
        "GB8175:PDF7:eq7:conflict-not-source",
      ],
      derivationRefs: ["ID-HT-01", "DER-THERM"],
      validationCaseIds: [],
      methodCheckIds: ["INS-FOURIER-001", "INS-VARK-001"],
      outputQuantityIds: ["Rcond", "Qcond", "interface T"],
      requiresSubmethodSplit: true,
      stableWarningIds: [],
    });
    expect(J01_METHOD_MAPPING.warningPredicates).toEqual([
      J01_WARNING_PREDICATES.radiusDiameterMixed,
      J01_WARNING_PREDICATES.conductivityStateInvalid,
      J01_WARNING_PREDICATES.endOrBridgeOmitted,
      J01_WARNING_PREDICATES.disputedStandardImplemented,
    ]);
  });

  it("remains nonactivatable and exports no fabricated child method", async () => {
    expect(J01_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      implementedRoutes: [
        "constant_k_single_layer",
        "piecewise_constant_k_multilayer",
      ],
      unavailableRoutes: ["temperature_dependent_k_integration"],
    });
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-01"));
    expect(specification.requiresSubmethodSplit).toBe(true);
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("J-01"))).toBe(false);
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateJ01CylindricalRadialConduction" in publicApi).toBe(false);
    expect(JSON.stringify(J01_IMPLEMENTATION_READINESS)).not.toMatch(/J-01[-_.](single|multi|constant)/i);
  });

  it("binds the controlled GB8175 bytes/hash while rejecting Equation 7 as printed", () => {
    const sourceUrl = new URL(
      "../../../references/external_sources/GBT+8175-2025.pdf",
      import.meta.url,
    );
    expect(statSync(sourceUrl).size).toBe(515_231);
    expect(createHash("sha256").update(readFileSync(sourceUrl)).digest("hex")).toBe(
      "d49b00ea888f4d73365d28ac3325ad6c2782d1796a760e1fde697135c67737ae",
    );
    expect(J01_GB8175_CONTROLLED_SOURCE).toMatchObject({
      equation7Location: "PDF7:PRINT3:eq7",
      disposition: "rejected_as_printed_not_implemented",
    });
  });

  it("evaluates the frozen constant-k single-layer equation in canonical SI", () => {
    const result = successOf(singleInput());
    const expectedR = Math.log(2) / (2 * Math.PI * 0.1 * 1);
    const expectedQ = (2 * Math.PI * 1 * 0.1 * 100) / Math.log(2);
    expect(isWithinTolId(result.value.resistance.valueSi, expectedR)).toBe(true);
    expect(isWithinTolId(result.value.heatFlow.valueSi, expectedQ)).toBe(true);
    expect(result.value.interfaceTemperatures).toEqual([]);
    expect(result.evidence.equation).toMatchObject({
      controlledDerivation: "ID-HT-01",
      logarithmEvaluation: "log1p((ro-ri)/ri)_algebraically_equivalent",
      gb8175Equation7Executed: false,
    });
    expect(result.evidence.identityChecks.map((check) => check.toleranceId)).toEqual([
      "TOL-ID",
      "TOL-ID",
    ]);
  });

  it("preserves signed heat flow and the exact zero-temperature-difference limit", () => {
    const forward = successOf(singleInput());
    const reverse = successOf(
      singleInput({ innerTemperatureK: 300, outerTemperatureK: 400 }),
    );
    const equal = successOf(
      singleInput({ innerTemperatureK: 350, outerTemperatureK: 350 }),
    );
    expect(reverse.value.heatFlow.valueSi).toBeCloseTo(
      -forward.value.heatFlow.valueSi,
      13,
    );
    expect(equal.value.heatFlow.valueSi).toBe(0);
  });

  it("uses stable log1p for a representable near-thin cylindrical layer without a made-up thickness threshold", () => {
    const outer = 1 + Number.EPSILON;
    const result = successOf(
      singleInput({ innerRadiusM: 1, outerRadiusM: outer }),
    );
    expect(result.evidence.equation.layers[0]?.relativeThickness).toBe(
      Number.EPSILON,
    );
    expect(result.evidence.numericRepresentabilityPolicy).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      layerAllocationCeilingIsTrustBoundaryOnly: true,
    });
  });

  it("evaluates adjacent-layer Fourier resistances and interface temperature", () => {
    const result = successOf(multilayerInput());
    const r1 = Math.log(0.08 / 0.05) / (2 * Math.PI * 0.1 * 2);
    const r2 = Math.log(0.1 / 0.08) / (2 * Math.PI * 0.2 * 2);
    const expectedQ = 200 / (r1 + r2);
    const expectedInterface = 500 - expectedQ * r1;
    expect(isWithinTolId(result.value.resistance.valueSi, r1 + r2)).toBe(true);
    expect(isWithinTolId(result.value.heatFlow.valueSi, expectedQ)).toBe(true);
    expect(result.value.interfaceTemperatures).toHaveLength(1);
    expect(
      isWithinTolId(
        result.value.interfaceTemperatures[0]?.temperatureK ?? Number.NaN,
        expectedInterface,
      ),
    ).toBe(true);
    const rejectedPrintedResistance =
      r1 + Math.log(0.1 / 0.05) / (2 * Math.PI * 0.2 * 2);
    expect(result.value.resistance.valueSi).not.toBeCloseTo(
      rejectedPrintedResistance,
      12,
    );
  });

  it("keeps multilayer interfaces monotone for forward/reverse flow and equal at zero flow", () => {
    const forward = successOf(multilayerInput());
    const reverse = successOf(
      multilayerInput({ innerTemperatureK: 300, outerTemperatureK: 500 }),
    );
    const equal = successOf(
      multilayerInput({ innerTemperatureK: 400, outerTemperatureK: 400 }),
    );
    expect(forward.value.interfaceTemperatures[0]?.temperatureK).toBeGreaterThan(300);
    expect(forward.value.interfaceTemperatures[0]?.temperatureK).toBeLessThan(500);
    expect(reverse.value.interfaceTemperatures[0]?.temperatureK).toBeGreaterThan(300);
    expect(reverse.value.interfaceTemperatures[0]?.temperatureK).toBeLessThan(500);
    expect(equal.value.interfaceTemperatures[0]?.temperatureK).toBe(400);
    expect(equal.value.heatFlow.valueSi).toBe(0);
  });

  it("fails the known k(T) parent route closed before numeric evaluation", () => {
    const candidate = variableInput();
    const hostileScalar = Object.freeze({
      valueOf() {
        throw new Error("must not coerce unavailable-route values");
      },
    });
    for (const unsupported of [
      {
        ...candidate,
        innerRadiusM: hostileScalar,
        snapshotEvidence: {
          ...candidate.snapshotEvidence,
          normalizedInnerRadiusM: hostileScalar,
        },
      },
      {
        ...candidate,
        innerRadiusM: Number.MIN_VALUE,
        snapshotEvidence: {
          ...candidate.snapshotEvidence,
          normalizedInnerRadiusM: Number.MIN_VALUE,
        },
      },
    ]) {
      const result = evaluateJ01CylindricalRadialConduction(unsupported);
      expect(result.status).toBe("insufficient_data");
      if (result.status === "insufficient_data") {
        expect(result.availabilityStatus).toBe("partial_specification");
        expect(result.failure.code).toBe(
          "J-01.temperature_dependent_route_unavailable",
        );
      }
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it.each([
    [
      "printed GB8175 Equation 7",
      { sourceEquationPolicy: "GB8175_equation_7_as_printed" },
      "invalid_input",
      "a disputed standard print is implemented directly",
    ],
    [
      "missing end/bridge paths",
      { endAndBridgeTreatment: "omitted_without_separate_model" },
      "insufficient_data",
      "end or bridge loss is omitted",
    ],
  ] as const)("fails closed for %s", (_name, scopeOverride, status, predicate) => {
    const candidate = singleInput();
    const result = evaluateJ01CylindricalRadialConduction({
      ...candidate,
      scopeEvidence: { ...candidate.scopeEvidence, ...scopeOverride },
    });
    expect(result.status).toBe(status);
    expect(result.warnings.map((item) => item.predicate)).toEqual([predicate]);
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it.each([
    [
      "extrapolated k",
      { conductivityApplicability: "extrapolated" },
    ],
    [
      "missing wet-state k",
      {
        moistureState: "wet",
        wetStatePropertyStatus: "missing_wet_property",
      },
    ],
    [
      "temperature interval gap",
      { validTemperatureUpperK: 350 },
    ],
  ] as const)("returns insufficient_data without a result for %s", (_name, overrides) => {
    const result = evaluateJ01CylindricalRadialConduction(
      singleInput({}, overrides as Partial<J01LayerInput>),
    );
    expect(result.status).toBe("insufficient_data");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("rejects radius/diameter mixing with the exact frozen predicate", () => {
    const candidate = singleInput();
    const result = evaluateJ01CylindricalRadialConduction({
      ...candidate,
      snapshotEvidence: {
        ...candidate.snapshotEvidence,
        radiusSemantics: "diameter_or_mixed",
      },
    });
    expect(result.status).toBe("invalid_input");
    expect(result.warnings.map((item) => item.predicate)).toEqual([
      "radius and diameter are mixed",
    ]);
  });

  it("rejects uncontrolled layer state enums instead of casting them into success evidence", () => {
    for (const layerOverride of [
      { moistureState: "humid-ish" },
      { wetStatePropertyStatus: "probably-dry" },
    ]) {
      const result = evaluateJ01CylindricalRadialConduction(
        singleInput({}, layerOverride as unknown as Partial<J01LayerInput>),
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it.each([
    ["zero inner radius", { innerRadiusM: 0 }],
    ["equal radii", { outerRadiusM: 0.05 }],
    ["negative length", { lengthM: -1 }],
    ["NaN temperature", { innerTemperatureK: Number.NaN }],
    ["subnormal length", { lengthM: Number.MIN_VALUE }],
  ])("rejects %s without value or evidence", (_name, overrides) => {
    expectFailureWithoutPayload(singleInput(overrides as Partial<ScalarInput>));
  });

  it("rejects gaps, overlaps, route/layer-count mismatch, and snapshot mismatch", () => {
    const base = multilayerInput();
    const first = base.layers?.[0];
    const second = base.layers?.[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const candidates = [
      {
        ...base,
        layers: [first, { ...second, innerRadiusM: 0.081 }],
      },
      {
        ...singleInput(),
        snapshotEvidence: { ...singleInput().snapshotEvidence, normalizedLayerCount: 2 },
      },
      {
        ...singleInput(),
        scopeEvidence: {
          ...singleInput().scopeEvidence,
          geometrySnapshotId: `geometry:${"9".repeat(64)}`,
        },
      },
    ];
    for (const candidate of candidates) {
      expectFailureWithoutPayload(candidate);
    }
  });

  it("rejects changed internal layer geometry under the same geometry snapshot hash", () => {
    const base = multilayerInput();
    const first = base.layers?.[0];
    const second = base.layers?.[1];
    if (first === undefined || second === undefined) {
      throw new Error("Expected two controlled layers.");
    }
    const result = evaluateJ01CylindricalRadialConduction({
      ...base,
      layers: [
        { ...first, outerRadiusM: 0.09 },
        { ...second, innerRadiusM: 0.09 },
      ],
    });
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-01.snapshot_value_mismatch" },
    });
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("fails closed for positive-subnormal intermediates and swallowed layer resistance", () => {
    const subnormalResistance = singleInput(
      { innerRadiusM: 1, outerRadiusM: 1 + Number.EPSILON },
      { conductivityWPerMK: 1e300 },
    );
    const swallowed = multilayerInput(
      {
        innerRadiusM: 0.05,
        outerRadiusM: 0.2,
        lengthM: 1,
      },
      [layer(0, 0.05, 0.1, 0.1), layer(1, 0.1, 0.2, 1e18)],
    );
    for (const candidate of [subnormalResistance, swallowed]) {
      const result = evaluateJ01CylindricalRadialConduction(candidate);
      expect(result.status).toBe("invalid_input");
      if (result.status === "invalid_input") {
        expect(result.failure.code).toBe("J-01.numeric_resolution_invalid");
      }
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it.each([
    ["forward", 500, 300],
    ["reverse", 300, 500],
  ])(
    "rejects a %s internal interface swallowed onto the outer boundary",
    (_direction, innerTemperatureK, outerTemperatureK) => {
      const firstResistanceKPerW =
        Math.log(2) / (2 * Math.PI * 0.1 * 1);
      const secondResistanceKPerW =
        Math.log(2) / (2 * Math.PI * 4e14 * 1);
      const heatFlowW =
        (innerTemperatureK - outerTemperatureK) /
        (firstResistanceKPerW + secondResistanceKPerW);
      const unresolvedInterfaceTemperatureK =
        innerTemperatureK - heatFlowW * firstResistanceKPerW;

      expect(Math.abs(heatFlowW * secondResistanceKPerW)).toBeGreaterThan(0);
      expect(unresolvedInterfaceTemperatureK).toBe(outerTemperatureK);

      const result = evaluateJ01CylindricalRadialConduction(
        multilayerInput(
          {
            innerRadiusM: 0.05,
            outerRadiusM: 0.2,
            lengthM: 1,
            innerTemperatureK,
            outerTemperatureK,
          },
          [
            layer(0, 0.05, 0.1, 0.1),
            layer(1, 0.1, 0.2, 4e14),
          ],
        ),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "J-01.numeric_resolution_invalid" },
      });
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    },
  );

  it("rejects missing/extra/symbol/accessor/Proxy/sparse hostile inputs without throwing", () => {
    const base = singleInput();
    const topAccessor = Object.defineProperty({ ...base }, "innerRadiusM", {
      enumerable: true,
      get() {
        throw new Error("must not execute getter");
      },
    });
    const layerAccessor = Object.defineProperty(
      { ...(base.layers?.[0] ?? {}) },
      "conductivityWPerMK",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute layer getter");
        },
      },
    );
    const hostileProxy = new Proxy(base, {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    const hugeSparse = new Array(4_294_967_295);
    const hostileBoundaryProxy = new Proxy([0.05, 0.1], {
      ownKeys() {
        throw new Error("hostile boundary ownKeys");
      },
    });
    const { scopeEvidence: _missing, ...missing } = base;
    const candidates = [
      { ...base, legacyDiameterM: 0.1 },
      { ...base, [Symbol("extra")]: true },
      missing,
      topAccessor,
      { ...base, layers: [layerAccessor] },
      { ...base, layers: hugeSparse },
      {
        ...base,
        snapshotEvidence: {
          ...base.snapshotEvidence,
          normalizedLayerBoundaryRadiiM: hugeSparse,
        },
      },
      {
        ...base,
        snapshotEvidence: {
          ...base.snapshotEvidence,
          normalizedLayerBoundaryRadiiM: hostileBoundaryProxy,
        },
      },
      hostileProxy,
    ];
    for (const candidate of candidates) {
      expect(() => evaluateJ01CylindricalRadialConduction(candidate)).not.toThrow();
      expectFailureWithoutPayload(candidate);
    }
    expect(J01_MAX_LAYER_RECORDS).toBe(4_096);
    expect(J01_BINARY64_MIN_NORMAL).toBe(2.2250738585072014e-308);
  });

  it("deep-freezes success/failure payloads, traces, assumptions, and release gates", () => {
    const result = successOf(multilayerInput());
    for (const candidate of [
      result,
      result.value,
      result.value.resistance,
      result.value.heatFlow,
      result.value.interfaceTemperatures,
      result.value.interfaceTemperatures[0],
      result.evidence,
      result.evidence.snapshotEvidence,
      result.evidence.snapshotEvidence.normalizedLayerBoundaryRadiiM,
      result.evidence.scopeEvidence,
      result.evidence.equation,
      result.evidence.equation.layers,
      result.evidence.equation.layers[0],
      result.evidence.identityChecks,
      result.evidence.limitations,
      result.evidence.numericRepresentabilityPolicy,
      J01_ASSUMPTIONS,
      J01_METHOD_MAPPING,
      J01_IMPLEMENTATION_READINESS,
      J01_GB8175_CONTROLLED_SOURCE,
    ]) {
      expect(Object.isFrozen(candidate)).toBe(true);
    }
    const failed = evaluateJ01CylindricalRadialConduction(variableInput());
    expect(Object.isFrozen(failed)).toBe(true);
    expect(Object.isFrozen(failed.failure)).toBe(true);
    expect(Object.isFrozen(failed.warnings)).toBe(true);
  });

  it("contains no historical-output, calibration, repaired-standard, or hidden-default path", () => {
    const serialized = JSON.stringify(successOf(singleInput()));
    expect(serialized).not.toMatch(/workbook|screenshot|calibrat|783|135\s*L/i);
    expect(serialized).not.toMatch(/GB8175_equation_7_as_printed/);
    expect(serialized).toContain("rejected_as_printed_not_implemented");
  });
});
