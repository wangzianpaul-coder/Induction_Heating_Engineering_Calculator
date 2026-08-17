import { describe, expect, it } from "vitest";

import {
  createCalculationResult,
  createFailedCalculationResult,
  createSuccessfulCalculationResult,
  type EngineeringOutputEnvelope,
  type FailedCalculationResultInput,
  type SolverTerminationStatus,
  type SuccessfulCalculationResultInput,
} from "../../src/domain/result.js";
import { createCalculationTrace } from "../../src/domain/trace.js";
import { createWarningRecord } from "../../src/domain/warning.js";
import {
  METHOD_SPECIFICATION_REGISTRY,
  MethodNotExecutableError,
} from "../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT_ID = `case:${"a".repeat(64)}`;
const GEOMETRY_SNAPSHOT_ID = `geometry:${"b".repeat(64)}`;
const MATERIAL_SNAPSHOT_ID = `material:${"c".repeat(64)}`;

function traceFor(
  methodId: string,
  status: string,
  options: {
    readonly equationSources?: readonly string[];
    readonly snapshotIds?: readonly string[];
    readonly methodVersion?: string;
    readonly methodApproval?: string;
    readonly equationRef?: string;
  } = {},
) {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(
    methodId as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
  );
  const snapshotIds = options.snapshotIds ?? [
    CASE_SNAPSHOT_ID,
    GEOMETRY_SNAPSHOT_ID,
    MATERIAL_SNAPSHOT_ID,
  ];
  const inputNodes = snapshotIds.map((snapshotId, index) => ({
    nodeId: `trace.input.${index}`,
    kind: "input_snapshot" as const,
    label: `Input Snapshot ${index + 1}`,
    payload: { snapshotId },
  }));
  const methodNodeId = "trace.method";
  const equationNodeId = "trace.equation";
  return createCalculationTrace({
    nodes: [
      ...inputNodes,
      {
        nodeId: methodNodeId,
        kind: "method",
        label: "Result Method",
        dependsOn: inputNodes.map((node) => node.nodeId),
        payload: {
          role: "result_method",
          methodId,
          methodVersion: options.methodVersion ?? specification.methodVersion,
          methodApproval:
            options.methodApproval ?? specification.approvalStatus,
        },
      },
      {
        nodeId: equationNodeId,
        kind: "equation",
        label: "Controlled Equation",
        dependsOn: [methodNodeId],
        payload: {
          equationRef:
            options.equationRef ?? specification.contractEquationRef,
        },
        sourceRefs: options.equationSources ?? specification.sourceRefs,
      },
      {
        nodeId: "trace.result",
        kind: "result",
        label: "Result",
        dependsOn: [equationNodeId],
        payload: { status },
      },
    ],
  });
}

function solverReport(terminationStatus: SolverTerminationStatus) {
  if (terminationStatus === "converged") {
    return {
      terminationStatus,
      iterationCount: 4,
      residuals: [
        {
          residualId: "solver.energy_residual",
          valueSi: 0.01,
          dimensionId: "energy" as const,
          canonicalUnitId: "J" as const,
          toleranceSi: 0.1,
          satisfied: true,
        },
      ],
      reason: "The declared residual tolerance was satisfied.",
    };
  }
  return {
    terminationStatus,
    iterationCount: 0,
    residuals: [],
    reason:
      terminationStatus === "not_required"
        ? "The registered method does not require an iterative solver."
        : `Calculation terminated with ${terminationStatus}.`,
  };
}

function contextFor(
  methodId: string,
  terminationStatus: SolverTerminationStatus,
) {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(
    methodId as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
  );
  return {
    scientificConfidence: specification.scientificConfidence,
    scientificConfidenceReason: specification.confidenceResolutionReason,
    dataQuality: "approved_reference" as const,
    validationStatus: "specified" as const,
    sourceRefs: [...specification.sourceRefs],
    assumptions: ["The controlled method domain was evaluated explicitly."],
    engineeringPrecision: {
      significantDigits: 4,
      rationale: "Limited by the registered engineering model confidence.",
    },
    solverReport: solverReport(terminationStatus),
    recommendation: {
      isRecommended: false,
      recommendedMethodId: null,
      recommendedMethodVersion: null,
      reason: "No method comparison was requested for this calculation.",
    },
    versions: {
      application: "0.9.0-beta.1",
      calculationModel: "1.0.0-gate0",
      materialDatabase: "0.0.0-unreleased",
      caseSchema: "1.0.0-alpha.1",
      resultSchema: "1.0.0-alpha.1",
      technicalFreezeId: "IH-EC-V1-G0-2026-08-14-01" as const,
      methodRegistry: "1.0.0-gate0",
      warningRules: "1.0.0-gate0",
      inputSnapshotId: CASE_SNAPSHOT_ID,
      geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
      materialSnapshotIds: [MATERIAL_SNAPSHOT_ID],
    },
  };
}

function outputEnvelope(
  outputId = "D_i",
  overrides: Partial<{
    valueSi: number;
    dimensionId: "length";
    canonicalUnitId: "m" | "mm";
  }> = {},
): EngineeringOutputEnvelope {
  const registeredOutputIds = METHOD_SPECIFICATION_REGISTRY.get(
    "B-01" as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
  ).outputQuantityIds;
  return {
    kind: "engineering_output_envelope",
    status: "complete",
    outputs: [
      {
        kind: "scalar",
        outputId,
        status: "available",
        valueSi: overrides.valueSi ?? 0.1,
        dimensionId: overrides.dimensionId ?? "length",
        canonicalUnitId: overrides.canonicalUnitId ?? "m",
      },
      ...registeredOutputIds
        .filter((registeredOutputId) => registeredOutputId !== outputId)
        .map((registeredOutputId) => ({
          kind: "unavailable" as const,
          outputId: registeredOutputId,
          status: "not_applicable" as const,
          reason: "This structural publication-boundary fixture does not evaluate the conditional output.",
        })),
    ],
  };
}

function warningFor(
  methodId: string,
  moduleId: string,
  severity: "warning" | "blocking" = "blocking",
) {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(
    methodId as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
  );
  return createWarningRecord({
    warningId: `WARN.TEST.${moduleId}.${methodId}`,
    severity,
    moduleId,
    methodId,
    parameterIds: ["coil.inner_diameter"],
    predicate: "required_input_missing",
    observedValues: { inputStatus: "missing" },
    message: "A required controlled input is missing.",
    engineeringConsequence: "The method cannot publish a value.",
    recommendedAction: "Provide the missing canonical-SI input.",
    sourceRefs: [specification.sourceRefs[0] ?? "CALCULATION_CONTRACTS"],
    blocksResult: severity === "blocking",
  });
}

function successInput(): SuccessfulCalculationResultInput {
  return {
    status: "success",
    methodId: "B-01",
    methodVersion: "1.0.0-gate0",
    methodApproval: "approved",
    applicabilityStatus: "in_domain",
    warnings: [],
    trace: traceFor("B-01", "success"),
    context: contextFor("B-01", "not_required"),
    value: outputEnvelope(),
    provenance: "predicted",
  };
}

function failureInput(
  status: FailedCalculationResultInput["status"] = "insufficient_data",
): FailedCalculationResultInput {
  return {
    status,
    methodId: "B-01",
    methodVersion: "1.0.0-gate0",
    methodApproval: "approved",
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warnings: [warningFor("B-01", "B")],
    trace: traceFor("B-01", status),
    context: contextFor("B-01", status),
    failure: {
      code: "missing_required_input",
      message: "The required geometry input is unavailable.",
      action: "Provide coil.inner_diameter in canonical SI.",
      details: { missingParameterIds: ["coil.inner_diameter"] },
    },
  };
}

describe("CalculationResult publication boundary", () => {
  it("fails every structurally valid Phase-1 success through resolveRuntime", () => {
    for (const publisher of [
      createSuccessfulCalculationResult,
      createCalculationResult,
    ]) {
      try {
        publisher(successInput());
        throw new Error("Expected the Phase-1 success publication gate to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(MethodNotExecutableError);
        expect((error as MethodNotExecutableError).methodId).toBe("B-01");
        expect((error as MethodNotExecutableError).reason).toBe(
          "implementation_unavailable",
        );
      }
    }
    expect(METHOD_SPECIFICATION_REGISTRY.runtimeSpecifications()).toEqual([]);
  });

  it("rejects null, an empty object, and an empty output envelope", () => {
    for (const value of [null, {}]) {
      expect(() =>
        createSuccessfulCalculationResult({
          ...successInput(),
          value: value as unknown as EngineeringOutputEnvelope,
        }),
      ).toThrow(/non-empty engineering_output_envelope/);
    }
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: {
          kind: "engineering_output_envelope",
          status: "complete",
          outputs: [],
        } as unknown as EngineeringOutputEnvelope,
      }),
    ).toThrow(/non-empty engineering_output_envelope/);
  });

  it("maps every output to a registered output ID and canonical unit", () => {
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: outputEnvelope("bogus_output"),
      }),
    ).toThrow(/not registered for method B-01/);
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: outputEnvelope("D_i", { canonicalUnitId: "mm" }),
      }),
    ).toThrow(/must be canonical/);
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: outputEnvelope("D_i", { valueSi: Number.NaN }),
      }),
    ).toThrow(/non-finite|must be finite/);

    const incomplete = outputEnvelope();
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: {
          ...incomplete,
          outputs: [incomplete.outputs[0]!],
        },
      }),
    ).toThrow(/must account for every registered output exactly once/);

    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: {
          kind: "engineering_output_envelope",
          status: "complete",
          outputs: METHOD_SPECIFICATION_REGISTRY.get(
            "B-01" as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
          ).outputQuantityIds.map((registeredOutputId) => ({
            kind: "unavailable" as const,
            outputId: registeredOutputId,
            status: "insufficient_data" as const,
            reason: "Structural all-unavailable attack fixture.",
          })) as unknown as EngineeringOutputEnvelope["outputs"],
        },
      }),
    ).toThrow(/at least one available output/);

    const unavailableWithPlaceholderUnit = structuredClone(outputEnvelope());
    Object.assign(unavailableWithPlaceholderUnit.outputs[1]!, {
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    });
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        value: unavailableWithPlaceholderUnit,
      }),
    ).toThrow(/Unavailable engineering output fields/);
  });

  it("rejects a successful result with non_converged solver termination", () => {
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        context: contextFor("B-01", "non_converged"),
      }),
    ).toThrow(/inconsistent with solver termination non_converged/);
  });

  it("requires content-addressed snapshot IDs of the exact declared kinds", () => {
    const malformed = contextFor("B-01", "not_required");
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        context: {
          ...malformed,
          versions: { ...malformed.versions, inputSnapshotId: "case:abc" },
        },
      }),
    ).toThrow(/case:<64 lowercase SHA-256 hex>/);

    const wrongKind = contextFor("B-01", "not_required");
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        context: {
          ...wrongKind,
          versions: {
            ...wrongKind.versions,
            geometrySnapshotId: CASE_SNAPSHOT_ID,
          },
        },
      }),
    ).toThrow(/geometry:<64 lowercase SHA-256 hex>/);
  });

  it("rejects a warning owned by H-01/module H on a B-01 result", () => {
    const foreignWarning = warningFor("H-01", "H", "warning");
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        status: "success_with_warnings",
        warnings: [foreignWarning],
        trace: traceFor("B-01", "success_with_warnings"),
      }),
    ).toThrow(/must be owned by method B-01 and module B/);
  });

  it("binds trace method, snapshots, and result status to the outer result", () => {
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        trace: traceFor("B-02", "success"),
      }),
    ).toThrow(/result_method identity/);

    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        trace: traceFor("B-01", "non_converged"),
      }),
    ).toThrow(/result-node status/);

    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        trace: traceFor("B-01", "success", {
          snapshotIds: [
            CASE_SNAPSHOT_ID,
            GEOMETRY_SNAPSHOT_ID,
            `material:${"d".repeat(64)}`,
          ],
        }),
      }),
    ).toThrow(/exactly match.*snapshot IDs/);
  });

  it("requires the complete frozen method source set, not CODATA alone", () => {
    const b03Context = contextFor("B-03", "not_required");
    expect(() =>
      createSuccessfulCalculationResult({
        status: "success",
        methodId: "B-03",
        methodVersion: "1.0.0-gate0",
        methodApproval: "approved_with_limitation",
        applicabilityStatus: "in_domain",
        warnings: [],
        trace: traceFor("B-03", "success", {
          equationSources: ["CODATA22"],
        }),
        context: { ...b03Context, sourceRefs: ["CODATA22"] },
        value: {
          kind: "engineering_output_envelope",
          status: "complete",
          outputs: [
            {
              kind: "scalar",
              outputId: "L_inf",
              status: "available",
              valueSi: 1e-6,
              dimensionId: "inductance",
              canonicalUnitId: "H",
            },
          ],
        },
        provenance: "predicted",
      }),
    ).toThrow(/omits required frozen sources/);

    const completeContext = contextFor("B-03", "not_required");
    expect(() =>
      createSuccessfulCalculationResult({
        status: "success",
        methodId: "B-03",
        methodVersion: "1.0.0-gate0",
        methodApproval: "approved_with_limitation",
        applicabilityStatus: "in_domain",
        warnings: [],
        trace: traceFor("B-03", "success", {
          equationSources: ["CODATA22"],
        }),
        context: completeContext,
        value: {
          kind: "engineering_output_envelope",
          status: "complete",
          outputs: [
            {
              kind: "scalar",
              outputId: "L_inf",
              status: "available",
              valueSi: 1e-6,
              dimensionId: "inductance",
              canonicalUnitId: "H",
            },
          ],
        },
        provenance: "predicted",
      }),
    ).toThrow(/Trace equation.*omits required frozen sources/);

    const incompleteFailure = failureInput("insufficient_data");
    expect(() =>
      createFailedCalculationResult({
        ...incompleteFailure,
        context: {
          ...incompleteFailure.context,
          sourceRefs: ["CODATA22"],
        },
      }),
    ).toThrow(/omits required frozen sources/);
  });

  it("rejects unknown, deferred-forged, and unsplit parent success methods", () => {
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        methodId: "A-99",
      }),
    ).toThrow(/not present in the frozen method registry/);

    const f03Context = contextFor("F-03", "not_required");
    expect(() =>
      createSuccessfulCalculationResult({
        ...successInput(),
        methodId: "F-03",
        methodApproval: "approved",
        trace: traceFor("F-03", "success", { methodApproval: "approved" }),
        context: { ...f03Context, scientificConfidence: "high" },
      }),
    ).toThrow(/methodApproval must be deferred/);

    const d05 = METHOD_SPECIFICATION_REGISTRY.get(
      "D-05" as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
    );
    expect(() =>
      createSuccessfulCalculationResult({
        status: "success",
        methodId: "D-05",
        methodVersion: d05.methodVersion,
        methodApproval: "approved_with_limitation",
        applicabilityStatus: "in_domain",
        warnings: [],
        trace: traceFor("D-05", "success"),
        context: contextFor("D-05", "not_required"),
        value: {
          kind: "engineering_output_envelope",
          status: "complete",
          outputs: [
            {
              kind: "categorical",
              outputId: d05.outputQuantityIds[0] ?? "Rac",
              status: "available",
              dimensionId: "dimensionless",
              canonicalUnitId: "one",
              value: "structural test fixture",
            },
          ],
        },
        provenance: "predicted",
      }),
    ).toThrow(/before its controlled child methods are split/);
  });

  it("constructs deeply frozen diagnostics without values for every failure status", () => {
    for (const status of [
      "not_applicable",
      "insufficient_data",
      "non_converged",
      "no_feasible_solution",
      "invalid_input",
      "inconsistent_measurement",
    ] as const) {
      const result = createFailedCalculationResult(failureInput(status));
      expect(result.status).toBe(status);
      expect(result.context.solverReport.terminationStatus).toBe(status);
      expect("value" in result).toBe(false);
      expect("provenance" in result).toBe(false);
      expect(result.failure.action).not.toHaveLength(0);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.context.solverReport)).toBe(true);
    }
  });

  it("keeps deferred methods constructible only as explicit failures", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(
      "F-03" as Parameters<typeof METHOD_SPECIFICATION_REGISTRY.get>[0],
    );
    const result = createFailedCalculationResult({
      status: "not_applicable",
      methodId: "F-03",
      methodVersion: specification.methodVersion,
      methodApproval: "deferred",
      applicabilityStatus: "out_of_domain",
      warnings: [],
      trace: traceFor("F-03", "not_applicable"),
      context: contextFor("F-03", "not_applicable"),
      failure: {
        code: "deferred_method",
        message: "F-03 is deferred under the frozen v1 method policy.",
        action: "Use an approved method or wait for a future evidence gate.",
        details: { approvalStatus: "deferred" },
      },
    });
    expect(result.status).toBe("not_applicable");
    expect(result.methodApproval).toBe("deferred");
    expect("value" in result).toBe(false);
  });

  it("rejects failure/solver mismatch and forged placeholder values", () => {
    const mismatched = failureInput("non_converged");
    expect(() =>
      createFailedCalculationResult({
        ...mismatched,
        context: contextFor("B-01", "insufficient_data"),
      }),
    ).toThrow(/requires solver terminationStatus=non_converged/);

    const forged = {
      ...failureInput(),
      value: undefined,
    } as unknown as FailedCalculationResultInput;
    expect(() => createFailedCalculationResult(forged)).toThrow(
      /must not contain a value/,
    );
  });
});
