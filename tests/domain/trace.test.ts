import { describe, expect, it } from "vitest";

import {
  TraceValidationError,
  assertCalculationTrace,
  createCalculationTrace,
  createTraceNode,
  validateTraceDag,
  type TraceNodeInput,
} from "../../src/domain/trace.js";

function fullTraceNodes(): readonly TraceNodeInput[] {
  return [
    {
      nodeId: "trace.input",
      kind: "input_snapshot",
      label: "Input Snapshot",
      payload: { snapshotId: "case:sha256" },
    },
    {
      nodeId: "trace.method",
      kind: "method",
      label: "Method and Version",
      dependsOn: ["trace.input"],
      payload: { methodId: "D-01", methodVersion: "1.0.0" },
      sourceRefs: ["CALCULATION_CONTRACTS:D-01"],
    },
    {
      nodeId: "trace.material",
      kind: "material",
      label: "Material Properties",
      dependsOn: ["trace.method"],
      payload: { materialSnapshotId: "material:sha256", resistivitySi: 1.8e-8 },
      sourceRefs: ["MATERIAL_DATA_MODEL:property"],
    },
    {
      nodeId: "trace.equation",
      kind: "equation",
      label: "Controlled Equation",
      dependsOn: ["trace.material"],
      payload: { equationId: "ID-OHM-01", expression: "controlled_trace_expression" },
      sourceRefs: ["ID-OHM-01"],
    },
    {
      nodeId: "trace.substitution",
      kind: "substitution",
      label: "Substitution",
      dependsOn: ["trace.equation"],
      payload: { inputsSi: { length: 1, area: 0.001 }, evaluatedSi: 0.000018 },
    },
    {
      nodeId: "trace.source",
      kind: "source",
      label: "Source",
      dependsOn: ["trace.substitution"],
      payload: { location: "controlled derivation anchor" },
      sourceRefs: ["ID-OHM-01"],
    },
    {
      nodeId: "trace.assumption",
      kind: "assumption",
      label: "Assumption",
      dependsOn: ["trace.source"],
      payload: { assumptions: ["uniform cross-section"] },
    },
    {
      nodeId: "trace.applicability",
      kind: "applicability_check",
      label: "Applicability Check",
      dependsOn: ["trace.assumption"],
      payload: { status: "in_domain", predicate: "positive_geometry" },
    },
    {
      nodeId: "trace.warning",
      kind: "warning",
      label: "Warnings",
      dependsOn: ["trace.applicability"],
      payload: { warningIds: [] },
    },
    {
      nodeId: "trace.residual",
      kind: "solver_residual",
      label: "Solver Residual",
      dependsOn: ["trace.warning"],
      payload: { terminationStatus: "not_required", residualSi: 0 },
    },
    {
      nodeId: "trace.result",
      kind: "result",
      label: "Result",
      dependsOn: ["trace.residual"],
      payload: { status: "success", valueSi: 0.000018 },
    },
  ];
}

describe("CalculationTrace DAG", () => {
  it("represents and verifies the full controlled engineering trace chain", () => {
    const trace = createCalculationTrace({ nodes: fullTraceNodes() });

    expect(trace.inputNodeIds).toEqual(["trace.input"]);
    expect(trace.resultNodeId).toBe("trace.result");
    expect(trace.topologicalOrder).toEqual(fullTraceNodes().map((node) => node.nodeId));
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.nodes)).toBe(true);
    expect(Object.isFrozen(trace.nodes[0]?.payload)).toBe(true);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    expect(() => assertCalculationTrace(trace)).not.toThrow();
  });

  it("computes a deterministic topological order independent of input order", () => {
    const nodes = fullTraceNodes();
    const reordered = [nodes[10], ...nodes.slice(0, 10)] as readonly TraceNodeInput[];
    const trace = createCalculationTrace({ nodes: reordered });
    expect(trace.topologicalOrder[0]).toBe("trace.input");
    expect(trace.topologicalOrder.at(-1)).toBe("trace.result");
  });

  it("rejects missing dependencies and duplicate node IDs", () => {
    const missing = fullTraceNodes().map((node) =>
      node.nodeId === "trace.material"
        ? { ...node, dependsOn: ["trace.does_not_exist"] }
        : node,
    );
    expect(() => createCalculationTrace({ nodes: missing })).toThrow(
      TraceValidationError,
    );

    const duplicate = [...fullTraceNodes(), fullTraceNodes()[0]] as readonly TraceNodeInput[];
    expect(() => createCalculationTrace({ nodes: duplicate })).toThrow(
      /duplicated/,
    );
  });

  it("rejects cycles and disconnected branches", () => {
    const input = createTraceNode(fullTraceNodes()[0] as TraceNodeInput);
    const a = createTraceNode({
      nodeId: "trace.assumption.a",
      kind: "assumption",
      label: "A",
      dependsOn: ["trace.assumption.b"],
      payload: {},
    });
    const b = createTraceNode({
      nodeId: "trace.assumption.b",
      kind: "assumption",
      label: "B",
      dependsOn: ["trace.assumption.a"],
      payload: {},
    });
    const result = createTraceNode({
      nodeId: "trace.result",
      kind: "result",
      label: "Result",
      dependsOn: ["trace.input"],
      payload: {},
    });
    const cyclicValidation = validateTraceDag([input, a, b, result]);
    expect(cyclicValidation.valid).toBe(false);
    if (!cyclicValidation.valid) {
      expect(cyclicValidation.issues.some((issue) => issue.code === "cycle")).toBe(true);
      expect(
        cyclicValidation.issues.some(
          (issue) => issue.code === "disconnected_from_result",
        ),
      ).toBe(true);
    }

  });

  it("accepts source, assumptions, and applicability as equation prerequisites", () => {
    const trace = createCalculationTrace({
      nodes: [
        {
          nodeId: "trace.input",
          kind: "input_snapshot",
          label: "Input Snapshot",
          payload: { snapshotId: "case:sha256" },
        },
        {
          nodeId: "trace.method",
          kind: "method",
          label: "Method and Version",
          dependsOn: ["trace.input"],
          payload: { methodId: "D-01", methodVersion: "1.0.0" },
        },
        {
          nodeId: "trace.source",
          kind: "source",
          label: "Controlled Source",
          dependsOn: ["trace.method"],
          payload: { location: "ID-OHM-01" },
          sourceRefs: ["ID-OHM-01"],
        },
        {
          nodeId: "trace.assumption",
          kind: "assumption",
          label: "Assumptions",
          dependsOn: ["trace.source"],
          payload: { assumptions: ["uniform cross-section"] },
        },
        {
          nodeId: "trace.applicability",
          kind: "applicability_check",
          label: "Applicability",
          dependsOn: ["trace.assumption"],
          payload: { status: "in_domain" },
        },
        {
          nodeId: "trace.equation",
          kind: "equation",
          label: "Equation",
          dependsOn: [
            "trace.method",
            "trace.source",
            "trace.assumption",
            "trace.applicability",
          ],
          payload: { equationId: "ID-OHM-01" },
        },
        {
          nodeId: "trace.result",
          kind: "result",
          label: "Result",
          dependsOn: ["trace.equation"],
          payload: { status: "success" },
        },
      ],
    });

    expect(trace.topologicalOrder).toContain("trace.method");
    expect(trace.resultNodeId).toBe("trace.result");
  });

  it("rejects multiple result sinks and non-finite trace values", () => {
    const extraResult: TraceNodeInput = {
      nodeId: "trace.result.second",
      kind: "result",
      label: "Second Result",
      dependsOn: ["trace.residual"],
      payload: { status: "success" },
    };
    expect(() =>
      createCalculationTrace({ nodes: [...fullTraceNodes(), extraResult] }),
    ).toThrow(/exactly one result/);

    expect(() =>
      createTraceNode({
        nodeId: "trace.bad",
        kind: "solver_residual",
        label: "Bad residual",
        dependsOn: ["trace.input"],
        payload: { residual: Number.NaN },
      }),
    ).toThrow(/non-finite/);
  });

  it("rejects forged blank/source/extra fields at the assertion boundary", () => {
    const trace = createCalculationTrace({ nodes: fullTraceNodes() });
    const blankLabel = structuredClone(trace) as unknown as {
      nodes: Array<{ label: string }>;
    };
    blankLabel.nodes[0]!.label = " ";
    expect(() => assertCalculationTrace(blankLabel)).toThrow(TraceValidationError);

    const invalidSource = structuredClone(trace) as unknown as {
      nodes: Array<{ sourceRefs: string[] }>;
    };
    invalidSource.nodes[0]!.sourceRefs = ["source with spaces"];
    expect(() => assertCalculationTrace(invalidSource)).toThrow(TraceValidationError);

    expect(() =>
      assertCalculationTrace({
        ...trace,
        uncontrolledField: true,
      }),
    ).toThrow(/nodes array/);
  });
});
