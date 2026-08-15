import { describe, expect, it } from "vitest";

import {
  cloneAndDeepFreeze,
  DuplicateRegistryIdError,
  ImmutableRegistry,
  UnknownRegistryIdError,
} from "../../src/registries/immutableRegistry.js";

interface TestRecord {
  readonly id: string;
  readonly nested: {
    readonly tags: readonly string[];
  };
}

describe("ImmutableRegistry", () => {
  it("clones and deeply freezes controlled metadata", () => {
    const source: TestRecord = { id: "one", nested: { tags: ["initial"] } };
    const registry = new ImmutableRegistry([source], {
      registryName: "test",
      idOf: (record) => record.id,
    });

    (source.nested.tags as string[]).push("source-mutated");

    const registered = registry.get("one");
    expect(registered.nested.tags).toEqual(["initial"]);
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.nested)).toBe(true);
    expect(Object.isFrozen(registered.nested.tags)).toBe(true);
    expect(Object.isFrozen(registry.ids())).toBe(true);
    expect(Object.isFrozen(registry.values())).toBe(true);
    expect(() => (registered.nested.tags as string[]).push("forbidden")).toThrow();
  });

  it("rejects duplicate and unknown IDs", () => {
    const duplicate: TestRecord[] = [
      { id: "same", nested: { tags: [] } },
      { id: "same", nested: { tags: [] } },
    ];
    expect(
      () =>
        new ImmutableRegistry(duplicate, {
          registryName: "test",
          idOf: (record) => record.id,
        }),
    ).toThrow(DuplicateRegistryIdError);

    const registry = new ImmutableRegistry<TestRecord["id"], TestRecord>([], {
      registryName: "test",
      idOf: (record) => record.id,
    });
    expect(() => registry.get("missing")).toThrow(UnknownRegistryIdError);

    expect(
      () =>
        new ImmutableRegistry([{ id: "", nested: { tags: [] } }], {
          registryName: "test",
          idOf: (record) => record.id,
        }),
    ).toThrow(/IDs must be non-empty strings/u);
  });

  it("rejects mutable non-metadata containers", () => {
    interface InvalidRecord {
      readonly id: string;
      readonly mutable: Map<string, string>;
    }

    expect(
      () =>
        new ImmutableRegistry<"invalid", InvalidRecord>(
          [{ id: "invalid", mutable: new Map() }],
          { registryName: "test", idOf: () => "invalid" },
        ),
    ).toThrow(/plain objects/u);
  });

  it.each([
    ["undefined", undefined],
    ["bigint", 1n],
    ["symbol", Symbol("unsafe")],
    ["function", () => undefined],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
  ])("rejects the non-JSON primitive %s", (_label, unsafe) => {
    expect(() => cloneAndDeepFreeze({ unsafe })).toThrow(TypeError);
  });

  it("rejects cycles while deterministically cloning shared acyclic values", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => cloneAndDeepFreeze(cyclic)).toThrow(/cycles/u);

    const shared = { value: 1 };
    const frozen = cloneAndDeepFreeze({ left: shared, right: shared });
    expect(frozen).toEqual({ left: { value: 1 }, right: { value: 1 } });
    expect(frozen.left).not.toBe(frozen.right);
    expect(Object.isFrozen(frozen.left)).toBe(true);
    expect(JSON.stringify(frozen)).toBe('{"left":{"value":1},"right":{"value":1}}');
  });

  it("rejects symbol keys that JSON serialization would silently omit", () => {
    const keyed = { id: "unsafe", [Symbol("hidden")]: "value" };
    expect(() => cloneAndDeepFreeze(keyed)).toThrow(/symbol keys/u);
  });

  it("rejects accessors and non-enumerable metadata instead of silently losing it", () => {
    const accessor = Object.defineProperty({ id: "unsafe" }, "computed", {
      enumerable: true,
      get: () => "value",
    });
    expect(() => cloneAndDeepFreeze(accessor)).toThrow(/accessors/u);

    const hidden = Object.defineProperty({ id: "unsafe" }, "hidden", {
      enumerable: false,
      value: "value",
    });
    expect(() => cloneAndDeepFreeze(hidden)).toThrow(/non-enumerable/u);
  });

  it("clones array elements from data descriptors without executing accessors or get traps", () => {
    const accessorArray = ["safe"];
    let accessorReads = 0;
    Object.defineProperty(accessorArray, "0", {
      configurable: true,
      enumerable: true,
      get() {
        accessorReads += 1;
        return "accessor-state";
      },
    });

    expect(() => cloneAndDeepFreeze(accessorArray)).toThrow(/accessors/u);
    expect(accessorReads).toBe(0);

    let getTrapCalls = 0;
    let descriptorCalls = 0;
    const dualState = new Proxy(["get-state"], {
      get(target, key, receiver) {
        getTrapCalls += 1;
        return Reflect.get(target, key, receiver);
      },
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (key !== "0" || descriptor === undefined) {
          return descriptor;
        }
        descriptorCalls += 1;
        return { ...descriptor, value: "descriptor-state" };
      },
    });

    expect(cloneAndDeepFreeze(dualState)).toEqual(["descriptor-state"]);
    expect(getTrapCalls).toBe(0);
    expect(descriptorCalls).toBe(1);
  });

  it("rejects sparse, decorated, hidden, and custom-prototype arrays", () => {
    expect(() => cloneAndDeepFreeze(new Array<unknown>(1))).toThrow(/dense/u);

    const symbolKeyed = ["safe"];
    Object.defineProperty(symbolKeyed, Symbol("hidden"), {
      enumerable: true,
      value: "unsafe",
    });
    expect(() => cloneAndDeepFreeze(symbolKeyed)).toThrow(/symbol keys/u);

    const hiddenElement = ["safe"];
    Object.defineProperty(hiddenElement, "0", {
      configurable: true,
      enumerable: false,
      value: "unsafe",
      writable: true,
    });
    expect(() => cloneAndDeepFreeze(hiddenElement)).toThrow(/non-enumerable/u);

    const decorated = Object.assign(["safe"], { extra: "unsafe" });
    expect(() => cloneAndDeepFreeze(decorated)).toThrow(/custom properties/u);

    const customPrototype = ["safe"];
    Object.setPrototypeOf(customPrototype, Object.create(Array.prototype));
    expect(() => cloneAndDeepFreeze(customPrototype)).toThrow(/Array\.prototype/u);
  });

  it("clones a JSON __proto__ key as data without mutating the clone prototype", () => {
    const parsed = JSON.parse('{"__proto__":{"polluted":true},"id":"safe"}') as Record<
      string,
      unknown
    >;
    const frozen = cloneAndDeepFreeze(parsed);

    expect(Object.getPrototypeOf(frozen)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(frozen, "__proto__")).toBe(true);
    expect(frozen["__proto__"]).toEqual({ polluted: true });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});
