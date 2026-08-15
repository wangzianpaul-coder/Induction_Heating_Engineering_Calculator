import { describe, expect, it } from "vitest";

import {
  createScalarQuantity,
  createUnavailableQuantity,
} from "../../src/controlled-quantity-factory.js";
import { parameterId, sourceRef } from "../../src/domain/ids.js";
import {
  createMaterialSnapshot,
  type MaterialPropertySnapshot,
  type MaterialSnapshotPayload,
} from "../../src/domain/snapshot.js";
import {
  MATERIAL_METADATA_APPROVAL_STATUSES,
  MATERIAL_METADATA_COMPARISON_READINESS,
  MATERIAL_METADATA_DATA_QUALITIES,
  compareMaterialSnapshotMetadata,
  type MaterialMetadataComparisonInput,
} from "../../src/materials/materialMetadataComparison.js";
import { fingerprint } from "../../src/serialization/canonical-json.js";

const CREATED_AT = "2026-08-15T00:00:00.000Z";
const STATE_300K = Object.freeze({
  temperature: Object.freeze({
    valueSi: 300,
    dimensionId: "absolute_temperature",
    canonicalUnitId: "K",
  }),
  frequency: Object.freeze({
    valueSi: 10_000,
    dimensionId: "frequency",
    canonicalUnitId: "Hz",
  }),
  phase: "solid",
});
const STATE_350K = Object.freeze({
  ...STATE_300K,
  temperature: Object.freeze({
    valueSi: 350,
    dimensionId: "absolute_temperature",
    canonicalUnitId: "K",
  }),
});

function scalar(
  quantityParameterId: "resistivity" | "relative_permeability",
  value: number,
  source: string,
) {
  const resistivity = quantityParameterId === "resistivity";
  return createScalarQuantity({
    parameterId: parameterId(quantityParameterId),
    value,
    unitId: resistivity ? "ohm_m" : "one",
    dimensionId: resistivity ? "electrical_resistivity" : "dimensionless",
    displayUnitId: resistivity ? "ohm_m" : "one",
    basis: "total",
    uncertainty: { kind: "unknown" },
    provenance: {
      sourceKind: "material",
      sourceRef: sourceRef(source),
      dataQuality: "approved_reference",
    },
    status: "known",
    validDigits: 6,
    stateKey: "material-comparison-state-300K-10kHz-solid",
  });
}

function unavailableResistivity(source: string) {
  return createUnavailableQuantity({
    parameterId: parameterId("resistivity"),
    dimensionId: "electrical_resistivity",
    basis: "total",
    provenance: {
      sourceKind: "material",
      sourceRef: sourceRef(source),
      dataQuality: "approved_reference",
    },
    status: "missing",
    reason: "The frozen snapshot has no resolved value at this state.",
    stateKey: "material-comparison-state-300K-10kHz-solid",
  });
}

function property(
  propertyId: string,
  value: ReturnType<typeof scalar> | ReturnType<typeof unavailableResistivity>,
  state: typeof STATE_300K | typeof STATE_350K = STATE_300K,
  source = "MAT:SRC:PRIMARY",
): MaterialPropertySnapshot {
  return {
    propertyId,
    value,
    state,
    dataQuality: "approved_reference",
    sourceRefs: [source],
    interpolation: {
      status: "pre_resolved_snapshot_metadata",
      provenance: source,
    },
    extrapolation: {
      policy: "forbid",
      used: false,
    },
  };
}

function materialSnapshot(input: {
  readonly materialId: string;
  readonly revision?: string;
  readonly approvalStatus?: string;
  readonly properties?: readonly MaterialPropertySnapshot[];
}) {
  return createMaterialSnapshot(
    {
      materialId: input.materialId,
      revision: input.revision ?? "rev-1",
      libraryTier: "project_material",
      approvalStatus: input.approvalStatus ?? "approved",
      properties: input.properties ?? [
        property(
          "rho_e",
          scalar("resistivity", 1.75e-8, "MAT:SRC:RHO"),
          STATE_300K,
          "MAT:SRC:RHO",
        ),
        property(
          "mu_r",
          scalar("relative_permeability", 1.01, "MAT:SRC:MU"),
          STATE_300K,
          "MAT:SRC:MU",
        ),
      ],
    } satisfies MaterialSnapshotPayload,
    CREATED_AT,
  );
}

function baseInput(
  candidates: readonly unknown[],
): MaterialMetadataComparisonInput {
  return {
    comparisonCaseId: "case.material-comparison-001",
    nonMaterialInputFingerprint: null,
    candidateSource: "explicit_snapshots",
    requiredPropertyIds: ["rho_e", "mu_r"],
    propertyExpectations: [
      {
        propertyId: "rho_e",
        quantityParameterId: "resistivity",
        dimensionId: "electrical_resistivity",
        canonicalUnitId: "ohm_m",
        expectedState: STATE_300K,
      },
      {
        propertyId: "mu_r",
        quantityParameterId: "relative_permeability",
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
        expectedState: STATE_300K,
      },
    ],
    candidates,
  };
}

function mutableInput(candidates: readonly unknown[] = [
  materialSnapshot({ materialId: "material.mutable.default" }),
]): Record<string, any> {
  return structuredClone(baseInput(candidates)) as Record<string, any>;
}

function recomputeMaterialIdentity(candidate: Record<string, any>): void {
  const recalculated = fingerprint({
    kind: candidate.kind,
    schemaVersion: candidate.schemaVersion,
    technicalFreezeId: candidate.technicalFreezeId,
    payload: candidate.payload,
  });
  candidate.fingerprint = recalculated;
  candidate.snapshotId = `material:${recalculated.value}`;
}

function expectFailure(
  input: unknown,
  status: "invalid_input" | "insufficient_data",
  reason: string,
) {
  const result = compareMaterialSnapshotMetadata(input);
  expect(result).toMatchObject({ status, failure: { reason } });
  expect("candidates" in result).toBe(false);
  return result;
}

describe("isolated material metadata comparison", () => {
  it("compares exact snapshot metadata in caller order without engineering arithmetic", () => {
    const second = materialSnapshot({
      materialId: "material.second",
      revision: "rev-second",
      approvalStatus: "reviewed",
    });
    const first = materialSnapshot({
      materialId: "material.first",
      revision: "rev-first",
    });
    const result = compareMaterialSnapshotMetadata(baseInput([second, first]));

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.candidates.map((candidate) => candidate.materialId)).toEqual([
      "material.second",
      "material.first",
    ]);
    expect(result.candidates.map((candidate) => candidate.status)).toEqual([
      "success",
      "success",
    ]);
    expect(result.candidates[0]?.approvalStatus).toBe("reviewed");
    expect(result.requiredPropertyIds).toEqual(["rho_e", "mu_r"]);
    expect(
      result.candidates[0]?.properties.map((cell) => cell.propertyId),
    ).toEqual(["rho_e", "mu_r"]);

    const rho = result.candidates[0]?.properties[0];
    expect(rho).toMatchObject({
      status: "available",
      engineeringUsable: false,
      observed: {
        dataQuality: "approved_reference",
        sourceRefs: ["MAT:SRC:RHO"],
        interpolation: {
          status: "pre_resolved_snapshot_metadata",
          provenance: "MAT:SRC:RHO",
        },
        extrapolation: { policy: "forbid", used: false },
        quantitySemantics: {
          parameterId: "resistivity",
          dimensionId: "electrical_resistivity",
          canonicalUnitId: "ohm_m",
        },
      },
    });
    if (rho?.status === "available" && rho.value.kind === "scalar") {
      expect(rho.value.valueSi).toBe(1.75e-8);
      expect(rho.value.sourceRef).toBe("MAT:SRC:RHO");
    }
    expect(result.readiness.arithmeticPerformed).toBe(false);
    expect(result.readiness.runtimeActivation).toBe("blocked");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates)).toBe(true);
    expect(Object.isFrozen(result.candidates[0]?.properties)).toBe(true);
    expect("sensitivity" in result).toBe(false);
    expect("recommended" in result).toBe(false);
    expect("ranking" in result).toBe(false);
  });

  it("uses a caller-supplied non-material fingerprint instead of a case ID", () => {
    const input = mutableInput();
    input.comparisonCaseId = null;
    input.nonMaterialInputFingerprint = fingerprint({
      geometrySnapshotId: `geometry:${"a".repeat(64)}`,
      methodVersion: "1.0.0-alpha.1",
      solverSettings: { tolerance: "caller-frozen" },
    });
    const result = compareMaterialSnapshotMetadata(input);
    expect(result).toMatchObject({
      status: "success",
      comparisonCaseId: null,
      nonMaterialInputFingerprint: input.nonMaterialInputFingerprint,
    });
  });

  it("keeps missing, state-mismatched, and semantic-mismatched candidates visible", () => {
    const missing = materialSnapshot({
      materialId: "material.missing-mu",
      properties: [
        property(
          "rho_e",
          scalar("resistivity", 2e-8, "MAT:SRC:MISSING:RHO"),
          STATE_300K,
          "MAT:SRC:MISSING:RHO",
        ),
      ],
    });
    const mismatched = materialSnapshot({
      materialId: "material.mismatched-rho",
      properties: [
        property(
          "rho_e",
          scalar("relative_permeability", 1.2, "MAT:SRC:MISMATCH"),
          STATE_350K,
          "MAT:SRC:MISMATCH",
        ),
        property(
          "mu_r",
          scalar("relative_permeability", 1.05, "MAT:SRC:MISMATCH:MU"),
          STATE_300K,
          "MAT:SRC:MISMATCH:MU",
        ),
      ],
    });
    const result = compareMaterialSnapshotMetadata(
      baseInput([missing, mismatched]),
    );

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.status)).toEqual([
      "insufficient_data",
      "insufficient_data",
    ]);
    expect(result.candidates[0]?.properties[1]).toEqual(
      expect.objectContaining({
        propertyId: "mu_r",
        status: "insufficient_data",
        reasons: ["property_missing"],
        observed: null,
      }),
    );
    const mismatchedRho = result.candidates[1]?.properties[0];
    expect(mismatchedRho).toMatchObject({
      status: "insufficient_data",
      reasons: [
        "state_mismatch",
        "quantity_parameter_mismatch",
        "quantity_dimension_mismatch",
        "quantity_canonical_unit_mismatch",
      ],
      observed: {
        sourceRefs: ["MAT:SRC:MISMATCH"],
        dataQuality: "approved_reference",
      },
    });
    expect(mismatchedRho === undefined || "value" in mismatchedRho).toBe(false);
  });

  it("marks an exact-state unavailable quantity insufficient without a numeric payload", () => {
    const candidate = materialSnapshot({
      materialId: "material.unavailable-rho",
      properties: [
        property(
          "rho_e",
          unavailableResistivity("MAT:SRC:UNAVAILABLE"),
          STATE_300K,
          "MAT:SRC:UNAVAILABLE",
        ),
        property(
          "mu_r",
          scalar("relative_permeability", 1, "MAT:SRC:UNAVAILABLE:MU"),
          STATE_300K,
          "MAT:SRC:UNAVAILABLE:MU",
        ),
      ],
    });
    const result = compareMaterialSnapshotMetadata(baseInput([candidate]));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.candidates[0]?.status).toBe("insufficient_data");
    expect(result.candidates[0]?.properties[0]).toMatchObject({
      status: "insufficient_data",
      reasons: ["quantity_unavailable"],
    });
    expect("value" in result.candidates[0]!.properties[0]!).toBe(false);
  });

  it("does not alias mutable caller data into the frozen report", () => {
    const input = mutableInput();
    const result = compareMaterialSnapshotMetadata(input);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    input.candidates[0].payload.revision = "mutated-after-call";
    input.propertyExpectations[0].expectedState.temperature.valueSi = 999;
    expect(result.candidates[0]?.revision).toBe("rev-1");
    expect(
      (result.propertyExpectations[0]?.expectedState.temperature as {
        valueSi: number;
      }).valueSi,
    ).toBe(300);
  });
});

describe("released catalog and readiness boundary", () => {
  it("returns explicit insufficient_data for the empty released catalog", () => {
    const input = mutableInput([]);
    input.candidateSource = "released_catalog";
    expectFailure(input, "insufficient_data", "released_catalog_empty");
    expect(MATERIAL_METADATA_COMPARISON_READINESS.releasedCatalogRecordCount).toBe(
      0,
    );
  });

  it("does not permit explicit candidates to masquerade as released records", () => {
    const input = mutableInput();
    input.candidateSource = "released_catalog";
    expectFailure(
      input,
      "invalid_input",
      "released_catalog_candidates_forbidden",
    );
  });

  it("returns insufficient_data rather than fabricating an explicit candidate", () => {
    expectFailure(
      baseInput([]),
      "insufficient_data",
      "explicit_candidates_missing",
    );
  });

  it("publishes the four blocking gates and prohibited computation list", () => {
    expect(MATERIAL_METADATA_COMPARISON_READINESS.gates).toMatchObject({
      a01PropertyResolution: { status: "blocked" },
      materialSnapshotSchema: { status: "blocked" },
      kCaseOrchestration: { status: "blocked" },
      downstreamResults: { status: "blocked" },
    });
    expect(
      MATERIAL_METADATA_COMPARISON_READINESS.prohibitedOperations,
    ).toEqual([
      "property_interpolation",
      "property_extrapolation",
      "source_averaging",
      "curve_splicing",
      "difference_or_percentage",
      "candidate_sorting_or_ranking",
      "recommended_selection",
      "sensitivity_calculation",
    ]);
  });

  it("pins the ADR-0005 material enums rather than method/global supersets", () => {
    expect(MATERIAL_METADATA_APPROVAL_STATUSES).toEqual([
      "draft",
      "reviewed",
      "approved",
      "rejected",
      "superseded",
    ]);
    expect(MATERIAL_METADATA_APPROVAL_STATUSES).not.toContain(
      "approved_with_limitation",
    );
    expect(MATERIAL_METADATA_DATA_QUALITIES).toEqual([
      "approved_reference",
      "engineering_reference",
      "generic_typical",
      "project_specific",
      "user_defined",
    ]);
    expect(MATERIAL_METADATA_DATA_QUALITIES).not.toContain("measured");
    expect(
      MATERIAL_METADATA_COMPARISON_READINESS.gates.materialSnapshotSchema
        .reason,
    ).toContain("property.sourceRefs");
  });
});

describe("global comparison contract validation", () => {
  it("requires exactly one comparison-case binding", () => {
    const neither = mutableInput();
    neither.comparisonCaseId = null;
    neither.nonMaterialInputFingerprint = null;
    expectFailure(
      neither,
      "invalid_input",
      "comparison_case_binding_invalid",
    );

    const both = mutableInput();
    both.nonMaterialInputFingerprint = fingerprint({ frozen: true });
    expectFailure(both, "invalid_input", "comparison_case_binding_invalid");

    const malformedFingerprint = mutableInput();
    malformedFingerprint.comparisonCaseId = null;
    malformedFingerprint.nonMaterialInputFingerprint = {
      algorithm: "sha256",
      value: "A".repeat(64),
    };
    expectFailure(
      malformedFingerprint,
      "invalid_input",
      "comparison_case_binding_invalid",
    );
  });

  it("rejects extra input fields and an unknown candidate source", () => {
    const extra = mutableInput();
    extra.helpfulDefault = true;
    expectFailure(extra, "invalid_input", "input_schema_invalid");

    const source = mutableInput();
    source.candidateSource = "automatic_best_material";
    expectFailure(source, "invalid_input", "candidate_source_invalid");
  });

  it("rejects duplicate required IDs, duplicate expectations, and set mismatch", () => {
    const duplicateRequired = mutableInput();
    duplicateRequired.requiredPropertyIds = ["rho_e", "rho_e"];
    expectFailure(
      duplicateRequired,
      "invalid_input",
      "duplicate_required_property_id",
    );

    const duplicateExpectation = mutableInput();
    duplicateExpectation.propertyExpectations[1] = structuredClone(
      duplicateExpectation.propertyExpectations[0],
    );
    expectFailure(
      duplicateExpectation,
      "invalid_input",
      "duplicate_property_expectation",
    );

    const mismatch = mutableInput();
    mismatch.propertyExpectations.pop();
    expectFailure(
      mismatch,
      "invalid_input",
      "required_property_expectation_mismatch",
    );
  });

  it("rejects expectation semantics that contradict the frozen parameter registry", () => {
    const input = mutableInput();
    input.propertyExpectations[0].dimensionId = "dimensionless";
    input.propertyExpectations[0].canonicalUnitId = "one";
    expectFailure(
      input,
      "invalid_input",
      "required_property_contract_invalid",
    );
  });

  it("rejects duplicate candidate snapshot identities globally", () => {
    const candidate = materialSnapshot({ materialId: "material.duplicate" });
    expectFailure(
      baseInput([candidate, candidate]),
      "invalid_input",
      "duplicate_candidate_snapshot",
    );
  });
});

describe("material snapshot trust boundary", () => {
  it("checks schema, freeze, timestamp, fingerprint, and snapshotId", () => {
    const wrongSchema = structuredClone(
      materialSnapshot({ materialId: "material.bad-schema" }),
    ) as Record<string, any>;
    wrongSchema.schemaVersion = "material-schema.invalid";

    const wrongFreeze = structuredClone(
      materialSnapshot({ materialId: "material.bad-freeze" }),
    ) as Record<string, any>;
    wrongFreeze.technicalFreezeId = "IH-EC-V1-G0-UNCONTROLLED";

    const wrongTimestamp = structuredClone(
      materialSnapshot({ materialId: "material.bad-time" }),
    ) as Record<string, any>;
    wrongTimestamp.createdAt = "2026-08-15T00:00:00Z";

    const tamperedContent = structuredClone(
      materialSnapshot({ materialId: "material.bad-fingerprint" }),
    ) as Record<string, any>;
    tamperedContent.payload.revision = "silently-mutated";

    const wrongSnapshotId = structuredClone(
      materialSnapshot({ materialId: "material.bad-id" }),
    ) as Record<string, any>;
    wrongSnapshotId.snapshotId = `material:${"0".repeat(64)}`;

    for (const candidate of [
      wrongSchema,
      wrongFreeze,
      wrongTimestamp,
      tamperedContent,
      wrongSnapshotId,
    ]) {
      expectFailure(
        baseInput([candidate]),
        "invalid_input",
        "candidate_snapshot_invalid",
      );
    }
  });

  it("narrows material approval status independently of method approval", () => {
    const candidate = structuredClone(
      materialSnapshot({ materialId: "material.method-status" }),
    ) as Record<string, any>;
    candidate.payload.approvalStatus = "approved_with_limitation";
    recomputeMaterialIdentity(candidate);
    expectFailure(
      baseInput([candidate]),
      "invalid_input",
      "candidate_snapshot_invalid",
    );
  });

  it("narrows property quality to the five ADR-0005 values", () => {
    const candidate = structuredClone(
      materialSnapshot({ materialId: "material.global-quality" }),
    ) as Record<string, any>;
    candidate.payload.properties[0].dataQuality = "measured";
    recomputeMaterialIdentity(candidate);
    expectFailure(
      baseInput([candidate]),
      "invalid_input",
      "candidate_snapshot_invalid",
    );
  });

  it("rejects duplicate property IDs and unsupported quantity fields", () => {
    const duplicateProperty = structuredClone(
      materialSnapshot({ materialId: "material.duplicate-property" }),
    ) as Record<string, any>;
    duplicateProperty.payload.properties.push(
      structuredClone(duplicateProperty.payload.properties[0]),
    );
    recomputeMaterialIdentity(duplicateProperty);
    expectFailure(
      baseInput([duplicateProperty]),
      "invalid_input",
      "candidate_snapshot_invalid",
    );

    const quantityExtra = structuredClone(
      materialSnapshot({ materialId: "material.quantity-extra" }),
    ) as Record<string, any>;
    quantityExtra.payload.properties[0].value.averagedValue = 1.8e-8;
    recomputeMaterialIdentity(quantityExtra);
    expectFailure(
      baseInput([quantityExtra]),
      "invalid_input",
      "candidate_snapshot_invalid",
    );
  });

  it("rejects an extra property-record field even with recomputed identity", () => {
    const candidate = structuredClone(
      materialSnapshot({ materialId: "material.property-extra" }),
    ) as Record<string, any>;
    candidate.payload.properties[0].recommended = true;
    recomputeMaterialIdentity(candidate);
    expectFailure(
      baseInput([candidate]),
      "invalid_input",
      "candidate_snapshot_invalid",
    );
  });
});

describe("hostile plain-data boundary", () => {
  it("does not execute a top-level accessor", () => {
    const input = mutableInput();
    let reads = 0;
    Object.defineProperty(input, "comparisonCaseId", {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return "case.getter";
      },
    });
    expectFailure(input, "invalid_input", "input_schema_invalid");
    expect(reads).toBe(0);
  });

  it("does not execute an accessor in a candidate array", () => {
    const input = mutableInput();
    let reads = 0;
    Object.defineProperty(input.candidates, "0", {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return materialSnapshot({ materialId: "material.array-getter" });
      },
    });
    expectFailure(input, "invalid_input", "input_schema_invalid");
    expect(reads).toBe(0);
  });

  it("rejects symbols, hidden fields, custom prototypes, cycles, and sparse arrays", () => {
    const symbolInput = mutableInput();
    Object.defineProperty(symbolInput, Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    expectFailure(symbolInput, "invalid_input", "input_schema_invalid");

    const hiddenInput = mutableInput();
    Object.defineProperty(hiddenInput, "hidden", {
      enumerable: false,
      value: true,
    });
    expectFailure(hiddenInput, "invalid_input", "input_schema_invalid");

    const inheritedInput = mutableInput();
    Object.setPrototypeOf(inheritedInput, { inherited: true });
    expectFailure(inheritedInput, "invalid_input", "input_schema_invalid");

    const cyclicInput = mutableInput();
    cyclicInput.propertyExpectations[0].expectedState.self =
      cyclicInput.propertyExpectations[0].expectedState;
    expectFailure(cyclicInput, "invalid_input", "input_schema_invalid");

    const sparseInput = mutableInput();
    sparseInput.candidates.length = 2;
    expectFailure(sparseInput, "invalid_input", "input_schema_invalid");
  });

  it("converts throwing Proxy traps into invalid_input", () => {
    const proxy = new Proxy(mutableInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    expectFailure(proxy, "invalid_input", "input_schema_invalid");
  });

  it("never inspects a hostile Proxy thrown from root, nested, or array traps", () => {
    for (const layer of ["root", "nested", "array"] as const) {
      let thrownValueInspections = 0;
      const hostileThrownValue = new Proxy(Object.create(null) as object, {
        get() {
          thrownValueInspections += 1;
          throw new Error("the thrown value must not be stringified or read");
        },
        getPrototypeOf() {
          thrownValueInspections += 1;
          throw new Error("the thrown value must not be used with instanceof");
        },
      });
      const input = mutableInput();
      let attackedInput: unknown = input;
      if (layer === "root") {
        attackedInput = new Proxy(input, {
          ownKeys() {
            throw hostileThrownValue;
          },
        });
      } else if (layer === "nested") {
        input.propertyExpectations[0].expectedState = new Proxy(
          input.propertyExpectations[0].expectedState,
          {
            ownKeys() {
              throw hostileThrownValue;
            },
          },
        );
      } else {
        input.candidates = new Proxy(input.candidates, {
          getPrototypeOf() {
            throw hostileThrownValue;
          },
        });
      }

      const result = compareMaterialSnapshotMetadata(attackedInput);
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { reason: "input_schema_invalid" },
      });
      if (result.status === "success") {
        throw new Error("Hostile input unexpectedly produced a success payload.");
      }
      expect(result.failure.message).toBe(
        "The comparison input could not be safely inspected.",
      );
      expect("candidates" in result).toBe(false);
      expect("propertyExpectations" in result).toBe(false);
      expect(thrownValueInspections).toBe(0);
    }
  });

  it("rejects non-finite input without exposing a partial success payload", () => {
    const input = mutableInput();
    input.propertyExpectations[0].expectedState.temperature.valueSi = Infinity;
    const result = expectFailure(
      input,
      "invalid_input",
      "input_schema_invalid",
    );
    expect("requiredPropertyIds" in result).toBe(false);
    expect("propertyExpectations" in result).toBe(false);
  });
});
