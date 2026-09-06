export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {error && <div className="error-text">{error}</div>}
      {!error && hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Input({ error, className = '', ...props }) {
  return <input className={`input ${error ? 'has-error' : ''} ${className}`} {...props} />;
}

export function Textarea({ error, className = '', ...props }) {
  return <textarea className={`input ${error ? 'has-error' : ''} ${className}`} rows={3} {...props} />;
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={`select ${error ? 'has-error' : ''} ${className}`} {...props}>
      {children}
    </select>
  );
}

// Prevents the mouse wheel from silently changing a focused numeric input
// (Section 35 requirement) by blurring it on wheel.
export function NumberInput(props) {
  return <Input type="number" onWheel={(e) => e.target.blur()} {...props} />;
}
