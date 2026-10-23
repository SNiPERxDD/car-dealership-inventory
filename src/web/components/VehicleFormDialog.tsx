import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Vehicle, VehicleFields } from '../hooks/useVehicles';

interface VehicleFormDialogProps {
  vehicle?: Vehicle;
  onSave: (fields: VehicleFields) => Promise<string | null>;
  onClose: () => void;
}

/** Shares an accessible dialog and client-side validation between vehicle creation and editing. */
export function VehicleFormDialog({ vehicle, onSave, onClose }: VehicleFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    };
  }, []);

  /** Validates the complete vehicle record before passing it to the API-backed save action. */
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const make = String(form.get('make') ?? '').trim();
    const model = String(form.get('model') ?? '').trim();
    const category = String(form.get('category') ?? '').trim();
    const priceText = String(form.get('price') ?? '');
    const quantityText = String(form.get('quantity') ?? '');
    const price = Number(priceText);
    const quantity = Number(quantityText);

    if (!make || !model || !category) {
      setError('Make, model, and category are required.');
      return;
    }
    if (
      !priceText ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 9999999999.99 ||
      !hasTwoDecimals(priceText)
    ) {
      setError('Enter a price of 0 or more with no more than 2 decimal places.');
      return;
    }
    if (!quantityText || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
      setError('Quantity must be a whole number of 0 or more.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({ make, model, category, price, quantity });
    setSaving(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog"
      aria-labelledby="vehicle-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="dialog-heading">
          <h2 id="vehicle-dialog-title">{vehicle ? 'Edit vehicle' : 'Add vehicle'}</h2>
          <button
            className="quiet-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="dialog-fields">
          <label>
            Make
            <input name="make" required maxLength={100} defaultValue={vehicle?.make ?? ''} />
          </label>
          <label>
            Model
            <input name="model" required maxLength={100} defaultValue={vehicle?.model ?? ''} />
          </label>
          <label>
            Category
            <input
              name="category"
              required
              maxLength={100}
              defaultValue={vehicle?.category ?? ''}
            />
          </label>
          <label>
            Price
            <input
              name="price"
              type="number"
              required
              min="0"
              max="9999999999.99"
              step="0.01"
              defaultValue={vehicle?.price ?? ''}
            />
          </label>
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              required
              min="0"
              max="2147483647"
              step="1"
              defaultValue={vehicle?.quantity ?? ''}
            />
          </label>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            Save vehicle
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Rejects numeric inputs that contain more than two decimal places. */
function hasTwoDecimals(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value.trim());
}
