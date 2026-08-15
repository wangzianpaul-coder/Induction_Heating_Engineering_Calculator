import { describe, expect, it } from "vitest";

import {
  assertWarningRecord,
  createWarningRecord,
  hasBlockingWarning,
  isBlockingSeverity,
} from "../../src/domain/warning.js";

function warningInput(overrides: Record<string, unknown> = {}) {
  return {
    warningId: "WARN.TEST.DOMAIN",
    severity: "warning" as const,
    moduleId: "B",
    methodId: "B-01",
    parameterIds: ["coil.current_path_diameter"],
    predicate: "coil.current_path_diameter_assumed_from_mean_diameter",
    observedValues: {
      currentPathDiameterSource: "derived_default",
      meanDiameterSi: 0.4,
    },
    message: "The current-centroid path was not independently established.",
    engineeringConsequence: "Inductance uncertainty may be understated.",
    recommendedAction: "Confirm the current centroid or retain the stated limitation.",
    sourceRefs: ["CALCULATION_CONTRACTS:B-01"],
    blocksResult: false,
    ...overrides,
  };
}

describe("WarningRecord", () => {
  it("creates a deeply frozen, JSON-round-trippable warning with stable evidence", () => {
    const warning = createWarningRecord(warningInput());

    expect(warning.warningId).toBe("WARN.TEST.DOMAIN");
    expect(warning.observedValues.meanDiameterSi).toBe(0.4);
    expect(warning.blocksResult).toBe(false);
    expect(Object.isFrozen(warning)).toBe(true);
    expect(Object.isFrozen(warning.observedValues)).toBe(true);
    expect(Object.isFrozen(warning.sourceRefs)).toBe(true);
    expect(JSON.parse(JSON.stringify(warning))).toEqual(warning);
    expect(() => assertWarningRecord(warning)).not.toThrow();
  });

  it("makes blocking and fatal severities result-blocking", () => {
    const blocking = createWarningRecord(
      warningInput({ severity: "blocking", blocksResult: true }),
    );
    const fatal = createWarningRecord(
      warningInput({ warningId: "WARN.TEST.FATAL", severity: "fatal", blocksResult: true }),
    );

    expect(isBlockingSeverity("blocking")).toBe(true);
    expect(isBlockingSeverity("fatal")).toBe(true);
    expect(isBlockingSeverity("warning")).toBe(false);
    expect(hasBlockingWarning([blocking])).toBe(true);
    expect(hasBlockingWarning([fatal])).toBe(true);
  });

  it("rejects inconsistent severity/blocking combinations", () => {
    expect(() =>
      createWarningRecord(warningInput({ severity: "blocking", blocksResult: false })),
    ).toThrow(/blocksResult=true/);
    expect(() =>
      createWarningRecord(warningInput({ severity: "warning", blocksResult: true })),
    ).toThrow(/blocksResult=false/);
  });

  it("rejects unstable IDs, missing observations/sources, and non-finite evidence", () => {
    expect(() =>
      createWarningRecord(warningInput({ warningId: "warning with spaces" })),
    ).toThrow(/stable/);
    expect(() => createWarningRecord(warningInput({ observedValues: {} }))).toThrow(
      /at least one value/,
    );
    expect(() => createWarningRecord(warningInput({ sourceRefs: [] }))).toThrow(
      /at least one controlled source/,
    );
    expect(() =>
      createWarningRecord(
        warningInput({ observedValues: { residual: Number.POSITIVE_INFINITY } }),
      ),
    ).toThrow(/non-finite/);
    expect(() =>
      createWarningRecord(
        warningInput({
          parameterIds: ["coil.inner_diameter", "coil.inner_diameter"],
        }),
      ),
    ).toThrow(/duplicates/);
  });

  it("cannot be bypassed with a forged cast at a runtime boundary", () => {
    const forged = {
      ...warningInput(),
      severity: "fatal",
      blocksResult: false,
    };
    expect(() => assertWarningRecord(forged)).toThrow(/blocksResult=true/);

    expect(() =>
      assertWarningRecord({
        ...warningInput(),
        uncontrolledLegacyField: "must-not-survive",
      }),
    ).toThrow(/controlled schema/);
  });
});
