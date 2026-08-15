import {
  createControlledQuantityFactory,
  type QuantityControlLookup,
} from "./domain/quantity.js";
import type { MethodId, ParameterId } from "./domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "./registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "./registries/parameterCatalog.js";

const FROZEN_QUANTITY_CONTROL_LOOKUP: QuantityControlLookup = Object.freeze({
  findParameter: (id: ParameterId) => {
    const definition = PARAMETER_REGISTRY.find(id);
    return definition === undefined
      ? undefined
      : {
          parameterId: definition.parameterId,
          dimensionId: definition.dimension,
          canonicalUnitId: definition.canonicalUnit,
          allowedRepresentationUnitIds: definition.allowedDisplayUnits,
        };
  },
  findMethod: (id: MethodId) => {
    const definition = METHOD_SPECIFICATION_REGISTRY.find(id);
    return definition === undefined
      ? undefined
      : {
          methodId: definition.methodId,
          approvalStatus: definition.approvalStatus,
        };
  },
});

const CONTROLLED_QUANTITY_FACTORY = createControlledQuantityFactory(
  FROZEN_QUANTITY_CONTROL_LOOKUP,
);

export const createScalarQuantity =
  CONTROLLED_QUANTITY_FACTORY.createScalarQuantity;
export const createUnavailableQuantity =
  CONTROLLED_QUANTITY_FACTORY.createUnavailableQuantity;
