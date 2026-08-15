import { describe, expect, it } from "vitest";

import { parameterId } from "../../src/domain/ids.js";
import { DIMENSION_DEFINITIONS } from "../../src/units/dimensions.js";
import { UNIT_DEFINITIONS } from "../../src/units/registry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../src/registries/methodSpecificationRegistry.js";
import {
  PARAMETER_RECORDS,
  PARAMETER_REGISTRY,
  POWER_DISPLAY_UNIT_FAMILIES,
} from "../../src/registries/parameterCatalog.js";
import { ParameterRegistry } from "../../src/registries/parameterRegistry.js";

const REQUIRED_DICTIONARY_IDS = [
  "coil.inner_diameter",
  "coil.outer_diameter",
  "coil.mean_diameter",
  "coil.current_path_diameter",
  "conductor.radial_size",
  "conductor.axial_size",
  "coil.pitch_center",
  "coil.turn_clearance_axial",
  "coil.first_last_center_span",
  "coil.winding_envelope_length",
  "coil.electrical_turn_count",
  "coil.helix_revolution_count",
  "coil.helix_axial_advance",
  "coil.lead_length",
  "coil.turn_center_z[]",
  "coil.multilayer_mean_radius",
  "coil.multilayer_axial_length",
  "coil.multilayer_radial_build",
  "coil.layer_count",
  "workpiece.outer_diameter",
  "workpiece.inner_diameter",
  "workpiece.active_length",
  "insulation.inner_diameter",
  "insulation.outer_diameter",
  "thermal.radial_gap",
  "thermal.effective_length",
  "thermal.orientation",
  "thermal.gap_boundary",
  "conductor.shape",
  "conductor.outer_diameter",
  "conductor.inner_diameter",
  "conductor.wall_thickness",
  "conductor.metal_area",
  "coolant.flow_area",
  "coolant.wetted_perimeter",
  "coolant.hydraulic_diameter",
  "coolant.branch_count",
  "frequency",
  "resistivity",
  "relative_permeability",
  "skin_depth",
  "port.impedance",
  "port.req_series",
  "port.leq_series",
  "port.voltage_rms",
  "port.current_rms",
  "port.active_power",
  "port.reactive_power",
  "P_grid",
  "P_inverter_out",
  "P_coil_terminal",
  "P_workpiece_absorbed",
  "P_useful",
  "P_cu",
  "Q_loss_environment",
  "Q_pickup_to_coil",
  "Q_coolant",
  "P_other_cooled",
  "water.pressure_abs",
  "water.mass_flow",
  "water.volume_flow",
  "water.velocity",
  "water.bulk_temperature",
  "tube.inner_wall_temperature",
  "tube.outer_wall_temperature",
  "coil.mean_temperature",
  "saturation_margin_wall",
] as const;

describe("ParameterRegistry frozen dictionary catalog", () => {
  it("covers the required controlled parameter groups with unique canonical IDs", () => {
    expect(new Set(PARAMETER_REGISTRY.ids()).size).toBe(PARAMETER_REGISTRY.size);
    expect(PARAMETER_REGISTRY.size).toBe(REQUIRED_DICTIONARY_IDS.length);
    expect([...PARAMETER_REGISTRY.ids()].sort()).toEqual(
      [...REQUIRED_DICTIONARY_IDS].sort(),
    );
    for (const id of REQUIRED_DICTIONARY_IDS) {
      expect(PARAMETER_REGISTRY.has(parameterId(id)), id).toBe(true);
    }
  });

  it("has complete definition metadata and only known method consumers", () => {
    for (const record of PARAMETER_RECORDS) {
      expect(record.symbol.length, record.parameterId).toBeGreaterThan(0);
      expect(record.engineeringName.en.length, record.parameterId).toBeGreaterThan(0);
      expect(record.engineeringName.zh.length, record.parameterId).toBeGreaterThan(0);
      expect(record.definition.length, record.parameterId).toBeGreaterThan(0);
      expect(record.requirement.length, record.parameterId).toBeGreaterThan(0);
      expect(record.definitionSourceRefs.length, record.parameterId).toBeGreaterThan(0);
      expect(record.physicalRange.length, record.parameterId).toBeGreaterThan(0);
      expect(record.applicability.length, record.parameterId).toBeGreaterThan(0);
      expect(record.help.length, record.parameterId).toBeGreaterThan(0);
      expect("default" in record, record.parameterId).toBe(true);
      for (const consumer of record.consumingMethods) {
        expect(METHOD_SPECIFICATION_REGISTRY.has(consumer), `${record.parameterId} -> ${consumer}`).toBe(
          true,
        );
      }
    }
  });

  it("cross-validates canonical and display units against the central unit registry", () => {
    for (const record of PARAMETER_RECORDS) {
      expect(record.canonicalUnit, record.parameterId).toBe(
        DIMENSION_DEFINITIONS[record.dimension].canonicalUnitId,
      );
      for (const unit of record.allowedDisplayUnits) {
        expect(UNIT_DEFINITIONS[unit].dimensionIds, `${record.parameterId} -> ${unit}`).toContain(
          record.dimension,
        );
      }
    }

    const length = PARAMETER_RECORDS[0]!;
    expect(() =>
      new ParameterRegistry([{ ...length, canonicalUnit: "mm", allowedDisplayUnits: ["mm"] }]),
    ).toThrow(/canonical unit/u);
    expect(() =>
      new ParameterRegistry([{ ...length, allowedDisplayUnits: ["m", "Hz"] }]),
    ).toThrow(/incompatible/u);
    expect(() =>
      new ParameterRegistry([{ ...length, allowedDisplayUnits: ["mm"] }]),
    ).toThrow(/canonical unit/u);

    expect(PARAMETER_REGISTRY.get(parameterId("coil.inner_diameter")).allowedDisplayUnits).toEqual(
      expect.arrayContaining(["m", "mm", "in"]),
    );
    expect(PARAMETER_REGISTRY.get(parameterId("frequency")).allowedDisplayUnits).toEqual(
      expect.arrayContaining(["Hz", "kHz"]),
    );

    expect(POWER_DISPLAY_UNIT_FAMILIES).toEqual({
      activeOrHeat: ["W", "kW", "MW"],
      reactive: ["var", "kvar"],
      apparent: ["VA", "kVA"],
    });
    for (const activeOrHeatId of ["P_grid", "Q_coolant", "port.active_power"] as const) {
      expect(PARAMETER_REGISTRY.get(parameterId(activeOrHeatId)).allowedDisplayUnits).toEqual([
        "W",
        "kW",
        "MW",
      ]);
      expect(
        PARAMETER_REGISTRY.get(parameterId(activeOrHeatId)).allowedDisplayUnits,
      ).not.toEqual(expect.arrayContaining(["var", "VA"]));
    }
    expect(
      PARAMETER_REGISTRY.get(parameterId("port.reactive_power")).allowedDisplayUnits,
    ).toEqual(["var", "kvar"]);

    const absoluteTemperature = PARAMETER_REGISTRY.get(parameterId("water.bulk_temperature"));
    expect(absoluteTemperature.allowedDisplayUnits).toContain("degC");
    expect(absoluteTemperature.allowedDisplayUnits).not.toContain("delta_degC");

    const temperatureDifference = PARAMETER_REGISTRY.get(parameterId("saturation_margin_wall"));
    expect(temperatureDifference.allowedDisplayUnits).toContain("delta_degC");
    expect(temperatureDifference.allowedDisplayUnits).not.toContain("degC");
  });

  it("keeps D_i, D_o, D_m, D_c and conductor diameter semantics independent", () => {
    const expected = [
      ["coil.inner_diameter", "D_i", "length", "m"],
      ["coil.outer_diameter", "D_o", "length", "m"],
      ["coil.mean_diameter", "D_m", "length", "m"],
      ["coil.current_path_diameter", "D_c", "length", "m"],
      ["conductor.outer_diameter", "d_o", "length", "m"],
    ] as const;

    for (const [id, symbol, dimension, unit] of expected) {
      expect(PARAMETER_REGISTRY.get(parameterId(id))).toMatchObject({
        parameterId: id,
        symbol,
        dimension,
        canonicalUnit: unit,
      });
    }
    expect(new Set(expected.map(([id]) => id)).size).toBe(expected.length);
  });

  it("keeps axial turn clearance and radial annulus gap separate", () => {
    const turnGap = PARAMETER_REGISTRY.get(parameterId("coil.turn_clearance_axial"));
    const radialGap = PARAMETER_REGISTRY.get(parameterId("thermal.radial_gap"));

    expect(turnGap.symbol).toBe("g");
    expect(radialGap.symbol).toBe("s_ann");
    expect(turnGap.parameterId).not.toBe(radialGap.parameterId);
    expect(PARAMETER_REGISTRY.migrateLegacyName("g_rad")?.parameterId).toBe(
      radialGap.parameterId,
    );
  });

  it("uses aliases only through the explicit migration path", () => {
    const migrated = PARAMETER_REGISTRY.migrateLegacyName("coil.turn_count");
    expect(migrated).toMatchObject({
      parameterId: "coil.electrical_turn_count",
      alias: { scope: "migration_only", migrationRule: "rename" },
    });
    expect(Object.isFrozen(migrated)).toBe(true);
    expect(Object.isFrozen(migrated?.alias)).toBe(true);
    expect(() => PARAMETER_REGISTRY.resolveRuntime(parameterId("coil.turn_count"))).toThrow(
      /does not contain/u,
    );
    expect(PARAMETER_REGISTRY.aliases().every(({ alias }) => alias.scope === "migration_only")).toBe(
      true,
    );

    const base = PARAMETER_RECORDS[0]!;
    expect(() =>
      new ParameterRegistry([
        {
          ...base,
          aliases: [
            {
              value: "legacy.forged",
              scope: "runtime" as typeof base.aliases[number]["scope"],
              migrationRule: "rename",
              note: "Forged scope test.",
            },
          ],
        },
      ]),
    ).toThrow(/not migration-only/u);
  });

  it("records controlled defaults only where the freeze explicitly provides them", () => {
    const idsWithDefaults = PARAMETER_RECORDS.filter((record) => record.default !== null)
      .map((record) => record.parameterId)
      .sort();
    expect(idsWithDefaults).toEqual([
      "coil.current_path_diameter",
      "coil.mean_diameter",
      "thermal.radial_gap",
    ]);
    expect(
      PARAMETER_REGISTRY.get(parameterId("coil.current_path_diameter")).default,
    ).toMatchObject({
      kind: "controlled_derivation",
      sourceParameterIds: ["coil.mean_diameter"],
      warningPredicateRefs: ["COIL_CURRENT_CENTROID_UNRESOLVED"],
    });
  });

  it("accepts the frozen underscore power IDs through the canonical constructor", () => {
    expect(parameterId("P_grid")).toBe("P_grid");
    expect(parameterId("Q_coolant")).toBe("Q_coolant");
    expect(PARAMETER_REGISTRY.get(parameterId("P_grid"))).toMatchObject({
      dimension: "power",
      canonicalUnit: "W",
    });
    expect(PARAMETER_REGISTRY.get(parameterId("Q_coolant"))).toMatchObject({
      dimension: "power",
      canonicalUnit: "W",
    });
  });

  it("rejects duplicate and unknown canonical IDs", () => {
    expect(() => new ParameterRegistry([PARAMETER_RECORDS[0]!, PARAMETER_RECORDS[0]!])).toThrow(
      /duplicate id/u,
    );
    expect(() => PARAMETER_REGISTRY.get(parameterId("unknown.parameter"))).toThrow(
      /does not contain/u,
    );
  });
});
