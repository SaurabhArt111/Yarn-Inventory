import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Field, Input } from '../../components/Form.jsx';
import { extractErrorMessage } from '../../api/client.js';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="mark">Y</div>
        <h1>Every beam traced back to its source stock, automatically.</h1>
        <p>Log in to see today's stock, production, and remaining inventory across every quality and shade.</p>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h2>Log in</h2>
          <p className="sub">Welcome back.</p>
          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label="Password" error={error}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <div className="auth-switch">
            New here? <Link to="/register">Create a workspace</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
