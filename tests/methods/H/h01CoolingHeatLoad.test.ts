import { describe, expect, it } from "vitest";

import {
  H01_BINARY64_MIN_NORMAL,
  H01_IMPLEMENTATION_READINESS,
  H01_METHOD_MAPPING,
  H01_NUMERIC_ACCUMULATION_POLICY,
  H01_WARNING_PREDICATES,
  evaluateH01CoolingHeatLoad,
  type H01ControlVolumeEvidence,
  type H01CoolingHeatLoadInput,
  type H01CoolingHeatLoadOutcome,
  type H01CoolingHeatLoadSuccess,
  type H01DesignMarginEvidence,
  type H01HeatSourceClass,
  type H01HeatTerm,
  type H01InputId,
  type H01KnownApplicableHeatTerm,
  type H01OtherCooledLoadsEvidence,
  type H01OverlapAssessment,
  type H01SourceConfirmedNotApplicableHeatTerm,
  type H01UnknownApplicableHeatTerm,
} from "../../../src/methods/H/h01CoolingHeatLoad.js";

const CASE_SNAPSHOT = `case:${"1".repeat(64)}`;
const SOURCE_SNAPSHOT = `case:${"2".repeat(64)}`;
const OTHER_CASE_SNAPSHOT = `case:${"3".repeat(64)}`;
const CONTROL_VOLUME_ID = "coolant-control-volume:coil-loop-01";
const COOLANT_CIRCUIT_ID = "coolant-circuit:coil-loop-01";
const TIME_BASIS_ID = "time-basis:steady-design-point-01";

const HEAT_CLASS_BY_INPUT = Object.freeze({
  Pcu: "coil_copper_loss",
  Qpickup_to_coil: "external_heat_pickup_to_coil",
  Pmag: "magnetic_material_loss",
  Pother: "other_explicit_cooled_load",
} as const);

function controlVolume(
  overrides: Partial<H01ControlVolumeEvidence> = {},
): H01ControlVolumeEvidence {
  return {
    controlVolumeId: CONTROL_VOLUME_ID,
    coolantCircuitId: COOLANT_CIRCUIT_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    heatDestination: "declared_coil_coolant_circuit",
    circuitScope: "single_declared_circuit",
    boundaryCompleteConfirmed: true,
    forbiddenHeatClassesExcludedConfirmed: true,
    multiCircuitAggregationAbsentConfirmed: true,
    ...overrides,
  };
}

function knownTerm(
  inputId: H01InputId,
  valueW: number,
  overrides: Partial<H01KnownApplicableHeatTerm> = {},
): H01KnownApplicableHeatTerm {
  return {
    kind: "known_applicable",
    inputId,
    heatSourceClass: HEAT_CLASS_BY_INPUT[inputId],
    valueW,
    dimensionId: "power",
    canonicalUnitId: "W",
    valueResolution: "known_value",
    sourceMethod: "analytical_estimate",
    sourceRef: `method-check:source:${inputId}`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${inputId}`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    controlVolumeId: CONTROL_VOLUME_ID,
    coolantCircuitId: COOLANT_CIRCUIT_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    heatPathId: `heat-path:${inputId}`,
    physicalHeatSourceId: `physical-heat-source:${inputId}`,
    heatDestination: "declared_coil_coolant_circuit",
    ...overrides,
  } as H01KnownApplicableHeatTerm;
}

function excludedTerm(
  inputId: H01InputId,
  overrides: Partial<H01SourceConfirmedNotApplicableHeatTerm> = {},
): H01SourceConfirmedNotApplicableHeatTerm {
  return {
    kind: "source_confirmed_not_applicable",
    inputId,
    heatSourceClass: HEAT_CLASS_BY_INPUT[inputId],
    reason: "Source review confirms that this path does not enter the circuit.",
    resolutionSourceRef: `path-resolution:${inputId}`,
    sourceMethod: "analytical_estimate",
    sourceRef: `method-check:source:${inputId}`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${inputId}`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    controlVolumeId: CONTROL_VOLUME_ID,
    coolantCircuitId: COOLANT_CIRCUIT_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    heatPathId: `heat-path:${inputId}`,
    physicalHeatSourceId: `physical-heat-source:${inputId}`,
    heatDestination: "source_confirmed_not_entering_declared_circuit",
    ...overrides,
  } as H01SourceConfirmedNotApplicableHeatTerm;
}

function unknownTerm(
  inputId: H01InputId,
  overrides: Partial<H01UnknownApplicableHeatTerm> = {},
): H01UnknownApplicableHeatTerm {
  return {
    kind: "unknown_applicable",
    inputId,
    heatSourceClass: HEAT_CLASS_BY_INPUT[inputId],
    reason: "The applicable path has not yet been quantified.",
    resolutionSourceRef: `path-resolution:${inputId}`,
    sourceMethod: "analytical_estimate",
    sourceRef: `method-check:source:${inputId}`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${inputId}`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    controlVolumeId: CONTROL_VOLUME_ID,
    coolantCircuitId: COOLANT_CIRCUIT_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    heatPathId: `heat-path:${inputId}`,
    physicalHeatSourceId: `physical-heat-source:${inputId}`,
    heatDestination: "unknown_or_unconfirmed",
    ...overrides,
  } as H01UnknownApplicableHeatTerm;
}

function otherLoads(
  loads: readonly H01HeatTerm[] = [],
  overrides: Partial<H01OtherCooledLoadsEvidence> = {},
): H01OtherCooledLoadsEvidence {
  return {
    enumerationStatus: "complete",
    enumerationSourceRef: "control-volume:other-load-enumeration:01",
    loads,
    ...overrides,
  };
}

interface InputOverrides {
  readonly controlVolume?: H01ControlVolumeEvidence;
  readonly Pcu?: H01HeatTerm;
  readonly Qpickup_to_coil?: H01HeatTerm;
  readonly Pmag?: H01HeatTerm;
  readonly Pother?: H01OtherCooledLoadsEvidence;
  readonly overlapAssessment?: H01OverlapAssessment;
  readonly design_margin?: H01DesignMarginEvidence;
}

function input(overrides: InputOverrides = {}): H01CoolingHeatLoadInput {
  const Pcu = overrides.Pcu ?? knownTerm("Pcu", 1_200);
  const Qpickup =
    overrides.Qpickup_to_coil ?? knownTerm("Qpickup_to_coil", 300);
  const Pmag = overrides.Pmag ?? excludedTerm("Pmag");
  const Pother =
    overrides.Pother ??
    otherLoads([
      knownTerm("Pother", 75, {
        heatPathId: "heat-path:Pother:auxiliary-01",
        physicalHeatSourceId: "physical-heat-source:Pother:auxiliary-01",
        provenanceId: "provenance:Pother:auxiliary-01",
      }),
      knownTerm("Pother", 25, {
        heatPathId: "heat-path:Pother:auxiliary-02",
        physicalHeatSourceId: "physical-heat-source:Pother:auxiliary-02",
        provenanceId: "provenance:Pother:auxiliary-02",
      }),
    ]);
  const allTerms = [Pcu, Qpickup, Pmag, ...Pother.loads];
  const includedPathIds = allTerms
    .filter((term) => term.kind === "known_applicable")
    .map((term) => term.heatPathId);
  return {
    controlVolume: overrides.controlVolume ?? controlVolume(),
    Pcu,
    Qpickup_to_coil: Qpickup,
    Pmag,
    Pother,
    overlapAssessment:
      overrides.overlapAssessment ?? {
        status: "confirmed_pairwise_disjoint",
        assessedHeatPathIds: includedPathIds,
        physicalSourceIdentityChecked: true,
        assessmentSourceRef: "overlap-assessment:coil-loop-01",
      },
    design_margin: overrides.design_margin ?? { status: "not_requested" },
  };
}

function successOf(candidate: unknown): H01CoolingHeatLoadSuccess {
  const result = evaluateH01CoolingHeatLoad(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(result.failure.message);
  }
  return result;
}

function failureOf(
  candidate: unknown,
): Exclude<H01CoolingHeatLoadOutcome, H01CoolingHeatLoadSuccess> {
  const result = evaluateH01CoolingHeatLoad(candidate);
  expect(result.status).not.toBe("success");
  if (result.status === "success") {
    throw new Error("Expected H-01 failure.");
  }
  expect(result).not.toHaveProperty("value");
  expect(result).not.toHaveProperty("evidence");
  expect(result).not.toHaveProperty("substitution");
  expect(result).not.toHaveProperty("inputSnapshot");
  return result;
}

describe("H-01 frozen cooling heat-load control volume", () => {
  it("maps exactly to controlled H-01 sources and COOL-CONTROL-001", () => {
    expect(H01_METHOD_MAPPING).toMatchObject({
      methodId: "H-01",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      methodType: "analytical",
      equationRef: "CALCULATION_CONTRACTS.md#H-01:Equation",
      applicabilityRef: "CALCULATION_CONTRACTS.md#H-01:Applicability",
      warningRef: "CALCULATION_CONTRACTS.md#H-01:Warning predicates",
      validationRef: "CALCULATION_CONTRACTS.md#H-01:Validation",
      inputParameterIds: [
        "Pcu",
        "Qpickup_to_coil",
        "Pmag",
        "Pother",
        "design_margin",
      ],
      outputQuantityIds: [
        "Qcool",
        "per-item provenance",
        "unaccounted items",
      ],
      sourceRefs: ["ID-HYD-01", "DHT:PDF10-12"],
      contractSourceRefs: [
        "ID-HYD-01",
        "DHT:PDF10-12",
        "DER-ENERGY",
        "ADR-0006",
      ],
      derivationRefs: ["ID-HYD-01", "DER-ENERGY"],
      validationCaseIds: [],
      methodCheckIds: ["COOL-CONTROL-001"],
      stableWarningIds: [],
    });
  });

  it("records the unresolved design-margin arithmetic as a release gate", () => {
    expect(H01_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        {
          gateId: "H-01.design-margin-mathematical-semantics",
          reason:
            "The frozen basis requires an explicit design-margin scenario but defines no unique operator, coefficient, or equation; requested margins remain insufficient_data.",
        },
      ],
    });
  });

  it("sums only known applicable terms for one declared circuit", () => {
    const result = successOf(input());
    expect(result).toMatchObject({
      methodId: "H-01",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved",
      status: "success",
      applicabilityStatus: "in_domain",
      warningIds: [],
      warnings: [],
      equation: "Qcool = Pcu + Qpickup_to_coil + Pmag + sum(Pother)",
      value: {
        Qcool: {
          outputId: "Qcool",
          valueSi: 1_600,
          dimensionId: "power",
          canonicalUnitId: "W",
        },
        unaccountedItems: [],
      },
      substitution: {
        basePhysicalHeatLoadW: 1_600,
        designMarginStatus: "not_requested",
      },
    });
    expect(result.substitution.orderedIncludedTerms.map((term) => term.inputId))
      .toEqual(["Pcu", "Qpickup_to_coil", "Pother", "Pother"]);
    expect(result.value.perItemProvenance).toHaveLength(5);
    expect(result.value.perItemProvenance.map((item) => item.disposition))
      .toEqual([
        "included",
        "included",
        "source_confirmed_not_applicable",
        "included",
        "included",
      ]);
  });

  it("publishes explicit boundary, snapshot, source and solver trace", () => {
    const result = successOf(input());
    expect(result.inputSnapshot).toEqual({
      controlVolumeId: CONTROL_VOLUME_ID,
      coolantCircuitId: COOLANT_CIRCUIT_ID,
      caseSnapshotId: CASE_SNAPSHOT,
      timeBasisId: TIME_BASIS_ID,
      includedHeatPathIds: [
        "heat-path:Pcu",
        "heat-path:Qpickup_to_coil",
        "heat-path:Pother:auxiliary-01",
        "heat-path:Pother:auxiliary-02",
      ],
      excludedHeatPathIds: ["heat-path:Pmag"],
      sourceSnapshotIds: [SOURCE_SNAPSHOT],
    });
    expect(result.solverResiduals).toEqual({
      solverUsed: false,
      classification: "analytical_ordered_nonnegative_sum",
    });
    expect(result.engineeringPrecision).toEqual({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_input_precision_provenance_and_control_volume_completeness",
    });
    expect(result.sourceRefs).toEqual(["ID-HYD-01", "DHT:PDF10-12"]);
    expect(result.contractSourceRefs).toEqual([
      "ID-HYD-01",
      "DHT:PDF10-12",
      "DER-ENERGY",
      "ADR-0006",
    ]);
    expect(result.methodCheckIds).toEqual(["COOL-CONTROL-001"]);
    expect(result.validationCaseIds).toEqual([]);
  });

  it("excludes a source-confirmed not-applicable term without treating it as zero", () => {
    const result = successOf(
      input({
        Pcu: excludedTerm("Pcu"),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 20),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([]),
      }),
    );
    expect(result.value.Qcool.valueSi).toBe(20);
    expect(result.value.perItemProvenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inputId: "Pcu",
          disposition: "source_confirmed_not_applicable",
          resolutionSourceRef: "path-resolution:Pcu",
        }),
      ]),
    );
  });

  it("accepts an explicitly complete empty Pother inventory", () => {
    const result = successOf(input({ Pother: otherLoads([]) }));
    expect(result.value.Qcool.valueSi).toBe(1_500);
    expect(result.evidence.otherLoadEnumerationSourceRef).toBe(
      "control-volume:other-load-enumeration:01",
    );
  });

  it("accepts an exact all-zero physical control-volume sum", () => {
    const result = successOf(
      input({
        Pcu: knownTerm("Pcu", 0),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 0),
        Pmag: knownTerm("Pmag", 0),
        Pother: otherLoads([]),
      }),
    );
    expect(result.value.Qcool.valueSi).toBe(0);
    expect(Object.is(result.value.Qcool.valueSi, -0)).toBe(false);
  });

  it("preserves the smallest accepted positive normal heat load", () => {
    const result = successOf(
      input({
        Pcu: knownTerm("Pcu", H01_BINARY64_MIN_NORMAL),
        Qpickup_to_coil: excludedTerm("Qpickup_to_coil"),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([]),
      }),
    );
    expect(result.value.Qcool.valueSi).toBe(H01_BINARY64_MIN_NORMAL);
  });

  it("is dimensionally linear under a common dimensionless scale factor", () => {
    const baseline = successOf(input());
    const scaled = successOf(
      input({
        Pcu: knownTerm("Pcu", 2_400),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 600),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([
          knownTerm("Pother", 150, {
            heatPathId: "heat-path:Pother:auxiliary-01",
            physicalHeatSourceId:
              "physical-heat-source:Pother:auxiliary-01",
          }),
          knownTerm("Pother", 50, {
            heatPathId: "heat-path:Pother:auxiliary-02",
            physicalHeatSourceId:
              "physical-heat-source:Pother:auxiliary-02",
          }),
        ]),
      }),
    );
    expect(scaled.value.Qcool.valueSi).toBe(
      2 * baseline.value.Qcool.valueSi,
    );
  });

  it("is invariant to the order of independently assessed Pother paths", () => {
    const first = knownTerm("Pother", 40, {
      heatPathId: "heat-path:Pother:first",
      physicalHeatSourceId: "physical-heat-source:Pother:first",
    });
    const second = knownTerm("Pother", 60, {
      heatPathId: "heat-path:Pother:second",
      physicalHeatSourceId: "physical-heat-source:Pother:second",
    });
    const forward = successOf(input({ Pother: otherLoads([first, second]) }));
    const reverse = successOf(input({ Pother: otherLoads([second, first]) }));
    expect(forward.value.Qcool.valueSi).toBe(reverse.value.Qcool.valueSi);
  });

  it("records a machine-only accumulation policy without rearranging the equation", () => {
    expect(H01_NUMERIC_ACCUMULATION_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      positiveAddendSwallowingPolicy: "fail_closed",
      orderedSourceEquationRearranged: false,
      minimumPositiveNormal: H01_BINARY64_MIN_NORMAL,
    });
    expect(H01_METHOD_MAPPING.numericAccumulationPolicy).toBe(
      H01_NUMERIC_ACCUMULATION_POLICY,
    );
  });

  it("fails closed when external pickup is applicable but unresolved", () => {
    const result = failureOf(
      input({ Qpickup_to_coil: unknownTerm("Qpickup_to_coil") }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.unknown_applicable_heat_source" },
    });
  });

  it("fails closed when an other cooled load is applicable but unresolved", () => {
    const result = failureOf(
      input({
        Pother: otherLoads([
          unknownTerm("Pother", {
            heatPathId: "heat-path:Pother:unresolved",
            physicalHeatSourceId: "physical-heat-source:Pother:unresolved",
          }),
        ]),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.unknown_applicable_heat_source" },
    });
  });

  it("rejects unknown external pickup substituted with zero using frozen warning prose", () => {
    const result = failureOf(
      input({
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 0, {
          valueResolution: "unknown_substituted_zero",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.unknown_pickup_substituted_zero" },
      warningIds: [],
      warnings: [
        { predicate: H01_WARNING_PREDICATES.unknownPickupSubstitutedZero },
      ],
    });
  });

  it("rejects an unknown non-pickup term substituted with zero", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", 0, {
          valueResolution: "unknown_substituted_zero",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.unknown_applicable_heat_source" },
    });
  });

  it("fails closed when the Pother inventory is not confirmed complete", () => {
    const result = failureOf(
      input({
        Pother: otherLoads([], {
          enumerationStatus: "unknown_or_unconfirmed",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.other_loads_enumeration_unknown" },
    });
  });

  it.each([false, null] as const)(
    "fails closed for boundaryCompleteConfirmed=%s",
    (boundaryCompleteConfirmed) => {
      const result = failureOf(
        input({
          controlVolume: controlVolume({ boundaryCompleteConfirmed }),
        }),
      );
      expect(result).toMatchObject({
        status: "insufficient_data",
        failure: { code: "H-01.control_volume_incomplete" },
      });
    },
  );

  it("rejects a known forbidden-class boundary", () => {
    const result = failureOf(
      input({
        controlVolume: controlVolume({
          forbiddenHeatClassesExcludedConfirmed: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.control_volume_not_applicable" },
      warnings: [{ predicate: H01_WARNING_PREDICATES.forbiddenHeatClass }],
    });
  });

  it("returns insufficient_data when forbidden-class exclusion is unresolved", () => {
    const result = failureOf(
      input({
        controlVolume: controlVolume({
          forbiddenHeatClassesExcludedConfirmed: null,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.control_volume_unknown" },
    });
  });

  it.each([
    [
      "known multi-circuit scope",
      {
        circuitScope: "multiple_circuits_or_aggregate",
      },
      "not_applicable",
      "H-01.multiple_circuits_not_applicable",
    ],
    [
      "known aggregate confirmation",
      { multiCircuitAggregationAbsentConfirmed: false },
      "not_applicable",
      "H-01.multiple_circuits_not_applicable",
    ],
    [
      "unknown scope",
      { circuitScope: "unknown_or_unconfirmed" },
      "insufficient_data",
      "H-01.control_volume_unknown",
    ],
    [
      "unknown destination",
      { heatDestination: "other_or_unconfirmed" },
      "insufficient_data",
      "H-01.control_volume_unknown",
    ],
    [
      "unknown aggregation",
      { multiCircuitAggregationAbsentConfirmed: null },
      "insufficient_data",
      "H-01.control_volume_unknown",
    ],
  ] as const)("fails closed for %s", (_label, overrides, status, code) => {
    const result = failureOf(
      input({
        controlVolume: controlVolume(
          overrides as Partial<H01ControlVolumeEvidence>,
        ),
      }),
    );
    expect(result.status).toBe(status);
    expect(result.failure.code).toBe(code);
  });

  it.each([
    "workpiece_useful_heat",
    "environment_heat_loss",
    "reactive_power",
    "plant_wide_loss",
    "grid_or_converter_loss",
  ] as const)("rejects forbidden heat-source class %s", (heatSourceClass) => {
    const result = failureOf(
      input({
        Pother: otherLoads([
          knownTerm("Pother", 10, {
            heatSourceClass: heatSourceClass as H01HeatSourceClass,
            heatPathId: `heat-path:forbidden:${heatSourceClass}`,
            physicalHeatSourceId: `physical-source:forbidden:${heatSourceClass}`,
          }),
        ]),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.forbidden_heat_class_not_applicable" },
      warnings: [{ predicate: H01_WARNING_PREDICATES.forbiddenHeatClass }],
    });
  });

  it.each(["workpiece", "ambient_environment", "plant_or_grid"] as const)(
    "rejects known forbidden heat destination %s",
    (heatDestination) => {
      const result = failureOf(
        input({ Pcu: knownTerm("Pcu", 10, { heatDestination }) }),
      );
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "H-01.heat_destination_not_applicable" },
        warnings: [{ predicate: H01_WARNING_PREDICATES.forbiddenHeatClass }],
      });
    },
  );

  it("returns insufficient_data for an unknown heat classification", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", 10, {
          heatSourceClass: "unknown_or_unconfirmed",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.heat_term_classification_unknown" },
    });
  });

  it("returns insufficient_data for an unknown heat destination", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", 10, {
          heatDestination: "unknown_or_unconfirmed",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.heat_term_classification_unknown" },
    });
  });

  it("rejects cross-binding between distinct allowed heat classes", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", 10, {
          heatSourceClass: "magnetic_material_loss",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it.each([
    ["control volume", { controlVolumeId: "control-volume:other" }],
    ["coolant circuit", { coolantCircuitId: "coolant-circuit:other" }],
    ["case snapshot", { caseSnapshotId: OTHER_CASE_SNAPSHOT }],
    ["time basis", { timeBasisId: "time-basis:other" }],
  ] as const)("rejects a term from another %s", (_label, overrides) => {
    const result = failureOf(
      input({
        Pcu: knownTerm(
          "Pcu",
          10,
          overrides as Partial<H01KnownApplicableHeatTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_boundary_mismatch" },
    });
  });

  it("rejects duplicate included heat-path IDs", () => {
    const result = failureOf(
      input({
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 10, {
          heatPathId: "heat-path:Pcu",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.overlap_or_duplicate_present" },
    });
  });

  it("rejects distinct paths that reuse one physical heat-source identity", () => {
    const result = failureOf(
      input({
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 10, {
          physicalHeatSourceId: "physical-heat-source:Pcu",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.overlap_or_duplicate_present" },
    });
  });

  it("rejects an explicit duplicate-or-overlap assessment", () => {
    const baseline = input();
    const result = failureOf(
      input({
        overlapAssessment: {
          status: "duplicate_or_overlap_present",
          assessedHeatPathIds:
            baseline.overlapAssessment.assessedHeatPathIds,
          physicalSourceIdentityChecked: true,
          assessmentSourceRef: "overlap-assessment:coil-loop-01",
          overlapDescription: "Two inputs include the same heat flow.",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.overlap_or_duplicate_present" },
    });
  });

  it("returns insufficient_data for unresolved overlap", () => {
    const baseline = input();
    const result = failureOf(
      input({
        overlapAssessment: {
          status: "unknown_or_unconfirmed",
          assessedHeatPathIds:
            baseline.overlapAssessment.assessedHeatPathIds,
          physicalSourceIdentityChecked: null,
          assessmentSourceRef: "overlap-assessment:coil-loop-01",
          reason: "Physical source identity has not been checked.",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.overlap_assessment_unknown" },
    });
  });

  it.each([
    ["missing path", ["heat-path:Pcu"]],
    [
      "extra path",
      [
        "heat-path:Pcu",
        "heat-path:Qpickup_to_coil",
        "heat-path:Pother:auxiliary-01",
        "heat-path:Pother:auxiliary-02",
        "heat-path:extra",
      ],
    ],
    [
      "duplicate path",
      [
        "heat-path:Pcu",
        "heat-path:Qpickup_to_coil",
        "heat-path:Pother:auxiliary-01",
        "heat-path:Pother:auxiliary-02",
        "heat-path:Pcu",
      ],
    ],
  ] as const)("rejects an overlap assessment with %s", (_label, pathIds) => {
    const result = failureOf(
      input({
        overlapAssessment: {
          status: "confirmed_pairwise_disjoint",
          assessedHeatPathIds: pathIds,
          physicalSourceIdentityChecked: true,
          assessmentSourceRef: "overlap-assessment:coil-loop-01",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.overlap_assessment_path_set_mismatch" },
    });
  });

  it("does not require excluded paths in the overlap-assessment set", () => {
    const result = successOf(input());
    expect(result.evidence.overlapAssessment.assessedHeatPathIds).not.toContain(
      "heat-path:Pmag",
    );
  });

  it("fails closed for a requested design-margin scenario", () => {
    const result = failureOf(
      input({
        design_margin: {
          status: "requested",
          scenarioId: "design-margin-scenario:upper-duty",
          sourceRef: "project-spec:margin-pending",
          mathematicalDefinition: "not_frozen",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.design_margin_route_unresolved" },
    });
  });

  it("fails closed for unknown design-margin status", () => {
    const result = failureOf(
      input({
        design_margin: {
          status: "unknown_or_unconfirmed",
          reason: "Scenario selection has not been approved.",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.design_margin_route_unresolved" },
    });
  });

  it("rejects a requested margin that claims an uncontrolled operator", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.design_margin = {
      status: "requested",
      scenarioId: "design-margin-scenario:upper-duty",
      sourceRef: "project-spec:margin-pending",
      mathematicalDefinition: "multiply_by_hidden_factor",
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.design_margin_route_unresolved" },
    });
  });

  it("fails closed when a physical term is routed as design margin", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pcu = {
      ...candidate.Pcu,
      sourceMethod: "design_margin",
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.design_margin_route_unresolved" },
    });
  });

  it.each([
    ["source method", { sourceMethod: "unknown_or_unconfirmed" }],
    ["source reference", { sourceRef: "" }],
    ["data quality", { dataQuality: "unknown" }],
    ["provenance ID", { provenanceId: "" }],
    ["source snapshot", { sourceSnapshotId: "snapshot:not-content-addressed" }],
  ])("returns insufficient_data for unresolved %s", (_label, overrides) => {
    const result = failureOf(
      input({
        Pcu: knownTerm(
          "Pcu",
          10,
          overrides as Partial<H01KnownApplicableHeatTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "H-01.heat_term_provenance_insufficient" },
    });
  });

  it("rejects an uncontrolled source-method enum", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pcu = { ...candidate.Pcu, sourceMethod: "spreadsheet_guess" };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it("rejects contradictory source-confirmed exclusion and destination", () => {
    const result = failureOf(
      input({
        Pmag: excludedTerm("Pmag", {
          heatDestination: "declared_coil_coolant_circuit",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it("rejects contradictory unknown applicability and known destination", () => {
    const result = failureOf(
      input({
        Pmag: unknownTerm("Pmag", {
          heatDestination: "declared_coil_coolant_circuit",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it.each([
    -1,
    -0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects invalid canonical-SI term value %s", (valueW) => {
    const result = failureOf(input({ Pcu: knownTerm("Pcu", valueW) }));
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_value_invalid" },
    });
  });

  it.each([Number.MIN_VALUE, H01_BINARY64_MIN_NORMAL / 2])(
    "rejects positive subnormal input %s without flushing it",
    (valueW) => {
      const result = failureOf(input({ Pcu: knownTerm("Pcu", valueW) }));
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "H-01.heat_term_numeric_resolution_invalid" },
      });
    },
  );

  it("rejects finite-input addition overflow", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", Number.MAX_VALUE),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", Number.MAX_VALUE),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([]),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.numeric_overflow" },
    });
  });

  it("rejects a positive addend swallowed by a prior subtotal", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", Number.MAX_VALUE),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 1),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([]),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.numeric_term_swallowed" },
    });
  });

  it("rejects a prior positive subtotal swallowed by a later addend", () => {
    const result = failureOf(
      input({
        Pcu: knownTerm("Pcu", 1),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", Number.MAX_VALUE),
        Pmag: excludedTerm("Pmag"),
        Pother: otherLoads([]),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.numeric_term_swallowed" },
    });
  });

  it.each([
    ["input ID", { inputId: "Pmag" }],
    ["dimension", { dimensionId: "energy" }],
    ["canonical unit", { canonicalUnitId: "kW" }],
    ["value resolution", { valueResolution: "estimated_zero" }],
  ])("rejects an incorrect known-term %s binding", (_label, overrides) => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pcu = { ...candidate.Pcu, ...overrides };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it.each([
    null,
    [],
    { ...input(), extra: true },
    (() => {
      const candidate = input() as unknown as Record<string, unknown>;
      delete candidate.Pmag;
      return candidate;
    })(),
  ])("rejects a non-exact top-level input %#", (candidate) => {
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.input_schema_invalid" },
    });
  });

  it.each([
    ["control volume", "controlVolume"],
    ["copper loss", "Pcu"],
    ["external pickup", "Qpickup_to_coil"],
    ["magnetic loss", "Pmag"],
    ["other-load inventory", "Pother"],
    ["overlap assessment", "overlapAssessment"],
    ["design margin", "design_margin"],
  ] as const)("fails closed when nested %s is null", (_label, field) => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate[field] = null;
    const result = failureOf(candidate);
    expect(["invalid_input", "insufficient_data"]).toContain(result.status);
  });

  it("rejects symbol-keyed top-level input", () => {
    const candidate = input() as unknown as Record<PropertyKey, unknown>;
    candidate[Symbol("extra")] = true;
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-01.input_schema_invalid");
  });

  it("does not execute a top-level getter", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, "Pcu", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    failureOf(candidate);
    expect(executed).toBe(false);
  });

  it("does not execute a nested heat-term getter", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, any>;
    Object.defineProperty(candidate.Pcu, "valueW", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    failureOf(candidate);
    expect(executed).toBe(false);
  });

  it("does not execute a Pother array element getter", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, any>;
    const loads: unknown[] = [];
    Object.defineProperty(loads, "0", {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    candidate.Pother = { ...candidate.Pother, loads };
    const result = failureOf(candidate);
    expect(executed).toBe(false);
    expect(result.failure.code).toBe("H-01.other_loads_schema_invalid");
  });

  it("fails closed without throwing on hostile top-level proxy traps", () => {
    const candidate = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => evaluateH01CoolingHeatLoad(candidate)).not.toThrow();
    failureOf(candidate);
  });

  it("fails closed without throwing on hostile nested descriptor traps", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pcu = new Proxy(candidate.Pcu, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor");
      },
    });
    expect(() => evaluateH01CoolingHeatLoad(candidate)).not.toThrow();
    failureOf(candidate);
  });

  it("rejects coercible numeric objects without invoking valueOf", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pcu = {
      ...candidate.Pcu,
      valueW: {
        valueOf() {
          executed = true;
          return 10;
        },
      },
    };
    const result = failureOf(candidate);
    expect(executed).toBe(false);
    expect(result.failure.code).toBe("H-01.heat_term_value_invalid");
  });

  it("rejects a huge sparse Pother array quickly", () => {
    const candidate = input() as unknown as Record<string, any>;
    candidate.Pother = {
      ...candidate.Pother,
      loads: new Array(0xffffffff),
    };
    expect(() => evaluateH01CoolingHeatLoad(candidate)).not.toThrow();
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-01.other_loads_schema_invalid");
  });

  it("rejects a sparse Pother array", () => {
    const candidate = input() as unknown as Record<string, any>;
    const loads = new Array(2);
    loads[1] = knownTerm("Pother", 10);
    candidate.Pother = { ...candidate.Pother, loads };
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("H-01.other_loads_schema_invalid");
  });

  it("rejects an accessor-bearing overlap path list", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, any>;
    const pathIds: unknown[] = [];
    Object.defineProperty(pathIds, "0", {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    candidate.overlapAssessment = {
      ...candidate.overlapAssessment,
      assessedHeatPathIds: pathIds,
    };
    const result = failureOf(candidate);
    expect(executed).toBe(false);
    expect(result.failure.code).toBe("H-01.overlap_assessment_schema_invalid");
  });

  it("lets a bogus later sourceMethod enum outrank a known forbidden heat class", () => {
    const malformed = {
      ...knownTerm("Pcu", 10),
      heatSourceClass: "workpiece_useful_heat",
      sourceMethod: "spreadsheet_guess",
    } as unknown as H01HeatTerm;
    const result = failureOf(input({ Pcu: malformed }));
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "H-01.heat_term_binding_invalid" },
    });
  });

  it("lets a known forbidden heat class outrank an unknown control volume", () => {
    const result = failureOf(
      input({
        controlVolume: controlVolume({
          heatDestination: "other_or_unconfirmed",
          circuitScope: "unknown_or_unconfirmed",
          boundaryCompleteConfirmed: null,
        }),
        Qpickup_to_coil: knownTerm("Qpickup_to_coil", 10, {
          heatSourceClass: "reactive_power",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.forbidden_heat_class_not_applicable" },
    });
  });

  it("lets explicit forbidden-class exclusion failure outrank an unknown item", () => {
    const result = failureOf(
      input({
        controlVolume: controlVolume({
          forbiddenHeatClassesExcludedConfirmed: false,
          boundaryCompleteConfirmed: null,
        }),
        Qpickup_to_coil: unknownTerm("Qpickup_to_coil"),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.control_volume_not_applicable" },
    });
  });

  it("lets an explicit overlap finding outrank unknown item evidence", () => {
    const result = failureOf(
      input({
        Qpickup_to_coil: unknownTerm("Qpickup_to_coil"),
        overlapAssessment: {
          status: "duplicate_or_overlap_present",
          assessedHeatPathIds: ["heat-path:Pcu"],
          physicalSourceIdentityChecked: true,
          assessmentSourceRef: "overlap-assessment:known-duplicate:01",
          overlapDescription: "Two records represent one physical heat path.",
        },
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "H-01.overlap_or_duplicate_present" },
    });
  });

  it.each(["heatPathId", "physicalHeatSourceId"] as const)(
    "globally rejects a duplicate %s shared by included and source-confirmed excluded records",
    (identityField) => {
      const included = knownTerm("Pcu", 10);
      const excluded = excludedTerm("Pmag", {
        [identityField]: included[identityField],
      });
      const result = failureOf(input({ Pcu: included, Pmag: excluded }));
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "H-01.overlap_or_duplicate_present" },
      });
    },
  );

  it("keeps unique source-confirmed excluded records as provenance without summing them", () => {
    const excludedOther = excludedTerm("Pother", {
      heatPathId: "heat-path:Pother:excluded-unique",
      physicalHeatSourceId: "physical-heat-source:Pother:excluded-unique",
      provenanceId: "provenance:Pother:excluded-unique",
    });
    const result = successOf(
      input({
        Pother: otherLoads([excludedOther]),
      }),
    );
    expect(result.value.Qcool.valueSi).toBe(1_500);
    expect(result.value.perItemProvenance).toContainEqual(
      expect.objectContaining({
        disposition: "source_confirmed_not_applicable",
        heatPathId: "heat-path:Pother:excluded-unique",
        physicalHeatSourceId: "physical-heat-source:Pother:excluded-unique",
      }),
    );
  });

  it("deep-freezes the complete result, provenance and trace", () => {
    const result = successOf(input());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Qcool)).toBe(true);
    expect(Object.isFrozen(result.value.perItemProvenance)).toBe(true);
    expect(
      result.value.perItemProvenance.every((item) => Object.isFrozen(item)),
    ).toBe(true);
    expect(Object.isFrozen(result.value.unaccountedItems)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
    expect(Object.isFrozen(result.substitution.orderedIncludedTerms)).toBe(true);
    expect(Object.isFrozen(result.inputSnapshot)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.controlVolume)).toBe(true);
    expect(Object.isFrozen(result.evidence.heatTerms)).toBe(true);
    expect(Object.isFrozen(result.evidence.overlapAssessment)).toBe(true);
    expect(Object.isFrozen(result.assumptions)).toBe(true);
    expect(Object.isFrozen(result.mapping)).toBe(true);
  });

  it("binds every failure to method/version/mapping without engineering payload", () => {
    const result = failureOf(null);
    expect(result).toMatchObject({
      methodId: "H-01",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved",
      mapping: H01_METHOD_MAPPING,
      warningIds: [],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.failure)).toBe(true);
  });
});
