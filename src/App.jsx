import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import Bills from './pages/Bills.jsx';
import Transactions from './pages/Transactions.jsx';
import Contacts from './pages/Contacts.jsx';
import Accounts from './pages/Accounts.jsx';
import Ledger from './pages/Ledger.jsx';
import Loans from './pages/Loans.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Login from './pages/Login.jsx';

const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard', end: true },
  { to: '/invoices', icon: '🧾', label: 'Invoices' },
  { to: '/bills', icon: '📋', label: 'Bills (Payables)' },
  { to: '/transactions', icon: '↕️', label: 'Transactions' },
  { to: '/loans', icon: '🤝', label: 'Loans Given' },
  { to: '/ledger', icon: '📒', label: 'Ledger' },
  { to: '/contacts', icon: '👥', label: 'Contacts' },
  { to: '/accounts', icon: '🏦', label: 'Chart of Accounts' },
  { to: '/reports', icon: '📄', label: 'Reports' },
];

const pageTitles = {
  '/': 'Dashboard',
  '/invoices': 'Invoices',
  '/bills': 'Bills & Payables',
  '/transactions': 'Transactions',
  '/loans': 'Loans Given',
  '/ledger': 'Ledger',
  '/contacts': 'Contacts',
  '/accounts': 'Chart of Accounts',
  '/reports': 'Reports',
  '/users': 'User Management',
};

const ROLE_BADGE = { admin: '#dc2626', manager: '#ca8a04', viewer: '#16a34a' };

// Wrapper that redirects to /login when not authenticated
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ color: '#94a3b8', fontSize: 15 }}>Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Accounts';

  // Public login route
  if (!loading && !user && pathname !== '/login') {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  if (pathname === '/login' || (!user && loading)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          loading
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
                <div style={{ color: '#94a3b8', fontSize: 15 }}>Loading…</div>
              </div>
            : <Navigate to="/login" replace />
        } />
      </Routes>
    );
  }

  return (
    <RequireAuth>
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <h1>UmbrellaCorp HQ</h1>
            <p>umbrellacorphq.com</p>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">Menu</div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}

            {/* Users — visible to all, but admin-only actions handled inside */}
            <div className="nav-section" style={{ marginTop: 12 }}>Settings</div>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">👤</span>
              Users
            </NavLink>
          </nav>

          {/* User pill at bottom of sidebar */}
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: ROLE_BADGE[user?.role] || '#94a3b8',
                  }}>
                    {user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: '5px 8px',
                  lineHeight: 1,
                  transition: 'all .15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(239,68,68,0.2)'; e.target.style.color = '#f87171'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.color = '#94a3b8'; }}
              >
                ⎋
              </button>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <h2>{title}</h2>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
              Logged in as <strong style={{ color: 'var(--text)' }}>{user?.name}</strong>
            </div>
          </header>
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
