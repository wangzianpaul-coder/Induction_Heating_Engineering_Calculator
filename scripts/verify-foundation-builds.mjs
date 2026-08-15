import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createContext, Script } from "node:vm";

const root = process.cwd();

async function listArtifactFiles(directory, current = directory) {
  const output = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = resolve(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Artifact directory contains unsupported symbolic link ${fullPath}.`);
    }
    if (entry.isDirectory()) {
      output.push(...(await listArtifactFiles(directory, fullPath)));
    } else if (entry.isFile()) {
      output.push(relative(directory, fullPath).replaceAll("\\", "/"));
    }
  }
  return output.sort();
}

function safeManifestPath(directory, file) {
  if (
    typeof file !== "string" ||
    file.length === 0 ||
    file.includes("\\") ||
    file.startsWith("/") ||
    file.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe release-manifest path: ${String(file)}.`);
  }
  const resolved = resolve(directory, ...file.split("/"));
  if (!resolved.startsWith(`${resolve(directory)}${sep}`)) {
    throw new Error(`Release-manifest path escapes artifact directory: ${file}.`);
  }
  return resolved;
}

async function readArtifact(kind) {
  const directory = resolve(root, "dist", kind);
  const bundlePath = resolve(directory, "ih-ec-core.js");
  const manifestPath = resolve(directory, "release-manifest.json");
  const [bundle, manifestText, bundleStat] = await Promise.all([
    readFile(bundlePath, "utf8"),
    readFile(manifestPath, "utf8"),
    stat(bundlePath),
  ]);
  const manifest = JSON.parse(manifestText);
  if (manifest.buildKind !== kind) {
    throw new Error(`${kind}: release manifest buildKind mismatch.`);
  }
  if (manifest.runtimeNetworkRequired !== false || manifest.runtimeLocalFetchRequired !== false) {
    throw new Error(`${kind}: release manifest permits runtime fetch/network access.`);
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error(`${kind}: release manifest has no files array.`);
  }
  const manifestNames = manifest.files.map((file) => file.file);
  if (new Set(manifestNames).size !== manifestNames.length) {
    throw new Error(`${kind}: release manifest contains duplicate file records.`);
  }
  const actualNames = (await listArtifactFiles(directory)).filter(
    (file) => file !== "release-manifest.json",
  );
  if (JSON.stringify([...manifestNames].sort()) !== JSON.stringify(actualNames)) {
    throw new Error(`${kind}: artifact files differ from the release manifest.`);
  }
  for (const record of manifest.files) {
    const path = safeManifestPath(directory, record.file);
    const [bytes, fileStat] = await Promise.all([readFile(path), stat(path)]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (record.bytes !== fileStat.size || record.sha256 !== sha256) {
      throw new Error(`${kind}: bytes/SHA-256 mismatch for ${record.file}.`);
    }
  }
  if (!manifest.files.some((file) => file.file === "ih-ec-core.js" && file.bytes === bundleStat.size)) {
    throw new Error(`${kind}: bundle is absent from the release manifest or byte count differs.`);
  }
  return bundle;
}

const standard = await readArtifact("standard-static");
const portable = await readArtifact("portable-offline");

if (!/export\s*\{/u.test(standard)) {
  throw new Error("standard-static: expected an ES-module export surface.");
}
try {
  new Script(portable, { filename: "portable-offline/ih-ec-core.js" });
} catch (error) {
  throw new Error(
    `portable-offline: bundle is not a self-contained classic script: ${error instanceof Error ? error.message : String(error)}`,
  );
}
if (
  /\bimport\b\s*(?:\(|["'{*])/u.test(portable) ||
  /\bimport\b\s+[A-Za-z_$][\w$]*(?:\s*,[^;]+)?\s+from\s*["']/u.test(portable)
) {
  throw new Error("portable-offline: runtime module import remains in the IIFE bundle.");
}
if (/\bfetch\s*\(/u.test(portable)) {
  throw new Error("portable-offline: runtime fetch remains in the bundle.");
}
if (/https?:\/\//u.test(portable)) {
  throw new Error("portable-offline: remote URL detected in the runtime bundle.");
}
if (!/IHEngineeringCalculatorCore/u.test(portable)) {
  throw new Error("portable-offline: expected self-contained IIFE global was not emitted.");
}

const portableContext = createContext(Object.create(null));
new Script(portable, {
  filename: "portable-offline/ih-ec-core.js",
}).runInContext(portableContext, { timeout: 5_000 });
const portableApi = portableContext.IHEngineeringCalculatorCore;
if (portableApi === null || typeof portableApi !== "object") {
  throw new Error("portable-offline: IIFE did not initialize its public API global.");
}

const standardEntryUrl = pathToFileURL(
  resolve(root, "dist", "standard-static", "ih-ec-core.js"),
);
standardEntryUrl.searchParams.set("verification", String(Date.now()));
const standardApi = await import(standardEntryUrl.href);
const standardExports = Object.keys(standardApi).sort();
const portableExports = Object.keys(portableApi).sort();
if (JSON.stringify(standardExports) !== JSON.stringify(portableExports)) {
  throw new Error("standard/portable: public API export surfaces differ.");
}
if (
  standardApi.TECHNICAL_FREEZE_ID !== "IH-EC-V1-G0-2026-08-14-01" ||
  portableApi.TECHNICAL_FREEZE_ID !== standardApi.TECHNICAL_FREEZE_ID
) {
  throw new Error("standard/portable: technical freeze identity mismatch.");
}
for (const [label, standardRegistry, portableRegistry, expectedSize] of [
  [
    "method specification",
    standardApi.METHOD_SPECIFICATION_REGISTRY,
    portableApi.METHOD_SPECIFICATION_REGISTRY,
    52,
  ],
  ["parameter", standardApi.PARAMETER_REGISTRY, portableApi.PARAMETER_REGISTRY, 67],
  [
    "released material",
    standardApi.RELEASED_MATERIAL_REGISTRY,
    portableApi.RELEASED_MATERIAL_REGISTRY,
    0,
  ],
]) {
  if (
    standardRegistry?.size !== expectedSize ||
    portableRegistry?.size !== expectedSize
  ) {
    throw new Error(
      `standard/portable: ${label} registry size does not equal ${String(expectedSize)}.`,
    );
  }
}

process.stdout.write(
  `Foundation artifacts verified: standard-static ES module and portable-offline IIFE; ${String(standardExports.length)} public exports match.\n`,
);
