import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Vehicle } from '../hooks/useVehicles';
import { StockOdometer } from './StockOdometer';

interface VehicleStickerProps {
  vehicle: Vehicle;
  index?: number;
  onPurchase: (vehicle: Vehicle) => Promise<string | null>;
}

/** Category keywords mapped to the studio render on each sticker plate; sedan is the fallback. */
const BODY_STYLES: [RegExp, string][] = [
  [/electric|\bev\b/, 'electric'],
  [/suv|crossover|van/, 'suv'],
  [/truck|pickup/, 'truck'],
  [/coupe|sport|convertible|roadster/, 'coupe'],
  [/hatch|compact|wagon/, 'hatchback'],
];

/** Picks the body-style render that best matches a free-text vehicle category. */
function bodyStyle(category: string): string {
  const normalized = category.toLowerCase();
  return BODY_STYLES.find(([pattern]) => pattern.test(normalized))?.[1] ?? 'sedan';
}

/** Renders one vehicle as a catalogue window sticker with a studio plate, price, and stock reel. */
export function VehicleSticker({ vehicle, index = 0, onPurchase }: VehicleStickerProps) {
  const soldOut = vehicle.quantity === 0;
  const [purchasing, setPurchasing] = useState(false);
  const purchaseInFlight = useRef(false);

  /** Prevents duplicate purchase requests while this vehicle is being purchased. */
  const purchase = async () => {
    if (soldOut || purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPurchasing(true);
    try {
      await onPurchase(vehicle);
    } finally {
      purchaseInFlight.current = false;
      setPurchasing(false);
    }
  };

  return (
    <article className="vehicle-sticker" style={{ '--i': index } as CSSProperties}>
      <div className="sticker-plate" data-body={bodyStyle(vehicle.category)}>
        {soldOut && <span className="sold-stamp">Sold out</span>}
      </div>
      <header className="sticker-header">
        <p className="sticker-category">{vehicle.category}</p>
        <p className="sticker-make">{vehicle.make}</p>
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
        <div className="sticker-figures">
          <p className="sticker-price">
            <span>Price</span>
            <span className="data-text">{formatPrice(vehicle.price)}</span>
          </p>
          <StockOdometer quantity={vehicle.quantity} />
        </div>
        <div className="purchase-row">
          <button
            className="primary-button"
            type="button"
            aria-label={`Purchase ${vehicle.make} ${vehicle.model}`}
            disabled={soldOut || purchasing}
            onClick={() => void purchase()}
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
