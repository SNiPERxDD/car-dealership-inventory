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

  /** Restores the current inventory results when returning from stock management. */
  const openInventory = () => {
    if (screen === 'inventory') return;
    setScreen('inventory');
    if (inventory.searchActive) inventory.search(inventory.filters);
    else inventory.reload();
  };

  /** Loads the full list before showing stock management after a filtered search. */
  const openAdmin = () => {
    if (screen === 'admin') return;
    setScreen('admin');
    if (inventory.searchActive) void inventory.loadAll();
  };

  // Each screen opens at the top instead of inheriting the previous screen's scroll offset.
  useLayoutEffect(() => {
    if (window.scrollY > 0) window.scrollTo(0, 0);
  }, [screen]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand-lockup"
            href="#inventory"
            onClick={(event) => {
              event.preventDefault();
              openInventory();
            }}
          >
            <span className="wordmark">Northgate Motors</span>
            <span className="brand-caption">Lot inventory</span>
          </a>
          <nav className="main-tabs" aria-label="Main navigation">
            <button
              type="button"
              aria-current={!showAdmin ? 'page' : undefined}
              onClick={openInventory}
            >
              Inventory
            </button>
            {isAdmin && (
              <button
                type="button"
                aria-current={showAdmin ? 'page' : undefined}
                onClick={openAdmin}
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
            vehicles={inventory.unfilteredVehicles}
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
            filters={inventory.filters}
            searchActive={inventory.searchActive}
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
            onFiltersChange={inventory.updateFilters}
            onClear={inventory.clearSearch}
            onPurchase={inventory.purchase}
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
import { useLayoutEffect, useState } from 'react';
