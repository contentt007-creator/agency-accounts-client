import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { loans, contacts, accounts, fmt, fmtDate } from '../api/index.js';

const EMPTY_FORM = {
  borrower: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  dueDate: '',
  interestRate: 0,
  notes: '',
  loansAccountId: '',
  bankAccountId: '',
};

const STATUS_COLORS = {
  active: 'badge-sent',
  partial: 'badge-partial',
  repaid: 'badge-paid',
  defaulted: 'badge-overdue',
  written_off: 'badge-void',
};

export default function Loans() {
  const [list, setList] = useState([]);
  const [contactList, setContactList] = useState([]);
  const [accountList, setAccountList] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showRepayment, setShowRepayment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [repayment, setRepayment] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), reference: '', loansAccountId: '', bankAccountId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => loans.list(filter ? { status: filter } : {}).then((r) => setList(r.data));

  useEffect(() => {
    load();
    contacts.list().then((r) => setContactList(r.data));
    accounts.list().then((r) => setAccountList(r.data));
  }, []);

  useEffect(() => { load(); }, [filter]);

  const handleSubmit = async () => {
    if (!form.borrower || !form.amount) return toast.error('Borrower and amount are required');
    setSaving(true);
    try {
      const borrowerName = contactList.find((c) => c._id === form.borrower)?.name || '';
      await loans.create({ ...form, amount: parseFloat(form.amount), borrowerName });
      toast.success('Loan recorded');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const openRepayment = (loan) => {
    setShowRepayment(loan);
    setRepayment({ amount: loan.amountDue, date: new Date().toISOString().slice(0, 10), reference: '', loansAccountId: '', bankAccountId: '' });
  };

  const handleRepayment = async () => {
    if (!repayment.amount) return toast.error('Enter repayment amount');
    setSaving(true);
    try {
      await loans.repayment(showRepayment._id, { ...repayment, amount: parseFloat(repayment.amount) });
      toast.success('Repayment recorded');
      setShowRepayment(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const handleWriteOff = async (id) => {
    if (!confirm('Write off this loan? This marks it as unrecoverable.')) return;
    await loans.writeOff(id);
    toast.success('Loan written off');
    load();
    setShowDetail(null);
  };

  const openDetail = async (id) => {
    const r = await loans.get(id);
    setShowDetail(r.data);
  };

  const totalLent = list.reduce((s, l) => s + l.amount, 0);
  const totalOutstanding = list.filter((l) => !['repaid', 'written_off'].includes(l.status)).reduce((s, l) => s + l.amountDue, 0);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Total Lent</div>
          <div className="card-value">{fmt(totalLent)}</div>
        </div>
        <div className="card">
          <div className="card-title">Outstanding</div>
          <div className="card-value text-warning">{fmt(totalOutstanding)}</div>
        </div>
        <div className="card">
          <div className="card-title">Active Loans</div>
          <div className="card-value">{list.filter((l) => ['active', 'partial'].includes(l.status)).length}</div>
        </div>
      </div>

      <div className="section-header">
        <div className="filter-bar">
          {['', 'active', 'partial', 'repaid', 'defaulted', 'written_off'].map((s) => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Loan</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Loan #</th><th>Borrower</th><th>Date</th><th>Due Date</th>
                <th className="text-right">Principal</th><th className="text-right">Repaid</th>
                <th className="text-right">Outstanding</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={9}><div className="empty"><div className="empty-icon">🤝</div><p>No loans recorded yet</p></div></td></tr>
              )}
              {list.map((loan) => (
                <tr key={loan._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(loan._id)}>
                  <td className="fw-600">{loan.loanNumber}</td>
                  <td>{loan.borrower?.name}</td>
                  <td>{fmtDate(loan.date)}</td>
                  <td>{loan.dueDate ? fmtDate(loan.dueDate) : '—'}</td>
                  <td className="text-right">{fmt(loan.amount)}</td>
                  <td className="text-right text-success">{fmt(loan.amountRepaid)}</td>
                  <td className="text-right fw-600 text-warning">{fmt(loan.amountDue)}</td>
                  <td><span className={`badge ${STATUS_COLORS[loan.status] || 'badge-draft'}`}>{loan.status.replace('_', ' ')}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {['active', 'partial', 'defaulted'].includes(loan.status) && (
                      <button className="btn btn-sm btn-success" onClick={() => openRepayment(loan)}>Repaid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Loan Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record New Loan</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Borrower *</label>
                <select value={form.borrower} onChange={(e) => setForm({ ...form, borrower: e.target.value })}>
                  <option value="">Select contact...</option>
                  {contactList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (৳) *</label>
                  <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Interest Rate (% p.a.)</label>
                  <input type="number" min="0" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} placeholder="0 = interest-free" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date Lent *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>AUTO-POST JOURNAL ENTRY (optional)</div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Loans Receivable Account</label>
                    <select value={form.loansAccountId} onChange={(e) => setForm({ ...form, loansAccountId: e.target.value })}>
                      <option value="">Select...</option>
                      {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Bank / Cash Account</label>
                    <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}>
                      <option value="">Select...</option>
                      {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Purpose, conditions, etc." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Record Loan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showDetail.loanNumber}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Borrower</div>
                  <div className="fw-600" style={{ fontSize: 15 }}>{showDetail.borrower?.name}</div>
                  <div className="text-muted">{showDetail.borrower?.phone}</div>
                  <div className="text-muted">{showDetail.borrower?.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${STATUS_COLORS[showDetail.status]}`} style={{ fontSize: 13, padding: '4px 12px' }}>{showDetail.status.replace('_', ' ')}</span>
                  <div style={{ marginTop: 8 }}>
                    <div className="text-muted" style={{ fontSize: 12 }}>Date: {fmtDate(showDetail.date)}</div>
                    {showDetail.dueDate && <div className="text-muted" style={{ fontSize: 12 }}>Due: {fmtDate(showDetail.dueDate)}</div>}
                    {showDetail.interestRate > 0 && <div className="text-muted" style={{ fontSize: 12 }}>Interest: {showDetail.interestRate}% p.a.</div>}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="grid grid-3" style={{ textAlign: 'center' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12 }}>Principal</div>
                    <div className="fw-600" style={{ fontSize: 18 }}>{fmt(showDetail.amount)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12 }}>Repaid</div>
                    <div className="fw-600 text-success" style={{ fontSize: 18 }}>{fmt(showDetail.amountRepaid)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12 }}>Outstanding</div>
                    <div className="fw-600 text-warning" style={{ fontSize: 18 }}>{fmt(showDetail.amountDue)}</div>
                  </div>
                </div>
              </div>

              {showDetail.repayments?.length > 0 && (
                <div>
                  <div className="fw-600" style={{ marginBottom: 8 }}>Repayment History</div>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr><th>Date</th><th>Reference</th><th className="text-right">Amount</th></tr>
                    </thead>
                    <tbody>
                      {showDetail.repayments.map((r, i) => (
                        <tr key={i}>
                          <td>{fmtDate(r.date)}</td>
                          <td className="text-muted">{r.reference || '—'}</td>
                          <td className="text-right text-success fw-600">{fmt(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showDetail.notes && (
                <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 12 }}>{showDetail.notes}</div>
              )}
            </div>
            <div className="modal-footer">
              {['active', 'partial', 'defaulted'].includes(showDetail.status) && (
                <button className="btn btn-success" onClick={() => { setShowDetail(null); openRepayment(showDetail); }}>Record Repayment</button>
              )}
              {!['repaid', 'written_off'].includes(showDetail.status) && (
                <button className="btn btn-danger" onClick={() => handleWriteOff(showDetail._id)}>Write Off</button>
              )}
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepayment && (
        <div className="modal-overlay" onClick={() => setShowRepayment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Repayment — {showRepayment.loanNumber}</h3>
              <button className="modal-close" onClick={() => setShowRepayment(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount (৳) — Outstanding: {fmt(showRepayment.amountDue)}</label>
                <input type="number" value={repayment.amount} onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={repayment.date} onChange={(e) => setRepayment({ ...repayment, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input placeholder="Bank ref, cash..." value={repayment.reference} onChange={(e) => setRepayment({ ...repayment, reference: e.target.value })} />
                </div>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>POST JOURNAL ENTRY (optional)</div>
                <div className="form-group">
                  <label>Loans Receivable Account</label>
                  <select value={repayment.loansAccountId} onChange={(e) => setRepayment({ ...repayment, loansAccountId: e.target.value })}>
                    <option value="">Select...</option>
                    {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Bank / Cash Account</label>
                  <select value={repayment.bankAccountId} onChange={(e) => setRepayment({ ...repayment, bankAccountId: e.target.value })}>
                    <option value="">Select...</option>
                    {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowRepayment(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleRepayment} disabled={saving}>{saving ? 'Saving...' : 'Record Repayment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
