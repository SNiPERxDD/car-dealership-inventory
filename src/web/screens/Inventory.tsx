import { useState } from 'react';
import type { Vehicle, VehicleFilters } from '../hooks/useVehicles';
import { FilterRail } from '../components/FilterRail';
import { VehicleSticker } from '../components/VehicleSticker';

interface InventoryProps {
  vehicles: Vehicle[];
  loading: boolean;
  onSearch: (filters: VehicleFilters) => void;
  onClear: () => void;
  onPurchase: (vehicle: Vehicle) => void;
}

/** Shows the filter rail and responsive grid of vehicle window stickers. */
export function Inventory({ vehicles, loading, onSearch, onClear, onPurchase }: InventoryProps) {
  const [searchActive, setSearchActive] = useState(false);

  const search = (filters: VehicleFilters) => {
    setSearchActive(true);
    onSearch(filters);
  };

  const clear = () => {
    setSearchActive(false);
    onClear();
  };

  return (
    <section className="inventory-screen" aria-labelledby="inventory-title">
      <div className="screen-heading">
        <div>
          <h1 id="inventory-title">Inventory</h1>
        </div>
        {!loading && (
          <p className="inventory-count">
            {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} listed
          </p>
        )}
      </div>
      <div className="inventory-layout">
        <FilterRail onSearch={search} onClear={clear} />
        {loading ? (
          <div className="sticker-grid" aria-label="Loading inventory" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="sticker-skeleton" key={index} />
            ))}
          </div>
        ) : vehicles.length ? (
          <div className="sticker-grid">
            {vehicles.map((vehicle) => (
              <VehicleSticker key={vehicle.id} vehicle={vehicle} onPurchase={onPurchase} />
            ))}
          </div>
        ) : searchActive ? (
          <div className="empty-state">
            <h2>No vehicles match these filters.</h2>
            <button className="secondary-button" type="button" onClick={clear}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <h2>No vehicles are currently listed.</h2>
          </div>
        )}
      </div>
    </section>
  );
}
