import { TECHNICAL_FREEZE_ID } from "../config/versions.js";
import {
  deepFreeze,
  normalizeJson,
  type JsonValue,
} from "../serialization/canonical-json.js";

export const FEM_REFERENCE_MANIFEST_SCHEMA_VERSION = "1.0.0" as const;
export const FEM_REFERENCE_PROVENANCE =
  "fem_or_experiment_reference" as const;
export const FEM_REFERENCE_INFLUENCE_POLICY =
  "read_only_reference_no_model_mutation" as const;

export type FemSolverFamily =
  | "ansys_maxwell"
  | "ansys_thermal"
  | "comsol";
export type FemAnalysisType =
  | "electromagnetic"
  | "thermal"
  | "coupled_electromagnetic_thermal";
export type FemModelDimension = "2d_axisymmetric" | "2d_planar" | "3d";
export type AllowedFemFieldQuantity =
  | "temperature"
  | "magnetic_flux_density"
  | "current_density"
  | "volumetric_heat_generation";

export interface FemHashReference {
  readonly artifactId: string;
  readonly sha256: string;
}

export interface ExternalFemReferenceManifest {
  readonly kind: "ih_ec_external_fem_reference_manifest";
  readonly schemaVersion: typeof FEM_REFERENCE_MANIFEST_SCHEMA_VERSION;
  readonly referenceId: string;
  readonly createdAt: string;
  readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  readonly provenance: typeof FEM_REFERENCE_PROVENANCE;
  readonly geometrySnapshotId: string;
  readonly solver: {
    readonly family: FemSolverFamily;
    readonly name: string;
    readonly version: string;
    readonly adapterId:
      | "ansys_maxwell_export.v1"
      | "ansys_thermal_export.v1"
      | "comsol_export.v1";
    readonly exportFormatVersion: "1";
    readonly analysisType: FemAnalysisType;
    readonly modelDimension: FemModelDimension;
  };
  readonly coordinates: {
    readonly coordinateSystemId: string;
    readonly handedness: "right_handed";
    readonly lengthUnit: "m" | "mm" | "cm";
    readonly axisDirections: {
      readonly x: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
      readonly y: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
      readonly z: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
    };
    /** Row-major affine transform from exported coordinates to project SI. */
    readonly transformToProjectSi: readonly [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
  };
  readonly artifacts: {
    readonly geometry: FemHashReference;
    readonly mesh: FemHashReference;
    readonly materials: FemHashReference;
    readonly boundaries: FemHashReference;
    readonly sources: FemHashReference;
  };
  readonly study: {
    readonly operatingBasis: {
      readonly frequencyHz: number | null;
      readonly timeS: number | null;
      readonly phasorConvention: "rms" | "peak" | "not_applicable";
      readonly complexRepresentation:
        | "real_imaginary"
        | "magnitude_phase"
        | "not_applicable";
    };
    readonly mesh: {
      readonly nodeCount: number;
      readonly elementCount: number;
      readonly polynomialOrder: number;
      readonly refinementLevels: readonly [
        FemMeshRefinementLevel,
        FemMeshRefinementLevel,
        FemMeshRefinementLevel,
        ...FemMeshRefinementLevel[],
      ];
    };
    readonly convergence: {
      readonly metricId: string;
      readonly toleranceFraction: number;
      readonly observedFraction: number;
      readonly achieved: boolean;
      readonly nonlinearIterationCount: number;
      readonly nonlinearResidual: number;
    };
    readonly energyBalance: {
      readonly inputPowerW: number;
      readonly dissipatedPowerW: number;
      readonly boundaryFluxPowerW: number;
      readonly relativeResidual: number;
      readonly toleranceFraction: number;
      readonly achieved: boolean;
    };
  };
  readonly fields: readonly [FemFieldReference, ...FemFieldReference[]];
  readonly validation: {
    readonly status:
      | "reference_only"
      | "experimentally_anchored"
      | "rejected";
    readonly overlapDatasetIds: readonly string[];
    readonly reviewedBy: string;
    readonly reviewedAt: string;
    readonly uncertainty:
      | {
          readonly kind: "unknown";
          readonly reason: string;
        }
      | {
          readonly kind: "relative";
          readonly fraction: number;
          readonly coverageFactor: number | null;
          readonly basis: string;
        };
  };
  readonly limitations: readonly string[];
}

export interface FemMeshRefinementLevel {
  readonly levelId: string;
  readonly elementCount: number;
  readonly characteristicSizeM: number;
  readonly targetMetricValue: number;
  readonly relativeChangeFromPrevious: number | null;
}

export interface FemFieldReference {
  readonly fieldId: string;
  readonly quantity: AllowedFemFieldQuantity;
  readonly unit: "K" | "degC" | "T" | "A_per_m2" | "W_per_m3";
  readonly location: "node" | "cell" | "face";
  readonly representation:
    | "real_scalar"
    | "real_vector_xyz"
    | "complex_scalar_real_imaginary"
    | "complex_vector_xyz_real_imaginary";
  readonly dataArtifact: FemHashReference;
  readonly timeCoordinatesS: readonly number[];
}

export type FemManifestFailureCode =
  | "invalid_json"
  | "invalid_manifest"
  | "unsupported_schema"
  | "unsupported_solver"
  | "incompatible_geometry"
  | "artifact_hash_mismatch"
  | "quality_gate_failed";

export type FemManifestParseResult =
  | {
      readonly status: "success";
      readonly manifest: ExternalFemReferenceManifest;
    }
  | {
      readonly status: "failed";
      readonly code: FemManifestFailureCode;
      readonly message: string;
      readonly path: string;
    };

type FemManifestFailure = Extract<
  FemManifestParseResult,
  { readonly status: "failed" }
>;

export interface FemReferencePackageEvidence {
  readonly expectedGeometrySnapshotId: string;
  readonly artifactHashes: Readonly<Record<string, string>>;
}

export type FemReferenceAdmissionResult =
  | {
      readonly status: "admitted";
      readonly reference: {
        readonly manifest: ExternalFemReferenceManifest;
        readonly provenance: typeof FEM_REFERENCE_PROVENANCE;
        readonly influencePolicy: typeof FEM_REFERENCE_INFLUENCE_POLICY;
        readonly displayLabelZh: "外部 FEM 只读参考";
        readonly displayLabelEn: "External FEM read-only reference";
      };
    }
  | Extract<FemManifestParseResult, { readonly status: "failed" }>;

type MutableRecord = Record<string, unknown>;

interface ManifestValidationDetails {
  readonly code: FemManifestFailureCode;
  readonly path: string;
  readonly message: string;
}

const MANIFEST_VALIDATION_DETAILS = new WeakMap<
  object,
  ManifestValidationDetails
>();

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;
const GEOMETRY_SNAPSHOT_PATTERN = /^geometry:[0-9a-f]{64}$/u;
const ANSYS_VERSION_PATTERN = /^20\d{2} R[12]$/u;
const COMSOL_VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?$/u;
const AXIS_DIRECTION_PATTERN = /^[+-][xyz]$/u;
const FIELD_UNITS: Readonly<Record<AllowedFemFieldQuantity, readonly string[]>> =
  Object.freeze({
    temperature: Object.freeze(["K", "degC"]),
    magnetic_flux_density: Object.freeze(["T"]),
    current_density: Object.freeze(["A_per_m2"]),
    volumetric_heat_generation: Object.freeze(["W_per_m3"]),
  });

class ManifestValidationError extends TypeError {
  public constructor(
    public readonly code: FemManifestFailureCode,
    public readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ManifestValidationError";
    MANIFEST_VALIDATION_DETAILS.set(this, { code, path, message });
  }
}

function fail(
  code: FemManifestFailureCode,
  path: string,
  message: string,
): FemManifestFailure {
  return deepFreeze({ status: "failed" as const, code, path, message });
}

function failureFromUnknown(
  error: unknown,
  fallbackPath: string,
  fallbackMessage: string,
): FemManifestFailure {
  if (typeof error === "object" && error !== null) {
    const details = MANIFEST_VALIDATION_DETAILS.get(error);
    if (details !== undefined) {
      return fail(details.code, details.path, details.message);
    }
  }
  return fail("invalid_manifest", fallbackPath, fallbackMessage);
}

function record(value: unknown, path: string): MutableRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是对象。`,
    );
  }
  return value as MutableRecord;
}

function exactKeys(
  value: MutableRecord,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const controlled = [...expected].sort();
  if (
    actual.length !== controlled.length ||
    actual.some((key, index) => key !== controlled[index])
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 字段不符合受控 schema。`,
    );
  }
}

function nonBlank(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是非空字符串。`,
    );
  }
  return value;
}

function stableId(value: unknown, path: string): string {
  const id = nonBlank(value, path);
  if (!STABLE_ID_PATTERN.test(id)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 不是稳定机器标识。`,
    );
  }
  return id;
}

function isoTimestamp(value: unknown, path: string): string {
  const timestamp = nonBlank(value, path);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== timestamp) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是规范 ISO-8601 UTC 时间。`,
    );
  }
  return timestamp;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是有限数值。`,
    );
  }
  return value;
}

function positiveNumber(value: unknown, path: string): number {
  const candidate = finiteNumber(value, path);
  if (candidate <= 0) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须大于零。`,
    );
  }
  return candidate;
}

function nonNegativeNumber(value: unknown, path: string): number {
  const candidate = finiteNumber(value, path);
  if (candidate < 0) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 不得小于零。`,
    );
  }
  return candidate;
}

function positiveInteger(value: unknown, path: string): number {
  const candidate = positiveNumber(value, path);
  if (!Number.isSafeInteger(candidate)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是正安全整数。`,
    );
  }
  return candidate;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是布尔值。`,
    );
  }
  return value;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 不是允许值。`,
    );
  }
  return value as T;
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      path,
      `${path} 必须是字符串数组。`,
    );
  }
  return value.map((entry, index) => nonBlank(entry, `${path}[${String(index)}]`));
}

function hashReference(value: unknown, path: string): FemHashReference {
  const candidate = record(value, path);
  exactKeys(candidate, ["artifactId", "sha256"], path);
  const sha256 = nonBlank(candidate.sha256, `${path}.sha256`);
  if (!SHA256_PATTERN.test(sha256)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      `${path}.sha256`,
      `${path}.sha256 必须是 64 位小写 SHA-256。`,
    );
  }
  return {
    artifactId: stableId(candidate.artifactId, `${path}.artifactId`),
    sha256,
  };
}

function parseSolver(value: unknown): ExternalFemReferenceManifest["solver"] {
  const candidate = record(value, "$.solver");
  exactKeys(
    candidate,
    [
      "family",
      "name",
      "version",
      "adapterId",
      "exportFormatVersion",
      "analysisType",
      "modelDimension",
    ],
    "$.solver",
  );
  const family = oneOf(
    candidate.family,
    ["ansys_maxwell", "ansys_thermal", "comsol"] as const,
    "$.solver.family",
  );
  const name = nonBlank(candidate.name, "$.solver.name");
  const version = nonBlank(candidate.version, "$.solver.version");
  const adapterId = oneOf(
    candidate.adapterId,
    [
      "ansys_maxwell_export.v1",
      "ansys_thermal_export.v1",
      "comsol_export.v1",
    ] as const,
    "$.solver.adapterId",
  );
  const expected = {
    ansys_maxwell: {
      name: "ANSYS Maxwell",
      adapterId: "ansys_maxwell_export.v1",
      versionPattern: ANSYS_VERSION_PATTERN,
      analyses: ["electromagnetic"] as const,
    },
    ansys_thermal: {
      name: "ANSYS Thermal",
      adapterId: "ansys_thermal_export.v1",
      versionPattern: ANSYS_VERSION_PATTERN,
      analyses: ["thermal"] as const,
    },
    comsol: {
      name: "COMSOL Multiphysics",
      adapterId: "comsol_export.v1",
      versionPattern: COMSOL_VERSION_PATTERN,
      analyses: [
        "electromagnetic",
        "thermal",
        "coupled_electromagnetic_thermal",
      ] as const,
    },
  }[family];
  const analysisType = oneOf(
    candidate.analysisType,
    [
      "electromagnetic",
      "thermal",
      "coupled_electromagnetic_thermal",
    ] as const,
    "$.solver.analysisType",
  );
  if (
    name !== expected.name ||
    adapterId !== expected.adapterId ||
    !expected.versionPattern.test(version) ||
    !(expected.analyses as readonly string[]).includes(analysisType)
  ) {
    throw new ManifestValidationError(
      "unsupported_solver",
      "$.solver",
      "求解器名称、版本、适配器或分析类型组合不受当前只读导入器支持。",
    );
  }
  return {
    family,
    name,
    version,
    adapterId,
    exportFormatVersion: oneOf(
      candidate.exportFormatVersion,
      ["1"] as const,
      "$.solver.exportFormatVersion",
    ),
    analysisType,
    modelDimension: oneOf(
      candidate.modelDimension,
      ["2d_axisymmetric", "2d_planar", "3d"] as const,
      "$.solver.modelDimension",
    ),
  };
}

function parseCoordinates(
  value: unknown,
): ExternalFemReferenceManifest["coordinates"] {
  const candidate = record(value, "$.coordinates");
  exactKeys(
    candidate,
    [
      "coordinateSystemId",
      "handedness",
      "lengthUnit",
      "axisDirections",
      "transformToProjectSi",
    ],
    "$.coordinates",
  );
  if (candidate.handedness !== "right_handed") {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.coordinates.handedness",
      "当前导入边界仅接受显式右手坐标系。",
    );
  }
  const axesRecord = record(candidate.axisDirections, "$.coordinates.axisDirections");
  exactKeys(axesRecord, ["x", "y", "z"], "$.coordinates.axisDirections");
  const directions = [axesRecord.x, axesRecord.y, axesRecord.z].map(
    (direction, index) => {
      const text = nonBlank(
        direction,
        `$.coordinates.axisDirections.${["x", "y", "z"][index]!}`,
      );
      if (!AXIS_DIRECTION_PATTERN.test(text)) {
        throw new ManifestValidationError(
          "invalid_manifest",
          "$.coordinates.axisDirections",
          "坐标轴方向必须采用 +x/-x/+y/-y/+z/-z。",
        );
      }
      return text as "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
    },
  );
  if (new Set(directions.map((axis) => axis.slice(1))).size !== 3) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.coordinates.axisDirections",
      "三个导出坐标轴必须分别映射到三个不同的项目坐标轴。",
    );
  }
  const lengthUnit = oneOf(
    candidate.lengthUnit,
    ["m", "mm", "cm"] as const,
    "$.coordinates.lengthUnit",
  );
  if (
    !Array.isArray(candidate.transformToProjectSi) ||
    candidate.transformToProjectSi.length !== 16
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.coordinates.transformToProjectSi",
      "坐标变换必须是 16 个有限数值组成的 4x4 行主序矩阵。",
    );
  }
  const transform = candidate.transformToProjectSi.map((entry, index) =>
    finiteNumber(entry, `$.coordinates.transformToProjectSi[${String(index)}]`),
  );
  if (
    transform[12] !== 0 ||
    transform[13] !== 0 ||
    transform[14] !== 0 ||
    transform[15] !== 1
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.coordinates.transformToProjectSi",
      "坐标变换必须是仿射齐次矩阵，末行固定为 [0,0,0,1]。",
    );
  }
  const determinant =
    transform[0]! * (transform[5]! * transform[10]! - transform[6]! * transform[9]!) -
    transform[1]! * (transform[4]! * transform[10]! - transform[6]! * transform[8]!) +
    transform[2]! * (transform[4]! * transform[9]! - transform[5]! * transform[8]!);
  if (!Number.isFinite(determinant) || determinant <= Number.EPSILON) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.coordinates.transformToProjectSi",
      "坐标变换的空间部分必须可逆且保持右手方向。",
    );
  }
  const unitScale = { m: 1, mm: 0.001, cm: 0.01 }[lengthUnit];
  const projectAxisIndex = { x: 0, y: 1, z: 2 } as const;
  for (let exportedAxis = 0; exportedAxis < 3; exportedAxis += 1) {
    const direction = directions[exportedAxis]!;
    const expectedProjectAxis = projectAxisIndex[
      direction.slice(1) as keyof typeof projectAxisIndex
    ];
    const expectedSign = direction.startsWith("-") ? -1 : 1;
    for (let projectAxis = 0; projectAxis < 3; projectAxis += 1) {
      const actual = transform[projectAxis * 4 + exportedAxis]!;
      const expected =
        projectAxis === expectedProjectAxis ? expectedSign * unitScale : 0;
      if (Math.abs(actual - expected) > Math.max(1e-12, unitScale * 1e-9)) {
        throw new ManifestValidationError(
          "invalid_manifest",
          "$.coordinates.transformToProjectSi",
          "坐标变换的轴向、符号或长度缩放与声明的坐标轴和单位不一致。",
        );
      }
    }
  }
  return {
    coordinateSystemId: stableId(
      candidate.coordinateSystemId,
      "$.coordinates.coordinateSystemId",
    ),
    handedness: "right_handed",
    lengthUnit,
    axisDirections: {
      x: directions[0]!,
      y: directions[1]!,
      z: directions[2]!,
    },
    transformToProjectSi: transform as unknown as ExternalFemReferenceManifest["coordinates"]["transformToProjectSi"],
  };
}

function parseRefinementLevels(value: unknown): readonly [
  FemMeshRefinementLevel,
  FemMeshRefinementLevel,
  FemMeshRefinementLevel,
  ...FemMeshRefinementLevel[],
] {
  if (!Array.isArray(value) || value.length < 3) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.study.mesh.refinementLevels",
      "网格加密记录至少需要粗、中、细三档。",
    );
  }
  const levels = value.map((entry, index): FemMeshRefinementLevel => {
    const path = `$.study.mesh.refinementLevels[${String(index)}]`;
    const candidate = record(entry, path);
    exactKeys(
      candidate,
      [
        "levelId",
        "elementCount",
        "characteristicSizeM",
        "targetMetricValue",
        "relativeChangeFromPrevious",
      ],
      path,
    );
    const relative = candidate.relativeChangeFromPrevious;
    if ((index === 0 && relative !== null) || (index > 0 && relative === null)) {
      throw new ManifestValidationError(
        "invalid_manifest",
        `${path}.relativeChangeFromPrevious`,
        "首档网格的相对变化必须为 null，后续档必须提供非负有限值。",
      );
    }
    return {
      levelId: stableId(candidate.levelId, `${path}.levelId`),
      elementCount: positiveInteger(candidate.elementCount, `${path}.elementCount`),
      characteristicSizeM: positiveNumber(
        candidate.characteristicSizeM,
        `${path}.characteristicSizeM`,
      ),
      targetMetricValue: finiteNumber(
        candidate.targetMetricValue,
        `${path}.targetMetricValue`,
      ),
      relativeChangeFromPrevious:
        relative === null
          ? null
          : nonNegativeNumber(relative, `${path}.relativeChangeFromPrevious`),
    };
  });
  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1]!;
    const current = levels[index]!;
    if (
      current.elementCount <= previous.elementCount ||
      current.characteristicSizeM >= previous.characteristicSizeM
    ) {
      throw new ManifestValidationError(
        "invalid_manifest",
        `$.study.mesh.refinementLevels[${String(index)}]`,
        "网格加密档必须增加单元数并减小特征尺寸。",
      );
    }
  }
  return levels as [
    FemMeshRefinementLevel,
    FemMeshRefinementLevel,
    FemMeshRefinementLevel,
    ...FemMeshRefinementLevel[],
  ];
}

function parseStudy(
  value: unknown,
  solver: ExternalFemReferenceManifest["solver"],
): ExternalFemReferenceManifest["study"] {
  const candidate = record(value, "$.study");
  exactKeys(
    candidate,
    ["operatingBasis", "mesh", "convergence", "energyBalance"],
    "$.study",
  );
  const basisRecord = record(candidate.operatingBasis, "$.study.operatingBasis");
  exactKeys(
    basisRecord,
    ["frequencyHz", "timeS", "phasorConvention", "complexRepresentation"],
    "$.study.operatingBasis",
  );
  const frequencyHz =
    basisRecord.frequencyHz === null
      ? null
      : positiveNumber(basisRecord.frequencyHz, "$.study.operatingBasis.frequencyHz");
  const timeS =
    basisRecord.timeS === null
      ? null
      : nonNegativeNumber(basisRecord.timeS, "$.study.operatingBasis.timeS");
  const phasorConvention = oneOf(
    basisRecord.phasorConvention,
    ["rms", "peak", "not_applicable"] as const,
    "$.study.operatingBasis.phasorConvention",
  );
  const complexRepresentation = oneOf(
    basisRecord.complexRepresentation,
    ["real_imaginary", "magnitude_phase", "not_applicable"] as const,
    "$.study.operatingBasis.complexRepresentation",
  );
  const electromagnetic =
    solver.analysisType === "electromagnetic" ||
    solver.analysisType === "coupled_electromagnetic_thermal";
  if (
    electromagnetic &&
    (frequencyHz === null ||
      phasorConvention === "not_applicable" ||
      complexRepresentation === "not_applicable")
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.study.operatingBasis",
      "电磁或耦合研究必须声明正频率、相量基准和复数表示。",
    );
  }

  const meshRecord = record(candidate.mesh, "$.study.mesh");
  exactKeys(
    meshRecord,
    ["nodeCount", "elementCount", "polynomialOrder", "refinementLevels"],
    "$.study.mesh",
  );
  const refinementLevels = parseRefinementLevels(meshRecord.refinementLevels);
  const elementCount = positiveInteger(meshRecord.elementCount, "$.study.mesh.elementCount");
  if (elementCount !== refinementLevels.at(-1)!.elementCount) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.study.mesh.elementCount",
      "最终网格单元数必须等于最后一档加密记录。",
    );
  }

  const convergenceRecord = record(candidate.convergence, "$.study.convergence");
  exactKeys(
    convergenceRecord,
    [
      "metricId",
      "toleranceFraction",
      "observedFraction",
      "achieved",
      "nonlinearIterationCount",
      "nonlinearResidual",
    ],
    "$.study.convergence",
  );
  const toleranceFraction = positiveNumber(
    convergenceRecord.toleranceFraction,
    "$.study.convergence.toleranceFraction",
  );
  const observedFraction = nonNegativeNumber(
    convergenceRecord.observedFraction,
    "$.study.convergence.observedFraction",
  );
  const convergenceAchieved = booleanValue(
    convergenceRecord.achieved,
    "$.study.convergence.achieved",
  );
  if (convergenceAchieved !== (observedFraction <= toleranceFraction)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.study.convergence.achieved",
      "收敛状态与声明的观测变化和容差不一致。",
    );
  }

  const energyRecord = record(candidate.energyBalance, "$.study.energyBalance");
  exactKeys(
    energyRecord,
    [
      "inputPowerW",
      "dissipatedPowerW",
      "boundaryFluxPowerW",
      "relativeResidual",
      "toleranceFraction",
      "achieved",
    ],
    "$.study.energyBalance",
  );
  const energyResidual = finiteNumber(
    energyRecord.relativeResidual,
    "$.study.energyBalance.relativeResidual",
  );
  const energyTolerance = positiveNumber(
    energyRecord.toleranceFraction,
    "$.study.energyBalance.toleranceFraction",
  );
  const energyAchieved = booleanValue(
    energyRecord.achieved,
    "$.study.energyBalance.achieved",
  );
  if (energyAchieved !== (Math.abs(energyResidual) <= energyTolerance)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.study.energyBalance.achieved",
      "能量闭合状态与声明的相对残差和容差不一致。",
    );
  }

  return {
    operatingBasis: {
      frequencyHz,
      timeS,
      phasorConvention,
      complexRepresentation,
    },
    mesh: {
      nodeCount: positiveInteger(meshRecord.nodeCount, "$.study.mesh.nodeCount"),
      elementCount,
      polynomialOrder: positiveInteger(
        meshRecord.polynomialOrder,
        "$.study.mesh.polynomialOrder",
      ),
      refinementLevels,
    },
    convergence: {
      metricId: stableId(convergenceRecord.metricId, "$.study.convergence.metricId"),
      toleranceFraction,
      observedFraction,
      achieved: convergenceAchieved,
      nonlinearIterationCount: nonNegativeNumber(
        convergenceRecord.nonlinearIterationCount,
        "$.study.convergence.nonlinearIterationCount",
      ),
      nonlinearResidual: nonNegativeNumber(
        convergenceRecord.nonlinearResidual,
        "$.study.convergence.nonlinearResidual",
      ),
    },
    energyBalance: {
      inputPowerW: nonNegativeNumber(
        energyRecord.inputPowerW,
        "$.study.energyBalance.inputPowerW",
      ),
      dissipatedPowerW: nonNegativeNumber(
        energyRecord.dissipatedPowerW,
        "$.study.energyBalance.dissipatedPowerW",
      ),
      boundaryFluxPowerW: finiteNumber(
        energyRecord.boundaryFluxPowerW,
        "$.study.energyBalance.boundaryFluxPowerW",
      ),
      relativeResidual: energyResidual,
      toleranceFraction: energyTolerance,
      achieved: energyAchieved,
    },
  };
}

function parseFields(value: unknown): readonly [FemFieldReference, ...FemFieldReference[]] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.fields",
      "外部参考至少需要一个受控字段。",
    );
  }
  const seen = new Set<string>();
  const fields = value.map((entry, index): FemFieldReference => {
    const path = `$.fields[${String(index)}]`;
    const candidate = record(entry, path);
    exactKeys(
      candidate,
      [
        "fieldId",
        "quantity",
        "unit",
        "location",
        "representation",
        "dataArtifact",
        "timeCoordinatesS",
      ],
      path,
    );
    const fieldId = stableId(candidate.fieldId, `${path}.fieldId`);
    if (seen.has(fieldId)) {
      throw new ManifestValidationError(
        "invalid_manifest",
        `${path}.fieldId`,
        "字段标识不得重复。",
      );
    }
    seen.add(fieldId);
    const quantity = oneOf(
      candidate.quantity,
      [
        "temperature",
        "magnetic_flux_density",
        "current_density",
        "volumetric_heat_generation",
      ] as const,
      `${path}.quantity`,
    );
    const unit = oneOf(
      candidate.unit,
      ["K", "degC", "T", "A_per_m2", "W_per_m3"] as const,
      `${path}.unit`,
    );
    if (!FIELD_UNITS[quantity].includes(unit)) {
      throw new ManifestValidationError(
        "invalid_manifest",
        `${path}.unit`,
        "字段单位与受控物理量不匹配。",
      );
    }
    if (!Array.isArray(candidate.timeCoordinatesS)) {
      throw new ManifestValidationError(
        "invalid_manifest",
        `${path}.timeCoordinatesS`,
        "时间坐标必须是有限非负数数组；稳态字段使用空数组。",
      );
    }
    const times = candidate.timeCoordinatesS.map((time, timeIndex) =>
      nonNegativeNumber(time, `${path}.timeCoordinatesS[${String(timeIndex)}]`),
    );
    for (let timeIndex = 1; timeIndex < times.length; timeIndex += 1) {
      if (times[timeIndex]! <= times[timeIndex - 1]!) {
        throw new ManifestValidationError(
          "invalid_manifest",
          `${path}.timeCoordinatesS`,
          "时间坐标必须严格递增。",
        );
      }
    }
    return {
      fieldId,
      quantity,
      unit,
      location: oneOf(
        candidate.location,
        ["node", "cell", "face"] as const,
        `${path}.location`,
      ),
      representation: oneOf(
        candidate.representation,
        [
          "real_scalar",
          "real_vector_xyz",
          "complex_scalar_real_imaginary",
          "complex_vector_xyz_real_imaginary",
        ] as const,
        `${path}.representation`,
      ),
      dataArtifact: hashReference(candidate.dataArtifact, `${path}.dataArtifact`),
      timeCoordinatesS: times,
    };
  });
  return fields as [FemFieldReference, ...FemFieldReference[]];
}

function parseValidation(
  value: unknown,
): ExternalFemReferenceManifest["validation"] {
  const candidate = record(value, "$.validation");
  exactKeys(
    candidate,
    ["status", "overlapDatasetIds", "reviewedBy", "reviewedAt", "uncertainty"],
    "$.validation",
  );
  const status = oneOf(
    candidate.status,
    ["reference_only", "experimentally_anchored", "rejected"] as const,
    "$.validation.status",
  );
  const overlapDatasetIds = stringArray(
    candidate.overlapDatasetIds,
    "$.validation.overlapDatasetIds",
  );
  const uncertaintyRecord = record(candidate.uncertainty, "$.validation.uncertainty");
  const uncertaintyKind = oneOf(
    uncertaintyRecord.kind,
    ["unknown", "relative"] as const,
    "$.validation.uncertainty.kind",
  );
  const uncertainty =
    uncertaintyKind === "unknown"
      ? (() => {
          exactKeys(uncertaintyRecord, ["kind", "reason"], "$.validation.uncertainty");
          return {
            kind: "unknown" as const,
            reason: nonBlank(
              uncertaintyRecord.reason,
              "$.validation.uncertainty.reason",
            ),
          };
        })()
      : (() => {
          exactKeys(
            uncertaintyRecord,
            ["kind", "fraction", "coverageFactor", "basis"],
            "$.validation.uncertainty",
          );
          const coverage = uncertaintyRecord.coverageFactor;
          return {
            kind: "relative" as const,
            fraction: nonNegativeNumber(
              uncertaintyRecord.fraction,
              "$.validation.uncertainty.fraction",
            ),
            coverageFactor:
              coverage === null
                ? null
                : positiveNumber(
                    coverage,
                    "$.validation.uncertainty.coverageFactor",
                  ),
            basis: nonBlank(
              uncertaintyRecord.basis,
              "$.validation.uncertainty.basis",
            ),
          };
        })();
  if (
    status === "experimentally_anchored" &&
    (overlapDatasetIds.length === 0 || uncertainty.kind === "unknown")
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.validation",
      "声称实验锚定时必须提供重叠数据集和数值不确定度。",
    );
  }
  return {
    status,
    overlapDatasetIds,
    reviewedBy: nonBlank(candidate.reviewedBy, "$.validation.reviewedBy"),
    reviewedAt: isoTimestamp(candidate.reviewedAt, "$.validation.reviewedAt"),
    uncertainty,
  };
}

function normalizeManifest(value: JsonValue): ExternalFemReferenceManifest {
  const candidate = record(value, "$");
  exactKeys(
    candidate,
    [
      "kind",
      "schemaVersion",
      "referenceId",
      "createdAt",
      "technicalFreezeId",
      "provenance",
      "geometrySnapshotId",
      "solver",
      "coordinates",
      "artifacts",
      "study",
      "fields",
      "validation",
      "limitations",
    ],
    "$",
  );
  if (candidate.kind !== "ih_ec_external_fem_reference_manifest") {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.kind",
      "不是受控外部 FEM 参考清单。",
    );
  }
  if (candidate.schemaVersion !== FEM_REFERENCE_MANIFEST_SCHEMA_VERSION) {
    throw new ManifestValidationError(
      "unsupported_schema",
      "$.schemaVersion",
      "外部 FEM 参考清单 schema 版本不受支持。",
    );
  }
  if (candidate.technicalFreezeId !== TECHNICAL_FREEZE_ID) {
    throw new ManifestValidationError(
      "unsupported_schema",
      "$.technicalFreezeId",
      "外部 FEM 参考清单的技术冻结版本与当前项目不兼容。",
    );
  }
  if (candidate.provenance !== FEM_REFERENCE_PROVENANCE) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.provenance",
      "外部 FEM 数据必须明确标记为只读参考来源。",
    );
  }
  const geometrySnapshotId = nonBlank(
    candidate.geometrySnapshotId,
    "$.geometrySnapshotId",
  );
  if (!GEOMETRY_SNAPSHOT_PATTERN.test(geometrySnapshotId)) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.geometrySnapshotId",
      "geometrySnapshotId 必须是内容寻址的几何快照标识。",
    );
  }
  const solver = parseSolver(candidate.solver);
  const artifactRecord = record(candidate.artifacts, "$.artifacts");
  exactKeys(
    artifactRecord,
    ["geometry", "mesh", "materials", "boundaries", "sources"],
    "$.artifacts",
  );
  const artifacts = {
    geometry: hashReference(artifactRecord.geometry, "$.artifacts.geometry"),
    mesh: hashReference(artifactRecord.mesh, "$.artifacts.mesh"),
    materials: hashReference(artifactRecord.materials, "$.artifacts.materials"),
    boundaries: hashReference(artifactRecord.boundaries, "$.artifacts.boundaries"),
    sources: hashReference(artifactRecord.sources, "$.artifacts.sources"),
  };
  const artifactIds = Object.values(artifacts).map((artifact) => artifact.artifactId);
  if (new Set(artifactIds).size !== artifactIds.length) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.artifacts",
      "几何、网格、材料、边界与激励文件必须使用不同的 artifactId。",
    );
  }
  const fields = parseFields(candidate.fields);
  if (
    solver.analysisType === "thermal" &&
    fields.some(
      (field) =>
        field.quantity !== "temperature" &&
        field.quantity !== "volumetric_heat_generation",
    )
  ) {
    throw new ManifestValidationError(
      "invalid_manifest",
      "$.fields",
      "纯热分析不得声明磁通密度或电流密度字段。",
    );
  }

  return {
    kind: "ih_ec_external_fem_reference_manifest",
    schemaVersion: FEM_REFERENCE_MANIFEST_SCHEMA_VERSION,
    referenceId: stableId(candidate.referenceId, "$.referenceId"),
    createdAt: isoTimestamp(candidate.createdAt, "$.createdAt"),
    technicalFreezeId: TECHNICAL_FREEZE_ID,
    provenance: FEM_REFERENCE_PROVENANCE,
    geometrySnapshotId,
    solver,
    coordinates: parseCoordinates(candidate.coordinates),
    artifacts,
    study: parseStudy(candidate.study, solver),
    fields,
    validation: parseValidation(candidate.validation),
    limitations: stringArray(candidate.limitations, "$.limitations"),
  };
}

/** Strict structure/version parser. This never reads field values or mutates a Case. */
export function parseExternalFemReferenceManifest(
  input: string | unknown,
): FemManifestParseResult {
  let candidate: unknown = input;
  if (typeof input === "string") {
    try {
      candidate = JSON.parse(input) as unknown;
    } catch {
      return fail("invalid_json", "$", "外部 FEM 参考清单不是有效 JSON。");
    }
  }
  try {
    const normalized = normalizeJson(candidate);
    return deepFreeze({
      status: "success" as const,
      manifest: normalizeManifest(normalized),
    });
  } catch (error) {
    return failureFromUnknown(error, "$", "外部 FEM 参考清单无效。");
  }
}

type FemEvidenceParseResult =
  | {
      readonly status: "success";
      readonly evidence: FemReferencePackageEvidence;
    }
  | FemManifestFailure;

function parsePackageEvidence(value: unknown): FemEvidenceParseResult {
  try {
    const normalized = normalizeJson(value);
    const candidate = record(normalized, "$.evidence");
    exactKeys(
      candidate,
      ["expectedGeometrySnapshotId", "artifactHashes"],
      "$.evidence",
    );
    const expectedGeometrySnapshotId = nonBlank(
      candidate.expectedGeometrySnapshotId,
      "$.evidence.expectedGeometrySnapshotId",
    );
    if (!GEOMETRY_SNAPSHOT_PATTERN.test(expectedGeometrySnapshotId)) {
      throw new ManifestValidationError(
        "invalid_manifest",
        "$.evidence.expectedGeometrySnapshotId",
        "外部 FEM 接纳证据必须绑定规范的几何快照标识。",
      );
    }
    const hashRecord = record(
      candidate.artifactHashes,
      "$.evidence.artifactHashes",
    );
    const artifactHashes: Record<string, string> = {};
    for (const [artifactId, hashValue] of Object.entries(hashRecord)) {
      stableId(artifactId, "$.evidence.artifactHashes key");
      const hash = nonBlank(
        hashValue,
        `$.evidence.artifactHashes.${artifactId}`,
      );
      if (!SHA256_PATTERN.test(hash)) {
        throw new ManifestValidationError(
          "invalid_manifest",
          `$.evidence.artifactHashes.${artifactId}`,
          "外部 FEM 文件证据必须是 64 位小写 SHA-256。",
        );
      }
      artifactHashes[artifactId] = hash;
    }
    return deepFreeze({
      status: "success" as const,
      evidence: {
        expectedGeometrySnapshotId,
        artifactHashes,
      },
    });
  } catch (error) {
    return failureFromUnknown(
      error,
      "$.evidence",
      "外部 FEM 接纳证据无效。",
    );
  }
}

/**
 * Admits a reference only after geometry binding and every declared artifact
 * hash have been checked by the caller's file-reading boundary.
 */
export function admitExternalFemReferencePackage(
  input: string | unknown,
  evidenceInput: unknown,
): FemReferenceAdmissionResult {
  const parsed = parseExternalFemReferenceManifest(input);
  if (parsed.status === "failed") {
    return parsed;
  }
  const parsedEvidence = parsePackageEvidence(evidenceInput);
  if (parsedEvidence.status === "failed") {
    return parsedEvidence;
  }
  const evidence = parsedEvidence.evidence;
  if (
    parsed.manifest.geometrySnapshotId !== evidence.expectedGeometrySnapshotId
  ) {
    return fail(
      "incompatible_geometry",
      "$.geometrySnapshotId",
      "外部 FEM 参考与当前不可变几何快照不一致，已拒绝接纳。",
    );
  }
  if (
    parsed.manifest.validation.status === "rejected" ||
    !parsed.manifest.study.convergence.achieved ||
    !parsed.manifest.study.energyBalance.achieved
  ) {
    return fail(
      "quality_gate_failed",
      "$.validation",
      "外部 FEM 参考未通过声明的验证、网格收敛或能量闭合门禁。",
    );
  }
  const declared = [
    ...Object.values(parsed.manifest.artifacts),
    ...parsed.manifest.fields.map((field) => field.dataArtifact),
  ];
  const declaredArtifactIds = new Set(
    declared.map((artifact) => artifact.artifactId),
  );
  const evidenceArtifactIds = Object.keys(evidence.artifactHashes);
  if (
    evidenceArtifactIds.length !== declaredArtifactIds.size ||
    evidenceArtifactIds.some((artifactId) => !declaredArtifactIds.has(artifactId))
  ) {
    return fail(
      "invalid_manifest",
      "$.evidence.artifactHashes",
      "外部 FEM 文件证据必须精确对应清单声明的文件，不得缺失或包含额外哈希。",
    );
  }
  for (const artifact of declared) {
    if (evidence.artifactHashes[artifact.artifactId] !== artifact.sha256) {
      return fail(
        "artifact_hash_mismatch",
        artifact.artifactId,
        `文件 ${artifact.artifactId} 缺失或 SHA-256 不匹配，已拒绝接纳。`,
      );
    }
  }
  return deepFreeze({
    status: "admitted" as const,
    reference: {
      manifest: parsed.manifest,
      provenance: FEM_REFERENCE_PROVENANCE,
      influencePolicy: FEM_REFERENCE_INFLUENCE_POLICY,
      displayLabelZh: "外部 FEM 只读参考" as const,
      displayLabelEn: "External FEM read-only reference" as const,
    },
  });
}
