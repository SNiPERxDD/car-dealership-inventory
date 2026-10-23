import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { VehicleFilters } from '../hooks/useVehicles';

interface FilterRailProps {
  onSearch: (filters: VehicleFilters) => void;
  onClear: () => void;
}

/** Provides responsive search controls for vehicle make, model, category, and price. */
export function FilterRail({ onSearch, onClear }: FilterRailProps) {
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [open, setOpen] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const updateDisclosure = () => setOpen(window.innerWidth >= 768);
    window.addEventListener('resize', updateDisclosure);
    return () => window.removeEventListener('resize', updateDisclosure);
  }, []);

  /** Stores the current value for one vehicle filter. */
  const update = (name: keyof VehicleFilters, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  /** Submits only the values the user has entered. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(filters);
  };

  /** Resets the visible fields and reloads the unfiltered inventory. */
  const clear = () => {
    setFilters({});
    onClear();
  };

  const form = (
    <form className="filter-form" onSubmit={submit}>
      <label>
        Make
        <input
          value={filters.make ?? ''}
          onChange={(event) => update('make', event.target.value)}
        />
      </label>
      <label>
        Model
        <input
          value={filters.model ?? ''}
          onChange={(event) => update('model', event.target.value)}
        />
      </label>
      <label>
        Category
        <input
          value={filters.category ?? ''}
          onChange={(event) => update('category', event.target.value)}
        />
      </label>
      <label>
        Minimum price
        <input
          type="number"
          min="0"
          step="0.01"
          value={filters.minPrice ?? ''}
          onChange={(event) => update('minPrice', event.target.value)}
        />
      </label>
      <label>
        Maximum price
        <input
          type="number"
          min="0"
          step="0.01"
          value={filters.maxPrice ?? ''}
          onChange={(event) => update('maxPrice', event.target.value)}
        />
      </label>
      <div className="filter-actions">
        <button className="primary-button" type="submit">
          Search
        </button>
        <button className="secondary-button" type="button" onClick={clear}>
          Clear filters
        </button>
      </div>
    </form>
  );

  return (
    <details
      className="filter-rail"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Filters</summary>
      <h2>Find a vehicle</h2>
      {form}
    </details>
  );
}
