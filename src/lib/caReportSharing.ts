import { CaReportData } from '../types/caReport';
import { formatCurrency, formatDate } from '../utils/formatters';

const STORAGE_CA_PHONE = 'webrajya_ca_phone';
const STORAGE_CA_NAME = 'webrajya_ca_name';

export interface CaContactInfo {
  name: string;
  phone: string;
}

export function getSavedCaContact(): CaContactInfo {
  if (typeof localStorage === 'undefined') return { name: '', phone: '' };
  return {
    name: localStorage.getItem(STORAGE_CA_NAME) || '',
    phone: localStorage.getItem(STORAGE_CA_PHONE) || ''
  };
}

export function saveCaContact(contact: CaContactInfo) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_CA_NAME, contact.name.trim());
  localStorage.setItem(STORAGE_CA_PHONE, contact.phone.trim().replace(/\D/g, ''));
}

// Generate professional WhatsApp message for CA
export function generateCaWhatsAppMessage(data: CaReportData, caName?: string): string {
  const { shopProfile, period, metrics, taxSummary, selectedCategories } = data;
  const greeting = caName && caName.trim() ? `Respected ${caName.trim()},` : `Hello Sir / Ma'am,`;

  const includedReportsList = selectedCategories.map(cat => {
    switch (cat) {
      case 'sales': return '• Sales Register & Invoices';
      case 'purchases': return '• Purchase Inward Register';
      case 'tax_summary': return '• GST Rate-wise Tax Summary (0, 5, 12, 18, 28%)';
      case 'payments': return '• Collections & Payment Methods Log';
      case 'customers': return '• Customer Khata / Receivables';
      case 'suppliers': return '• Suppliers / Payables';
      case 'inventory': return '• Stock Valuation & Inventory Summary';
      default: return '';
    }
  }).filter(Boolean).join('\n');

  const lines = [
    `📊 *BUSINESS ACCOUNTING REPORT - ${shopProfile.shopName.toUpperCase()}*`,
    `----------------------------------------`,
    greeting,
    `I am sharing my business accounting records for the period *${period.label}* (${formatDate(period.startDate)} to ${formatDate(period.endDate)}), compiled via WebRajya Invoice software.`,
    ``,
    `*📈 Key Summary Figures:*`,
    `• Net Sales Turnover: *₹${metrics.totalSalesNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}* (${metrics.completedSalesCount} Bills)`,
    `• Taxable Turnover: *₹${metrics.totalSalesTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
    `• Total GST Output Tax: *₹${metrics.totalSalesGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
    metrics.totalPurchasesAmount > 0 ? `• Inward Purchases: *₹${metrics.totalPurchasesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}* (Input GST: ₹${metrics.totalPurchasesGst.toFixed(2)})` : '',
    `• Collections Received: Cash ₹${metrics.cashCollection.toFixed(0)} | UPI ₹${metrics.upiCollection.toFixed(0)}`,
    metrics.totalCustomerReceivables > 0 ? `• Khata Receivables: ₹${metrics.totalCustomerReceivables.toFixed(2)}` : '',
    ``,
    `*📁 Attached Reports Pack:*`,
    includedReportsList,
    ``,
    `Please review the attached Excel workbook and PDF statement for accounting compilation and tax filing. Let me know if any additional invoices or clarifications are needed.`,
    ``,
    `Thank you!`
  ].filter(line => line !== null && line !== undefined && line !== '');

  return lines.join('\n');
}

// Share via Web Share API or WhatsApp link
export async function shareReportsWithCa(params: {
  data: CaReportData;
  caPhone?: string;
  caName?: string;
  filesToShare?: File[];
}): Promise<{ sharedViaNative: boolean; whatsappUrl: string }> {
  const { data, caPhone, caName, filesToShare } = params;
  const message = generateCaWhatsAppMessage(data, caName);

  // Clean phone number (Indian 10-digit -> 91xxxxxxxxxx)
  let cleanPhone = (caPhone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  // 1. Try Native Web Share API if supported and files are provided
  if (typeof navigator !== 'undefined' && navigator.canShare && filesToShare && filesToShare.length > 0) {
    try {
      if (navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title: `CA Report - ${data.shopProfile.shopName}`,
          text: message,
          files: filesToShare
        });
        return { sharedViaNative: true, whatsappUrl: '' };
      }
    } catch (err: any) {
      // AbortError indicates user cancelled share sheet, other errors fallback to WhatsApp URL
      if (err.name === 'AbortError') {
        return { sharedViaNative: true, whatsappUrl: '' };
      }
      console.warn('Native share failed, falling back to WhatsApp link:', err);
    }
  }

  // 2. Standard WhatsApp URL fallback
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}` 
    : `https://wa.me/?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
  return { sharedViaNative: false, whatsappUrl };
}
