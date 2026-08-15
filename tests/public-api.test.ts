import { describe, expect, it } from "vitest";

import * as publicApi from "../src/public-api.js";

function expectDeeplyFrozen(
  value: unknown,
  visited: Set<object> = new Set<object>(),
): void {
  if (value === null || typeof value !== "object" || visited.has(value)) {
    return;
  }
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) {
    expectDeeplyFrozen(nestedValue, visited);
  }
}

describe("controlled public API", () => {
  it("exposes production quantity constructors without the injectable factory", () => {
    expect(typeof publicApi.createScalarQuantity).toBe("function");
    expect(typeof publicApi.createUnavailableQuantity).toBe("function");
    expect("createControlledQuantityFactory" in publicApi).toBe(false);
  });

  it("publishes raw controlled catalogs only as recursively immutable values", () => {
    expectDeeplyFrozen(publicApi.METHOD_SPECIFICATIONS);
    expectDeeplyFrozen(publicApi.PARAMETER_RECORDS);

    const firstMethod = publicApi.METHOD_SPECIFICATIONS[0]!;
    expect(() => {
      (firstMethod.engineeringName as { en: string }).en = "forged";
    }).toThrow(TypeError);
    expect(() => {
      (firstMethod.sourceRefs as unknown as string[]).push("FORGED-SOURCE");
    }).toThrow(TypeError);

    const parameterWithDefault = publicApi.PARAMETER_RECORDS.find(
      (record) => record.default !== null,
    )!;
    expect(parameterWithDefault.default).not.toBeNull();
    expect(() => {
      (parameterWithDefault.default!.sourceRefs as unknown as string[]).push(
        "FORGED-SOURCE",
      );
    }).toThrow(TypeError);
  });
});
