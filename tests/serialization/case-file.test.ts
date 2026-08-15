import { describe, expect, it } from "vitest";

import { parseCaseFile } from "../../src/serialization/case-file.js";

describe("case-file import boundary", () => {
  it("failure-closes non-text runtime input without throwing", () => {
    const parseUntrusted = parseCaseFile as unknown as (value: unknown) =>
      ReturnType<typeof parseCaseFile>;

    for (const value of [undefined, null, 42, {}, [], new Uint8Array([123])]) {
      expect(() => parseUntrusted(value)).not.toThrow();
      expect(parseUntrusted(value)).toEqual({
        status: "invalid_input",
        code: "invalid_input",
        message: "The selected case must be provided as JSON text.",
      });
    }
  });
});
