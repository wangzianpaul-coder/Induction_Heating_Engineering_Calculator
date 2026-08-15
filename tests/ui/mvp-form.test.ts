import { describe, expect, it } from "vitest";

import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";
import {
  buildUiMvpWorkspaceInput,
  createEmptyMvpFormState,
  restoreMvpFormState,
  type UiMvpFormState,
} from "../../src/ui/mvp-form.js";

const METHODS = ENGINEERING_UI_APPLICATION.mvp.methods;

describe("Runnable MVP UI form boundary", () => {
  it("starts every field empty or explicitly unconfirmed", () => {
    const state = createEmptyMvpFormState(METHODS);

    for (const method of METHODS) {
      for (const field of method.fields) {
        expect(state[method.methodId]?.[field.id]).toBe(field.kind === "boolean" ? false : "");
      }
    }
  });

  it("parses canonical numbers and comma-separated optional lists without defaults", () => {
    const empty = createEmptyMvpFormState(METHODS);
    const state: UiMvpFormState = {
      ...empty,
      "D-01": {
        ...empty["D-01"],
        meanMechanicalPathDiameterM: "0.4",
        helixRevolutionCount: "3",
        helixAxialAdvanceM: "0.2",
        leadSegmentLengthsM: "0.1, 0.2",
        busSegmentLengthsM: "",
      },
    };

    const result = buildUiMvpWorkspaceInput("case-ui-1", "UI parse case", ["D-01"], state, METHODS);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.workspace.methodInputs[0]?.payload).toMatchObject({
      meanMechanicalPathDiameterM: 0.4,
      helixRevolutionCount: 3,
      helixAxialAdvanceM: 0.2,
      leadSegmentLengthsM: [0.1, 0.2],
      busSegmentLengthsM: null,
    });
  });

  it("rejects malformed comma-separated lists before the application call", () => {
    const empty = createEmptyMvpFormState(METHODS);
    const result = buildUiMvpWorkspaceInput(
      "case-ui-2",
      "Invalid list case",
      ["D-01"],
      { ...empty, "D-01": { ...empty["D-01"], leadSegmentLengthsM: "0.1, nope" } },
      METHODS,
    );

    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.ui_input_invalid" },
    });
  });

  it("restores saved payload values into editable controls", () => {
    const state = restoreMvpFormState(METHODS, [{
      methodId: "B-02",
      payload: {
        electricalTurnCount: 5,
        conductorAxialSizeM: 0.01,
        windingClass: "uniform_single_layer",
        identicalTurnSections: true,
      },
    }]);

    expect(state["B-02"]).toMatchObject({
      electricalTurnCount: "5",
      conductorAxialSizeM: "0.01",
      windingEnvelopeLengthM: "",
      windingClass: "uniform_single_layer",
      identicalTurnSections: true,
      nonOverlappingAxialProjection: false,
    });
  });

  it("round-trips a confirmed empty segment list without changing it to unknown", () => {
    const empty = createEmptyMvpFormState(METHODS);
    const restored = restoreMvpFormState(METHODS, [{
      methodId: "D-01",
      payload: {
        meanMechanicalPathDiameterM: 0.2,
        helixRevolutionCount: 5,
        helixAxialAdvanceM: 0.5,
        leadSegmentLengthsM: [],
        busSegmentLengthsM: [],
      },
    }]);
    expect(restored["D-01"]?.leadSegmentLengthsM).toBe("[]");
    const rebuilt = buildUiMvpWorkspaceInput(
      "case-ui-empty-segments",
      "Confirmed empty segments",
      ["D-01"],
      { ...empty, ...restored },
      METHODS,
    );
    expect(rebuilt.status).toBe("success");
    if (rebuilt.status === "success") {
      expect(rebuilt.workspace.methodInputs[0]?.payload.leadSegmentLengthsM).toEqual([]);
      expect(rebuilt.workspace.methodInputs[0]?.payload.busSegmentLengthsM).toEqual([]);
    }
  });

  it("connects calculate, canonical save, and reopen through the UI application boundary", () => {
    const workspace = {
      caseId: "case-ui-roundtrip",
      caseName: "UI round-trip case",
      selectedMethodIds: ["B-02"] as const,
      methodInputs: [{
        methodId: "B-02" as const,
        payload: {
          electricalTurnCount: 4,
          conductorAxialSizeM: 0.01,
          windingEnvelopeLengthM: 0.08,
          windingClass: "uniform_single_layer",
          envelopeDefinition: "ADR-0003_full_axial_envelope",
          identicalTurnSections: true,
          nonOverlappingAxialProjection: true,
        },
      }],
    };

    const calculated = ENGINEERING_UI_APPLICATION.mvp.calculate(workspace, "2026-08-15T00:00:00.000Z");
    expect(calculated.status).toBe("success");
    if (calculated.status !== "success") return;
    expect(calculated.results[0]).toMatchObject({
      methodId: "B-02",
      status: "success",
      formalRuntimeActivationClaim: false,
    });

    const saved = ENGINEERING_UI_APPLICATION.mvp.save(workspace, "2026-08-15T00:00:01.000Z");
    expect(saved.status).toBe("success");
    if (saved.status !== "success") return;
    const reopened = ENGINEERING_UI_APPLICATION.mvp.load(saved.canonicalJson);
    expect(reopened).toMatchObject({
      status: "success",
      workspace: { caseId: "case-ui-roundtrip", selectedMethodIds: ["B-02"] },
    });
  });
});
