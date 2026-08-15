import { describe, expect, it } from "vitest";

import { RELEASED_MATERIAL_REGISTRY } from "../../src/registries/materialCatalog.js";
import {
  MaterialRegistry,
  MaterialReleaseGateError,
  materialId,
  materialPropertyId,
  type MaterialPropertyRecord,
  type MaterialRecord,
} from "../../src/registries/materialRegistry.js";

function draftProperty(
  overrides: Partial<MaterialPropertyRecord> = {},
): MaterialPropertyRecord {
  return {
    propertyId: materialPropertyId("test.schema_sentinel"),
    revision: "draft-1",
    dimension: "dimensionless",
    unitSi: "one",
    independentVariables: [],
    data: { valueKind: "constant", valueSi: 1 },
    validRange: [],
    interpolationMethod: "not_applicable_constant",
    extrapolationPolicy: "forbid",
    uncertainty: {
      kind: "unknown",
      value: null,
      unitSi: null,
      coverageFactor: null,
      note: "Draft test metadata only; not a released material value.",
    },
    provenance: {
      sourceId: "draft-source",
      document: "draft",
      edition: "draft",
      pageTableFigureEquation: "draft",
      fileSha256: null,
      sourceReviewStatus: "pending_release_cross_check",
      testCondition: "unspecified",
      surfaceState: "unspecified",
    },
    dataQuality: "generic_typical",
    approvalStatus: "draft",
    approvedBy: null,
    approvedAt: null,
    ...overrides,
  };
}

function draftMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    materialId: materialId("test.material"),
    revision: "draft-1",
    libraryTier: "preset_common",
    dataQuality: "generic_typical",
    name: "Test-only draft",
    gradeOrProduct: "none",
    standard: "none",
    composition: "unspecified",
    condition: "unspecified",
    batch: "unspecified",
    category: "test",
    manufacturer: null,
    notes: "Test fixture; not engineering data.",
    propertyRecords: [draftProperty()],
    sourceRecords: [
      {
        sourceId: "draft-source",
        document: "draft",
        edition: "draft",
        fileSha256: null,
        sourceReviewStatus: "pending_release_cross_check",
        notes: "Draft test metadata only.",
      },
    ],
    approvalStatus: "draft",
    approvedBy: null,
    approvedAt: null,
    ...overrides,
  };
}

function releaseReadyProperty(
  overrides: Partial<MaterialPropertyRecord> = {},
): MaterialPropertyRecord {
  return draftProperty({
    approvalStatus: "approved",
    approvedBy: "property-reviewer",
    approvedAt: "2026-08-14T00:00:00.000Z",
    provenance: {
      sourceId: "controlled-source",
      document: "controlled-copy",
      edition: "1",
      pageTableFigureEquation: "table 1",
      fileSha256: "a".repeat(64),
      sourceReviewStatus: "reviewed_pass",
      testCondition: "declared",
      surfaceState: "declared",
    },
    ...overrides,
  });
}

function releaseReadyMaterial(
  property: MaterialPropertyRecord,
  overrides: Partial<MaterialRecord> = {},
): MaterialRecord {
  return draftMaterial({
    approvalStatus: "approved",
    approvedBy: "material-reviewer",
    approvedAt: "2026-08-14T00:00:00.000Z",
    propertyRecords: [property],
    sourceRecords: [
      {
        sourceId: "controlled-source",
        document: "controlled-copy",
        edition: "1",
        fileSha256: "a".repeat(64),
        sourceReviewStatus: "reviewed_pass",
        notes: "Controlled test fixture metadata.",
      },
    ],
    ...overrides,
  });
}

describe("MaterialRegistry schema and release gates", () => {
  it("ships an empty released material catalog at Foundation", () => {
    expect(RELEASED_MATERIAL_REGISTRY.catalogKind).toBe("release");
    expect(RELEASED_MATERIAL_REGISTRY.size).toBe(0);
    expect(RELEASED_MATERIAL_REGISTRY.releasedPresets()).toEqual([]);
  });

  it("supports all three authoring tiers without making drafts release defaults", () => {
    const records: MaterialRecord[] = [
      draftMaterial({ materialId: materialId("tier.preset"), libraryTier: "preset_common" }),
      draftMaterial({ materialId: materialId("tier.project"), libraryTier: "project_material", dataQuality: "project_specific" }),
      draftMaterial({ materialId: materialId("tier.user"), libraryTier: "user_defined", dataQuality: "user_defined" }),
    ];
    const authoring = new MaterialRegistry(records, "authoring");

    expect(authoring.byTier("preset_common")).toHaveLength(1);
    expect(authoring.byTier("project_material")).toHaveLength(1);
    expect(authoring.byTier("user_defined")).toHaveLength(1);
    expect(authoring.releasedPresets()).toEqual([]);
    expect(() => new MaterialRegistry([records[0]!], "release")).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "record_not_approved",
      }),
    );
  });

  it("enforces property-level approval, provenance review and source hash", () => {
    const approvedRecordWithDraftProperty = draftMaterial({
      approvalStatus: "approved",
      approvedBy: "reviewer",
      approvedAt: "2026-08-14T00:00:00.000Z",
    });
    expect(
      () => new MaterialRegistry([approvedRecordWithDraftProperty], "release"),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_not_approved",
      }),
    );

    const approvedPropertyWithoutReviewedSource = draftProperty({
      approvalStatus: "approved",
      approvedBy: "reviewer",
      approvedAt: "2026-08-14T00:00:00.000Z",
    });
    expect(
      () =>
        new MaterialRegistry(
          [
            draftMaterial({
              approvalStatus: "approved",
              approvedBy: "reviewer",
              approvedAt: "2026-08-14T00:00:00.000Z",
              propertyRecords: [approvedPropertyWithoutReviewedSource],
            }),
          ],
          "release",
        ),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_source_not_reviewed",
      }),
    );
  });

  it("accepts only fully approved, reviewed and hashed release records", () => {
    const property = draftProperty({
      approvalStatus: "approved",
      approvedBy: "property-reviewer",
      approvedAt: "2026-08-14T00:00:00.000Z",
      provenance: {
        sourceId: "controlled-source",
        document: "controlled-copy",
        edition: "1",
        pageTableFigureEquation: "table 1",
        fileSha256: "a".repeat(64),
        sourceReviewStatus: "reviewed_pass",
        testCondition: "declared",
        surfaceState: "declared",
      },
    });
    const record = draftMaterial({
      approvalStatus: "approved",
      approvedBy: "material-reviewer",
      approvedAt: "2026-08-14T00:00:00.000Z",
      propertyRecords: [property],
      sourceRecords: [
        {
          sourceId: "controlled-source",
          document: "controlled-copy",
          edition: "1",
          fileSha256: "a".repeat(64),
          sourceReviewStatus: "reviewed_pass",
          notes: "Controlled test fixture metadata.",
        },
      ],
    });
    const release = new MaterialRegistry([record], "release");

    expect(release.releasedPresets()).toHaveLength(1);
    expect(Object.isFrozen(release.get(record.materialId))).toBe(true);
    expect(Object.isFrozen(release.get(record.materialId).propertyRecords)).toBe(true);
  });

  it("allows a released constant to retain an explicit applicability domain without executing interpolation", () => {
    const property = releaseReadyProperty({
      propertyId: materialPropertyId("test.state_scoped_constant"),
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 350,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "test_metadata_only_not_executable",
      data: { valueKind: "constant", valueSi: 1 },
    });
    const record = releaseReadyMaterial(property);
    const release = new MaterialRegistry([record], "release");

    expect(release.get(record.materialId).propertyRecords[0]).toMatchObject({
      data: { valueKind: "constant", valueSi: 1 },
      interpolationMethod: "test_metadata_only_not_executable",
      validRange: [{ variable: "T", minimum: 300, maximum: 350 }],
    });
  });

  it("releases only the frozen one-dimensional numeric table shape and interpolation ID", () => {
    const property = releaseReadyProperty({
      propertyId: materialPropertyId("test.release_table"),
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "piecewise_linear",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { T: 300 }, valueSi: 1 },
          { coordinates: { T: 400 }, valueSi: 2 },
          { coordinates: { T: 500 }, valueSi: 3 },
        ],
      },
    });
    const record = releaseReadyMaterial(property);
    const release = new MaterialRegistry([record], "release");

    expect(release.get(record.materialId).propertyRecords[0]?.data.valueKind).toBe(
      "table",
    );
  });

  it("keeps unsupported table shapes, interpolation IDs, and functions out of release", () => {
    const multiAxis = releaseReadyProperty({
      propertyId: materialPropertyId("test.multi_axis"),
      independentVariables: ["T", "f"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
        {
          variable: "f",
          unitSi: "Hz",
          minimum: 1_000,
          maximum: 10_000,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "piecewise_linear",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { T: 300, f: 1_000 }, valueSi: 1 },
          { coordinates: { T: 500, f: 10_000 }, valueSi: 2 },
        ],
      },
    });
    expect(
      () => new MaterialRegistry([releaseReadyMaterial(multiAxis)], "release"),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_table_shape_not_release_supported",
        propertyId: multiAxis.propertyId,
      }),
    );

    const categorical = releaseReadyProperty({
      propertyId: materialPropertyId("test.categorical"),
      independentVariables: ["phase"],
      validRange: [
        {
          variable: "phase",
          unitSi: "one",
          minimum: "solid",
          maximum: "liquid",
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "piecewise_linear",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { phase: "solid" }, valueSi: 1 },
          { coordinates: { phase: "liquid" }, valueSi: 2 },
        ],
      },
    });
    expect(
      () => new MaterialRegistry([releaseReadyMaterial(categorical)], "release"),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_table_shape_not_release_supported",
        propertyId: categorical.propertyId,
      }),
    );

    const mixedBoundary = releaseReadyProperty({
      propertyId: materialPropertyId("test.mixed_boundary"),
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 250,
          maximum: 550,
          boundaryPolicy: "mixed",
        },
      ],
      interpolationMethod: "piecewise_linear",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { T: 300 }, valueSi: 1 },
          { coordinates: { T: 500 }, valueSi: 2 },
        ],
      },
    });
    expect(
      () => new MaterialRegistry([releaseReadyMaterial(mixedBoundary)], "release"),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_table_shape_not_release_supported",
        propertyId: mixedBoundary.propertyId,
      }),
    );

    const unregisteredInterpolation = releaseReadyProperty({
      propertyId: materialPropertyId("test.unregistered_interpolation"),
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "spline_not_frozen",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { T: 300 }, valueSi: 1 },
          { coordinates: { T: 500 }, valueSi: 2 },
        ],
      },
    });
    expect(
      () =>
        new MaterialRegistry(
          [releaseReadyMaterial(unregisteredInterpolation)],
          "release",
        ),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_interpolation_not_release_registered",
        propertyId: unregisteredInterpolation.propertyId,
      }),
    );

    const approvedFunction = releaseReadyProperty({
      propertyId: materialPropertyId("test.approved_function"),
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "not_applicable_function",
      data: {
        valueKind: "approved_function",
        functionId: "test.function",
        parameterSetId: "test.parameter_set",
      },
    });
    expect(
      () =>
        new MaterialRegistry([releaseReadyMaterial(approvedFunction)], "release"),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_function_not_release_registered",
        propertyId: approvedFunction.propertyId,
      }),
    );
  });

  it("rejects duplicate material and property IDs", () => {
    const record = draftMaterial();
    expect(() => new MaterialRegistry([record, record])).toThrow(/duplicate id/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [draftProperty(), draftProperty()] }),
      ]),
    ).toThrow(/duplicate property_id/u);
  });

  it("rejects non-finite constants, table values and coordinates", () => {
    for (const valueSi of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() =>
        new MaterialRegistry([
          draftMaterial({ propertyRecords: [draftProperty({ data: { valueKind: "constant", valueSi } })] }),
        ]),
      ).toThrow(/finite/u);
    }

    const tableBase: MaterialPropertyRecord = draftProperty({
      independentVariables: ["T"],
      data: { valueKind: "table", points: [{ coordinates: { T: 300 }, valueSi: 1 }] },
      validRange: [
        { variable: "T", unitSi: "K", minimum: 273.15, maximum: 500, boundaryPolicy: "inclusive" },
      ],
      interpolationMethod: "test_only_linear",
    });
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [{ ...tableBase, data: { valueKind: "table", points: [{ coordinates: { T: Number.NaN }, valueSi: 1 }] } }],
        }),
      ]),
    ).toThrow(/finite/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [{ ...tableBase, data: { valueKind: "table", points: [{ coordinates: { T: 300 }, valueSi: Number.POSITIVE_INFINITY }] } }],
        }),
      ]),
    ).toThrow(/finite/u);
  });

  it("requires every declared independent variable to have one valid range", () => {
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              independentVariables: ["T", "f"],
              validRange: [
                {
                  variable: "T",
                  unitSi: "K",
                  minimum: 300,
                  maximum: 500,
                  boundaryPolicy: "inclusive",
                },
              ],
            }),
          ],
        }),
      ]),
    ).toThrow(/independent variable f has no declared valid range/u);

    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              independentVariables: ["T"],
              validRange: [
                {
                  variable: "T",
                  unitSi: "K",
                  minimum: 300,
                  maximum: 500,
                  boundaryPolicy: "inclusive",
                },
                {
                  variable: "pressure",
                  unitSi: "Pa",
                  minimum: 100_000,
                  maximum: 200_000,
                  boundaryPolicy: "inclusive",
                },
              ],
            }),
          ],
        }),
      ]),
    ).toThrow(/range declares undeclared variable pressure/u);
  });

  it("rejects empty-axis, singleton, duplicate, and unordered numeric tables", () => {
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              data: {
                valueKind: "table",
                points: [{ coordinates: {}, valueSi: 1 }],
              },
            }),
          ],
        }),
      ]),
    ).toThrow(/table must declare at least one independent variable/u);

    const numericTableBase: MaterialPropertyRecord = draftProperty({
      independentVariables: ["T"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "piecewise_linear",
      data: {
        valueKind: "table",
        points: [{ coordinates: { T: 300 }, valueSi: 1 }],
      },
    });
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [numericTableBase] }),
      ]),
    ).toThrow(/must contain at least two points/u);

    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            {
              ...numericTableBase,
              data: {
                valueKind: "table",
                points: [
                  { coordinates: { T: 300 }, valueSi: 1 },
                  { coordinates: { T: 300 }, valueSi: 2 },
                ],
              },
            },
          ],
        }),
      ]),
    ).toThrow(/duplicate full table coordinates/u);

    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            {
              ...numericTableBase,
              data: {
                valueKind: "table",
                points: [
                  { coordinates: { T: 400 }, valueSi: 1 },
                  { coordinates: { T: 300 }, valueSi: 2 },
                ],
              },
            },
          ],
        }),
      ]),
    ).toThrow(/strictly increasing/u);

    const accepted = new MaterialRegistry([
      draftMaterial({
        propertyRecords: [
          {
            ...numericTableBase,
            data: {
              valueKind: "table",
              points: [
                { coordinates: { T: 300 }, valueSi: 1 },
                { coordinates: { T: 400 }, valueSi: 2 },
                { coordinates: { T: 500 }, valueSi: 3 },
              ],
            },
          },
        ],
      }),
    ]);
    expect(accepted.size).toBe(1);
  });

  it("rejects duplicate full coordinate tuples regardless of object key order", () => {
    const property = draftProperty({
      independentVariables: ["T", "f"],
      validRange: [
        {
          variable: "T",
          unitSi: "K",
          minimum: 300,
          maximum: 500,
          boundaryPolicy: "inclusive",
        },
        {
          variable: "f",
          unitSi: "Hz",
          minimum: 1_000,
          maximum: 10_000,
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "draft_multidimensional",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { T: 300, f: 1_000 }, valueSi: 1 },
          { coordinates: { f: 1_000, T: 300 }, valueSi: 2 },
        ],
      },
    });

    expect(() =>
      new MaterialRegistry([draftMaterial({ propertyRecords: [property] })]),
    ).toThrow(/duplicate full table coordinates/u);
  });

  it("requires every table coordinate to lie in its mechanically decidable domain", () => {
    const tableWith = (
      point: number | string,
      minimum: number | string,
      maximum: number | string,
      boundaryPolicy: "inclusive" | "exclusive" | "mixed" = "inclusive",
    ): MaterialPropertyRecord =>
      draftProperty({
        independentVariables: ["T"],
        validRange: [
          {
            variable: "T",
            unitSi: "K",
            minimum,
            maximum,
            boundaryPolicy,
          },
        ],
        interpolationMethod: "draft_only",
        data: {
          valueKind: "table",
          points: [
            { coordinates: { T: point }, valueSi: 1 },
            { coordinates: { T: typeof point === "number" ? 400 : maximum }, valueSi: 2 },
          ],
        },
      });

    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [tableWith(299, 300, 500)] }),
      ]),
    ).toThrow(/outside its declared domain/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [tableWith("300", 300, 500)] }),
      ]),
    ).toThrow(/must be numeric/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [tableWith(300, 300, 500, "exclusive")] }),
      ]),
    ).toThrow(/excluded domain endpoint/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [tableWith(300, 300, 500, "mixed")] }),
      ]),
    ).toThrow(/endpoint membership is ambiguous/u);

    const textualProperty = draftProperty({
      independentVariables: ["phase"],
      validRange: [
        {
          variable: "phase",
          unitSi: "one",
          minimum: "solid",
          maximum: "liquid",
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "draft_categorical",
      data: {
        valueKind: "table",
        points: [{ coordinates: { phase: "gas" }, valueSi: 1 }],
      },
    });
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [textualProperty] }),
      ]),
    ).toThrow(/not one of the mechanically declared textual domain endpoints/u);
  });

  it("treats positive and negative zero as the same numeric table coordinate", () => {
    const property = draftProperty({
      independentVariables: ["H", "phase"],
      validRange: [
        {
          variable: "H",
          unitSi: "A_per_m",
          minimum: -1,
          maximum: 1,
          boundaryPolicy: "inclusive",
        },
        {
          variable: "phase",
          unitSi: "one",
          minimum: "solid",
          maximum: "solid",
          boundaryPolicy: "inclusive",
        },
      ],
      interpolationMethod: "draft_multidimensional",
      data: {
        valueKind: "table",
        points: [
          { coordinates: { H: 0, phase: "solid" }, valueSi: 1 },
          { coordinates: { H: -0, phase: "solid" }, valueSi: 2 },
        ],
      },
    });
    expect(() =>
      new MaterialRegistry([draftMaterial({ propertyRecords: [property] })]),
    ).toThrow(/duplicate full table coordinates/u);
  });

  it("rejects invalid ranges and uncertainty metadata", () => {
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              independentVariables: ["T"],
              validRange: [
                { variable: "T", unitSi: "K", minimum: 500, maximum: 300, boundaryPolicy: "inclusive" },
              ],
            }),
          ],
        }),
      ]),
    ).toThrow(/minimum exceeds maximum/u);

    for (const uncertainty of [
      { kind: "standard" as const, value: Number.NaN, unitSi: "one" as const, coverageFactor: null, note: "test" },
      { kind: "expanded" as const, value: 1, unitSi: "one" as const, coverageFactor: Number.POSITIVE_INFINITY, note: "test" },
      { kind: "expanded" as const, value: 1, unitSi: "one" as const, coverageFactor: 0, note: "test" },
    ]) {
      expect(() =>
        new MaterialRegistry([
          draftMaterial({ propertyRecords: [draftProperty({ uncertainty })] }),
        ]),
      ).toThrow(TypeError);
    }
  });

  it("requires controlled canonical unit/dimension semantics", () => {
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [draftProperty({ unitSi: "percent" })],
        }),
      ]),
    ).toThrow(/not canonical SI/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              dimension: "not_controlled" as MaterialPropertyRecord["dimension"],
              unitSi: "not_controlled" as MaterialPropertyRecord["unitSi"],
            }),
          ],
        }),
      ]),
    ).toThrow(/unknown controlled dimension_id/u);
  });

  it("requires provenance to resolve to an exactly matching source record", () => {
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({
              provenance: { ...draftProperty().provenance, sourceId: "missing-source" },
            }),
          ],
        }),
      ]),
    ).toThrow(/references missing source_id/u);

    const reviewedProvenance = {
      ...draftProperty().provenance,
      fileSha256: "b".repeat(64),
      sourceReviewStatus: "reviewed_pass" as const,
    };
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ propertyRecords: [draftProperty({ provenance: reviewedProvenance })] }),
      ]),
    ).toThrow(/does not match its source record/u);

    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [draftProperty({ provenance: reviewedProvenance })],
          sourceRecords: [
            {
              ...draftMaterial().sourceRecords[0]!,
              fileSha256: "b".repeat(64),
              sourceReviewStatus: "reviewed_fail",
            },
          ],
        }),
      ]),
    ).toThrow(/does not match its source record/u);
  });

  it("rejects empty controlled IDs/revisions and non-canonical approval metadata", () => {
    expect(() => new MaterialRegistry([draftMaterial({ revision: "" })])).toThrow(/revision must be non-empty/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ sourceRecords: [{ ...draftMaterial().sourceRecords[0]!, sourceId: "" }] }),
      ]),
    ).toThrow(/source_id must be a stable/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          approvalStatus: "approved",
          approvedBy: " ",
          approvedAt: "2026-08-14T00:00:00.000Z",
        }),
      ]),
    ).toThrow(/approvedBy must be non-empty/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({ approvalStatus: "approved", approvedBy: null, approvedAt: null }),
      ]),
    ).toThrow(/approved status requires approval metadata/u);
    expect(() =>
      new MaterialRegistry(
        [draftMaterial({ approvalStatus: "approved", approvedBy: null, approvedAt: null })],
        "release",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "record_approval_metadata_missing",
      }),
    );
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [
            draftProperty({ approvalStatus: "approved", approvedBy: null, approvedAt: null }),
          ],
        }),
      ]),
    ).toThrow(/approved status requires approval metadata/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          approvalStatus: "approved",
          approvedBy: "reviewer",
          approvedAt: "2026-08-14T00:00:00Z",
        }),
      ]),
    ).toThrow(/canonical ISO-8601/u);
    expect(() =>
      new MaterialRegistry([
        draftMaterial({
          propertyRecords: [draftProperty({ revision: "" })],
        }),
      ]),
    ).toThrow(/revision must be non-empty/u);
  });

  it("rejects accessor-bearing records without executing the accessor", () => {
    const record = draftMaterial();
    let reads = 0;
    Object.defineProperty(record, "name", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return "stateful material name";
      },
    });

    expect(() => new MaterialRegistry([record])).toThrow(/accessors/u);
    expect(reads).toBe(0);
  });

  it("rejects nested array accessors without executing them", () => {
    const propertyRecords = [draftProperty()];
    let reads = 0;
    Object.defineProperty(propertyRecords, "0", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return draftProperty();
      },
    });

    expect(() =>
      new MaterialRegistry([draftMaterial({ propertyRecords })]),
    ).toThrow(/accessors/u);
    expect(reads).toBe(0);
  });

  it("validates a nested Proxy array from the same descriptor snapshot", () => {
    const approvedProperty = releaseReadyProperty();
    let indexGets = 0;
    let indexDescriptors = 0;
    const propertyRecords = new Proxy([approvedProperty], {
      get(target, key, receiver) {
        indexGets += 1;
        return Reflect.get(target, key, receiver);
      },
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (key !== "0" || descriptor === undefined) {
          return descriptor;
        }
        indexDescriptors += 1;
        return {
          ...descriptor,
          value: draftProperty(),
        };
      },
    });

    expect(() =>
      new MaterialRegistry(
        [releaseReadyMaterial(approvedProperty, { propertyRecords })],
        "release",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "property_not_approved",
      }),
    );
    expect(indexGets).toBe(0);
    expect(indexDescriptors).toBe(1);
  });

  it("validates each candidate before materializing a later hostile candidate", () => {
    let hostileReads = 0;
    const laterHostile = new Proxy(draftMaterial(), {
      ownKeys() {
        hostileReads += 1;
        throw new Error("later hostile candidate was read");
      },
    });

    expect(() =>
      new MaterialRegistry([
        draftMaterial({ revision: "" }),
        laterHostile,
      ]),
    ).toThrow(/revision must be non-empty/u);
    expect(hostileReads).toBe(0);
  });

  it("validates and registers one immutable view of a stateful Proxy candidate", () => {
    const approved = releaseReadyMaterial(releaseReadyProperty());
    let approvalGets = 0;
    let approvalDescriptors = 0;
    const dualState = new Proxy(approved, {
      get(target, key, receiver) {
        if (key === "approvalStatus") {
          approvalGets += 1;
          return "approved";
        }
        return Reflect.get(target, key, receiver);
      },
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (key !== "approvalStatus" || descriptor === undefined) {
          return descriptor;
        }
        approvalDescriptors += 1;
        return { ...descriptor, value: "draft" };
      },
    });

    expect(() => new MaterialRegistry([dualState], "release")).toThrowError(
      expect.objectContaining<Partial<MaterialReleaseGateError>>({
        reason: "record_not_approved",
      }),
    );
    expect(approvalGets).toBe(0);
    expect(approvalDescriptors).toBeGreaterThan(0);
  });

  it("rejects forged runtime enum values even when TypeScript is bypassed", () => {
    const forgedRecords: MaterialRecord[] = [
      draftMaterial({ libraryTier: "forged" as MaterialRecord["libraryTier"] }),
      draftMaterial({ dataQuality: "forged" as MaterialRecord["dataQuality"] }),
      draftMaterial({ approvalStatus: "forged" as MaterialRecord["approvalStatus"] }),
      draftMaterial({
        sourceRecords: [
          {
            ...draftMaterial().sourceRecords[0]!,
            sourceReviewStatus: "forged" as MaterialRecord["sourceRecords"][number]["sourceReviewStatus"],
          },
        ],
      }),
      draftMaterial({
        propertyRecords: [
          draftProperty({
            data: { valueKind: "forged" } as unknown as MaterialPropertyRecord["data"],
          }),
        ],
      }),
      draftMaterial({
        propertyRecords: [
          draftProperty({
            independentVariables: ["forged" as MaterialPropertyRecord["independentVariables"][number]],
          }),
        ],
      }),
      draftMaterial({
        propertyRecords: [
          draftProperty({
            independentVariables: ["T"],
            validRange: [
              {
                variable: "T",
                unitSi: "K",
                minimum: 300,
                maximum: 400,
                boundaryPolicy: "forged" as MaterialPropertyRecord["validRange"][number]["boundaryPolicy"],
              },
            ],
          }),
        ],
      }),
      draftMaterial({
        propertyRecords: [
          draftProperty({
            extrapolationPolicy: "forged" as MaterialPropertyRecord["extrapolationPolicy"],
          }),
        ],
      }),
      draftMaterial({
        propertyRecords: [
          draftProperty({
            uncertainty: {
              ...draftProperty().uncertainty,
              kind: "forged" as MaterialPropertyRecord["uncertainty"]["kind"],
            },
          }),
        ],
      }),
    ];

    for (const record of forgedRecords) {
      expect(() => new MaterialRegistry([record])).toThrow(/unknown controlled enum value/u);
    }
  });

  it("requires interpolation and provenance context text", () => {
    for (const property of [
      draftProperty({ interpolationMethod: "" }),
      draftProperty({
        provenance: { ...draftProperty().provenance, testCondition: "" },
      }),
      draftProperty({
        provenance: { ...draftProperty().provenance, surfaceState: "" },
      }),
    ]) {
      expect(() =>
        new MaterialRegistry([draftMaterial({ propertyRecords: [property] })]),
      ).toThrow(/must be non-empty/u);
    }
  });
});
