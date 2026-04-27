import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import Bills from './pages/Bills.jsx';
import Transactions from './pages/Transactions.jsx';
import Contacts from './pages/Contacts.jsx';
import Accounts from './pages/Accounts.jsx';
import Ledger from './pages/Ledger.jsx';
import Loans from './pages/Loans.jsx';
import Reports from './pages/Reports.jsx';

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
};

export default function App() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Accounts';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Agency Accounts</h1>
          <p>Financial Management</p>
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
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
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
          </Routes>
        </main>
      </div>
    </div>
  );
}
