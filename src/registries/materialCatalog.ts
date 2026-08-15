import { MaterialRegistry, type MaterialRecord } from "./materialRegistry.js";

/**
 * Gate 0 approves the schema, not any concrete material values. Candidate or
 * draft validation data must not be promoted into this release catalog.
 */
export const RELEASED_MATERIAL_RECORDS: readonly MaterialRecord[] = Object.freeze([]);

export const RELEASED_MATERIAL_REGISTRY = new MaterialRegistry(
  RELEASED_MATERIAL_RECORDS,
  "release",
);
