import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api-client';
import type { ApiRequestOptions } from '../lib/api-client';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

export interface VehicleFields {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

const COPY: Record<string, string> = {
  OUT_OF_STOCK: 'None left in stock. The listing has been refreshed.',
  STOCK_LIMIT_EXCEEDED: 'That restock would exceed the maximum stock count.',
  VEHICLE_NOT_FOUND: 'That vehicle is no longer on the lot. The listing has been refreshed.',
};

/** Loads and mutates inventory through the public vehicle API, refreshing after each mutation. */
export function useVehicles(token: string, onUnauthorized: () => void) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [unfilteredVehicles, setUnfilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  const requestOptions = useCallback(
    (options: ApiRequestOptions = {}): ApiRequestOptions => ({
      ...options,
      token,
      onUnauthorized,
    }),
    [onUnauthorized, token],
  );

  const load = useCallback(
    async (path = '/api/vehicles') => {
      const controller = new AbortController();
      requestController.current?.abort();
      requestController.current = controller;
      setLoading(true);
      setLoadError('');
      try {
        const result = await apiRequest<Vehicle[]>(
          path,
          requestOptions({ signal: controller.signal }),
        );
        if (!controller.signal.aborted) {
          setVehicles(result);
          if (path === '/api/vehicles') setUnfilteredVehicles(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (!(error instanceof ApiError && error.status === 401)) {
            const message = errorMessage(error);
            setLoadError(message);
            setToast(`Inventory request failed: ${message}`);
            setToastError(true);
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [requestOptions],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      requestController.current?.abort();
    };
  }, [load]);

  const search = useCallback(
    (filters: VehicleFilters) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        const normalized = value?.trim();
        if (normalized) query.set(key, normalized);
      }
      setLoading(true);
      setLoadError('');
      void load(`/api/vehicles/search${query.size ? `?${query.toString()}` : ''}`);
    },
    [load],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError('');
    void load();
  }, [load]);

  const mutate = useCallback(
    async <Result>(
      path: string,
      method: string,
      body: unknown,
      successMessage: (result: Result) => string,
    ): Promise<string | null> => {
      try {
        const result = await apiRequest<Result>(path, requestOptions({ method, body }));
        setToast(successMessage(result));
        setToastError(false);
        setLoading(true);
        await load();
        return null;
      } catch (error) {
        const message = errorMessage(error);
        setToast(message);
        setToastError(true);
        if (
          error instanceof ApiError &&
          ['OUT_OF_STOCK', 'VEHICLE_NOT_FOUND'].includes(error.code)
        ) {
          setLoading(true);
          await load();
        }
        return message;
      }
    },
    [load, requestOptions],
  );

  const purchase = useCallback(
    (vehicle: Vehicle) =>
      mutate<Vehicle>(
        `/api/vehicles/${vehicle.id}/purchase`,
        'POST',
        undefined,
        () => `Purchased 1 × ${vehicle.make} ${vehicle.model}.`,
      ),
    [mutate],
  );

  const create = useCallback(
    (fields: VehicleFields) =>
      mutate<Vehicle>('/api/vehicles', 'POST', fields, () => 'Vehicle added to the lot.'),
    [mutate],
  );

  const update = useCallback(
    (id: string, fields: VehicleFields) =>
      mutate<Vehicle>(`/api/vehicles/${id}`, 'PUT', fields, () => 'Vehicle details updated.'),
    [mutate],
  );

  const restock = useCallback(
    (vehicle: Vehicle, quantity: number) =>
      mutate<Vehicle>(
        `/api/vehicles/${vehicle.id}/restock`,
        'POST',
        { quantity },
        () => `Restocked ${quantity} × ${vehicle.make} ${vehicle.model}.`,
      ),
    [mutate],
  );

  const remove = useCallback(
    (vehicle: Vehicle) =>
      mutate<void>(
        `/api/vehicles/${vehicle.id}`,
        'DELETE',
        undefined,
        () => 'Vehicle removed from the lot.',
      ),
    [mutate],
  );

  return {
    vehicles,
    unfilteredVehicles,
    loadError,
    loading,
    toast,
    toastError,
    setToast,
    reload,
    search,
    purchase,
    create,
    update,
    restock,
    remove,
  };
}

/** Maps inventory conflicts to product copy and preserves all other API messages. */
function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return COPY[error.code] ?? error.message;
  }
  return 'Could not reach the server. Check your connection and try again.';
}
