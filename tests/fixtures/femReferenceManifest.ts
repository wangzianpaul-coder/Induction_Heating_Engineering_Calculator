import { TECHNICAL_FREEZE_ID } from "../../src/config/versions.js";
import {
  FEM_REFERENCE_MANIFEST_SCHEMA_VERSION,
  FEM_REFERENCE_PROVENANCE,
} from "../../src/interchange/femReferenceManifest.js";

export const FEM_FIXTURE_HASHES = Object.freeze({
  geometry: "1".repeat(64),
  mesh: "2".repeat(64),
  materials: "3".repeat(64),
  boundaries: "4".repeat(64),
  sources: "5".repeat(64),
  field: "6".repeat(64),
});

export const FEM_FIXTURE_GEOMETRY_SNAPSHOT_ID = `geometry:${"a".repeat(64)}`;

export function femReferenceManifestFixture() {
  return {
    kind: "ih_ec_external_fem_reference_manifest",
    schemaVersion: FEM_REFERENCE_MANIFEST_SCHEMA_VERSION,
    referenceId: "fem.reference.maxwell.test-001",
    createdAt: "2026-08-17T00:00:00.000Z",
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    provenance: FEM_REFERENCE_PROVENANCE,
    geometrySnapshotId: FEM_FIXTURE_GEOMETRY_SNAPSHOT_ID,
    solver: {
      family: "ansys_maxwell",
      name: "ANSYS Maxwell",
      version: "2026 R1",
      adapterId: "ansys_maxwell_export.v1",
      exportFormatVersion: "1",
      analysisType: "electromagnetic",
      modelDimension: "3d",
    },
    coordinates: {
      coordinateSystemId: "project.global.xyz",
      handedness: "right_handed",
      lengthUnit: "mm",
      axisDirections: { x: "+x", y: "+y", z: "+z" },
      transformToProjectSi: [
        0.001, 0, 0, 0,
        0, 0.001, 0, 0,
        0, 0, 0.001, 0,
        0, 0, 0, 1,
      ],
    },
    artifacts: {
      geometry: {
        artifactId: "model.geometry.step",
        sha256: FEM_FIXTURE_HASHES.geometry,
      },
      mesh: {
        artifactId: "model.mesh.dat",
        sha256: FEM_FIXTURE_HASHES.mesh,
      },
      materials: {
        artifactId: "model.materials.json",
        sha256: FEM_FIXTURE_HASHES.materials,
      },
      boundaries: {
        artifactId: "model.boundaries.json",
        sha256: FEM_FIXTURE_HASHES.boundaries,
      },
      sources: {
        artifactId: "model.sources.json",
        sha256: FEM_FIXTURE_HASHES.sources,
      },
    },
    study: {
      operatingBasis: {
        frequencyHz: 10_000,
        timeS: null,
        phasorConvention: "rms",
        complexRepresentation: "real_imaginary",
      },
      mesh: {
        nodeCount: 2_100,
        elementCount: 4_000,
        polynomialOrder: 2,
        refinementLevels: [
          {
            levelId: "coarse",
            elementCount: 1_000,
            characteristicSizeM: 0.02,
            targetMetricValue: 0.94,
            relativeChangeFromPrevious: null,
          },
          {
            levelId: "medium",
            elementCount: 2_000,
            characteristicSizeM: 0.01,
            targetMetricValue: 0.985,
            relativeChangeFromPrevious: 0.0479,
          },
          {
            levelId: "fine",
            elementCount: 4_000,
            characteristicSizeM: 0.005,
            targetMetricValue: 0.995,
            relativeChangeFromPrevious: 0.0102,
          },
        ],
      },
      convergence: {
        metricId: "stored_magnetic_energy",
        toleranceFraction: 0.02,
        observedFraction: 0.0102,
        achieved: true,
        nonlinearIterationCount: 8,
        nonlinearResidual: 1e-7,
      },
      energyBalance: {
        inputPowerW: 100_000,
        dissipatedPowerW: 60_000,
        boundaryFluxPowerW: 39_500,
        relativeResidual: 0.005,
        toleranceFraction: 0.01,
        achieved: true,
      },
    },
    fields: [
      {
        fieldId: "magnetic_flux_density.volume",
        quantity: "magnetic_flux_density",
        unit: "T",
        location: "cell",
        representation: "complex_vector_xyz_real_imaginary",
        dataArtifact: {
          artifactId: "field.b.csv",
          sha256: FEM_FIXTURE_HASHES.field,
        },
        timeCoordinatesS: [],
      },
    ],
    validation: {
      status: "reference_only",
      overlapDatasetIds: [],
      reviewedBy: "independent-reviewer",
      reviewedAt: "2026-08-17T01:00:00.000Z",
      uncertainty: {
        kind: "unknown",
        reason: "No experimental overlap dataset is attached.",
      },
    },
    limitations: [
      "Reference only; it does not approve or calibrate a product method.",
    ],
  };
}

export function femFixtureArtifactEvidence() {
  return {
    expectedGeometrySnapshotId: FEM_FIXTURE_GEOMETRY_SNAPSHOT_ID,
    artifactHashes: {
      "model.geometry.step": FEM_FIXTURE_HASHES.geometry,
      "model.mesh.dat": FEM_FIXTURE_HASHES.mesh,
      "model.materials.json": FEM_FIXTURE_HASHES.materials,
      "model.boundaries.json": FEM_FIXTURE_HASHES.boundaries,
      "model.sources.json": FEM_FIXTURE_HASHES.sources,
      "field.b.csv": FEM_FIXTURE_HASHES.field,
    },
  };
}

