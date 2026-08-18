export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => onDismiss(t.id)}>
          <span className="toast-icon">{t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}