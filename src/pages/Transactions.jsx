import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { transactions, accounts, contacts, fmt, fmtDate } from '../api/index.js';

const TYPE_LABELS = { journal: 'Journal', invoice: 'Invoice', payment: 'Payment', bill: 'Bill', bill_payment: 'Bill Payment', expense: 'Expense', receipt: 'Receipt' };

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  type: 'journal',
  description: '',
  reference: '',
  contact: '',
  notes: '',
  entries: [
    { account: '', debit: '', credit: '', description: '' },
    { account: '', debit: '', credit: '', description: '' },
  ],
};

export default function Transactions() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [accountList, setAccountList] = useState([]);
  const [contactList, setContactList] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = (p = 1) => {
    const params = { page: p, limit: 25 };
    if (typeFilter) params.type = typeFilter;
    transactions.list(params).then((r) => {
      setList(r.data.transactions);
      setTotal(r.data.total);
      setPage(p);
    });
  };

  useEffect(() => {
    load(1);
    accounts.list().then((r) => setAccountList(r.data));
    contacts.list().then((r) => setContactList(r.data));
  }, []);

  useEffect(() => { load(1); }, [typeFilter]);

  const updateEntry = (i, field, val) => {
    const entries = [...form.entries];
    entries[i] = { ...entries[i], [field]: val };
    setForm({ ...form, entries });
  };

  const totalDebits = form.entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredits = form.entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleSubmit = async () => {
    if (!form.description) return toast.error('Description required');
    if (!balanced) return toast.error('Debits must equal credits');
    if (form.entries.some((e) => !e.account)) return toast.error('All entries need an account');
    setSaving(true);
    try {
      const payload = {
        ...form,
        entries: form.entries.map((e) => ({
          ...e,
          debit: parseFloat(e.debit) || 0,
          credit: parseFloat(e.credit) || 0,
        })),
        contact: form.contact || undefined,
      };
      await transactions.create(payload);
      toast.success('Transaction created');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load(1);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const handleVoid = async (id) => {
    if (!confirm('This will create a reversal transaction. Continue?')) return;
    try {
      await transactions.void(id);
      toast.success('Reversal created');
      load(page);
      setShowDetail(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="filter-bar">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Journal Entry</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Reference</th><th>Description</th><th>Type</th>
                <th>Contact</th><th className="text-right">Debits</th><th className="text-right">Credits</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8}><div className="empty"><div className="empty-icon">↕️</div><p>No transactions yet</p></div></td></tr>
              )}
              {list.map((t) => {
                const dr = t.entries.reduce((s, e) => s + e.debit, 0);
                const cr = t.entries.reduce((s, e) => s + e.credit, 0);
                return (
                  <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(t)}>
                    <td>{fmtDate(t.date)}</td>
                    <td className="text-muted">{t.reference || '—'}</td>
                    <td>{t.description}</td>
                    <td><span style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{TYPE_LABELS[t.type]}</span></td>
                    <td className="text-muted">{t.contact?.name || '—'}</td>
                    <td className="text-right debit-col">{fmt(dr)}</td>
                    <td className="text-right credit-col">{fmt(cr)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleVoid(t._id)}>Void</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 25 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
            <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
            <span style={{ padding: '5px 10px', fontSize: 13 }}>{page} / {Math.ceil(total / 25)}</span>
            <button className="btn btn-sm btn-outline" disabled={page >= Math.ceil(total / 25)} onClick={() => load(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Journal Entry Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Journal Entry</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Description *</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction description" />
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ref #" />
                </div>
              </div>
              <div className="form-group">
                <label>Contact (optional)</label>
                <select value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}>
                  <option value="">None</option>
                  {contactList.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.type})</option>)}
                </select>
              </div>

              {/* Entries */}
              <div className="form-group">
                <label>Ledger Entries</label>
                <table className="line-items">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Account</th>
                      <th style={{ width: '30%' }}>Description</th>
                      <th style={{ width: '16%' }}>Debit (৳)</th>
                      <th style={{ width: '16%' }}>Credit (৳)</th>
                      <th style={{ width: '8%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.entries.map((entry, i) => (
                      <tr key={i}>
                        <td>
                          <select value={entry.account} onChange={(e) => updateEntry(i, 'account', e.target.value)}>
                            <option value="">Select account...</option>
                            {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                          </select>
                        </td>
                        <td><input value={entry.description} onChange={(e) => updateEntry(i, 'description', e.target.value)} placeholder="Optional" /></td>
                        <td><input type="number" min="0" value={entry.debit} onChange={(e) => updateEntry(i, 'debit', e.target.value)} placeholder="0" /></td>
                        <td><input type="number" min="0" value={entry.credit} onChange={(e) => updateEntry(i, 'credit', e.target.value)} placeholder="0" /></td>
                        <td>
                          {form.entries.length > 2 && (
                            <button className="remove-row" onClick={() => setForm({ ...form, entries: form.entries.filter((_, j) => j !== i) })}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><button className="add-line-btn" onClick={() => setForm({ ...form, entries: [...form.entries, { account: '', debit: '', credit: '', description: '' }] })}>+ Add Row</button></td>
                      <td className={`text-right fw-600 ${!balanced && totalDebits > 0 ? 'text-danger' : totalDebits > 0 ? 'text-success' : ''}`}>{fmt(totalDebits)}</td>
                      <td className={`text-right fw-600 ${!balanced && totalCredits > 0 ? 'text-danger' : totalCredits > 0 ? 'text-success' : ''}`}>{fmt(totalCredits)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                {!balanced && totalDebits > 0 && <p className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>⚠ Debits and credits must be equal</p>}
                {balanced && <p className="text-success" style={{ fontSize: 12, marginTop: 4 }}>✓ Balanced</p>}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !balanced}>{saving ? 'Saving...' : 'Post Entry'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showDetail.description}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16, fontSize: 13 }}>
                <div><span className="text-muted">Date:</span> {fmtDate(showDetail.date)}</div>
                <div><span className="text-muted">Reference:</span> {showDetail.reference || '—'}</div>
                <div><span className="text-muted">Type:</span> {TYPE_LABELS[showDetail.type]}</div>
                <div><span className="text-muted">Contact:</span> {showDetail.contact?.name || '—'}</div>
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>Account</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
                </thead>
                <tbody>
                  {showDetail.entries?.map((e, i) => (
                    <tr key={i}>
                      <td>{e.account?.code} — {e.account?.name}</td>
                      <td className="text-muted">{e.description}</td>
                      <td className="text-right debit-col">{e.debit > 0 ? fmt(e.debit) : '—'}</td>
                      <td className="text-right credit-col">{e.credit > 0 ? fmt(e.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {showDetail.notes && <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 12 }}>{showDetail.notes}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
