import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { HttpError } from '../middleware/errors.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import type { RestockBody, VehicleBody, VehicleUpdateBody } from './schemas.js';
import {
  purchaseBodySchema,
  restockBodySchema,
  vehicleBodySchema,
  vehicleIdSchema,
  vehicleSearchQuerySchema,
  vehicleUpdateBodySchema,
} from './schemas.js';
import type { Vehicle } from './vehicle-repository.js';
import { VehicleService } from './vehicle-service.js';

interface VehicleIdParameters extends ParamsDictionary {
  id: string;
}

/** Creates protected vehicle HTTP routes using the injected service and JWT secret. */
export function createVehicleRouter(vehicleService: VehicleService, jwtSecret: string): Router {
  const router = Router();
  const authenticate = requireAuth(jwtSecret);

  router.post(
    '/vehicles',
    authenticate,
    requireAdmin,
    validateBody(vehicleBodySchema),
    createVehicle(vehicleService),
  );
  router.get('/vehicles/search', authenticate, searchVehicles(vehicleService));
  router.get('/vehicles', authenticate, listVehicles(vehicleService));
  router.post(
    '/vehicles/:id/purchase',
    authenticate,
    validateVehicleId,
    validateBody(purchaseBodySchema),
    purchaseVehicle(vehicleService),
  );
  router.post(
    '/vehicles/:id/restock',
    authenticate,
    requireAdmin,
    validateVehicleId,
    validateBody(restockBodySchema),
    restockVehicle(vehicleService),
  );
  router.put(
    '/vehicles/:id',
    authenticate,
    requireAdmin,
    validateVehicleId,
    validateBody(vehicleUpdateBodySchema),
    updateVehicle(vehicleService),
  );
  router.delete(
    '/vehicles/:id',
    authenticate,
    requireAdmin,
    validateVehicleId,
    deleteVehicle(vehicleService),
  );

  return router;
}

/** Validates path identifiers after authorization and before repository access. */
const validateVehicleId: RequestHandler<VehicleIdParameters> = (request, _response, next) => {
  const result = vehicleIdSchema.safeParse(request.params.id);
  if (!result.success) {
    next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        result.error.issues[0]?.message ?? 'Vehicle identifier is invalid',
      ),
    );
    return;
  }
  request.params.id = result.data;
  next();
};

/** Builds the authenticated creation handler. */
function createVehicle(
  vehicleService: VehicleService,
): RequestHandler<ParamsDictionary, Vehicle, VehicleBody> {
  return async (request, response) => {
    response.status(201).json(await vehicleService.create(request.body));
  };
}

/** Builds the authenticated listing handler. */
function listVehicles(vehicleService: VehicleService): RequestHandler<ParamsDictionary, Vehicle[]> {
  return async (_request, response) => {
    response.status(200).json(await vehicleService.list());
  };
}

/** Builds the authenticated search handler and maps invalid query strings to a validation error. */
function searchVehicles(
  vehicleService: VehicleService,
): RequestHandler<ParamsDictionary, Vehicle[]> {
  return async (request, response) => {
    const result = vehicleSearchQuerySchema.safeParse(request.query);
    if (!result.success) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        result.error.issues[0]?.message ?? 'Vehicle search filters are invalid',
      );
    }
    response.status(200).json(await vehicleService.search(result.data));
  };
}

/** Builds the authenticated full-replacement handler. */
function updateVehicle(
  vehicleService: VehicleService,
): RequestHandler<VehicleIdParameters, Vehicle, VehicleUpdateBody> {
  return async (request, response) => {
    response.status(200).json(await vehicleService.update(request.params.id, request.body));
  };
}

/** Builds the authenticated deletion handler. */
function deleteVehicle(vehicleService: VehicleService): RequestHandler<VehicleIdParameters> {
  return async (request, response) => {
    await vehicleService.delete(request.params.id);
    response.status(204).end();
  };
}

/** Builds the authenticated one-unit purchase handler. */
function purchaseVehicle(
  vehicleService: VehicleService,
): RequestHandler<VehicleIdParameters, Vehicle> {
  return async (request, response) => {
    response.status(200).json(await vehicleService.purchase(request.params.id));
  };
}

/** Builds the administrator restock handler. */
function restockVehicle(
  vehicleService: VehicleService,
): RequestHandler<VehicleIdParameters, Vehicle, RestockBody> {
  return async (request, response) => {
    response.status(200).json(await vehicleService.restock(request.params.id, request.body));
  };
}
