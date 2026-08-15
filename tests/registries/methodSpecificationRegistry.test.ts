import { describe, expect, it } from "vitest";

import { methodId } from "../../src/domain/ids.js";
import { METHOD_CONTRACT_METADATA_CATALOG } from "../../src/registries/methodContractMetadataCatalog.js";
import {
  METHOD_SPECIFICATIONS,
  METHOD_SPECIFICATION_REGISTRY,
  MethodNotExecutableError,
  MethodSpecificationRegistry,
  type EngineeringModuleId,
  type MethodApprovalStatus,
  type RegistryMethodType,
} from "../../src/registries/methodSpecificationRegistry.js";

const EXPECTED_IDS = [
  "A-01", "A-02",
  "B-01", "B-02", "B-03", "B-04", "B-05", "B-06", "B-07", "B-08",
  "C-01",
  "D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07",
  "E-01", "E-02", "E-03",
  "F-01", "F-02", "F-03",
  "G-01", "G-02", "G-03", "G-04", "G-05", "G-06", "G-07", "G-08", "G-09", "G-10",
  "H-01", "H-02", "H-03", "H-04", "H-05", "H-06", "H-07",
  "I-01", "I-02", "I-03", "I-04",
  "J-01", "J-02", "J-03", "J-04", "J-05", "J-06", "J-07",
] as const;

const EXPECTED_SOURCE_REFS: Readonly<Record<string, readonly string[]>> = {
  "A-01": ["ID-DATA-01"],
  "A-02": ["IAPWS-95", "IAPWS-IF97", "IAPWS-R12-08", "IAPWS-R15-11", "IAPWS-SR6-08:OPTIONAL-STRICT-DOMAIN", "LOCAL-COPY-REQUIRED"],
  "B-01": ["ID-GEO-01"],
  "B-02": ["ID-GEO-01"],
  "B-03": ["N09:PDF20-21:eq15-18", "RG12:PDF116-135", "CODATA22"],
  "B-04": ["L85:PDF3-4:eq9-12:table1", "N09:PDF20-21:eq15-18", "CODATA22"],
  "B-05": ["W28:PDF2:eq2", "W28:PDF3:eq3"],
  "B-06": ["W28:PDF1:PRINT1398:FIG1:eq1"],
  "B-07": ["RG12:PDF6:eq1", "RG12:PDF123:eq81", "RG12:PDF126-128:example57", "CODATA22"],
  "B-08": ["ID-NUM-01"],
  "C-01": ["ID-QA-01", "VALIDATION_CASES"],
  "D-01": ["ID-GEO-02"],
  "D-02": ["ID-GEO-03"],
  "D-03": ["ID-OHM-01"],
  "D-04": ["ID-EM-01", "JM95:PDF1-4", "CODATA22"],
  "D-05": ["RG12:PDF172-187", "DHT:PDF8", "DHT:PDF17-18"],
  "D-06": ["ID-OHM-02"],
  "D-07": ["ID-AC-01"],
  "E-01": ["ID-EM-01", "M04:PDF2:eq1", "JM95:PDF1-4", "CODATA22"],
  "E-02": ["S89:PDF1-5", "MATERIAL-DATA-REQUIRED"],
  "E-03": ["M04:PDF2-3:eq1-5", "ID-EM-01", "CODATA22"],
  "F-01": ["ID-Z-01", "L13:PDF1-6", "J08:PDF2-3"],
  "F-02": ["ID-MEAS-01", "DHT:PDF17-18"],
  "F-03": ["ADR-0002", "ADR-0004", "ADR-0008", "NEW-PROJECT-DATA-REQUIRED"],
  "G-01": ["ID-TH-01"],
  "G-02": ["ID-TH-01"],
  "G-03": ["ID-TH-01"],
  "G-04": ["ID-TH-01"],
  "G-05": ["ID-TH-01"],
  "G-06": ["ID-AC-02", "PRIMARY-STANDARD-COPY-REQUIRED"],
  "G-07": ["ID-RLC-01", "PRIMARY-TEXTBOOK-COPY-REQUIRED"],
  "G-08": ["ID-RLC-02", "ADR-0007"],
  "G-09": ["LLC-ZJL:PDF24-33", "LLC-ZJL:PDF64-65"],
  "G-10": ["ID-Z-02"],
  "H-01": ["ID-HYD-01", "DHT:PDF10-12"],
  "H-02": ["ID-HYD-01", "IAPWS-95", "IAPWS-IF97", "LOCAL-COPY-REQUIRED"],
  "H-03": ["ID-HYD-01"],
  "H-04": ["GN75:PP8-16", "NASA-NTRS-19830022277:S6.1.2.1", "OSTI-836896:S3.1.1"],
  "H-05": ["ID-HYD-02", "C39:PP133-156", "NIST-TN2294:REPORT-P23"],
  "H-06": ["ID-HYD-01", "ID-HYD-02", "IAPWS-IF97:REGION4", "HI-961", "DHT:PDF11-12", "OEM-SPEC-REQUIRED"],
  "H-07": ["ID-HYD-01", "ADR-0006", "ADR-0008"],
  "J-01": ["ID-HT-01", "GB8175:PDF7:eq7:REJECTED-AS-PRINTED"],
  "J-02": ["ID-HT-01", "CC75-V:PP1323-1329", "CC75-H:PP1049-1053", "CB77:PP300-306"],
  "J-03": ["ID-RAD-01", "GB8175:PDF14-16:eqA2", "CODATA22"],
  "J-04": ["ID-RAD-01", "GB8175:PDF14-16:eqA2", "CODATA22"],
  "J-05": ["ID-ANN-01", "RH75:PP265-315", "DT69:PP-II198-II207", "ADR-0006"],
  "J-06": ["ID-HT-01"],
  "J-07": ["ID-HT-02", "PRIMARY-TEXTBOOK-COPY-REQUIRED"],
  "I-01": ["ID-HT-01", "GB8175:PDF10:eq24"],
  "I-02": ["ID-HT-01", "GB8175:PDF10:eq20:REJECTED-AS-PRINTED"],
  "I-03": ["ID-HT-01", "ADR-0006"],
  "I-04": ["ID-HT-01"],
};

const EXPECTED_METHOD_TYPES: Readonly<Record<string, RegistryMethodType | null>> = {
  "A-01": "numerical", "A-02": "numerical",
  "B-01": "analytical", "B-02": "analytical", "B-03": "analytical", "B-04": "analytical",
  "B-05": "engineering_correlation", "B-06": "engineering_correlation", "B-07": "numerical", "B-08": "numerical",
  "C-01": "numerical",
  "D-01": "analytical", "D-02": "analytical", "D-03": "analytical", "D-04": "analytical", "D-05": null, "D-06": "analytical", "D-07": "analytical",
  "E-01": "analytical", "E-02": "numerical", "E-03": "engineering_correlation",
  "F-01": "analytical", "F-02": "measurement_identified", "F-03": "empirical_calibrated",
  "G-01": "numerical", "G-02": "numerical", "G-03": "numerical", "G-04": "analytical", "G-05": "analytical",
  "G-06": "analytical", "G-07": "analytical", "G-08": "analytical", "G-09": null, "G-10": "analytical",
  "H-01": "analytical", "H-02": "analytical", "H-03": "analytical", "H-04": "engineering_correlation",
  "H-05": "numerical", "H-06": "analytical", "H-07": "analytical",
  "J-01": "numerical", "J-02": "engineering_correlation", "J-03": "analytical", "J-04": "analytical",
  "J-05": "engineering_correlation", "J-06": "analytical", "J-07": "numerical",
  "I-01": "numerical", "I-02": "numerical", "I-03": "numerical", "I-04": "numerical",
};

const EXPECTED_HIGH_CONFIDENCE = [
  "A-01", "B-01", "B-02", "B-03", "B-04", "C-01", "D-01", "D-02", "D-03", "D-04", "D-06",
  "E-01", "F-01", "F-02", "G-01", "G-02", "G-04", "G-05", "G-06", "G-07", "G-10", "H-01",
  "H-02", "H-03", "H-07", "J-01", "J-03", "J-04", "J-06", "I-01", "I-02",
] as const;

const EXPECTED_ENGINEERING_APPROXIMATION = [
  "B-05", "B-06", "B-08", "D-05", "E-03", "G-09", "H-04", "H-05", "H-06", "J-05", "I-04",
] as const;

const EXPECTED_COMPOSITE_OR_UNRESOLVED_CONFIDENCE = [
  "A-02", "B-07", "D-07", "E-02", "F-03", "G-03", "G-08", "J-02", "J-07", "I-03",
] as const;

const CENTRAL_VALIDATION_IDS = [
  "GEO-001", "GEO-002", "EM-L-001", "EM-L-002", "EM-L-003", "EM-L-004", "EM-L-005", "EM-L-006",
  "ELEC-RDC-001", "EM-Z-001", "EM-Z-002", "EXP-RAC-001", "PWR-PAR-IDEAL-001", "PWR-PAR-RL-001",
  "PWR-XFMR-001", "PWR-LLC-ZJL-001", "COOL-ENERGY-001", "EXP-COOL-001",
] as const;

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce<Record<T, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

describe("MethodSpecificationRegistry Gate-0 catalog", () => {
  it("contains exactly the 52 unique controlled top-level IDs", () => {
    expect(METHOD_SPECIFICATION_REGISTRY.size).toBe(52);
    expect(new Set(METHOD_SPECIFICATION_REGISTRY.ids()).size).toBe(52);
    expect([...METHOD_SPECIFICATION_REGISTRY.ids()].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("matches the frozen approval and module counts", () => {
    const statuses = countBy(
      METHOD_SPECIFICATIONS.map((entry) => entry.approvalStatus as MethodApprovalStatus),
    );
    expect(statuses).toEqual({
      approved: 21,
      approved_with_limitation: 29,
      deferred: 2,
    });

    const modules = countBy(
      METHOD_SPECIFICATIONS.map((entry) => entry.moduleId as EngineeringModuleId),
    );
    expect(modules).toEqual({ A: 2, B: 8, C: 1, D: 7, E: 3, F: 3, G: 10, H: 7, J: 7, I: 4 });
  });

  it("matches every Formula Source Register section 9 source_refs entry", () => {
    expect(Object.keys(EXPECTED_SOURCE_REFS).sort()).toEqual([...EXPECTED_IDS].sort());
    for (const specification of METHOD_SPECIFICATIONS) {
      expect(specification.sourceRefs, specification.methodId).toEqual(
        EXPECTED_SOURCE_REFS[specification.methodId],
      );
    }
  });

  it("uses the contract method types without inventing a hybrid parent type", () => {
    for (const specification of METHOD_SPECIFICATIONS) {
      expect(specification.methodType, specification.methodId).toBe(
        EXPECTED_METHOD_TYPES[specification.methodId],
      );
      expect(specification.lifecycleStatus).toBe("active");
      expect(specification.implementationAvailable).toBe(false);
      expect(specification.executable).toBe(false);
    }
    expect(METHOD_SPECIFICATION_REGISTRY.get(methodId("D-05"))).toMatchObject({
      methodType: null,
      requiresSubmethodSplit: true,
      executable: false,
    });
    expect(METHOD_SPECIFICATION_REGISTRY.get(methodId("G-09"))).toMatchObject({
      methodType: null,
      requiresSubmethodSplit: true,
      executable: false,
    });
  });

  it("merges complete frozen contract metadata for all 52 methods", () => {
    expect(Object.keys(METHOD_CONTRACT_METADATA_CATALOG).sort()).toEqual([...EXPECTED_IDS].sort());
    expect(Object.isFrozen(METHOD_CONTRACT_METADATA_CATALOG)).toBe(true);

    for (const specification of METHOD_SPECIFICATIONS) {
      const metadata = METHOD_CONTRACT_METADATA_CATALOG[specification.methodId];
      expect(metadata, specification.methodId).toBeDefined();
      if (metadata === undefined) {
        throw new Error(`Missing controlled metadata for ${specification.methodId}`);
      }
      expect(Object.isFrozen(metadata), specification.methodId).toBe(true);
      expect(Object.isFrozen(metadata.inputParameterIds), specification.methodId).toBe(true);
      expect(specification.inputParameterIds).toEqual(metadata.inputParameterIds);
      expect(specification.outputQuantityIds).toEqual(metadata.outputQuantityIds);
      expect(specification.applicabilityDomain).toBe(metadata.applicabilityDomain);
      expect(specification.warningPredicates).toEqual(metadata.warningPredicates);
      expect(specification.validationCaseIds).toEqual(metadata.validationCaseIds);
      expect(specification.methodCheckIds).toEqual(metadata.methodCheckIds);
      expect(specification.contractSourceRefs).toEqual(metadata.sourceRefs);
      expect(specification.scientificConfidence).toBe(metadata.scientificConfidence);
      expect(specification.recommendationEligibility).toBe(metadata.recommendationEligibility);
      expect(specification.equationRefs).toContain(metadata.contractEquationRef);

      expect(specification.inputParameterIds.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.outputQuantityIds.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.applicabilityDomain.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.warningPredicates.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.validationNotes.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.scientificConfidenceRaw.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.confidenceResolutionReason.length, specification.methodId).toBeGreaterThan(0);
      expect(specification.recommendationReason.length, specification.methodId).toBeGreaterThan(0);

      if (specification.warningIds.length === 0) {
        expect(specification.warningIdResolutionReason?.length, specification.methodId).toBeGreaterThan(0);
      }
      if (specification.validationCaseIds.length === 0 && specification.methodCheckIds.length === 0) {
        expect(specification.validationIdResolutionReason?.length, specification.methodId).toBeGreaterThan(0);
      }
      if (specification.derivationRefs.length === 0) {
        expect(specification.derivationResolutionReason?.length, specification.methodId).toBeGreaterThan(0);
      }
    }
  });

  it("keeps composite confidence unresolved instead of inventing a machine value", () => {
    expect(
      METHOD_SPECIFICATIONS.filter((entry) => entry.scientificConfidence === "high")
        .map((entry) => entry.methodId)
        .sort(),
    ).toEqual([...EXPECTED_HIGH_CONFIDENCE].sort());
    expect(
      METHOD_SPECIFICATIONS.filter((entry) => entry.scientificConfidence === "engineering_approximation")
        .map((entry) => entry.methodId)
        .sort(),
    ).toEqual([...EXPECTED_ENGINEERING_APPROXIMATION].sort());
    expect(
      METHOD_SPECIFICATIONS.filter((entry) => entry.scientificConfidence === null)
        .map((entry) => entry.methodId)
        .sort(),
    ).toEqual([...EXPECTED_COMPOSITE_OR_UNRESOLVED_CONFIDENCE].sort());

    expect(METHOD_SPECIFICATION_REGISTRY.get(methodId("G-09"))).toMatchObject({
      approvalStatus: "deferred",
      scientificConfidence: "engineering_approximation",
      implementationAvailable: false,
      executable: false,
    });
  });

  it("separates central validation IDs, method checks and the sole stable warning ID", () => {
    const centralIds = new Set(METHOD_SPECIFICATIONS.flatMap((entry) => entry.validationCaseIds));
    expect([...centralIds].sort()).toEqual([...CENTRAL_VALIDATION_IDS].sort());
    for (const entry of METHOD_SPECIFICATIONS) {
      expect(entry.methodCheckIds.some((id) => centralIds.has(id)), entry.methodId).toBe(false);
    }

    const warnings = METHOD_SPECIFICATIONS.flatMap((entry) => entry.warningIds);
    expect(warnings).toEqual(["no_approved_recommended_result"]);
    expect(METHOD_SPECIFICATION_REGISTRY.get(methodId("C-01")).warningIds).toEqual([
      "no_approved_recommended_result",
    ]);
  });

  it("stores only the explicit frozen recommendation policy", () => {
    const nonNull = Object.fromEntries(
      METHOD_SPECIFICATIONS.filter((entry) => entry.recommendationEligibility !== null)
        .map((entry) => [entry.methodId, entry.recommendationEligibility]),
    );
    expect(nonNull).toEqual({
      "B-03": "not_eligible",
      "B-04": "conditionally_eligible",
      "B-05": "not_eligible",
      "B-07": "conditionally_eligible",
      "B-08": "not_eligible",
      "F-01": "not_eligible",
      "F-02": "eligible",
    });
    expect(METHOD_SPECIFICATION_REGISTRY.get(methodId("D-05"))).toMatchObject({
      recommendationEligibility: null,
      requiresSubmethodSplit: true,
    });
  });

  it("has an empty Phase-1 runtime registry and fails closed by reason", () => {
    expect(METHOD_SPECIFICATION_REGISTRY.runtimeSpecifications()).toEqual([]);

    for (const id of ["F-03", "G-09"] as const) {
      expect(() => METHOD_SPECIFICATION_REGISTRY.resolveRuntime(methodId(id))).toThrowError(
        expect.objectContaining<Partial<MethodNotExecutableError>>({ reason: "deferred" }),
      );
    }
    expect(() => METHOD_SPECIFICATION_REGISTRY.resolveRuntime(methodId("D-05"))).toThrowError(
      expect.objectContaining<Partial<MethodNotExecutableError>>({ reason: "requires_submethod_split" }),
    );
    expect(() => METHOD_SPECIFICATION_REGISTRY.resolveRuntime(methodId("A-01"))).toThrowError(
      expect.objectContaining<Partial<MethodNotExecutableError>>({ reason: "implementation_unavailable" }),
    );
  });

  it("rejects duplicate, unknown and illegally executable Deferred records", () => {
    expect(
      () => new MethodSpecificationRegistry([METHOD_SPECIFICATIONS[0]!, METHOD_SPECIFICATIONS[0]!]),
    ).toThrow(/duplicate id/u);
    expect(() => METHOD_SPECIFICATION_REGISTRY.get(methodId("A-99"))).toThrow(/does not contain/u);

    const deferred = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-03"));
    expect(
      () =>
        new MethodSpecificationRegistry([
          { ...deferred, implementationAvailable: true, executable: true },
        ]),
    ).toThrow(/Deferred method/u);

    const approved = METHOD_SPECIFICATION_REGISTRY.get(methodId("A-01"));
    expect(
      () => new MethodSpecificationRegistry([{ ...approved, warningIds: ["forged_warning"] }]),
    ).toThrow(/unknown stable warning ID/u);
    expect(
      () => new MethodSpecificationRegistry([{ ...approved, validationCaseIds: ["MAT-P-001"] }]),
    ).toThrow(/non-central validation_case_id/u);
    expect(
      () => new MethodSpecificationRegistry([{ ...approved, inputParameterIds: [] }]),
    ).toThrow(/inputs must contain/u);
    expect(
      () =>
        new MethodSpecificationRegistry([
          {
            ...approved,
            scientificConfidence: "forged" as typeof approved.scientificConfidence,
          },
        ]),
    ).toThrow(/unknown scientific confidence/u);
  });
});
