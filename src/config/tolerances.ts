/**
 * Frozen CALCULATION_CONTRACTS.md section 0.5 identity tolerance.
 *
 * TOL-ID is only for pure algebra, unit round-trips, and synthetic identity
 * checks. It is not an engineering, measurement, applicability, material, or
 * solver tolerance and must never be used to claim additional precision.
 */
export const TOL_ID = Object.freeze({
  id: "TOL-ID" as const,
  relativeFactor: 1e-12,
  referenceFloorSi: 1,
  purpose: "algebra_unit_round_trip_and_synthetic_identity" as const,
});

export function tolIdAbsoluteBound(referenceSi: number): number {
  if (typeof referenceSi !== "number" || !Number.isFinite(referenceSi)) {
    throw new TypeError("TOL-ID reference_SI must be finite.");
  }
  return (
    TOL_ID.relativeFactor *
    Math.max(TOL_ID.referenceFloorSi, Math.abs(referenceSi))
  );
}

export function isWithinTolId(actualSi: number, referenceSi: number): boolean {
  if (typeof actualSi !== "number" || !Number.isFinite(actualSi)) {
    return false;
  }
  return Math.abs(actualSi - referenceSi) <= tolIdAbsoluteBound(referenceSi);
}
