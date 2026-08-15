import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  G08_BINARY64_MIN_NORMAL,
  G08_IMPLEMENTATION_READINESS,
  G08_INTERNAL_TOPOLOGY_ROUTES,
  G08_NUMERIC_REPRESENTABILITY_POLICY,
  G08_PARALLEL_RESONANCE_MAPPING,
  G08_WARNING_PREDICATES,
  evaluateG08ParallelResonance,
  type G08AvailableBranchVoltageEvidence,
  type G08InternalTopologyRoute,
  type G08ParallelResonanceInput,
  type G08ParallelResonanceSuccess,
  type G08PortBoundaryEvidence,
} from "../../../src/methods/G/g08ParallelResonance.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_ID = `case:${"8".repeat(64)}`;

function boundary(
  topologyId: G08InternalTopologyRoute =
    "parallel_ideal_r_l_c_branches",
  overrides: Partial<G08PortBoundaryEvidence> = {},
): G08PortBoundaryEvidence {
  return {
    caseSnapshotId: CASE_ID,
    electricalStateSnapshotId: "electrical-state:g08-hot-design",
    topologySnapshotId: "topology-snapshot:g08-v1",
    portSnapshotId: "port-snapshot:g08-input",
    topologyId,
    parallelNetworkId: "parallel-network:g08-1",
    portId: "port:g08-input",
    positiveTerminalId: "terminal:g08-positive",
    negativeTerminalId: "terminal:g08-negative",
    referencePlaneId: "reference-plane:g08-input",
    quantityBasis: "fundamental_rms",
    waveformDefinition: "approximately_sinusoidal_fundamental",
    loadedState: "workpiece_hot",
    designStateId: "design-state:g08-hot",
    frequencyHz: 10_000,
    timeBasisId: "time-basis:steady-fundamental",
    measurementWindowId: "window:g08-design",
    phasorTimeConvention: "exp_j_omega_t",
    currentDirection: "into_passive_port",
    ...overrides,
  };
}

function availableVoltage(
  binding: G08PortBoundaryEvidence,
  voltageV = 100,
  overrides: Partial<G08AvailableBranchVoltageEvidence> = {},
): G08AvailableBranchVoltageEvidence {
  return {
    kind: "available",
    voltageV,
    phaseReference: "port_voltage_is_zero_angle_reference",
    voltageEvidenceSnapshotId: "voltage-evidence:g08-port",
    sourceSnapshotId: "voltage-source:g08-port",
    binding: { ...binding },
    ...overrides,
  };
}

function inputFor(
  topologyId: G08InternalTopologyRoute =
    "parallel_ideal_r_l_c_branches",
  options: Readonly<{
    readonly resistanceOhm?: number;
    readonly inductanceH?: number;
    readonly capacitanceF?: number;
    readonly frequencyHz?: number;
    readonly voltageV?: number | null;
    readonly loadedState?: G08PortBoundaryEvidence["loadedState"];
    readonly designStateId?: string;
    readonly stateRoute?:
      | "loaded_design_state"
      | "unloaded_reference_only"
      | "unknown_or_unconfirmed";
  }> = {},
): G08ParallelResonanceInput {
  const port = boundary(topologyId, {
    frequencyHz: options.frequencyHz ?? 10_000,
    loadedState: options.loadedState ?? "workpiece_hot",
    designStateId: options.designStateId ?? "design-state:g08-hot",
  });
  const ideal = topologyId === "parallel_ideal_r_l_c_branches";
  const resistanceOhm =
    options.resistanceOhm ?? (ideal ? 5 : 0.05);
  const capacitanceF =
    options.capacitanceF ??
    (ideal ? 25.33029591e-6 : 25.17089933e-6);
  const stateRoute = options.stateRoute ?? "loaded_design_state";
  return {
    topology: {
      topologyId,
      parallelNetworkId: port.parallelNetworkId,
      topologySnapshotId: port.topologySnapshotId,
      sourceSnapshotId: "topology-source:g08-controlled",
      resistancePlacement: ideal
        ? "independent_parallel_resistor_branch"
        : "series_resistance_in_rl_branch",
      networkModelRegime: "ideal_lumped_linear_single_frequency",
    },
    port: { ...port },
    resistance: {
      resistanceOhm,
      componentId: "component:g08-r",
      branchId: ideal ? "branch:g08-r" : "branch:g08-rl",
      elementRole: ideal
        ? "independent_parallel_resistor_branch"
        : "series_resistance_in_rl_branch",
      elementSnapshotId: "element-snapshot:g08-r",
      sourceSnapshotId: "element-source:g08-r",
      binding: { ...port },
    },
    inductance: {
      inductanceH: options.inductanceH ?? 10e-6,
      componentId: "component:g08-l",
      branchId: ideal ? "branch:g08-l" : "branch:g08-rl",
      elementRole: ideal
        ? "independent_parallel_inductor_branch"
        : "series_inductance_in_rl_branch",
      stateRoute,
      elementSnapshotId: "element-snapshot:g08-l",
      sourceSnapshotId: "element-source:g08-l",
      binding: { ...port },
    },
    capacitance: {
      capacitanceF,
      componentId: "component:g08-c",
      branchId: "branch:g08-c",
      elementRole: ideal
        ? "independent_parallel_capacitor_branch"
        : "parallel_capacitor_across_series_rl_branch",
      elementSnapshotId: "element-snapshot:g08-c",
      sourceSnapshotId: "element-source:g08-c",
      binding: { ...port },
    },
    nonIdealEffects: {
      capacitorParasitics: "explicitly_excluded_or_confirmed_negligible",
      inductorParasitics: "explicitly_excluded_or_confirmed_negligible",
      interconnectParasitics: "explicitly_excluded_or_confirmed_negligible",
      switchingHarmonics: "explicitly_excluded_or_confirmed_negligible",
      unmodelledNetworkElements:
        "explicitly_excluded_or_confirmed_negligible",
      assessmentSnapshotId: "assessment-snapshot:g08-nonideal",
      sourceSnapshotId: "assessment-source:g08-nonideal",
      binding: { ...port },
    },
    branchVoltage:
      options.voltageV === undefined || options.voltageV === null
        ? {
            kind: "not_available",
            reason: "controlled_voltage_not_supplied",
          }
        : availableVoltage(port, options.voltageV),
  };
}

function successOf(value: unknown): G08ParallelResonanceSuccess {
  const result = evaluateG08ParallelResonance(
    value as G08ParallelResonanceInput,
  );
  if (result.status === "success_with_warnings") {
    expect(result.status).toBe("success_with_warnings");
    return result;
  }
  throw new Error(
    `Expected G-08 success, received ${result.status}/${result.failure.code}: ${result.failure.message}`,
  );
}

function expectFailureWithoutPayload(
  value: unknown,
  expectedStatus?: "invalid_input" | "insufficient_data" | "not_applicable",
  expectedCode?: string,
): void {
  const result = evaluateG08ParallelResonance(
    value as G08ParallelResonanceInput,
  );
  expect(["invalid_input", "insufficient_data", "not_applicable"]).toContain(
    result.status,
  );
  if (expectedStatus !== undefined) {
    expect(result.status).toBe(expectedStatus);
  }
  if (result.status !== "success_with_warnings") {
    if (expectedCode !== undefined) {
      expect(result.failure.code).toBe(expectedCode);
    }
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
    expect("equations" in result).toBe(false);
    expect("substitution" in result).toBe(false);
    expect("inputSnapshot" in result).toBe(false);
    expect("solverResiduals" in result).toBe(false);
    expect("resonanceDiagnostics" in result).toBe(false);
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.methodMapping).toBe(G08_PARALLEL_RESONANCE_MAPPING);
  }
}

function replaceEveryBoundary(
  input: G08ParallelResonanceInput,
  changes: Partial<G08PortBoundaryEvidence>,
): G08ParallelResonanceInput {
  const nextPort = { ...input.port, ...changes };
  return {
    ...input,
    port: nextPort,
    resistance: {
      ...input.resistance,
      binding: { ...input.resistance.binding, ...changes },
    },
    inductance: {
      ...input.inductance,
      binding: { ...input.inductance.binding, ...changes },
    },
    capacitance: {
      ...input.capacitance,
      binding: { ...input.capacitance.binding, ...changes },
    },
    nonIdealEffects: {
      ...input.nonIdealEffects,
      binding: { ...input.nonIdealEffects.binding, ...changes },
    },
    branchVoltage:
      input.branchVoltage.kind === "available"
        ? {
            ...input.branchVoltage,
            binding: { ...input.branchVoltage.binding, ...changes },
          }
        : input.branchVoltage,
  };
}

describe("G-08 controlled parallel-resonance family", () => {
  describe("frozen mapping and activation boundary", () => {
    it("maps exactly to the frozen parent without inventing child IDs, confidence or warning IDs", () => {
      expect(G08_PARALLEL_RESONANCE_MAPPING).toMatchObject({
        methodId: "G-08",
        methodVersion: "1.0.0-gate0",
        approvalStatus: "approved_with_limitation",
        methodType: "analytical",
        equationRef: "CALCULATION_CONTRACTS.md#G-08:Equation",
        sourceRefs: ["ID-RLC-02", "ADR-0007"],
        contractSourceRefs: ["ID-RLC-02", "ADR-0007", "DER-CIRCUIT"],
        derivationRefs: ["ID-RLC-02", "DER-CIRCUIT"],
        validationCaseIds: ["PWR-PAR-IDEAL-001", "PWR-PAR-RL-001"],
        methodCheckIds: [],
        inputParameterIds: ["topology", "R", "L", "C", "f"],
        outputQuantityIds: ["Yin", "Zin", "f0", "branch V/I"],
        stableWarningIds: [],
        scientificConfidence: null,
        requiresSubmethodSplit: true,
      });
      expect(G08_PARALLEL_RESONANCE_MAPPING.warningPredicates).toEqual([
        G08_WARNING_PREDICATES.seriesLossTreatedAsParallel,
        G08_WARNING_PREDICATES.nonpositiveRootReportedAsResonance,
        G08_WARNING_PREDICATES.seriesStressRelationsReused,
        G08_WARNING_PREDICATES.parasiticsIgnored,
      ]);
      expect(G08_INTERNAL_TOPOLOGY_ROUTES).toEqual([
        "parallel_ideal_r_l_c_branches",
        "parallel_c_with_series_rl_load",
      ]);
      expect(
        G08_INTERNAL_TOPOLOGY_ROUTES.every(
          (route) => !/^[A-J]-\d{2}$/u.test(route),
        ),
      ).toBe(true);
    });

    it("remains isolated, nonactivatable and absent from the public API", async () => {
      expect(G08_IMPLEMENTATION_READINESS).toMatchObject({
        isolationStatus: "implemented_not_runtime_activated",
        runtimeActivation: "blocked",
        registryParentRequiresSubmethodSplit: true,
        registeredChildMethodIds: [],
        internalTopologyRoutesAreMethodIds: false,
        scientificConfidence: null,
      });
      const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-08"));
      expect(specification.requiresSubmethodSplit).toBe(true);
      expect(specification.implementationAvailable).toBe(false);
      expect(specification.executable).toBe(false);
      expect(
        METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("G-08")),
      ).toBe(false);
      const publicApi: object = await import("../../../src/public-api.js");
      expect("evaluateG08ParallelResonance" in publicApi).toBe(false);
    });

    it("uses only machine representability guards and never an engineering threshold", () => {
      expect(G08_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
        policy: "machine_numeric_representability_only",
        engineeringThreshold: false,
        positiveSubnormalInputPolicy: "fail_closed",
        positiveSubnormalIntermediatePolicy: "fail_closed",
        overflowPolicy: "fail_closed",
        falseZeroPolicy: "fail_closed",
        swallowedNonzeroTermPolicy: "fail_closed_bidirectional",
        resonanceResidualClamping: false,
        sourceEquationRearranged: false,
        minimumPositiveNormal: 2 ** -1022,
      });
    });
  });

  describe("parallel_ideal_r_l_c_branches", () => {
    it("replays PWR-PAR-IDEAL-001 without forcing its rounded-C residual to zero", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches");
      const result = successOf(input);
      expect(result.internalTopologyRoute).toBe(
        "parallel_ideal_r_l_c_branches",
      );
      expect(result.internalTopologyRouteIsMethodId).toBe(false);
      expect(result.runtimeActivation).toBe(
        "blocked_requires_registered_child_split",
      );
      expect(result.scientificConfidence).toBeNull();
      expect(result.validationCaseIdForInternalRoute).toBe(
        "PWR-PAR-IDEAL-001",
      );
      const omega = 2 * Math.PI * input.port.frequencyHz;
      const expectedG = 1 / input.resistance.resistanceOhm;
      const expectedB =
        omega * input.capacitance.capacitanceF -
        1 / (omega * input.inductance.inductanceH);
      const denominator = expectedG * expectedG + expectedB * expectedB;
      expect(result.value.Yin.valueSi).toEqual({
        realS: expectedG,
        imaginaryS: expectedB,
      });
      expect(expectedB).not.toBe(0);
      expect(result.value.Zin.valueSi.realOhm).toBe(expectedG / denominator);
      expect(result.value.Zin.valueSi.imaginaryOhm).toBe(
        -expectedB / denominator,
      );
      expect(result.value.Zin.valueSi.realOhm).toBeCloseTo(5, 12);
      expect(result.solverResiduals.operatingSusceptanceResidualS).toBe(
        expectedB,
      );
      expect(result.solverResiduals.resonanceResidualClamped).toBe(false);
      expect(result.value.f0.kind).toBe("available");
      if (result.value.f0.kind === "available") {
        expect(result.value.f0.valueSi).toBe(
          1 /
            (2 *
              Math.PI *
              Math.sqrt(
                input.inductance.inductanceH *
                  input.capacitance.capacitanceF,
              )),
        );
      }
      expect(result.resonanceDiagnostics.inputImpedanceAtResonance).toMatchObject(
        {
          kind: "available",
          valueSi: 5,
          interpretation: "parallel_ideal_resonance_impedance_equals_Rp",
        },
      );
    });

    it("leaves branch quantities unavailable without a controlled voltage and never defaults to 1 V", () => {
      const result = successOf(inputFor("parallel_ideal_r_l_c_branches"));
      const branches = result.value["branch V/I"];
      expect(branches).toEqual({
        kind: "unavailable",
        outputId: "branch V/I",
        status: "insufficient_data",
        requiredParameterId: "port.voltage_rms",
        reason: "explicit_same_port_rms_voltage_evidence_was_not_supplied",
      });
      expect("value" in branches).toBe(false);
      expect("evidence" in branches).toBe(false);
      expect(result.portBoundary.branchVoltageDefaultApplied).toBe(false);
      expect(result.portBoundary.seriesStressRelationsReused).toBe(false);
      expect(JSON.stringify(result)).not.toContain("default_1_V");
    });

    it("publishes three RMS branch phasors only from explicit same-port voltage evidence", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches", {
        voltageV: 100,
      });
      const result = successOf(input);
      const output = result.value["branch V/I"];
      expect(output.kind).toBe("available");
      if (output.kind !== "available") return;
      const omega = 2 * Math.PI * input.port.frequencyHz;
      const ir = 100 / input.resistance.resistanceOhm;
      const il = 100 / (omega * input.inductance.inductanceH);
      const ic = 100 * omega * input.capacitance.capacitanceF;
      expect(output.voltageParameterId).toBe("port.voltage_rms");
      expect(output.voltageEvidenceSnapshotId).toBe(
        "voltage-evidence:g08-port",
      );
      expect(output.branches).toEqual([
        {
          branchId: "branch:g08-r",
          branchRole: "independent_parallel_resistor_branch",
          voltage: { realV: 100, imaginaryV: 0 },
          current: { realA: ir, imaginaryA: 0 },
        },
        {
          branchId: "branch:g08-l",
          branchRole: "independent_parallel_inductor_branch",
          voltage: { realV: 100, imaginaryV: 0 },
          current: { realA: 0, imaginaryA: -il },
        },
        {
          branchId: "branch:g08-c",
          branchRole: "independent_parallel_capacitor_branch",
          voltage: { realV: 100, imaginaryV: 0 },
          current: { realA: 0, imaginaryA: ic },
        },
      ]);
      expect(output.inputCurrent.realA).toBe(ir);
      expect(output.inputCurrent.imaginaryA).toBe(
        100 * result.value.Yin.valueSi.imaginaryS,
      );
      expect(Math.abs(output.inputCurrentIdentityResidual.realA)).toBe(0);
      expect(Math.abs(output.inputCurrentIdentityResidual.imaginaryA)).toBeLessThan(
        1e-12,
      );
    });

    it("preserves the explicit zero-voltage analytical limit", () => {
      const result = successOf(
        inputFor("parallel_ideal_r_l_c_branches", { voltageV: 0 }),
      );
      const branches = result.value["branch V/I"];
      expect(branches.kind).toBe("available");
      if (branches.kind === "available") {
        expect(branches.inputCurrent).toEqual({ realA: 0, imaginaryA: 0 });
        for (const branch of branches.branches) {
          expect(branch.voltage).toEqual({ realV: 0, imaginaryV: 0 });
          expect(branch.current).toEqual({ realA: 0, imaginaryA: 0 });
        }
      }
    });

    it("preserves inductive, resonant and capacitive signed-susceptance limits", () => {
      const l = 10e-6;
      const c = 25e-6;
      const f0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
      const low = successOf(
        inputFor("parallel_ideal_r_l_c_branches", {
          inductanceH: l,
          capacitanceF: c,
          frequencyHz: f0 / 2,
        }),
      );
      const at = successOf(
        inputFor("parallel_ideal_r_l_c_branches", {
          inductanceH: l,
          capacitanceF: c,
          frequencyHz: f0,
        }),
      );
      const high = successOf(
        inputFor("parallel_ideal_r_l_c_branches", {
          inductanceH: l,
          capacitanceF: c,
          frequencyHz: f0 * 2,
        }),
      );
      expect(low.value.Yin.valueSi.imaginaryS).toBeLessThan(0);
      expect(Math.abs(at.value.Yin.valueSi.imaginaryS)).toBeLessThan(1e-15);
      expect(high.value.Yin.valueSi.imaginaryS).toBeGreaterThan(0);
      expect(low.value.Zin.valueSi.imaginaryOhm).toBeGreaterThan(0);
      expect(high.value.Zin.valueSi.imaginaryOhm).toBeLessThan(0);
    });
  });

  describe("parallel_c_with_series_rl_load", () => {
    it("replays PWR-PAR-RL-001 with the exact expanded admittance and rounded-C residual", () => {
      const input = inputFor("parallel_c_with_series_rl_load");
      const result = successOf(input);
      const omega = 2 * Math.PI * input.port.frequencyHz;
      const omegaL = omega * input.inductance.inductanceH;
      const denominator =
        input.resistance.resistanceOhm ** 2 + omegaL ** 2;
      const expectedG = input.resistance.resistanceOhm / denominator;
      const expectedB =
        omega * input.capacitance.capacitanceF - omegaL / denominator;
      const magnitudeSquared = expectedG ** 2 + expectedB ** 2;
      expect(result.internalTopologyRoute).toBe(
        "parallel_c_with_series_rl_load",
      );
      expect(result.validationCaseIdForInternalRoute).toBe("PWR-PAR-RL-001");
      expect(result.value.Yin.valueSi).toEqual({
        realS: expectedG,
        imaginaryS: expectedB,
      });
      expect(expectedB).not.toBe(0);
      expect(result.value.Zin.valueSi.realOhm).toBe(
        expectedG / magnitudeSquared,
      );
      expect(result.value.Zin.valueSi.imaginaryOhm).toBe(
        -expectedB / magnitudeSquared,
      );
      expect(result.value.Zin.valueSi.realOhm).toBeCloseTo(
        7.945683521,
        9,
      );
      expect(result.value.Zin.valueSi.imaginaryOhm).not.toBe(0);
      const rootSq =
        1 /
          (input.inductance.inductanceH *
            input.capacitance.capacitanceF) -
        (input.resistance.resistanceOhm / input.inductance.inductanceH) ** 2;
      expect(result.resonanceDiagnostics.rootSquaredRad2PerS2).toBe(rootSq);
      expect(result.value.f0.kind).toBe("available");
      if (result.value.f0.kind === "available") {
        expect(result.value.f0.valueSi).toBe(
          Math.sqrt(rootSq) / (2 * Math.PI),
        );
        expect(result.value.f0.valueSi).toBeCloseTo(10_000, 6);
      }
      const zRes = result.resonanceDiagnostics.inputImpedanceAtResonance;
      expect(zRes.kind).toBe("available");
      if (zRes.kind === "available") {
        expect(zRes.valueSi).toBe(
          input.inductance.inductanceH /
            (input.capacitance.capacitanceF *
              input.resistance.resistanceOhm),
        );
        expect(zRes.valueSi).toBeCloseTo(7.945683521, 8);
      }
    });

    it("publishes only the series-RL and parallel-C branch phasors", () => {
      const input = inputFor("parallel_c_with_series_rl_load", {
        voltageV: 80,
      });
      const result = successOf(input);
      const output = result.value["branch V/I"];
      expect(output.kind).toBe("available");
      if (output.kind !== "available") return;
      const omega = 2 * Math.PI * input.port.frequencyHz;
      const omegaL = omega * input.inductance.inductanceH;
      const denominator =
        input.resistance.resistanceOhm ** 2 + omegaL ** 2;
      expect(output.branches).toHaveLength(2);
      expect(output.branches[0]).toEqual({
        branchId: "branch:g08-rl",
        branchRole: "series_rl_branch",
        voltage: { realV: 80, imaginaryV: 0 },
        current: {
          realA: 80 * (input.resistance.resistanceOhm / denominator),
          imaginaryA: -(80 * (omegaL / denominator)),
        },
      });
      expect(output.branches[1]).toEqual({
        branchId: "branch:g08-c",
        branchRole: "parallel_capacitor_branch",
        voltage: { realV: 80, imaginaryV: 0 },
        current: {
          realA: 0,
          imaginaryA: 80 * (omega * input.capacitance.capacitanceF),
        },
      });
      expect(result.portBoundary.seriesStressRelationsReused).toBe(false);
      expect(output.branches.map((item) => item.branchRole)).not.toContain(
        "series_capacitor_stress",
      );
    });

    it.each([
      { resistanceOhm: 2, inductanceH: 1, capacitanceF: 1, label: "negative" },
      { resistanceOhm: 1, inductanceH: 1, capacitanceF: 1, label: "zero" },
    ])(
      "keeps arbitrary-frequency Yin/Zin available but f0 unavailable for a $label root",
      ({ resistanceOhm, inductanceH, capacitanceF }) => {
        const result = successOf(
          inputFor("parallel_c_with_series_rl_load", {
            resistanceOhm,
            inductanceH,
            capacitanceF,
            frequencyHz: 1,
          }),
        );
        expect(result.value.Yin.kind).toBe("available");
        expect(result.value.Zin.kind).toBe("available");
        expect(Number.isFinite(result.value.Zin.valueSi.realOhm)).toBe(true);
        expect(result.value.f0).toEqual({
          kind: "unavailable",
          outputId: "f0",
          status: "no_feasible_solution",
          reason: "root_squared_nonpositive_no_physical_positive_resonance",
        });
        expect("value" in result.value.f0).toBe(false);
        expect("evidence" in result.value.f0).toBe(false);
        const zRes = result.resonanceDiagnostics.inputImpedanceAtResonance;
        expect(zRes).toEqual({
          kind: "unavailable",
          status: "no_feasible_solution",
          reason: "root_squared_nonpositive_no_physical_positive_resonance",
        });
        expect("value" in zRes).toBe(false);
        expect(result.resonanceDiagnostics.positivePhysicalRootExists).toBe(
          false,
        );
        expect(result.solverResiduals.resonanceSusceptanceResidualS).toBeNull();
      },
    );

    it("approaches the ideal LC frequency from below as positive Rs decreases", () => {
      const l = 10e-6;
      const c = 25e-6;
      const idealF0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
      const highR = successOf(
        inputFor("parallel_c_with_series_rl_load", {
          resistanceOhm: 0.1,
          inductanceH: l,
          capacitanceF: c,
        }),
      );
      const lowR = successOf(
        inputFor("parallel_c_with_series_rl_load", {
          resistanceOhm: 0.001,
          inductanceH: l,
          capacitanceF: c,
        }),
      );
      expect(highR.value.f0.kind).toBe("available");
      expect(lowR.value.f0.kind).toBe("available");
      if (
        highR.value.f0.kind === "available" &&
        lowR.value.f0.kind === "available"
      ) {
        expect(highR.value.f0.valueSi).toBeLessThan(lowR.value.f0.valueSi);
        expect(lowR.value.f0.valueSi).toBeLessThan(idealF0);
      }
    });

    it("preserves the inductive/capacitive sign change around the positive practical root", () => {
      const base = inputFor("parallel_c_with_series_rl_load");
      const rootSq =
        1 /
          (base.inductance.inductanceH * base.capacitance.capacitanceF) -
        (base.resistance.resistanceOhm / base.inductance.inductanceH) ** 2;
      const f0 = Math.sqrt(rootSq) / (2 * Math.PI);
      const low = successOf(
        inputFor("parallel_c_with_series_rl_load", { frequencyHz: f0 / 2 }),
      );
      const high = successOf(
        inputFor("parallel_c_with_series_rl_load", { frequencyHz: f0 * 2 }),
      );
      expect(low.value.Yin.valueSi.imaginaryS).toBeLessThan(0);
      expect(high.value.Yin.valueSi.imaginaryS).toBeGreaterThan(0);
    });
  });

  describe("dimensional and topology scaling identities", () => {
    it.each(G08_INTERNAL_TOPOLOGY_ROUTES)(
      "preserves f0 and scales Y by 1/k and Z by k under impedance scaling for %s",
      (route) => {
        const baseInput = inputFor(route, { voltageV: 50 });
        const k = 4;
        const scaledInput = inputFor(route, {
          resistanceOhm: baseInput.resistance.resistanceOhm * k,
          inductanceH: baseInput.inductance.inductanceH * k,
          capacitanceF: baseInput.capacitance.capacitanceF / k,
          voltageV: 50,
        });
        const base = successOf(baseInput);
        const scaled = successOf(scaledInput);
        expect(scaled.value.Yin.valueSi.realS).toBeCloseTo(
          base.value.Yin.valueSi.realS / k,
          13,
        );
        expect(scaled.value.Yin.valueSi.imaginaryS).toBeCloseTo(
          base.value.Yin.valueSi.imaginaryS / k,
          13,
        );
        expect(scaled.value.Zin.valueSi.realOhm).toBeCloseTo(
          base.value.Zin.valueSi.realOhm * k,
          13,
        );
        expect(scaled.value.Zin.valueSi.imaginaryOhm).toBeCloseTo(
          base.value.Zin.valueSi.imaginaryOhm * k,
          13,
        );
        expect(base.value.f0.kind).toBe("available");
        expect(scaled.value.f0.kind).toBe("available");
        if (
          base.value.f0.kind === "available" &&
          scaled.value.f0.kind === "available"
        ) {
          expect(scaled.value.f0.valueSi).toBeCloseTo(
            base.value.f0.valueSi,
            13,
          );
        }
        const baseBranches = base.value["branch V/I"];
        const scaledBranches = scaled.value["branch V/I"];
        expect(baseBranches.kind).toBe("available");
        expect(scaledBranches.kind).toBe("available");
        if (
          baseBranches.kind === "available" &&
          scaledBranches.kind === "available"
        ) {
          expect(scaledBranches.inputCurrent.realA).toBeCloseTo(
            baseBranches.inputCurrent.realA / k,
            13,
          );
          expect(scaledBranches.inputCurrent.imaginaryA).toBeCloseTo(
            baseBranches.inputCurrent.imaginaryA / k,
            13,
          );
        }
      },
    );

    it("reports canonical SI dimensions and units without geometry or mass-flow substitution", () => {
      const result = successOf(inputFor("parallel_ideal_r_l_c_branches"));
      expect(result.value.Yin).toMatchObject({
        dimensionId: "electrical_conductance",
        canonicalUnitId: "S",
      });
      expect(result.value.Zin).toMatchObject({
        dimensionId: "electrical_resistance",
        canonicalUnitId: "ohm",
      });
      expect(result.value.f0).toMatchObject({
        dimensionId: "frequency",
        canonicalUnitId: "Hz",
      });
      expect(JSON.stringify(result)).not.toMatch(/kg\/s|m_per_s|mass_flow/iu);
    });
  });

  describe("topology, state and applicability fail-closed routes", () => {
    it.each([
      "series_rlc_single_loop",
      "ideal_transformer",
      "llc_zjl_fig2_6_fundamental_equivalent",
    ] as const)("rejects known non-G08 topology %s as not applicable", (id) => {
      const input = inputFor("parallel_ideal_r_l_c_branches") as unknown as Record<
        string,
        unknown
      >;
      const topology = {
        ...(input.topology as Record<string, unknown>),
        topologyId: id,
      };
      expectFailureWithoutPayload(
        { ...input, topology },
        "not_applicable",
        "G-08.topology_not_applicable",
      );
    });

    it("does not infer a route from unknown topology evidence", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...input,
          topology: { ...input.topology, topologyId: "unknown_or_unconfirmed" },
        },
        "insufficient_data",
        "G-08.topology_unknown",
      );
    });

    it.each([
      "capacitorParasitics",
      "inductorParasitics",
      "interconnectParasitics",
      "switchingHarmonics",
      "unmodelledNetworkElements",
    ] as const)("rejects known material %s", (field) => {
      const input = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...input,
          nonIdealEffects: {
            ...input.nonIdealEffects,
            [field]: "present_or_material",
          },
        },
        "not_applicable",
        "G-08.nonideal_effects_not_applicable",
      );
    });

    it.each([
      "capacitorParasitics",
      "inductorParasitics",
      "interconnectParasitics",
      "switchingHarmonics",
      "unmodelledNetworkElements",
    ] as const)("fails closed when %s is unknown", (field) => {
      const input = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...input,
          nonIdealEffects: {
            ...input.nonIdealEffects,
            [field]: "unknown_or_unconfirmed",
          },
        },
        "insufficient_data",
        "G-08.nonideal_effects_unknown",
      );
    });

    it("prioritizes a known material nonideal effect over an unrelated unknown topology", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...input,
          topology: { ...input.topology, topologyId: "unknown_or_unconfirmed" },
          nonIdealEffects: {
            ...input.nonIdealEffects,
            switchingHarmonics: "present_or_material",
          },
        },
        "not_applicable",
        "G-08.nonideal_effects_not_applicable",
      );
    });

    it.each([
      ["peak", "not_applicable", "G-08.port_basis_not_applicable"],
      ["unknown_or_unconfirmed", "insufficient_data", "G-08.port_basis_unknown"],
    ] as const)("classifies quantity basis %s", (quantityBasis, status, code) => {
      expectFailureWithoutPayload(
        replaceEveryBoundary(inputFor(), { quantityBasis }),
        status,
        code,
      );
    });

    it.each([
      [
        "known_multifrequency_or_switching",
        "not_applicable",
        "G-08.waveform_not_applicable",
      ],
      ["unknown_or_unconfirmed", "insufficient_data", "G-08.waveform_unknown"],
    ] as const)("classifies waveform %s", (waveformDefinition, status, code) => {
      expectFailureWithoutPayload(
        replaceEveryBoundary(inputFor(), { waveformDefinition }),
        status,
        code,
      );
    });

    it.each([
      [
        "known_other_convention",
        "not_applicable",
        "G-08.phasor_convention_not_applicable",
      ],
      [
        "unknown_or_unconfirmed",
        "insufficient_data",
        "G-08.phasor_convention_unknown",
      ],
    ] as const)("classifies phasor convention %s", (value, status, code) => {
      expectFailureWithoutPayload(
        replaceEveryBoundary(inputFor(), { phasorTimeConvention: value }),
        status,
        code,
      );
    });

    it.each([
      [
        "known_other_direction",
        "not_applicable",
        "G-08.current_direction_not_applicable",
      ],
      [
        "unknown_or_unconfirmed",
        "insufficient_data",
        "G-08.current_direction_unknown",
      ],
    ] as const)("classifies current direction %s", (value, status, code) => {
      expectFailureWithoutPayload(
        replaceEveryBoundary(inputFor(), { currentDirection: value }),
        status,
        code,
      );
    });

    it("rejects the distributed/switching/nonlinear model and fails closed on an unknown model", () => {
      const input = inputFor();
      expectFailureWithoutPayload(
        {
          ...input,
          topology: {
            ...input.topology,
            networkModelRegime: "distributed_switching_or_nonlinear",
          },
        },
        "not_applicable",
        "G-08.network_model_not_applicable",
      );
      expectFailureWithoutPayload(
        {
          ...input,
          topology: {
            ...input.topology,
            networkModelRegime: "unknown_or_unconfirmed",
          },
        },
        "insufficient_data",
        "G-08.network_model_unknown",
      );
    });

    it("never treats series Rs as independent Rp or the reverse", () => {
      const ideal = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...ideal,
          resistance: {
            ...ideal.resistance,
            elementRole: "series_resistance_in_rl_branch",
          },
        },
        "invalid_input",
        "G-08.topology_element_role_inconsistent",
      );
      const practical = inputFor("parallel_c_with_series_rl_load");
      expectFailureWithoutPayload(
        {
          ...practical,
          topology: {
            ...practical.topology,
            resistancePlacement: "independent_parallel_resistor_branch",
          },
        },
        "invalid_input",
        "G-08.topology_element_role_inconsistent",
      );
    });

    it("requires three independent branch identities for route A and one shared RL branch for route B", () => {
      const ideal = inputFor("parallel_ideal_r_l_c_branches");
      expectFailureWithoutPayload(
        {
          ...ideal,
          inductance: {
            ...ideal.inductance,
            branchId: ideal.resistance.branchId,
          },
        },
        "invalid_input",
        "G-08.branch_topology_inconsistent",
      );
      const practical = inputFor("parallel_c_with_series_rl_load");
      expectFailureWithoutPayload(
        {
          ...practical,
          inductance: {
            ...practical.inductance,
            branchId: "branch:g08-other-rl",
          },
        },
        "invalid_input",
        "G-08.branch_topology_inconsistent",
      );
    });

    it("prioritizes explicit unloaded-L substitution at a hot design port over unrelated unknowns", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches", {
        stateRoute: "unloaded_reference_only",
      });
      expectFailureWithoutPayload(
        {
          ...input,
          inductance: {
            ...input.inductance,
            binding: {
              ...input.inductance.binding,
              loadedState: "empty",
              designStateId: "design-state:empty-reference",
            },
          },
          nonIdealEffects: {
            ...input.nonIdealEffects,
            capacitorParasitics: "unknown_or_unconfirmed",
          },
        },
        "invalid_input",
        "G-08.inductance_route_inconsistent",
      );
    });

    it("accepts an explicitly empty unloaded-reference calculation without silently calling L loaded", () => {
      const result = successOf(
        inputFor("parallel_ideal_r_l_c_branches", {
          loadedState: "empty",
          designStateId: "design-state:g08-empty-reference",
          stateRoute: "unloaded_reference_only",
        }),
      );
      expect(result.inputSnapshot.loadedState).toBe("empty");
      expect(result.inputSnapshot.inductanceStateRoute).toBe(
        "unloaded_reference_only",
      );
    });

    it("fails closed on unknown element placement and inductance route", () => {
      const input = inputFor();
      expectFailureWithoutPayload(
        {
          ...input,
          capacitance: {
            ...input.capacitance,
            elementRole: "unknown_or_unconfirmed",
          },
        },
        "insufficient_data",
        "G-08.element_role_unknown",
      );
      expectFailureWithoutPayload(
        {
          ...input,
          inductance: {
            ...input.inductance,
            stateRoute: "unknown_or_unconfirmed",
          },
        },
        "insufficient_data",
        "G-08.inductance_route_unknown",
      );
    });

    it("does not publish branch phasors from unknown or incompatible voltage phase evidence", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches", { voltageV: 10 });
      if (input.branchVoltage.kind !== "available") throw new Error("fixture");
      expectFailureWithoutPayload(
        {
          ...input,
          branchVoltage: {
            ...input.branchVoltage,
            phaseReference: "unknown_or_unconfirmed",
          },
        },
        "insufficient_data",
        "G-08.branch_voltage_phase_unknown",
      );
      expectFailureWithoutPayload(
        {
          ...input,
          branchVoltage: {
            ...input.branchVoltage,
            phaseReference: "known_other_phase_reference",
          },
        },
        "not_applicable",
        "G-08.branch_voltage_phase_not_applicable",
      );
    });
  });

  describe("exact state/snapshot binding", () => {
    const mismatches: readonly Readonly<{
      readonly label: string;
      readonly patch: Partial<G08PortBoundaryEvidence>;
    }>[] = [
      { label: "case", patch: { caseSnapshotId: `case:${"9".repeat(64)}` } },
      {
        label: "electrical state",
        patch: { electricalStateSnapshotId: "electrical-state:other" },
      },
      { label: "topology snapshot", patch: { topologySnapshotId: "topology:other" } },
      { label: "port snapshot", patch: { portSnapshotId: "port-snapshot:other" } },
      { label: "network", patch: { parallelNetworkId: "parallel-network:other" } },
      { label: "port", patch: { portId: "port:other" } },
      { label: "positive terminal", patch: { positiveTerminalId: "terminal:other-p" } },
      { label: "negative terminal", patch: { negativeTerminalId: "terminal:other-n" } },
      { label: "reference plane", patch: { referencePlaneId: "plane:other" } },
      { label: "basis", patch: { quantityBasis: "rms" } },
      { label: "loaded state", patch: { loadedState: "workpiece_cold" } },
      { label: "design state", patch: { designStateId: "design-state:other" } },
      { label: "frequency", patch: { frequencyHz: 10_001 } },
      { label: "time basis", patch: { timeBasisId: "time-basis:other" } },
      { label: "window", patch: { measurementWindowId: "window:other" } },
    ];

    it.each(mismatches)(
      "rejects an element $label mismatch without tolerance matching",
      ({ patch }) => {
        const input = inputFor();
        expectFailureWithoutPayload(
          {
            ...input,
            capacitance: {
              ...input.capacitance,
              binding: { ...input.capacitance.binding, ...patch },
            },
          },
          "insufficient_data",
          "G-08.state_boundary_mismatch",
        );
      },
    );

    it("rejects mismatched nonideal and voltage snapshots rather than ignoring them", () => {
      const input = inputFor("parallel_ideal_r_l_c_branches", { voltageV: 10 });
      expectFailureWithoutPayload(
        {
          ...input,
          nonIdealEffects: {
            ...input.nonIdealEffects,
            binding: {
              ...input.nonIdealEffects.binding,
              measurementWindowId: "window:other",
            },
          },
        },
        "insufficient_data",
        "G-08.state_boundary_mismatch",
      );
      if (input.branchVoltage.kind !== "available") throw new Error("fixture");
      expectFailureWithoutPayload(
        {
          ...input,
          branchVoltage: {
            ...input.branchVoltage,
            binding: {
              ...input.branchVoltage.binding,
              referencePlaneId: "reference-plane:other",
            },
          },
        },
        "insufficient_data",
        "G-08.state_boundary_mismatch",
      );
    });

    it("captures element/source/topology/nonideal/optional-voltage snapshot identities", () => {
      const result = successOf(
        inputFor("parallel_c_with_series_rl_load", { voltageV: 25 }),
      );
      expect(result.inputSnapshot).toMatchObject({
        topologySnapshotId: "topology-snapshot:g08-v1",
        topologySourceSnapshotId: "topology-source:g08-controlled",
        resistanceElementSnapshotId: "element-snapshot:g08-r",
        resistanceSourceSnapshotId: "element-source:g08-r",
        inductanceElementSnapshotId: "element-snapshot:g08-l",
        inductanceSourceSnapshotId: "element-source:g08-l",
        capacitanceElementSnapshotId: "element-snapshot:g08-c",
        capacitanceSourceSnapshotId: "element-source:g08-c",
        nonIdealAssessmentSnapshotId: "assessment-snapshot:g08-nonideal",
        nonIdealSourceSnapshotId: "assessment-source:g08-nonideal",
        branchVoltageEvidenceSnapshotId: "voltage-evidence:g08-port",
        branchVoltageSourceSnapshotId: "voltage-source:g08-port",
      });
    });
  });

  describe("schema and hostile-input rejection", () => {
    it("fully validates later schema/enums before unknown or known-N/A semantic exits", () => {
      const input = inputFor();
      const attack = {
        ...input,
        topology: { ...input.topology, topologyId: "unknown_or_unconfirmed" },
        nonIdealEffects: {
          ...input.nonIdealEffects,
          switchingHarmonics: "present_or_material",
        },
        capacitance: {
          ...input.capacitance,
          elementRole: "bogus-later-enum",
        },
      };
      expectFailureWithoutPayload(
        attack,
        "invalid_input",
        "G-08.capacitance_evidence_invalid",
      );
    });

    it.each([
      null,
      undefined,
      [],
      new Date(),
      { topology: null },
      { ...inputFor(), extra: true },
      (() => {
        const { branchVoltage: _removed, ...rest } = inputFor();
        return rest;
      })(),
    ])("rejects hostile or non-exact top-level input %#", (value) => {
      expectFailureWithoutPayload(
        value,
        "invalid_input",
        "G-08.input_schema_invalid",
      );
    });

    it("rejects accessors without executing them", () => {
      let getterCalls = 0;
      const input = inputFor();
      const hostile = {
        ...input,
        get topology() {
          getterCalls += 1;
          return input.topology;
        },
      };
      expectFailureWithoutPayload(
        hostile,
        "invalid_input",
        "G-08.input_schema_invalid",
      );
      expect(getterCalls).toBe(0);
    });

    it("rejects symbol keys, custom prototypes and reflection-hostile proxies", () => {
      const input = inputFor();
      const symbolInput = { ...input, [Symbol("hidden")]: true };
      expectFailureWithoutPayload(
        symbolInput,
        "invalid_input",
        "G-08.input_schema_invalid",
      );
      class InputClass {
        topology = input.topology;
        port = input.port;
        resistance = input.resistance;
        inductance = input.inductance;
        capacitance = input.capacitance;
        nonIdealEffects = input.nonIdealEffects;
        branchVoltage = input.branchVoltage;
      }
      expectFailureWithoutPayload(
        new InputClass(),
        "invalid_input",
        "G-08.input_schema_invalid",
      );
      const proxy = new Proxy(input, {
        ownKeys() {
          throw new Error("hostile ownKeys");
        },
      });
      expectFailureWithoutPayload(
        proxy,
        "invalid_input",
        "G-08.input_schema_invalid",
      );
    });

    it("rejects missing, extra, array and accessor nested records", () => {
      const input = inputFor();
      expectFailureWithoutPayload(
        { ...input, topology: null },
        "insufficient_data",
        "G-08.topology_evidence_missing",
      );
      expectFailureWithoutPayload(
        { ...input, resistance: { ...input.resistance, extra: 1 } },
        "invalid_input",
        "G-08.resistance_evidence_invalid",
      );
      expectFailureWithoutPayload(
        { ...input, inductance: [] },
        "invalid_input",
        "G-08.inductance_evidence_invalid",
      );
      let calls = 0;
      const hostileCapacitance = {
        ...input.capacitance,
        get capacitanceF() {
          calls += 1;
          return input.capacitance.capacitanceF;
        },
      };
      expectFailureWithoutPayload(
        { ...input, capacitance: hostileCapacitance },
        "invalid_input",
        "G-08.capacitance_evidence_invalid",
      );
      expect(calls).toBe(0);
    });

    it("returns deeply frozen successful controlled records", () => {
      const result = successOf(inputFor("parallel_c_with_series_rl_load", { voltageV: 10 }));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.Yin.valueSi)).toBe(true);
      expect(Object.isFrozen(result.inputSnapshot)).toBe(true);
      expect(Object.isFrozen(result.resonanceDiagnostics)).toBe(true);
      const branches = result.value["branch V/I"];
      expect(Object.isFrozen(branches)).toBe(true);
      if (branches.kind === "available") {
        expect(Object.isFrozen(branches.branches)).toBe(true);
        expect(Object.isFrozen(branches.branches[0])).toBe(true);
      }
    });
  });

  describe("canonical-SI and binary64 fail-closed guards", () => {
    it.each([
      ["resistance", "resistanceOhm"],
      ["inductance", "inductanceH"],
      ["capacitance", "capacitanceF"],
    ] as const)("rejects zero, negative, nonfinite and positive-subnormal %s", (section, field) => {
      for (const value of [
        0,
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.MIN_VALUE,
      ]) {
        const input = inputFor();
        expectFailureWithoutPayload(
          {
            ...input,
            [section]: { ...input[section], [field]: value },
          },
          "invalid_input",
          `G-08.${section}_evidence_invalid`,
        );
      }
    });

    it.each([
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MIN_VALUE,
    ])("rejects invalid or subnormal frequency %s", (frequencyHz) => {
      const input = inputFor();
      expectFailureWithoutPayload(
        replaceEveryBoundary(input, { frequencyHz }),
        "invalid_input",
        "G-08.port_evidence_invalid",
      );
    });

    it.each([
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MIN_VALUE,
    ])("rejects invalid/subnormal explicit branch voltage %s", (voltageV) => {
      const input = inputFor("parallel_ideal_r_l_c_branches", { voltageV: 1 });
      if (input.branchVoltage.kind !== "available") throw new Error("fixture");
      expectFailureWithoutPayload(
        {
          ...input,
          branchVoltage: { ...input.branchVoltage, voltageV },
        },
        "invalid_input",
        "G-08.branch_voltage_evidence_invalid",
      );
    });

    it("fails closed on overflow and underflow in the frozen operation order", () => {
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          frequencyHz: Number.MAX_VALUE,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          frequencyHz: G08_BINARY64_MIN_NORMAL,
          inductanceH: G08_BINARY64_MIN_NORMAL,
          capacitanceF: 1,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          resistanceOhm: Number.MAX_VALUE,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_c_with_series_rl_load", {
          resistanceOhm: 1e200,
          inductanceH: 1,
          capacitanceF: 1,
          frequencyHz: 1,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_c_with_series_rl_load", {
          resistanceOhm: 1e-200,
          inductanceH: 1,
          capacitanceF: 1,
          frequencyHz: 1,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
    });

    it("detects both directions of a swallowed non-unit multiplier", () => {
      const almostOne = 1 - Number.EPSILON / 2;
      expect(almostOne).not.toBe(1);
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          inductanceH: G08_BINARY64_MIN_NORMAL,
          capacitanceF: almostOne,
          frequencyHz: 1 / (2 * Math.PI),
        }),
        "invalid_input",
        "G-08.nonzero_term_swallowed",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          inductanceH: almostOne,
          capacitanceF: G08_BINARY64_MIN_NORMAL,
          frequencyHz: 1 / (2 * Math.PI),
        }),
        "invalid_input",
        "G-08.nonzero_term_swallowed",
      );
    });

    it("detects either reactive term being swallowed rather than publishing the survivor", () => {
      for (const capacitanceF of [1e100, 1e-100]) {
        expectFailureWithoutPayload(
          inputFor("parallel_ideal_r_l_c_branches", {
            inductanceH: 1,
            capacitanceF,
            frequencyHz: 1,
          }),
          "invalid_input",
          "G-08.nonzero_term_swallowed",
        );
      }
    });

    it("fails closed when explicit branch-current scaling overflows or underflows", () => {
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          voltageV: Number.MAX_VALUE,
          resistanceOhm: 1,
          inductanceH: 1,
          capacitanceF: 1,
          frequencyHz: 1,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
      expectFailureWithoutPayload(
        inputFor("parallel_ideal_r_l_c_branches", {
          voltageV: G08_BINARY64_MIN_NORMAL,
          resistanceOhm: 5,
        }),
        "invalid_input",
        "G-08.numeric_resolution_invalid",
      );
    });

    it("keeps exact-one multipliers valid instead of misclassifying them as swallowed", () => {
      const result = successOf(
        inputFor("parallel_ideal_r_l_c_branches", {
          resistanceOhm: 1,
          voltageV: 1,
        }),
      );
      expect(result.value.Yin.valueSi.realS).toBe(1);
      const branches = result.value["branch V/I"];
      expect(branches.kind).toBe("available");
      if (branches.kind === "available") {
        expect(branches.branches[0]?.current.realA).toBe(1);
      }
    });
  });

  describe("warnings, trace and failure payload hygiene", () => {
    it("uses the frozen parasitics prose predicate without creating a stable warning ID", () => {
      const result = successOf(inputFor());
      expect(result.warningIds).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.predicate).toBe(
        G08_WARNING_PREDICATES.parasiticsIgnored,
      );
      expect("code" in (result.warnings[0] ?? {})).toBe(false);
      expect(result.warnings[0]?.message).toMatch(/explicit/i);
    });

    it("retains method/source/solver/precision/assumption trace without claiming FEM or calibration", () => {
      const result = successOf(inputFor("parallel_c_with_series_rl_load"));
      expect(result.sourceRefs).toEqual(["ID-RLC-02", "ADR-0007"]);
      expect(result.contractSourceRefs).toEqual([
        "ID-RLC-02",
        "ADR-0007",
        "DER-CIRCUIT",
      ]);
      expect(result.derivationRefs).toEqual(["ID-RLC-02", "DER-CIRCUIT"]);
      expect(result.validationCaseIds).toEqual([
        "PWR-PAR-IDEAL-001",
        "PWR-PAR-RL-001",
      ]);
      expect(result.methodCheckIds).toEqual([]);
      expect(result.solverResiduals).toMatchObject({
        solverUsed: false,
        classification: "analytical_closed_form_no_iterative_solver",
        resonanceResidualClamped: false,
      });
      expect(result.engineeringPrecision).toEqual({
        arithmetic: "IEEE-754_binary64",
        coreRounding: "none",
        precisionClaim: "limited_by_input_precision_and_model_applicability",
      });
      expect(JSON.stringify(result)).not.toMatch(/FEM|calibrat/iu);
    });
  });
});
