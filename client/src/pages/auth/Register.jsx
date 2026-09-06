import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Field, Input } from '../../components/Form.jsx';
import { extractErrorMessage, extractFieldErrors } from '../../api/client.js';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    businessType: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register(form);
      toast.success('Workspace created. Welcome to Yarn ERP!');
      navigate('/');
    } catch (err) {
      setErrors(extractFieldErrors(err) || {});
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="mark">Y</div>
        <h1>Run your yarn mill from one control panel.</h1>
        <p>Stock, beam production, traceability, and reporting for textile manufacturers — set up your workspace in under a minute.</p>
        <div className="stat-row">
          <div className="stat">
            <div className="num">9,000,000</div>
            <div className="lbl">Beam weight divisor, built in</div>
          </div>
          <div className="stat">
            <div className="num">100%</div>
            <div className="lbl">Server-verified inventory</div>
          </div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h2>Create your workspace</h2>
          <p className="sub">You'll be the Owner and can invite staff afterward.</p>
          <form onSubmit={handleSubmit}>
            <Field label="Company name" error={errors.companyName?.[0]}>
              <Input value={form.companyName} onChange={set('companyName')} placeholder="Sunrise Weaving Mills" required />
            </Field>
            <Field label="Business type" error={errors.businessType?.[0]} hint="Optional">
              <Input value={form.businessType} onChange={set('businessType')} placeholder="Yarn manufacturing" />
            </Field>
            <Field label="Your name" error={errors.ownerName?.[0]}>
              <Input value={form.ownerName} onChange={set('ownerName')} placeholder="Priya Sharma" required />
            </Field>
            <Field label="Work email" error={errors.email?.[0]}>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
            </Field>
            <Field label="Phone" error={errors.phone?.[0]} hint="Optional">
              <Input value={form.phone} onChange={set('phone')} placeholder="+91 90000 00000" />
            </Field>
            <Field label="Password" error={errors.password?.[0]} hint="At least 8 characters, with letters and numbers">
              <Input type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Creating workspace…' : 'Create workspace'}
            </button>
          </form>
          <div className="auth-switch">
            Already have a workspace? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
