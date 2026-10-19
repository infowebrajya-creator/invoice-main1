import { create } from 'zustand';
import type { InvoiceItem, Product, PaymentMode, InvoiceType, DraftInvoice, Invoice } from '../types';
import { calculateItemTaxes } from '../lib/taxCalculator';
import { db } from '../lib/db';

interface BillingState {
  customerName: string;
  customerMobile: string;
  customerGstin: string;
  customerAddress: string;
  invoiceType: InvoiceType;
  items: InvoiceItem[];
  paymentMode: PaymentMode;
  paidAmount: number;
  billDiscountAmount: number;
  billDiscountPct: number;
  freightAmount: number;
  isInterstate: boolean;
  notes: string;
  idempotencyKey: string;

  // Actions
  setCustomerInfo: (name: string, mobile: string, gstin?: string, address?: string) => void;
  setInvoiceType: (type: InvoiceType) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setPaidAmount: (amount: number) => void;
  setBillDiscountAmount: (amount: number) => void;
  setBillDiscountPct: (pct: number) => void;
  setFreightAmount: (amount: number) => void;
  setIsInterstate: (isInterstate: boolean) => void;
  setNotes: (notes: string) => void;

  addItemByProduct: (product: Product, qty?: number, schemeDiscPct?: number, addlDiscPct?: number, freeQty?: number, remark?: string) => void;
  addCustomItem: (custom: { name: string; rate: number; qty?: number; unit?: any; hsnCode?: string; gstRate?: any }) => void;
  updateItemRemark: (itemId: string, remark: string) => void;
  updateItemQty: (itemId: string, qty: number) => void;
  updateItemFreeQty: (itemId: string, freeQty: number) => void;
  updateItemRate: (itemId: string, saleRate: number) => void;
  updateItemSchemeDiscount: (itemId: string, schemeDiscPct: number) => void;
  updateItemAddlDiscount: (itemId: string, addlDiscPct: number) => void;
  removeItem: (itemId: string) => void;
  clearBill: () => void;

  // Quotation / Historical Invoice Conversion
  loadInvoiceIntoActiveBill: (inv: Invoice) => void;

  // Draft & Auto-Save Recovery
  drafts: DraftInvoice[];
  loadDrafts: () => Promise<void>;
  saveCurrentAsDraft: (draftName?: string) => Promise<string>;
  loadDraftIntoActiveBill: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  persistActiveCartToIndexedDB: (immediate?: boolean) => Promise<void>;
  restoreActiveCartFromIndexedDB: () => Promise<void>;
}

const generateIdemKey = () => 'idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
let persistCartTimer: any = null;

export const useBillingStore = create<BillingState>((set, get) => ({
  customerName: '',
  customerMobile: '',
  customerGstin: '',
  customerAddress: '',
  invoiceType: 'gst',
  items: [],
  paymentMode: 'cash',
  paidAmount: 0,
  billDiscountAmount: 0,
  billDiscountPct: 0,
  freightAmount: 0,
  isInterstate: false,
  notes: '',
  idempotencyKey: generateIdemKey(),
  drafts: [],

  setCustomerInfo: (customerName, customerMobile, customerGstin = '', customerAddress = '') => {
    set({ customerName, customerMobile, customerGstin, customerAddress });
    get().persistActiveCartToIndexedDB();
  },

  setInvoiceType: (invoiceType) => {
    set({ invoiceType });
    get().persistActiveCartToIndexedDB();
  },

  setPaymentMode: (paymentMode) => {
    set({ paymentMode });
    get().persistActiveCartToIndexedDB();
  },

  setPaidAmount: (paidAmount) => {
    set({ paidAmount });
    get().persistActiveCartToIndexedDB();
  },

  setBillDiscountAmount: (billDiscountAmount) => {
    set({ billDiscountAmount });
    get().persistActiveCartToIndexedDB();
  },

  setBillDiscountPct: (billDiscountPct) => {
    set({ billDiscountPct });
    get().persistActiveCartToIndexedDB();
  },

  setFreightAmount: (freightAmount) => {
    set({ freightAmount });
    get().persistActiveCartToIndexedDB();
  },

  setIsInterstate: (isInterstate) => {
    const { items } = get();
    const updatedItems = items.map(item => {
      const taxes = calculateItemTaxes(
        item.qty,
        item.unitRate,
        item.schemeDiscountPct,
        item.addlDiscountPct,
        item.gstRate,
        item.taxType,
        isInterstate
      );
      return { ...item, ...taxes };
    });
    set({ isInterstate, items: updatedItems });
    get().persistActiveCartToIndexedDB();
  },

  setNotes: (notes) => {
    set({ notes });
    get().persistActiveCartToIndexedDB();
  },

  addItemByProduct: (product, qty = 1, schemeDiscPct = 0, addlDiscPct = 0, freeQty = 0, remark = '') => {
    const { items, isInterstate } = get();
    const existingIndex = items.findIndex(i => i.productId === product.id);

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      const newQty = existing.qty + qty;
      const taxes = calculateItemTaxes(
        newQty, 
        existing.unitRate, 
        existing.schemeDiscountPct, 
        existing.addlDiscountPct, 
        product.gstRate, 
        product.taxType, 
        isInterstate
      );
      
      const updated = [...items];
      updated[existingIndex] = {
        ...existing,
        qty: newQty,
        freeQty: existing.freeQty + freeQty,
        remark: remark ? (existing.remark ? `${existing.remark}, ${remark}` : remark) : existing.remark,
        availableStock: product.stockQty,
        ...taxes
      };
      set({ items: updated });
    } else {
      const taxes = calculateItemTaxes(
        qty, 
        product.saleRate, 
        schemeDiscPct, 
        addlDiscPct, 
        product.gstRate, 
        product.taxType, 
        isInterstate
      );

      const newItem: InvoiceItem = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        hsnCode: product.hsnCode || '',
        pack: product.packInfo || '1 Pcs',
        remark: remark || '',
        unit: product.unit,
        qty,
        freeQty,
        mrp: product.mrp,
        unitRate: product.saleRate,
        schemeDiscountPct: schemeDiscPct,
        addlDiscountPct: addlDiscPct,
        discountPct: schemeDiscPct + addlDiscPct,
        gstRate: product.gstRate,
        taxType: product.taxType,
        availableStock: product.stockQty,
        ...taxes
      };
      set({ items: [...items, newItem] });
    }
    get().persistActiveCartToIndexedDB();
  },

  addCustomItem: ({ name, rate, qty = 1, unit = 'Pcs', hsnCode = '9983', gstRate = 12 }) => {
    const { items, isInterstate, invoiceType } = get();
    const effectiveGst = invoiceType === 'gst' ? (gstRate ?? 12) : 0;
    const taxes = calculateItemTaxes(qty, rate, 0, 0, effectiveGst, 'inclusive', isInterstate);

    const newItem: InvoiceItem = {
      id: 'custom_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: 'custom_' + Date.now(),
      productName: name.trim() || 'Custom Item',
      sku: 'MISC',
      barcode: '',
      hsnCode: hsnCode || '9983',
      pack: '1 Pcs',
      remark: 'Quick Add Item',
      unit: unit || 'Pcs',
      qty,
      freeQty: 0,
      mrp: rate,
      unitRate: rate,
      schemeDiscountPct: 0,
      addlDiscountPct: 0,
      discountPct: 0,
      gstRate: effectiveGst,
      taxType: 'inclusive',
      availableStock: 9999,
      ...taxes
    };

    set({ items: [...items, newItem] });
    get().persistActiveCartToIndexedDB();
  },

  updateItemRemark: (itemId, remark) => {
    const { items } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, remark };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  updateItemQty: (itemId, qty) => {
    if (qty <= 0) {
      get().removeItem(itemId);
      return;
    }
    const { items, isInterstate } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const taxes = calculateItemTaxes(qty, item.unitRate, item.schemeDiscountPct, item.addlDiscountPct, item.gstRate, item.taxType, isInterstate);
        return { ...item, qty, ...taxes };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  updateItemFreeQty: (itemId, freeQty) => {
    const { items } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, freeQty: Math.max(0, freeQty) };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  updateItemRate: (itemId, saleRate) => {
    const { items, isInterstate } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const taxes = calculateItemTaxes(item.qty, saleRate, item.schemeDiscountPct, item.addlDiscountPct, item.gstRate, item.taxType, isInterstate);
        return { ...item, unitRate: saleRate, ...taxes };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  updateItemSchemeDiscount: (itemId, schemeDiscountPct) => {
    const { items, isInterstate } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const taxes = calculateItemTaxes(item.qty, item.unitRate, schemeDiscountPct, item.addlDiscountPct, item.gstRate, item.taxType, isInterstate);
        return { ...item, schemeDiscountPct, ...taxes };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  updateItemAddlDiscount: (itemId, addlDiscountPct) => {
    const { items, isInterstate } = get();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const taxes = calculateItemTaxes(item.qty, item.unitRate, item.schemeDiscountPct, addlDiscountPct, item.gstRate, item.taxType, isInterstate);
        return { ...item, addlDiscountPct, ...taxes };
      }
      return item;
    });
    set({ items: updated });
    get().persistActiveCartToIndexedDB();
  },

  removeItem: (itemId) => {
    const { items } = get();
    set({ items: items.filter(i => i.id !== itemId) });
    get().persistActiveCartToIndexedDB();
  },

  clearBill: () => {
    set({
      customerName: '',
      customerMobile: '',
      customerGstin: '',
      customerAddress: '',
      invoiceType: 'gst',
      items: [],
      paymentMode: 'cash',
      paidAmount: 0,
      billDiscountAmount: 0,
      billDiscountPct: 0,
      freightAmount: 0,
      isInterstate: false,
      notes: '',
      idempotencyKey: generateIdemKey()
    });
    db.keyValueSettings.delete('activeBillingCart').catch(() => {});
  },

  loadInvoiceIntoActiveBill: (inv: Invoice) => {
    set({
      customerName: inv.customerName || '',
      customerMobile: inv.customerMobile || '',
      customerGstin: inv.customerGstin || '',
      customerAddress: inv.customerAddress || '',
      invoiceType: 'gst',
      items: inv.items ? JSON.parse(JSON.stringify(inv.items)) : [],
      paymentMode: inv.paymentMode || 'cash',
      paidAmount: 0,
      billDiscountAmount: inv.totalDiscount || 0,
      billDiscountPct: 0,
      freightAmount: inv.freightAmount || 0,
      isInterstate: inv.isInterstate || false,
      notes: inv.notes ? `Quotation #${inv.invoiceNumber} converted: ${inv.notes}` : `Converted from Quotation #${inv.invoiceNumber}`,
      idempotencyKey: generateIdemKey()
    });
    get().persistActiveCartToIndexedDB(true);
  },

  loadDrafts: async () => {
    const drafts = await db.drafts.orderBy('updatedAt').reverse().toArray();
    set({ drafts });
  },

  saveCurrentAsDraft: async (draftName) => {
    const state = get();
    if (state.items.length === 0) {
      throw new Error('Cannot save empty bill as draft');
    }

    const draftId = 'draft_' + Date.now();
    const name = draftName || (state.customerName ? `Draft for ${state.customerName}` : `Draft ${new Date().toLocaleTimeString('en-IN')}`);
    
    const draft: DraftInvoice = {
      id: draftId,
      draftName: name,
      customerName: state.customerName,
      customerMobile: state.customerMobile,
      customerGstin: state.customerGstin,
      invoiceType: state.invoiceType,
      items: state.items,
      paymentMode: state.paymentMode,
      isInterstate: state.isInterstate,
      notes: state.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.drafts.put(draft);
    await get().loadDrafts();
    get().clearBill();
    return draftId;
  },

  loadDraftIntoActiveBill: async (draftId) => {
    const draft = await db.drafts.get(draftId);
    if (!draft) return;

    set({
      customerName: draft.customerName || '',
      customerMobile: draft.customerMobile || '',
      customerGstin: draft.customerGstin || '',
      invoiceType: draft.invoiceType || 'gst',
      items: draft.items || [],
      paymentMode: draft.paymentMode || 'cash',
      isInterstate: draft.isInterstate || false,
      notes: draft.notes || '',
      idempotencyKey: generateIdemKey()
    });

    await db.drafts.delete(draftId);
    await get().loadDrafts();
    get().persistActiveCartToIndexedDB();
  },

  deleteDraft: async (draftId) => {
    await db.drafts.delete(draftId);
    await get().loadDrafts();
  },

  persistActiveCartToIndexedDB: async (immediate = false) => {
    if (persistCartTimer) {
      clearTimeout(persistCartTimer);
      persistCartTimer = null;
    }

    const doPersist = async () => {
      const state = get();
      if (state.items.length === 0) {
        await db.keyValueSettings.delete('activeBillingCart').catch(() => {});
        return;
      }
      const cartData = {
        customerName: state.customerName,
        customerMobile: state.customerMobile,
        customerGstin: state.customerGstin,
        customerAddress: state.customerAddress,
        invoiceType: state.invoiceType,
        items: state.items,
        paymentMode: state.paymentMode,
        paidAmount: state.paidAmount,
        billDiscountAmount: state.billDiscountAmount,
        billDiscountPct: state.billDiscountPct,
        freightAmount: state.freightAmount,
        isInterstate: state.isInterstate,
        notes: state.notes,
        idempotencyKey: state.idempotencyKey,
        savedAt: new Date().toISOString()
      };
      await db.keyValueSettings.put({ key: 'activeBillingCart', value: cartData }).catch(() => {});
    };

    if (immediate) {
      await doPersist();
    } else {
      persistCartTimer = setTimeout(doPersist, 200);
    }
  },

  restoreActiveCartFromIndexedDB: async () => {
    try {
      const rec = await db.keyValueSettings.get('activeBillingCart');
      if (rec && rec.value && rec.value.items && rec.value.items.length > 0) {
        const val = rec.value;
        set({
          customerName: val.customerName || '',
          customerMobile: val.customerMobile || '',
          customerGstin: val.customerGstin || '',
          customerAddress: val.customerAddress || '',
          invoiceType: val.invoiceType || 'gst',
          items: val.items || [],
          paymentMode: val.paymentMode || 'cash',
          paidAmount: val.paidAmount || 0,
          billDiscountAmount: val.billDiscountAmount || 0,
          billDiscountPct: val.billDiscountPct || 0,
          freightAmount: val.freightAmount || 0,
          isInterstate: val.isInterstate || false,
          notes: val.notes || '',
          idempotencyKey: val.idempotencyKey || generateIdemKey()
        });
      }
    } catch (e) {
      console.warn('Failed to restore active cart from IndexedDB:', e);
    }
  }
}));
