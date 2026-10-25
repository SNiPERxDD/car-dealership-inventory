import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { VehicleFilters } from '../hooks/useVehicles';
import { formatPrice } from './VehicleSticker';

interface FilterRailProps {
  filters: VehicleFilters;
  priceCeiling: number;
  onFiltersChange: (filters: VehicleFilters) => void;
  onSearch: (filters: VehicleFilters) => void;
  onClear: () => void;
}

/** Provides responsive search controls for vehicle make, model, category, and price. */
export function FilterRail({
  filters,
  onFiltersChange,
  priceCeiling,
  onSearch,
  onClear,
}: FilterRailProps) {
  const [open, setOpen] = useState(() => window.innerWidth >= 768);
  const wasDesktop = useRef(window.innerWidth >= 768);

  useEffect(() => {
    const updateDisclosure = () => {
      const isDesktop = window.innerWidth >= 768;
      if (wasDesktop.current !== isDesktop) {
        wasDesktop.current = isDesktop;
        setOpen(isDesktop);
      }
    };
    window.addEventListener('resize', updateDisclosure);
    return () => window.removeEventListener('resize', updateDisclosure);
  }, []);

  /** Stores the current value for one vehicle filter. */
  const update = (name: keyof VehicleFilters, value: string) => {
    onFiltersChange({ ...filters, [name]: value });
  };

  const updatePrice = (name: 'minPrice' | 'maxPrice', value: string) => {
    const next = { ...filters, [name]: value };
    const minimum = Number(next.minPrice || 0);
    const maximum = Number(next.maxPrice || priceCeiling);
    if (name === 'minPrice' && value && minimum > maximum) next.maxPrice = value;
    if (name === 'maxPrice' && value && maximum < minimum) next.minPrice = value;
    onFiltersChange(next);
  };

  /** Submits only the values the user has entered. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(filters);
  };

  /** Resets the visible fields and reloads the unfiltered inventory. */
  const clear = () => {
    onClear();
  };

  const minimum = Math.min(Number(filters.minPrice || 0), Number(filters.maxPrice || priceCeiling));
  const maximum = Math.min(Number(filters.maxPrice || priceCeiling), priceCeiling);
  // Thumb positions as 0-1 fractions so CSS can paint the selected band between them.
  const rangeSpan = Math.max(priceCeiling, 1);

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
          onChange={(event) => updatePrice('minPrice', event.target.value)}
        />
      </label>
      <label>
        Maximum price
        <input
          type="number"
          min="0"
          step="0.01"
          value={filters.maxPrice ?? ''}
          onChange={(event) => updatePrice('maxPrice', event.target.value)}
        />
      </label>
      <div className="price-range">
        <p>
          {formatPrice(minimum)} – {formatPrice(maximum)}
        </p>
        <div
          className="price-range-track"
          aria-label="Price range"
          style={{ '--min': minimum / rangeSpan, '--max': maximum / rangeSpan } as CSSProperties}
        >
          <input
            aria-label="Minimum price"
            type="range"
            min="0"
            max={priceCeiling}
            step="500"
            value={minimum}
            onChange={(event) => updatePrice('minPrice', event.target.value)}
          />
          <input
            aria-label="Maximum price"
            type="range"
            min="0"
            max={priceCeiling}
            step="500"
            value={maximum}
            onChange={(event) => updatePrice('maxPrice', event.target.value)}
          />
        </div>
      </div>
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
    <details className="filter-rail" open={open}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        Filters
      </summary>
      <h2>Find a vehicle</h2>
      {form}
    </details>
  );
}
