import { describe, expect, it } from "vitest";
import * as publicApi from "../../../src/public-api.js";
import { methodId } from "../../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  F01_ASSUMPTIONS,
  F01_BINARY64_MIN_NORMAL,
  F01_CONTRACT_SOURCE_REFS,
  F01_DERIVATION_REFS,
  F01_METHOD_CHECK_IDS,
  F01_METHOD_ID,
  F01_METHOD_VERSION,
  F01_NUMERIC_REPRESENTABILITY_POLICY,
  F01_REFLECTED_IMPEDANCE_MAPPING,
  F01_SOURCE_REFS,
  F01_VALIDATION_CASE_IDS,
  evaluateF01ReflectedImpedance,
  type F01MutualParameterSnapshot,
  type F01PrimaryParameterSnapshot,
  type F01ReflectedImpedanceInput,
  type F01ReflectedImpedanceSuccess,
  type F01SecondaryParameterSnapshot,
} from "../../../src/methods/F/f01ReflectedImpedance.js";

const CASE_SNAPSHOT_A = `case:${"a".repeat(64)}`;
const CASE_SNAPSHOT_B = `case:${"b".repeat(64)}`;
const PRIMARY_MATERIAL_A = `material:${"1".repeat(64)}`;
const PRIMARY_MATERIAL_B = `material:${"2".repeat(64)}`;
const SECONDARY_MATERIAL_A = `material:${"3".repeat(64)}`;
const SECONDARY_MATERIAL_B = `material:${"4".repeat(64)}`;

const BASE_PRIMARY = Object.freeze({
  resistanceOhm: 0.05,
  inductanceH: 20e-6,
  frequencyHz: 10_000,
  portId: "coil.primary.port",
  referencePlaneId: "coil.primary.terminals",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  materialStateId: "copper.primary.673K",
  temperatureK: 673,
  caseSnapshotId: CASE_SNAPSHOT_A,
  materialSnapshotId: PRIMARY_MATERIAL_A,
  coupledCircuitStateId: "state.loaded.hot.10kHz",
  parameterSourceKind: "measurement",
  sourceRef: "PROJECT-MEAS:R1-LP:001",
  stateMatch: "confirmed_for_declared_state",
} satisfies F01PrimaryParameterSnapshot);

const BASE_SECONDARY = Object.freeze({
  resistanceOhm: 0.01,
  inductanceH: 1e-6,
  frequencyHz: 10_000,
  portId: "workpiece.secondary.equivalent",
  referencePlaneId: "workpiece.secondary.model-plane",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  materialStateId: "steel.secondary.1173K",
  temperatureK: 1173,
  caseSnapshotId: CASE_SNAPSHOT_A,
  materialSnapshotId: SECONDARY_MATERIAL_A,
  coupledCircuitStateId: "state.loaded.hot.10kHz",
  parameterSourceKind: "limited_analytical",
  sourceRef: "MODEL:secondary-equivalent:001",
  stateMatch: "confirmed_for_declared_state",
} satisfies F01SecondaryParameterSnapshot);

const BASE_MUTUAL = Object.freeze({
  mutualInductanceH: 0.5 * Math.sqrt(20e-6 * 1e-6),
  frequencyHz: 10_000,
  primaryPortId: "coil.primary.port",
  secondaryPortId: "workpiece.secondary.equivalent",
  primaryReferencePlaneId: "coil.primary.terminals",
  secondaryReferencePlaneId: "workpiece.secondary.model-plane",
  quantityBasis: "fundamental_rms",
  loadedState: "workpiece_hot",
  primaryMaterialStateId: "copper.primary.673K",
  secondaryMaterialStateId: "steel.secondary.1173K",
  primaryTemperatureK: 673,
  secondaryTemperatureK: 1173,
  caseSnapshotId: CASE_SNAPSHOT_A,
  primaryMaterialSnapshotId: PRIMARY_MATERIAL_A,
  secondaryMaterialSnapshotId: SECONDARY_MATERIAL_A,
  coupledCircuitStateId: "state.loaded.hot.10kHz",
  parameterSourceKind: "fem",
  sourceRef: "FEM:coupling:M:001",
  stateMatch: "confirmed_for_declared_state",
} satisfies F01MutualParameterSnapshot);

interface InputOverrides {
  readonly primary?: Partial<F01PrimaryParameterSnapshot> | null;
  readonly secondary?: Partial<F01SecondaryParameterSnapshot> | null;
  readonly mutual?: Partial<F01MutualParameterSnapshot> | null;
  readonly modelRegime?: F01ReflectedImpedanceInput["modelRegime"];
}

function input(overrides: InputOverrides = {}): F01ReflectedImpedanceInput {
  return {
    primary:
      overrides.primary === null
        ? (null as unknown as F01PrimaryParameterSnapshot)
        : { ...BASE_PRIMARY, ...overrides.primary },
    secondary:
      overrides.secondary === null
        ? (null as unknown as F01SecondaryParameterSnapshot)
        : { ...BASE_SECONDARY, ...overrides.secondary },
    mutual:
      overrides.mutual === null
        ? (null as unknown as F01MutualParameterSnapshot)
        : { ...BASE_MUTUAL, ...overrides.mutual },
    modelRegime:
      overrides.modelRegime ?? "linear_lumped_sinusoidal_steady_state",
  };
}

function successOf(
  candidate: F01ReflectedImpedanceInput,
): F01ReflectedImpedanceSuccess {
  const result = evaluateF01ReflectedImpedance(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(`Expected F-01 success, received ${result.failure.code}`);
  }
  return result;
}

function expectClosedFailure(
  candidate: unknown,
  expectedStatus: "invalid_input" | "insufficient_data" | "not_applicable",
  expectedCode?: string,
): void {
  const result = evaluateF01ReflectedImpedance(
    candidate as F01ReflectedImpedanceInput,
  );
  expect(result.status).toBe(expectedStatus);
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect("trace" in result).toBe(false);
  expect("resultProvenance" in result).toBe(false);
  if (result.status !== "success" && expectedCode !== undefined) {
    expect(result.failure.code).toBe(expectedCode);
  }
}

function withFrequency(
  frequencyHz: number,
  overrides: InputOverrides = {},
): F01ReflectedImpedanceInput {
  return input({
    ...overrides,
    primary: { ...overrides.primary, frequencyHz },
    secondary: { ...overrides.secondary, frequencyHz },
    mutual: { ...overrides.mutual, frequencyHz },
  });
}

describe("F-01 reflected impedance", () => {
  it("maps exactly to the frozen method specification without activating runtime", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-01"));
    expect(F01_METHOD_ID).toBe("F-01");
    expect(F01_METHOD_VERSION).toBe(specification.methodVersion);
    expect(F01_SOURCE_REFS).toEqual([
      "ID-Z-01",
      "L13:PDF1-6",
      "J08:PDF2-3",
    ]);
    expect(F01_CONTRACT_SOURCE_REFS).toEqual([
      "ID-Z-01",
      "DER-CIRCUIT",
      "J08:PDF2-3:scope-only",
      "L13:PDF1-6:scope-only",
    ]);
    expect(F01_DERIVATION_REFS).toEqual(["ID-Z-01", "DER-CIRCUIT"]);
    expect(F01_VALIDATION_CASE_IDS).toEqual(["EM-Z-001"]);
    expect(F01_METHOD_CHECK_IDS).toEqual(["EM-Z-PASSIVITY-001"]);
    expect(F01_REFLECTED_IMPEDANCE_MAPPING).toMatchObject({
      methodId: specification.methodId,
      approvalStatus: "approved_with_limitation",
      methodType: "analytical",
      equationRef: "CALCULATION_CONTRACTS.md#F-01:Equation",
      inputParameterIds: [
        "primary.resistance/inductance",
        "secondary.resistance/inductance",
        "mutual_inductance",
        "frequency",
      ],
      outputQuantityIds: ["Zin", "Req", "Rref", "Leq", "k"],
      recommendationEligibility: "not_eligible",
    });
    expect(F01_REFLECTED_IMPEDANCE_MAPPING.warningPredicates).toEqual([
      "|k|>1",
      "Rref<0",
      "parameters come from different frequencies or temperatures",
      "Leq/L0 is called k",
      "M is guessed when geometry-to-parameter evidence is missing",
    ]);
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect("evaluateF01ReflectedImpedance" in publicApi).toBe(false);
    expect(Object.isFrozen(F01_REFLECTED_IMPEDANCE_MAPPING)).toBe(true);
  });

  it("reproduces EM-Z-001 from k-derived M within its frozen tolerance", () => {
    const lp = 20e-6;
    const ls = 1e-6;
    const mutualInductanceH = 0.5 * Math.sqrt(lp * ls);
    const result = successOf(
      withFrequency(10_000, {
        primary: { resistanceOhm: 0, inductanceH: lp },
        secondary: { resistanceOhm: 0.01, inductanceH: ls },
        mutual: { mutualInductanceH },
      }),
    );

    expect(result.value.Rref.valueSi).toBeCloseTo(0.04876477385, 10);
    expect(result.value.Req.valueSi).toBeCloseTo(0.04876477385, 10);
    expect(result.value.Leq.valueSi).toBeCloseTo(15.12352262e-6, 14);
    expect(result.value.Zin.valueSi.imaginaryOhm).toBeCloseTo(
      -0.3063981106 + 2 * Math.PI * 10_000 * lp,
      10,
    );
    expect(result.value.k.valueSi).toBe(0.5);
    expect(result.validationCaseIds).toEqual(["EM-Z-001"]);
  });

  it("matches an independent direct complex-division oracle", () => {
    const candidate = input();
    const result = successOf(candidate);
    const omega = 2 * Math.PI * candidate.primary.frequencyHz;
    const scale = omega ** 2 * candidate.mutual.mutualInductanceH ** 2;
    const secondaryX = omega * candidate.secondary.inductanceH;
    const denominator = candidate.secondary.resistanceOhm ** 2 + secondaryX ** 2;
    const reflectedReal =
      (scale * candidate.secondary.resistanceOhm) / denominator;
    const reflectedImaginary = -(scale * secondaryX) / denominator;
    const expectedReal = candidate.primary.resistanceOhm + reflectedReal;
    const expectedImaginary =
      omega * candidate.primary.inductanceH + reflectedImaginary;

    expect(result.value.Zin.valueSi.realOhm).toBe(expectedReal);
    expect(result.value.Zin.valueSi.imaginaryOhm).toBe(expectedImaginary);
    expect(result.value.Rref.valueSi).toBe(reflectedReal);
    expect(result.value.Req.valueSi).toBe(expectedReal);
    expect(result.value.Leq.valueSi).toBe(
      candidate.primary.inductanceH -
        (scale * candidate.secondary.inductanceH) / denominator,
    );
  });

  it("preserves a signed coupling coefficient while impedance remains orientation invariant", () => {
    const positive = successOf(input());
    const negative = successOf(
      input({
        mutual: {
          mutualInductanceH: -BASE_MUTUAL.mutualInductanceH,
        },
      }),
    );
    expect(negative.value.k.valueSi).toBe(-positive.value.k.valueSi);
    expect(negative.value.Zin.valueSi).toEqual(positive.value.Zin.valueSi);
    expect(negative.value.Rref.valueSi).toBe(positive.value.Rref.valueSi);
    expect(negative.value.Leq.valueSi).toBe(positive.value.Leq.valueSi);
  });

  it("returns the exact uncoupled limit at M=0", () => {
    const candidate = input({ mutual: { mutualInductanceH: 0 } });
    const result = successOf(candidate);
    const omega = 2 * Math.PI * candidate.primary.frequencyHz;
    expect(result.value.Rref.valueSi).toBe(0);
    expect(result.value.Req.valueSi).toBe(candidate.primary.resistanceOhm);
    expect(result.value.Leq.valueSi).toBe(candidate.primary.inductanceH);
    expect(result.value.k.valueSi).toBe(0);
    expect(result.value.Zin.valueSi).toEqual({
      realOhm: candidate.primary.resistanceOhm,
      imaginaryOhm: omega * candidate.primary.inductanceH,
    });
  });

  it("keeps the lossless-secondary passive boundary and permits Leq=0 at ideal coupling", () => {
    const result = successOf(
      withFrequency(1, {
        primary: { resistanceOhm: 0, inductanceH: 1 },
        secondary: { resistanceOhm: 0, inductanceH: 1 },
        mutual: { mutualInductanceH: 1 },
      }),
    );
    expect(result.value.Rref.valueSi).toBe(0);
    expect(result.value.Req.valueSi).toBe(0);
    expect(result.value.Leq.valueSi).toBe(0);
    expect(result.value.Zin.valueSi).toEqual({ realOhm: 0, imaginaryOhm: 0 });
    expect(result.value.k.valueSi).toBe(1);
  });

  it("approaches the open-secondary limit without inserting infinity", () => {
    const lower = successOf(
      input({ secondary: { resistanceOhm: 10 } }),
    );
    const higher = successOf(
      input({ secondary: { resistanceOhm: 100 } }),
    );
    expect(higher.value.Rref.valueSi).toBeLessThan(
      lower.value.Rref.valueSi,
    );
    expect(
      BASE_PRIMARY.inductanceH - higher.value.Leq.valueSi,
    ).toBeLessThan(BASE_PRIMARY.inductanceH - lower.value.Leq.valueSi);
    expect(higher.value.Req.valueSi).toBeGreaterThanOrEqual(
      BASE_PRIMARY.resistanceOhm,
    );
  });

  it("obeys the exact M-squared reflected-term scaling identity", () => {
    const base = successOf(input());
    const half = successOf(
      input({
        mutual: {
          mutualInductanceH: BASE_MUTUAL.mutualInductanceH / 2,
        },
      }),
    );
    expect(half.value.Rref.valueSi).toBeCloseTo(
      base.value.Rref.valueSi / 4,
      15,
    );
    expect(
      BASE_PRIMARY.inductanceH - half.value.Leq.valueSi,
    ).toBeCloseTo(
      (BASE_PRIMARY.inductanceH - base.value.Leq.valueSi) / 4,
      15,
    );
    expect(half.value.k.valueSi).toBe(base.value.k.valueSi / 2);
  });

  it("passes the EM-Z-PASSIVITY-001 property grid", () => {
    for (const r1 of [0, 0.2]) {
      for (const r2 of [0, 0.2, 1, 5]) {
        for (const signedK of [-0.9, -0.7, 0, 0.2, 0.9]) {
          const lp = 1e-3;
          const ls = 2e-3;
          const mutualInductanceH = signedK * Math.sqrt(lp * ls);
          const result = successOf(
            withFrequency(100, {
              primary: { resistanceOhm: r1, inductanceH: lp },
              secondary: { resistanceOhm: r2, inductanceH: ls },
              mutual: { mutualInductanceH },
            }),
          );
          expect(result.value.Rref.valueSi).toBeGreaterThanOrEqual(0);
          expect(result.value.Req.valueSi).toBeGreaterThanOrEqual(r1);
          expect(result.value.Leq.valueSi).toBeGreaterThanOrEqual(0);
          expect(Math.abs(result.value.k.valueSi)).toBeLessThanOrEqual(1);
          expect(result.value.Zin.valueSi.realOhm).toBe(
            result.value.Req.valueSi,
          );
          expect(result.value.Zin.valueSi.imaginaryOhm).toBeGreaterThanOrEqual(
            0,
          );
          expect(
            result.evidence.passivityChecks
              .passiveUnitCurrentReflectedPowerW,
          ).toBe(result.value.Rref.valueSi);
        }
      }
    }
  });

  it("reports canonical dimensions and the frozen phasor convention", () => {
    const result = successOf(input());
    expect(result.value.Zin).toMatchObject({
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    });
    expect(result.value.Req).toMatchObject({
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
    });
    expect(result.value.Rref).toMatchObject({
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
    });
    expect(result.value.Leq).toMatchObject({
      dimensionId: "inductance",
      canonicalUnitId: "H",
    });
    expect(result.value.k).toMatchObject({
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    });
  });

  it("emits an expandable engineering trace without claiming validation execution", () => {
    const result = successOf(input());
    expect(result.trace.path).toEqual([
      "Result",
      "Method and Version",
      "Input Snapshot",
      "Material States",
      "Equation and Substitution",
      "Source",
      "Assumptions",
      "Applicability Checks",
      "Warnings",
      "Solver Residuals",
    ]);
    expect(result.trace.result).toBe(result.value);
    expect(result.trace.methodAndVersion).toMatchObject({
      methodId: "F-01",
      methodVersion: F01_METHOD_VERSION,
      approvalStatus: "approved_with_limitation",
      resultProvenance: "estimated",
      scientificConfidence: "high",
    });
    expect(result.trace.source).toMatchObject({
      validationStatus: "specified",
      externalModelEvidenceRole: "scope_only_not_equation_source",
    });
    expect(result.trace.source.sourceRefs).toBe(F01_SOURCE_REFS);
    expect(result.trace.source.contractSourceRefs).toBe(
      F01_CONTRACT_SOURCE_REFS,
    );
    expect(result.trace.source.derivationRefs).toBe(F01_DERIVATION_REFS);
    expect(result.trace.solverResiduals).toEqual([]);
    expect(result.trace.assumptions).toBe(F01_ASSUMPTIONS);
    expect(
      result.trace.applicabilityChecks
        .geometryToMutualInductanceDerivationPerformed,
    ).toBe(false);
  });

  it("marks F-01 estimated and not Recommended while pointing to F-02", () => {
    const result = successOf(input());
    expect(result.resultProvenance).toBe("estimated");
    expect(result.evidence.recommendation).toMatchObject({
      eligibility: "not_eligible",
      isRecommended: false,
      preferredActualEquipmentMethodId: "F-02",
    });
    expect(result.evidence.recommendation.reason).toBe(
      METHOD_SPECIFICATION_REGISTRY.get(methodId("F-01"))
        .recommendationReason,
    );
  });

  it("retains both distinct material states and content-addressed snapshots", () => {
    const result = successOf(input());
    expect(result.trace.materialStates).toEqual({
      primaryMaterialStateId: BASE_PRIMARY.materialStateId,
      secondaryMaterialStateId: BASE_SECONDARY.materialStateId,
      primaryMaterialSnapshotId: PRIMARY_MATERIAL_A,
      secondaryMaterialSnapshotId: SECONDARY_MATERIAL_A,
      primaryTemperatureK: BASE_PRIMARY.temperatureK,
      secondaryTemperatureK: BASE_SECONDARY.temperatureK,
    });
    expect(result.evidence.primaryParameterSnapshot).toEqual(BASE_PRIMARY);
    expect(result.evidence.secondaryParameterSnapshot).toEqual(BASE_SECONDARY);
    expect(result.evidence.mutualParameterSnapshot).toEqual(BASE_MUTUAL);
  });

  it("accepts explicit RMS and fundamental-RMS bases", () => {
    for (const quantityBasis of ["rms", "fundamental_rms"] as const) {
      const result = successOf(
        input({
          primary: { quantityBasis },
          secondary: { quantityBasis },
          mutual: { quantityBasis },
        }),
      );
      expect(result.trace.inputSnapshot.primary.quantityBasis).toBe(
        quantityBasis,
      );
    }
  });

  it.each([
    "peak",
    "full_wave_rms",
    "dc",
    "average",
    "local",
    "total",
] as const)("fails closed for the %s quantity basis", (quantityBasis) => {
    expectClosedFailure(
      input({
        primary: { quantityBasis },
        secondary: { quantityBasis },
        mutual: { quantityBasis },
      }),
      "not_applicable",
      "F-01.quantity_basis_not_applicable",
    );
  });

  it("returns not_applicable outside the linear lumped sinusoidal regime", () => {
    expectClosedFailure(
      input({
        modelRegime:
          "nonlinear_distributed_or_non_sinusoidal_or_unknown",
      }),
      "not_applicable",
      "F-01.model_regime_not_applicable",
    );
  });

  it("rejects an unknown model-regime value without coercion", () => {
    expectClosedFailure(
      {
        ...input(),
        modelRegime: "other",
      },
      "invalid_input",
      "F-01.model_regime_invalid",
    );
  });

  it.each(["primary", "secondary", "mutual"] as const)(
    "returns insufficient_data when the %s snapshot is missing",
    (key) => {
      expectClosedFailure(
        input({ [key]: null }),
        "insufficient_data",
        `F-01.${key}_snapshot_missing`,
      );
    },
  );

  it("returns insufficient_data when the entire input is absent", () => {
    expectClosedFailure(
      null,
      "insufficient_data",
      "F-01.input_schema_invalid",
    );
  });

  it.each(["primary", "secondary", "mutual"] as const)(
    "does not run when %s provenance is an unproven geometry guess",
    (key) => {
      expectClosedFailure(
        input({
          [key]: { parameterSourceKind: "geometry_guess_or_unproven" },
        }),
        "insufficient_data",
        "F-01.parameter_provenance_insufficient",
      );
    },
  );

  it.each(["primary", "secondary", "mutual"] as const)(
    "does not run when the %s state is unconfirmed",
    (key) => {
      expectClosedFailure(
        input({ [key]: { stateMatch: "unconfirmed_or_mismatched" } }),
        "insufficient_data",
        "F-01.parameter_provenance_insufficient",
      );
    },
  );

  it("rejects a collapsed one-port mapping", () => {
    expectClosedFailure(
      input({
        secondary: { portId: BASE_PRIMARY.portId },
        mutual: { secondaryPortId: BASE_PRIMARY.portId },
      }),
      "invalid_input",
      "F-01.port_mapping_invalid",
    );
  });

  it.each([
    ["frequency", { secondary: { frequencyHz: 11_000 } }],
    ["basis", { secondary: { quantityBasis: "rms" } }],
    ["loaded state", { secondary: { loadedState: "workpiece_cold" } }],
    ["case snapshot", { secondary: { caseSnapshotId: CASE_SNAPSHOT_B } }],
    [
      "coupled state",
      { secondary: { coupledCircuitStateId: "state.other" } },
    ],
    ["primary port", { mutual: { primaryPortId: "another.primary" } }],
    [
      "secondary port",
      { mutual: { secondaryPortId: "another.secondary" } },
    ],
    [
      "primary reference plane",
      { mutual: { primaryReferencePlaneId: "another.primary.plane" } },
    ],
    [
      "secondary reference plane",
      { mutual: { secondaryReferencePlaneId: "another.secondary.plane" } },
    ],
    [
      "primary material state",
      { mutual: { primaryMaterialStateId: "another.primary.state" } },
    ],
    [
      "secondary material state",
      { mutual: { secondaryMaterialStateId: "another.secondary.state" } },
    ],
    ["primary temperature", { mutual: { primaryTemperatureK: 700 } }],
    ["secondary temperature", { mutual: { secondaryTemperatureK: 1200 } }],
    [
      "primary material snapshot",
      { mutual: { primaryMaterialSnapshotId: PRIMARY_MATERIAL_B } },
    ],
    [
      "secondary material snapshot",
      { mutual: { secondaryMaterialSnapshotId: SECONDARY_MATERIAL_B } },
    ],
  ] as const)("fails closed for mismatched %s evidence", (_label, overrides) => {
    expectClosedFailure(
      input(overrides as InputOverrides),
      "insufficient_data",
      "F-01.snapshot_state_mismatch",
    );
  });

  it("rejects |k|>1 without clamping M or k", () => {
    const limit = Math.sqrt(
      BASE_PRIMARY.inductanceH * BASE_SECONDARY.inductanceH,
    );
    expectClosedFailure(
      input({ mutual: { mutualInductanceH: limit * 1.001 } }),
      "not_applicable",
      "F-01.coupling_out_of_domain",
    );
    expectClosedFailure(
      input({ mutual: { mutualInductanceH: -limit * 1.001 } }),
      "not_applicable",
      "F-01.coupling_out_of_domain",
    );
  });

  it.each([
    ["negative primary resistance", { primary: { resistanceOhm: -1 } }],
    ["zero primary inductance", { primary: { inductanceH: 0 } }],
    ["negative secondary resistance", { secondary: { resistanceOhm: -1 } }],
    ["zero secondary inductance", { secondary: { inductanceH: 0 } }],
    ["NaN mutual inductance", { mutual: { mutualInductanceH: Number.NaN } }],
    [
      "infinite mutual inductance",
      { mutual: { mutualInductanceH: Number.POSITIVE_INFINITY } },
    ],
    ["zero frequency", { primary: { frequencyHz: 0 } }],
    ["zero temperature", { secondary: { temperatureK: 0 } }],
    ["blank port", { primary: { portId: " " } }],
    ["unstable port ID", { primary: { portId: "port with spaces" } }],
    ["bad case snapshot", { primary: { caseSnapshotId: "case:not-a-hash" } }],
    [
      "bad material snapshot",
      { secondary: { materialSnapshotId: "material:not-a-hash" } },
    ],
    ["blank source", { mutual: { sourceRef: "" } }],
    ["unknown source kind", { mutual: { parameterSourceKind: "unknown" } }],
    ["unknown loaded state", { primary: { loadedState: "other" } }],
    ["unknown state match", { primary: { stateMatch: "other" } }],
    ["unknown basis", { mutual: { quantityBasis: "other" } }],
  ] as const)("rejects %s", (_label, overrides) => {
    expectClosedFailure(
      input(overrides as InputOverrides),
      "invalid_input",
    );
  });

  it("rejects positive-subnormal input values as a machine-only failure", () => {
    const candidates = [
      input({ primary: { resistanceOhm: Number.MIN_VALUE } }),
      input({ primary: { inductanceH: Number.MIN_VALUE } }),
      input({ secondary: { resistanceOhm: Number.MIN_VALUE } }),
      input({ secondary: { inductanceH: Number.MIN_VALUE } }),
      input({ mutual: { mutualInductanceH: Number.MIN_VALUE } }),
      withFrequency(Number.MIN_VALUE),
      input({
        primary: { temperatureK: Number.MIN_VALUE },
        mutual: { primaryTemperatureK: Number.MIN_VALUE },
      }),
      input({
        secondary: { temperatureK: Number.MIN_VALUE },
        mutual: { secondaryTemperatureK: Number.MIN_VALUE },
      }),
    ];
    for (const candidate of candidates) {
      expectClosedFailure(
        candidate,
        "invalid_input",
        "F-01.numeric_resolution_invalid",
      );
    }
  });

  it("fails closed for source-equation overflow and underflow", () => {
    const candidates = [
      withFrequency(Number.MAX_VALUE),
      input({
        primary: { inductanceH: Number.MAX_VALUE },
        secondary: { inductanceH: Number.MAX_VALUE },
      }),
      input({ secondary: { resistanceOhm: Number.MAX_VALUE } }),
      input({ mutual: { mutualInductanceH: 1e-200 } }),
      withFrequency(1e200),
    ];
    for (const candidate of candidates) {
      expectClosedFailure(
        candidate,
        "invalid_input",
        "F-01.numeric_resolution_invalid",
      );
    }
  });

  it("fails closed when a nonzero denominator term is swallowed", () => {
    const frequencyHz = 1e-10 / (2 * Math.PI);
    expectClosedFailure(
      withFrequency(frequencyHz, {
        primary: { inductanceH: 1, resistanceOhm: 1 },
        secondary: { inductanceH: 1, resistanceOhm: 1 },
        mutual: { mutualInductanceH: 0.5 },
      }),
      "invalid_input",
      "F-01.numeric_resolution_invalid",
    );
  });

  it("fails closed when a positive Rref is swallowed by R1", () => {
    expectClosedFailure(
      input({ primary: { resistanceOhm: 1e100 } }),
      "invalid_input",
      "F-01.numeric_resolution_invalid",
    );
  });

  it("fails closed when a positive inductance reduction is swallowed", () => {
    expectClosedFailure(
      withFrequency(1, {
        primary: { inductanceH: 1, resistanceOhm: 1 },
        secondary: { inductanceH: 1, resistanceOhm: 1 },
        mutual: { mutualInductanceH: 1e-100 },
      }),
      "invalid_input",
      "F-01.numeric_resolution_invalid",
    );
  });

  it("records the binary64 policy as machine-only, never an engineering threshold", () => {
    expect(F01_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(F01_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      boundaryKind: "machine_numeric_representability_only",
      binary64MinimumNormal: 2 ** -1022,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      swallowedNonzeroTermPolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      successOf(input()).evidence.numericRepresentabilityPolicy,
    ).toBe(F01_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("rejects top-level and nested extra keys", () => {
    expectClosedFailure(
      { ...input(), extra: 1 },
      "invalid_input",
      "F-01.input_schema_invalid",
    );
    expectClosedFailure(
      {
        ...input(),
        primary: { ...BASE_PRIMARY, extra: 1 },
      },
      "invalid_input",
      "F-01.primary_snapshot_invalid",
    );
    expectClosedFailure(
      {
        ...input(),
        mutual: { ...BASE_MUTUAL, extra: 1 },
      },
      "invalid_input",
      "F-01.mutual_snapshot_invalid",
    );
  });

  it("rejects non-plain input records and symbol keys", () => {
    const withPrototype = Object.assign(Object.create({ inherited: true }),
      input(),
    );
    const withSymbol = {
      ...input(),
      [Symbol("hidden")]: 1,
    };
    expectClosedFailure(withPrototype, "invalid_input");
    expectClosedFailure(withSymbol, "invalid_input");
  });

  it("fails closed without executing hostile accessors or reflection traps", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "modelRegime",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level getter");
        },
      },
    );
    const nestedAccessor = Object.defineProperty(
      { ...BASE_MUTUAL },
      "mutualInductanceH",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute nested getter");
        },
      },
    );
    const topProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys trap");
      },
    });
    const nestedProxy = new Proxy(BASE_PRIMARY, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile nested descriptor trap");
      },
    });
    const candidates = [
      topAccessor,
      { ...input(), mutual: nestedAccessor },
      topProxy,
      { ...input(), primary: nestedProxy },
    ];
    for (const candidate of candidates) {
      expect(() =>
        evaluateF01ReflectedImpedance(
          candidate as unknown as F01ReflectedImpedanceInput,
        ),
      ).not.toThrow();
      expectClosedFailure(candidate, "invalid_input");
    }
  });

  it("copies Proxy data descriptors without invoking a hostile get trap", () => {
    const primary = new Proxy(BASE_PRIMARY, {
      get() {
        throw new Error("F-01 must consume copied data descriptors, not get");
      },
    });
    const result = successOf({ ...input(), primary });
    expect(result.evidence.primaryParameterSnapshot).toEqual(BASE_PRIMARY);
  });

  it("does not coerce hostile enum or numeric objects", () => {
    const hostile = Object.freeze({
      valueOf() {
        throw new Error("must not coerce valueOf");
      },
      toString() {
        throw new Error("must not coerce toString");
      },
    });
    const candidates = [
      { ...input(), modelRegime: hostile },
      { ...input(), primary: { ...BASE_PRIMARY, resistanceOhm: hostile } },
      { ...input(), mutual: { ...BASE_MUTUAL, quantityBasis: hostile } },
      { ...input(), secondary: { ...BASE_SECONDARY, loadedState: hostile } },
    ];
    for (const candidate of candidates) {
      expect(() =>
        evaluateF01ReflectedImpedance(
          candidate as unknown as F01ReflectedImpedanceInput,
        ),
      ).not.toThrow();
      expectClosedFailure(candidate, "invalid_input");
    }
  });

  it("does not mutate caller input and deep-freezes successful evidence", () => {
    const candidate = input();
    const before = structuredClone(candidate);
    const result = successOf(candidate);
    expect(candidate).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Zin.valueSi)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.primaryParameterSnapshot)).toBe(
      true,
    );
    expect(Object.isFrozen(result.trace)).toBe(true);
    expect(Object.isFrozen(result.trace.equationAndSubstitution)).toBe(true);
    expect(Object.isFrozen(result.trace.path)).toBe(true);
  });
});
