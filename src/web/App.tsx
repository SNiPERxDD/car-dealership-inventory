import { Admin } from './screens/Admin';
import { Auth } from './screens/Auth';
import { Inventory } from './screens/Inventory';
import { StatusRegion } from './components/StatusRegion';
import { useSession } from './hooks/useSession';
import { useVehicles } from './hooks/useVehicles';

/** Routes between authentication, inventory, and administrator stock management. */
export function App() {
  const { session, expired, authenticate, logout, expire } = useSession();

  if (!session) return <Auth expired={expired} onAuthenticate={authenticate} />;

  return (
    <SignedInApp key={session.token} session={session} onLogout={logout} onUnauthorized={expire} />
  );
}

/** Owns signed-in navigation and inventory state for one authenticated session. */
function SignedInApp({
  session,
  onLogout,
  onUnauthorized,
}: {
  session: NonNullable<ReturnType<typeof useSession>['session']>;
  onLogout: () => void;
  onUnauthorized: () => void;
}) {
  const inventory = useVehicles(session.token, onUnauthorized);
  const [screen, setScreen] = useState<'inventory' | 'admin'>('inventory');
  const isAdmin = session.user.role === 'admin';
  const showAdmin = isAdmin && screen === 'admin';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand-lockup"
            href="#inventory"
            onClick={(event) => {
              event.preventDefault();
              setScreen('inventory');
            }}
          >
            <span className="wordmark">Northgate Motors</span>
            <span className="brand-caption">Lot inventory</span>
          </a>
          <nav className="main-tabs" aria-label="Main navigation">
            <button
              type="button"
              aria-current={!showAdmin ? 'page' : undefined}
              onClick={() => setScreen('inventory')}
            >
              Inventory
            </button>
            {isAdmin && (
              <button
                type="button"
                aria-current={showAdmin ? 'page' : undefined}
                onClick={() => setScreen('admin')}
              >
                Manage stock
              </button>
            )}
          </nav>
          <div className="account-actions">
            <span className="account-email">{session.user.email}</span>
            <button className="topbar-signout" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={`page-content${inventory.toast ? ' has-toast' : ''}`}>
        {showAdmin ? (
          <Admin
            vehicles={inventory.vehicles}
            loading={inventory.loading}
            loadError={inventory.loadError}
            onRetry={inventory.reload}
            onCreate={inventory.create}
            onUpdate={inventory.update}
            onRestock={inventory.restock}
            onDelete={inventory.remove}
          />
        ) : (
          <Inventory
            vehicles={inventory.vehicles}
            priceCeiling={
              inventory.unfilteredVehicles.length
                ? Math.ceil(
                    Math.max(...inventory.unfilteredVehicles.map((vehicle) => vehicle.price)) /
                      5000,
                  ) * 5000
                : 100_000
            }
            loading={inventory.loading}
            loadError={inventory.loadError}
            onSearch={inventory.search}
            onClear={inventory.reload}
            onPurchase={(vehicle) => void inventory.purchase(vehicle)}
          />
        )}
        <StatusRegion
          message={inventory.toast}
          tone={inventory.toastError ? 'error' : 'success'}
          onDismiss={() => inventory.setToast('')}
        />
      </main>
    </div>
  );
}
import { useState } from 'react';
