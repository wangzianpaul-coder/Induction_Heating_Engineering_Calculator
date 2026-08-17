import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface ContentFingerprint {
  readonly algorithm: "sha256";
  readonly value: string;
}

export class CanonicalJsonError extends TypeError {
  public constructor(message: string) {
    super(message);
    this.name = "CanonicalJsonError";
  }
}

function normalize(value: unknown, path: string, seen: Set<object>): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError(`${path} contains a non-finite number.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value !== "object") {
    throw new CanonicalJsonError(
      `${path} contains unsupported ${typeof value}; undefined, bigint, symbol, and function values are forbidden.`,
    );
  }

  if (seen.has(value)) {
    throw new CanonicalJsonError(`${path} contains a cyclic reference.`);
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new CanonicalJsonError(`${path} must use the standard Array prototype.`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        throw new CanonicalJsonError(`${path} has an invalid array length.`);
      }
      const length = lengthDescriptor.value;
      const descriptors = new Map<number, PropertyDescriptor>();
      for (const key of Reflect.ownKeys(value)) {
        if (key === "length") continue;
        if (typeof key !== "string") {
          throw new CanonicalJsonError(`${path} contains a symbol array key.`);
        }
        const index = Number(key);
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= length ||
          String(index) !== key
        ) {
          throw new CanonicalJsonError(`${path} contains a non-JSON array property.`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        ) {
          throw new CanonicalJsonError(
            `${path}[${key}] must be an enumerable data property; accessors are forbidden.`,
          );
        }
        descriptors.set(index, descriptor);
      }
      if (descriptors.size !== length) {
        throw new CanonicalJsonError(`${path} contains a sparse array slot.`);
      }
      const output: JsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors.get(index);
        if (descriptor === undefined || !("value" in descriptor)) {
          throw new CanonicalJsonError(
            `${path} contains a sparse array slot at index ${String(index)}.`,
          );
        }
        output.push(normalize(descriptor.value, `${path}[${index}]`, seen));
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalJsonError(
        `${path} must contain plain objects only; serialize class, Date, Map, and Set values explicitly.`,
      );
    }

    const keys: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new CanonicalJsonError(`${path} contains a symbol key.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new CanonicalJsonError(
          `${path}.${key} must be an enumerable JSON data property; accessors and hidden fields are forbidden.`,
        );
      }
      keys.push(key);
    }

    const output: Record<string, JsonValue> = {};
    for (const key of keys.sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new CanonicalJsonError(`${path}.${key} is not a stable data property.`);
      }
      output[key] = normalize(descriptor.value, `${path}.${key}`, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function normalizeJson(value: unknown): JsonValue {
  return normalize(value, "$", new Set<object>());
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

export function readableStableStringify(value: unknown): string {
  return `${JSON.stringify(normalizeJson(value), null, 2)}\n`;
}

export function fingerprint(value: unknown): ContentFingerprint {
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  return Object.freeze({
    algorithm: "sha256",
    value: bytesToHex(sha256(bytes)),
  });
}

export function deepFreeze<T>(value: T, seen = new Set<object>()): Readonly<T> {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value as Readonly<T>;
  }

  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}
