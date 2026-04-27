import { useEffect, useState } from 'react';
import { dashboard, fmt, fmtDate } from '../api/index.js';

const TYPE_LABELS = {
  journal: 'Journal',
  invoice: 'Invoice',
  payment: 'Payment',
  bill: 'Bill',
  bill_payment: 'Bill Payment',
  expense: 'Expense',
  receipt: 'Receipt',
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [aging, setAging] = useState(null);
  const [agingTab, setAgingTab] = useState('receivables');

  useEffect(() => {
    dashboard.summary().then((r) => setSummary(r.data));
    dashboard.agingReceivables().then((r) => setAging({ receivables: r.data }));
  }, []);

  useEffect(() => {
    if (agingTab === 'payables' && aging && !aging.payables) {
      dashboard.agingPayables().then((r) => setAging((a) => ({ ...a, payables: r.data })));
    }
  }, [agingTab]);

  const BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'];
  const currentAging = agingTab === 'receivables' ? aging?.receivables : aging?.payables;

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Total Receivables</div>
          <div className="card-value text-success">{fmt(summary?.receivables.total)}</div>
          {summary?.receivables.overdueCount > 0 && (
            <div className="card-sub text-danger">
              {fmt(summary.receivables.overdue)} overdue ({summary.receivables.overdueCount})
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Total Payables</div>
          <div className="card-value text-danger">{fmt(summary?.payables.total)}</div>
          {summary?.payables.overdueCount > 0 && (
            <div className="card-sub text-danger">
              {fmt(summary.payables.overdue)} overdue ({summary.payables.overdueCount})
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">This Month — Invoiced</div>
          <div className="card-value">{fmt(summary?.thisMonth.invoiced)}</div>
          <div className="card-sub">{summary?.thisMonth.invoiceCount || 0} invoices</div>
        </div>
        <div className="card">
          <div className="card-title">This Month — Collected</div>
          <div className="card-value text-success">{fmt(summary?.thisMonth.collected)}</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Recent Transactions */}
        <div className="card">
          <div className="section-header">
            <h3>Recent Transactions</h3>
          </div>
          {summary?.recentTransactions?.length === 0 && (
            <div className="empty"><div className="empty-icon">↕️</div><p>No transactions yet</p></div>
          )}
          {summary?.recentTransactions?.map((t) => (
            <div className="stat-row" key={t._id}>
              <div>
                <div className="fw-600" style={{ fontSize: 13 }}>{t.description}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{TYPE_LABELS[t.type]} · {fmtDate(t.date)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.contact?.name}</div>
            </div>
          ))}
        </div>

        {/* Aging Report */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 8 }}>
            <h3>Aging Report</h3>
          </div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <div className={`tab${agingTab === 'receivables' ? ' active' : ''}`} onClick={() => setAgingTab('receivables')}>Receivables</div>
            <div className={`tab${agingTab === 'payables' ? ' active' : ''}`} onClick={() => setAgingTab('payables')}>Payables</div>
          </div>
          {BUCKETS.map((b) => {
            const items = currentAging?.[b] || [];
            const total = items.reduce((s, i) => s + i.amountDue, 0);
            return (
              <div className="stat-row" key={b}>
                <div>
                  <span className="fw-600" style={{ fontSize: 13 }}>{b === 'current' ? 'Current (not due)' : `${b} days`}</span>
                  <span className="text-muted" style={{ fontSize: 12, marginLeft: 8 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <span className={`fw-600 ${b !== 'current' && items.length ? 'text-danger' : ''}`}>{fmt(total)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
