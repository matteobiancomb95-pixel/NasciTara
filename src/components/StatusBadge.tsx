export type ModuleStatus = 'complete' | 'partial' | 'waiting';

const LABELS: Record<ModuleStatus, string> = {
  complete: 'Completo',
  partial: 'Parziale',
  waiting: 'In attesa',
};

/** Lo stato e' portato da testo + forma, non dal solo colore. */
export function StatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
