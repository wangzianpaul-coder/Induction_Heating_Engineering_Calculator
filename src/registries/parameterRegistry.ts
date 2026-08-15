import {
  methodId,
  parameterId,
  type MethodId,
  type ParameterId,
} from "../domain/ids.js";
import { DIMENSION_DEFINITIONS } from "../units/dimensions.js";
import {
  isDimensionId,
  isUnitId,
  type DimensionId,
  type UnitId,
} from "../units/ids.js";
import { UNIT_DEFINITIONS } from "../units/registry.js";
import {
  DuplicateRegistryIdError,
  ImmutableRegistry,
} from "./immutableRegistry.js";
import type { EngineeringModuleId } from "./methodSpecificationRegistry.js";

export type ParameterDimension = DimensionId;

export type ParameterRole =
  | "input"
  | "output"
  | "state"
  | "derived"
  | "input_or_derived";

export type ParameterRequirement =
  | "method_dependent"
  | "required_when_applicable"
  | "derived_when_inputs_available";

export interface ParameterAlias {
  readonly value: string;
  readonly scope: "migration_only";
  readonly migrationRule: "rename" | "method_local_derivation";
  readonly note: string;
}

export interface ParameterDefault {
  readonly kind: "controlled_derivation";
  readonly sourceParameterIds: readonly ParameterId[];
  readonly derivationMethodId: MethodId;
  readonly sourceRefs: readonly string[];
  readonly warningPredicateRefs: readonly string[];
}

export interface ParameterRecord {
  readonly parameterId: ParameterId;
  readonly symbol: string;
  readonly engineeringName: {
    readonly en: string;
    readonly zh: string;
  };
  readonly definition: string;
  readonly help: string;
  readonly ownerModule: EngineeringModuleId;
  readonly dimension: ParameterDimension;
  readonly canonicalUnit: UnitId;
  readonly allowedDisplayUnits: readonly UnitId[];
  readonly role: ParameterRole;
  readonly requirement: ParameterRequirement;
  readonly physicalRange: string;
  readonly applicability: string;
  readonly definitionSourceRefs: readonly string[];
  /** Null means the freeze provides no default; absence is never implicit. */
  readonly default: ParameterDefault | null;
  readonly aliases: readonly ParameterAlias[];
  readonly consumingMethods: readonly MethodId[];
  readonly dataQualityPolicy: "runtime_quantity_must_carry_data_quality";
  readonly precisionPolicy: "derive_from_input_resolution_and_uncertainty";
}

export interface MigratedParameterName {
  readonly parameterId: ParameterId;
  readonly alias: ParameterAlias;
}

export class ParameterRegistry extends ImmutableRegistry<ParameterId, ParameterRecord> {
  readonly #migrationAliases: ReadonlyMap<string, MigratedParameterName>;

  public constructor(records: Iterable<ParameterRecord>) {
    const materialized = Array.from(records);
    const canonicalIds = new Set<ParameterId>();
    for (const record of materialized) {
      canonicalIds.add(record.parameterId);
    }

    const migrationAliasNames = new Set<string>();
    for (const record of materialized) {
      parameterId(record.parameterId);
      if (!/^[A-L]$/u.test(record.ownerModule)) {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown owner module.`);
      }
      if (!(["input", "output", "state", "derived", "input_or_derived"] as const).includes(record.role)) {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown role.`);
      }
      if (!(["method_dependent", "required_when_applicable", "derived_when_inputs_available"] as const).includes(record.requirement)) {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown requirement.`);
      }
      for (const [label, value] of [
        ["symbol", record.symbol],
        ["engineeringName.en", record.engineeringName.en],
        ["engineeringName.zh", record.engineeringName.zh],
        ["definition", record.definition],
        ["help", record.help],
        ["physicalRange", record.physicalRange],
        ["applicability", record.applicability],
      ] as const) {
        if (value.trim().length === 0) {
          throw new TypeError(`Parameter ${record.parameterId} ${label} must be non-empty.`);
        }
      }
      if (!isDimensionId(record.dimension)) {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown dimension.`);
      }
      if (!isUnitId(record.canonicalUnit)) {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown canonical unit.`);
      }
      if (record.allowedDisplayUnits.length === 0) {
        throw new TypeError(`Parameter ${record.parameterId} has no allowed display units.`);
      }
      if (
        record.dimension !== "power" &&
        !record.allowedDisplayUnits.includes(record.canonicalUnit)
      ) {
        throw new TypeError(
          `Parameter ${record.parameterId} does not include its canonical unit in allowed display units.`,
        );
      }
      if (
        DIMENSION_DEFINITIONS[record.dimension].canonicalUnitId !==
        record.canonicalUnit
      ) {
        throw new TypeError(
          `Parameter ${record.parameterId} canonical unit ${record.canonicalUnit} does not match dimension ${record.dimension}.`,
        );
      }
      for (const displayUnit of record.allowedDisplayUnits) {
        if (!isUnitId(displayUnit)) {
          throw new TypeError(`Parameter ${record.parameterId} has an unknown display unit.`);
        }
        if (!UNIT_DEFINITIONS[displayUnit].dimensionIds.includes(record.dimension)) {
          throw new TypeError(
            `Parameter ${record.parameterId} display unit ${displayUnit} is incompatible with dimension ${record.dimension}.`,
          );
        }
      }
      if (record.definitionSourceRefs.length === 0) {
        throw new TypeError(
          `Parameter ${record.parameterId} has no controlled definition source.`,
        );
      }
      for (const definitionSourceRef of record.definitionSourceRefs) {
        if (definitionSourceRef.trim().length === 0) {
          throw new TypeError(`Parameter ${record.parameterId} has an empty definition source.`);
        }
      }
      if (record.default !== null) {
        if (record.default.kind !== "controlled_derivation") {
          throw new TypeError(`Parameter ${record.parameterId} has an unknown default kind.`);
        }
        if (record.default.sourceParameterIds.length === 0 || record.default.sourceRefs.length === 0) {
          throw new TypeError(`Parameter ${record.parameterId} controlled default is incomplete.`);
        }
        for (const sourceParameterId of record.default.sourceParameterIds) {
          parameterId(sourceParameterId);
        }
        methodId(record.default.derivationMethodId);
        if (record.default.sourceRefs.some((ref) => ref.trim().length === 0)) {
          throw new TypeError(`Parameter ${record.parameterId} controlled default has an empty source.`);
        }
      }
      if (new Set(record.consumingMethods).size !== record.consumingMethods.length) {
        throw new DuplicateRegistryIdError(
          `ParameterRegistry consumingMethods for ${record.parameterId}`,
          "duplicate method_id",
        );
      }
      for (const consumingMethod of record.consumingMethods) {
        methodId(consumingMethod);
      }
      if (record.dataQualityPolicy !== "runtime_quantity_must_carry_data_quality") {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown data-quality policy.`);
      }
      if (record.precisionPolicy !== "derive_from_input_resolution_and_uncertainty") {
        throw new TypeError(`Parameter ${record.parameterId} has an unknown precision policy.`);
      }
      for (const alias of record.aliases) {
        if (alias.scope !== "migration_only") {
          throw new TypeError(`Parameter ${record.parameterId} alias ${alias.value} is not migration-only.`);
        }
        if (alias.migrationRule !== "rename" && alias.migrationRule !== "method_local_derivation") {
          throw new TypeError(`Parameter ${record.parameterId} alias ${alias.value} has an unknown migration rule.`);
        }
        if (alias.value.trim().length === 0 || alias.note.trim().length === 0) {
          throw new TypeError(`Parameter ${record.parameterId} contains an incomplete migration alias.`);
        }
        if (canonicalIds.has(alias.value as ParameterId)) {
          throw new TypeError(
            `Migration alias ${alias.value} collides with a canonical parameter_id.`,
          );
        }
        if (migrationAliasNames.has(alias.value)) {
          throw new DuplicateRegistryIdError(
            "ParameterRegistry migration aliases",
            alias.value,
          );
        }
        migrationAliasNames.add(alias.value);
      }
    }

    super(materialized, {
      registryName: "ParameterRegistry",
      idOf: (record) => record.parameterId,
    });

    const migrationAliases = new Map<string, MigratedParameterName>();
    for (const record of this.values()) {
      for (const registeredAlias of record.aliases) {
        migrationAliases.set(
          registeredAlias.value,
          Object.freeze({
            parameterId: record.parameterId,
            alias: registeredAlias,
          }),
        );
      }
    }
    this.#migrationAliases = migrationAliases;
    Object.freeze(this);
  }

  /** Runtime lookup accepts canonical IDs only; aliases are deliberately absent. */
  public resolveRuntime(id: ParameterId): ParameterRecord {
    return this.get(id);
  }

  /** Import adapters must call this explicit migration-only path. */
  public migrateLegacyName(alias: string): MigratedParameterName | undefined {
    return this.#migrationAliases.get(alias);
  }

  public aliases(): readonly MigratedParameterName[] {
    return Object.freeze(Array.from(this.#migrationAliases.values()));
  }
}
