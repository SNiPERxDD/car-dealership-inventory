import { useState } from 'react';
import type { Vehicle, VehicleFields } from '../hooks/useVehicles';
import { ConfirmDelete } from '../components/ConfirmDelete';
import { RestockDialog } from '../components/RestockDialog';
import { StockOdometer } from '../components/StockOdometer';
import { VehicleFormDialog } from '../components/VehicleFormDialog';
import { formatPrice } from '../components/VehicleSticker';

interface AdminProps {
  vehicles: Vehicle[];
  onCreate: (fields: VehicleFields) => Promise<string | null>;
  onUpdate: (id: string, fields: VehicleFields) => Promise<string | null>;
  onRestock: (vehicle: Vehicle, quantity: number) => Promise<string | null>;
  onDelete: (vehicle: Vehicle) => Promise<string | null>;
}

/** Renders the manager's responsive stock table and vehicle management dialogs. */
export function Admin({ vehicles, onCreate, onUpdate, onRestock, onDelete }: AdminProps) {
  const [vehicleForm, setVehicleForm] = useState<Vehicle | 'new' | null>(null);
  const [restockVehicle, setRestockVehicle] = useState<Vehicle | null>(null);
  const [confirmingId, setConfirmingId] = useState('');

  /** Routes the shared dialog payload to the create or replacement endpoint. */
  const saveVehicle = (fields: VehicleFields) =>
    vehicleForm === 'new' ? onCreate(fields) : onUpdate(vehicleForm!.id, fields);

  /** Removes a vehicle after confirmation and closes the prompt on success. */
  const removeVehicle = async (vehicle: Vehicle) => {
    const error = await onDelete(vehicle);
    if (!error) setConfirmingId('');
  };

  return (
    <section className="admin-screen" aria-labelledby="admin-title">
      <div className="screen-heading admin-heading">
        <div>
          <h1 id="admin-title">Manage stock</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setVehicleForm('new')}>
          Add vehicle
        </button>
      </div>
      {vehicles.length === 0 ? (
        <div className="empty-state admin-empty">
          <h2>The lot is empty. Add the first vehicle.</h2>
        </div>
      ) : (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td data-label="Make">{vehicle.make}</td>
                  <td data-label="Model" className="admin-model">
                    {vehicle.model}
                  </td>
                  <td data-label="Category">{vehicle.category}</td>
                  <td data-label="Price" className="data-text">
                    {formatPrice(vehicle.price)}
                  </td>
                  <td data-label="Stock">
                    <StockOdometer quantity={vehicle.quantity} compact />
                  </td>
                  <td data-label="Actions">
                    {confirmingId === vehicle.id ? (
                      <ConfirmDelete
                        make={vehicle.make}
                        onDelete={() => void removeVehicle(vehicle)}
                        onCancel={() => setConfirmingId('')}
                      />
                    ) : (
                      <div className="row-actions">
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
                          onClick={() => setConfirmingId(vehicle.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
