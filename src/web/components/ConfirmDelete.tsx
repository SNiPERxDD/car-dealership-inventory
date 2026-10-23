interface ConfirmDeleteProps {
  make: string;
  onDelete: () => void;
  onCancel: () => void;
}

/** Replaces a delete action with a specific inline confirmation and safe cancel option. */
export function ConfirmDelete({ make, onDelete, onCancel }: ConfirmDeleteProps) {
  return (
    <div className="delete-confirm" role="group" aria-label={`Confirm deletion of ${make}`}>
      <p>Delete {make}? This removes it from the lot.</p>
      <button className="danger-button" type="button" onClick={onDelete}>
        Delete vehicle
      </button>
      <button className="secondary-button" type="button" onClick={onCancel}>
        Keep
      </button>
    </div>
  );
}
