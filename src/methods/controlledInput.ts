export type ControlledInputRecord = Readonly<Record<string, unknown>>;

/**
 * Copy an exact plain data record without executing getters or reading through
 * a Proxy `get` trap. Any hostile reflection trap, accessor, symbol key,
 * duplicate expected key, prototype other than Object/null, missing field, or
 * extra field fails closed as null.
 */
export function readExactPlainDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
): ControlledInputRecord | null {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      new Set(expectedKeys).size !== expectedKeys.length
    ) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string") ||
      !expectedKeys.every((key) => ownKeys.includes(key))
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output = Object.create(null) as Record<string, unknown>;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      Object.defineProperty(output, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
}
