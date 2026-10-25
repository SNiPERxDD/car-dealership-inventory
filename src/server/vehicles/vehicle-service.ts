import { HttpError } from '../middleware/errors.js';
import type { RestockBody, VehicleBody, VehicleSearchQuery, VehicleUpdateBody } from './schemas.js';
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

  /** Updates vehicle details and raises the public not-found error when absent. */
  async update(id: string, vehicle: VehicleUpdateBody): Promise<Vehicle> {
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

  /** Sells one unit, distinguishing a missing vehicle from an empty inventory. */
  async purchase(id: string): Promise<Vehicle> {
    const updatedVehicle = await this.vehicleRepository.purchase(id);
    if (updatedVehicle) {
      return updatedVehicle;
    }
    if (!(await this.vehicleRepository.exists(id))) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found');
    }
    throw new HttpError(409, 'OUT_OF_STOCK', 'Vehicle is out of stock');
  }

  /** Adds stock, distinguishing a missing vehicle from an int4 quantity overflow. */
  async restock(id: string, body: RestockBody): Promise<Vehicle> {
    const updatedVehicle = await this.vehicleRepository.restock(id, body.quantity);
    if (updatedVehicle) {
      return updatedVehicle;
    }
    if (!(await this.vehicleRepository.exists(id))) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found');
    }
    throw new HttpError(409, 'STOCK_LIMIT_EXCEEDED', 'Restock would exceed the stock limit');
  }
}
