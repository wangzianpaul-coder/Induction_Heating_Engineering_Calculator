import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import {
  methodId,
  sourceRef,
  type MethodId,
  type SourceRef,
} from "../domain/ids.js";
import {
  isApprovalStatus,
  isLifecycleStatus,
  isMethodType,
  isScientificConfidence,
  type ApprovalStatus,
  type LifecycleStatus as DomainLifecycleStatus,
  type MethodType as DomainMethodType,
  type ScientificConfidence as DomainScientificConfidence,
} from "../domain/status.js";
import {
  cloneAndDeepFreeze,
  ImmutableRegistry,
} from "./immutableRegistry.js";
import { METHOD_CONTRACT_METADATA_CATALOG } from "./methodContractMetadataCatalog.js";

export type EngineeringModuleId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type RegistryMethodType = DomainMethodType;
export type MethodApprovalStatus = ApprovalStatus;
export type RegistryLifecycleStatus = DomainLifecycleStatus;
export type MethodScientificConfidence = DomainScientificConfidence;

export type RecommendationEligibility =
  | "eligible"
  | "conditionally_eligible"
  | "not_eligible"
  | null;

export interface MethodContractMetadata {
  readonly inputParameterIds: readonly string[];
  readonly outputQuantityIds: readonly string[];
  readonly applicabilityDomain: string;
  readonly warningPredicates: readonly string[];
  readonly warningIds: readonly string[];
  readonly validationCaseIds: readonly string[];
  readonly methodCheckIds: readonly string[];
  readonly validationNotes: string;
  readonly sourceRefs: readonly string[];
  readonly scientificConfidence: MethodScientificConfidence | null;
  readonly scientificConfidenceRaw: string;
  readonly confidenceResolutionReason: string;
  readonly recommendationEligibility: RecommendationEligibility;
  readonly recommendationReason: string;
  readonly contractEquationRef: string;
  readonly contractApplicabilityRef: string;
  readonly contractWarningRef: string;
  readonly contractValidationRef: string;
}

export interface LocalizedEngineeringName {
  readonly en: string;
  readonly zh: string;
}

export interface MethodSpecification {
  readonly methodId: MethodId;
  readonly methodVersion: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly moduleId: EngineeringModuleId;
  readonly engineeringName: LocalizedEngineeringName;
  readonly purpose: string;
  /** Null only when the controlled parent specification requires child methods. */
  readonly methodType: DomainMethodType | null;
  readonly approvalStatus: MethodApprovalStatus;
  readonly lifecycleStatus: DomainLifecycleStatus;
  readonly specificationCompleteness: "complete";
  readonly sourceRefs: readonly SourceRef[];
  readonly contractRef: string;
  readonly scientificConfidence: MethodScientificConfidence | null;
  readonly scientificConfidenceRaw: string;
  readonly confidenceResolutionReason: string;
  readonly inputParameterIds: readonly string[];
  readonly outputQuantityIds: readonly string[];
  /** Reference-only metadata; no equation is evaluated by this registry. */
  readonly equationRefs: readonly string[];
  readonly contractEquationRef: string;
  readonly contractSourceRefs: readonly string[];
  readonly derivationRefs: readonly string[];
  readonly derivationResolutionReason: string | null;
  readonly contractApplicabilityRef: string;
  readonly applicabilityDomain: string;
  readonly contractWarningRef: string;
  readonly warningPredicates: readonly string[];
  readonly warningIds: readonly string[];
  readonly warningIdResolutionReason: string | null;
  readonly contractValidationRef: string;
  readonly validationCaseIds: readonly string[];
  readonly methodCheckIds: readonly string[];
  readonly validationNotes: string;
  readonly validationIdResolutionReason: string | null;
  readonly recommendationEligibility: RecommendationEligibility;
  readonly recommendationReason: string;
  readonly requiresSubmethodSplit: boolean;
  readonly submethodSplitBasis?: string;
  readonly implementationAvailable: boolean;
  readonly executable: boolean;
}

export type MethodNotExecutableReason =
  | "deferred"
  | "not_approved"
  | "requires_submethod_split"
  | "implementation_unavailable"
  | "execution_disabled";

export class MethodNotExecutableError extends Error {
  public readonly methodId: MethodId;
  public readonly reason: MethodNotExecutableReason;

  public constructor(id: MethodId, reason: MethodNotExecutableReason) {
    super(`Method ${id} is not runtime executable: ${reason}`);
    this.name = "MethodNotExecutableError";
    this.methodId = id;
    this.reason = reason;
  }
}

function runtimeFailureReason(
  specification: MethodSpecification,
): MethodNotExecutableReason | null {
  if (specification.approvalStatus === "deferred") {
    return "deferred";
  }
  if (
    specification.approvalStatus !== "approved" &&
    specification.approvalStatus !== "approved_with_limitation"
  ) {
    return "not_approved";
  }
  if (specification.requiresSubmethodSplit) {
    return "requires_submethod_split";
  }
  if (!specification.implementationAvailable) {
    return "implementation_unavailable";
  }
  if (!specification.executable) {
    return "execution_disabled";
  }
  return null;
}

const ENGINEERING_MODULE_IDS: ReadonlySet<string> = new Set([
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
]);

const CENTRAL_VALIDATION_CASE_IDS: ReadonlySet<string> = new Set([
  "GEO-001",
  "GEO-002",
  "EM-L-001",
  "EM-L-002",
  "EM-L-003",
  "EM-L-004",
  "EM-L-005",
  "EM-L-006",
  "ELEC-RDC-001",
  "EM-Z-001",
  "EM-Z-002",
  "EXP-RAC-001",
  "PWR-PAR-IDEAL-001",
  "PWR-PAR-RL-001",
  "PWR-XFMR-001",
  "PWR-LLC-ZJL-001",
  "COOL-ENERGY-001",
  "EXP-COOL-001",
]);

const STABLE_WARNING_IDS: ReadonlySet<string> = new Set([
  "no_approved_recommended_result",
]);

const RECOMMENDATION_ELIGIBILITIES: ReadonlySet<string | null> = new Set([
  "eligible",
  "conditionally_eligible",
  "not_eligible",
  null,
]);

function assertNonEmptyString(value: string, context: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${context} must be non-empty.`);
  }
}

function assertNonEmptyStringList(
  values: readonly string[],
  context: string,
): void {
  if (values.length === 0) {
    throw new TypeError(`${context} must contain at least one controlled entry.`);
  }
  if (values.some((value) => value.trim().length === 0)) {
    throw new TypeError(`${context} must not contain empty entries.`);
  }
}

function assertUniqueStrings(values: readonly string[], context: string): void {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${context} must not contain duplicates.`);
  }
}

export class MethodSpecificationRegistry extends ImmutableRegistry<
  MethodId,
  MethodSpecification
> {
  public constructor(specifications: Iterable<MethodSpecification>) {
    const checked = Array.from(specifications, (specification) => {
      methodId(specification.methodId);
      if (!ENGINEERING_MODULE_IDS.has(specification.moduleId)) {
        throw new TypeError(`Method ${specification.methodId} has an unknown module.`);
      }
      if (!specification.methodId.startsWith(`${specification.moduleId}-`)) {
        throw new TypeError(
          `Method ${specification.methodId} does not belong to module ${specification.moduleId}.`,
        );
      }
      assertNonEmptyString(specification.methodVersion, `Method ${specification.methodId} methodVersion`);
      if (specification.technicalFreezeId !== TECHNICAL_FREEZE_ID) {
        throw new TypeError(`Method ${specification.methodId} has the wrong technical freeze ID.`);
      }
      assertNonEmptyString(specification.engineeringName.en, `Method ${specification.methodId} English name`);
      assertNonEmptyString(specification.engineeringName.zh, `Method ${specification.methodId} Chinese name`);
      assertNonEmptyString(specification.purpose, `Method ${specification.methodId} purpose`);
      if (specification.methodType !== null && !isMethodType(specification.methodType)) {
        throw new TypeError(`Method ${specification.methodId} has an unknown method type.`);
      }
      if (!isApprovalStatus(specification.approvalStatus)) {
        throw new TypeError(`Method ${specification.methodId} has an unknown approval status.`);
      }
      if (!isLifecycleStatus(specification.lifecycleStatus)) {
        throw new TypeError(`Method ${specification.methodId} has an unknown lifecycle status.`);
      }
      if (specification.specificationCompleteness !== "complete") {
        throw new TypeError(`Method ${specification.methodId} is not specification-complete.`);
      }
      if (specification.sourceRefs.length === 0) {
        throw new TypeError(`Method ${specification.methodId} has no source_refs.`);
      }
      assertUniqueStrings(specification.sourceRefs, `Method ${specification.methodId} source_refs`);
      for (const controlledSourceRef of specification.sourceRefs) {
        sourceRef(controlledSourceRef);
      }
      const contractPrefix = `CALCULATION_CONTRACTS.md#${specification.methodId}`;
      for (const [label, reference] of [
        ["contractRef", specification.contractRef],
        ["contractEquationRef", specification.contractEquationRef],
        ["contractApplicabilityRef", specification.contractApplicabilityRef],
        ["contractWarningRef", specification.contractWarningRef],
        ["contractValidationRef", specification.contractValidationRef],
      ] as const) {
        if (!reference.startsWith(contractPrefix)) {
          throw new TypeError(`Method ${specification.methodId} ${label} is not method-scoped.`);
        }
      }
      assertNonEmptyString(specification.scientificConfidenceRaw, `Method ${specification.methodId} scientificConfidenceRaw`);
      assertNonEmptyString(specification.confidenceResolutionReason, `Method ${specification.methodId} confidenceResolutionReason`);
      if (
        specification.scientificConfidence !== null &&
        !isScientificConfidence(specification.scientificConfidence)
      ) {
        throw new TypeError(`Method ${specification.methodId} has an unknown scientific confidence.`);
      }
      assertNonEmptyStringList(specification.inputParameterIds, `Method ${specification.methodId} inputs`);
      assertNonEmptyStringList(specification.outputQuantityIds, `Method ${specification.methodId} outputs`);
      assertNonEmptyStringList(specification.equationRefs, `Method ${specification.methodId} equation refs`);
      if (!specification.equationRefs.includes(specification.contractEquationRef)) {
        throw new TypeError(`Method ${specification.methodId} equation refs omit its contract equation.`);
      }
      assertNonEmptyStringList(specification.contractSourceRefs, `Method ${specification.methodId} contract source refs`);
      if (specification.derivationRefs.length === 0) {
        if (specification.derivationResolutionReason === null) {
          throw new TypeError(`Method ${specification.methodId} must explain absent derivation refs.`);
        }
        assertNonEmptyString(specification.derivationResolutionReason, `Method ${specification.methodId} derivation resolution reason`);
      } else {
        if (specification.derivationResolutionReason !== null) {
          throw new TypeError(`Method ${specification.methodId} has derivation refs and an unexpected absence reason.`);
        }
        for (const derivationRef of specification.derivationRefs) {
          if (!specification.contractSourceRefs.includes(derivationRef)) {
            throw new TypeError(`Method ${specification.methodId} derivation ref is not a contract source ref.`);
          }
        }
      }
      assertNonEmptyString(specification.applicabilityDomain, `Method ${specification.methodId} applicability domain`);
      assertNonEmptyStringList(specification.warningPredicates, `Method ${specification.methodId} warning predicates`);
      assertUniqueStrings(specification.warningIds, `Method ${specification.methodId} warning IDs`);
      for (const warningId of specification.warningIds) {
        if (!STABLE_WARNING_IDS.has(warningId)) {
          throw new TypeError(`Method ${specification.methodId} uses an unknown stable warning ID.`);
        }
      }
      if (specification.warningIds.length === 0) {
        if (specification.warningIdResolutionReason === null) {
          throw new TypeError(`Method ${specification.methodId} must explain absent warning IDs.`);
        }
        assertNonEmptyString(specification.warningIdResolutionReason, `Method ${specification.methodId} warning ID resolution reason`);
      } else if (specification.warningIdResolutionReason !== null) {
        throw new TypeError(`Method ${specification.methodId} has warning IDs and an unexpected absence reason.`);
      }
      assertUniqueStrings(specification.validationCaseIds, `Method ${specification.methodId} validation case IDs`);
      assertUniqueStrings(specification.methodCheckIds, `Method ${specification.methodId} method check IDs`);
      for (const validationCaseId of specification.validationCaseIds) {
        if (!CENTRAL_VALIDATION_CASE_IDS.has(validationCaseId)) {
          throw new TypeError(`Method ${specification.methodId} uses a non-central validation_case_id.`);
        }
      }
      for (const methodCheckId of specification.methodCheckIds) {
        if (CENTRAL_VALIDATION_CASE_IDS.has(methodCheckId)) {
          throw new TypeError(`Method ${specification.methodId} puts a central case in methodCheckIds.`);
        }
      }
      assertNonEmptyString(specification.validationNotes, `Method ${specification.methodId} validation notes`);
      if (specification.validationCaseIds.length === 0 && specification.methodCheckIds.length === 0) {
        if (specification.validationIdResolutionReason === null) {
          throw new TypeError(`Method ${specification.methodId} must explain absent validation IDs.`);
        }
        assertNonEmptyString(specification.validationIdResolutionReason, `Method ${specification.methodId} validation ID resolution reason`);
      } else if (specification.validationIdResolutionReason !== null) {
        throw new TypeError(`Method ${specification.methodId} has validation IDs and an unexpected absence reason.`);
      }
      if (!RECOMMENDATION_ELIGIBILITIES.has(specification.recommendationEligibility)) {
        throw new TypeError(`Method ${specification.methodId} has an unknown recommendation eligibility.`);
      }
      assertNonEmptyString(specification.recommendationReason, `Method ${specification.methodId} recommendation reason`);
      if (specification.methodType === null && !specification.requiresSubmethodSplit) {
        throw new TypeError(
          `Method ${specification.methodId} has no method_type and must require a submethod split.`,
        );
      }
      if (
        specification.requiresSubmethodSplit &&
        (specification.submethodSplitBasis === undefined || specification.submethodSplitBasis.trim().length === 0)
      ) {
        throw new TypeError(`Method ${specification.methodId} must explain its submethod split.`);
      }
      if (
        typeof specification.implementationAvailable !== "boolean" ||
        typeof specification.executable !== "boolean"
      ) {
        throw new TypeError(`Method ${specification.methodId} execution flags must be booleans.`);
      }
      if (specification.requiresSubmethodSplit && specification.executable) {
        throw new TypeError(
          `Method ${specification.methodId} cannot execute before its submethods are split.`,
        );
      }
      if (!specification.implementationAvailable && specification.executable) {
        throw new TypeError(
          `Method ${specification.methodId} cannot execute without an implementation.`,
        );
      }
      if (
        specification.approvalStatus === "deferred" &&
        (specification.implementationAvailable || specification.executable)
      ) {
        throw new TypeError(
          `Deferred method ${specification.methodId} cannot be registered as implemented or executable.`,
        );
      }
      return specification;
    });

    super(checked, {
      registryName: "MethodSpecificationRegistry",
      idOf: (specification) => specification.methodId,
    });
    Object.freeze(this);
  }

  public byApprovalStatus(
    approvalStatus: MethodApprovalStatus,
  ): readonly MethodSpecification[] {
    return Object.freeze(
      this.values().filter(
        (specification) => specification.approvalStatus === approvalStatus,
      ),
    );
  }

  public runtimeSpecifications(): readonly MethodSpecification[] {
    return Object.freeze(
      this.values().filter(
        (specification) => runtimeFailureReason(specification) === null,
      ),
    );
  }

  public isRuntimeExecutable(id: MethodId): boolean {
    return runtimeFailureReason(this.get(id)) === null;
  }

  public resolveRuntime(id: MethodId): MethodSpecification {
    const specification = this.get(id);
    const reason = runtimeFailureReason(specification);
    if (reason !== null) {
      throw new MethodNotExecutableError(id, reason);
    }
    return specification;
  }
}

interface SpecificationInput {
  readonly id: string;
  readonly moduleId: EngineeringModuleId;
  readonly en: string;
  readonly zh: string;
  readonly purpose: string;
  readonly methodType: DomainMethodType | null;
  readonly approvalStatus:
    | "approved"
    | "approved_with_limitation"
    | "deferred";
  readonly sourceRefs: readonly string[];
  readonly requiresSubmethodSplit?: boolean;
  readonly submethodSplitBasis?: string;
}

function specification(input: SpecificationInput): MethodSpecification {
  const controlledMethodId = methodId(input.id);
  const requiresSubmethodSplit = input.requiresSubmethodSplit ?? false;
  const metadata = METHOD_CONTRACT_METADATA_CATALOG[controlledMethodId];
  if (metadata === undefined) {
    throw new TypeError(`Method ${input.id} has no controlled contract metadata.`);
  }
  const derivationRefs = metadata.sourceRefs.filter(
    (ref) => ref.startsWith("ID-") || ref.startsWith("DER-"),
  );
  return {
    methodId: controlledMethodId,
    methodVersion: VERSION_INFO.calculationModel,
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    moduleId: input.moduleId,
    engineeringName: { en: input.en, zh: input.zh },
    purpose: input.purpose,
    methodType: input.methodType,
    approvalStatus: input.approvalStatus,
    lifecycleStatus: "active",
    specificationCompleteness: "complete",
    sourceRefs: input.sourceRefs.map(sourceRef),
    contractRef: `CALCULATION_CONTRACTS.md#${input.id}`,
    scientificConfidence: metadata.scientificConfidence,
    scientificConfidenceRaw: metadata.scientificConfidenceRaw,
    confidenceResolutionReason: metadata.confidenceResolutionReason,
    inputParameterIds: metadata.inputParameterIds,
    outputQuantityIds: metadata.outputQuantityIds,
    equationRefs: [metadata.contractEquationRef],
    contractEquationRef: metadata.contractEquationRef,
    contractSourceRefs: metadata.sourceRefs,
    derivationRefs,
    derivationResolutionReason:
      derivationRefs.length === 0
        ? "No ID-/DER- controlled derivation reference is listed in the contract; use the frozen source references."
        : null,
    contractApplicabilityRef: metadata.contractApplicabilityRef,
    applicabilityDomain: metadata.applicabilityDomain,
    contractWarningRef: metadata.contractWarningRef,
    warningPredicates: metadata.warningPredicates,
    warningIds: metadata.warningIds,
    warningIdResolutionReason:
      metadata.warningIds.length === 0
        ? "The contract freezes prose warning predicates but no stable warning_id for this method."
        : null,
    contractValidationRef: metadata.contractValidationRef,
    validationCaseIds: metadata.validationCaseIds,
    methodCheckIds: metadata.methodCheckIds,
    validationNotes: metadata.validationNotes,
    validationIdResolutionReason:
      metadata.validationCaseIds.length === 0 && metadata.methodCheckIds.length === 0
        ? "The contract does not assign a stable validation_case_id or method_check_id."
        : null,
    recommendationEligibility: metadata.recommendationEligibility,
    recommendationReason: metadata.recommendationReason,
    requiresSubmethodSplit,
    ...(input.submethodSplitBasis === undefined
      ? {}
      : { submethodSplitBasis: input.submethodSplitBasis }),
    implementationAvailable: false,
    executable: false,
  };
}

/**
 * Frozen Gate-0 specification catalog. It is metadata, not a runtime method
 * implementation registry; every implementation/execution flag is false in
 * Phase 1.
 */
export const METHOD_SPECIFICATIONS: readonly MethodSpecification[] = cloneAndDeepFreeze([
  specification({
    id: "A-01",
    moduleId: "A",
    en: "Temperature-dependent property lookup and interpolation",
    zh: "温变物性查询与插值",
    purpose: "Return a provenance-bearing SI property snapshot inside an approved material-data domain.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-DATA-01"],
  }),
  specification({
    id: "A-02",
    moduleId: "A",
    en: "Water properties",
    zh: "水物性",
    purpose: "Query version-pinned water thermodynamic and transport properties for single-phase cooling.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "IAPWS-95",
      "IAPWS-IF97",
      "IAPWS-R12-08",
      "IAPWS-R15-11",
      "IAPWS-SR6-08:OPTIONAL-STRICT-DOMAIN",
      "LOCAL-COPY-REQUIRED",
    ],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The full IAPWS path and optional SR6-08 strict-domain simplification require concrete versioned submethod records.",
  }),
  specification({
    id: "B-01",
    moduleId: "B",
    en: "Geometry normalization",
    zh: "几何规范化",
    purpose: "Normalize mechanical envelope, turn centers, conductor section and path into the frozen geometry semantics.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-GEO-01"],
  }),
  specification({
    id: "B-02",
    moduleId: "B",
    en: "Axial fill factor",
    zh: "轴向填充系数",
    purpose: "Report the axial projected coverage of a uniform single-layer winding.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-GEO-01"],
  }),
  specification({
    id: "B-03",
    moduleId: "B",
    en: "Ideal long solenoid",
    zh: "理想长螺线管",
    purpose: "Provide the infinite-current-sheet long-coil limit and magnitude check.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["N09:PDF20-21:eq15-18", "RG12:PDF116-135", "CODATA22"],
  }),
  specification({
    id: "B-04",
    moduleId: "B",
    en: "Nagaoka/Lundin finite current sheet",
    zh: "Nagaoka/Lundin 有限长电流片",
    purpose: "Provide the finite-length air-core baseline for a uniform cylindrical current sheet.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "L85:PDF3-4:eq9-12:table1",
      "N09:PDF20-21:eq15-18",
      "CODATA22",
    ],
  }),
  specification({
    id: "B-05",
    moduleId: "B",
    en: "Wheeler 1928 single-layer approximation",
    zh: "Wheeler 1928 单层快速式",
    purpose: "Provide a fast single-layer engineering comparison within Wheeler's stated geometry domain.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["W28:PDF2:eq2", "W28:PDF3:eq3"],
  }),
  specification({
    id: "B-06",
    moduleId: "B",
    en: "Wheeler 1928 multilayer approximation",
    zh: "Wheeler 多层式",
    purpose: "Provide a fast estimate only for a genuine, approximately uniform multilayer winding.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["W28:PDF1:PRINT1398:FIG1:eq1"],
  }),
  specification({
    id: "B-07",
    moduleId: "B",
    en: "Discrete coaxial loop summation",
    zh: "离散同轴圆环求和",
    purpose: "Sum supported turn self-inductances and mutual inductances for discrete coaxial loops.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "RG12:PDF6:eq1",
      "RG12:PDF123:eq81",
      "RG12:PDF126-128:example57",
      "CODATA22",
    ],
  }),
  specification({
    id: "B-08",
    moduleId: "B",
    en: "Simpson numerical integration",
    zh: "Simpson 数值积分",
    purpose: "Independently check approved integrals without creating a new physical model.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-NUM-01"],
  }),
  specification({
    id: "C-01",
    moduleId: "C",
    en: "Inductance method comparison",
    zh: "电感方法比较",
    purpose: "Compare all applicable approved inductance methods on one frozen geometry and retain failures.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-QA-01", "VALIDATION_CASES"],
  }),
  specification({
    id: "D-01",
    moduleId: "D",
    en: "Mechanical/CAD conductor center-path length",
    zh: "机械/CAD 导体中心路径长度",
    purpose: "Determine conductor length from the actual mechanical helix and explicit lead/bus paths.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-GEO-02"],
  }),
  specification({
    id: "D-02",
    moduleId: "D",
    en: "Conductor metal and hydraulic areas",
    zh: "金属截面积与水力面积分离",
    purpose: "Keep conducting metal area separate from coolant flow area and wetted perimeter.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-GEO-03"],
  }),
  specification({
    id: "D-03",
    moduleId: "D",
    en: "DC resistance",
    zh: "DC 电阻",
    purpose: "Determine conductor and terminal DC resistance at a stated material temperature and boundary.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-OHM-01"],
  }),
  specification({
    id: "D-04",
    moduleId: "D",
    en: "Copper conductor skin depth",
    zh: "铜导体趋肤深度",
    purpose: "Determine the sinusoidal linear-conductor reference skin depth for AC-domain screening.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-EM-01", "JM95:PDF1-4", "CODATA22"],
  }),
  specification({
    id: "D-05",
    moduleId: "D",
    en: "AC resistance method family",
    zh: "AC 电阻分级",
    purpose: "Route AC-resistance estimation or identification only to a geometry- and state-matched child method.",
    methodType: null,
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["RG12:PDF172-187", "DHT:PDF8", "DHT:PDF17-18"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The contract explicitly defines D-05 as a calculation family spanning engineering screening and measurement-identified child methods.",
  }),
  specification({
    id: "D-06",
    moduleId: "D",
    en: "Current density and copper loss",
    zh: "电流密度与铜损",
    purpose: "Report average current density and copper loss at an explicit RMS port and resistance boundary.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-OHM-02"],
  }),
  specification({
    id: "D-07",
    moduleId: "D",
    en: "Coil series-port parameters",
    zh: "线圈串联端口参数",
    purpose: "Report series-port reactance, impedance, Q and component voltages at one frequency and state.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-AC-01"],
  }),
  specification({
    id: "E-01",
    moduleId: "E",
    en: "Workpiece reference penetration depth",
    zh: "工件参考透入深度",
    purpose: "Report the workpiece electromagnetic amplitude scale with temperature/field property provenance.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-EM-01", "M04:PDF2:eq1", "JM95:PDF1-4", "CODATA22"],
  }),
  specification({
    id: "E-02",
    moduleId: "E",
    en: "Curie-region temperature scan",
    zh: "Curie 与温度扫描",
    purpose: "Scan resistivity, effective permeability and penetration depth over approved temperature data.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["S89:PDF1-5", "MATERIAL-DATA-REQUIRED"],
  }),
  specification({
    id: "E-03",
    moduleId: "E",
    en: "Reference critical frequency and penetration ratio",
    zh: "参考临界频率与穿透比",
    purpose: "Report a stated solid-cylinder empirical penetration criterion, not a universal optimum frequency.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["M04:PDF2-3:eq1-5", "ID-EM-01", "CODATA22"],
  }),
  specification({
    id: "F-01",
    moduleId: "F",
    en: "Ideal transformer reflected impedance",
    zh: "理想变压器反射阻抗",
    purpose: "Estimate reflected series load only when same-state coupled-circuit parameters are supplied.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-Z-01", "L13:PDF1-6", "J08:PDF2-3"],
  }),
  specification({
    id: "F-02",
    moduleId: "F",
    en: "Port-impedance measurement identification",
    zh: "端口阻抗测量辨识",
    purpose: "Identify series equivalent resistance and inductance from same-state de-embedded measurements.",
    methodType: "measurement_identified",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-MEAS-01", "DHT:PDF17-18"],
  }),
  specification({
    id: "F-03",
    moduleId: "F",
    en: "Project-specific empirical load model",
    zh: "项目专用经验负载模型",
    purpose: "Reserve a bounded future project-calibrated load model using only new approved data.",
    methodType: "empirical_calibrated",
    approvalStatus: "deferred",
    sourceRefs: [
      "ADR-0002",
      "ADR-0004",
      "ADR-0008",
      "NEW-PROJECT-DATA-REQUIRED",
    ],
  }),
  specification({
    id: "G-01",
    moduleId: "G",
    en: "Batch useful heat",
    zh: "批次工件有用热量",
    purpose: "Integrate useful batch enthalpy rise across temperature and explicit phase/reaction terms.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-TH-01"],
  }),
  specification({
    id: "G-02",
    moduleId: "G",
    en: "Continuous-process useful power",
    zh: "连续工艺有用功率",
    purpose: "Determine useful process power from mass-flow enthalpy rise on an explicit stream boundary.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-TH-01"],
  }),
  specification({
    id: "G-03",
    moduleId: "G",
    en: "Heating time and transient temperature",
    zh: "加热时间/瞬态温度",
    purpose: "Solve a bounded lumped thermal trajectory with explicit absorbed power and heat losses.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-TH-01"],
  }),
  specification({
    id: "G-04",
    moduleId: "G",
    en: "Power boundaries and efficiencies",
    zh: "功率边界与效率",
    purpose: "Keep each named power control-volume boundary and efficiency ratio explicit.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-TH-01"],
  }),
  specification({
    id: "G-05",
    moduleId: "G",
    en: "Required input power",
    zh: "需要的输入功率",
    purpose: "Propagate useful demand, explicit losses and non-overlapping efficiencies to the grid boundary.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-TH-01"],
  }),
  specification({
    id: "G-06",
    moduleId: "G",
    en: "Apparent power and true power factor",
    zh: "视在功率与功率因数",
    purpose: "Determine apparent power and true power factor for an explicit port and phase system.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-AC-02", "PRIMARY-STANDARD-COPY-REQUIRED"],
  }),
  specification({
    id: "G-07",
    moduleId: "G",
    en: "Series RLC resonance",
    zh: "串联谐振",
    purpose: "Evaluate the independent series RLC single-loop topology at a stated loaded design state.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-RLC-01", "PRIMARY-TEXTBOOK-COPY-REQUIRED"],
  }),
  specification({
    id: "G-08",
    moduleId: "G",
    en: "Parallel resonance topology family",
    zh: "并联谐振",
    purpose: "Route only to one of the two independently defined parallel LC network topologies.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-RLC-02", "ADR-0007"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "ADR-0007 requires parallel ideal R/L/C branches and a parallel capacitor with series R-L load to remain independent topology methods.",
  }),
  specification({
    id: "G-09",
    moduleId: "G",
    en: "LLC/multi-resonant topology family",
    zh: "LLC/多谐振拓扑",
    purpose: "Reserve topology-bound LLC analysis; no general LLC method is approved in v1.",
    methodType: null,
    approvalStatus: "deferred",
    sourceRefs: ["LLC-ZJL:PDF24-33", "LLC-ZJL:PDF64-65"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The contract explicitly requires topology-specific analytical or numerical child methods and keeps the parent Deferred.",
  }),
  specification({
    id: "G-10",
    moduleId: "G",
    en: "Ideal matching transformer",
    zh: "匹配变压器",
    purpose: "Transform impedance and RMS port quantities through an ideal lossless transformer.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-Z-02"],
  }),
  specification({
    id: "H-01",
    moduleId: "H",
    en: "Cooling heat-load control volume",
    zh: "冷却热负荷",
    purpose: "Sum only explicit heat sources entering the specified coil coolant circuit.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-HYD-01", "DHT:PDF10-12"],
  }),
  specification({
    id: "H-02",
    moduleId: "H",
    en: "Single-phase coolant flow from enthalpy rise",
    zh: "基础质量/体积流量",
    purpose: "Determine single-phase mass and volume flow from an IAPWS enthalpy difference.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HYD-01", "IAPWS-95", "IAPWS-IF97", "LOCAL-COPY-REQUIRED"],
  }),
  specification({
    id: "H-03",
    moduleId: "H",
    en: "Branch area, velocity and hydraulic diameter",
    zh: "支路、水力面积与速度",
    purpose: "Determine branch velocity and hydraulic diameter from explicit branch flow geometry.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-HYD-01"],
  }),
  specification({
    id: "H-04",
    moduleId: "H",
    en: "Internal-flow heat-transfer correlation family",
    zh: "Reynolds 与内部换热",
    purpose: "Route Reynolds/Prandtl/Nusselt/heat-transfer evaluation to a matching registered correlation.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "GN75:PP8-16",
      "NASA-NTRS-19830022277:S6.1.2.1",
      "OSTI-836896:S3.1.1",
    ],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "Constant-wall-temperature laminar, constant-wall-flux laminar and Gnielinski turbulent correlations require distinct registered child methods.",
  }),
  specification({
    id: "H-05",
    moduleId: "H",
    en: "Pressure loss and parallel network",
    zh: "压降与并联管网",
    purpose: "Solve Darcy pressure components and supported branch-network work points with registered friction methods.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HYD-02", "C39:PP133-156", "NIST-TN2294:REPORT-P23"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The contract requires laminar and Colebrook friction relations to be registered as child methods of the network solve.",
  }),
  specification({
    id: "H-06",
    moduleId: "H",
    en: "Local phase, NPSH and data gates",
    zh: "沸腾、结垢、腐蚀和空化警告",
    purpose: "Report local saturation/NPSH margins and missing OEM or water-quality evidence without safety overclaim.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "ID-HYD-01",
      "ID-HYD-02",
      "IAPWS-IF97:REGION4",
      "HI-961",
      "DHT:PDF11-12",
      "OEM-SPEC-REQUIRED",
    ],
  }),
  specification({
    id: "H-07",
    moduleId: "H",
    en: "Coolant-side energy balance",
    zh: "同控制体水侧能量守恒",
    purpose: "Compare measured coolant enthalpy rise with the same control-volume modeled heat load.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-HYD-01", "ADR-0006", "ADR-0008"],
  }),
  specification({
    id: "J-01",
    moduleId: "J",
    en: "Cylindrical radial conduction family",
    zh: "圆筒径向导热",
    purpose: "Evaluate supported single/multilayer cylindrical conduction with explicit property treatment.",
    methodType: "numerical",
    approvalStatus: "approved",
    sourceRefs: ["ID-HT-01", "GB8175:PDF7:eq7:REJECTED-AS-PRINTED"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The contract reserves the constant-property closed form as a registered child of the numerical variable-property family.",
  }),
  specification({
    id: "J-02",
    moduleId: "J",
    en: "External convection correlation router",
    zh: "外表面对流",
    purpose: "Route external convection only to a correlation matching geometry, orientation and flow state.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: [
      "ID-HT-01",
      "CC75-V:PP1323-1329",
      "CC75-H:PP1049-1053",
      "CB77:PP300-306",
    ],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "Vertical plate natural convection, horizontal cylinder natural convection and cylinder cross-flow are independent correlation methods.",
  }),
  specification({
    id: "J-03",
    moduleId: "J",
    en: "Thermal radiation",
    zh: "辐射",
    purpose: "Evaluate supported large-surroundings or concentric-gray-surface radiation networks.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-RAD-01", "GB8175:PDF14-16:eqA2", "CODATA22"],
  }),
  specification({
    id: "J-04",
    moduleId: "J",
    en: "Linearized surface heat-transfer coefficient",
    zh: "线性化表面换热系数",
    purpose: "Linearize radiation and combine it with convection only on one area and boundary.",
    methodType: "analytical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-RAD-01", "GB8175:PDF14-16:eqA2", "CODATA22"],
  }),
  specification({
    id: "J-05",
    moduleId: "J",
    en: "Coil-to-insulation annulus method family",
    zh: "线圈—保温层同心环隙",
    purpose: "Classify the actual annulus boundary and route only to a matching approved closed-annulus child method.",
    methodType: "engineering_correlation",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-ANN-01", "RH75:PP265-315", "DT69:PP-II198-II207", "ADR-0006"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "Horizontal and vertical closed-annulus correlations are distinct; open, discrete and complex paths remain disabled.",
  }),
  specification({
    id: "J-06",
    moduleId: "J",
    en: "Total steady-state heat loss",
    zh: "总稳态热损",
    purpose: "Sum non-overlapping heat-loss paths on one explicit control volume.",
    methodType: "analytical",
    approvalStatus: "approved",
    sourceRefs: ["ID-HT-01"],
  }),
  specification({
    id: "J-07",
    moduleId: "J",
    en: "Transient heat-loss and Biot screening",
    zh: "瞬态热损",
    purpose: "Evaluate time-dependent heat-loss components and expose the lumped-model screening state.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HT-02", "PRIMARY-TEXTBOOK-COPY-REQUIRED"],
  }),
  specification({
    id: "I-01",
    moduleId: "I",
    en: "Minimum thickness for target surface temperature",
    zh: "目标外表面温度法",
    purpose: "Find and recheck the minimum manufacturable thickness satisfying the surface-temperature target.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HT-01", "GB8175:PDF10:eq24"],
  }),
  specification({
    id: "I-02",
    moduleId: "I",
    en: "Minimum thickness for heat-loss limit",
    zh: "目标允许热损法",
    purpose: "Find all physical roots and the minimum feasible thickness satisfying one explicit heat-loss limit.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HT-01", "GB8175:PDF10:eq20:REJECTED-AS-PRINTED"],
  }),
  specification({
    id: "I-03",
    moduleId: "I",
    en: "Dual target insulation design",
    zh: "双重约束",
    purpose: "Intersect temperature, heat-loss and manufacturing feasible sets and recheck the rounded design.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HT-01", "ADR-0006"],
  }),
  specification({
    id: "I-04",
    moduleId: "I",
    en: "Plane-wall error and critical-radius screening",
    zh: "平壁近似与临界绝热半径",
    purpose: "Screen cylindrical-versus-plane resistance and critical-radius behavior without replacing full design solves.",
    methodType: "numerical",
    approvalStatus: "approved_with_limitation",
    sourceRefs: ["ID-HT-01"],
    requiresSubmethodSplit: true,
    submethodSplitBasis:
      "The fixed-h closed-form screen is explicitly a child method of the broader nonlinear numerical screening family.",
  }),
]);

export const METHOD_SPECIFICATION_REGISTRY = new MethodSpecificationRegistry(
  METHOD_SPECIFICATIONS,
);
