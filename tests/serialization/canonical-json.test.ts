import { describe, expect, it } from "vitest";

import {
  CanonicalJsonError,
  canonicalStringify,
  deepFreeze,
  fingerprint,
} from "../../src/serialization/canonical-json.js";

describe("canonical JSON", () => {
  it("sorts object keys recursively and normalizes negative zero", () => {
    expect(
      canonicalStringify({ z: -0, a: { y: 2, x: 1 }, b: [3, 2, 1] }),
    ).toBe('{"a":{"x":1,"y":2},"b":[3,2,1],"z":0}');
  });

  it("produces a stable SHA-256 content fingerprint", () => {
    const left = fingerprint({ b: 2, a: 1 });
    const right = fingerprint({ a: 1, b: 2 });

    expect(left).toEqual(right);
    expect(left.algorithm).toBe("sha256");
    expect(left.value).toMatch(/^[0-9a-f]{64}$/u);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite number %s",
    (value) => {
      expect(() => canonicalStringify({ value })).toThrow(CanonicalJsonError);
    },
  );

  it("rejects undefined values, class instances, and cycles", () => {
    expect(() => canonicalStringify({ missing: undefined })).toThrow(CanonicalJsonError);
    expect(() => canonicalStringify({ when: new Date() })).toThrow(CanonicalJsonError);

    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalStringify(cyclic)).toThrow(CanonicalJsonError);
  });

  it("rejects sparse arrays, accessors, symbol keys, and hidden fields", () => {
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = 1;
    expect(() => canonicalStringify(sparse)).toThrow(/sparse array/u);

    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => 1,
    });
    expect(() => canonicalStringify(accessor)).toThrow(/accessors/u);

    const symbolKey = { [Symbol("hidden")]: 1 };
    expect(() => canonicalStringify(symbolKey)).toThrow(/symbol key/u);

    const hidden = Object.defineProperty({}, "hidden", {
      enumerable: false,
      value: 1,
    });
    expect(() => canonicalStringify(hidden)).toThrow(/hidden fields/u);
  });

  it("deep-freezes nested arrays and records", () => {
    const value = deepFreeze({ nested: { values: [1, 2, 3] } });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(Object.isFrozen(value.nested.values)).toBe(true);
  });
});
