import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Plugin } from "vite";

import { VERSION_INFO } from "../config/versions.js";

export type BuildKind =
  | "standard-static"
  | "portable-offline"
  | "v0.9-ui-standard-static"
  | "v0.9-ui-portable-offline";

export type ReleaseManifestScope =
  | "phase_1_foundation_core_only"
  | "v0_9_test_release_ui";

export interface ReleaseManifestPluginOptions {
  readonly scope?: ReleaseManifestScope;
}

export const V0_9_RELEASE_PROFILE = "v0.9-test" as const;
export const V0_9_ACCEPTANCE_BOUNDARY =
  "automated_release_gate_with_manual_clean_pc_acceptance_pending" as const;
export const V0_9_KNOWN_LIMITATIONS_FILE =
  "V0_9_KNOWN_LIMITATIONS.md" as const;
export const V0_9_KNOWN_LIMITATIONS_TEXT = `# 0.9 测试版已知限制

- 本版本用于工程试算和工作流程验证，不代替持证工程师审核、设备厂家限值或现场安全确认。
- 只有界面中明确可计算的功能才会输出数值；结果必须与同页显示的假设、适用范围和警告一起使用。
- 尚未发布可直接套用的通用材料物性默认值；要求物性的计算需由用户提供与实际材料和工况一致的可核验数据。
- 参数化三维功能用于几何查看和数据交换，离线包不内置电磁或热流体有限元求解器。
- 方法比较仅并列显示可比结果，不在证据不足时自动给出“最优”或“推荐”结论。
- 正式签名工程报告、安装包签名和全新电脑人工验收记录不在本测试包内；在完成该验收前，不应宣称为最终正式发布版。
- 未导出的页面输入会在刷新、关闭或浏览器清理后丢失；重要基础表单和工程方案应及时导出文件并备份。
`;

type BundleItem =
  | { readonly type: "chunk"; readonly code: string }
  | { readonly type: "asset"; readonly source: string | Uint8Array };

function contentBytes(item: BundleItem): Uint8Array {
  if (item.type === "chunk") {
    return utf8ToBytes(item.code);
  }
  return typeof item.source === "string" ? utf8ToBytes(item.source) : new Uint8Array(item.source);
}

function isPortableBuild(buildKind: BuildKind): boolean {
  return (
    buildKind === "portable-offline" ||
    buildKind === "v0.9-ui-portable-offline"
  );
}

function isUiBuild(buildKind: BuildKind): boolean {
  return (
    buildKind === "v0.9-ui-standard-static" ||
    buildKind === "v0.9-ui-portable-offline"
  );
}

export function releaseManifestPlugin(
  buildKind: BuildKind,
  options: ReleaseManifestPluginOptions = {},
): Plugin {
  const scope = options.scope ?? "phase_1_foundation_core_only";
  const isV09UiRelease =
    isUiBuild(buildKind) && scope === "v0_9_test_release_ui";

  return {
    name: `ih-ec-release-manifest-${buildKind}`,
    enforce: "post",
    buildStart() {
      if (isV09UiRelease) {
        this.emitFile({
          type: "asset",
          fileName: V0_9_KNOWN_LIMITATIONS_FILE,
          source: V0_9_KNOWN_LIMITATIONS_TEXT,
        });
      }
    },
    generateBundle(_options, bundle) {
      const files = Object.entries(bundle)
        .map(([fileName, item]) => {
          const bytes = contentBytes(item);
          return {
            file: fileName.replaceAll("\\", "/"),
            bytes: bytes.byteLength,
            sha256: bytesToHex(sha256(bytes)),
          };
        })
        .sort((left, right) => left.file.localeCompare(right.file));

      this.emitFile({
        type: "asset",
        fileName: "release-manifest.json",
        source: `${JSON.stringify(
          {
            manifestSchemaVersion: "1.0.0-alpha.1",
            buildKind,
            versions: VERSION_INFO,
            runtimeNetworkRequired: false,
            runtimeLocalFetchRequired: false,
            runtimeModuleLoading:
              isPortableBuild(buildKind) ? "none_iife" : "static_es_module",
            scope,
            ...(isV09UiRelease
              ? {
                  releaseProfile: V0_9_RELEASE_PROFILE,
                  acceptanceBoundary: V0_9_ACCEPTANCE_BOUNDARY,
                  knownLimitationsFile: V0_9_KNOWN_LIMITATIONS_FILE,
                }
              : {}),
            files,
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}
