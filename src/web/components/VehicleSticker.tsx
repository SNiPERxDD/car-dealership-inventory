import type { Vehicle } from '../hooks/useVehicles';
import { StockOdometer } from './StockOdometer';

interface VehicleStickerProps {
  vehicle: Vehicle;
  onPurchase: (vehicle: Vehicle) => void;
}

/** Renders one vehicle as a compact, Monroney-inspired window sticker. */
export function VehicleSticker({ vehicle, onPurchase }: VehicleStickerProps) {
  const soldOut = vehicle.quantity === 0;

  return (
    <article className="vehicle-sticker">
      <header className="sticker-header">
        <div>
          <p className="sticker-category">{vehicle.category}</p>
          <p className="sticker-make">{vehicle.make}</p>
        </div>
        {soldOut && <span className="sold-stamp">Sold out</span>}
      </header>
      <div className="sticker-body">
        <h2 className="sticker-model">{vehicle.model.toUpperCase()}</h2>
        <dl className="sticker-specs">
          <div>
            <dt>Make</dt>
            <dd>{vehicle.make}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{vehicle.model}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{vehicle.category}</dd>
          </div>
        </dl>
        <p className="sticker-price">
          <span>Price</span>
          <span className="data-text">{formatPrice(vehicle.price)}</span>
        </p>
        <StockOdometer quantity={vehicle.quantity} />
        <div className="purchase-row">
          <button
            className="primary-button"
            type="button"
            disabled={soldOut}
            onClick={() => onPurchase(vehicle)}
          >
            Purchase
          </button>
          {soldOut && <span className="out-of-stock">Out of stock</span>}
        </div>
      </div>
    </article>
  );
}

/** Formats dollar amounts with two fractional digits for sticker and table data. */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}
