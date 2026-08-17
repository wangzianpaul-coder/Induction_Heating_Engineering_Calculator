import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  FEM_REFERENCE_INFLUENCE_POLICY,
  FEM_REFERENCE_PROVENANCE,
  admitExternalFemReferencePackage,
  parseExternalFemReferenceManifest,
} from "../../src/interchange/femReferenceManifest.js";
import {
  FEM_FIXTURE_GEOMETRY_SNAPSHOT_ID,
  femFixtureArtifactEvidence,
  femReferenceManifestFixture,
} from "../fixtures/femReferenceManifest.js";

type MutableRecord = Record<string, unknown>;

describe("external FEM reference manifest boundary", () => {
  it("parses a complete ANSYS Maxwell reference and freezes it", () => {
    const result = parseExternalFemReferenceManifest(
      JSON.stringify(femReferenceManifestFixture()),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }
    expect(result.manifest.solver).toMatchObject({
      family: "ansys_maxwell",
      version: "2026 R1",
      modelDimension: "3d",
    });
    expect(result.manifest.provenance).toBe(FEM_REFERENCE_PROVENANCE);
    expect(result.manifest.study.mesh.refinementLevels).toHaveLength(3);
    expect(result.manifest.fields[0]?.quantity).toBe("magnetic_flux_density");
    expect(Object.isFrozen(result.manifest)).toBe(true);
  });

  it("accepts the controlled ANSYS Thermal and COMSOL solver adapters", () => {
    const thermal = femReferenceManifestFixture() as MutableRecord;
    thermal.referenceId = "fem.reference.thermal.test-001";
    thermal.solver = {
      family: "ansys_thermal",
      name: "ANSYS Thermal",
      version: "2025 R2",
      adapterId: "ansys_thermal_export.v1",
      exportFormatVersion: "1",
      analysisType: "thermal",
      modelDimension: "2d_axisymmetric",
    };
    const study = thermal.study as MutableRecord;
    study.operatingBasis = {
      frequencyHz: null,
      timeS: 20,
      phasorConvention: "not_applicable",
      complexRepresentation: "not_applicable",
    };
    thermal.fields = [
      {
        fieldId: "temperature.nodes",
        quantity: "temperature",
        unit: "K",
        location: "node",
        representation: "real_scalar",
        dataArtifact: {
          artifactId: "field.b.csv",
          sha256: "6".repeat(64),
        },
        timeCoordinatesS: [0, 10, 20],
      },
    ];
    expect(parseExternalFemReferenceManifest(thermal)).toMatchObject({
      status: "success",
      manifest: { solver: { family: "ansys_thermal" } },
    });

    const comsol = structuredClone(thermal);
    comsol.referenceId = "fem.reference.comsol.test-001";
    comsol.solver = {
      family: "comsol",
      name: "COMSOL Multiphysics",
      version: "6.4",
      adapterId: "comsol_export.v1",
      exportFormatVersion: "1",
      analysisType: "coupled_electromagnetic_thermal",
      modelDimension: "3d",
    };
    (comsol.study as MutableRecord).operatingBasis = {
      frequencyHz: 10_000,
      timeS: 20,
      phasorConvention: "rms",
      complexRepresentation: "real_imaginary",
    };
    expect(parseExternalFemReferenceManifest(comsol)).toMatchObject({
      status: "success",
      manifest: { solver: { family: "comsol" } },
    });
  });

  it.each([
    ["invalid JSON", "{", "invalid_json"],
    [
      "unsupported schema",
      { ...femReferenceManifestFixture(), schemaVersion: "2.0.0" },
      "unsupported_schema",
    ],
    [
      "unsupported solver version",
      {
        ...femReferenceManifestFixture(),
        solver: { ...femReferenceManifestFixture().solver, version: "unknown" },
      },
      "unsupported_solver",
    ],
    [
      "unknown field",
      {
        ...femReferenceManifestFixture(),
        fields: [
          {
            ...femReferenceManifestFixture().fields[0],
            quantity: "electric_potential",
          },
        ],
      },
      "invalid_manifest",
    ],
  ])("fails closed for %s", (_label, candidate, code) => {
    expect(parseExternalFemReferenceManifest(candidate)).toMatchObject({
      status: "failed",
      code,
    });
  });

  it("rejects malformed transforms, non-refining meshes and false convergence claims", () => {
    const singular = femReferenceManifestFixture();
    singular.coordinates.transformToProjectSi[0] = 0;
    expect(parseExternalFemReferenceManifest(singular)).toMatchObject({
      status: "failed",
      path: "$.coordinates.transformToProjectSi",
    });

    const wrongUnitScale = femReferenceManifestFixture();
    wrongUnitScale.coordinates.transformToProjectSi[0] = 1;
    expect(parseExternalFemReferenceManifest(wrongUnitScale)).toMatchObject({
      status: "failed",
      path: "$.coordinates.transformToProjectSi",
    });

    const mirrored = femReferenceManifestFixture();
    mirrored.coordinates.axisDirections.x = "-x";
    mirrored.coordinates.transformToProjectSi[0] = -0.001;
    expect(parseExternalFemReferenceManifest(mirrored)).toMatchObject({
      status: "failed",
      path: "$.coordinates.transformToProjectSi",
    });

    const notRefined = femReferenceManifestFixture();
    notRefined.study.mesh.refinementLevels[2]!.elementCount = 1_500;
    notRefined.study.mesh.elementCount = 1_500;
    expect(parseExternalFemReferenceManifest(notRefined)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });

    const falseClaim = femReferenceManifestFixture();
    falseClaim.study.convergence.observedFraction = 0.5;
    expect(parseExternalFemReferenceManifest(falseClaim)).toMatchObject({
      status: "failed",
      path: "$.study.convergence.achieved",
    });
  });

  it("admits only geometry-bound packages whose every declared hash matches", () => {
    const manifest = femReferenceManifestFixture();
    const evidence = femFixtureArtifactEvidence();
    const admitted = admitExternalFemReferencePackage(manifest, evidence);
    expect(admitted).toMatchObject({
      status: "admitted",
      reference: {
        provenance: FEM_REFERENCE_PROVENANCE,
        influencePolicy: FEM_REFERENCE_INFLUENCE_POLICY,
        displayLabelZh: "外部 FEM 只读参考",
      },
    });

    expect(
      admitExternalFemReferencePackage(manifest, {
        ...evidence,
        expectedGeometrySnapshotId: `geometry:${"b".repeat(64)}`,
      }),
    ).toMatchObject({ status: "failed", code: "incompatible_geometry" });

    expect(
      admitExternalFemReferencePackage(manifest, {
        ...evidence,
        artifactHashes: {
          ...evidence.artifactHashes,
          "field.b.csv": "f".repeat(64),
        },
      }),
    ).toMatchObject({ status: "failed", code: "artifact_hash_mismatch" });
    expect(manifest.geometrySnapshotId).toBe(FEM_FIXTURE_GEOMETRY_SNAPSHOT_ID);
  });

  it("keeps rejected or unconverged studies outside the admitted reference set", () => {
    const rejected = femReferenceManifestFixture();
    rejected.validation.status = "rejected";
    expect(
      admitExternalFemReferencePackage(rejected, femFixtureArtifactEvidence()),
    ).toMatchObject({ status: "failed", code: "quality_gate_failed" });

    const unconverged = femReferenceManifestFixture();
    unconverged.study.convergence.observedFraction = 0.03;
    unconverged.study.convergence.achieved = false;
    expect(
      admitExternalFemReferencePackage(unconverged, femFixtureArtifactEvidence()),
    ).toMatchObject({ status: "failed", code: "quality_gate_failed" });
  });

  it("cannot import calculation, material, registry or visualization mutation paths", () => {
    const source = readFileSync(
      new URL(
        "../../src/interchange/femReferenceManifest.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'][^"']*methods\//u);
    expect(source).not.toMatch(/from\s+["'][^"']*materials\//u);
    expect(source).not.toMatch(/from\s+["'][^"']*registries\//u);
    expect(source).not.toMatch(/from\s+["'][^"']*visualization\//u);
    expect(source).not.toContain("createGeometrySnapshot");
    expect(source).not.toContain("createMaterialSnapshot");
  });

  it("fails closed without executing accessors or propagating Proxy traps", () => {
    let getterCalls = 0;
    const accessor = femReferenceManifestFixture() as MutableRecord;
    Object.defineProperty(accessor, "solver", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    });
    expect(() => parseExternalFemReferenceManifest(accessor)).not.toThrow();
    expect(parseExternalFemReferenceManifest(accessor)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });
    expect(getterCalls).toBe(0);

    const proxy = new Proxy(femReferenceManifestFixture(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => parseExternalFemReferenceManifest(proxy)).not.toThrow();
    expect(parseExternalFemReferenceManifest(proxy)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });

    let evidenceGetterCalls = 0;
    const evidence = femFixtureArtifactEvidence();
    Object.defineProperty(evidence, "expectedGeometrySnapshotId", {
      enumerable: true,
      get() {
        evidenceGetterCalls += 1;
        throw new Error("hostile evidence getter");
      },
    });
    expect(() =>
      admitExternalFemReferencePackage(femReferenceManifestFixture(), evidence),
    ).not.toThrow();
    expect(
      admitExternalFemReferencePackage(femReferenceManifestFixture(), evidence),
    ).toMatchObject({ status: "failed", code: "invalid_manifest" });
    expect(evidenceGetterCalls).toBe(0);

    const evidenceProxy = new Proxy(femFixtureArtifactEvidence(), {
      ownKeys() {
        throw new Error("hostile evidence ownKeys");
      },
    });
    expect(() =>
      admitExternalFemReferencePackage(
        femReferenceManifestFixture(),
        evidenceProxy,
      ),
    ).not.toThrow();
    expect(
      admitExternalFemReferencePackage(
        femReferenceManifestFixture(),
        evidenceProxy,
      ),
    ).toMatchObject({ status: "failed", code: "invalid_manifest" });

    let proxyGetterCalls = 0;
    const getterProxy = new Proxy(femReferenceManifestFixture(), {
      get() {
        proxyGetterCalls += 1;
        throw new Error("hostile manifest get");
      },
    });
    expect(parseExternalFemReferenceManifest(getterProxy)).toMatchObject({
      status: "success",
    });
    expect(() =>
      admitExternalFemReferencePackage(
        getterProxy,
        femFixtureArtifactEvidence(),
      ),
    ).not.toThrow();
    expect(
      admitExternalFemReferencePackage(
        getterProxy,
        femFixtureArtifactEvidence(),
      ),
    ).toMatchObject({ status: "admitted" });
    expect(proxyGetterCalls).toBe(0);

    const revocable = Proxy.revocable(femReferenceManifestFixture(), {});
    revocable.revoke();
    expect(() => parseExternalFemReferenceManifest(revocable.proxy)).not.toThrow();
    expect(parseExternalFemReferenceManifest(revocable.proxy)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });
  });

  it("rejects null and extra manifest or evidence keys", () => {
    expect(() => parseExternalFemReferenceManifest(null)).not.toThrow();
    expect(parseExternalFemReferenceManifest(null)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });
    expect(() =>
      admitExternalFemReferencePackage(femReferenceManifestFixture(), null),
    ).not.toThrow();
    expect(
      admitExternalFemReferencePackage(femReferenceManifestFixture(), null),
    ).toMatchObject({ status: "failed", code: "invalid_manifest" });

    const extraManifest = femReferenceManifestFixture() as MutableRecord;
    extraManifest.unexpected = true;
    expect(parseExternalFemReferenceManifest(extraManifest)).toMatchObject({
      status: "failed",
      code: "invalid_manifest",
    });

    const extraEvidence = femFixtureArtifactEvidence() as MutableRecord;
    extraEvidence.unexpected = true;
    expect(
      admitExternalFemReferencePackage(
        femReferenceManifestFixture(),
        extraEvidence,
      ),
    ).toMatchObject({ status: "failed", code: "invalid_manifest" });

    const extraHashEvidence = femFixtureArtifactEvidence();
    (
      extraHashEvidence.artifactHashes as Record<string, string>
    )["unexpected.file"] = "f".repeat(64);
    expect(
      admitExternalFemReferencePackage(
        femReferenceManifestFixture(),
        extraHashEvidence,
      ),
    ).toMatchObject({ status: "failed", code: "invalid_manifest" });
  });
});
