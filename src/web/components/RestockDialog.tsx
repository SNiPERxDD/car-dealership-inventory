import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Vehicle } from '../hooks/useVehicles';

interface RestockDialogProps {
  vehicle: Vehicle;
  onRestock: (quantity: number) => Promise<string | null>;
  onClose: () => void;
}

/** Collects and validates a positive whole-number restock quantity. */
export function RestockDialog({ vehicle, onRestock, onClose }: RestockDialogProps) {
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

  /** Rejects invalid quantities and reports server failures beside the form. */
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get('quantity') ?? '');
    const quantity = Number(value);
    if (!value || !Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      setError('Restock quantity must be a whole number of at least 1.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onRestock(quantity);
    setSaving(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="form-dialog compact-dialog"
      aria-labelledby="restock-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="dialog-heading">
          <h2 id="restock-dialog-title">
            Restock {vehicle.make} {vehicle.model}
          </h2>
          <button
            className="quiet-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <label>
          Quantity to restock
          <input
            name="quantity"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            required
            autoFocus
          />
        </label>
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
            Restock vehicle
          </button>
        </div>
      </form>
    </dialog>
  );
}
