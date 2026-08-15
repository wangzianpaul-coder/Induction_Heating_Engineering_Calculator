/**
 * Stable semantic dimensions used at the calculation-core boundary.
 *
 * Dimension IDs intentionally distinguish quantity kinds that have the same
 * SI exponent vector (for example absolute temperature vs temperature
 * difference). This prevents mathematically dimensioned but semantically
 * invalid conversions.
 */
export const DIMENSION_IDS = Object.freeze([
  "dimensionless",
  "plane_angle",
  "length",
  "area",
  "volume",
  "mass",
  "time",
  "absolute_temperature",
  "temperature_difference",
  "frequency",
  "angular_frequency",
  "electric_current",
  "voltage",
  "electrical_resistance",
  "electrical_resistivity",
  "electrical_conductance",
  "electrical_conductivity",
  "inductance",
  "capacitance",
  "power",
  "energy",
  "pressure",
  "mass_flow_rate",
  "volume_flow_rate",
  "velocity",
  "acceleration",
  "force",
  "density",
  "dynamic_viscosity",
  "kinematic_viscosity",
  "thermal_diffusivity",
  "thermal_conductivity",
  "specific_heat_capacity",
  "specific_energy",
  "heat_capacity",
  "heat_transfer_coefficient",
  "heat_flux",
  "linear_power_density",
  "volumetric_heat_generation",
  "thermal_resistance",
  "areal_thermal_resistance",
  "inverse_temperature",
  "mass_flux",
  "electric_current_density",
  "electric_field_strength",
  "magnetic_flux",
  "magnetic_flux_density",
  "magnetic_field_strength",
  "magnetic_permeability",
  "amount_of_substance",
  "molar_mass",
  "luminous_intensity",
] as const);

export type DimensionId = (typeof DIMENSION_IDS)[number];

/**
 * Stable unit IDs. Symbols are metadata and may be Unicode; IDs remain
 * portable ASCII except for the explicitly controlled engineering spelling
 * `L/min`.
 */
export const UNIT_IDS = Object.freeze([
  "one",
  "percent",
  "rad",
  "deg",
  "m",
  "mm",
  "cm",
  "in",
  "m2",
  "mm2",
  "cm2",
  "in2",
  "m3",
  "L",
  "mL",
  "cm3",
  "kg",
  "g",
  "t",
  "s",
  "min",
  "h",
  "K",
  "degC",
  "delta_degC",
  "Hz",
  "kHz",
  "MHz",
  "rad_per_s",
  "A",
  "mA",
  "kA",
  "V",
  "mV",
  "kV",
  "ohm",
  "milliohm",
  "microohm",
  "ohm_m",
  "ohm_cm",
  "microohm_cm",
  "S",
  "S_per_m",
  "H",
  "mH",
  "uH",
  "F",
  "mF",
  "uF",
  "nF",
  "W",
  "kW",
  "MW",
  "var",
  "kvar",
  "VA",
  "kVA",
  "J",
  "kJ",
  "MJ",
  "kWh",
  "Pa",
  "kPa",
  "MPa",
  "bar",
  "kg_per_s",
  "kg_per_h",
  "m3_per_s",
  "m3_per_h",
  "L_per_s",
  "L/min",
  "m_per_s",
  "mm_per_s",
  "m_per_s2",
  "N",
  "kg_per_m3",
  "g_per_cm3",
  "Pa_s",
  "mPa_s",
  "cP",
  "kinematic_m2_per_s",
  "thermal_diffusivity_m2_per_s",
  "W_per_m_K",
  "J_per_kg_K",
  "kJ_per_kg_K",
  "J_per_kg",
  "kJ_per_kg",
  "J_per_K",
  "kJ_per_K",
  "W_per_m2_K",
  "kW_per_m2_K",
  "W_per_m2",
  "kW_per_m2",
  "W_per_m",
  "kW_per_m",
  "W_per_m3",
  "kW_per_m3",
  "K_per_W",
  "m2_K_per_W",
  "per_K",
  "kg_per_m2_s",
  "A_per_m2",
  "V_per_m",
  "Wb",
  "T",
  "mT",
  "A_per_m",
  "H_per_m",
  "mol",
  "kg_per_mol",
  "cd",
] as const);

export type UnitId = (typeof UNIT_IDS)[number];

const dimensionIdSet: ReadonlySet<string> = new Set(DIMENSION_IDS);
const unitIdSet: ReadonlySet<string> = new Set(UNIT_IDS);

export function isDimensionId(value: string): value is DimensionId {
  return dimensionIdSet.has(value);
}

export function dimensionId(value: string): DimensionId {
  if (!isDimensionId(value)) {
    throw new TypeError(`Unknown controlled dimension_id: ${value}`);
  }
  return value;
}

export function isUnitId(value: string): value is UnitId {
  return unitIdSet.has(value);
}

export function unitId(value: string): UnitId {
  if (!isUnitId(value)) {
    throw new TypeError(`Unknown controlled unit_id: ${value}`);
  }
  return value;
}
