import { TECHNICAL_FREEZE_ID, VERSION_INFO } from "../config/versions.js";
import type { ScalarQuantity } from "../domain/quantity.js";
import type {
  GeometrySnapshotPayload,
  ImmutableSnapshot,
} from "../domain/snapshot.js";
import {
  deepFreeze,
  fingerprint,
  normalizeJson,
} from "../serialization/canonical-json.js";

export const PARAMETRIC_SCENE_SCHEMA_VERSION = "1.0.0" as const;
export const PARAMETRIC_SCENE_MAPPING_ID =
  "phase6.coaxial_helical_round_tube.v1" as const;
export const SCHEMATIC_VISUALIZATION_PROVENANCE =
  "schematic_or_illustrative" as const;
export const SCHEMATIC_WATERMARK_ZH = "示意图 · 非 FEM 场" as const;
export const SCHEMATIC_WATERMARK_EN = "Schematic · Not a FEM field" as const;

export type SceneComponentId =
  | "workpiece_or_tube"
  | "insulation_layer[0]"
  | "radial_air_gap"
  | "coil_conductor"
  | "coolant_path"
  | "lead_or_bus";

export type SceneComponentKind =
  | "cylindrical_shell"
  | "helical_tube"
  | "polyline_tube";

export interface ScenePoint3 {
  readonly xM: number;
  readonly yM: number;
  readonly zM: number;
}

interface SceneComponentBase {
  readonly componentId: SceneComponentId;
  readonly kind: SceneComponentKind;
  readonly labelZh: string;
  readonly labelEn: string;
  readonly selectable: true;
  readonly defaultVisible: true;
  readonly defaultOpacity: number;
  readonly color: string;
  readonly visualizationProvenance: typeof SCHEMATIC_VISUALIZATION_PROVENANCE;
}

export interface CylindricalShellSceneComponent extends SceneComponentBase {
  readonly kind: "cylindrical_shell";
  readonly innerRadiusM: number;
  readonly outerRadiusM: number;
  readonly axialLengthM: number;
  readonly centerZM: number;
}

export interface HelicalTubeSceneComponent extends SceneComponentBase {
  readonly kind: "helical_tube";
  readonly centerlineRadiusM: number;
  readonly outerTubeRadiusM: number;
  readonly innerTubeRadiusM: number;
  readonly revolutionCount: number;
  readonly startZM: number;
  readonly endZM: number;
  readonly radialSegments: number;
  readonly tubularSegments: number;
}

export interface PolylineTubeSceneComponent extends SceneComponentBase {
  readonly kind: "polyline_tube";
  readonly radiusM: number;
  readonly paths: readonly (
    readonly [ScenePoint3, ScenePoint3, ...ScenePoint3[]]
  )[];
}

export type ParametricSceneComponent =
  | CylindricalShellSceneComponent
  | HelicalTubeSceneComponent
  | PolylineTubeSceneComponent;

export interface SceneDimensionAnnotation {
  readonly annotationId: string;
  readonly componentId: SceneComponentId;
  readonly labelZh: string;
  readonly labelEn: string;
  readonly valueM: number;
  readonly start: ScenePoint3;
  readonly end: ScenePoint3;
}

export interface ParametricEngineeringScene {
  readonly kind: "parametric_engineering_scene";
  readonly schemaVersion: typeof PARAMETRIC_SCENE_SCHEMA_VERSION;
  readonly mappingId: typeof PARAMETRIC_SCENE_MAPPING_ID;
  readonly visualizationProvenance: typeof SCHEMATIC_VISUALIZATION_PROVENANCE;
  readonly watermark: {
    readonly zh: typeof SCHEMATIC_WATERMARK_ZH;
    readonly en: typeof SCHEMATIC_WATERMARK_EN;
  };
  readonly source: {
    readonly geometrySnapshotId: string;
    readonly geometryFingerprintSha256: string;
    readonly geometrySchemaVersion: string;
    readonly technicalFreezeId: typeof TECHNICAL_FREEZE_ID;
  };
  readonly components: readonly ParametricSceneComponent[];
  readonly dimensions: readonly SceneDimensionAnnotation[];
  readonly bounds: {
    readonly radialExtentM: number;
    readonly axialExtentM: number;
  };
  readonly limitations: readonly string[];
}

export type ParametricSceneView = Pick<
  ParametricEngineeringScene,
  | "kind"
  | "schemaVersion"
  | "visualizationProvenance"
  | "watermark"
  | "components"
  | "dimensions"
  | "bounds"
  | "limitations"
>;

export type ParametricSceneFailureCode =
  | "invalid_snapshot"
  | "incompatible_snapshot"
  | "insufficient_geometry"
  | "inconsistent_geometry";

export type ParametricSceneBuildResult =
  | {
      readonly status: "success";
      readonly scene: ParametricEngineeringScene;
    }
  | {
      readonly status: "failed";
      readonly code: ParametricSceneFailureCode;
      readonly message: string;
      readonly missingParameterIds: readonly string[];
    };

type GeometrySnapshot = ImmutableSnapshot<
  "geometry",
  GeometrySnapshotPayload
>;

const REQUIRED_SCALAR_PARAMETERS = Object.freeze([
  "workpiece.outer_diameter",
  "workpiece.active_length",
  "insulation.inner_diameter",
  "insulation.outer_diameter",
  "thermal.radial_gap",
  "coil.inner_diameter",
  "coil.outer_diameter",
  "coil.mean_diameter",
  "coil.winding_envelope_length",
  "coil.helix_revolution_count",
  "coil.helix_axial_advance",
  "coil.lead_length",
  "conductor.radial_size",
  "conductor.outer_diameter",
  "conductor.inner_diameter",
] as const);

const WORKPIECE_INNER_DIAMETER = "workpiece.inner_diameter" as const;
const RELATIVE_IDENTITY_TOLERANCE = 1e-9;
const MAX_VIEWER_HELIX_REVOLUTIONS = 128;

function failed(
  code: ParametricSceneFailureCode,
  message: string,
  missingParameterIds: readonly string[] = [],
): ParametricSceneBuildResult {
  return deepFreeze({
    status: "failed" as const,
    code,
    message,
    missingParameterIds: [...missingParameterIds],
  });
}

function approximatelyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= RELATIVE_IDENTITY_TOLERANCE * scale;
}

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function nonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function snapshotIntegrityFailure(
  snapshot: GeometrySnapshot,
): ParametricSceneBuildResult | null {
  if (
    snapshot.kind !== "geometry" ||
    snapshot.schemaVersion !== VERSION_INFO.geometrySchema ||
    snapshot.payload.geometrySchemaVersion !== VERSION_INFO.geometrySchema ||
    snapshot.technicalFreezeId !== TECHNICAL_FREEZE_ID
  ) {
    return failed(
      "incompatible_snapshot",
      "几何快照版本或技术冻结标识与当前 3D 映射不兼容。",
    );
  }
  if (snapshot.payload.geometryMappingId !== PARAMETRIC_SCENE_MAPPING_ID) {
    return failed(
      "incompatible_snapshot",
      `3D 仅接受显式映射 ${PARAMETRIC_SCENE_MAPPING_ID}，不会猜测或迁移其他几何语义。`,
    );
  }

  const expectedFingerprint = fingerprint({
    kind: snapshot.kind,
    schemaVersion: snapshot.schemaVersion,
    technicalFreezeId: snapshot.technicalFreezeId,
    payload: snapshot.payload,
  });
  if (
    snapshot.fingerprint.algorithm !== "sha256" ||
    snapshot.fingerprint.value !== expectedFingerprint.value ||
    snapshot.snapshotId !== `geometry:${expectedFingerprint.value}`
  ) {
    return failed(
      "invalid_snapshot",
      "几何快照内容、哈希或快照标识不一致，已拒绝生成 3D。",
    );
  }
  return null;
}

function scalarMap(
  snapshot: GeometrySnapshot,
): ParametricSceneBuildResult | Map<string, ScalarQuantity> {
  const result = new Map<string, ScalarQuantity>();
  const duplicateIds = new Set<string>();
  for (const quantity of snapshot.payload.quantities) {
    if (result.has(quantity.parameterId)) {
      duplicateIds.add(quantity.parameterId);
      continue;
    }
    if (quantity.kind === "scalar") {
      result.set(quantity.parameterId, quantity);
    }
  }
  if (duplicateIds.size > 0) {
    return failed(
      "invalid_snapshot",
      `几何快照包含重复参数：${[...duplicateIds].join(", ")}。`,
    );
  }
  const missing: string[] = REQUIRED_SCALAR_PARAMETERS.filter(
    (id) => !result.has(id),
  );
  const workpieceInner = snapshot.payload.quantities.find(
    (quantity) => quantity.parameterId === WORKPIECE_INNER_DIAMETER,
  );
  if (
    workpieceInner === undefined ||
    (workpieceInner.kind === "unavailable" &&
      workpieceInner.status !== "not_applicable")
  ) {
    missing.push(WORKPIECE_INNER_DIAMETER);
  }
  if (missing.length > 0) {
    return failed(
      "insufficient_geometry",
      "3D 所需的机械尺寸不完整；缺失值不会由其他尺寸静默推断。",
      missing,
    );
  }
  return result;
}

function pointOnHelix(
  radiusM: number,
  revolutionCount: number,
  zM: number,
): ScenePoint3 {
  const angle = revolutionCount * 2 * Math.PI;
  return {
    xM: radiusM * Math.cos(angle),
    yM: radiusM * Math.sin(angle),
    zM,
  };
}

/**
 * Creates view geometry only. It consumes declared canonical-SI mechanical
 * quantities, verifies their frozen identities, and never calculates an
 * engineering result or changes the source GeometrySnapshot.
 */
function buildParametricEngineeringSceneFromSafeSnapshot(
  snapshot: GeometrySnapshot,
): ParametricSceneBuildResult {
  const integrityFailure = snapshotIntegrityFailure(snapshot);
  if (integrityFailure !== null) {
    return integrityFailure;
  }
  const quantities = scalarMap(snapshot);
  if (!(quantities instanceof Map)) {
    return quantities;
  }

  const value = (id: (typeof REQUIRED_SCALAR_PARAMETERS)[number]): number =>
    quantities.get(id)!.valueSi;
  const workpieceOuterDiameterM = value("workpiece.outer_diameter");
  const workpieceLengthM = value("workpiece.active_length");
  const insulationInnerDiameterM = value("insulation.inner_diameter");
  const insulationOuterDiameterM = value("insulation.outer_diameter");
  const radialGapM = value("thermal.radial_gap");
  const coilInnerDiameterM = value("coil.inner_diameter");
  const coilOuterDiameterM = value("coil.outer_diameter");
  const coilMeanDiameterM = value("coil.mean_diameter");
  const windingEnvelopeLengthM = value("coil.winding_envelope_length");
  const revolutionCount = value("coil.helix_revolution_count");
  const axialAdvanceM = value("coil.helix_axial_advance");
  const totalLeadLengthM = value("coil.lead_length");
  const conductorRadialSizeM = value("conductor.radial_size");
  const conductorOuterDiameterM = value("conductor.outer_diameter");
  const conductorInnerDiameterM = value("conductor.inner_diameter");
  const workpieceInnerQuantity = snapshot.payload.quantities.find(
    (quantity) => quantity.parameterId === WORKPIECE_INNER_DIAMETER,
  )!;
  const workpieceInnerDiameterM =
    workpieceInnerQuantity.kind === "scalar"
      ? workpieceInnerQuantity.valueSi
      : 0;

  const positiveValues: readonly [string, number][] = [
    ["workpiece.outer_diameter", workpieceOuterDiameterM],
    ["workpiece.active_length", workpieceLengthM],
    ["insulation.inner_diameter", insulationInnerDiameterM],
    ["insulation.outer_diameter", insulationOuterDiameterM],
    ["coil.inner_diameter", coilInnerDiameterM],
    ["coil.outer_diameter", coilOuterDiameterM],
    ["coil.mean_diameter", coilMeanDiameterM],
    ["coil.winding_envelope_length", windingEnvelopeLengthM],
    ["coil.helix_revolution_count", revolutionCount],
    ["coil.helix_axial_advance", axialAdvanceM],
    ["conductor.radial_size", conductorRadialSizeM],
    ["conductor.outer_diameter", conductorOuterDiameterM],
    ["conductor.inner_diameter", conductorInnerDiameterM],
  ];
  const invalidPositive = positiveValues
    .filter(([, candidate]) => !positiveFinite(candidate))
    .map(([id]) => id);
  if (
    invalidPositive.length > 0 ||
    !nonNegativeFinite(workpieceInnerDiameterM) ||
    !nonNegativeFinite(radialGapM) ||
    !nonNegativeFinite(totalLeadLengthM)
  ) {
    return failed(
      "inconsistent_geometry",
      "3D 机械尺寸必须为有限值；直径、长度和转数为正，内孔、径向间隙与引线长度可为零。",
      invalidPositive,
    );
  }
  if (revolutionCount > MAX_VIEWER_HELIX_REVOLUTIONS) {
    return failed(
      "incompatible_snapshot",
      `实际螺旋圈数超过当前交互式查看器的 ${String(MAX_VIEWER_HELIX_REVOLUTIONS)} 圈安全容量；几何快照未被修改。`,
    );
  }

  const conflicts: string[] = [];
  if (!(workpieceInnerDiameterM < workpieceOuterDiameterM)) {
    conflicts.push("workpiece.inner_diameter < workpiece.outer_diameter");
  }
  if (
    !(insulationInnerDiameterM >= workpieceOuterDiameterM) ||
    !(insulationOuterDiameterM > insulationInnerDiameterM)
  ) {
    conflicts.push("workpiece / insulation radial ordering");
  }
  if (
    !(coilInnerDiameterM > insulationOuterDiameterM) ||
    !(coilOuterDiameterM > coilInnerDiameterM)
  ) {
    conflicts.push("insulation / coil radial ordering");
  }
  if (!(conductorInnerDiameterM < conductorOuterDiameterM)) {
    conflicts.push("conductor.inner_diameter < conductor.outer_diameter");
  }
  if (
    !approximatelyEqual(
      coilOuterDiameterM,
      coilInnerDiameterM + 2 * conductorRadialSizeM,
    )
  ) {
    conflicts.push("coil outer diameter identity");
  }
  if (
    !approximatelyEqual(
      coilMeanDiameterM,
      (coilInnerDiameterM + coilOuterDiameterM) / 2,
    )
  ) {
    conflicts.push("coil mean diameter identity");
  }
  if (!approximatelyEqual(conductorRadialSizeM, conductorOuterDiameterM)) {
    conflicts.push("round-tube radial size identity");
  }
  if (
    !approximatelyEqual(
      radialGapM,
      (coilInnerDiameterM - insulationOuterDiameterM) / 2,
    )
  ) {
    conflicts.push("single-sided radial gap identity");
  }
  if (
    !approximatelyEqual(
      windingEnvelopeLengthM,
      axialAdvanceM + conductorOuterDiameterM,
    )
  ) {
    conflicts.push("helical envelope / centre-path advance identity");
  }
  if (conflicts.length > 0) {
    return failed(
      "inconsistent_geometry",
      `几何量不满足 3D 映射的显式机械关系：${conflicts.join("；")}。`,
    );
  }

  const coilRadiusM = coilMeanDiameterM / 2;
  const tubeOuterRadiusM = conductorOuterDiameterM / 2;
  const tubeInnerRadiusM = conductorInnerDiameterM / 2;
  const startZM = -axialAdvanceM / 2;
  const endZM = axialAdvanceM / 2;
  const leadHalfLengthM = totalLeadLengthM / 2;
  const helixStart = pointOnHelix(coilRadiusM, 0, startZM);
  const helixEnd = pointOnHelix(coilRadiusM, revolutionCount, endZM);
  const leadPaths: readonly (
    readonly [ScenePoint3, ScenePoint3]
  )[] = [
    [
      {
        xM: helixStart.xM - leadHalfLengthM,
        yM: helixStart.yM,
        zM: helixStart.zM,
      },
      helixStart,
    ],
    [
      helixEnd,
      {
        xM: helixEnd.xM + leadHalfLengthM,
        yM: helixEnd.yM,
        zM: helixEnd.zM,
      },
    ],
  ];

  const components: ParametricSceneComponent[] = [
    {
      componentId: "workpiece_or_tube",
      kind: "cylindrical_shell",
      labelZh: "工件 / 炉管",
      labelEn: "Workpiece / furnace tube",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 1,
      color: "#6f7b8b",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      innerRadiusM: workpieceInnerDiameterM / 2,
      outerRadiusM: workpieceOuterDiameterM / 2,
      axialLengthM: workpieceLengthM,
      centerZM: 0,
    },
    {
      componentId: "insulation_layer[0]",
      kind: "cylindrical_shell",
      labelZh: "保温层",
      labelEn: "Insulation layer",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 0.72,
      color: "#d9b768",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      innerRadiusM: insulationInnerDiameterM / 2,
      outerRadiusM: insulationOuterDiameterM / 2,
      axialLengthM: workpieceLengthM,
      centerZM: 0,
    },
    {
      componentId: "radial_air_gap",
      kind: "cylindrical_shell",
      labelZh: "径向空气隙",
      labelEn: "Radial air gap",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 0.14,
      color: "#6fc8df",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      innerRadiusM: insulationOuterDiameterM / 2,
      outerRadiusM: coilInnerDiameterM / 2,
      axialLengthM: Math.max(workpieceLengthM, windingEnvelopeLengthM),
      centerZM: 0,
    },
    {
      componentId: "coil_conductor",
      kind: "helical_tube",
      labelZh: "空心水冷线圈",
      labelEn: "Hollow water-cooled coil",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 1,
      color: "#c96a2e",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      centerlineRadiusM: coilRadiusM,
      outerTubeRadiusM: tubeOuterRadiusM,
      innerTubeRadiusM: tubeInnerRadiusM,
      revolutionCount,
      startZM,
      endZM,
      radialSegments: 12,
      tubularSegments: Math.max(64, Math.ceil(revolutionCount * 48)),
    },
    {
      componentId: "coolant_path",
      kind: "helical_tube",
      labelZh: "冷却水通道",
      labelEn: "Coolant passage",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 0.8,
      color: "#2c9ccf",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      centerlineRadiusM: coilRadiusM,
      outerTubeRadiusM: tubeInnerRadiusM,
      innerTubeRadiusM: 0,
      revolutionCount,
      startZM,
      endZM,
      radialSegments: 10,
      tubularSegments: Math.max(64, Math.ceil(revolutionCount * 48)),
    },
  ];
  if (totalLeadLengthM > 0) {
    components.push({
      componentId: "lead_or_bus",
      kind: "polyline_tube",
      labelZh: "引线 / 母排（路径示意）",
      labelEn: "Lead / bus (schematic route)",
      selectable: true,
      defaultVisible: true,
      defaultOpacity: 1,
      color: "#a85525",
      visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
      radiusM: tubeOuterRadiusM,
      paths: leadPaths,
    });
  }

  const dimensions: SceneDimensionAnnotation[] = [
    {
      annotationId: "workpiece_outer_diameter",
      componentId: "workpiece_or_tube",
      labelZh: "工件外径",
      labelEn: "Workpiece outer diameter",
      valueM: workpieceOuterDiameterM,
      start: { xM: -workpieceOuterDiameterM / 2, yM: 0, zM: 0 },
      end: { xM: workpieceOuterDiameterM / 2, yM: 0, zM: 0 },
    },
    {
      annotationId: "coil_outer_diameter",
      componentId: "coil_conductor",
      labelZh: "线圈机械外径",
      labelEn: "Coil mechanical outer diameter",
      valueM: coilOuterDiameterM,
      start: { xM: -coilOuterDiameterM / 2, yM: 0, zM: endZM },
      end: { xM: coilOuterDiameterM / 2, yM: 0, zM: endZM },
    },
    {
      annotationId: "winding_envelope_length",
      componentId: "coil_conductor",
      labelZh: "线圈轴向总高度",
      labelEn: "Coil axial envelope",
      valueM: windingEnvelopeLengthM,
      start: { xM: coilOuterDiameterM / 2, yM: 0, zM: -windingEnvelopeLengthM / 2 },
      end: { xM: coilOuterDiameterM / 2, yM: 0, zM: windingEnvelopeLengthM / 2 },
    },
    {
      annotationId: "radial_air_gap",
      componentId: "radial_air_gap",
      labelZh: "单边径向空气隙",
      labelEn: "Single-sided radial air gap",
      valueM: radialGapM,
      start: { xM: insulationOuterDiameterM / 2, yM: 0, zM: 0 },
      end: { xM: coilInnerDiameterM / 2, yM: 0, zM: 0 },
    },
  ];

  const radialExtentM = coilOuterDiameterM / 2 + leadHalfLengthM;
  const axialExtentM = Math.max(workpieceLengthM, windingEnvelopeLengthM);
  if (!Number.isFinite(radialExtentM) || !Number.isFinite(axialExtentM)) {
    return failed(
      "incompatible_snapshot",
      "几何范围超出当前交互式查看器的有限数值容量；几何快照未被修改。",
    );
  }
  const scene: ParametricEngineeringScene = {
    kind: "parametric_engineering_scene",
    schemaVersion: PARAMETRIC_SCENE_SCHEMA_VERSION,
    mappingId: PARAMETRIC_SCENE_MAPPING_ID,
    visualizationProvenance: SCHEMATIC_VISUALIZATION_PROVENANCE,
    watermark: {
      zh: SCHEMATIC_WATERMARK_ZH,
      en: SCHEMATIC_WATERMARK_EN,
    },
    source: {
      geometrySnapshotId: snapshot.snapshotId,
      geometryFingerprintSha256: snapshot.fingerprint.value,
      geometrySchemaVersion: snapshot.schemaVersion,
      technicalFreezeId: TECHNICAL_FREEZE_ID,
    },
    components,
    dimensions,
    bounds: { radialExtentM, axialExtentM },
    limitations: [
      "保温层轴向长度按当前 3D 映射显示为工件有效长度；该显示关系不写回几何快照。",
      "引线方向是路径示意；仅总长度来自快照，不用于碰撞、阻抗或热分析。",
      "颜色、透明度和剖切仅用于辨识组件，不代表温度、电磁场或求解精度。",
    ],
  };
  return deepFreeze({ status: "success" as const, scene });
}

function exactPlainRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isStructurallyCompatibleGeometrySnapshot(
  value: unknown,
): value is GeometrySnapshot {
  if (
    !exactPlainRecord(value, [
      "snapshotId",
      "kind",
      "schemaVersion",
      "technicalFreezeId",
      "createdAt",
      "fingerprint",
      "payload",
    ]) ||
    typeof value.snapshotId !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.schemaVersion !== "string" ||
    typeof value.technicalFreezeId !== "string" ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(new Date(value.createdAt).getTime()) ||
    new Date(value.createdAt).toISOString() !== value.createdAt ||
    !exactPlainRecord(value.fingerprint, ["algorithm", "value"]) ||
    typeof value.fingerprint.algorithm !== "string" ||
    typeof value.fingerprint.value !== "string" ||
    !exactPlainRecord(value.payload, [
      "geometrySchemaVersion",
      "geometryMappingId",
      "quantities",
      "assumptions",
    ]) ||
    typeof value.payload.geometrySchemaVersion !== "string" ||
    typeof value.payload.geometryMappingId !== "string" ||
    !Array.isArray(value.payload.quantities) ||
    !Array.isArray(value.payload.assumptions) ||
    !value.payload.assumptions.every(
      (assumption) => typeof assumption === "string",
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Public fail-closed boundary. The caller may supply untrusted JSON-like data;
 * accessors are never invoked, Proxy failures are contained, and extra fields
 * are rejected before the typed scene builder runs.
 */
export function buildParametricEngineeringScene(
  snapshotInput: unknown,
): ParametricSceneBuildResult {
  try {
    const snapshot = deepFreeze(normalizeJson(snapshotInput));
    if (!isStructurallyCompatibleGeometrySnapshot(snapshot)) {
      return failed(
        "invalid_snapshot",
        "几何快照必须是字段精确、无访问器、无隐藏字段的普通不可变数据。",
      );
    }
    return buildParametricEngineeringSceneFromSafeSnapshot(snapshot);
  } catch {
    return failed(
      "invalid_snapshot",
      "几何快照必须是字段精确、无访问器、无隐藏字段的普通不可变数据。",
    );
  }
}

/** Removes snapshot/hash/mapping identifiers before crossing into ordinary UI. */
export function createParametricSceneView(
  scene: ParametricEngineeringScene,
): ParametricSceneView {
  return deepFreeze({
    kind: scene.kind,
    schemaVersion: scene.schemaVersion,
    visualizationProvenance: scene.visualizationProvenance,
    watermark: scene.watermark,
    components: scene.components,
    dimensions: scene.dimensions,
    bounds: scene.bounds,
    limitations: scene.limitations,
  });
}
