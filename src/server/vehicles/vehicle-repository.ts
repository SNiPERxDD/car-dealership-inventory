import type pg from 'pg';
import type { VehicleBody, VehicleSearchQuery } from './schemas.js';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

interface VehicleRow extends Omit<Vehicle, 'price'> {
  price: string | number;
}

const VEHICLE_COLUMNS = 'id, make, model, category, price, quantity';

/** Performs parameterized SQL operations for vehicle inventory records. */
export class VehicleInventoryRepository {
  constructor(private readonly pool: pg.Pool) {}

  /** Inserts a vehicle and returns its database-generated identifier and public fields. */
  async insert(vehicle: VehicleBody): Promise<Vehicle> {
    const result = await this.pool.query<VehicleRow>(
      `INSERT INTO vehicles (make, model, category, price, quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${VEHICLE_COLUMNS}`,
      [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
    );
    return mapVehicleRow(result.rows[0]!);
  }

  /** Returns every vehicle in stable make, model, and identifier order. */
  async list(): Promise<Vehicle[]> {
    const result = await this.pool.query<VehicleRow>(
      `SELECT ${VEHICLE_COLUMNS} FROM vehicles ORDER BY make, model, id`,
    );
    return result.rows.map(mapVehicleRow);
  }

  /** Searches vehicles using parameterized case-insensitive literal filters. */
  async search(filters: VehicleSearchQuery): Promise<Vehicle[]> {
    const values: Array<string | number> = [];
    const conditions: string[] = [];

    /** Adds a SQL value to the parameter list and returns its positional placeholder. */
    const addValue = (value: string | number): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (filters.make) {
      conditions.push(
        `make ILIKE ${addValue(`%${escapeLikeWildcards(filters.make)}%`)} ESCAPE E'\\\\'`,
      );
    }
    if (filters.model) {
      conditions.push(
        `model ILIKE ${addValue(`%${escapeLikeWildcards(filters.model)}%`)} ESCAPE E'\\\\'`,
      );
    }
    if (filters.category) {
      conditions.push(`LOWER(category) = ${addValue(filters.category)}`);
    }
    if (filters.minPrice !== undefined) {
      conditions.push(`price >= ${addValue(filters.minPrice)}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(`price <= ${addValue(filters.maxPrice)}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query<VehicleRow>(
      `SELECT ${VEHICLE_COLUMNS} FROM vehicles ${whereClause} ORDER BY make, model, id`,
      values,
    );
    return result.rows.map(mapVehicleRow);
  }

  /** Replaces all mutable vehicle fields and returns null when the identifier is absent. */
  async update(id: string, vehicle: VehicleBody): Promise<Vehicle | null> {
    const result = await this.pool.query<VehicleRow>(
      `UPDATE vehicles
       SET make = $2, model = $3, category = $4, price = $5, quantity = $6, updated_at = now()
       WHERE id = $1
       RETURNING ${VEHICLE_COLUMNS}`,
      [id, vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
    );
    return result.rows[0] ? mapVehicleRow(result.rows[0]) : null;
  }

  /** Deletes a vehicle and reports whether a row existed for its identifier. */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}

/** Escapes LIKE pattern characters so search values are treated as literal text. */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Converts PostgreSQL's numeric price representation into a JSON-safe number. */
function mapVehicleRow(row: VehicleRow): Vehicle {
  return { ...row, price: Number(row.price) };
}
