import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login'); // 'login' | 'setup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await axios.post(`${BASE}/auth/setup`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      toast.success('Admin account created! Please log in.');
      setTab('login');
      setForm((f) => ({ ...f, name: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>☂️</div>
          <h1 style={styles.brandName}>UmbrellaCorp HQ</h1>
          <p style={styles.brandSub}>umbrellacorphq.com · Accounts & Finance</p>
        </div>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'setup' ? styles.tabActive : {}) }}
            onClick={() => setTab('setup')}
          >
            First-time Setup
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  style={{ ...styles.input, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={styles.eyeBtn}
                  title={showPass ? 'Hide' : 'Show'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetup} style={styles.form}>
            <div style={styles.setupNote}>
              ℹ️ This creates the first admin account. Only works when no users exist yet.
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                required
                placeholder="Your name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  style={{ ...styles.input, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={styles.eyeBtn}
                  title={showPass ? 'Hide' : 'Show'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Creating…' : 'Create Admin Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
  },
  brand: { textAlign: 'center', marginBottom: 28 },
  brandIcon: { fontSize: 44, marginBottom: 8 },
  brandName: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' },
  brandSub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  tabs: {
    display: 'flex',
    gap: 4,
    background: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all .15s',
  },
  tabActive: {
    background: '#fff',
    color: '#1e293b',
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  setupNote: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#1d4ed8',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  },
  submitBtn: {
    marginTop: 4,
    padding: '12px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background .15s',
  },
};
