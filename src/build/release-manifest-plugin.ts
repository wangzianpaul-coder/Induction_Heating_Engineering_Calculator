import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Plugin } from "vite";

import { VERSION_INFO } from "../config/versions.js";

export type BuildKind =
  | "standard-static"
  | "portable-offline"
  | "phase5-ui-standard-static"
  | "phase5-ui-portable-offline";

export type ReleaseManifestScope =
  | "phase_1_foundation_core_only"
  | "phase_5b_runnable_mvp_ui";

export interface ReleaseManifestPluginOptions {
  readonly scope?: ReleaseManifestScope;
}

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
    buildKind === "phase5-ui-portable-offline"
  );
}

export function releaseManifestPlugin(
  buildKind: BuildKind,
  options: ReleaseManifestPluginOptions = {},
): Plugin {
  const scope = options.scope ?? "phase_1_foundation_core_only";

  return {
    name: `ih-ec-release-manifest-${buildKind}`,
    enforce: "post",
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
            files,
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}
