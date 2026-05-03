import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { bills, contacts, accounts, fmt, fmtDate } from '../api/index.js';
import { generateBillPDF } from '../utils/pdfGenerator.js';

const EMPTY_LINE = { description: '', quantity: 1, unitPrice: '', amount: 0 };
const EMPTY_FORM = {
  vendor: '', issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '', lineItems: [{ ...EMPTY_LINE }],
  taxRate: 0, notes: '', status: 'draft',
};

export default function Bills() {
  const [list, setList] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [accountList, setAccountList] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payment, setPayment] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), reference: '', payableAccountId: '', bankAccountId: '', transferFee: '', feeAccountId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => bills.list(filter ? { status: filter } : {}).then((r) => setList(r.data));

  useEffect(() => {
    load();
    contacts.list({ type: 'vendor' }).then((r) => setVendorList(r.data));
    accounts.list().then((r) => setAccountList(r.data));
  }, []);

  useEffect(() => { load(); }, [filter]);

  const updateLine = (i, field, val) => {
    const lines = [...form.lineItems];
    lines[i] = { ...lines[i], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      lines[i].amount = parseFloat(lines[i].quantity || 0) * parseFloat(lines[i].unitPrice || 0);
    }
    setForm({ ...form, lineItems: lines });
  };

  const subtotal = form.lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const taxAmt = subtotal * ((form.taxRate || 0) / 100);
  const total = subtotal + taxAmt;

  const handleSubmit = async () => {
    if (!form.vendor || !form.dueDate || form.lineItems.some((l) => !l.description || !l.unitPrice)) {
      return toast.error('Fill in all required fields');
    }
    setSaving(true);
    try {
      await bills.create(form);
      toast.success('Bill created');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error creating bill');
    } finally { setSaving(false); }
  };

  const handleVoid = async (id) => {
    if (!confirm('Void this bill?')) return;
    await bills.void(id);
    toast.success('Bill voided');
    load();
    setShowDetail(null);
  };

  const openPayment = (bill) => {
    setShowPayment(bill);
    setPayment({ amount: bill.amountDue, date: new Date().toISOString().slice(0, 10), reference: '', payableAccountId: '', bankAccountId: '', transferFee: '', feeAccountId: '' });
  };

  const handlePayment = async () => {
    if (!payment.payableAccountId || !payment.bankAccountId) return toast.error('Select accounts');
    const fee = parseFloat(payment.transferFee) || 0;
    if (fee > 0 && !payment.feeAccountId) return toast.error('Select a Bank Charges account for the transfer fee');
    setSaving(true);
    try {
      await bills.payment(showPayment._id, { ...payment, amount: parseFloat(payment.amount), transferFee: fee });
      toast.success('Payment recorded');
      setShowPayment(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const openDetail = async (id) => {
    const r = await bills.get(id);
    setShowDetail(r.data);
  };

  return (
    <div>
      <div className="section-header">
        <div className="filter-bar">
          {['', 'draft', 'received', 'partial', 'paid', 'overdue', 'void'].map((s) => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Bill</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill #</th><th>Vendor</th><th>Issue Date</th><th>Due Date</th>
                <th className="text-right">Total</th><th className="text-right">Amount Due</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8}><div className="empty"><div className="empty-icon">📋</div><p>No bills yet</p></div></td></tr>
              )}
              {list.map((bill) => (
                <tr key={bill._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(bill._id)}>
                  <td className="fw-600">{bill.billNumber}</td>
                  <td>{bill.vendor?.name}</td>
                  <td>{fmtDate(bill.issueDate)}</td>
                  <td>{fmtDate(bill.dueDate)}</td>
                  <td className="text-right">{fmt(bill.total)}</td>
                  <td className="text-right fw-600 text-danger">{fmt(bill.amountDue)}</td>
                  <td><span className={`badge badge-${bill.status}`}>{bill.status}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {['draft', 'received', 'partial', 'overdue'].includes(bill.status) && (
                      <button className="btn btn-sm btn-primary" onClick={() => openPayment(bill)}>Pay</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Bill Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Bill</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
                    <option value="">Select vendor...</option>
                    {vendorList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bill Number</label>
                  <input placeholder="Auto-generated" value={form.billNumber || ''} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Issue Date *</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Due Date *</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Line Items</label>
                <table className="line-items">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Description</th>
                      <th style={{ width: '12%' }}>Qty</th>
                      <th style={{ width: '18%' }}>Unit Price (৳)</th>
                      <th style={{ width: '18%' }}>Amount (৳)</th>
                      <th style={{ width: '12%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map((line, i) => (
                      <tr key={i}>
                        <td><input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Item description" /></td>
                        <td><input type="number" min="0" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} /></td>
                        <td><input type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} placeholder="0" /></td>
                        <td><input readOnly value={line.amount.toFixed(2)} /></td>
                        <td><button className="remove-row" onClick={() => setForm({ ...form, lineItems: form.lineItems.filter((_, j) => j !== i) })}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="add-line-btn" onClick={() => setForm({ ...form, lineItems: [...form.lineItems, { ...EMPTY_LINE }] })}>+ Add Line</button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input type="number" min="0" max="100" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <tbody>
                      <tr><td className="text-muted">Subtotal</td><td className="text-right fw-600">{fmt(subtotal)}</td></tr>
                      {taxAmt > 0 && <tr><td className="text-muted">Tax</td><td className="text-right">{fmt(taxAmt)}</td></tr>}
                      <tr><td className="fw-600">Total</td><td className="text-right fw-600" style={{ fontSize: 15 }}>{fmt(total)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create Bill'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showDetail.billNumber}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body inv-preview">
              <div className="inv-header">
                <div>
                  <div className="inv-title" style={{ color: 'var(--danger)' }}>BILL</div>
                  <div className="text-muted">{showDetail.billNumber}</div>
                </div>
                <div className="inv-meta">
                  <p><strong>Issue Date:</strong> {fmtDate(showDetail.issueDate)}</p>
                  <p><strong>Due Date:</strong> {fmtDate(showDetail.dueDate)}</p>
                  <p style={{ marginTop: 8 }}><span className={`badge badge-${showDetail.status}`}>{showDetail.status}</span></p>
                </div>
              </div>
              <div className="inv-from">
                <div className="text-muted" style={{ marginBottom: 4, fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Vendor</div>
                <div className="fw-600">{showDetail.vendor?.name}</div>
                <div className="text-muted">{showDetail.vendor?.email}</div>
              </div>
              <table style={{ width: '100%', marginBottom: 16 }}>
                <thead>
                  <tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {showDetail.lineItems?.map((l, i) => (
                    <tr key={i}>
                      <td>{l.description}</td>
                      <td className="text-right">{l.quantity}</td>
                      <td className="text-right">{fmt(l.unitPrice)}</td>
                      <td className="text-right">{fmt(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="inv-totals" style={{ marginLeft: 'auto', width: 280 }}>
                <tbody>
                  <tr><td>Subtotal</td><td className="text-right">{fmt(showDetail.subtotal)}</td></tr>
                  {showDetail.taxAmount > 0 && <tr><td>Tax</td><td className="text-right">{fmt(showDetail.taxAmount)}</td></tr>}
                  <tr className="total"><td>Total</td><td className="text-right">{fmt(showDetail.total)}</td></tr>
                  <tr><td className="text-success">Paid</td><td className="text-right text-success">{fmt(showDetail.amountPaid)}</td></tr>
                  <tr><td className="fw-600">Amount Due</td><td className="text-right fw-600 text-danger">{fmt(showDetail.amountDue)}</td></tr>
                </tbody>
              </table>
              {showDetail.payments?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="fw-600" style={{ marginBottom: 8 }}>Payment History</div>
                  {showDetail.payments.map((p, i) => (
                    <div className="stat-row" key={i}>
                      <span>{fmtDate(p.date)} {p.reference && `· ${p.reference}`}</span>
                      <span className="text-success fw-600">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {['draft', 'received', 'partial', 'overdue'].includes(showDetail.status) && (
                <button className="btn btn-primary" onClick={() => { setShowDetail(null); openPayment(showDetail); }}>Record Payment</button>
              )}
              {!['void', 'paid'].includes(showDetail.status) && (
                <button className="btn btn-danger" onClick={() => handleVoid(showDetail._id)}>Void</button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => generateBillPDF(showDetail)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ⬇ Download PDF
              </button>
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pay Bill — {showPayment.billNumber}</h3>
              <button className="modal-close" onClick={() => setShowPayment(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount (৳) — Due: {fmt(showPayment.amountDue)}</label>
                <input type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Date</label>
                  <input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input placeholder="Bank ref..." value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Accounts Payable account</label>
                <select value={payment.payableAccountId} onChange={(e) => setPayment({ ...payment, payableAccountId: e.target.value })}>
                  <option value="">Select...</option>
                  {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Bank / Cash account</label>
                <select value={payment.bankAccountId} onChange={(e) => setPayment({ ...payment, bankAccountId: e.target.value })}>
                  <option value="">Select...</option>
                  {accountList.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>BANK TRANSFER FEE (optional)</div>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Fee Amount (৳)</label>
                    <input type="number" min="0" placeholder="0" value={payment.transferFee} onChange={(e) => setPayment({ ...payment, transferFee: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Charge to Account</label>
                    <select value={payment.feeAccountId} onChange={(e) => setPayment({ ...payment, feeAccountId: e.target.value })}>
                      <option value="">Select expense account...</option>
                      {accountList.filter((a) => a.type === 'expense').map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayment(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayment} disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
