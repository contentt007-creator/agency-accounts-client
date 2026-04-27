import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import { dashboard, fmt, fmtDate } from '../api/index.js';

const TYPE_LABELS = { journal: 'Journal', invoice: 'Invoice', payment: 'Payment', bill: 'Bill', bill_payment: 'Bill Payment', expense: 'Expense', receipt: 'Receipt' };

const TYPE_COLORS = { payment: '#16a34a', invoice: '#2563eb', bill_payment: '#dc2626', bill: '#d97706', journal: '#6b7280', expense: '#dc2626', receipt: '#16a34a' };

const BDTFormatter = (v) => `৳${(v / 1000).toFixed(0)}k`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [aging, setAging] = useState(null);
  const [agingTab, setAgingTab] = useState('receivables');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.summary(),
      dashboard.agingReceivables(),
    ]).then(([s, a]) => {
      setSummary(s.data);
      setAging({ receivables: a.data });
      setLoading(false);
    });
    dashboard.monthly().then((r) => setMonthly(r.data));
    dashboard.topClients().then((r) => setTopClients(r.data));
  }, []);

  useEffect(() => {
    if (agingTab === 'payables' && aging && !aging.payables) {
      dashboard.agingPayables().then((r) => setAging((a) => ({ ...a, payables: r.data })));
    }
  }, [agingTab]);

  const BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'];
  const currentAging = agingTab === 'receivables' ? aging?.receivables : aging?.payables;
  const periodData = summary?.[period] || {};

  if (loading) return <div style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>Loading dashboard...</div>;

  const maxBar = Math.max(...monthly.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <div>
      {/* Row 1 — Big KPI cards */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-title">Total Receivables</div>
          <div className="card-value text-success">{fmt(summary?.receivables.total)}</div>
          {summary?.receivables.overdueCount > 0 && (
            <div className="card-sub text-danger">⚠ {fmt(summary.receivables.overdue)} overdue ({summary.receivables.overdueCount})</div>
          )}
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="card-title">Total Payables</div>
          <div className="card-value text-danger">{fmt(summary?.payables.total)}</div>
          {summary?.payables.overdueCount > 0 && (
            <div className="card-sub text-danger">⚠ {fmt(summary.payables.overdue)} overdue ({summary.payables.overdueCount})</div>
          )}
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="card-title">Cash & Asset Balance</div>
          <div className="card-value">{fmt(summary?.cashBalance)}</div>
          <div className="card-sub">Total asset accounts</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-title">Active Loans Given</div>
          <div className="card-value text-warning">{fmt(summary?.loans.total)}</div>
          <div className="card-sub">{summary?.loans.count || 0} loan{summary?.loans.count !== 1 ? 's' : ''} outstanding</div>
        </div>
      </div>

      {/* Row 2 — Period snapshot */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Period Snapshot</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['today', 'week', 'month'].map((p) => (
              <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod(p)} style={{ textTransform: 'capitalize' }}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-4">
          <div style={{ textAlign: 'center', padding: '12px 0', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Invoiced</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(periodData.invoiced)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{periodData.invoiceCount || 0} invoice{periodData.invoiceCount !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Collected</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{fmt(periodData.collected)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Cash received</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Bills Paid</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{fmt(periodData.billsPaid)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Cash out</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Net Cash Flow</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: (periodData.net || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {(periodData.net || 0) >= 0 ? '+' : ''}{fmt(periodData.net)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>In - Out</div>
          </div>
        </div>
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* Income vs Expense Bar Chart */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h3>Income vs Expense — Last 6 Months</h3>
          </div>
          {monthly.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={BDTFormatter} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit Trend Area Chart */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h3>Net Profit Trend — Last 6 Months</h3>
          </div>
          {monthly.length === 0 ? (
            <div className="empty"><div className="empty-icon">📈</div><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={BDTFormatter} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#2563eb" fill="url(#profitGrad)" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4 — Top Clients + Aging */}
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* Top Clients */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3>Top Clients — This Month</h3>
          </div>
          {topClients.length === 0 ? (
            <div className="empty"><div className="empty-icon">👥</div><p>No invoices this month</p></div>
          ) : (
            topClients.map((c, i) => {
              const pct = Math.round((c.collected / (c.total || 1)) * 100);
              return (
                <div key={c._id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)', marginRight: 6, fontSize: 11 }}>#{i + 1}</span>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: 'var(--success)', height: '100%', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11, color: 'var(--muted)' }}>
                    <span>{c.count} invoice{c.count !== 1 ? 's' : ''}</span>
                    <span>{fmt(c.collected)} collected ({pct}%)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Aging Report */}
        <div className="card">
          <div style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Aging Report</h3>
          </div>
          <div className="tabs" style={{ marginBottom: 14 }}>
            <div className={`tab${agingTab === 'receivables' ? ' active' : ''}`} onClick={() => setAgingTab('receivables')}>Receivables</div>
            <div className={`tab${agingTab === 'payables' ? ' active' : ''}`} onClick={() => setAgingTab('payables')}>Payables</div>
          </div>
          {BUCKETS.map((b) => {
            const items = currentAging?.[b] || [];
            const total = items.reduce((s, i) => s + i.amountDue, 0);
            const isOverdue = b !== 'current' && items.length > 0;
            return (
              <div className="stat-row" key={b}>
                <div>
                  <span className="fw-600" style={{ fontSize: 13 }}>{b === 'current' ? 'Current (not due)' : `${b} days overdue`}</span>
                  <span className="text-muted" style={{ fontSize: 11, marginLeft: 8 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <span className={`fw-600 ${isOverdue ? 'text-danger' : 'text-muted'}`}>{fmt(total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 5 — Recent Transactions */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h3>Recent Transactions</h3>
        </div>
        {summary?.recentTransactions?.length === 0 && (
          <div className="empty"><div className="empty-icon">↕️</div><p>No transactions yet</p></div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Type</th><th>Contact</th></tr>
            </thead>
            <tbody>
              {summary?.recentTransactions?.map((t) => (
                <tr key={t._id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(t.date)}</td>
                  <td className="fw-600" style={{ fontSize: 13 }}>{t.description}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f3f4f6', color: TYPE_COLORS[t.type] || '#374151' }}>
                      {TYPE_LABELS[t.type]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.contact?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
