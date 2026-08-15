import type { DimensionId, UnitId } from "./ids.js";

/**
 * Fixed SI base-dimension order used everywhere in serialized dimension
 * vectors: mass, length, time, electric current, thermodynamic temperature,
 * amount of substance, luminous intensity.
 */
export const SI_BASE_DIMENSION_ORDER = Object.freeze([
  "mass",
  "length",
  "time",
  "electric_current",
  "thermodynamic_temperature",
  "amount_of_substance",
  "luminous_intensity",
] as const);

export type SIBaseDimension = (typeof SI_BASE_DIMENSION_ORDER)[number];

export type DimensionVector = readonly [
  mass: number,
  length: number,
  time: number,
  electricCurrent: number,
  thermodynamicTemperature: number,
  amountOfSubstance: number,
  luminousIntensity: number,
];

export interface DimensionDefinition {
  readonly id: DimensionId;
  readonly name: string;
  readonly vector: DimensionVector;
  readonly canonicalUnitId: UnitId;
}

function vector(
  mass: number,
  length: number,
  time: number,
  electricCurrent: number,
  thermodynamicTemperature: number,
  amountOfSubstance: number,
  luminousIntensity: number,
): DimensionVector {
  const components = [
    mass,
    length,
    time,
    electricCurrent,
    thermodynamicTemperature,
    amountOfSubstance,
    luminousIntensity,
  ] as const;

  if (!components.every(Number.isFinite)) {
    throw new TypeError("Dimension-vector exponents must be finite numbers.");
  }

  return Object.freeze(components);
}

function definition(
  id: DimensionId,
  name: string,
  dimensionVector: DimensionVector,
  canonicalUnitId: UnitId,
): DimensionDefinition {
  return Object.freeze({
    id,
    name,
    vector: dimensionVector,
    canonicalUnitId,
  });
}

const ZERO = vector(0, 0, 0, 0, 0, 0, 0);

export const DIMENSION_DEFINITIONS = Object.freeze({
  dimensionless: definition("dimensionless", "Dimensionless ratio", ZERO, "one"),
  plane_angle: definition("plane_angle", "Plane angle", ZERO, "rad"),
  length: definition("length", "Length", vector(0, 1, 0, 0, 0, 0, 0), "m"),
  area: definition("area", "Area", vector(0, 2, 0, 0, 0, 0, 0), "m2"),
  volume: definition("volume", "Volume", vector(0, 3, 0, 0, 0, 0, 0), "m3"),
  mass: definition("mass", "Mass", vector(1, 0, 0, 0, 0, 0, 0), "kg"),
  time: definition("time", "Time", vector(0, 0, 1, 0, 0, 0, 0), "s"),
  absolute_temperature: definition(
    "absolute_temperature",
    "Absolute thermodynamic temperature",
    vector(0, 0, 0, 0, 1, 0, 0),
    "K",
  ),
  temperature_difference: definition(
    "temperature_difference",
    "Temperature difference",
    vector(0, 0, 0, 0, 1, 0, 0),
    "K",
  ),
  frequency: definition("frequency", "Frequency", vector(0, 0, -1, 0, 0, 0, 0), "Hz"),
  angular_frequency: definition(
    "angular_frequency",
    "Angular frequency",
    vector(0, 0, -1, 0, 0, 0, 0),
    "rad_per_s",
  ),
  electric_current: definition(
    "electric_current",
    "Electric current",
    vector(0, 0, 0, 1, 0, 0, 0),
    "A",
  ),
  voltage: definition("voltage", "Electric potential", vector(1, 2, -3, -1, 0, 0, 0), "V"),
  electrical_resistance: definition(
    "electrical_resistance",
    "Electrical resistance",
    vector(1, 2, -3, -2, 0, 0, 0),
    "ohm",
  ),
  electrical_resistivity: definition(
    "electrical_resistivity",
    "Electrical resistivity",
    vector(1, 3, -3, -2, 0, 0, 0),
    "ohm_m",
  ),
  electrical_conductance: definition(
    "electrical_conductance",
    "Electrical conductance",
    vector(-1, -2, 3, 2, 0, 0, 0),
    "S",
  ),
  electrical_conductivity: definition(
    "electrical_conductivity",
    "Electrical conductivity",
    vector(-1, -3, 3, 2, 0, 0, 0),
    "S_per_m",
  ),
  inductance: definition("inductance", "Inductance", vector(1, 2, -2, -2, 0, 0, 0), "H"),
  capacitance: definition("capacitance", "Capacitance", vector(-1, -2, 4, 2, 0, 0, 0), "F"),
  power: definition("power", "Power", vector(1, 2, -3, 0, 0, 0, 0), "W"),
  energy: definition("energy", "Energy", vector(1, 2, -2, 0, 0, 0, 0), "J"),
  pressure: definition("pressure", "Pressure", vector(1, -1, -2, 0, 0, 0, 0), "Pa"),
  mass_flow_rate: definition(
    "mass_flow_rate",
    "Mass flow rate",
    vector(1, 0, -1, 0, 0, 0, 0),
    "kg_per_s",
  ),
  volume_flow_rate: definition(
    "volume_flow_rate",
    "Volume flow rate",
    vector(0, 3, -1, 0, 0, 0, 0),
    "m3_per_s",
  ),
  velocity: definition("velocity", "Velocity", vector(0, 1, -1, 0, 0, 0, 0), "m_per_s"),
  acceleration: definition(
    "acceleration",
    "Acceleration",
    vector(0, 1, -2, 0, 0, 0, 0),
    "m_per_s2",
  ),
  force: definition("force", "Force", vector(1, 1, -2, 0, 0, 0, 0), "N"),
  density: definition("density", "Mass density", vector(1, -3, 0, 0, 0, 0, 0), "kg_per_m3"),
  dynamic_viscosity: definition(
    "dynamic_viscosity",
    "Dynamic viscosity",
    vector(1, -1, -1, 0, 0, 0, 0),
    "Pa_s",
  ),
  kinematic_viscosity: definition(
    "kinematic_viscosity",
    "Kinematic viscosity",
    vector(0, 2, -1, 0, 0, 0, 0),
    "kinematic_m2_per_s",
  ),
  thermal_diffusivity: definition(
    "thermal_diffusivity",
    "Thermal diffusivity",
    vector(0, 2, -1, 0, 0, 0, 0),
    "thermal_diffusivity_m2_per_s",
  ),
  thermal_conductivity: definition(
    "thermal_conductivity",
    "Thermal conductivity",
    vector(1, 1, -3, 0, -1, 0, 0),
    "W_per_m_K",
  ),
  specific_heat_capacity: definition(
    "specific_heat_capacity",
    "Specific heat capacity",
    vector(0, 2, -2, 0, -1, 0, 0),
    "J_per_kg_K",
  ),
  specific_energy: definition(
    "specific_energy",
    "Specific energy or enthalpy",
    vector(0, 2, -2, 0, 0, 0, 0),
    "J_per_kg",
  ),
  heat_capacity: definition(
    "heat_capacity",
    "Heat capacity",
    vector(1, 2, -2, 0, -1, 0, 0),
    "J_per_K",
  ),
  heat_transfer_coefficient: definition(
    "heat_transfer_coefficient",
    "Heat-transfer coefficient",
    vector(1, 0, -3, 0, -1, 0, 0),
    "W_per_m2_K",
  ),
  heat_flux: definition("heat_flux", "Heat flux", vector(1, 0, -3, 0, 0, 0, 0), "W_per_m2"),
  linear_power_density: definition(
    "linear_power_density",
    "Linear power density",
    vector(1, 1, -3, 0, 0, 0, 0),
    "W_per_m",
  ),
  volumetric_heat_generation: definition(
    "volumetric_heat_generation",
    "Volumetric heat generation",
    vector(1, -1, -3, 0, 0, 0, 0),
    "W_per_m3",
  ),
  thermal_resistance: definition(
    "thermal_resistance",
    "Thermal resistance",
    vector(-1, -2, 3, 0, 1, 0, 0),
    "K_per_W",
  ),
  areal_thermal_resistance: definition(
    "areal_thermal_resistance",
    "Areal thermal resistance",
    vector(-1, 0, 3, 0, 1, 0, 0),
    "m2_K_per_W",
  ),
  inverse_temperature: definition(
    "inverse_temperature",
    "Inverse temperature",
    vector(0, 0, 0, 0, -1, 0, 0),
    "per_K",
  ),
  mass_flux: definition("mass_flux", "Mass flux", vector(1, -2, -1, 0, 0, 0, 0), "kg_per_m2_s"),
  electric_current_density: definition(
    "electric_current_density",
    "Electric current density",
    vector(0, -2, 0, 1, 0, 0, 0),
    "A_per_m2",
  ),
  electric_field_strength: definition(
    "electric_field_strength",
    "Electric field strength",
    vector(1, 1, -3, -1, 0, 0, 0),
    "V_per_m",
  ),
  magnetic_flux: definition("magnetic_flux", "Magnetic flux", vector(1, 2, -2, -1, 0, 0, 0), "Wb"),
  magnetic_flux_density: definition(
    "magnetic_flux_density",
    "Magnetic flux density",
    vector(1, 0, -2, -1, 0, 0, 0),
    "T",
  ),
  magnetic_field_strength: definition(
    "magnetic_field_strength",
    "Magnetic field strength",
    vector(0, -1, 0, 1, 0, 0, 0),
    "A_per_m",
  ),
  magnetic_permeability: definition(
    "magnetic_permeability",
    "Magnetic permeability",
    vector(1, 1, -2, -2, 0, 0, 0),
    "H_per_m",
  ),
  amount_of_substance: definition(
    "amount_of_substance",
    "Amount of substance",
    vector(0, 0, 0, 0, 0, 1, 0),
    "mol",
  ),
  molar_mass: definition("molar_mass", "Molar mass", vector(1, 0, 0, 0, 0, -1, 0), "kg_per_mol"),
  luminous_intensity: definition(
    "luminous_intensity",
    "Luminous intensity",
    vector(0, 0, 0, 0, 0, 0, 1),
    "cd",
  ),
} satisfies Readonly<Record<DimensionId, DimensionDefinition>>);

export function getDimensionDefinition(id: DimensionId): DimensionDefinition {
  return DIMENSION_DEFINITIONS[id];
}

export function dimensionVectorsEqual(left: DimensionVector, right: DimensionVector): boolean {
  return left.every((component, index) => component === right[index]);
}

export function addDimensionVectors(left: DimensionVector, right: DimensionVector): DimensionVector {
  return vector(
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
    left[3] + right[3],
    left[4] + right[4],
    left[5] + right[5],
    left[6] + right[6],
  );
}

export function subtractDimensionVectors(left: DimensionVector, right: DimensionVector): DimensionVector {
  return vector(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
    left[3] - right[3],
    left[4] - right[4],
    left[5] - right[5],
    left[6] - right[6],
  );
}

export function scaleDimensionVector(value: DimensionVector, exponent: number): DimensionVector {
  if (!Number.isFinite(exponent)) {
    throw new TypeError("A dimension-vector exponent multiplier must be finite.");
  }
  return vector(
    value[0] * exponent,
    value[1] * exponent,
    value[2] * exponent,
    value[3] * exponent,
    value[4] * exponent,
    value[5] * exponent,
    value[6] * exponent,
  );
}
