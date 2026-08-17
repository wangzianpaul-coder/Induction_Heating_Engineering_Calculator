import { VERSION_INFO } from "../../src/config/versions.js";
import { createScalarQuantity } from "../../src/controlled-quantity-factory.js";
import { parameterId, sourceRef } from "../../src/domain/ids.js";
import {
  createGeometrySnapshot,
  type GeometrySnapshotPayload,
} from "../../src/domain/snapshot.js";
import { PARAMETRIC_SCENE_MAPPING_ID } from "../../src/visualization/sceneModel.js";

const VALUES = Object.freeze({
  "workpiece.outer_diameter": 0.8,
  "workpiece.inner_diameter": 0.7,
  "workpiece.active_length": 0.5,
  "insulation.inner_diameter": 0.8,
  "insulation.outer_diameter": 0.9,
  "thermal.radial_gap": 0.05,
  "coil.inner_diameter": 1,
  "coil.outer_diameter": 1.08,
  "coil.mean_diameter": 1.04,
  "coil.winding_envelope_length": 0.32,
  "coil.helix_revolution_count": 4,
  "coil.helix_axial_advance": 0.28,
  "coil.lead_length": 0.4,
  "conductor.radial_size": 0.04,
  "conductor.outer_diameter": 0.04,
  "conductor.inner_diameter": 0.024,
} as const);

export type Phase6GeometryParameterId = keyof typeof VALUES;

export function phase6GeometryPayload(
  overrides: Partial<Record<Phase6GeometryParameterId, number>> = {},
): GeometrySnapshotPayload {
  const quantities = Object.entries({ ...VALUES, ...overrides }).map(
    ([id, value]) => {
      const dimensionless = id === "coil.helix_revolution_count";
      return createScalarQuantity({
        parameterId: parameterId(id),
        value,
        unitId: dimensionless ? "one" : "m",
        dimensionId: dimensionless ? "dimensionless" : "length",
        displayUnitId: dimensionless ? "one" : "mm",
        basis: "total",
        uncertainty: { kind: "unknown" },
        provenance: {
          sourceKind: "user",
          sourceRef: sourceRef(`case.input.${id}`),
          dataQuality: "user_defined",
        },
        status: "known",
        validDigits: 6,
      });
    },
  );
  return {
    geometrySchemaVersion: VERSION_INFO.geometrySchema,
    geometryMappingId: PARAMETRIC_SCENE_MAPPING_ID,
    quantities,
    assumptions: [
      "Round hollow conductor dimensions are explicit mechanical inputs.",
      "Lead direction is illustrative while declared total path length is preserved.",
    ],
  };
}

export function phase6GeometrySnapshot(
  overrides: Partial<Record<Phase6GeometryParameterId, number>> = {},
) {
  return createGeometrySnapshot(
    phase6GeometryPayload(overrides),
    "2026-08-17T00:00:00.000Z",
  );
}

