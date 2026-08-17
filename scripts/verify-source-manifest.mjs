import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const workspaceRoot = process.cwd();
const manifestPath = resolve(workspaceRoot, "SOURCE_MANIFEST.csv");
const referencesRoot = resolve(workspaceRoot, "references");
const expectedHeader = ["relative_path", "bytes", "last_write_time", "sha256", "role"];
const expectedRecordCount = 48;
const allowedRoles = new Set([
  "derived-research-note",
  "legacy-reference",
  "primary-or-external-source-copy",
  "project-source-copy",
  "project-workbook-copy",
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        throw new Error("Malformed CSV: a quote begins inside an unquoted field.");
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      field = "";
      if (row.some((entry) => entry.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      field += character;
    }
  }
  if (quoted) {
    throw new Error("Malformed CSV: unterminated quoted field.");
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows;
}

function safeManifestFile(relativePath) {
  if (
    relativePath.length === 0 ||
    relativePath.startsWith("\\") ||
    /^[A-Za-z]:/u.test(relativePath) ||
    relativePath.split(/[\\/]/u).some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe SOURCE_MANIFEST relative_path: ${relativePath}.`);
  }
  const resolved = resolve(workspaceRoot, ...relativePath.split(/[\\/]/u));
  if (!resolved.startsWith(`${resolve(workspaceRoot)}${sep}`)) {
    throw new Error(`SOURCE_MANIFEST path escapes the workspace: ${relativePath}.`);
  }
  return resolved;
}

async function sha256File(path) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

async function listReferenceFiles(current = referencesRoot) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = resolve(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`references contains unsupported symbolic link: ${fullPath}.`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listReferenceFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(relative(workspaceRoot, fullPath).replaceAll("/", "\\"));
    }
  }
  return files.sort();
}

const manifestText = (await readFile(manifestPath, "utf8")).replace(/^\uFEFF/u, "");
const rows = parseCsv(manifestText);
const [header, ...records] = rows;
if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
  throw new Error("SOURCE_MANIFEST.csv header differs from the controlled schema.");
}
if (records.length !== expectedRecordCount) {
  throw new Error(
    `SOURCE_MANIFEST.csv contains ${String(records.length)} records; expected ${String(expectedRecordCount)}.`,
  );
}

const manifestFiles = [];
const seenPaths = new Set();
for (const [index, record] of records.entries()) {
  if (record.length !== expectedHeader.length) {
    throw new Error(`SOURCE_MANIFEST row ${String(index + 2)} has the wrong field count.`);
  }
  const [relativePath, bytesText, , expectedSha256, role] = record;
  if (
    relativePath === undefined ||
    bytesText === undefined ||
    expectedSha256 === undefined ||
    role === undefined
  ) {
    throw new Error(`SOURCE_MANIFEST row ${String(index + 2)} is incomplete.`);
  }
  if (seenPaths.has(relativePath)) {
    throw new Error(`SOURCE_MANIFEST contains duplicate path ${relativePath}.`);
  }
  seenPaths.add(relativePath);
  if (!allowedRoles.has(role)) {
    throw new Error(`SOURCE_MANIFEST path ${relativePath} has unknown role ${role}.`);
  }
  if (!/^[0-9a-f]{64}$/u.test(expectedSha256)) {
    throw new Error(`SOURCE_MANIFEST path ${relativePath} has invalid SHA-256 syntax.`);
  }
  const expectedBytes = Number(bytesText);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0) {
    throw new Error(`SOURCE_MANIFEST path ${relativePath} has invalid byte count.`);
  }

  const path = safeManifestFile(relativePath);
  const [fileStat, actualSha256] = await Promise.all([stat(path), sha256File(path)]);
  if (!fileStat.isFile()) {
    throw new Error(`SOURCE_MANIFEST path is not a file: ${relativePath}.`);
  }
  if (fileStat.size !== expectedBytes) {
    throw new Error(`SOURCE_MANIFEST byte mismatch for ${relativePath}.`);
  }
  if (actualSha256 !== expectedSha256) {
    throw new Error(`SOURCE_MANIFEST SHA-256 mismatch for ${relativePath}.`);
  }
  manifestFiles.push(relativePath);
}

const referenceFiles = await listReferenceFiles();
if (JSON.stringify([...manifestFiles].sort()) !== JSON.stringify(referenceFiles)) {
  throw new Error("The references tree differs from the exact SOURCE_MANIFEST path set.");
}

process.stdout.write(
  `Controlled source manifest verified: ${String(records.length)}/${String(expectedRecordCount)} files, bytes and SHA-256 digests match.\n`,
);
