import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { transactions, accounts, contacts, invoices as invoiceApi, bills as billApi, fmt, fmtDate } from '../api/index.js';
import { generateInvoicePDF, generateBillPDF, generateReceiptPDF } from '../utils/pdfGenerator.js';

const BASE = import.meta.env.VITE_API_URL || '/api';

const TYPE_LABELS = {
  journal: 'Journal',
  invoice: 'Invoice',
  payment: 'Payment',
  bill: 'Bill',
  bill_payment: 'Bill Payment',
  expense: 'Expense',
  receipt: 'Receipt',
};

const TYPE_COLORS = {
  payment: { bg: '#dcfce7', color: '#16a34a' },
  bill_payment: { bg: '#fef9c3', color: '#ca8a04' },
  invoice: { bg: '#dbeafe', color: '#1d4ed8' },
  bill: { bg: '#fce7f3', color: '#9d174d' },
  journal: { bg: '#f3f4f6', color: '#4b5563' },
  expense: { bg: '#fee2e2', color: '#dc2626' },
  receipt: { bg: '#e0f2fe', color: '#0369a1' },
};

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
  const [detailLinked, setDetailLinked] = useState(null); // full invoice or bill
  const [loadingLinked, setLoadingLinked] = useState(false);
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

  // When detail opens, fetch full invoice or bill if linked
  async function openDetail(txn) {
    setShowDetail(txn);
    setDetailLinked(null);

    if (txn.invoice) {
      setLoadingLinked(true);
      try {
        const res = await invoiceApi.get(typeof txn.invoice === 'object' ? txn.invoice._id : txn.invoice);
        setDetailLinked({ type: 'invoice', data: res.data });
      } catch { /* ignore */ }
      setLoadingLinked(false);
    } else if (txn.bill) {
      setLoadingLinked(true);
      try {
        const res = await billApi.get(typeof txn.bill === 'object' ? txn.bill._id : txn.bill);
        setDetailLinked({ type: 'bill', data: res.data });
      } catch { /* ignore */ }
      setLoadingLinked(false);
    }
  }

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

  // PDF downloads
  function handleDownloadPDF() {
    if (!showDetail) return;
    if (detailLinked?.type === 'invoice') {
      generateInvoicePDF(detailLinked.data);
    } else if (detailLinked?.type === 'bill') {
      generateBillPDF(detailLinked.data);
    } else {
      generateReceiptPDF(showDetail, null);
    }
  }

  function handleDownloadReceipt() {
    if (!showDetail) return;
    generateReceiptPDF(showDetail, detailLinked?.data || null);
  }

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
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Linked Doc</th>
                <th className="text-right">Debits</th>
                <th className="text-right">Credits</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={9}><div className="empty"><div className="empty-icon">↕️</div><p>No transactions yet</p></div></td></tr>
              )}
              {list.map((t) => {
                const dr = t.entries.reduce((s, e) => s + e.debit, 0);
                const cr = t.entries.reduce((s, e) => s + e.credit, 0);
                const typeStyle = TYPE_COLORS[t.type] || { bg: '#f3f4f6', color: '#4b5563' };
                const linkedDoc = t.invoice || t.bill;
                const linkedLabel = t.invoice
                  ? `🧾 ${t.invoice.invoiceNumber || 'Invoice'}`
                  : t.bill
                  ? `📋 ${t.bill.billNumber || 'Bill'}`
                  : null;

                return (
                  <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(t)}>
                    <td style={{ fontSize: 13 }}>{fmtDate(t.date)}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{t.reference || '—'}</td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{t.description}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: typeStyle.bg,
                        color: typeStyle.color,
                        padding: '3px 8px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                      }}>
                        {TYPE_LABELS[t.type]}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{t.contact?.name || '—'}</td>
                    <td>
                      {linkedLabel ? (
                        <span style={{
                          fontSize: 11,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}>
                          {linkedLabel}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="text-right" style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>{fmt(dr)}</td>
                    <td className="text-right" style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>{fmt(cr)}</td>
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

      {/* ── Journal Entry Modal ─────────────────────────────────────────────── */}
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
                      <td colSpan={2}>
                        <button className="add-line-btn" onClick={() => setForm({ ...form, entries: [...form.entries, { account: '', debit: '', credit: '', description: '' }] })}>+ Add Row</button>
                      </td>
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

      {/* ── Transaction Detail Modal ────────────────────────────────────────── */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{showDetail.description}</h3>
                <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: TYPE_COLORS[showDetail.type]?.bg || '#f3f4f6',
                    color: TYPE_COLORS[showDetail.type]?.color || '#4b5563',
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}>
                    {TYPE_LABELS[showDetail.type]}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(showDetail.date)}</span>
                  {showDetail.reference && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Ref: {showDetail.reference}</span>}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>

            <div className="modal-body">
              {/* Linked document banner */}
              {loadingLinked && (
                <div style={{ textAlign: 'center', padding: 12, color: 'var(--muted)', fontSize: 13 }}>
                  Loading linked document…
                </div>
              )}
              {detailLinked && !loadingLinked && (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      Linked {detailLinked.type === 'invoice' ? '🧾 Invoice' : '📋 Bill'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                      {detailLinked.data.invoiceNumber || detailLinked.data.billNumber}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {detailLinked.type === 'invoice'
                        ? `Client: ${detailLinked.data.client?.name || '—'}`
                        : `Vendor: ${detailLinked.data.vendor?.name || '—'}`}
                      {' · '}Total: <strong>{fmt(detailLinked.data.total)}</strong>
                      {' · '}Due: <strong>{fmt(detailLinked.data.amountDue)}</strong>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => detailLinked.type === 'invoice'
                      ? generateInvoicePDF(detailLinked.data)
                      : generateBillPDF(detailLinked.data)
                    }
                  >
                    ⬇ Download {detailLinked.type === 'invoice' ? 'Invoice' : 'Bill'} PDF
                  </button>
                </div>
              )}

              {/* Ledger entries */}
              <table style={{ width: '100%', marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Description</th>
                    <th className="text-right">Debit (৳)</th>
                    <th className="text-right">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.entries?.map((e, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {e.account?.code && <span style={{ color: 'var(--muted)', marginRight: 4 }}>{e.account.code}</span>}
                          {e.account?.name || '—'}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{e.description || '—'}</td>
                      <td className="text-right" style={{ color: '#16a34a', fontWeight: 600 }}>
                        {e.debit > 0 ? fmt(e.debit) : '—'}
                      </td>
                      <td className="text-right" style={{ color: '#dc2626', fontWeight: 600 }}>
                        {e.credit > 0 ? fmt(e.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={2} style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12 }}>TOTAL</td>
                    <td className="text-right" style={{ color: '#16a34a' }}>
                      {fmt(showDetail.entries?.reduce((s, e) => s + e.debit, 0))}
                    </td>
                    <td className="text-right" style={{ color: '#dc2626' }}>
                      {fmt(showDetail.entries?.reduce((s, e) => s + e.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {showDetail.contact?.name && (
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
                  <strong>Contact:</strong> {showDetail.contact.name}
                </div>
              )}
              {showDetail.notes && (
                <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, fontSize: 12, color: 'var(--muted)' }}>
                  {showDetail.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Close</button>
              <button
                className="btn btn-secondary"
                onClick={handleDownloadReceipt}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🧾 Download Receipt
              </button>
              {detailLinked && (
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  ⬇ {detailLinked.type === 'invoice' ? 'Invoice PDF' : 'Bill PDF'}
                </button>
              )}
              <button
                className="btn btn-sm"
                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                onClick={() => handleVoid(showDetail._id)}
              >
                Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
