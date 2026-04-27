import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt, fmtDate } from '../api/index.js';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const PERIODS = [
  { label: 'This Week', getValue: () => { const now = new Date(); const s = new Date(now); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return { from: s.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; } },
  { label: 'This Month', getValue: () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; } },
  { label: 'Last Month', getValue: () => { const now = new Date(); const s = new Date(now.getFullYear(), now.getMonth()-1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: s.toISOString().slice(0,10), to: e.toISOString().slice(0,10) }; } },
  { label: 'Last 3 Months', getValue: () => { const now = new Date(); const s = new Date(now); s.setMonth(s.getMonth()-3); return { from: s.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; } },
  { label: 'This Year', getValue: () => { const now = new Date(); return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0,10) }; } },
  { label: 'Custom', getValue: () => null },
];

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState(1); // This Month default
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  const getDateRange = () => {
    if (selectedPeriod === 5) return { from, to }; // Custom
    return PERIODS[selectedPeriod].getValue();
  };

  const fetchReport = async () => {
    const range = getDateRange();
    if (!range?.from || !range?.to) return;
    setLoading(true);
    try {
      const r = await api.get('/reports', { params: range });
      setData(r.data);
    } catch (e) {
      alert('Error fetching report');
    } finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const range = getDateRange();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Agency Accounts', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial Report', 14, 20);
    doc.text(`Period: ${fmtDate(range.from)} — ${fmtDate(range.to)}`, pageW - 14, 12, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-BD')}`, pageW - 14, 20, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let y = 36;

    // Summary box
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, y); y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Amount (BDT)']],
      body: [
        ['Total Invoiced', fmt(data.summary.totalInvoiced)],
        ['Total Collected (Cash In)', fmt(data.summary.totalCollected)],
        ['Total Bills Raised', fmt(data.summary.totalBilled)],
        ['Total Bills Paid (Cash Out)', fmt(data.summary.totalBillsPaid)],
        ['Net Cash Flow', fmt(data.summary.netCashFlow)],
        ['Loans Disbursed', fmt(data.summary.totalLoaned)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Invoices
    if (data.invoices.length > 0) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`Invoices Raised (${data.invoices.length})`, 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Due', 'Status']],
        body: data.invoices.map((inv) => [
          inv.invoiceNumber, inv.client?.name || '—',
          fmtDate(inv.issueDate), fmtDate(inv.dueDate),
          fmt(inv.total), fmt(inv.amountPaid), fmt(inv.amountDue),
          inv.status.toUpperCase(),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Payments received
    if (data.payments.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`Payments Received (${data.payments.length})`, 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Description', 'Contact', 'Reference', 'Amount']],
        body: data.payments.map((t) => [
          fmtDate(t.date), t.description, t.contact?.name || '—',
          t.reference || '—',
          fmt(t.entries.reduce((s, e) => s + e.debit, 0)),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Bills
    if (data.bills.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`Bills (Payables) (${data.bills.length})`, 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Bill #', 'Vendor', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Due', 'Status']],
        body: data.bills.map((b) => [
          b.billNumber, b.vendor?.name || '—',
          fmtDate(b.issueDate), fmtDate(b.dueDate),
          fmt(b.total), fmt(b.amountPaid), fmt(b.amountDue),
          b.status.toUpperCase(),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [220, 38, 38] },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Overdue receivables
    if (data.overdueInvoices.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`Overdue Receivables (${data.overdueInvoices.length})`, 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Invoice #', 'Client', 'Due Date', 'Days Overdue', 'Amount Due']],
        body: data.overdueInvoices.map((inv) => {
          const days = Math.max(0, Math.floor((new Date() - new Date(inv.dueDate)) / 86400000));
          return [inv.invoiceNumber, inv.client?.name || '—', fmtDate(inv.dueDate), `${days} days`, fmt(inv.amountDue)];
        }),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [217, 119, 6] },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Loans
    if (data.loans.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(`Loans Disbursed (${data.loans.length})`, 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Loan #', 'Borrower', 'Date', 'Amount', 'Repaid', 'Outstanding', 'Status']],
        body: data.loans.map((l) => [
          l.loanNumber, l.borrower?.name || '—', fmtDate(l.date),
          fmt(l.amount), fmt(l.amountRepaid), fmt(l.amountDue),
          l.status.toUpperCase(),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [124, 58, 237] },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      });
    }

    // Footer on each page
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Agency Accounts — Confidential | Page ${i} of ${pages}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    const label = selectedPeriod === 5 ? `${from}_to_${to}` : PERIODS[selectedPeriod].label.replace(/ /g, '_');
    doc.save(`Agency_Report_${label}.pdf`);
  };

  const range = getDateRange();
  const SECTIONS = ['summary', 'invoices', 'payments', 'bills', 'overdue', 'loans'];

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>PERIOD</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PERIODS.map((p, i) => (
                <button key={i} className={`btn btn-sm ${selectedPeriod === i ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPeriod(i)}>{p.label}</button>
              ))}
            </div>
          </div>
          {selectedPeriod === 5 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          )}
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading || (selectedPeriod === 5 && (!from || !to))}>
            {loading ? 'Loading...' : '🔍 Generate Report'}
          </button>
          {data && (
            <button className="btn btn-success" onClick={downloadPDF}>
              ⬇ Download PDF
            </button>
          )}
        </div>
        {range && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>Period: <strong>{fmtDate(range.from)}</strong> — <strong>{fmtDate(range.to)}</strong></div>}
      </div>

      {!data && !loading && (
        <div className="empty card"><div className="empty-icon">📄</div><p>Select a period and click "Generate Report"</p></div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Generating report...</div>}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="card-title">Total Invoiced</div>
              <div className="card-value">{fmt(data.summary.totalInvoiced)}</div>
              <div className="card-sub">{data.invoices.length} invoices</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="card-title">Collected (Cash In)</div>
              <div className="card-value text-success">{fmt(data.summary.totalCollected)}</div>
              <div className="card-sub">{data.payments.length} payments received</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div className="card-title">Bills Paid (Cash Out)</div>
              <div className="card-value text-danger">{fmt(data.summary.totalBillsPaid)}</div>
              <div className="card-sub">{data.billPayments.length} payments made</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="card-title">Net Cash Flow</div>
              <div className={`card-value ${data.summary.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.summary.netCashFlow >= 0 ? '+' : ''}{fmt(data.summary.netCashFlow)}
              </div>
              <div className="card-sub">Collected − Bills Paid</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div className="card-title">Overdue Receivables</div>
              <div className="card-value text-warning">{data.overdueInvoices.length}</div>
              <div className="card-sub">{fmt(data.overdueInvoices.reduce((s, i) => s + i.amountDue, 0))} outstanding</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div className="card-title">Loans Disbursed</div>
              <div className="card-value">{fmt(data.summary.totalLoaned)}</div>
              <div className="card-sub">{data.loans.length} loan{data.loans.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="tabs" style={{ marginBottom: 0 }}>
            {SECTIONS.map((s) => (
              <div key={s} className={`tab${activeSection === s ? ' active' : ''}`} onClick={() => setActiveSection(s)} style={{ textTransform: 'capitalize' }}>
                {s === 'overdue' ? 'Overdue' : s.charAt(0).toUpperCase() + s.slice(1)}
                {s === 'invoices' && ` (${data.invoices.length})`}
                {s === 'payments' && ` (${data.payments.length})`}
                {s === 'bills' && ` (${data.bills.length})`}
                {s === 'overdue' && ` (${data.overdueInvoices.length})`}
                {s === 'loans' && ` (${data.loans.length})`}
              </div>
            ))}
          </div>

          <div className="card" style={{ borderTopLeftRadius: 0 }}>
            {/* Summary tab */}
            {activeSection === 'summary' && (
              <div>
                <div className="fw-600" style={{ marginBottom: 12 }}>P&L Summary</div>
                <div className="stat-row"><span>Invoiced This Period</span><span className="fw-600">{fmt(data.summary.totalInvoiced)}</span></div>
                <div className="stat-row"><span>Cash Collected</span><span className="fw-600 text-success">{fmt(data.summary.totalCollected)}</span></div>
                <div className="stat-row"><span>Uncollected (Outstanding)</span><span className="fw-600 text-warning">{fmt(data.summary.totalInvoiced - data.summary.totalCollected)}</span></div>
                <div className="stat-row"><span>Bills Raised</span><span className="fw-600">{fmt(data.summary.totalBilled)}</span></div>
                <div className="stat-row"><span>Bills Paid</span><span className="fw-600 text-danger">{fmt(data.summary.totalBillsPaid)}</span></div>
                <div className="stat-row"><span>Unpaid Bills</span><span className="fw-600 text-warning">{fmt(data.summary.totalBilled - data.summary.totalBillsPaid)}</span></div>
                <div className="stat-row" style={{ borderTop: '2px solid var(--border)', marginTop: 8, paddingTop: 12 }}>
                  <span className="fw-600" style={{ fontSize: 15 }}>Net Cash Flow</span>
                  <span className={`fw-600 ${data.summary.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 18 }}>
                    {data.summary.netCashFlow >= 0 ? '+' : ''}{fmt(data.summary.netCashFlow)}
                  </span>
                </div>
              </div>
            )}

            {/* Invoices tab */}
            {activeSection === 'invoices' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice #</th><th>Client</th><th>Issue Date</th><th>Due Date</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.invoices.length === 0 && <tr><td colSpan={8}><div className="empty"><p>No invoices in this period</p></div></td></tr>}
                    {data.invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td className="fw-600">{inv.invoiceNumber}</td>
                        <td>{inv.client?.name}</td>
                        <td>{fmtDate(inv.issueDate)}</td>
                        <td>{fmtDate(inv.dueDate)}</td>
                        <td className="text-right">{fmt(inv.total)}</td>
                        <td className="text-right text-success">{fmt(inv.amountPaid)}</td>
                        <td className="text-right fw-600">{fmt(inv.amountDue)}</td>
                        <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  {data.invoices.length > 0 && (
                    <tfoot>
                      <tr style={{ fontWeight: 600, background: '#f9fafb' }}>
                        <td colSpan={4}>Total</td>
                        <td className="text-right">{fmt(data.summary.totalInvoiced)}</td>
                        <td className="text-right text-success">{fmt(data.invoices.reduce((s,i)=>s+i.amountPaid,0))}</td>
                        <td className="text-right">{fmt(data.invoices.reduce((s,i)=>s+i.amountDue,0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Payments tab */}
            {activeSection === 'payments' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Description</th><th>Contact</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {data.payments.length === 0 && <tr><td colSpan={5}><div className="empty"><p>No payments received in this period</p></div></td></tr>}
                    {data.payments.map((t) => (
                      <tr key={t._id}>
                        <td>{fmtDate(t.date)}</td>
                        <td>{t.description}</td>
                        <td className="text-muted">{t.contact?.name || '—'}</td>
                        <td className="text-muted">{t.reference || '—'}</td>
                        <td className="text-right fw-600 text-success">{fmt(t.entries.reduce((s,e)=>s+e.debit,0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  {data.payments.length > 0 && (
                    <tfoot>
                      <tr style={{ fontWeight: 600, background: '#f9fafb' }}>
                        <td colSpan={4}>Total Collected</td>
                        <td className="text-right text-success">{fmt(data.summary.totalCollected)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Bills tab */}
            {activeSection === 'bills' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Bill #</th><th>Vendor</th><th>Issue Date</th><th>Due Date</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.bills.length === 0 && <tr><td colSpan={8}><div className="empty"><p>No bills in this period</p></div></td></tr>}
                    {data.bills.map((b) => (
                      <tr key={b._id}>
                        <td className="fw-600">{b.billNumber}</td>
                        <td>{b.vendor?.name}</td>
                        <td>{fmtDate(b.issueDate)}</td>
                        <td>{fmtDate(b.dueDate)}</td>
                        <td className="text-right">{fmt(b.total)}</td>
                        <td className="text-right text-success">{fmt(b.amountPaid)}</td>
                        <td className="text-right fw-600 text-danger">{fmt(b.amountDue)}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Overdue tab */}
            {activeSection === 'overdue' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice #</th><th>Client</th><th>Due Date</th><th className="text-right">Days Overdue</th><th className="text-right">Amount Due</th></tr></thead>
                  <tbody>
                    {data.overdueInvoices.length === 0 && <tr><td colSpan={5}><div className="empty"><p>No overdue invoices 🎉</p></div></td></tr>}
                    {data.overdueInvoices.map((inv) => {
                      const days = Math.max(0, Math.floor((new Date() - new Date(inv.dueDate)) / 86400000));
                      return (
                        <tr key={inv._id}>
                          <td className="fw-600">{inv.invoiceNumber}</td>
                          <td>{inv.client?.name}</td>
                          <td>{fmtDate(inv.dueDate)}</td>
                          <td className="text-right text-danger fw-600">{days} days</td>
                          <td className="text-right fw-600 text-danger">{fmt(inv.amountDue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Loans tab */}
            {activeSection === 'loans' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Loan #</th><th>Borrower</th><th>Date</th><th className="text-right">Amount</th><th className="text-right">Repaid</th><th className="text-right">Outstanding</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.loans.length === 0 && <tr><td colSpan={7}><div className="empty"><p>No loans in this period</p></div></td></tr>}
                    {data.loans.map((l) => (
                      <tr key={l._id}>
                        <td className="fw-600">{l.loanNumber}</td>
                        <td>{l.borrower?.name}</td>
                        <td>{fmtDate(l.date)}</td>
                        <td className="text-right">{fmt(l.amount)}</td>
                        <td className="text-right text-success">{fmt(l.amountRepaid)}</td>
                        <td className="text-right fw-600 text-warning">{fmt(l.amountDue)}</td>
                        <td><span className={`badge badge-${l.status === 'active' ? 'sent' : l.status === 'repaid' ? 'paid' : 'partial'}`}>{l.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
