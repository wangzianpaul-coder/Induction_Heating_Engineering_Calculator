import { describe, expect, it, vi } from "vitest";

import {
  createMvpCaseDraft,
  loadMvpCaseDraft,
  saveMvpCaseDraft,
  type CreateMvpCaseDraftInput,
} from "../../src/application/mvpCaseService.js";
import {
  calculateMvpWorkspace,
  loadMvpWorkspace,
  saveMvpWorkspace,
  type MvpWorkspaceInput,
} from "../../src/application/mvpWorkspace.js";
import { D04_VACUUM_PERMEABILITY_H_PER_M } from "../../src/methods/D/d04CopperSkinDepth.js";
import { J03_STEFAN_BOLTZMANN_W_PER_M2_K4 } from "../../src/methods/J/j03GrayBodyRadiation.js";

const AT = "2026-08-17T02:00:00.000Z";
const COPPER_MATERIAL = `material:${"a".repeat(64)}`;
const SURFACE_MATERIAL = `material:${"b".repeat(64)}`;
const RADIATION_GEOMETRY = `geometry:${"c".repeat(64)}`;

const D04_PAYLOAD = Object.freeze({
  frequencyHz: 20_000,
  resistivityOhmM: 2e-8,
  relativePermeability: 1,
  materialClass: "copper",
  propertyStateMatch: "same_material_temperature_frequency_state",
  calculationTemperatureK: 373.15,
  constitutiveRegime: "linear_isotropic_good_conductor",
  excitation: "sinusoidal_steady_state",
  fieldModel: "locally_planar_reference",
  materialSnapshotId: COPPER_MATERIAL,
  materialDisplayName: "C110 copper at declared state",
  propertyTemperatureK: 373.15,
  propertyFrequencyHz: 20_000,
  sameMaterialStateConfirmed: true,
  resistivitySourceRef: "datasheet:C110:resistivity:373.15K",
  relativePermeabilitySourceRef: "datasheet:C110:relative-permeability:20kHz",
});

const J03_PAYLOAD = Object.freeze({
  configuration: "radiation_to_large_surroundings",
  surface1TemperatureK: 500,
  surface1Emissivity: 0.8,
  surface1AreaM2: 2,
  surface1MaterialSnapshotId: SURFACE_MATERIAL,
  surface1EmissivitySourceRef: "datasheet:surface-1:emissivity:500K",
  surface1EmissivityStateTemperatureK: 500,
  counterpartKind: "large_surroundings",
  counterpartTemperatureK: 300,
  geometrySnapshotId: RADIATION_GEOMETRY,
  snapshotConfiguration: "radiation_to_large_surroundings",
  snapshotSurface1AreaM2: 2,
  temperatureScale: "absolute_kelvin",
  diffuseGraySurfacesConfirmed: true,
  viewFactor: 1,
  noUnmodelledOpeningsOrObstructionsConfirmed: true,
  longConcentricEndEffectsStatus: "not_applicable",
  surface1RoleStatus: "not_applicable",
});

function expandedWorkspace(): MvpWorkspaceInput {
  return {
    caseId: "expanded-safe-calculations-001",
    caseName: "Copper skin depth and surface radiation",
    selectedMethodIds: ["D-04", "J-03"],
    methodInputs: [
      { methodId: "D-04", payload: D04_PAYLOAD },
      { methodId: "J-03", payload: J03_PAYLOAD },
    ],
  };
}

function expandedCaseInput(): CreateMvpCaseDraftInput {
  const workspace = expandedWorkspace();
  return {
    caseId: workspace.caseId,
    caseName: workspace.caseName,
    geometryMappingId: "expanded.application-evidence.v1",
    geometryAssumptions: [],
    geometryQuantities: [],
    operatingConditions: [],
    userInputs: [],
    displayUnits: {},
    selectedMethodIds: workspace.selectedMethodIds,
    methodInputs: workspace.methodInputs,
  };
}

describe("expanded runnable Case flow", () => {
  it("calculates copper skin depth and large-surroundings radiation through the workspace", () => {
    const calculated = calculateMvpWorkspace(expandedWorkspace(), AT);
    expect(calculated.status).toBe("success");
    if (calculated.status !== "success") return;

    expect(calculated.results.map((result) => [result.methodId, result.status])).toEqual([
      ["D-04", "success_with_warnings"],
      ["J-03", "success"],
    ]);

    const expectedSkinDepth = Math.sqrt(
      D04_PAYLOAD.resistivityOhmM /
        (Math.PI *
          D04_PAYLOAD.frequencyHz *
          D04_VACUUM_PERMEABILITY_H_PER_M *
          D04_PAYLOAD.relativePermeability),
    );
    const skinDepth = calculated.results[0]?.outputs[0];
    expect(skinDepth).toMatchObject({
      outputId: "copper_skin_depth",
      canonicalUnitId: "m",
    });
    expect(skinDepth?.value).toBeCloseTo(expectedSkinDepth, 15);
    expect(calculated.results[0]?.warnings).toHaveLength(2);

    const expectedRadiation =
      J03_PAYLOAD.surface1Emissivity *
      J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
      J03_PAYLOAD.surface1AreaM2 *
      (J03_PAYLOAD.surface1TemperatureK ** 4 -
        J03_PAYLOAD.counterpartTemperatureK ** 4);
    expect(calculated.results[1]?.outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        outputId: "radiative_heat_rate",
        value: expectedRadiation,
        canonicalUnitId: "W",
      }),
      expect.objectContaining({
        outputId: "radiation_network_factor",
        value: 0.8,
        canonicalUnitId: "one",
      }),
    ]));

    for (const result of calculated.results) {
      expect(result.formalRuntimeActivationClaim).toBe(false);
      expect(result.sources.join(" ")).not.toMatch(/(?:ADR|DER|ID-[A-Z]|D-04|J-03)/u);
    }
  });

  it("saves and reopens both exact evidence payloads through one canonical Case", () => {
    const workspace = expandedWorkspace();
    const saved = saveMvpWorkspace(workspace, AT);
    expect(saved.status).toBe("success");
    if (saved.status !== "success") return;

    const loaded = loadMvpWorkspace(saved.canonicalJson);
    expect(loaded).toMatchObject({ status: "success" });
    if (loaded.status === "success") {
      expect(loaded.workspace).toEqual(workspace);
      expect(loaded.snapshotId).toBe(saved.snapshotId);
    }

    const draft = createMvpCaseDraft(expandedCaseInput());
    const canonicalCase = saveMvpCaseDraft(draft, AT);
    const loadedCase = loadMvpCaseDraft(canonicalCase);
    expect(loadedCase.status).toBe("success");
    if (loadedCase.status === "success") {
      expect(loadedCase.draft.methodInputs).toEqual(draft.methodInputs);
      expect(loadedCase.caseFile.caseSnapshot.payload.methodSelections).toEqual([
        expect.objectContaining({ methodId: "D-04", approvalStatus: "approved_with_limitation" }),
        expect.objectContaining({ methodId: "J-03", approvalStatus: "approved" }),
      ]);
    }
  });

  it("keeps missing evidence visible as per-method failures without substituting properties", () => {
    const missingD04 = {
      ...D04_PAYLOAD,
    } as Record<string, typeof D04_PAYLOAD[keyof typeof D04_PAYLOAD]>;
    delete missingD04.materialSnapshotId;
    const missingViewFactor = {
      ...J03_PAYLOAD,
    } as Record<string, typeof J03_PAYLOAD[keyof typeof J03_PAYLOAD]>;
    delete missingViewFactor.viewFactor;

    const calculated = calculateMvpWorkspace({
      ...expandedWorkspace(),
      methodInputs: [
        { methodId: "D-04", payload: missingD04 },
        { methodId: "J-03", payload: missingViewFactor },
      ],
    } as MvpWorkspaceInput, AT);
    expect(calculated.status).toBe("success");
    if (calculated.status === "success") {
      expect(calculated.results).toEqual([
        expect.objectContaining({ methodId: "D-04", status: "invalid_input", outputs: [] }),
        expect.objectContaining({ methodId: "J-03", status: "invalid_input", outputs: [] }),
      ]);
    }
  });

  it("rejects unknown or hostile payload keys before calculation or persistence", () => {
    for (const [methodId, payload] of [
      ["D-04", D04_PAYLOAD],
      ["J-03", J03_PAYLOAD],
    ] as const) {
      const unknownKey = {
        ...expandedWorkspace(),
        selectedMethodIds: [methodId],
        methodInputs: [{
          methodId,
          payload: { ...payload, hiddenEngineeringDefault: 1 },
        }],
      } as MvpWorkspaceInput;
      expect(calculateMvpWorkspace(unknownKey, AT)).toMatchObject({
        status: "invalid_input",
        failure: { code: "MVP.workspace_invalid" },
      });
      expect(saveMvpWorkspace(unknownKey, AT)).toMatchObject({
        status: "invalid_input",
        failure: { code: "MVP.workspace_invalid" },
      });
    }

    const getter = vi.fn(() => D04_PAYLOAD.frequencyHz);
    const hostilePayload = { ...D04_PAYLOAD } as Record<string, unknown>;
    Object.defineProperty(hostilePayload, "frequencyHz", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const hostileWorkspace = {
      ...expandedWorkspace(),
      selectedMethodIds: ["D-04"],
      methodInputs: [{ methodId: "D-04", payload: hostilePayload }],
    } as unknown as MvpWorkspaceInput;
    expect(calculateMvpWorkspace(hostileWorkspace, AT)).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.workspace_invalid" },
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
