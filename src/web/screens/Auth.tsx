import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../lib/api-client';

interface AuthProps {
  expired: boolean;
  onAuthenticate: (mode: 'login' | 'register', email: string, password: string) => Promise<void>;
}

/** Presents the sign-in and registration forms beside the dealership forecourt hero. */
export function Auth({ expired, onAuthenticate }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Validates credentials and forwards the selected login or registration request. */
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onAuthenticate(mode, email, password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Changes the selected auth form and clears its previous validation message. */
  const changeMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
  };

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <p className="wordmark">Northgate Motors</p>
        <p className="brand-caption">Lot inventory</p>
        <p className="auth-tagline">
          Your next car is <span>already on the lot.</span>
        </p>
        <p className="auth-note">Buyers browse and purchase. Staff restock and manage the lot.</p>
      </div>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-content">
          <p className="section-kicker">Buyers and staff</p>
          <h1 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
          <div className="auth-segment" role="group" aria-label="Account access">
            <button
              type="button"
              aria-pressed={mode === 'login'}
              aria-label={mode === 'login' ? 'Sign in selected' : 'Sign in'}
              onClick={() => changeMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === 'register'}
              aria-label={mode === 'register' ? 'Create account selected' : 'Create account'}
              onClick={() => changeMode('register')}
            >
              Create account
            </button>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
            </label>
            {mode === 'register' && <p className="field-hint">Use at least 8 characters.</p>}
            {expired && !error && (
              <p className="inline-error" role="alert">
                Your session expired. Sign in again.
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
