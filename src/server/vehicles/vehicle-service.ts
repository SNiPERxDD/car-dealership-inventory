import { HttpError } from '../middleware/errors.js';
import type { VehicleBody, VehicleSearchQuery } from './schemas.js';
import type { Vehicle, VehicleInventoryRepository } from './vehicle-repository.js';

/** Applies vehicle inventory rules using the injected repository. */
export class VehicleService {
  constructor(private readonly vehicleRepository: VehicleInventoryRepository) {}

  /** Creates a vehicle from validated request fields. */
  create(vehicle: VehicleBody): Promise<Vehicle> {
    return this.vehicleRepository.insert(vehicle);
  }

  /** Returns all current vehicles. */
  list(): Promise<Vehicle[]> {
    return this.vehicleRepository.list();
  }

  /** Normalizes text filters and returns matching vehicles. */
  search(filters: VehicleSearchQuery): Promise<Vehicle[]> {
    return this.vehicleRepository.search({
      ...filters,
      make: filters.make?.toLowerCase(),
      model: filters.model?.toLowerCase(),
      category: filters.category?.toLowerCase(),
    });
  }

  /** Replaces an existing vehicle or raises the public not-found error. */
  async update(id: string, vehicle: VehicleBody): Promise<Vehicle> {
    const updatedVehicle = await this.vehicleRepository.update(id, vehicle);
    if (!updatedVehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found');
    }
    return updatedVehicle;
  }

  /** Deletes an existing vehicle or raises the public not-found error. */
  async delete(id: string): Promise<void> {
    if (!(await this.vehicleRepository.delete(id))) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found');
    }
  }
}
