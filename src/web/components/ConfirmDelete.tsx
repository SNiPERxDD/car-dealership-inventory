import { useEffect, useRef } from 'react';

interface ConfirmDeleteProps {
  make: string;
  model: string;
  onDelete: () => void;
  onCancel: () => void;
}

/** Replaces a delete action with a specific inline confirmation and safe cancel option. */
export function ConfirmDelete({ make, model, onDelete, onCancel }: ConfirmDeleteProps) {
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepButtonRef.current?.focus();
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', cancelOnEscape);
    return () => window.removeEventListener('keydown', cancelOnEscape);
  }, [onCancel]);

  return (
    <div
      className="delete-confirm"
      role="group"
      aria-label={`Confirm deletion of ${make} ${model}`}
    >
      <p>
        Delete {make} {model}? This removes it from the lot.
      </p>
      <button className="danger-button" type="button" onClick={onDelete}>
        Delete vehicle
      </button>
      <button className="secondary-button" type="button" onClick={onCancel} ref={keepButtonRef}>
        Keep
      </button>
    </div>
  );
}
