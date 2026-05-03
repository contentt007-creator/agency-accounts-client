import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── UmbrellaCorp brand constants ─────────────────────────────────────────────
const BRAND = {
  name: 'UmbrellaCorp HQ',
  tagline: 'Creative & Digital Agency',
  website: 'umbrellacorphq.com',
  email: 'accounts@umbrellacorphq.com',
  colors: {
    primary: [30, 64, 175],    // blue-700
    secondary: [100, 116, 139], // slate-500
    accent: [16, 185, 129],    // emerald-500
    light: [241, 245, 249],    // slate-100
    border: [226, 232, 240],   // slate-200
    text: [15, 23, 42],        // slate-900
    muted: [100, 116, 139],    // slate-500
  },
};

const fmt = (n) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Status badge color ────────────────────────────────────────────────────────
function statusColor(status) {
  const map = {
    paid: [22, 163, 74],
    partial: [234, 179, 8],
    overdue: [220, 38, 38],
    void: [156, 163, 175],
    sent: [37, 99, 235],
    draft: [107, 114, 128],
    received: [37, 99, 235],
  };
  return map[status] || [107, 114, 128];
}

// ── Draw top header band ──────────────────────────────────────────────────────
function drawHeader(doc, docType) {
  const { primary, text } = BRAND.colors;

  // Blue header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 38, 'F');

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.name, 14, 14);

  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text(BRAND.tagline, 14, 21);
  doc.text(BRAND.website, 14, 27);

  // Document type label (right side)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(docType.toUpperCase(), 196, 22, { align: 'right' });

  // Reset
  doc.setTextColor(...text);
}

// ── Draw footer on every page ─────────────────────────────────────────────────
function drawFooter(doc) {
  const { secondary, border } = BRAND.colors;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = 285;

    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondary);
    doc.text(`${BRAND.name} · ${BRAND.website} · ${BRAND.email}`, 14, y + 5);
    doc.text(`Page ${i} of ${pageCount}`, 196, y + 5, { align: 'right' });

    doc.setFontSize(7.5);
    doc.text('Thank you for doing business with us.', 105, y + 10, { align: 'center' });
  }
}

// ── Utility: two-column info block ───────────────────────────────────────────
function infoBlock(doc, x, y, label, value, maxWidth = 90) {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.text);
  const lines = doc.splitTextToSize(String(value || '—'), maxWidth);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 5;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERATE INVOICE PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { primary, light, border, accent } = BRAND.colors;

  drawHeader(doc, 'Invoice');

  let y = 48;

  // ── Invoice meta band ────────────────────────────────────────────────────
  doc.setFillColor(...light);
  doc.roundedRect(14, y, 182, 28, 2, 2, 'F');

  // Invoice number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('INVOICE NUMBER', 20, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(invoice.invoiceNumber, 20, y + 15);

  // Issue date
  infoBlock(doc, 76, y + 4, 'Issue Date', fmtDate(invoice.issueDate));

  // Due date
  infoBlock(doc, 120, y + 4, 'Due Date', fmtDate(invoice.dueDate));

  // Status badge
  const sc = statusColor(invoice.status);
  doc.setFillColor(...sc);
  doc.roundedRect(168, y + 8, 24, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text((invoice.status || '').toUpperCase(), 180, y + 14, { align: 'center' });

  y += 36;

  // ── Bill To / From ───────────────────────────────────────────────────────
  const client = invoice.client || {};
  const clientLines = [
    client.name,
    client.email,
    client.phone,
    client.address,
  ].filter(Boolean);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('BILL TO', 14, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.text);
  doc.text(client.name || '—', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.secondary);
  if (client.email) doc.text(client.email, 14, y + 12);
  if (client.phone) doc.text(client.phone, 14, y + 17);
  if (client.address) {
    const addrLines = doc.splitTextToSize(client.address, 80);
    doc.text(addrLines, 14, y + 22);
  }

  // From (right side)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('FROM', 120, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.text);
  doc.text(BRAND.name, 120, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.secondary);
  doc.text(BRAND.website, 120, y + 12);
  doc.text(BRAND.email, 120, y + 17);

  y += 36;

  // ── Line items table ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: (invoice.lineItems || []).map((item, i) => [
      i + 1,
      item.description,
      item.quantity,
      fmt(item.unitPrice),
      fmt(item.amount),
    ]),
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: BRAND.colors.text },
    alternateRowStyles: { fillColor: light },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Totals block ──────────────────────────────────────────────────────────
  const totalsX = 128;
  const totalsW = 68;

  function totalsRow(label, value, bold = false, highlight = false) {
    if (highlight) {
      doc.setFillColor(...primary);
      doc.rect(totalsX, y - 4, totalsW, 9, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...BRAND.colors.text);
    }
    doc.setFontSize(bold || highlight ? 10 : 9);
    doc.setFont('helvetica', bold || highlight ? 'bold' : 'normal');
    doc.text(label, totalsX + 4, y);
    doc.text(value, totalsX + totalsW - 3, y, { align: 'right' });
    y += 9;
  }

  totalsRow('Subtotal', fmt(invoice.subtotal));
  if (invoice.taxRate > 0) {
    totalsRow(`Tax (${invoice.taxRate}%)`, fmt(invoice.taxAmount));
  }
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y - 3, totalsX + totalsW, y - 3);
  totalsRow('Total', fmt(invoice.total), true);

  if (invoice.amountPaid > 0) {
    totalsRow('Amount Paid', `(${fmt(invoice.amountPaid)})`);
    y += 2;
    totalsRow('Balance Due', fmt(invoice.amountDue), true, true);
  }

  // ── Payment history ───────────────────────────────────────────────────────
  if (invoice.payments && invoice.payments.length > 0) {
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.text);
    doc.text('Payment History', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Reference', 'Amount']],
      body: invoice.payments.map((p) => [fmtDate(p.date), p.reference || '—', fmt(p.amount)]),
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
      tableWidth: 100,
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y = Math.max(y, doc.lastAutoTable?.finalY + 8 || y);
    doc.setFillColor(...light);
    doc.roundedRect(14, y, 100, 20, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.muted);
    doc.text('NOTES', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.colors.text);
    const noteLines = doc.splitTextToSize(invoice.notes, 90);
    doc.text(noteLines, 18, y + 12);
  }

  drawFooter(doc);
  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERATE BILL PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function generateBillPDF(bill) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { primary, light, border } = BRAND.colors;

  drawHeader(doc, 'Bill');

  let y = 48;

  // ── Bill meta band ───────────────────────────────────────────────────────
  doc.setFillColor(...light);
  doc.roundedRect(14, y, 182, 28, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('BILL NUMBER', 20, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(bill.billNumber, 20, y + 15);

  infoBlock(doc, 76, y + 4, 'Issue Date', fmtDate(bill.issueDate));
  infoBlock(doc, 120, y + 4, 'Due Date', fmtDate(bill.dueDate));

  const sc = statusColor(bill.status);
  doc.setFillColor(...sc);
  doc.roundedRect(168, y + 8, 24, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text((bill.status || '').toUpperCase(), 180, y + 14, { align: 'center' });

  y += 36;

  // ── Vendor info ───────────────────────────────────────────────────────────
  const vendor = bill.vendor || {};
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('VENDOR / SUPPLIER', 14, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.text);
  doc.text(vendor.name || '—', 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.secondary);
  if (vendor.email) doc.text(vendor.email, 14, y + 12);
  if (vendor.phone) doc.text(vendor.phone, 14, y + 17);
  if (vendor.address) {
    const addrLines = doc.splitTextToSize(vendor.address, 80);
    doc.text(addrLines, 14, y + 22);
  }

  // Bill to (right side)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('PAYABLE BY', 120, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.text);
  doc.text(BRAND.name, 120, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.colors.secondary);
  doc.text(BRAND.website, 120, y + 12);
  doc.text(BRAND.email, 120, y + 17);

  y += 36;

  // ── Line items table ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: (bill.lineItems || []).map((item, i) => [
      i + 1,
      item.description,
      item.quantity,
      fmt(item.unitPrice),
      fmt(item.amount),
    ]),
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: BRAND.colors.text },
    alternateRowStyles: { fillColor: light },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsX = 128;
  const totalsW = 68;

  function totalsRow(label, value, bold = false, highlight = false) {
    if (highlight) {
      doc.setFillColor(...primary);
      doc.rect(totalsX, y - 4, totalsW, 9, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...BRAND.colors.text);
    }
    doc.setFontSize(bold || highlight ? 10 : 9);
    doc.setFont('helvetica', bold || highlight ? 'bold' : 'normal');
    doc.text(label, totalsX + 4, y);
    doc.text(value, totalsX + totalsW - 3, y, { align: 'right' });
    y += 9;
  }

  totalsRow('Subtotal', fmt(bill.subtotal));
  if (bill.taxRate > 0) totalsRow(`Tax (${bill.taxRate}%)`, fmt(bill.taxAmount));
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y - 3, totalsX + totalsW, y - 3);
  totalsRow('Total', fmt(bill.total), true);

  if (bill.amountPaid > 0) {
    totalsRow('Amount Paid', `(${fmt(bill.amountPaid)})`);
    y += 2;
    totalsRow('Balance Due', fmt(bill.amountDue), true, true);
  }

  // ── Payment history ───────────────────────────────────────────────────────
  if (bill.payments && bill.payments.length > 0) {
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.text);
    doc.text('Payment History', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Reference', 'Amount']],
      body: bill.payments.map((p) => [fmtDate(p.date), p.reference || '—', fmt(p.amount)]),
      headStyles: { fillColor: [234, 179, 8], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
      tableWidth: 100,
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (bill.notes) {
    doc.setFillColor(...light);
    doc.roundedRect(14, y, 100, 20, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.muted);
    doc.text('NOTES', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.colors.text);
    const noteLines = doc.splitTextToSize(bill.notes, 90);
    doc.text(noteLines, 18, y + 12);
  }

  drawFooter(doc);
  doc.save(`Bill_${bill.billNumber}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERATE PAYMENT RECEIPT PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function generateReceiptPDF(transaction, linkedDoc) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { primary, light, border } = BRAND.colors;
  const isPayment = transaction.type === 'payment';

  drawHeader(doc, isPayment ? 'Receipt' : 'Payment Voucher');

  let y = 48;

  // Meta band
  doc.setFillColor(...light);
  doc.roundedRect(14, y, 182, 28, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('REFERENCE', 20, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(transaction.reference || transaction._id?.slice(-8).toUpperCase() || '—', 20, y + 15);

  infoBlock(doc, 76, y + 4, 'Date', fmtDate(transaction.date));
  infoBlock(doc, 120, y + 4, 'Type', isPayment ? 'Payment Received' : 'Bill Payment');

  if (linkedDoc) {
    infoBlock(doc, 158, y + 4, isPayment ? 'Invoice' : 'Bill', linkedDoc.invoiceNumber || linkedDoc.billNumber);
  }

  y += 36;

  // Description + Contact
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.muted);
  doc.text('DESCRIPTION', 14, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.text);
  const descLines = doc.splitTextToSize(transaction.description || '—', 180);
  doc.text(descLines, 14, y + 6);

  if (transaction.contact?.name) {
    y += 16;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.muted);
    doc.text('CONTACT', 14, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.colors.text);
    doc.text(transaction.contact.name, 14, y + 6);
  }

  y += 24;

  // Ledger entries table
  autoTable(doc, {
    startY: y,
    head: [['Account', 'Description', 'Debit (৳)', 'Credit (৳)']],
    body: (transaction.entries || []).map((e) => [
      `${e.account?.code ? e.account.code + ' — ' : ''}${e.account?.name || '—'}`,
      e.description || '',
      e.debit > 0 ? fmt(e.debit) : '',
      e.credit > 0 ? fmt(e.credit) : '',
    ]),
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: BRAND.colors.text },
    alternateRowStyles: { fillColor: light },
    columnStyles: {
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 3 },
    foot: [[
      { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmt(transaction.entries?.reduce((s, e) => s + e.debit, 0)), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmt(transaction.entries?.reduce((s, e) => s + e.credit, 0)), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
    footStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 9 },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Total amount highlight
  const total = transaction.entries?.reduce((s, e) => s + e.debit, 0) || 0;
  doc.setFillColor(...primary);
  doc.roundedRect(128, y, 68, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT', 132, y + 6);
  doc.setFontSize(13);
  doc.text(fmt(total), 193, y + 12, { align: 'right' });

  if (transaction.notes) {
    y += 24;
    doc.setFillColor(...light);
    doc.roundedRect(14, y, 100, 20, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.colors.muted);
    doc.text('NOTES', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.colors.text);
    const noteLines = doc.splitTextToSize(transaction.notes, 90);
    doc.text(noteLines, 18, y + 12);
  }

  drawFooter(doc);
  const ref = transaction.reference || transaction._id?.slice(-8).toUpperCase();
  doc.save(`Receipt_${ref}.pdf`);
}
