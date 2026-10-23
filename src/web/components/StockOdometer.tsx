interface StockOdometerProps {
  quantity: number;
  compact?: boolean;
}

/** Displays stock as a mechanical counter with a reduced-motion-aware digit roll. */
export function StockOdometer({ quantity, compact = false }: StockOdometerProps) {
  const digits = String(quantity).padStart(3, '0').split('');
  const digitHeight = compact ? 20 : 24;

  return (
    <div className={`stock-odometer${quantity === 0 ? ' is-sold' : ''}`}>
      <span className="odometer-label">{quantity === 0 ? 'No stock' : 'In stock'}</span>
      <span className="odometer-window" aria-label={`${quantity} in stock`}>
        <span className="odometer-accessible">{digits.join('')}</span>
        <span className="odometer-reels" aria-hidden="true">
          {digits.map((digit, index) => (
            <span className="odometer-reel" key={`${index}-${digits.length}`}>
              <span
                className="odometer-track"
                style={
                  { transform: `translateY(-${Number(digit) * digitHeight}px)` } as CSSProperties
                }
              >
                {Array.from({ length: 10 }, (_, value) => (
                  <span key={value}>{value}</span>
                ))}
              </span>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
import type { CSSProperties } from 'react';
