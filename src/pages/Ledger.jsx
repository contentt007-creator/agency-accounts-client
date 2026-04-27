import { useEffect, useState } from 'react';
import { accounts, fmt, fmtDate } from '../api/index.js';

export default function Ledger() {
  const [accountList, setAccountList] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [ledger, setLedger] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accounts.list().then((r) => setAccountList(r.data));
  }, []);

  const load = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await accounts.ledger(selectedAccount, params);
      setLedger(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedAccount, from, to]);

  const account = accountList.find((a) => a._id === selectedAccount);
  const totalDebits = ledger.reduce((s, e) => s + e.debit, 0);
  const totalCredits = ledger.reduce((s, e) => s + e.credit, 0);

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filter-bar">
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: 'var(--muted)' }}>Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select an account...</option>
              {['asset', 'liability', 'equity', 'income', 'expense'].map((type) => (
                <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                  {accountList.filter((a) => a.type === type).map((a) => (
                    <option key={a._id} value={a._id}>{a.code} — {a.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: 'var(--muted)' }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: 'var(--muted)' }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {!selectedAccount && (
        <div className="empty card"><div className="empty-icon">📒</div><p>Select an account to view its ledger</p></div>
      )}

      {selectedAccount && (
        <div className="card">
          {account && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="fw-600" style={{ fontSize: 16 }}>{account.code} — {account.name}</div>
                  <div className="text-muted" style={{ textTransform: 'capitalize', fontSize: 13 }}>{account.type}{account.subtype ? ` · ${account.subtype}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted" style={{ fontSize: 12 }}>Current Balance</div>
                  <div className="fw-600" style={{ fontSize: 20 }}>{fmt(account.balance)}</div>
                </div>
              </div>
            </div>
          )}

          {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading...</div>}

          {!loading && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Description</th><th>Contact</th>
                    <th className="text-right">Debit (৳)</th><th className="text-right">Credit (৳)</th><th className="text-right">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 && (
                    <tr><td colSpan={7}><div className="empty"><p>No transactions in this range</p></div></td></tr>
                  )}
                  {ledger.map((row, i) => (
                    <tr key={i}>
                      <td>{fmtDate(row.date)}</td>
                      <td className="text-muted">{row.reference || '—'}</td>
                      <td>{row.description}</td>
                      <td className="text-muted">{row.contact?.name || '—'}</td>
                      <td className="text-right debit-col">{row.debit > 0 ? fmt(row.debit) : '—'}</td>
                      <td className="text-right credit-col">{row.credit > 0 ? fmt(row.credit) : '—'}</td>
                      <td className={`text-right fw-600 ${row.balance >= 0 ? '' : 'text-danger'}`}>{fmt(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                {ledger.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
                      <td colSpan={4}>Total</td>
                      <td className="text-right debit-col">{fmt(totalDebits)}</td>
                      <td className="text-right credit-col">{fmt(totalCredits)}</td>
                      <td className="text-right">{fmt(ledger[ledger.length - 1]?.balance)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
