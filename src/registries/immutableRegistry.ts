export type RegistryId = string;

export interface ImmutableRegistryOptions<TId extends RegistryId, TRecord extends object> {
  readonly registryName: string;
  readonly idOf: (record: TRecord) => TId;
}

export class DuplicateRegistryIdError extends Error {
  public readonly registryName: string;
  public readonly duplicateId: string;

  public constructor(registryName: string, duplicateId: string) {
    super(`${registryName} contains duplicate id: ${duplicateId}`);
    this.name = "DuplicateRegistryIdError";
    this.registryName = registryName;
    this.duplicateId = duplicateId;
  }
}

export class UnknownRegistryIdError extends Error {
  public readonly registryName: string;
  public readonly unknownId: string;

  public constructor(registryName: string, unknownId: string) {
    super(`${registryName} does not contain id: ${unknownId}`);
    this.name = "UnknownRegistryIdError";
    this.registryName = registryName;
    this.unknownId = unknownId;
  }
}

/**
 * Clone plain registry metadata and recursively freeze the clone.
 *
 * Registries intentionally accept metadata only. Class instances, Map, Set and
 * other mutable containers are rejected so callers cannot retain a mutation
 * path into a registered record.
 */
export function cloneAndDeepFreeze<T>(value: T): T {
  return cloneAndDeepFreezeInternal(value, new WeakSet<object>());
}

function cloneAndDeepFreezeInternal<T>(
  value: T,
  ancestors: WeakSet<object>,
): T {
  if (value === null) {
    return value;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return value;
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Registry metadata numbers must be finite.");
    }
    return value;
  }
  if (valueType !== "object") {
    throw new TypeError(
      "Registry metadata primitives are limited to null, strings, booleans, and finite numbers.",
    );
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw new TypeError("Registry metadata must not contain cycles.");
  }
  ancestors.add(objectValue);

  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(objectValue) !== Array.prototype) {
        throw new TypeError("Registry metadata arrays must use Array.prototype.");
      }

      const ownKeys = Reflect.ownKeys(objectValue);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(objectValue, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > 0xffff_ffff ||
        lengthDescriptor.enumerable ||
        lengthDescriptor.configurable
      ) {
        throw new TypeError("Registry metadata arrays must have a standard length data property.");
      }

      const elements: Array<readonly [index: number, value: unknown]> = [];
      for (const key of ownKeys) {
        if (typeof key !== "string") {
          throw new TypeError("Registry metadata arrays must not contain symbol keys.");
        }
        if (key === "length") {
          continue;
        }

        const index = Number(key);
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= 0xffff_ffff ||
          String(index) !== key ||
          index >= lengthDescriptor.value
        ) {
          throw new TypeError("Registry metadata arrays must not contain custom properties.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
        if (descriptor === undefined) {
          throw new TypeError("Registry metadata arrays contain an unreadable element.");
        }
        if (!descriptor.enumerable) {
          throw new TypeError("Registry metadata arrays must not contain non-enumerable elements.");
        }
        if (!("value" in descriptor)) {
          throw new TypeError("Registry metadata arrays must not contain accessors.");
        }
        elements.push([index, descriptor.value]);
      }

      if (elements.length !== lengthDescriptor.value) {
        throw new TypeError("Registry metadata arrays must be dense.");
      }

      const clone: unknown[] = [];
      for (const [index, item] of elements) {
        Object.defineProperty(clone, String(index), {
          value: cloneAndDeepFreezeInternal(item, ancestors),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      return Object.freeze(clone) as T;
    }

    const prototype = Object.getPrototypeOf(objectValue) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(
        "Registry metadata must contain only primitives, arrays, and plain objects.",
      );
    }

    const clone: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(objectValue)) {
      if (typeof key !== "string") {
        throw new TypeError("Registry metadata must not contain symbol keys.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (descriptor === undefined) {
        throw new TypeError("Registry metadata contains an unreadable own property.");
      }
      if (!descriptor.enumerable) {
        throw new TypeError("Registry metadata must not contain non-enumerable properties.");
      }
      if (!("value" in descriptor)) {
        throw new TypeError("Registry metadata must not contain accessors.");
      }
      Object.defineProperty(clone, key, {
        value: cloneAndDeepFreezeInternal(descriptor.value, ancestors),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return Object.freeze(clone) as T;
  } finally {
    ancestors.delete(objectValue);
  }
}

/** A deterministic, read-only, fail-closed registry for controlled metadata. */
export class ImmutableRegistry<TId extends RegistryId, TRecord extends object> {
  readonly #registryName: string;
  readonly #idOf: (record: TRecord) => TId;
  readonly #records: readonly TRecord[];
  readonly #ids: readonly TId[];
  readonly #byId: ReadonlyMap<TId, TRecord>;

  public constructor(
    records: Iterable<TRecord>,
    options: ImmutableRegistryOptions<TId, TRecord>,
  ) {
    if (options.registryName.trim().length === 0) {
      throw new TypeError("Registry name must be non-empty.");
    }
    this.#registryName = options.registryName;
    this.#idOf = options.idOf;

    const byId = new Map<TId, TRecord>();
    const orderedRecords: TRecord[] = [];
    const orderedIds: TId[] = [];

    for (const candidate of records) {
      const frozenRecord = cloneAndDeepFreeze(candidate);
      const id = this.#idOf(frozenRecord);
      if (typeof id !== "string" || id.trim().length === 0) {
        throw new TypeError(`${this.#registryName} record IDs must be non-empty strings.`);
      }
      if (byId.has(id)) {
        throw new DuplicateRegistryIdError(this.#registryName, id);
      }
      byId.set(id, frozenRecord);
      orderedRecords.push(frozenRecord);
      orderedIds.push(id);
    }

    this.#byId = byId;
    this.#records = Object.freeze(orderedRecords);
    this.#ids = Object.freeze(orderedIds);
    if (new.target === ImmutableRegistry) {
      Object.freeze(this);
    }
  }

  public get registryName(): string {
    return this.#registryName;
  }

  public get size(): number {
    return this.#records.length;
  }

  public has(id: TId): boolean {
    return this.#byId.has(id);
  }

  public find(id: TId): TRecord | undefined {
    return this.#byId.get(id);
  }

  public get(id: TId): TRecord {
    const record = this.#byId.get(id);
    if (record === undefined) {
      throw new UnknownRegistryIdError(this.#registryName, id);
    }
    return record;
  }

  public ids(): readonly TId[] {
    return this.#ids;
  }

  public values(): readonly TRecord[] {
    return this.#records;
  }
}
