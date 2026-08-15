import { describe, expect, it } from "vitest";

import {
  LOADED_STATES,
  PHASOR_CONVENTION,
  QUANTITY_BASES,
  TOPOLOGY_IDS,
  controlledTopologyId,
  createPortDefinition,
} from "../../src/domain/electrical.js";

describe("frozen electrical semantics", () => {
  it("contains exactly the five controlled topology IDs", () => {
    expect(TOPOLOGY_IDS).toEqual([
      "series_rlc_single_loop",
      "parallel_ideal_r_l_c_branches",
      "parallel_c_with_series_rl_load",
      "ideal_transformer",
      "llc_zjl_fig2_6_fundamental_equivalent",
    ]);
  });

  it("contains the frozen loaded states and phasor convention", () => {
    expect(LOADED_STATES).toEqual([
      "empty",
      "workpiece_cold",
      "workpiece_hot",
      "measured_state",
      "user_defined_state",
    ]);
    expect(PHASOR_CONVENTION).toMatchObject({
      amplitudeBasis: "rms",
      timeConvention: "exp_j_omega_t",
      currentDirection: "into_passive_port",
    });
  });

  it("rejects unknown topologies instead of guessing a netlist", () => {
    expect(() => controlledTopologyId("parallel_unspecified")).toThrow(
      /Unknown controlled topology_id/u,
    );
    expect(() => controlledTopologyId(42 as never)).toThrow(
      /Unknown controlled topology_id/u,
    );
  });

  it("requires a positive frequency, distinct terminals, and reference plane", () => {
    const port = createPortDefinition({
      id: "coil_terminal",
      positiveTerminal: "P",
      negativeTerminal: "N",
      quantityBasis: "fundamental_rms",
      loadedState: "workpiece_hot",
      frequencyHz: 10_000,
      referencePlane: "coil terminals after busbar de-embedding",
    });

    expect(port.frequencyHz).toBe(10_000);
    expect(Object.isFrozen(port)).toBe(true);
    expect(() =>
      createPortDefinition({
        id: "bad",
        positiveTerminal: "P",
        negativeTerminal: "P",
        quantityBasis: "rms",
        loadedState: "empty",
        frequencyHz: 0,
        referencePlane: "",
      }),
    ).toThrow();
  });

  it("rejects forged port IDs, bases, states, and terminal identifiers", () => {
    const valid = {
      id: "coil_terminal",
      positiveTerminal: "P",
      negativeTerminal: "N",
      quantityBasis: "rms" as const,
      loadedState: "empty" as const,
      frequencyHz: 10_000,
      referencePlane: "coil terminals",
    };

    expect(QUANTITY_BASES).toContain("rms");
    expect(() => createPortDefinition({ ...valid, id: 42 as never })).toThrow(/port ID/u);
    expect(() => createPortDefinition({ ...valid, id: "bad port id" })).toThrow(
      /stable non-empty machine identifier/u,
    );
    expect(() =>
      createPortDefinition({ ...valid, quantityBasis: "unspecified" as never }),
    ).toThrow(/quantity basis/u);
    expect(() =>
      createPortDefinition({ ...valid, loadedState: "warm" as never }),
    ).toThrow(/loaded state/u);
    expect(() => createPortDefinition({ ...valid, positiveTerminal: " " })).toThrow(
      /terminal identifiers/u,
    );
    expect(() => createPortDefinition({ ...valid, referencePlane: 42 as never })).toThrow(
      /reference plane/u,
    );
  });
});
