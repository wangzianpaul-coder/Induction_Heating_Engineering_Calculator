import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Script } from "node:vm";
import { parseAst } from "vite";

const root = process.cwd();
const RELEASE_MANIFEST_SCHEMA_VERSION = "1.0.0-alpha.1";
const EXPECTED_IMPLEMENTATION_PHASE = "v0_9_test_release";
const EXPECTED_TECHNICAL_FREEZE_ID = "IH-EC-V1-G0-2026-08-14-01";
const EXPECTED_UI_RELEASE_PROFILE = "v0.9-test";
const EXPECTED_UI_ACCEPTANCE_BOUNDARY =
  "automated_release_gate_with_manual_clean_pc_acceptance_pending";
const EXPECTED_KNOWN_LIMITATIONS_FILE = "V0_9_KNOWN_LIMITATIONS.md";
const EXPECTED_DOCUMENT_LANGUAGE = "zh-Hans";
const packageMetadata = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);

const UI_TARGETS = Object.freeze([
  Object.freeze({
    label: "Version 0.9 Test Release Standard UI",
    directory: resolve(root, "dist", "v0.9-ui-standard-static"),
    buildKind: "v0.9-ui-standard-static",
    moduleLoading: "static_es_module",
    htmlMode: "module",
  }),
  Object.freeze({
    label: "Version 0.9 Test Release Portable UI",
    directory: resolve(root, "dist", "v0.9-ui-portable-offline"),
    buildKind: "v0.9-ui-portable-offline",
    moduleLoading: "none_iife",
    htmlMode: "classic",
  }),
]);

const FOUNDATION_TARGETS = Object.freeze([
  Object.freeze({
    label: "Foundation Standard core",
    directory: resolve(root, "dist", "standard-static"),
    buildKind: "standard-static",
    moduleLoading: "static_es_module",
  }),
  Object.freeze({
    label: "Foundation Portable core",
    directory: resolve(root, "dist", "portable-offline"),
    buildKind: "portable-offline",
    moduleLoading: "none_iife",
  }),
]);

async function listArtifactFiles(directory, current = directory) {
  const output = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = resolve(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`${directory}: artifact directory contains a symbolic link.`);
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
    throw new Error(`${directory}: unsafe release-manifest path ${String(file)}.`);
  }
  const resolved = resolve(directory, ...file.split("/"));
  if (!resolved.startsWith(`${resolve(directory)}${sep}`)) {
    throw new Error(`${directory}: release-manifest path escapes its artifact directory.`);
  }
  return resolved;
}

async function verifyManifest(target, expectedScope) {
  const manifestPath = resolve(target.directory, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (
    manifest.manifestSchemaVersion !== RELEASE_MANIFEST_SCHEMA_VERSION ||
    manifest.buildKind !== target.buildKind ||
    manifest.scope !== expectedScope ||
    manifest.runtimeNetworkRequired !== false ||
    manifest.runtimeLocalFetchRequired !== false ||
    manifest.runtimeModuleLoading !== target.moduleLoading
  ) {
    throw new Error(`${target.label}: release-manifest identity or runtime policy is incorrect.`);
  }
  if (
    manifest.versions === null ||
    typeof manifest.versions !== "object" ||
    manifest.versions.application !== packageMetadata.version ||
    manifest.versions.implementationPhase !== EXPECTED_IMPLEMENTATION_PHASE ||
    manifest.versions.technicalFreezeId !== EXPECTED_TECHNICAL_FREEZE_ID ||
    !Array.isArray(manifest.files)
  ) {
    throw new Error(`${target.label}: release manifest is incomplete.`);
  }

  const isUiManifest = expectedScope === "v0_9_test_release_ui";
  if (
    isUiManifest &&
    (manifest.releaseProfile !== EXPECTED_UI_RELEASE_PROFILE ||
      manifest.acceptanceBoundary !== EXPECTED_UI_ACCEPTANCE_BOUNDARY ||
      manifest.knownLimitationsFile !== EXPECTED_KNOWN_LIMITATIONS_FILE)
  ) {
    throw new Error(
      `${target.label}: 0.9 test-release acceptance metadata is incorrect.`,
    );
  }
  if (
    !isUiManifest &&
    ["releaseProfile", "acceptanceBoundary", "knownLimitationsFile"].some((key) =>
      Object.hasOwn(manifest, key),
    )
  ) {
    throw new Error(
      `${target.label}: foundation manifest contains UI-only release metadata.`,
    );
  }

  const manifestNames = manifest.files.map((record) => record.file);
  if (new Set(manifestNames).size !== manifestNames.length) {
    throw new Error(`${target.label}: release manifest contains duplicate file records.`);
  }
  const actualNames = (await listArtifactFiles(target.directory)).filter(
    (file) => file !== "release-manifest.json",
  );
  if (JSON.stringify([...manifestNames].sort()) !== JSON.stringify(actualNames)) {
    throw new Error(`${target.label}: artifact files differ from the release manifest.`);
  }

  for (const record of manifest.files) {
    if (
      record === null ||
      typeof record !== "object" ||
      !Number.isInteger(record.bytes) ||
      record.bytes < 0 ||
      typeof record.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(record.sha256)
    ) {
      throw new Error(`${target.label}: release manifest contains an invalid file record.`);
    }
    const path = safeManifestPath(target.directory, record.file);
    const [bytes, fileStat] = await Promise.all([readFile(path), stat(path)]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (record.bytes !== fileStat.size || record.sha256 !== sha256) {
      throw new Error(`${target.label}: bytes/SHA-256 mismatch for ${record.file}.`);
    }
  }
  if (isUiManifest) {
    const knownLimitationsRecord = manifest.files.find(
      (record) => record.file === EXPECTED_KNOWN_LIMITATIONS_FILE,
    );
    if (knownLimitationsRecord === undefined) {
      throw new Error(
        `${target.label}: the known-limitations file is absent from the hashed manifest.`,
      );
    }
    const knownLimitationsText = await readFile(
      safeManifestPath(target.directory, manifest.knownLimitationsFile),
      "utf8",
    );
    if (
      !knownLimitationsText.startsWith("# 0.9 测试版已知限制") ||
      !/[\u3400-\u9fff]/u.test(knownLimitationsText) ||
      /\b(?:ADR|GEO|DER|ID)(?:[-_:]|\b)|\b[A-J]-\d{2}\b|phase_/iu.test(
        knownLimitationsText,
      )
    ) {
      throw new Error(
        `${target.label}: known limitations are not Chinese-first public release text.`,
      );
    }
  }

  return Object.freeze({ manifest, files: Object.freeze(actualNames) });
}

function tags(html, tagName) {
  return Array.from(html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "giu")), (match) => match[0]);
}

function attribute(tag, name) {
  const match = new RegExp(
    `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "iu",
  ).exec(tag);
  return match === null ? null : (match[1] ?? match[2] ?? match[3] ?? null);
}

function hasAttribute(tag, name) {
  return new RegExp(`\\s${name}(?:\\s|=|>)`, "iu").test(tag);
}

async function assertLocalReference(directory, reference, context) {
  if (
    typeof reference !== "string" ||
    reference.length === 0 ||
    reference.startsWith("/") ||
    reference.startsWith("\\") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(reference)
  ) {
    throw new Error(`${context}: asset reference must be relative.`);
  }
  const file = reference.split(/[?#]/u, 1)[0];
  const segments = file.split("/").filter((segment) => segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "" || segment === "..")) {
    throw new Error(`${context}: asset reference is empty or escapes the artifact directory.`);
  }
  const resolved = resolve(directory, ...segments);
  if (!resolved.startsWith(`${resolve(directory)}${sep}`)) {
    throw new Error(`${context}: asset reference escapes the artifact directory.`);
  }
  const fileStat = await stat(resolved);
  if (!fileStat.isFile()) {
    throw new Error(`${context}: referenced asset is not a file.`);
  }
  return resolved;
}

function openingTags(html) {
  return Array.from(
    html.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gu),
    (match) => Object.freeze({ name: match[1].toLowerCase(), source: match[0] }),
  );
}

function srcsetReferences(value) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/u, 1)[0])
    .filter((candidate) => candidate.length > 0);
}

async function verifyHtmlResourceReferences(html, directory, label) {
  for (const tag of openingTags(html)) {
    if (
      tag.name === "meta" &&
      attribute(tag.source, "http-equiv")?.toLowerCase() === "refresh"
    ) {
      throw new Error(`${label}: HTML meta refresh is prohibited.`);
    }
    for (const name of ["src", "href", "poster", "action", "formaction", "data", "xlink:href"]) {
      const reference = attribute(tag.source, name);
      if (reference === null || (name.endsWith("href") && reference.startsWith("#"))) {
        continue;
      }
      await assertLocalReference(
        directory,
        reference,
        `${label} <${tag.name}> ${name}`,
      );
    }
    for (const name of ["srcset", "imagesrcset"]) {
      const value = attribute(tag.source, name);
      if (value === null) {
        continue;
      }
      for (const reference of srcsetReferences(value)) {
        await assertLocalReference(
          directory,
          reference,
          `${label} <${tag.name}> ${name}`,
        );
      }
    }
    const inlineStyle = attribute(tag.source, "style");
    if (inlineStyle !== null) {
      await assertOfflineStylesheet(inlineStyle, directory, `${label} inline style`);
    }
  }
}

function verifyChineseFirstDocument(html, label) {
  const htmlTags = tags(html, "html");
  if (
    htmlTags.length !== 1 ||
    attribute(htmlTags[0], "lang") !== EXPECTED_DOCUMENT_LANGUAGE
  ) {
    throw new Error(`${label}: document language must be zh-Hans.`);
  }
  if (!/<title>\s*感应加热工程计算器(?:\s|\||<)/u.test(html)) {
    throw new Error(`${label}: document title is not Chinese-first.`);
  }
  if (!/<noscript\b[^>]*>[^<]*[\u3400-\u9fff][^<]*<\/noscript>/u.test(html)) {
    throw new Error(`${label}: Chinese no-script guidance is absent.`);
  }
}

async function verifyStandardHtml(directory) {
  const htmlPath = resolve(directory, "index.html");
  const html = await readFile(htmlPath, "utf8");
  verifyChineseFirstDocument(html, "Version 0.9 Test Release Standard UI");
  if (!/\bid\s*=\s*["']root["']/iu.test(html)) {
    throw new Error("Version 0.9 Test Release Standard UI: index.html has no #root mount element.");
  }
  await verifyHtmlResourceReferences(html, directory, "Version 0.9 Test Release Standard UI");
  const scriptTags = tags(html, "script");
  const moduleScripts = scriptTags.filter(
    (tag) => attribute(tag, "type")?.toLowerCase() === "module",
  );
  if (moduleScripts.length === 0) {
    throw new Error("Version 0.9 Test Release Standard UI: index.html has no module entry script.");
  }
  for (const tag of scriptTags) {
    const type = attribute(tag, "type");
    const src = attribute(tag, "src");
    if (type?.toLowerCase() !== "module" || src === null) {
      throw new Error("Version 0.9 Test Release Standard UI: every script must be a referenced ES module.");
    }
    await assertLocalReference(directory, src, "Version 0.9 Test Release Standard UI script");
  }

  const stylesheets = tags(html, "link").filter(
    (tag) => attribute(tag, "rel")?.toLowerCase() === "stylesheet",
  );
  if (stylesheets.length === 0) {
    throw new Error("Version 0.9 Test Release Standard UI: index.html has no local stylesheet.");
  }
  for (const tag of stylesheets) {
    await assertLocalReference(
      directory,
      attribute(tag, "href"),
      "Version 0.9 Test Release Standard UI stylesheet",
    );
  }
}

function parseJavaScript(source, label) {
  try {
    return parseAst(source);
  } catch (error) {
    throw new Error(
      `${label}: Vite parser rejected the JavaScript artifact: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function walkJavaScriptAst(rootNode, visitor) {
  const stack = [rootNode];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined || visitor(node) === false) {
      continue;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) {
          const child = value[index];
          if (child !== null && typeof child === "object" && typeof child.type === "string") {
            stack.push(child);
          }
        }
      } else if (value !== null && typeof value === "object" && typeof value.type === "string") {
        stack.push(value);
      }
    }
  }
}

function assertNoPortableRuntimeImports(source) {
  const ast = parseJavaScript(source, "Version 0.9 Test Release Portable UI");
  let prohibited = false;
  walkJavaScriptAst(ast, (node) => {
    if (
      node.type === "ImportDeclaration" ||
      node.type === "ImportExpression" ||
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration" ||
      node.type === "ExportAllDeclaration" ||
      (node.type === "MetaProperty" && node.meta?.name === "import")
    ) {
      prohibited = true;
      return false;
    }
    return true;
  });
  if (prohibited) {
    throw new Error("Version 0.9 Test Release Portable UI: runtime module syntax remains in the classic bundle.");
  }
}

function assertPortableIife(source) {
  const ast = parseJavaScript(source, "Version 0.9 Test Release Portable UI");
  const hasTopLevelIife = ast.body.some((statement) => {
    if (statement.type !== "ExpressionStatement") {
      return false;
    }
    const expression = statement.expression;
    return (
      expression?.type === "CallExpression" &&
      (expression.callee?.type === "FunctionExpression" ||
        expression.callee?.type === "ArrowFunctionExpression")
    );
  });
  if (!hasTopLevelIife) {
    throw new Error("Version 0.9 Test Release Portable UI: bundle is not a top-level IIFE.");
  }
}

function expressionPath(expression) {
  if (expression?.type === "ChainExpression") {
    return expressionPath(expression.expression);
  }
  if (expression?.type === "Identifier") {
    return expression.name;
  }
  if (
    expression?.type === "MemberExpression" ||
    expression?.type === "OptionalMemberExpression"
  ) {
    const parent = expressionPath(expression.object);
    const property = expression.computed
      ? expression.property?.type === "Literal" && typeof expression.property.value === "string"
        ? expression.property.value
        : null
      : expression.property?.type === "Identifier"
        ? expression.property.name
        : null;
    return parent === null || property === null ? null : `${parent}.${property}`;
  }
  return null;
}

function assertOfflineRuntimePolicy(source, label) {
  const ast = parseJavaScript(source, label);
  let prohibitedReason = null;
  walkJavaScriptAst(ast, (node) => {
    if (prohibitedReason !== null) {
      return false;
    }
    if (node.type === "ImportExpression") {
      prohibitedReason = "dynamic import";
      return false;
    }
    if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
      const path = expressionPath(node);
      if (/^(?:(?:globalThis|self|window)\.)?process\.env(?:\.|$)/u.test(path ?? "")) {
        prohibitedReason = "process.env runtime dependency";
        return false;
      }
      if (path?.includes("navigator.serviceWorker")) {
        prohibitedReason = "service worker";
        return false;
      }
    }
    if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
      const path = expressionPath(node.callee);
      const finalName = path?.split(".").at(-1);
      if (finalName === "fetch") {
        prohibitedReason = "fetch";
        return false;
      }
      if (finalName === "sendBeacon") {
        prohibitedReason = "sendBeacon";
        return false;
      }
      if (finalName === "importScripts") {
        prohibitedReason = "worker import";
        return false;
      }
      if (path?.includes("navigator.serviceWorker")) {
        prohibitedReason = "service worker";
        return false;
      }
    } else if (node.type === "NewExpression") {
      const constructorName = expressionPath(node.callee)?.split(".").at(-1);
      if (
        ["XMLHttpRequest", "WebSocket", "EventSource", "Worker", "SharedWorker"].includes(
          constructorName ?? "",
        )
      ) {
        prohibitedReason = constructorName;
        return false;
      }
    }
    return true;
  });
  if (prohibitedReason !== null) {
    throw new Error(`${label}: prohibited ${prohibitedReason} detected.`);
  }
}

function cssUrlReferences(source) {
  return Array.from(
    source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";]+))\s*\)/giu),
    (match) => match[1] ?? match[2] ?? match[3] ?? "",
  );
}

async function assertOfflineStylesheet(source, directory, label = "Version 0.9 Test Release UI stylesheet") {
  if (/@import\b/iu.test(source)) {
    throw new Error(`${label}: CSS @import is prohibited.`);
  }
  for (const reference of cssUrlReferences(source)) {
    if (reference.startsWith("data:") || reference.startsWith("#")) {
      continue;
    }
    await assertLocalReference(
      directory,
      reference,
      `${label} asset`,
    );
  }
}

async function verifyOfflinePolicySelfCheck() {
  assertOfflineRuntimePolicy(
    'const svgNamespace = "http://www.w3.org/2000/svg"; const diagnostic = "fetch(\\"./help\\") and process.env.NODE_ENV"; const issue = "lazy(() => import(\\"./MyComponent\\"))";',
    "offline-policy static namespace self-check",
  );
  assertOfflineRuntimePolicy(
    'if (typeof process === "object" && typeof process.emit === "function") { process.emit("error"); }',
    "offline-policy guarded browser fallback self-check",
  );
  assertNoPortableRuntimeImports(
    'const diagnostic = "lazy(() => import(\\"./MyComponent\\"))";',
  );
  assertPortableIife("(function () {})();");
  let rejectedNonIife = false;
  try {
    assertPortableIife("const value = 1;");
  } catch {
    rejectedNonIife = true;
  }
  if (!rejectedNonIife) {
    throw new Error("UI verifier IIFE self-check did not reject a non-IIFE script.");
  }
  for (const moduleSyntax of [
    'import "./module.js";',
    'import("./module.js");',
    "export const value = 1;",
  ]) {
    let rejected = false;
    try {
      assertNoPortableRuntimeImports(moduleSyntax);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("UI verifier module-syntax self-check did not reject a real import/export.");
    }
  }
  for (const prohibited of [
    'fetch("./data.json")',
    "new XMLHttpRequest()",
    "new window.XMLHttpRequest()",
    'new WebSocket("ws://localhost")',
    'new globalThis.EventSource("./events")',
    'navigator.sendBeacon("./telemetry")',
    "navigator.serviceWorker.register('./worker.js')",
    "importScripts('./worker-helper.js')",
    "process.env.NODE_ENV",
    "globalThis.process.env.NODE_ENV",
  ]) {
    let rejected = false;
    try {
      assertOfflineRuntimePolicy(prohibited, "offline-policy rejection self-check");
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("UI verifier offline-policy self-check did not reject a network runtime.");
    }
  }

  for (const [check, label] of [
    [
      () =>
        verifyHtmlResourceReferences(
          '<img src="https://cdn.example.test/image.png">',
          root,
          "self-check",
        ),
      "HTML image resource",
    ],
    [
      () =>
        verifyHtmlResourceReferences(
          '<link rel="preload" href="https://cdn.example.test/app.js">',
          root,
          "self-check",
        ),
      "HTML link resource",
    ],
    [
      () => assertOfflineStylesheet('@font-face{src:url("https://cdn.example.test/font.woff2")}', root),
      "CSS resource",
    ],
  ]) {
    let rejected = false;
    try {
      await check();
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(`UI verifier offline-policy self-check did not reject an external ${label}.`);
    }
  }
}

async function verifyRuntimeArtifactPolicy(target, files) {
  for (const file of files) {
    const path = safeManifestPath(target.directory, file);
    if (file.endsWith(".js")) {
      assertOfflineRuntimePolicy(
        await readFile(path, "utf8"),
        `${target.label} ${file}`,
      );
    } else if (file.endsWith(".css")) {
      await assertOfflineStylesheet(
        await readFile(path, "utf8"),
        dirname(path),
      );
    }
  }
}

async function verifyPortableHtmlAndBundle(directory) {
  const html = await readFile(resolve(directory, "index.html"), "utf8");
  verifyChineseFirstDocument(html, "Version 0.9 Test Release Portable UI");
  if (!/\bid\s*=\s*["']root["']/iu.test(html)) {
    throw new Error("Version 0.9 Test Release Portable UI: index.html has no #root mount element.");
  }
  await verifyHtmlResourceReferences(html, directory, "Version 0.9 Test Release Portable UI");
  const scriptTags = tags(html, "script");
  if (scriptTags.length !== 1) {
    throw new Error("Version 0.9 Test Release Portable UI: index.html must contain exactly one classic script.");
  }
  const scriptTag = scriptTags[0];
  const scriptType = attribute(scriptTag, "type");
  const scriptReference = attribute(scriptTag, "src");
  if (
    (scriptType !== null && scriptType.toLowerCase() !== "text/javascript") ||
    !hasAttribute(scriptTag, "defer") ||
    scriptReference !== "./ih-ec-ui.js"
  ) {
    throw new Error("Version 0.9 Test Release Portable UI: entry must be the deferred classic ./ih-ec-ui.js script.");
  }

  const stylesheets = tags(html, "link").filter(
    (tag) => attribute(tag, "rel")?.toLowerCase() === "stylesheet",
  );
  if (
    stylesheets.length !== 1 ||
    attribute(stylesheets[0], "href") !== "./ih-ec-ui.css"
  ) {
    throw new Error("Version 0.9 Test Release Portable UI: entry must reference ./ih-ec-ui.css exactly once.");
  }

  const scriptPath = await assertLocalReference(
    directory,
    scriptReference,
    "Version 0.9 Test Release Portable UI script",
  );
  const stylesheetPath = await assertLocalReference(
    directory,
    attribute(stylesheets[0], "href"),
    "Version 0.9 Test Release Portable UI stylesheet",
  );
  const [script, stylesheet] = await Promise.all([
    readFile(scriptPath, "utf8"),
    readFile(stylesheetPath, "utf8"),
  ]);

  try {
    new Script(script, { filename: "v0.9-ui-portable-offline/ih-ec-ui.js" });
  } catch (error) {
    throw new Error(
      `Version 0.9 Test Release Portable UI: bundle is not valid classic-script syntax: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assertNoPortableRuntimeImports(script);
  assertPortableIife(script);
  if (!script.includes("The UI root element is missing.")) {
    throw new Error("Version 0.9 Test Release Portable UI: self-starting #root mount evidence is absent.");
  }
  await assertOfflineStylesheet(stylesheet, directory, "Version 0.9 Test Release Portable UI stylesheet");
}

await verifyOfflinePolicySelfCheck();

const verifiedVersionMaps = [];

for (const target of FOUNDATION_TARGETS) {
  const verified = await verifyManifest(target, "phase_1_foundation_core_only");
  verifiedVersionMaps.push(verified.manifest.versions);
  if (!verified.files.includes("ih-ec-core.js")) {
    throw new Error(`${target.label}: existing core output was overwritten or removed.`);
  }
}

for (const target of UI_TARGETS) {
  const verified = await verifyManifest(target, "v0_9_test_release_ui");
  verifiedVersionMaps.push(verified.manifest.versions);
  for (const extension of [".html", ".css", ".js"]) {
    if (!verified.files.some((file) => file.endsWith(extension))) {
      throw new Error(`${target.label}: manifest has no ${extension} artifact.`);
    }
  }
  await verifyRuntimeArtifactPolicy(target, verified.files);
  if (target.htmlMode === "module") {
    await verifyStandardHtml(target.directory);
  } else {
    await verifyPortableHtmlAndBundle(target.directory);
  }
}

if (
  new Set(verifiedVersionMaps.map((versions) => JSON.stringify(versions))).size !== 1
) {
  throw new Error("Foundation and Runnable MVP UI manifests do not share one exact version map.");
}

process.stdout.write(
  "Version 0.9 test-release UI artifacts verified: Chinese-first Standard module HTML and Portable classic IIFE; release metadata, known-limitations hashes, relative assets, offline policy, and Foundation output isolation pass. Manual clean-PC acceptance remains pending.\n",
);
