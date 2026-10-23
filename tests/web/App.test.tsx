// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/web/App';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

const vehicle: Vehicle = {
  id: 'd0d6b2fd-3c44-46c3-9c2b-5a6549d44c01',
  make: 'Bolt',
  model: 'Trail',
  category: 'SUV',
  price: 28000,
  quantity: 3,
};

const authResult = (role: 'user' | 'admin' = 'user') => ({
  token: 'session-token',
  user: { id: 'user-1', email: 'staff@northgate.example', role },
});

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchMock(): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.mocked(fetch);
}

async function signIn() {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Email'), 'staff@northgate.example');
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}

function apiCall(index: number): { url: URL; init: RequestInit } {
  const [input, init = {}] = fetchMock().mock.calls[index]!;
  return { url: new URL(String(input), window.location.origin), init };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>());
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Northgate inventory application', () => {
  it('stores the returned session after sign-in and opens Inventory', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockResolvedValueOnce(response([vehicle]));

    await signIn();

    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(localStorage.getItem('car.session')).toBe('session-token');
  });

  it('shows the server message when sign-in fails', async () => {
    fetchMock().mockResolvedValueOnce(
      response(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } },
        401,
      ),
    );

    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'staff@northgate.example');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument();
  });

  it('validates registration passwords before calling the API', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await user.type(screen.getByLabelText('Email'), 'new@northgate.example');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('registers a valid account through the register endpoint', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult(), 201))
      .mockResolvedValueOnce(response([]));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await user.type(screen.getByLabelText('Email'), 'new@northgate.example');
    await user.type(screen.getByLabelText('Password'), 'long-enough-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(apiCall(0).url.pathname).toBe('/api/auth/register');
  });

  it('renders vehicles and disables purchase when stock is zero', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockResolvedValueOnce(response([{ ...vehicle, quantity: 0 }]));

    await signIn();

    expect(await screen.findByText('Trail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase' })).toBeDisabled();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('searches only filled filters and Clear filters returns to the full list', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response([vehicle]));
    const user = await signIn();
    await user.type(screen.getByLabelText('Make'), 'Bolt');
    await user.type(screen.getByLabelText('Minimum price'), '20000');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(apiCall(2).url.pathname).toBe('/api/vehicles/search'));
    expect(apiCall(2).url.search).toBe('?make=Bolt&minPrice=20000');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(apiCall(3).url.pathname).toBe('/api/vehicles'));
  });

  it('keeps search results when the initial inventory response arrives late', async () => {
    const staleVehicle = { ...vehicle, id: 'stale', model: 'Stale listing' };
    const searchResult = { ...vehicle, id: 'search', model: 'Matching result' };
    let resolveInitial!: (result: Response) => void;
    const initialRequest = new Promise<Response>((resolve) => {
      resolveInitial = resolve;
    });
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockImplementationOnce(() => initialRequest)
      .mockResolvedValueOnce(response([searchResult]));

    const user = await signIn();
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(2));
    await user.type(screen.getByLabelText('Model'), 'Matching');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('heading', { name: 'MATCHING RESULT' })).toBeInTheDocument();

    await act(async () => {
      resolveInitial(response([staleVehicle]));
      await initialRequest;
    });

    expect(screen.getByRole('heading', { name: 'MATCHING RESULT' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'STALE LISTING' })).not.toBeInTheDocument();
  });

  it('purchases one vehicle, updates stock, and announces success', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response({ ...vehicle, quantity: 2 }))
      .mockResolvedValueOnce(response([{ ...vehicle, quantity: 2 }]));
    const user = await signIn();
    await user.click(await screen.findByRole('button', { name: 'Purchase' }));

    expect(await screen.findByText('Purchased 1 × Bolt Trail.')).toBeInTheDocument();
    expect(screen.getByText('002')).toBeInTheDocument();
    expect(apiCall(2).url.pathname).toBe(`/api/vehicles/${vehicle.id}/purchase`);
    expect(apiCall(2).init.method).toBe('POST');
    expect([undefined, '']).toContain(apiCall(2).init.body);
  });

  it('maps an out-of-stock conflict and refreshes the vehicle list', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult()))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(
        response({ error: { code: 'OUT_OF_STOCK', message: 'Vehicle is out of stock' } }, 409),
      )
      .mockResolvedValueOnce(response([{ ...vehicle, quantity: 0 }]));
    const user = await signIn();
    await user.click(await screen.findByRole('button', { name: 'Purchase' }));

    expect(
      await screen.findByText('None left in stock. The listing has been refreshed.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(apiCall(3).url.pathname).toBe('/api/vehicles'));
  });

  it('hides stock management from regular users and shows it to admins', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult('user')))
      .mockResolvedValueOnce(response([]));
    await signIn();
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage stock' })).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    fetchMock()
      .mockResolvedValueOnce(response(authResult('admin')))
      .mockResolvedValueOnce(response([]));
    await signIn();
    expect(await screen.findByRole('button', { name: 'Manage stock' })).toBeInTheDocument();
  });

  it('creates, edits, restocks, and confirms deletion of vehicles as an admin', async () => {
    fetchMock()
      .mockResolvedValueOnce(response(authResult('admin')))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response(vehicle, 201))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response(vehicle))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response({ ...vehicle, quantity: 8 }))
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response(undefined, 204))
      .mockResolvedValueOnce(response([]));
    const user = await signIn();
    await user.click(await screen.findByRole('button', { name: 'Manage stock' }));

    await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
    await user.type(screen.getByLabelText('Make'), 'Bolt');
    await user.type(screen.getByLabelText('Model'), 'Trail');
    await user.type(screen.getByLabelText('Category'), 'SUV');
    await user.type(screen.getByLabelText('Price'), '28000');
    await user.type(screen.getByLabelText('Quantity'), '3');
    await user.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() => expect(apiCall(2).url.pathname).toBe('/api/vehicles'));
    expect(apiCall(2).init.method).toBe('POST');
    expect(apiCall(2).init.body).toBe(
      JSON.stringify({ make: 'Bolt', model: 'Trail', category: 'SUV', price: 28000, quantity: 3 }),
    );

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), '29000');
    await user.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() => expect(apiCall(4).init.method).toBe('PUT'));
    expect(apiCall(4).url.pathname).toBe(`/api/vehicles/${vehicle.id}`);
    expect(apiCall(4).init.body).toBe(
      JSON.stringify({ make: 'Bolt', model: 'Trail', category: 'SUV', price: 29000, quantity: 3 }),
    );

    await user.click(await screen.findByRole('button', { name: 'Restock' }));
    await user.type(screen.getByLabelText('Quantity to restock'), '5');
    await user.click(screen.getByRole('button', { name: 'Restock vehicle' }));
    await waitFor(() =>
      expect(apiCall(6).url.pathname).toBe(`/api/vehicles/${vehicle.id}/restock`),
    );
    expect(apiCall(6).init.method).toBe('POST');
    expect(apiCall(6).init.body).toBe(JSON.stringify({ quantity: 5 }));

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Bolt? This removes it from the lot.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete vehicle' }));
    await waitFor(() => expect(apiCall(8).url.pathname).toBe(`/api/vehicles/${vehicle.id}`));
    expect(apiCall(8).init.method).toBe('DELETE');
    expect(apiCall(8).init.body).toBeUndefined();
  });

  it('clears an expired session and returns to sign-in with the expiry message', async () => {
    localStorage.setItem('car.session', 'expired-token');
    fetchMock().mockResolvedValueOnce(
      response({ error: { code: 'UNAUTHORIZED', message: 'Authentication is required' } }, 401),
    );
    render(<App />);

    expect(await screen.findByText('Your session expired. Sign in again.')).toBeInTheDocument();
    expect(localStorage.getItem('car.session')).toBeNull();
  });

  it('shows a clear message when the server cannot be reached', async () => {
    fetchMock().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'staff@northgate.example');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Could not reach the server. Check your connection and try again.'),
    ).toBeInTheDocument();
  });
});
