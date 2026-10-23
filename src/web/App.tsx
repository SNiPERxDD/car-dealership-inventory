import { useEffect, useState } from 'react';

type HealthState = 'checking' | 'up' | 'down';

/** Placeholder shell for the P1 deployment smoke test; replaced by the real screens in P5. */
export function App() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setHealth(response.ok ? 'up' : 'down'))
      .catch(() => setHealth('down'));
  }, []);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Car Dealership Inventory</h1>
      <p className="mt-2" data-testid="api-health">
        API: {health}
      </p>
    </main>
  );
}
