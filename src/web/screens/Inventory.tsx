import type { Vehicle, VehicleFilters } from '../hooks/useVehicles';
import { FilterRail } from '../components/FilterRail';
import { VehicleSticker } from '../components/VehicleSticker';

interface InventoryProps {
  vehicles: Vehicle[];
  filters: VehicleFilters;
  searchActive: boolean;
  priceCeiling: number;
  loading: boolean;
  loadError: string;
  onSearch: (filters: VehicleFilters) => void;
  onFiltersChange: (filters: VehicleFilters) => void;
  onClear: () => void;
  onPurchase: (vehicle: Vehicle) => Promise<string | null>;
}

/** Shows the filter rail and responsive grid of vehicle window stickers. */
export function Inventory({
  vehicles,
  filters,
  searchActive,
  priceCeiling,
  loading,
  loadError,
  onSearch,
  onFiltersChange,
  onClear,
  onPurchase,
}: InventoryProps) {
  return (
    <section className="inventory-screen" aria-labelledby="inventory-title">
      <div className="screen-heading">
        <div>
          <p className="section-kicker">On the lot today</p>
          <h1 id="inventory-title">Inventory</h1>
        </div>
        {!loading && !loadError && (
          <p className="inventory-count">
            {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} listed
          </p>
        )}
      </div>
      <div className="inventory-layout">
        <FilterRail
          filters={filters}
          priceCeiling={priceCeiling}
          onFiltersChange={onFiltersChange}
          onSearch={onSearch}
          onClear={onClear}
        />
        {loadError ? (
          <div className="empty-state inventory-error" role="alert">
            <h2>Inventory could not load.</h2>
            <p>{loadError}</p>
            <button className="secondary-button" type="button" onClick={onClear}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="sticker-grid" aria-label="Loading inventory" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="sticker-skeleton" key={index} />
            ))}
          </div>
        ) : vehicles.length ? (
          <div className="sticker-grid">
            {vehicles.map((vehicle, index) => (
              <VehicleSticker
                key={vehicle.id}
                vehicle={vehicle}
                index={index}
                onPurchase={onPurchase}
              />
            ))}
          </div>
        ) : searchActive ? (
          <div className="empty-state">
            <h2>No vehicles match these filters.</h2>
            <button className="secondary-button" type="button" onClick={onClear}>
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
