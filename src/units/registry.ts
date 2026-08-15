import { DIMENSION_DEFINITIONS } from "./dimensions.js";
import { UNIT_IDS, type DimensionId, type UnitId } from "./ids.js";

export type UnitConversionKind = "linear" | "affine";

export interface UnitDefinition {
  readonly id: UnitId;
  readonly dimensionIds: readonly DimensionId[];
  readonly symbol: string;
  /** Canonical value = source value * scaleToSI + offsetToSI. */
  readonly scaleToSI: number;
  /** Canonical value = source value * scaleToSI + offsetToSI. */
  readonly offsetToSI: number;
  readonly conversionKind: UnitConversionKind;
  readonly isCanonical: boolean;
}

function unit(
  id: UnitId,
  dimensionId: DimensionId | readonly DimensionId[],
  symbol: string,
  scaleToSI: number,
  offsetToSI = 0,
): UnitDefinition {
  if (!Number.isFinite(scaleToSI) || scaleToSI <= 0) {
    throw new TypeError(`Unit ${id} must have a positive finite SI scale.`);
  }
  if (!Number.isFinite(offsetToSI)) {
    throw new TypeError(`Unit ${id} must have a finite SI offset.`);
  }

  const dimensionIds = Object.freeze(
    typeof dimensionId === "string" ? [dimensionId] : [...dimensionId],
  );

  return Object.freeze({
    id,
    dimensionIds,
    symbol,
    scaleToSI,
    offsetToSI,
    conversionKind: offsetToSI === 0 ? "linear" : "affine",
    isCanonical: dimensionIds.some(
      (compatibleDimensionId) =>
        DIMENSION_DEFINITIONS[compatibleDimensionId].canonicalUnitId === id,
    ),
  });
}

export const UNIT_DEFINITIONS = Object.freeze({
  one: unit("one", "dimensionless", "1", 1),
  percent: unit("percent", "dimensionless", "%", 0.01),
  rad: unit("rad", "plane_angle", "rad", 1),
  deg: unit("deg", "plane_angle", "°", Math.PI / 180),

  m: unit("m", "length", "m", 1),
  mm: unit("mm", "length", "mm", 1e-3),
  cm: unit("cm", "length", "cm", 1e-2),
  in: unit("in", "length", "in", 0.0254),

  m2: unit("m2", "area", "m²", 1),
  mm2: unit("mm2", "area", "mm²", 1e-6),
  cm2: unit("cm2", "area", "cm²", 1e-4),
  in2: unit("in2", "area", "in²", 0.0254 ** 2),

  m3: unit("m3", "volume", "m³", 1),
  L: unit("L", "volume", "L", 1e-3),
  mL: unit("mL", "volume", "mL", 1e-6),
  cm3: unit("cm3", "volume", "cm³", 1e-6),

  kg: unit("kg", "mass", "kg", 1),
  g: unit("g", "mass", "g", 1e-3),
  t: unit("t", "mass", "t", 1e3),

  s: unit("s", "time", "s", 1),
  min: unit("min", "time", "min", 60),
  h: unit("h", "time", "h", 3600),

  K: unit("K", ["absolute_temperature", "temperature_difference"], "K", 1),
  degC: unit("degC", "absolute_temperature", "°C", 1, 273.15),
  delta_degC: unit("delta_degC", "temperature_difference", "°C", 1),

  Hz: unit("Hz", "frequency", "Hz", 1),
  kHz: unit("kHz", "frequency", "kHz", 1e3),
  MHz: unit("MHz", "frequency", "MHz", 1e6),
  rad_per_s: unit("rad_per_s", "angular_frequency", "rad/s", 1),

  A: unit("A", "electric_current", "A", 1),
  mA: unit("mA", "electric_current", "mA", 1e-3),
  kA: unit("kA", "electric_current", "kA", 1e3),

  V: unit("V", "voltage", "V", 1),
  mV: unit("mV", "voltage", "mV", 1e-3),
  kV: unit("kV", "voltage", "kV", 1e3),

  ohm: unit("ohm", "electrical_resistance", "Ω", 1),
  milliohm: unit("milliohm", "electrical_resistance", "mΩ", 1e-3),
  microohm: unit("microohm", "electrical_resistance", "µΩ", 1e-6),
  ohm_m: unit("ohm_m", "electrical_resistivity", "Ω·m", 1),
  ohm_cm: unit("ohm_cm", "electrical_resistivity", "Ω·cm", 1e-2),
  microohm_cm: unit("microohm_cm", "electrical_resistivity", "µΩ·cm", 1e-8),
  S: unit("S", "electrical_conductance", "S", 1),
  S_per_m: unit("S_per_m", "electrical_conductivity", "S/m", 1),

  H: unit("H", "inductance", "H", 1),
  mH: unit("mH", "inductance", "mH", 1e-3),
  uH: unit("uH", "inductance", "µH", 1e-6),
  F: unit("F", "capacitance", "F", 1),
  mF: unit("mF", "capacitance", "mF", 1e-3),
  uF: unit("uF", "capacitance", "µF", 1e-6),
  nF: unit("nF", "capacitance", "nF", 1e-9),

  W: unit("W", "power", "W", 1),
  kW: unit("kW", "power", "kW", 1e3),
  MW: unit("MW", "power", "MW", 1e6),
  var: unit("var", "power", "var", 1),
  kvar: unit("kvar", "power", "kvar", 1e3),
  VA: unit("VA", "power", "VA", 1),
  kVA: unit("kVA", "power", "kVA", 1e3),

  J: unit("J", "energy", "J", 1),
  kJ: unit("kJ", "energy", "kJ", 1e3),
  MJ: unit("MJ", "energy", "MJ", 1e6),
  kWh: unit("kWh", "energy", "kWh", 3.6e6),

  Pa: unit("Pa", "pressure", "Pa", 1),
  kPa: unit("kPa", "pressure", "kPa", 1e3),
  MPa: unit("MPa", "pressure", "MPa", 1e6),
  bar: unit("bar", "pressure", "bar", 1e5),

  kg_per_s: unit("kg_per_s", "mass_flow_rate", "kg/s", 1),
  kg_per_h: unit("kg_per_h", "mass_flow_rate", "kg/h", 1 / 3600),
  m3_per_s: unit("m3_per_s", "volume_flow_rate", "m³/s", 1),
  m3_per_h: unit("m3_per_h", "volume_flow_rate", "m³/h", 1 / 3600),
  L_per_s: unit("L_per_s", "volume_flow_rate", "L/s", 1e-3),
  "L/min": unit("L/min", "volume_flow_rate", "L/min", 1e-3 / 60),

  m_per_s: unit("m_per_s", "velocity", "m/s", 1),
  mm_per_s: unit("mm_per_s", "velocity", "mm/s", 1e-3),
  m_per_s2: unit("m_per_s2", "acceleration", "m/s²", 1),
  N: unit("N", "force", "N", 1),

  kg_per_m3: unit("kg_per_m3", "density", "kg/m³", 1),
  g_per_cm3: unit("g_per_cm3", "density", "g/cm³", 1e3),
  Pa_s: unit("Pa_s", "dynamic_viscosity", "Pa·s", 1),
  mPa_s: unit("mPa_s", "dynamic_viscosity", "mPa·s", 1e-3),
  cP: unit("cP", "dynamic_viscosity", "cP", 1e-3),
  kinematic_m2_per_s: unit("kinematic_m2_per_s", "kinematic_viscosity", "m²/s", 1),
  thermal_diffusivity_m2_per_s: unit(
    "thermal_diffusivity_m2_per_s",
    "thermal_diffusivity",
    "m²/s",
    1,
  ),

  W_per_m_K: unit("W_per_m_K", "thermal_conductivity", "W/(m·K)", 1),
  J_per_kg_K: unit("J_per_kg_K", "specific_heat_capacity", "J/(kg·K)", 1),
  kJ_per_kg_K: unit("kJ_per_kg_K", "specific_heat_capacity", "kJ/(kg·K)", 1e3),
  J_per_kg: unit("J_per_kg", "specific_energy", "J/kg", 1),
  kJ_per_kg: unit("kJ_per_kg", "specific_energy", "kJ/kg", 1e3),
  J_per_K: unit("J_per_K", "heat_capacity", "J/K", 1),
  kJ_per_K: unit("kJ_per_K", "heat_capacity", "kJ/K", 1e3),
  W_per_m2_K: unit("W_per_m2_K", "heat_transfer_coefficient", "W/(m²·K)", 1),
  kW_per_m2_K: unit("kW_per_m2_K", "heat_transfer_coefficient", "kW/(m²·K)", 1e3),
  W_per_m2: unit("W_per_m2", "heat_flux", "W/m²", 1),
  kW_per_m2: unit("kW_per_m2", "heat_flux", "kW/m²", 1e3),
  W_per_m: unit("W_per_m", "linear_power_density", "W/m", 1),
  kW_per_m: unit("kW_per_m", "linear_power_density", "kW/m", 1e3),
  W_per_m3: unit("W_per_m3", "volumetric_heat_generation", "W/m³", 1),
  kW_per_m3: unit("kW_per_m3", "volumetric_heat_generation", "kW/m³", 1e3),
  K_per_W: unit("K_per_W", "thermal_resistance", "K/W", 1),
  m2_K_per_W: unit("m2_K_per_W", "areal_thermal_resistance", "m²·K/W", 1),
  per_K: unit("per_K", "inverse_temperature", "1/K", 1),

  kg_per_m2_s: unit("kg_per_m2_s", "mass_flux", "kg/(m²·s)", 1),
  A_per_m2: unit("A_per_m2", "electric_current_density", "A/m²", 1),
  V_per_m: unit("V_per_m", "electric_field_strength", "V/m", 1),
  Wb: unit("Wb", "magnetic_flux", "Wb", 1),
  T: unit("T", "magnetic_flux_density", "T", 1),
  mT: unit("mT", "magnetic_flux_density", "mT", 1e-3),
  A_per_m: unit("A_per_m", "magnetic_field_strength", "A/m", 1),
  H_per_m: unit("H_per_m", "magnetic_permeability", "H/m", 1),

  mol: unit("mol", "amount_of_substance", "mol", 1),
  kg_per_mol: unit("kg_per_mol", "molar_mass", "kg/mol", 1),
  cd: unit("cd", "luminous_intensity", "cd", 1),
} satisfies Readonly<Record<UnitId, UnitDefinition>>);

export function getUnitDefinition(id: UnitId): UnitDefinition {
  return UNIT_DEFINITIONS[id];
}

export function getUnitsForDimension(dimensionId: DimensionId): readonly UnitDefinition[] {
  return Object.freeze(
    UNIT_IDS.map((id) => UNIT_DEFINITIONS[id]).filter(
      (definitionForUnit) => definitionForUnit.dimensionIds.includes(dimensionId),
    ),
  );
}

/** Fail-fast integrity check for the controlled dimension/unit registries. */
export function assertUnitRegistryIntegrity(): void {
  for (const id of UNIT_IDS) {
    const definitionForUnit = UNIT_DEFINITIONS[id];
    if (definitionForUnit.id !== id) {
      throw new Error(`Unit registry key/id mismatch for ${id}.`);
    }
  }

  for (const dimension of Object.values(DIMENSION_DEFINITIONS)) {
    const canonicalUnit = UNIT_DEFINITIONS[dimension.canonicalUnitId];
    if (!canonicalUnit.dimensionIds.includes(dimension.id)) {
      throw new Error(`Canonical unit ${canonicalUnit.id} does not belong to ${dimension.id}.`);
    }
    if (canonicalUnit.scaleToSI !== 1 || canonicalUnit.offsetToSI !== 0) {
      throw new Error(`Canonical unit ${canonicalUnit.id} must be identity-converted.`);
    }
    if (!canonicalUnit.isCanonical) {
      throw new Error(`Canonical unit ${canonicalUnit.id} is not marked canonical.`);
    }
  }
}

assertUnitRegistryIntegrity();
