import { create } from 'zustand';
import type { PurchaseInvoice, PurchaseInvoiceItem, Supplier, Product, StockMovement } from '../types';
import { db } from '../lib/db';
import { useProductStore } from './useProductStore';
import { createSuggestedProduct } from '../lib/catalogMatcher';

interface PurchaseState {
  purchaseInvoices: PurchaseInvoice[];
  suppliers: Supplier[];
  isLoading: boolean;
  geminiApiKey: string;

  // Actions
  loadPurchases: () => Promise<void>;
  loadSuppliers: () => Promise<void>;
  setGeminiApiKey: (key: string) => void;
  inwardPurchaseInvoice: (params: {
    supplier: {
      name: string;
      mobile?: string;
      gstin?: string;
      address?: string;
      invoiceNumber: string;
      invoiceDate: string;
    };
    items: PurchaseInvoiceItem[];
    billImageUrl?: string;
  }) => Promise<{
    success: boolean;
    invoiceId: string;
    updatedCount: number;
    createdCount: number;
    totalStockAdded: number;
  }>;
}

const STORAGE_API_KEY = 'webrajya_gemini_api_key';

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchaseInvoices: [],
  suppliers: [],
  isLoading: false,
  geminiApiKey: typeof localStorage !== 'undefined' ? (localStorage.getItem(STORAGE_API_KEY) || '') : '',

  loadPurchases: async () => {
    try {
      const records = await db.purchaseInvoices.orderBy('createdAt').reverse().toArray();
      set({ purchaseInvoices: records });
    } catch (err) {
      console.error('Failed to load purchase invoices from Dexie:', err);
    }
  },

  loadSuppliers: async () => {
    try {
      const records = await db.suppliers.orderBy('name').toArray();
      set({ suppliers: records });
    } catch (err) {
      console.error('Failed to load suppliers from Dexie:', err);
    }
  },

  setGeminiApiKey: (key: string) => {
    const trimmed = key.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_API_KEY, trimmed);
    }
    set({ geminiApiKey: trimmed });
  },

  inwardPurchaseInvoice: async ({ supplier, items, billImageUrl }) => {
    const now = new Date().toISOString();
    const invoiceId = `pinv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let updatedCount = 0;
    let createdCount = 0;
    let totalStockAdded = 0;

    let subtotal = 0;
    let totalGst = 0;

    // Check duplicate invoice from the same supplier
    const existingInvoices = await db.purchaseInvoices
      .where('invoiceNumber')
      .equals(supplier.invoiceNumber)
      .toArray()
      .catch(() => []);

    const isDuplicate = existingInvoices.some(
      inv => inv.supplierName.trim().toLowerCase() === supplier.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(`Invoice #${supplier.invoiceNumber} from "${supplier.name}" has already been inwarded.`);
    }

    // Atomic Dexie Transaction
    await db.transaction('rw', [db.products, db.stockMovements, db.purchaseInvoices, db.suppliers], async () => {
      const processedItems: PurchaseInvoiceItem[] = [];

      for (const item of items) {
        const totalQty = Number(item.qty || 0) + Number(item.freeQty || 0);
        totalStockAdded += totalQty;

        const lineSubtotal = Number(item.qty || 0) * Number(item.purchaseRate || 0);
        const lineGst = lineSubtotal * (Number(item.gstRate || 0) / 100);
        subtotal += lineSubtotal;
        totalGst += lineGst;

        let targetProductId = item.productId;

        if (item.isNewProduct || !targetProductId) {
          // Create new product
          const suggested = createSuggestedProduct(item.rawName, {
            purchaseRate: item.purchaseRate,
            mrp: item.mrp,
            gstRate: item.gstRate,
            hsnCode: item.hsnCode,
            unit: item.unit
          });

          const newProduct: Product = {
            ...suggested,
            id: `prod_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: item.matchedProductName || item.rawName,
            stockQty: totalQty,
            purchaseRate: item.purchaseRate,
            mrp: item.mrp || suggested.mrp,
            saleRate: item.saleRate || suggested.saleRate,
            createdAt: now,
            updatedAt: now,
            synced: false
          };

          await db.products.put(newProduct);
          targetProductId = newProduct.id;
          createdCount++;

          // Movement log
          const movement: StockMovement = {
            id: `sm_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: targetProductId,
            productName: newProduct.name,
            type: 'purchase',
            quantityChange: totalQty,
            previousStock: 0,
            newStock: totalQty,
            reason: `Purchase Inward: Bill #${supplier.invoiceNumber} from ${supplier.name}${item.freeQty ? ` (${item.qty} + ${item.freeQty} Free)` : ''}`,
            createdAt: now
          };
          await db.stockMovements.put(movement);
        } else {
          // Increment stock on existing product
          const existing = await db.products.get(targetProductId);
          if (existing) {
            const previousStock = existing.stockQty;
            const newStock = previousStock + totalQty;

            const updatedProduct: Product = {
              ...existing,
              stockQty: newStock,
              purchaseRate: item.purchaseRate,
              mrp: item.mrp > 0 ? item.mrp : existing.mrp,
              saleRate: item.saleRate && item.saleRate > 0 ? item.saleRate : existing.saleRate,
              updatedAt: now,
              synced: false
            };

            await db.products.put(updatedProduct);
            updatedCount++;

            // Movement log
            const movement: StockMovement = {
              id: `sm_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              productId: targetProductId,
              productName: existing.name,
              type: 'purchase',
              quantityChange: totalQty,
              previousStock,
              newStock,
              reason: `Purchase Inward: Bill #${supplier.invoiceNumber} from ${supplier.name}${item.freeQty ? ` (${item.qty} + ${item.freeQty} Free)` : ''}`,
              createdAt: now
            };
            await db.stockMovements.put(movement);
          }
        }

        processedItems.push({
          ...item,
          productId: targetProductId,
          purchaseInvoiceId: invoiceId,
          totalAmount: Math.round((lineSubtotal + lineGst) * 100) / 100
        });
      }

      const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;

      // Save Purchase Invoice
      const purchaseInvoice: PurchaseInvoice = {
        id: invoiceId,
        supplierName: supplier.name,
        supplierGstin: supplier.gstin,
        invoiceNumber: supplier.invoiceNumber,
        invoiceDate: supplier.invoiceDate,
        totalItems: processedItems.length,
        subtotal: Math.round(subtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal,
        billImageUrl,
        status: 'completed',
        items: processedItems,
        createdAt: now,
        synced: false
      };
      await db.purchaseInvoices.put(purchaseInvoice);

      // Upsert Supplier
      const existingSuppliers = await db.suppliers.where('name').equals(supplier.name).toArray().catch(() => []);
      if (existingSuppliers.length > 0) {
        const s = existingSuppliers[0];
        await db.suppliers.update(s.id, {
          mobile: supplier.mobile || s.mobile,
          gstin: supplier.gstin || s.gstin,
          address: supplier.address || s.address,
          balancePayable: (s.balancePayable || 0) + grandTotal
        });
      } else {
        const newSupplier: Supplier = {
          id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: supplier.name,
          mobile: supplier.mobile,
          gstin: supplier.gstin,
          address: supplier.address,
          balancePayable: grandTotal,
          createdAt: now
        };
        await db.suppliers.put(newSupplier);
      }
    });

    // Refresh products catalog in memory immediately (0ms delay)
    await useProductStore.getState().loadProducts(true);
    await get().loadPurchases();
    await get().loadSuppliers();

    return {
      success: true,
      invoiceId,
      updatedCount,
      createdCount,
      totalStockAdded
    };
  }
}));
