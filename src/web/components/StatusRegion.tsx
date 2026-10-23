interface StatusRegionProps {
  message: string;
  tone: 'success' | 'error';
  onDismiss?: () => void;
}

/** Announces success and error messages through one polite live region. */
export function StatusRegion({ message, tone, onDismiss }: StatusRegionProps) {
  return (
    <div className="status-region" aria-live="polite" aria-atomic="true">
      {message && (
        <div className={`status-message${tone === 'error' ? ' is-error' : ''}`} role="status">
          <span>{message}</span>
          {onDismiss && (
            <button
              className="quiet-button"
              type="button"
              aria-label="Dismiss message"
              onClick={onDismiss}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
