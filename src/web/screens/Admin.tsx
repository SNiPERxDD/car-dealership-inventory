import { useEffect, useRef, useState } from 'react';
import type { Vehicle, VehicleFields } from '../hooks/useVehicles';
import { ConfirmDelete } from '../components/ConfirmDelete';
import { RestockDialog } from '../components/RestockDialog';
import { StockOdometer } from '../components/StockOdometer';
import { VehicleFormDialog } from '../components/VehicleFormDialog';
import { formatPrice } from '../components/VehicleSticker';

/** Formats the total stock value as a short currency figure such as $1.2M. */
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

interface AdminProps {
  vehicles: Vehicle[];
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onCreate: (fields: VehicleFields) => Promise<string | null>;
  onUpdate: (id: string, fields: VehicleFields) => Promise<string | null>;
  onRestock: (vehicle: Vehicle, quantity: number) => Promise<string | null>;
  onDelete: (vehicle: Vehicle) => Promise<string | null>;
}

/** Renders the manager's responsive stock table and vehicle management dialogs. */
export function Admin({
  vehicles,
  loading,
  loadError,
  onRetry,
  onCreate,
  onUpdate,
  onRestock,
  onDelete,
}: AdminProps) {
  const [vehicleForm, setVehicleForm] = useState<Vehicle | 'new' | null>(null);
  const [restockVehicle, setRestockVehicle] = useState<Vehicle | null>(null);
  const [confirmingId, setConfirmingId] = useState('');
  const deleteButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const previousConfirmingId = useRef('');

  useEffect(() => {
    if (previousConfirmingId.current && !confirmingId) {
      deleteButtonsRef.current.get(previousConfirmingId.current)?.focus();
    }
    previousConfirmingId.current = confirmingId;
  }, [confirmingId]);

  /** Routes the shared dialog payload to the create or replacement endpoint. */
  const saveVehicle = (fields: VehicleFields) =>
    vehicleForm === 'new' ? onCreate(fields) : onUpdate(vehicleForm!.id, fields);

  /** Removes a vehicle after confirmation and closes the prompt on success. */
  const removeVehicle = async (vehicle: Vehicle) => {
    const error = await onDelete(vehicle);
    if (!error) setConfirmingId('');
  };

  const unitsOnHand = vehicles.reduce((total, vehicle) => total + vehicle.quantity, 0);
  const awaitingRestock = vehicles.filter((vehicle) => vehicle.quantity === 0).length;
  const stockValue = vehicles.reduce(
    (total, vehicle) => total + vehicle.price * vehicle.quantity,
    0,
  );

  return (
    <section className="admin-screen" aria-labelledby="admin-title">
      <div className="screen-heading admin-heading">
        <div>
          <p className="section-kicker">Back office</p>
          <h1 id="admin-title">Manage stock</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setVehicleForm('new')}>
          Add vehicle
        </button>
      </div>
      {loadError ? (
        <div className="empty-state inventory-error" role="alert">
          <h2>Inventory could not load.</h2>
          <p>{loadError}</p>
          <button className="secondary-button" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="empty-state" aria-busy="true">
          Loading inventory…
        </div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state admin-empty">
          <h2>The lot is empty. Add the first vehicle.</h2>
        </div>
      ) : (
        <>
          <dl className="stock-ledger">
            <div>
              <dt>Models</dt>
              <dd>{vehicles.length}</dd>
            </div>
            <div>
              <dt>Units on hand</dt>
              <dd>{unitsOnHand}</dd>
            </div>
            <div className={awaitingRestock ? 'needs-attention' : undefined}>
              <dt>Awaiting restock</dt>
              <dd>{awaitingRestock}</dd>
            </div>
            <div>
              <dt>Stock value</dt>
              <dd>{compactCurrency.format(stockValue)}</dd>
            </div>
          </dl>
          <div className="inventory-table-wrap">
            <table className="inventory-table" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader">Make</th>
                  <th role="columnheader">Model</th>
                  <th role="columnheader">Category</th>
                  <th role="columnheader">Price</th>
                  <th role="columnheader">Stock</th>
                  <th role="columnheader">Actions</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {vehicles.map((vehicle) => (
                  <tr
                    role="row"
                    key={vehicle.id}
                    className={vehicle.quantity === 0 ? 'is-sold-out' : undefined}
                  >
                    <td role="cell" data-label="Make">
                      {vehicle.make}
                    </td>
                    <td role="cell" data-label="Model" className="admin-model">
                      {vehicle.model}
                    </td>
                    <td role="cell" data-label="Category">
                      <span className="category-chip">{vehicle.category}</span>
                    </td>
                    <td role="cell" data-label="Price" className="data-text">
                      {formatPrice(vehicle.price)}
                    </td>
                    <td role="cell" data-label="Stock">
                      <StockOdometer quantity={vehicle.quantity} compact />
                    </td>
                    <td role="cell" data-label="Actions">
                      <div
                        className={`row-actions${confirmingId === vehicle.id ? ' is-hidden' : ''}`}
                      >
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setVehicleForm(vehicle)}
                        >
                          Edit
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setRestockVehicle(vehicle)}
                        >
                          Restock
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          ref={(element) => {
                            if (element) deleteButtonsRef.current.set(vehicle.id, element);
                            else deleteButtonsRef.current.delete(vehicle.id);
                          }}
                          onClick={() => setConfirmingId(vehicle.id)}
                        >
                          Delete
                        </button>
                      </div>
                      {confirmingId === vehicle.id && (
                        <ConfirmDelete
                          make={vehicle.make}
                          model={vehicle.model}
                          onDelete={() => void removeVehicle(vehicle)}
                          onCancel={() => setConfirmingId('')}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {vehicleForm && (
        <VehicleFormDialog
          vehicle={vehicleForm === 'new' ? undefined : vehicleForm}
          onSave={saveVehicle}
          onClose={() => setVehicleForm(null)}
        />
      )}
      {restockVehicle && (
        <RestockDialog
          vehicle={restockVehicle}
          onRestock={(quantity) => onRestock(restockVehicle, quantity)}
          onClose={() => setRestockVehicle(null)}
        />
      )}
    </section>
  );
}
