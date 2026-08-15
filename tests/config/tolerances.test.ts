import { describe, expect, it } from "vitest";

import {
  isWithinTolId,
  TOL_ID,
  tolIdAbsoluteBound,
} from "../../src/config/tolerances.js";

describe("frozen TOL-ID", () => {
  it("implements abs_err <= 1e-12 * max(1, abs(reference_SI))", () => {
    expect(TOL_ID.id).toBe("TOL-ID");
    expect(tolIdAbsoluteBound(0)).toBe(1e-12);
    expect(tolIdAbsoluteBound(-4)).toBe(4e-12);
    expect(isWithinTolId(1 + Number.EPSILON, 1)).toBe(true);
    expect(isWithinTolId(1 + 2e-12, 1)).toBe(false);
  });

  it("rejects non-finite identity operands without becoming a solver tolerance", () => {
    expect(isWithinTolId(Number.NaN, 1)).toBe(false);
    expect(() => tolIdAbsoluteBound(Number.POSITIVE_INFINITY)).toThrow(
      /reference_SI must be finite/u,
    );
    expect(TOL_ID.purpose).toBe(
      "algebra_unit_round_trip_and_synthetic_identity",
    );
    expect(Object.isFrozen(TOL_ID)).toBe(true);
  });
});
