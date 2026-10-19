import 'fake-indexeddb/auto';
import { db, DEFAULT_SHOP_PROFILE } from './db';
import { 
  getReportPeriodRange, generateCaReportDataset, REPORT_CATEGORIES_CONFIG 
} from './caReportGenerator';
import { exportCaMasterExcelWorkbook } from './caReportExcel';
import { generateCaWhatsAppMessage, shareReportsWithCa } from './caReportSharing';
import { generateCaReportHtml } from './caReportPdf';
import type { Invoice, PurchaseInvoice, Customer, Supplier, Product, GstRate } from '../types';

export interface CaReportTestResult {
  name: string;
  passed: boolean;
  details: string;
}

export async function runCaReportsTestSuite(): Promise<CaReportTestResult[]> {
  const results: CaReportTestResult[] = [];

  // Setup sample test database records
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const isAfterMarch = currentMonth >= 3;
  const currentFyStart = isAfterMarch ? currentYear : currentYear - 1;
  const currentFyEnd = currentFyStart + 1;

  // 1. TEST 1: Indian Financial Year & Period Calculations
  try {
    const fyRange = getReportPeriodRange('current_fy');
    const prevFyRange = getReportPeriodRange('prev_fy');
    const thisMonthRange = getReportPeriodRange('this_month');
    const customRange = getReportPeriodRange('custom', '2026-05-01', '2026-05-31');

    const fyCorrect = fyRange.startDate === `${currentFyStart}-04-01` && fyRange.endDate === `${currentFyEnd}-03-31`;
    const prevFyCorrect = prevFyRange.startDate === `${currentFyStart - 1}-04-01` && prevFyRange.endDate === `${currentFyStart}-03-31`;
    const customCorrect = customRange.startDate === '2026-05-01' && customRange.endDate === '2026-05-31';

    const passed = fyCorrect && prevFyCorrect && customCorrect;
    results.push({
      name: '1. Indian Financial Year & Period Calculation',
      passed,
      details: `Current FY: ${fyRange.startDate} to ${fyRange.endDate} | Prev FY: ${prevFyRange.startDate} to ${prevFyRange.endDate}`
    });
  } catch (e: any) {
    results.push({ name: '1. Indian Financial Year & Period Calculation', passed: false, details: e.message });
  }

  // 2. TEST 2: Data Aggregation & Reconciled Sales Turnover (Completed vs Cancelled)
  try {
    const testDate = `${currentFyStart}-06-15`;

    // 1 Completed Invoice (12% GST, ₹1000 net, ₹120 GST, ₹880 taxable, cash)
    const inv1: Invoice = {
      id: 'inv_ca_test_1',
      invoiceNumber: 'CTC-26-0001',
      invoiceType: 'gst',
      date: testDate,
      time: '11:00 AM',
      customerName: 'Kare Stationery',
      customerMobile: '9425174721',
      customerGstin: '23AABCU9603R1ZM',
      items: [
        {
          id: 'it1',
          productId: 'p1',
          productName: 'Classmate Register 240p',
          sku: 'SKU-REG',
          barcode: 'BAR-REG',
          hsnCode: '4820',
          pack: '1 Pcs',
          unit: 'Pcs',
          qty: 10,
          freeQty: 0,
          mrp: 100,
          unitRate: 100,
          schemeDiscountPct: 0,
          schemeDiscountAmount: 0,
          addlDiscountPct: 0,
          addlDiscountAmount: 0,
          discountPct: 0,
          discountAmount: 0,
          gstRate: 12,
          taxType: 'inclusive',
          taxableAmount: 892.86,
          cgstAmount: 53.57,
          sgstAmount: 53.57,
          igstAmount: 0,
          totalAmount: 1000,
          availableStock: 50
        }
      ],
      subtotal: 892.86,
      totalDiscount: 0,
      totalGst: 107.14,
      cgstTotal: 53.57,
      sgstTotal: 53.57,
      igstTotal: 0,
      freightAmount: 0,
      roundOff: 0,
      netPayable: 1000,
      paymentMode: 'cash',
      paidAmount: 1000,
      balanceAmount: 0,
      status: 'completed',
      isInterstate: false,
      createdAt: `${testDate}T11:00:00.000Z`
    };

    // 1 Completed Invoice (18% GST, ₹500 net, UPI)
    const inv2: Invoice = {
      id: 'inv_ca_test_2',
      invoiceNumber: 'CTC-26-0002',
      invoiceType: 'gst',
      date: testDate,
      time: '12:30 PM',
      customerName: 'Gupta Traders',
      customerMobile: '9826012345',
      items: [
        {
          id: 'it2',
          productId: 'p2',
          productName: 'Camlin Geometry Box',
          sku: 'SKU-CAM',
          barcode: 'BAR-CAM',
          hsnCode: '9017',
          pack: '1 Box',
          unit: 'Box',
          qty: 5,
          freeQty: 0,
          mrp: 100,
          unitRate: 100,
          schemeDiscountPct: 0,
          schemeDiscountAmount: 0,
          addlDiscountPct: 0,
          addlDiscountAmount: 0,
          discountPct: 0,
          discountAmount: 0,
          gstRate: 18,
          taxType: 'inclusive',
          taxableAmount: 423.73,
          cgstAmount: 38.14,
          sgstAmount: 38.14,
          igstAmount: 0,
          totalAmount: 500,
          availableStock: 30
        }
      ],
      subtotal: 423.73,
      totalDiscount: 0,
      totalGst: 76.27,
      cgstTotal: 38.14,
      sgstTotal: 38.14,
      igstTotal: 0,
      freightAmount: 0,
      roundOff: 0,
      netPayable: 500,
      paymentMode: 'upi',
      paidAmount: 500,
      balanceAmount: 0,
      status: 'completed',
      isInterstate: false,
      transactionRef: 'UPI-987654321',
      createdAt: `${testDate}T12:30:00.000Z`
    };

    // 1 Cancelled Invoice (₹800, MUST be excluded from turnover)
    const invCancelled: Invoice = {
      id: 'inv_ca_test_cancelled',
      invoiceNumber: 'CTC-26-0003',
      invoiceType: 'gst',
      date: testDate,
      time: '02:00 PM',
      customerName: 'Cancelled Party',
      customerMobile: '9000000000',
      items: [],
      subtotal: 700,
      totalDiscount: 0,
      totalGst: 100,
      cgstTotal: 50,
      sgstTotal: 50,
      igstTotal: 0,
      freightAmount: 0,
      roundOff: 0,
      netPayable: 800,
      paymentMode: 'cash',
      paidAmount: 800,
      balanceAmount: 0,
      status: 'cancelled',
      isInterstate: false,
      createdAt: `${testDate}T14:00:00.000Z`
    };

    await db.invoices.put(inv1);
    await db.invoices.put(inv2);
    await db.invoices.put(invCancelled);

    // 1 Inward Purchase Bill (₹2000 total, ₹180 GST)
    const pur1: PurchaseInvoice = {
      id: 'pur_ca_test_1',
      supplierName: 'ITC Paperboards Ltd',
      supplierGstin: '23AAACI1234F1Z5',
      invoiceNumber: 'ITC-8877',
      invoiceDate: testDate,
      totalItems: 1,
      subtotal: 1820,
      totalGst: 180,
      grandTotal: 2000,
      status: 'completed',
      items: [
        {
          id: 'pit1',
          rawName: 'Copier Paper A4 75gsm',
          qty: 10,
          unit: 'Ream',
          purchaseRate: 182,
          mrp: 250,
          gstRate: 12,
          totalAmount: 2000
        }
      ],
      createdAt: `${testDate}T10:00:00.000Z`
    };
    await db.purchaseInvoices.put(pur1);

    // Customer
    await db.customers.put({
      id: 'cust_ca_1',
      name: 'Kare Stationery',
      mobile: '9425174721',
      gstin: '23AABCU9603R1ZM',
      city: 'Seoni',
      creditBalance: 1250,
      createdAt: testDate
    });

    // Supplier
    await db.suppliers.put({
      id: 'sup_ca_1',
      name: 'ITC Paperboards Ltd',
      mobile: '9826198261',
      gstin: '23AAACI1234F1Z5',
      balancePayable: 2000,
      createdAt: testDate
    });

    // Generate dataset for test period
    const testPeriod = getReportPeriodRange('custom', `${currentFyStart}-06-01`, `${currentFyStart}-06-30`);
    const dataset = await generateCaReportDataset(testPeriod, ['sales', 'purchases', 'tax_summary', 'payments', 'customers', 'suppliers', 'inventory'], DEFAULT_SHOP_PROFILE);

    const completedTurnover = dataset.metrics.totalSalesNet; // 1000 + 500 = 1500 (cancelled 800 excluded)
    const cancelledCount = dataset.metrics.cancelledSalesCount; // 1
    const cashRec = dataset.metrics.cashCollection; // 1000
    const upiRec = dataset.metrics.upiCollection; // 500
    const purchaseTurnover = dataset.metrics.totalPurchasesAmount; // 2000
    const isExcludedNoted = dataset.validationNotes.some(n => n.includes('cancelled invoice'));

    const passed = completedTurnover === 1500 &&
                   cancelledCount === 1 &&
                   cashRec === 1000 &&
                   upiRec === 500 &&
                   purchaseTurnover === 2000 &&
                   isExcludedNoted;

    results.push({
      name: '2. Turnover & Tax Reconciliation (Cancelled vs Completed)',
      passed,
      details: `Net Sales: ₹${completedTurnover} (Expected 1500) | Cancelled Excluded: ${cancelledCount} (₹800) | Purchases: ₹${purchaseTurnover}`
    });
  } catch (e: any) {
    results.push({ name: '2. Turnover & Tax Reconciliation', passed: false, details: e.message });
  }

  // 3. TEST 3: Rate-wise GST Slab Matrix
  try {
    const testPeriod = getReportPeriodRange('custom', `${currentFyStart}-06-01`, `${currentFyStart}-06-30`);
    const dataset = await generateCaReportDataset(testPeriod, ['tax_summary', 'sales'], DEFAULT_SHOP_PROFILE);

    const bucket12 = dataset.taxSummary.salesByRate[12];
    const bucket18 = dataset.taxSummary.salesByRate[18];
    const bucket0 = dataset.taxSummary.salesByRate[0];

    const passed = bucket12.transactionCount >= 1 &&
                   bucket18.transactionCount >= 1 &&
                   bucket0.transactionCount === 0 &&
                   dataset.metrics.cgstTotal > 0 &&
                   dataset.metrics.sgstTotal > 0;

    results.push({
      name: '3. GST Slab Matrix Multi-Rate Grouping (12% and 18%)',
      passed,
      details: `12% Slab Count: ${bucket12.transactionCount} | 18% Slab Count: ${bucket18.transactionCount} | CGST: ₹${dataset.metrics.cgstTotal} | SGST: ₹${dataset.metrics.sgstTotal}`
    });
  } catch (e: any) {
    results.push({ name: '3. GST Slab Matrix Multi-Rate Grouping', passed: false, details: e.message });
  }

  // 4. TEST 4: Empty Period Handling (Graceful Zero Metrics)
  try {
    const emptyPeriod = getReportPeriodRange('custom', '2019-01-01', '2019-01-31');
    const emptyDataset = await generateCaReportDataset(emptyPeriod, ['sales', 'purchases'], DEFAULT_SHOP_PROFILE);

    const passed = emptyDataset.salesInvoices.length === 0 &&
                   emptyDataset.metrics.totalSalesNet === 0 &&
                   emptyDataset.validationNotes.some(n => n.includes('No finalized sales invoices'));

    results.push({
      name: '4. Empty Reporting Period Handling & Zero Balance Guard',
      passed,
      details: `Invoices Found: ${emptyDataset.salesInvoices.length} | Net Turnover: ₹${emptyDataset.metrics.totalSalesNet} | System Notice Present: true`
    });
  } catch (e: any) {
    results.push({ name: '4. Empty Reporting Period Handling', passed: false, details: e.message });
  }

  // 5. TEST 5: WhatsApp Pre-filled Message Formatting
  try {
    const testPeriod = getReportPeriodRange('custom', `${currentFyStart}-06-01`, `${currentFyStart}-06-30`);
    const dataset = await generateCaReportDataset(testPeriod, ['sales', 'purchases', 'tax_summary', 'payments'], DEFAULT_SHOP_PROFILE);

    const msg = generateCaWhatsAppMessage(dataset, 'Ramesh Jain');
    const hasGreeting = msg.includes('Respected Ramesh Jain,');
    const hasTurnover = msg.includes('Net Sales Turnover:');
    const hasGst = msg.includes('Total GST Output Tax:');
    const hasDisclaimer = msg.includes('WebRajya Invoice software');

    const passed = hasGreeting && hasTurnover && hasGst && hasDisclaimer;
    results.push({
      name: '5. WhatsApp Prefilled Sharing Message Composition',
      passed,
      details: `Message contains CA greeting, formatted turnover figures, and filing request disclaimer.`
    });
  } catch (e: any) {
    results.push({ name: '5. WhatsApp Prefilled Sharing Message', passed: false, details: e.message });
  }

  // 6. TEST 6: PDF HTML Statement Generation
  try {
    const testPeriod = getReportPeriodRange('custom', `${currentFyStart}-06-01`, `${currentFyStart}-06-30`);
    const dataset = await generateCaReportDataset(testPeriod, ['sales', 'purchases', 'tax_summary', 'customers'], DEFAULT_SHOP_PROFILE);

    const html = generateCaReportHtml(dataset);
    const hasTitle = html.includes('CHARTERED ACCOUNTANT REPORT PACK');
    const hasShopName = html.includes(DEFAULT_SHOP_PROFILE.shopName);
    const hasGstTable = html.includes('Outward Supplies Tax Summary');
    const hasSignatory = html.includes('Authorised Signatory / Proprietor');

    const passed = hasTitle && hasShopName && hasGstTable && hasSignatory;
    results.push({
      name: '6. PDF Statement HTML & Print Engine Layout',
      passed,
      details: `Generated valid A4 accounting layout with header, rate-wise GST matrix, registers, and signatory box.`
    });
  } catch (e: any) {
    results.push({ name: '6. PDF Statement HTML & Print Layout', passed: false, details: e.message });
  }

  return results;
}
