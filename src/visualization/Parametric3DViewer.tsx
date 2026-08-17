import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
  ParametricSceneComponent,
  ParametricSceneView,
  SceneComponentId,
  ScenePoint3,
} from "./sceneModel.js";

export interface Parametric3DViewerProps {
  readonly scene: ParametricSceneView;
  readonly language?: "zh-CN" | "en";
  readonly height?: number;
  readonly onSelectionChange?: (componentId: SceneComponentId | null) => void;
}

interface RenderedComponent {
  readonly objects: readonly THREE.Object3D[];
  readonly materials: readonly THREE.MeshStandardMaterial[];
}

const rootStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto minmax(360px, 1fr) auto",
  gap: "0.75rem",
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.55rem 1rem",
  alignItems: "center",
  padding: "0.75rem",
  border: "1px solid #cad3df",
  borderRadius: "0.7rem",
  background: "#f6f8fb",
};

const viewportStyle: CSSProperties = {
  position: "relative",
  minHeight: 360,
  overflow: "hidden",
  border: "1px solid #aeb9c7",
  borderRadius: "0.7rem",
  background: "linear-gradient(180deg, #edf3f8 0%, #dce5ed 100%)",
};

const watermarkStyle: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  top: "0.75rem",
  left: "0.75rem",
  padding: "0.4rem 0.65rem",
  border: "1px solid rgba(118, 46, 26, 0.5)",
  borderRadius: "0.35rem",
  background: "rgba(255, 247, 237, 0.92)",
  color: "#7c2d12",
  fontSize: "0.92rem",
  fontWeight: 750,
  pointerEvents: "none",
};

function vector(point: ScenePoint3): THREE.Vector3 {
  return new THREE.Vector3(point.xM, point.yM, point.zM);
}

class SceneHelixCurve extends THREE.Curve<THREE.Vector3> {
  public constructor(
    private readonly radiusM: number,
    private readonly revolutionCount: number,
    private readonly startZM: number,
    private readonly endZM: number,
  ) {
    super();
  }

  public override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angle = 2 * Math.PI * this.revolutionCount * t;
    return target.set(
      this.radiusM * Math.cos(angle),
      this.radiusM * Math.sin(angle),
      this.startZM + (this.endZM - this.startZM) * t,
    );
  }
}

function materialFor(
  component: ParametricSceneComponent,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: component.color,
    roughness: component.componentId === "coil_conductor" ? 0.33 : 0.62,
    metalness: component.componentId === "coil_conductor" ? 0.52 : 0.06,
    opacity: component.defaultOpacity,
    transparent: component.defaultOpacity < 1,
    side: THREE.DoubleSide,
    depthWrite: component.defaultOpacity >= 0.9,
  });
}

function closedCylindricalShell(
  component: Extract<ParametricSceneComponent, { readonly kind: "cylindrical_shell" }>,
): THREE.BufferGeometry {
  const half = component.axialLengthM / 2;
  const inner = component.innerRadiusM;
  const points = inner > 0
    ? [
        new THREE.Vector2(inner, -half),
        new THREE.Vector2(component.outerRadiusM, -half),
        new THREE.Vector2(component.outerRadiusM, half),
        new THREE.Vector2(inner, half),
        new THREE.Vector2(inner, -half),
      ]
    : [
        new THREE.Vector2(0, -half),
        new THREE.Vector2(component.outerRadiusM, -half),
        new THREE.Vector2(component.outerRadiusM, half),
        new THREE.Vector2(0, half),
      ];
  const geometry = new THREE.LatheGeometry(points, 72);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, component.centerZM);
  return geometry;
}

function polylineCurve(points: readonly ScenePoint3[]): THREE.Curve<THREE.Vector3> {
  const vectors = points.map(vector);
  if (vectors.length === 2) {
    return new THREE.LineCurve3(vectors[0]!, vectors[1]!);
  }
  return new THREE.CatmullRomCurve3(vectors, false, "centripetal");
}

function sweptTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments: number,
  outerRadiusM: number,
  innerRadiusM: number,
  radialSegments: number,
): THREE.BufferGeometry {
  if (innerRadiusM <= 0) {
    return new THREE.TubeGeometry(
      curve,
      tubularSegments,
      outerRadiusM,
      radialSegments,
      false,
    );
  }
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const vertices: number[] = [];
  const indices: number[] = [];
  const ringsPerSection = 2;
  for (let axialIndex = 0; axialIndex <= tubularSegments; axialIndex += 1) {
    const center = curve.getPointAt(axialIndex / tubularSegments);
    const normal = frames.normals[axialIndex]!;
    const binormal = frames.binormals[axialIndex]!;
    for (const radiusM of [outerRadiusM, innerRadiusM]) {
      for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
        const angle = (radialIndex / radialSegments) * Math.PI * 2;
        const position = center
          .clone()
          .add(normal.clone().multiplyScalar(Math.cos(angle) * radiusM))
          .add(binormal.clone().multiplyScalar(Math.sin(angle) * radiusM));
        vertices.push(position.x, position.y, position.z);
      }
    }
  }
  const at = (axialIndex: number, ring: 0 | 1, radialIndex: number): number =>
    axialIndex * radialSegments * ringsPerSection +
    ring * radialSegments +
    (radialIndex % radialSegments);
  for (let axialIndex = 0; axialIndex < tubularSegments; axialIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const next = radialIndex + 1;
      indices.push(
        at(axialIndex, 0, radialIndex),
        at(axialIndex + 1, 0, radialIndex),
        at(axialIndex + 1, 0, next),
        at(axialIndex, 0, radialIndex),
        at(axialIndex + 1, 0, next),
        at(axialIndex, 0, next),
      );
      indices.push(
        at(axialIndex, 1, radialIndex),
        at(axialIndex + 1, 1, next),
        at(axialIndex + 1, 1, radialIndex),
        at(axialIndex, 1, radialIndex),
        at(axialIndex, 1, next),
        at(axialIndex + 1, 1, next),
      );
      indices.push(
        at(0, 0, radialIndex),
        at(0, 0, next),
        at(0, 1, next),
        at(0, 0, radialIndex),
        at(0, 1, next),
        at(0, 1, radialIndex),
      );
      indices.push(
        at(tubularSegments, 0, radialIndex),
        at(tubularSegments, 1, next),
        at(tubularSegments, 0, next),
        at(tubularSegments, 0, radialIndex),
        at(tubularSegments, 1, radialIndex),
        at(tubularSegments, 1, next),
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function renderComponent(
  component: ParametricSceneComponent,
): RenderedComponent {
  const material = materialFor(component);
  const makeMesh = (geometry: THREE.BufferGeometry): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { componentId: component.componentId };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  if (component.kind === "cylindrical_shell") {
    return {
      objects: [makeMesh(closedCylindricalShell(component))],
      materials: [material],
    };
  }
  if (component.kind === "helical_tube") {
    const geometry = sweptTubeGeometry(
      new SceneHelixCurve(
        component.centerlineRadiusM,
        component.revolutionCount,
        component.startZM,
        component.endZM,
      ),
      component.tubularSegments,
      component.outerTubeRadiusM,
      component.innerTubeRadiusM,
      component.radialSegments,
    );
    return { objects: [makeMesh(geometry)], materials: [material] };
  }

  const objects = component.paths.map((path) =>
    makeMesh(
      new THREE.TubeGeometry(
        polylineCurve(path),
        Math.max(8, path.length * 8),
        component.radiusM,
        10,
        false,
      ),
    ),
  );
  return { objects, materials: [material] };
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}

function formatMillimetres(valueM: number): string {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 3,
  }).format(valueM * 1_000)} mm`;
}

/**
 * Interactive scene renderer. It consumes the Phase-6 view model only: no
 * calculation methods, material providers, Case mutation or FEM solver is in
 * this component.
 */
export function Parametric3DViewer({
  scene,
  language = "zh-CN",
  height = 560,
  onSelectionChange,
}: Parametric3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => undefined);
  const renderedRef = useRef<Map<SceneComponentId, RenderedComponent>>(new Map());
  const [selectedComponentId, setSelectedComponentId] =
    useState<SceneComponentId | null>(null);
  const [cutaway, setCutaway] = useState(false);
  const [globalOpacity, setGlobalOpacity] = useState(1);
  const [renderFailure, setRenderFailure] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(
      scene.components.map((component) => [
        component.componentId,
        component.defaultVisible,
      ]),
    ),
  );

  useEffect(() => {
    setVisibility(
      Object.fromEntries(
        scene.components.map((component) => [
          component.componentId,
          component.defaultVisible,
        ]),
      ),
    );
    setSelectedComponentId(null);
  }, [scene]);

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) {
      return undefined;
    }
    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0xe8eef4);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 10_000);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      setRenderFailure(null);
    } catch {
      setRenderFailure(
        language === "zh-CN"
          ? "浏览器无法创建 WebGL 三维画布。请确认硬件加速已启用，或改用支持 WebGL 的新版 Chrome / Edge。"
          : "The browser could not create a WebGL canvas. Enable hardware acceleration or use a current Chrome / Edge release.",
      );
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.domElement.setAttribute(
      "aria-label",
      language === "zh-CN" ? "可旋转和缩放的线圈三维示意图" : "Interactive coil schematic",
    );
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x45566a, 2.2);
    threeScene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, -3, 5);
    key.castShadow = true;
    threeScene.add(key);

    const rendered = new Map<SceneComponentId, RenderedComponent>();
    for (const component of scene.components) {
      const componentRender = renderComponent(component);
      rendered.set(component.componentId, componentRender);
      for (const object of componentRender.objects) {
        threeScene.add(object);
      }
    }
    renderedRef.current = rendered;

    const dimensionGroup = new THREE.Group();
    const dimensionMaterial = new THREE.LineBasicMaterial({
      color: 0x26384b,
      transparent: true,
      opacity: 0.72,
    });
    for (const dimension of scene.dimensions) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        vector(dimension.start),
        vector(dimension.end),
      ]);
      dimensionGroup.add(new THREE.Line(geometry, dimensionMaterial));
    }
    threeScene.add(dimensionGroup);

    const extent = Math.max(
      scene.bounds.radialExtentM * 2,
      scene.bounds.axialExtentM,
      0.01,
    );
    const resetView = (): void => {
      camera.position.set(extent * 1.55, -extent * 1.8, extent * 1.05);
      camera.near = Math.max(extent / 10_000, 0.00001);
      camera.far = Math.max(extent * 100, 10);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    };
    resetViewRef.current = resetView;
    resetView();

    const resize = (): void => {
      const width = Math.max(1, mount.clientWidth);
      const viewportHeight = Math.max(1, mount.clientHeight);
      renderer.setSize(width, viewportHeight, false);
      camera.aspect = width / viewportHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointer = (event: PointerEvent): void => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(
        [...rendered.values()].flatMap((entry) => [...entry.objects]),
        true,
      )[0];
      const componentId = hit?.object.userData.componentId;
      const selected =
        typeof componentId === "string" && rendered.has(componentId as SceneComponentId)
          ? (componentId as SceneComponentId)
          : null;
      setSelectedComponentId(selected);
      onSelectionChange?.(selected);
    };
    renderer.domElement.addEventListener("pointerdown", handlePointer);

    let frame = 0;
    const animate = (): void => {
      controls.update();
      renderer.render(threeScene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointer);
      controls.dispose();
      for (const entry of rendered.values()) {
        for (const object of entry.objects) {
          disposeObject(object);
        }
      }
      disposeObject(dimensionGroup);
      renderer.dispose();
      renderer.domElement.remove();
      renderedRef.current = new Map();
      resetViewRef.current = () => undefined;
    };
  }, [language, onSelectionChange, scene]);

  useEffect(() => {
    for (const [componentId, rendered] of renderedRef.current) {
      const visible = visibility[componentId] ?? false;
      for (const object of rendered.objects) {
        object.visible = visible;
      }
    }
  }, [visibility]);

  useEffect(() => {
    const clippingPlanes = cutaway
      ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]
      : [];
    for (const component of scene.components) {
      const rendered = renderedRef.current.get(component.componentId);
      if (rendered === undefined) {
        continue;
      }
      for (const material of rendered.materials) {
        material.clippingPlanes = clippingPlanes;
        material.opacity = Math.max(0.05, component.defaultOpacity * globalOpacity);
        material.transparent = material.opacity < 1;
        material.depthWrite = material.opacity >= 0.9;
        material.needsUpdate = true;
      }
    }
  }, [cutaway, globalOpacity, scene.components]);

  useEffect(() => {
    for (const [componentId, rendered] of renderedRef.current) {
      const selected = componentId === selectedComponentId;
      for (const material of rendered.materials) {
        material.emissive.setHex(selected ? 0x283a4c : 0x000000);
        material.emissiveIntensity = selected ? 0.32 : 0;
      }
    }
  }, [selectedComponentId]);

  const selectedComponent = useMemo(
    () =>
      scene.components.find(
        (component) => component.componentId === selectedComponentId,
      ) ?? null,
    [scene.components, selectedComponentId],
  );
  const selectedDimensions = useMemo(
    () =>
      selectedComponentId === null
        ? []
        : scene.dimensions.filter(
            (dimension) => dimension.componentId === selectedComponentId,
          ),
    [scene.dimensions, selectedComponentId],
  );
  const zh = language === "zh-CN";

  return (
    <section style={rootStyle} aria-label={zh ? "参数化三维工程示意" : "Parametric 3D engineering schematic"}>
      <div style={toolbarStyle}>
        <button type="button" onClick={() => resetViewRef.current()}>
          {zh ? "复位视角" : "Reset view"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={cutaway}
            onChange={(event) => setCutaway(event.currentTarget.checked)}
          />{" "}
          {zh ? "剖切显示" : "Cutaway"}
        </label>
        <label>
          {zh ? "整体透明度" : "Overall opacity"}{" "}
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={globalOpacity}
            onChange={(event) => setGlobalOpacity(Number(event.currentTarget.value))}
          />
        </label>
        {scene.components.map((component, index) => (
          <label key={component.componentId} htmlFor={`scene-layer-${String(index)}`}>
            <input
              id={`scene-layer-${String(index)}`}
              type="checkbox"
              checked={visibility[component.componentId] ?? false}
              onChange={(event) =>
                setVisibility((current) => ({
                  ...current,
                  [component.componentId]: event.currentTarget.checked,
                }))
              }
            />{" "}
            {zh ? component.labelZh : component.labelEn}
          </label>
        ))}
      </div>

      <div style={{ ...viewportStyle, height }}>
        <div style={watermarkStyle} aria-label="可视化来源说明">
          示意图 / Schematic · 非 FEM 场
        </div>
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
        {renderFailure === null ? null : (
          <p
            role="alert"
            style={{
              position: "absolute",
              inset: "50% auto auto 50%",
              width: "min(32rem, calc(100% - 2rem))",
              margin: 0,
              padding: "1rem",
              transform: "translate(-50%, -50%)",
              border: "1px solid #b45309",
              borderRadius: "0.5rem",
              background: "rgba(255, 251, 235, 0.96)",
              color: "#78350f",
            }}
          >
            {renderFailure}
          </p>
        )}
        <aside
          style={{
            position: "absolute",
            zIndex: 3,
            right: "0.75rem",
            bottom: "0.75rem",
            width: "min(19rem, calc(100% - 1.5rem))",
            padding: "0.7rem",
            border: "1px solid rgba(73, 86, 103, 0.4)",
            borderRadius: "0.5rem",
            background: "rgba(255, 255, 255, 0.9)",
          }}
          aria-live="polite"
        >
          <strong>
            {selectedComponent === null
              ? zh
                ? "点击部件查看尺寸"
                : "Select a component for dimensions"
              : zh
                ? selectedComponent.labelZh
                : selectedComponent.labelEn}
          </strong>
          {selectedDimensions.length > 0 ? (
            <dl style={{ margin: "0.45rem 0 0", display: "grid", gap: "0.3rem" }}>
              {selectedDimensions.map((dimension) => (
                <div key={dimension.annotationId}>
                  <dt style={{ display: "inline" }}>
                    {zh ? dimension.labelZh : dimension.labelEn}：
                  </dt>
                  <dd style={{ display: "inline", margin: 0 }}>
                    {formatMillimetres(dimension.valueM)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </aside>
      </div>

      <p style={{ margin: 0, color: "#4b5563", fontSize: "0.92rem" }}>
        {zh
          ? "鼠标拖动旋转，滚轮缩放。颜色、透明度和剖切仅用于识别几何部件，不代表温度、电磁场或求解精度。"
          : "Drag to rotate and use the wheel to zoom. Colours, opacity and cutaway identify geometry only; they are not solved fields."}
      </p>
    </section>
  );
}
