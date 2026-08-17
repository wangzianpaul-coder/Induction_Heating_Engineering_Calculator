import { VERSION_INFO } from "../config/versions.js";
import { createScalarQuantity } from "../controlled-quantity-factory.js";
import { parameterId, sourceRef } from "../domain/ids.js";
import { createGeometrySnapshot } from "../domain/snapshot.js";
import { parseCaseFile } from "../serialization/case-file.js";
import {
  PARAMETRIC_SCENE_MAPPING_ID,
  buildParametricEngineeringScene,
  createParametricSceneView,
  type ParametricSceneView,
} from "../visualization/sceneModel.js";

export type CaseVisualizationLoadResult =
  | {
      readonly status: "success";
      readonly caseName: string;
      readonly scene: ParametricSceneView;
    }
  | {
      readonly status: "failed";
      readonly errorCode: string;
      readonly messageZh: string;
      readonly messageEn: string;
      readonly missingInputsZh: readonly string[];
    };

export interface MechanicalVisualizationInput {
  readonly snapshotCreatedAt: string;
  /** Conservative significant digits declared for every geometry value below. */
  readonly declaredValidDigits: number;
  readonly workpieceOuterDiameterMm: number;
  readonly workpieceInnerDiameterMm: number;
  readonly workpieceActiveLengthMm: number;
  readonly insulationInnerDiameterMm: number;
  readonly insulationOuterDiameterMm: number;
  readonly radialGapMm: number;
  readonly coilInnerDiameterMm: number;
  readonly coilOuterDiameterMm: number;
  readonly coilMeanDiameterMm: number;
  readonly coilWindingEnvelopeLengthMm: number;
  readonly helixRevolutionCount: number;
  readonly helixAxialAdvanceMm: number;
  readonly leadLengthMm: number;
  readonly conductorRadialSizeMm: number;
  readonly conductorOuterDiameterMm: number;
  readonly conductorInnerDiameterMm: number;
}

export type MechanicalVisualizationBuildResult =
  | {
      readonly status: "success";
      readonly scene: ParametricSceneView;
    }
  | {
      readonly status: "failed";
      readonly errorCode:
        | "invalid_mechanical_input"
        | "inconsistent_geometry"
        | "viewer_capacity_exceeded";
      readonly messageZh: string;
      readonly messageEn: string;
    };

const MECHANICAL_INPUT_KEYS = Object.freeze([
  "snapshotCreatedAt",
  "declaredValidDigits",
  "workpieceOuterDiameterMm",
  "workpieceInnerDiameterMm",
  "workpieceActiveLengthMm",
  "insulationInnerDiameterMm",
  "insulationOuterDiameterMm",
  "radialGapMm",
  "coilInnerDiameterMm",
  "coilOuterDiameterMm",
  "coilMeanDiameterMm",
  "coilWindingEnvelopeLengthMm",
  "helixRevolutionCount",
  "helixAxialAdvanceMm",
  "leadLengthMm",
  "conductorRadialSizeMm",
  "conductorOuterDiameterMm",
  "conductorInnerDiameterMm",
] as const satisfies readonly (keyof MechanicalVisualizationInput)[]);

const PARAMETER_NAMES_ZH: Readonly<Record<string, string>> = Object.freeze({
  "workpiece.outer_diameter": "工件外径",
  "workpiece.inner_diameter": "工件内径（实心工件需明确标为不适用）",
  "workpiece.active_length": "工件有效长度",
  "insulation.inner_diameter": "保温层内径",
  "insulation.outer_diameter": "保温层外径",
  "thermal.radial_gap": "线圈与保温层的单边径向空气隙",
  "coil.inner_diameter": "线圈机械内径",
  "coil.outer_diameter": "线圈机械外径",
  "coil.mean_diameter": "线圈机械中心线直径",
  "coil.winding_envelope_length": "线圈轴向总高度",
  "coil.helix_revolution_count": "螺旋导体实际圈数",
  "coil.helix_axial_advance": "螺旋中心路径的轴向前进量",
  "coil.lead_length": "引线 / 母排总路径长度",
  "conductor.radial_size": "导体径向外形尺寸",
  "conductor.outer_diameter": "圆管导体外径",
  "conductor.inner_diameter": "圆管导体冷却水孔内径",
});

function caseImportMessage(code: string): {
  readonly zh: string;
  readonly en: string;
} {
  switch (code) {
    case "invalid_json":
      return {
        zh: "所选文件不是有效的 Case JSON。",
        en: "The selected file is not valid Case JSON.",
      };
    case "case_file_too_large":
      return {
        zh: "Case 文件超过允许大小。",
        en: "The Case file exceeds the supported size limit.",
      };
    case "unsupported_schema_version":
    case "technical_freeze_mismatch":
    case "version_mismatch":
      return {
        zh: "Case 文件版本与当前软件不兼容；不会静默迁移几何。",
        en: "The Case version is incompatible; geometry is not migrated silently.",
      };
    default:
      return {
        zh: "Case 文件完整性校验失败。",
        en: "Case integrity validation failed.",
      };
  }
}

/**
 * Application-facing read-only boundary for a Case file and the Phase-6 scene.
 * No raw Case payload or internal parameter identifiers are returned to UI.
 */
export function loadCaseVisualizationScene(
  caseJson: string,
): CaseVisualizationLoadResult {
  const loaded = parseCaseFile(caseJson);
  if (loaded.status !== "success") {
    const message = caseImportMessage(loaded.code);
    return Object.freeze({
      status: "failed" as const,
      errorCode: loaded.code,
      messageZh: message.zh,
      messageEn: message.en,
      missingInputsZh: Object.freeze([]),
    });
  }
  const built = buildParametricEngineeringScene(
    loaded.caseFile.caseSnapshot.payload.geometry,
  );
  if (built.status === "failed") {
    const missingInputsZh = built.missingParameterIds.map(
      (id) => PARAMETER_NAMES_ZH[id] ?? "未识别的几何输入",
    );
    const messages = {
      invalid_snapshot: {
        zh: "Case 中的几何快照完整性校验失败，无法生成 3D。",
        en: "The geometry snapshot failed integrity validation.",
      },
      incompatible_snapshot: {
        zh: "当前 Case 尚未采用可生成 3D 的受控机械几何映射。",
        en: "The Case does not use the controlled mechanical 3D mapping.",
      },
      insufficient_geometry: {
        zh: "当前 Case 缺少生成 3D 所需的机械尺寸。",
        en: "The Case lacks mechanical dimensions required for 3D.",
      },
      inconsistent_geometry: {
        zh: "当前 Case 的机械尺寸彼此冲突，已停止生成 3D。",
        en: "The Case contains conflicting mechanical dimensions.",
      },
    }[built.code];
    return Object.freeze({
      status: "failed" as const,
      errorCode: built.code,
      messageZh: messages.zh,
      messageEn: messages.en,
      missingInputsZh: Object.freeze(missingInputsZh),
    });
  }
  return Object.freeze({
    status: "success" as const,
    caseName: loaded.caseFile.caseSnapshot.payload.caseName,
    scene: createParametricSceneView(built.scene),
  });
}

function invalidMechanicalInput(messageZh: string): MechanicalVisualizationBuildResult {
  return Object.freeze({
    status: "failed" as const,
    errorCode: "invalid_mechanical_input" as const,
    messageZh,
    messageEn: "Enter every mechanical dimension explicitly as a finite number.",
  });
}

function ownDataRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  try {
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
      return null;
    }
    const output: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

/**
 * UI-ready strict builder for a new 3D scene. All dimensions are explicit
 * millimetre inputs; no dimensions, material data or engineering results are
 * inferred. The immutable GeometrySnapshot remains internal to this service.
 */
export function buildVisualizationSceneFromMechanicalInput(
  input: MechanicalVisualizationInput,
): MechanicalVisualizationBuildResult {
  const candidate = ownDataRecord(input);
  if (candidate === null) {
    return invalidMechanicalInput("三维机械输入必须是完整表单数据。");
  }
  const actualKeys = Object.keys(candidate).sort();
  const expectedKeys = [...MECHANICAL_INPUT_KEYS].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return invalidMechanicalInput("三维机械输入字段不完整或包含未知字段。");
  }
  const safeInput = candidate as unknown as MechanicalVisualizationInput;
  const createdAt = new Date(safeInput.snapshotCreatedAt);
  if (
    Number.isNaN(createdAt.getTime()) ||
    createdAt.toISOString() !== safeInput.snapshotCreatedAt
  ) {
    return invalidMechanicalInput("三维输入时间必须是规范的 UTC 时间。");
  }
  const numberKeys = MECHANICAL_INPUT_KEYS.filter(
    (key): key is Exclude<keyof MechanicalVisualizationInput, "snapshotCreatedAt"> =>
      key !== "snapshotCreatedAt",
  );
  if (
    numberKeys.some(
      (key) =>
        typeof safeInput[key] !== "number" || !Number.isFinite(safeInput[key]),
    )
  ) {
    return invalidMechanicalInput("每一个机械尺寸和圈数都必须填写有限数值。");
  }
  if (
    !Number.isSafeInteger(safeInput.declaredValidDigits) ||
    safeInput.declaredValidDigits < 1 ||
    safeInput.declaredValidDigits > 17
  ) {
    return invalidMechanicalInput("输入有效位数必须是 1 至 17 的整数。");
  }

  const entries = [
    ["workpiece.outer_diameter", safeInput.workpieceOuterDiameterMm, "length"],
    ["workpiece.inner_diameter", safeInput.workpieceInnerDiameterMm, "length"],
    ["workpiece.active_length", safeInput.workpieceActiveLengthMm, "length"],
    ["insulation.inner_diameter", safeInput.insulationInnerDiameterMm, "length"],
    ["insulation.outer_diameter", safeInput.insulationOuterDiameterMm, "length"],
    ["thermal.radial_gap", safeInput.radialGapMm, "length"],
    ["coil.inner_diameter", safeInput.coilInnerDiameterMm, "length"],
    ["coil.outer_diameter", safeInput.coilOuterDiameterMm, "length"],
    ["coil.mean_diameter", safeInput.coilMeanDiameterMm, "length"],
    [
      "coil.winding_envelope_length",
      safeInput.coilWindingEnvelopeLengthMm,
      "length",
    ],
    [
      "coil.helix_revolution_count",
      safeInput.helixRevolutionCount,
      "dimensionless",
    ],
    ["coil.helix_axial_advance", safeInput.helixAxialAdvanceMm, "length"],
    ["coil.lead_length", safeInput.leadLengthMm, "length"],
    ["conductor.radial_size", safeInput.conductorRadialSizeMm, "length"],
    ["conductor.outer_diameter", safeInput.conductorOuterDiameterMm, "length"],
    ["conductor.inner_diameter", safeInput.conductorInnerDiameterMm, "length"],
  ] as const;

  try {
    const quantities = entries.map(([id, value, dimension]) => {
      const dimensionless = dimension === "dimensionless";
      return createScalarQuantity({
        parameterId: parameterId(id),
        value,
        unitId: dimensionless ? "one" : "mm",
        dimensionId: dimensionless ? "dimensionless" : "length",
        displayUnitId: dimensionless ? "one" : "mm",
        basis: "total",
        uncertainty: { kind: "unknown" },
        provenance: {
          sourceKind: "user",
          sourceRef: sourceRef(`visualization.input.${id}`),
          dataQuality: "user_defined",
        },
        status: "known",
        validDigits: safeInput.declaredValidDigits,
      });
    });
    const snapshot = createGeometrySnapshot(
      {
        geometrySchemaVersion: VERSION_INFO.geometrySchema,
        geometryMappingId: PARAMETRIC_SCENE_MAPPING_ID,
        quantities,
        assumptions: [
          "Round hollow conductor dimensions are explicit mechanical inputs.",
          "Lead direction is illustrative while declared total path length is preserved.",
        ],
      },
      safeInput.snapshotCreatedAt,
    );
    const built = buildParametricEngineeringScene(snapshot);
    if (built.status === "failed") {
      if (built.code === "incompatible_snapshot") {
        return Object.freeze({
          status: "failed" as const,
          errorCode: "viewer_capacity_exceeded" as const,
          messageZh: "该几何超过当前交互式三维查看器的安全容量，原始输入未被修改。",
          messageEn: "The geometry exceeds the interactive viewer safety capacity.",
        });
      }
      return Object.freeze({
        status: "failed" as const,
        errorCode: "inconsistent_geometry" as const,
        messageZh: "输入尺寸不满足同轴圆管线圈的机械关系，请检查直径、间隙和轴向尺寸。",
        messageEn: "The dimensions conflict with the controlled coaxial round-tube mapping.",
      });
    }
    return Object.freeze({
      status: "success" as const,
      scene: createParametricSceneView(built.scene),
    });
  } catch {
    return invalidMechanicalInput("机械输入不能形成受控几何快照，请检查数值和单位。");
  }
}
