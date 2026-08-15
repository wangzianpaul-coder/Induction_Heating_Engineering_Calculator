import type { PortId, TopologyId } from "./ids.js";
import { portId, topologyId } from "./ids.js";

export const TOPOLOGY_IDS = Object.freeze([
  "series_rlc_single_loop",
  "parallel_ideal_r_l_c_branches",
  "parallel_c_with_series_rl_load",
  "ideal_transformer",
  "llc_zjl_fig2_6_fundamental_equivalent",
] as const);
export type ControlledTopologyId = (typeof TOPOLOGY_IDS)[number];

export const LOADED_STATES = Object.freeze([
  "empty",
  "workpiece_cold",
  "workpiece_hot",
  "measured_state",
  "user_defined_state",
] as const);
export type LoadedState = (typeof LOADED_STATES)[number];

export const QUANTITY_BASES = Object.freeze([
  "rms",
  "peak",
  "fundamental_rms",
  "full_wave_rms",
  "dc",
  "average",
  "local",
  "total",
] as const);
export type QuantityBasis = (typeof QUANTITY_BASES)[number];

export const PHASOR_CONVENTION = Object.freeze({
  amplitudeBasis: "rms",
  timeConvention: "exp_j_omega_t",
  currentDirection: "into_passive_port",
  complexPower: "S_equals_V_times_conjugate_I",
} as const);

export interface PortDefinition {
  readonly portId: PortId;
  readonly positiveTerminal: string;
  readonly negativeTerminal: string;
  readonly currentDirection: "into_passive_port";
  readonly quantityBasis: QuantityBasis;
  readonly loadedState: LoadedState;
  readonly frequencyHz: number;
  readonly referencePlane: string;
}

export interface TopologySelection {
  readonly topologyId: TopologyId;
  readonly controlledTopologyId: ControlledTopologyId;
  readonly designStateId: string;
  readonly ports: readonly PortDefinition[];
  readonly approvalStatus: "approved_with_limitation" | "deferred";
}

export function controlledTopologyId(value: string): TopologyId {
  if (
    typeof value !== "string" ||
    !(TOPOLOGY_IDS as readonly string[]).includes(value)
  ) {
    throw new TypeError(`Unknown controlled topology_id: ${String(value)}`);
  }
  return topologyId(value);
}

export function createPortDefinition(input: {
  readonly id: string;
  readonly positiveTerminal: string;
  readonly negativeTerminal: string;
  readonly quantityBasis: QuantityBasis;
  readonly loadedState: LoadedState;
  readonly frequencyHz: number;
  readonly referencePlane: string;
}): PortDefinition {
  if (input === null || typeof input !== "object") {
    throw new TypeError("A port definition must be an object.");
  }
  if (typeof input.id !== "string") {
    throw new TypeError("A port ID must be a stable string identifier.");
  }
  const normalizedPortId = portId(input.id);
  if (
    typeof input.positiveTerminal !== "string" ||
    input.positiveTerminal.trim().length === 0 ||
    typeof input.negativeTerminal !== "string" ||
    input.negativeTerminal.trim().length === 0
  ) {
    throw new TypeError("A port requires non-blank positive and negative terminal identifiers.");
  }
  if (!(QUANTITY_BASES as readonly unknown[]).includes(input.quantityBasis)) {
    throw new TypeError(`Unknown controlled quantity basis: ${String(input.quantityBasis)}`);
  }
  if (!(LOADED_STATES as readonly unknown[]).includes(input.loadedState)) {
    throw new TypeError(`Unknown controlled loaded state: ${String(input.loadedState)}`);
  }
  if (!Number.isFinite(input.frequencyHz) || input.frequencyHz <= 0) {
    throw new TypeError("A port frequency must be a positive finite SI value in Hz.");
  }
  if (input.positiveTerminal === input.negativeTerminal) {
    throw new TypeError("A port must have distinct positive and negative terminals.");
  }
  if (
    typeof input.referencePlane !== "string" ||
    input.referencePlane.trim().length === 0
  ) {
    throw new TypeError("A port reference plane is required.");
  }

  return Object.freeze({
    portId: normalizedPortId,
    positiveTerminal: input.positiveTerminal,
    negativeTerminal: input.negativeTerminal,
    currentDirection: "into_passive_port",
    quantityBasis: input.quantityBasis,
    loadedState: input.loadedState,
    frequencyHz: input.frequencyHz,
    referencePlane: input.referencePlane,
  });
}
