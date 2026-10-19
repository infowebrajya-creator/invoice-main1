import Dexie, { Table } from 'dexie';
import type { Product, Invoice, DraftInvoice, StockMovement, Customer, Supplier, PurchaseInvoice, ShopProfile, PrintSettings, SupabaseConfig } from '../types';

export class WebRajyaDatabase extends Dexie {
  products!: Table<Product, string>;
  invoices!: Table<Invoice, string>;
  drafts!: Table<DraftInvoice, string>;
  stockMovements!: Table<StockMovement, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  purchaseInvoices!: Table<PurchaseInvoice, string>;
  auditLogs!: Table<any, string>;
  keyValueSettings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('WebRajyaStationeryDB');
    this.version(1).stores({
      products: 'id, barcode, name, category, hsnCode, stockQty, synced, updatedAt',
      invoices: 'id, invoiceNumber, date, customerName, customerMobile, status, idempotencyKey, synced, createdAt',
      drafts: 'id, draftName, updatedAt',
      stockMovements: 'id, productId, createdAt, type',
      customers: 'id, mobile, name, createdAt',
      auditLogs: 'id, action, recordId, createdAt',
      keyValueSettings: 'key'
    });

    this.version(2).stores({
      products: 'id, barcode, name, category, hsnCode, stockQty, synced, updatedAt',
      invoices: 'id, invoiceNumber, date, customerName, customerMobile, status, idempotencyKey, synced, createdAt',
      drafts: 'id, draftName, updatedAt',
      stockMovements: 'id, productId, createdAt, type',
      customers: 'id, mobile, name, createdAt',
      suppliers: 'id, name, mobile, gstin, createdAt',
      purchaseInvoices: 'id, invoiceNumber, supplierName, invoiceDate, status, synced, createdAt',
      auditLogs: 'id, action, recordId, createdAt',
      keyValueSettings: 'key'
    });
  }
}

export const db = new WebRajyaDatabase();

// Default Shop Profile Settings
export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopName: 'CHANDRA TRADING COMPANY',
  tagline: 'Stationery Wholesaler / Trading',
  address: 'New Shukrawari Market, Seoni, Madhya Pradesh - 480661',
  phone: '+91 94251 74721',
  email: 'mjain21@gmail.com',
  gstin: '23ACSPV5903B1ZK',
  state: 'Madhya Pradesh (23)',
  pincode: '480661',
  bankName: 'State Bank of India',
  accountNo: '34567890123',
  ifscCode: 'SBIN0001234',
  upiId: 'mjain21@sbi',
  invoicePrefix: 'CTC-',
  termsAndConditions: '1. Goods once sold will not be taken back without bill.\n2. Warranty as per manufacturer guidelines.\n3. Subject to Seoni jurisdiction.'
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A5',
  printEngine: 'auto',
  autoCutPaper: true,
  openCashDrawer: false,
  showGstBreakdown: true,
  showBankDetails: true,
  showTerms: true,
  autoPrintOnSave: true
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '',
  anonKey: (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '',
  autoSync: false,
  lastSyncAt: null
};
