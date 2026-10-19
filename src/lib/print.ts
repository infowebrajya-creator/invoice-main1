import { Invoice, ShopProfile, PrintSettings } from '../types';
import { numberToWordsIndian } from '../utils/numberToWords';

export { numberToWordsIndian };

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
}

export function triggerA5Print(invoice: Invoice, shop: ShopProfile, printSettings?: PrintSettings) {
  const isGstInvoice = invoice.invoiceType === 'gst';
  const docTitle = isGstInvoice ? 'TAX INVOICE' : 'CREDIT ESTIMATE';
  const docNoLabel = isGstInvoice ? 'Invoice No.' : 'Estimate No.';
  const formattedDate = formatDateDDMMYYYY(invoice.date);

  const isA4 = printSettings?.paperSize === 'A4';
  const items = invoice.items || [];
  const minRows = isA4 ? 32 : 24;
  const paddingRowsCount = Math.max(0, minRows - items.length);

  const itemsHtml = items.map((item, index) => {
    const remarkText = item.remark || item.pack || (item.hsnCode ? `HSN:${item.hsnCode}` : '');
    const itemTotal = item.totalAmount || (item.unitRate * item.qty * (1 - (item.discountPct || 0) / 100));
    return `
      <tr class="item-row">
        <td style="text-align: center; border-right: 1px solid #000; font-family: monospace;">${index + 1}</td>
        <td style="border-right: 1px solid #000; padding: 1px 3px; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.productName}</td>
        <td style="text-align: center; border-right: 1px solid #000; font-size: 7.5px; text-transform: uppercase;">${remarkText || ''}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding-right: 2px; font-family: monospace;">${item.qty.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding-right: 2px; font-family: monospace;">${(item.freeQty || 0).toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding-right: 2px; font-family: monospace;">${item.unitRate.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding-right: 2px; font-family: monospace;">${item.mrp.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding-right: 2px; font-family: monospace;">${(item.discountPct || 0).toFixed(2)}</td>
        <td style="text-align: right; padding-right: 3px; font-family: monospace; font-weight: 700;">${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const paddingHtml = Array.from({ length: paddingRowsCount }).map(() => `
    <tr class="item-row pad-row">
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `).join('');

  const termsList = shop.termsAndConditions
    ? shop.termsAndConditions.split('\n').filter(t => t.trim() !== '')
    : ['Goods once sold will not be taken back or exchanged.', 'All disputes subject to Jurisdiction only.'];

  const grossSubtotal = invoice.subtotal + (invoice.totalDiscount || 0);

  // Determine header party text
  const isPartyGiven = invoice.customerName && invoice.customerName.trim().toLowerCase() !== 'cash customer';
  const partyLine1 = isPartyGiven ? `M/s ${invoice.customerName.trim().toUpperCase()}` : `M/s ${shop.shopName || 'CHANDRA TRADING COMPANY'}`;
  const partyLine2 = isPartyGiven
    ? (invoice.customerAddress ? invoice.customerAddress.trim().toUpperCase() : 'PALARI')
    : (shop.address || 'NEW SHUKRAWARI MARKET, SEONI (M.P.)');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${docTitle} - ${invoice.invoiceNumber}</title>
        <style>
          @page {
            size: ${isA4 ? 'A4 portrait' : 'A5 portrait'};
            margin: ${isA4 ? '5mm 6mm 4mm 6mm' : '3mm 4mm 2mm 4mm'};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #000000;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            font-size: ${isA4 ? '10.5px' : '8.5px'};
            line-height: 1.15;
            -webkit-font-smoothing: antialiased;
          }
          .outer-frame {
            border: 1px solid #000000;
            width: ${isA4 ? '198mm' : '140mm'};
            height: ${isA4 ? '285mm' : '202mm'};
            max-height: ${isA4 ? '285mm' : '202mm'};
            box-sizing: border-box;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #ffffff;
          }
          
          /* 1. TOP HEADER (EXACT MARG 3-COLUMN COMPACT LAYOUT) */
          .header-block {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 3px 5px 2px 5px;
            border-bottom: 1px solid #000000;
            flex-shrink: 0;
            font-family: Arial, sans-serif;
          }
          .header-left {
            width: 42%;
            line-height: 1.2;
          }
          .header-left .party-title {
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .header-left .party-sub {
            font-size: 8.5px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .header-left .party-meta {
            font-size: 8px;
            color: #222;
          }

          .header-center {
            width: 28%;
            text-align: center;
          }
          .header-center .doc-title {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            text-decoration: underline;
            padding-top: 1px;
          }
          .header-center .shop-tag {
            font-size: 7.5px;
            font-weight: bold;
            color: #444;
            text-transform: uppercase;
            margin-top: 1px;
          }

          .header-right {
            width: 30%;
            text-align: right;
            font-family: monospace;
            font-size: 9.5px;
            line-height: 1.25;
          }
          .meta-row {
            display: flex;
            justify-content: flex-end;
            gap: 2px;
          }
          .meta-lbl {
            font-weight: bold;
          }
          .meta-val {
            font-weight: bold;
          }

          /* 2. TABLE LAYOUT (9 COLUMNS, BORDER GRID) */
          .table-container {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            width: 100%;
          }
          table.items-table {
            width: 100%;
            height: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            flex: 1 1 auto;
          }
          table.items-table thead {
            display: table-header-group;
          }
          table.items-table th {
            background-color: transparent !important;
            color: #000000;
            font-weight: 800;
            font-size: 8.5px;
            padding: 2px 2px;
            border-bottom: 1px solid #000000;
            border-right: 1px solid #000000;
            line-height: 1.1;
          }
          table.items-table th:last-child {
            border-right: none;
          }
          tr.item-row {
            height: 13.5px;
            max-height: 13.5px;
            page-break-inside: avoid;
          }
          tr.item-row td {
            font-size: 8px;
            padding: 1px 2px;
            border-right: 1px solid #000000;
            vertical-align: middle;
            line-height: 1.1;
          }
          tr.item-row td:last-child {
            border-right: none;
          }
          tr.spacer-row td {
            height: 100%;
            border-right: 1px solid #000000;
          }
          tr.spacer-row td:last-child {
            border-right: none;
          }

          /* 3. FOOTER (MARG EXACT 2-COLUMN SPLIT) */
          .footer-block {
            flex-shrink: 0;
            border-top: 1px solid #000000;
            display: flex;
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .footer-left {
            width: 61%;
            border-right: 1px solid #000000;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .words-row {
            padding: 2.5px 5px;
            font-size: 8.5px;
            font-weight: bold;
            line-height: 1.2;
          }
          .remark-box {
            border-top: 1px solid #000000;
            border-bottom: 1px solid #000000;
            padding: 2px 5px;
            font-size: 9px;
            font-weight: 800;
            font-family: Arial, monospace, sans-serif;
            background: #fafafa;
          }
          .terms-box {
            padding: 3px 5px 3px 5px;
            font-size: 7.5px;
            line-height: 1.25;
          }
          .terms-header {
            text-decoration: underline;
            font-weight: 800;
            font-size: 8px;
            text-transform: uppercase;
            margin-bottom: 1px;
          }

          .footer-right {
            width: 39%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            font-family: monospace;
          }
          .totals-table {
            padding: 2.5px 5px;
            font-size: 10px;
            border-bottom: 1px solid #000000;
          }
          .tot-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 1px;
          }
          .tot-grand {
            border-top: 1.5px solid #000000;
            padding-top: 2px;
            margin-top: 1.5px;
            font-size: 11px;
            font-weight: 900;
          }
          .signatory-area {
            padding: 12px 6px 3px 6px;
            text-align: right;
            font-size: 8.5px;
            font-weight: 800;
            font-family: Arial, sans-serif;
          }

          /* Bottom software micro-line */
          .sub-footer-text {
            font-size: 7px;
            color: #444;
            text-align: center;
            width: 140mm;
            margin: 1.5px auto 0 auto;
            letter-spacing: 0.1px;
          }
        </style>
      </head>
      <body>
        <div class="outer-frame">
          <!-- TOP HEADER -->
          <div class="header-block">
            <div class="header-left">
              <div class="party-title">${partyLine1}</div>
              <div class="party-sub">${partyLine2}</div>
              ${isPartyGiven && invoice.customerMobile ? `<div class="party-meta">Ph: ${invoice.customerMobile}</div>` : ''}
              ${isPartyGiven && invoice.customerGstin ? `<div class="party-meta">GSTIN: ${invoice.customerGstin}</div>` : ''}
            </div>

            <div class="header-center">
              <div class="doc-title">${docTitle}</div>
              ${isPartyGiven ? `<div class="shop-tag">M/s ${shop.shopName || 'CHANDRA TRADING COMPANY'}</div>` : ''}
            </div>

            <div class="header-right">
              <div class="meta-row">
                <span class="meta-lbl">${docNoLabel} :</span>
                <span class="meta-val">${invoice.invoiceNumber}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">Date :</span>
                <span class="meta-val">${formattedDate}</span>
              </div>
              ${invoice.time ? `
                <div class="meta-row" style="font-size: 8px; color: #333;">
                  <span>Time :</span>
                  <span>${invoice.time}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- TABLE -->
          <div class="table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 4%; text-align: center;">S.</th>
                  <th style="width: 44%; text-align: left; padding-left: 3px;">Item Description</th>
                  <th style="width: 7%; text-align: center;">REMARK</th>
                  <th style="width: 7%; text-align: right; padding-right: 2px;">Qty.</th>
                  <th style="width: 6%; text-align: right; padding-right: 2px;">FREE</th>
                  <th style="width: 8%; text-align: right; padding-right: 2px;">Rate</th>
                  <th style="width: 8%; text-align: right; padding-right: 2px;">MRP</th>
                  <th style="width: 6%; text-align: right; padding-right: 2px;">DIS%</th>
                  <th style="width: 10%; text-align: right; padding-right: 3px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                ${paddingHtml}
                <tr class="spacer-row" style="height: 100%;">
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER -->
          <div class="footer-block">
            <div class="footer-left">
              <div class="words-row">
                Rs. <span style="text-transform: capitalize;">${numberToWordsIndian(invoice.netPayable)}</span> only
              </div>

              <div class="remark-box">
                Remark : ${invoice.notes || ''}
              </div>

              <div class="terms-box">
                <div class="terms-header">Terms & Conditions</div>
                ${termsList.map(t => `<div>${t}</div>`).join('')}
              </div>
            </div>

            <div class="footer-right">
              <div class="totals-table">
                <div class="tot-row">
                  <span>SUB TOTAL</span>
                  <span>${grossSubtotal.toFixed(2)}</span>
                </div>
                ${invoice.totalDiscount > 0 ? `
                  <div class="tot-row">
                    <span>DISCOUNT</span>
                    <span>${invoice.totalDiscount.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${invoice.freightAmount > 0 ? `
                  <div class="tot-row">
                    <span>FRIGHT</span>
                    <span>${invoice.freightAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${isGstInvoice && invoice.totalGst > 0 ? `
                  <div class="tot-row">
                    <span>GST TAX</span>
                    <span>${invoice.totalGst.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="tot-row tot-grand">
                  <span>GRAND TOTAL</span>
                  <span>${invoice.netPayable.toFixed(2)}</span>
                </div>
              </div>

              <div class="signatory-area">
                Authorised signatory
              </div>
            </div>
          </div>
        </div>

        <div class="sub-footer-text">
          CHANDRA TRADING COMPANY | POS SOFTWARE PRINT ENGINE
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
    </html>
  `;

  try {
    const printWindow = window.open('', '_blank', 'width=800,height=950');
    if (printWindow && !printWindow.closed) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('Popup blocked, falling back to hidden iframe printing:', e);
  }

  // Fallback: Invisible iframe printing so popups never block printing
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    }
  } catch (err) {
    console.error('All printing methods failed:', err);
  }
}
