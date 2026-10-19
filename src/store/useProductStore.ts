import { create } from 'zustand';
import type { Product, StockMovement, UnitType, GstRate, TaxType } from '../types';
import { db } from '../lib/db';
import { getSupabaseClient } from '../lib/supabase';
import type { ValidatedImportRow, ImportMode, ImportSummaryResult } from '../lib/importProcessor';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string;
  statusFilter: 'all' | 'active' | 'inactive';

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void;
  loadProducts: (force?: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  toggleProductActiveStatus: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, quantityChange: number, reason: string) => Promise<void>;
  seedDefaultProducts: () => Promise<number>;
  commitBatchImport: (rowsToCommit: ValidatedImportRow[], mode: ImportMode) => Promise<ImportSummaryResult>;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;
}

export const STATIONERY_CATEGORIES = [
  'All Categories',
  'Pens',
  'Pencils',
  'Erasers & Sharpeners',
  'Notebooks & Registers',
  'Paper & Sheets',
  'Files & Folders',
  'Office Supplies',
  'School Supplies',
  'Art & Craft',
  'Markers & Highlighters',
  'Drawing & Geometry',
  'Adhesives',
  'Calculators',
  'Books & Publications',
  'Bags & Accessories',
  'Files & Office Paper',
  'Printer & Computer Supplies',
  'Gift & Fancy Items',
  'Toys & Games',
  'Bottles & Lunch Boxes',
  'General Merchandise',
  'Uncategorized'
];

export const INITIAL_STATIONERY_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { sku: 'CLM-NB-172', barcode: '8901030678901', name: 'Classmate Long Book Unruled 172 Pgs', category: 'Notebooks & Registers', packInfo: '1 Pcs', unit: 'Pcs', mrp: 75, purchaseRate: 50, saleRate: 70, hsnCode: '4820', gstRate: 12, taxType: 'inclusive', stockQty: 120, minStockLevel: 20, isActive: true },
  { sku: 'CLM-NB-A4-200', barcode: '8901030678902', name: 'Classmate Spiral Notebook A4 200 Pgs', category: 'Notebooks & Registers', packInfo: '1 Pcs', unit: 'Pcs', mrp: 140, purchaseRate: 95, saleRate: 130, hsnCode: '4820', gstRate: 12, taxType: 'inclusive', stockQty: 85, minStockLevel: 15, isActive: true },
  { sku: 'REY-TRM-BLU', barcode: '8901234000012', name: 'Reynolds Trimax Gel Pen Blue', category: 'Pens & Writing', packInfo: '1 Pcs', unit: 'Pcs', mrp: 60, purchaseRate: 42, saleRate: 55, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 200, minStockLevel: 30, isActive: true },
  { sku: 'REY-TRM-BLK', barcode: '8901234000013', name: 'Reynolds Trimax Gel Pen Black', category: 'Pens & Writing', packInfo: '1 Pcs', unit: 'Pcs', mrp: 60, purchaseRate: 42, saleRate: 55, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 150, minStockLevel: 25, isActive: true },
  { sku: 'HAU-XO-5PKT', barcode: '8901234000020', name: 'Hauser XO Ball Pen Blue (Pack of 5)', category: 'Pens & Writing', packInfo: 'Pack of 5', unit: 'Pkt', mrp: 50, purchaseRate: 35, saleRate: 45, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 90, minStockLevel: 10, isActive: true },
  { sku: 'PEN-ENG-07', barcode: '8901234000030', name: 'Pentel EnerGel 0.7mm Liquid Gel Pen', category: 'Pens & Writing', packInfo: '1 Pcs', unit: 'Pcs', mrp: 50, purchaseRate: 34, saleRate: 48, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 60, minStockLevel: 10, isActive: true },
  { sku: 'JK-A4-75GSM', barcode: '8902345000011', name: 'JK Copier A4 Paper 75 GSM (500 Sheets)', category: 'Paper & Pads', packInfo: '1 Ream', unit: 'Ream', mrp: 340, purchaseRate: 255, saleRate: 310, hsnCode: '4802', gstRate: 12, taxType: 'inclusive', stockQty: 45, minStockLevel: 10, isActive: true },
  { sku: 'B2B-A4-80GSM', barcode: '8902345000022', name: 'B2B Copier Paper A4 80 GSM', category: 'Paper & Pads', packInfo: '1 Ream', unit: 'Ream', mrp: 380, purchaseRate: 285, saleRate: 350, hsnCode: '4802', gstRate: 12, taxType: 'inclusive', stockQty: 30, minStockLevel: 8, isActive: true },
  { sku: 'FEV-MR-100G', barcode: '8901084001001', name: 'Fevicol MR Squeezy Bottle 100g', category: 'Adhesives & Tapes', packInfo: '100g Bottle', unit: 'Pcs', mrp: 50, purchaseRate: 36, saleRate: 45, hsnCode: '3506', gstRate: 18, taxType: 'inclusive', stockQty: 110, minStockLevel: 15, isActive: true },
  { sku: 'FEV-STK-15G', barcode: '8901084002002', name: 'Fevistick Glue Stick 15g', category: 'Adhesives & Tapes', packInfo: '15g Stick', unit: 'Pcs', mrp: 30, purchaseRate: 21, saleRate: 28, hsnCode: '3506', gstRate: 18, taxType: 'inclusive', stockQty: 140, minStockLevel: 20, isActive: true },
  { sku: 'FBC-WCP-24', barcode: '8901532001234', name: 'Faber-Castell 24 Tri-Grip Water Color Pencils', category: 'Art & Craft', packInfo: '24 Shades Set', unit: 'Set', mrp: 220, purchaseRate: 150, saleRate: 200, hsnCode: '9609', gstRate: 12, taxType: 'inclusive', stockQty: 40, minStockLevel: 5, isActive: true },
  { sku: 'CAM-ACR-12', barcode: '8901532005678', name: 'Camlin Kokuyo Acrylic Colors 12 Shades', category: 'Art & Craft', packInfo: '12 Tubes Set', unit: 'Set', mrp: 280, purchaseRate: 195, saleRate: 260, hsnCode: '3213', gstRate: 18, taxType: 'inclusive', stockQty: 35, minStockLevel: 5, isActive: true },
  { sku: 'SOL-COB-A4', barcode: '8903456000015', name: 'Solo Cobra Executive File A4', category: 'Files & Folders', packInfo: '1 Pcs', unit: 'Pcs', mrp: 85, purchaseRate: 55, saleRate: 75, hsnCode: '3926', gstRate: 18, taxType: 'inclusive', stockQty: 75, minStockLevel: 10, isActive: true },
  { sku: 'SOL-DSP-20', barcode: '8903456000026', name: 'Solo Display File 20 Pockets A4', category: 'Files & Folders', packInfo: '20 Pockets', unit: 'Pcs', mrp: 150, purchaseRate: 100, saleRate: 135, hsnCode: '3926', gstRate: 18, taxType: 'inclusive', stockQty: 50, minStockLevel: 10, isActive: true },
  { sku: 'CAS-MJ12D', barcode: '4971850123456', name: 'Casio MJ-12D Desktop Calculator 150 Steps', category: 'Calculators & Instruments', packInfo: '1 Box', unit: 'Pcs', mrp: 550, purchaseRate: 410, saleRate: 510, hsnCode: '8470', gstRate: 18, taxType: 'inclusive', stockQty: 25, minStockLevel: 5, isActive: true },
  { sku: 'CAM-MDB-BOX', barcode: '8901532009999', name: 'Camel Mathematical Drawing Instruments Box', category: 'Calculators & Instruments', packInfo: '1 Box', unit: 'Box', mrp: 130, purchaseRate: 88, saleRate: 115, hsnCode: '9017', gstRate: 18, taxType: 'inclusive', stockQty: 60, minStockLevel: 10, isActive: true },
  { sku: 'NAT-621-10PKT', barcode: '8901234567012', name: 'Nataraj 621 Bold Pencils (Pack of 10)', category: 'Pens & Writing', packInfo: 'Pack of 10', unit: 'Pkt', mrp: 60, purchaseRate: 42, saleRate: 55, hsnCode: '9609', gstRate: 12, taxType: 'inclusive', stockQty: 180, minStockLevel: 25, isActive: true },
  { sku: 'APS-PLT-10PKT', barcode: '8901234567023', name: 'Apsara Platinum Extra Dark Pencils (Pack of 10)', category: 'Pens & Writing', packInfo: 'Pack of 10', unit: 'Pkt', mrp: 70, purchaseRate: 49, saleRate: 65, hsnCode: '9609', gstRate: 12, taxType: 'inclusive', stockQty: 160, minStockLevel: 20, isActive: true },
  { sku: 'PST-STK-3X3', barcode: '8904567000010', name: 'Post-it Sticky Notes 3x3 Yellow (100 Sheets)', category: 'Desk Accessories', packInfo: '100 Sheets Pad', unit: 'Pad', mrp: 65, purchaseRate: 44, saleRate: 58, hsnCode: '4820', gstRate: 18, taxType: 'inclusive', stockQty: 95, minStockLevel: 15, isActive: true },
  { sku: 'KNG-STP-10D', barcode: '8906000000011', name: 'Kangaro Stapler HD-10D', category: 'Desk Accessories', packInfo: '1 Pcs', unit: 'Pcs', mrp: 95, purchaseRate: 68, saleRate: 85, hsnCode: '8305', gstRate: 18, taxType: 'inclusive', stockQty: 65, minStockLevel: 10, isActive: true },
  { sku: 'KNG-PIN-10BOX', barcode: '8906000000022', name: 'Kangaro Staple Pins No.10 (Box of 20)', category: 'Desk Accessories', packInfo: 'Box of 20', unit: 'Box', mrp: 120, purchaseRate: 84, saleRate: 105, hsnCode: '8305', gstRate: 18, taxType: 'inclusive', stockQty: 40, minStockLevel: 8, isActive: true },
  { sku: 'WND-CEL-1IN', barcode: '8907000000015', name: 'Wonder Cello Tape 1 inch Clear (Pack of 6)', category: 'Adhesives & Tapes', packInfo: 'Pack of 6', unit: 'Pkt', mrp: 90, purchaseRate: 60, saleRate: 80, hsnCode: '3919', gstRate: 18, taxType: 'inclusive', stockQty: 70, minStockLevel: 12, isActive: true },
  { sku: 'FBC-HLT-4SET', barcode: '8901532004444', name: 'Faber-Castell Textliner 38 Highlighter Set of 4', category: 'Pens & Writing', packInfo: 'Set of 4', unit: 'Set', mrp: 120, purchaseRate: 82, saleRate: 108, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 55, minStockLevel: 10, isActive: true },
  { sku: 'LUX-MRK-BLK', barcode: '8901234888888', name: 'Luxor Permanent Marker Black', category: 'Pens & Writing', packInfo: '1 Pcs', unit: 'Pcs', mrp: 30, purchaseRate: 20, saleRate: 27, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 130, minStockLevel: 20, isActive: true },
  { sku: 'CAM-WBM-BLU', barcode: '8901532777777', name: 'Camlin Whiteboard Marker Blue', category: 'Pens & Writing', packInfo: '1 Pcs', unit: 'Pcs', mrp: 35, purchaseRate: 24, saleRate: 32, hsnCode: '9608', gstRate: 18, taxType: 'inclusive', stockQty: 140, minStockLevel: 20, isActive: true }
];

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: 'All Categories',
  statusFilter: 'all',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),

  loadProducts: async (force = false) => {
    // Avoid redundant network calls if products are already loaded in memory
    if (!force && get().products.length > 0) {
      return;
    }

    // 1. Instant 0ms Load from Local Dexie Cache First
    const localProducts = await db.products.toArray().catch(() => []);
    if (localProducts.length > 0) {
      set({ products: localProducts, isLoading: false, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    // 2. Non-blocking Background Cloud Refresh
    try {
      const client = getSupabaseClient();
      if (client) {
        let allData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await client
            .from('products')
            .select('*')
            .range(from, from + pageSize - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allData = allData.concat(data);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              from += pageSize;
            }
          }
        }

        if (allData.length > 0) {
          const mappedProducts: Product[] = allData.map((item: any) => ({
            id: item.id || item.sku,
            sku: item.sku || '',
            barcode: item.barcode || '',
            name: item.name || item.product_name || '',
            category: item.category || 'General Supplies',
            packInfo: item.pack_info || item.pack || '1*1',
            unit: (item.unit as UnitType) || 'Pcs',
            mrp: Number(item.mrp ?? item.sale_rate ?? 0),
            purchaseRate: Number(item.purchase_rate ?? item.purchase_price ?? 0),
            saleRate: Number(item.sale_rate ?? item.selling_rate ?? 0),
            hsnCode: item.hsn_code || '4820',
            gstRate: (Number(item.gst_rate ?? 12) as GstRate),
            taxType: (item.tax_type as TaxType) || 'inclusive',
            stockQty: Number(item.stock_qty ?? item.stock_quantity ?? 0),
            minStockLevel: Number(item.min_stock_level ?? item.low_stock_threshold ?? 5),
            isActive: item.is_active !== undefined ? Boolean(item.is_active) : true,
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at || new Date().toISOString(),
            synced: true
          }));

          // Non-destructive differential merge: Preserve local unsynced offline products
          const currentLocal = await db.products.toArray().catch(() => []);
          const unsyncedLocal = currentLocal.filter((p) => !p.synced);

          await db.products.bulkPut(mappedProducts);
          if (unsyncedLocal.length > 0) {
            await db.products.bulkPut(unsyncedLocal);
          }
          const allMerged = await db.products.toArray();
          set({ products: allMerged, isLoading: false });
          return;
        }
      }

      if (localProducts.length === 0) {
        const freshLocal = await db.products.toArray().catch(() => []);
        set({ products: freshLocal, isLoading: false });
      }
    } catch (err: any) {
      if (localProducts.length === 0) {
        const freshLocal = await db.products.toArray().catch(() => []);
        set({ products: freshLocal, isLoading: false });
      }
    }
  },

  addProduct: async (prodData) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...prodData,
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await db.products.put(newProduct);
    await get().loadProducts();
    return newProduct;
  },

  updateProduct: async (id, updates) => {
    const existing = await db.products.get(id);
    if (!existing) return;

    const updated: Product = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: false
    };

    await db.products.put(updated);
    await get().loadProducts();
  },

  toggleProductActiveStatus: async (id) => {
    const existing = await db.products.get(id);
    if (!existing) return;

    await db.products.update(id, {
      isActive: !existing.isActive,
      updatedAt: new Date().toISOString(),
      synced: false
    });
    await get().loadProducts();
  },

  deleteProduct: async (id) => {
    await db.products.delete(id);
    await get().loadProducts();
  },

  adjustStock: async (productId, quantityChange, reason) => {
    const product = await db.products.get(productId);
    if (!product) return;

    const previousStock = product.stockQty;
    const newStock = Math.max(0, previousStock + quantityChange);

    const movement: StockMovement = {
      id: 'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId,
      productName: product.name,
      type: 'adjustment',
      quantityChange,
      previousStock,
      newStock,
      reason,
      createdAt: new Date().toISOString()
    };

    await db.transaction('rw', db.products, db.stockMovements, async () => {
      await db.products.update(productId, {
        stockQty: newStock,
        updatedAt: new Date().toISOString(),
        synced: false
      });
      await db.stockMovements.put(movement);
    });

    await get().loadProducts();
  },

  seedDefaultProducts: async () => {
    const now = new Date().toISOString();
    const productsToInsert: Product[] = INITIAL_STATIONERY_PRODUCTS.map((item, index) => ({
      ...item,
      id: `prod_seed_${index + 100}`,
      createdAt: now,
      updatedAt: now,
      synced: false
    }));

    await db.products.bulkPut(productsToInsert);
    await get().loadProducts();
    return productsToInsert.length;
  },

  commitBatchImport: async (rowsToCommit, mode) => {
    const now = new Date().toISOString();
    const existingMap = new Map<string, Product>();
    const currentProducts = await db.products.toArray();
    currentProducts.forEach(p => existingMap.set(p.sku.toLowerCase().trim(), p));

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const productsToSave: Product[] = [];
    const stockMovements: StockMovement[] = [];

    await db.transaction('rw', db.products, db.stockMovements, async () => {
      for (const row of rowsToCommit) {
        if (row.status === 'error') {
          failedCount++;
          continue;
        }

        const parsed = row.parsedProduct;
        const skuKey = (parsed.sku || '').toLowerCase().trim();
        const existing = existingMap.get(skuKey);

        if (existing) {
          if (mode === 'CREATE_ONLY') {
            skippedCount++;
            continue;
          }

          let updatedProd: Product;
          if (mode === 'UPDATE_PRICES_ONLY') {
            updatedProd = {
              ...existing,
              mrp: parsed.mrp !== undefined ? parsed.mrp : existing.mrp,
              purchaseRate: parsed.purchaseRate !== undefined ? parsed.purchaseRate : existing.purchaseRate,
              saleRate: parsed.saleRate !== undefined ? parsed.saleRate : existing.saleRate,
              gstRate: parsed.gstRate !== undefined ? parsed.gstRate : existing.gstRate,
              updatedAt: now,
              synced: false
            };
          } else {
            updatedProd = {
              ...existing,
              name: parsed.name || existing.name,
              barcode: parsed.barcode !== undefined ? parsed.barcode : existing.barcode,
              category: parsed.category || existing.category,
              packInfo: parsed.packInfo || existing.packInfo,
              unit: parsed.unit || existing.unit,
              mrp: parsed.mrp !== undefined ? parsed.mrp : existing.mrp,
              purchaseRate: parsed.purchaseRate !== undefined ? parsed.purchaseRate : existing.purchaseRate,
              saleRate: parsed.saleRate !== undefined ? parsed.saleRate : existing.saleRate,
              hsnCode: parsed.hsnCode !== undefined ? parsed.hsnCode : existing.hsnCode,
              gstRate: parsed.gstRate !== undefined ? parsed.gstRate : existing.gstRate,
              taxType: parsed.taxType || existing.taxType,
              stockQty: parsed.stockQty !== undefined ? parsed.stockQty : existing.stockQty,
              minStockLevel: parsed.minStockLevel !== undefined ? parsed.minStockLevel : existing.minStockLevel,
              isActive: parsed.isActive !== undefined ? parsed.isActive : existing.isActive,
              updatedAt: now,
              synced: false
            };
          }

          productsToSave.push(updatedProd);
          updatedCount++;
        } else {
          if (mode === 'UPDATE_PRICES_ONLY') {
            skippedCount++;
            continue;
          }

          const newProd: Product = {
            id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            sku: parsed.sku || `SKU-${Date.now()}`,
            barcode: parsed.barcode || '',
            name: parsed.name || 'New Product',
            category: parsed.category || 'General Supplies',
            packInfo: parsed.packInfo || '1 Pcs',
            unit: parsed.unit || 'Pcs',
            mrp: parsed.mrp || 0,
            purchaseRate: parsed.purchaseRate || 0,
            saleRate: parsed.saleRate || 0,
            hsnCode: parsed.hsnCode || '',
            gstRate: parsed.gstRate || 12,
            taxType: parsed.taxType || 'inclusive',
            stockQty: parsed.stockQty || 0,
            minStockLevel: parsed.minStockLevel || 10,
            isActive: parsed.isActive !== undefined ? parsed.isActive : true,
            createdAt: now,
            updatedAt: now,
            synced: false
          };

          productsToSave.push(newProd);
          createdCount++;

          if (newProd.stockQty > 0) {
            stockMovements.push({
              id: 'sm_imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              productId: newProd.id,
              productName: newProd.name,
              type: 'purchase',
              quantityChange: newProd.stockQty,
              previousStock: 0,
              newStock: newProd.stockQty,
              reason: 'Bulk Import Initial Stock',
              createdAt: now
            });
          }
        }
      }

      if (productsToSave.length > 0) {
        await db.products.bulkPut(productsToSave);
      }
      if (stockMovements.length > 0) {
        await db.stockMovements.bulkPut(stockMovements);
      }
    });

    await get().loadProducts();

    return {
      totalRows: rowsToCommit.length,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      errors: []
    };
  },

  syncWithSupabase: async () => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase is not configured. Go to Settings to set URL and Key.' };
    }

    try {
      const unSynced = await db.products.filter(p => !p.synced).toArray();
      if (unSynced.length === 0) {
        return { success: true, message: 'All products are already in sync with Supabase.' };
      }

      const payload = unSynced.map(({ synced, packInfo, purchaseRate, saleRate, stockQty, minStockLevel, isActive, createdAt, updatedAt, ...rest }) => ({
        ...rest,
        pack_info: packInfo,
        purchase_price: purchaseRate,
        selling_rate: saleRate,
        stock_quantity: stockQty,
        low_stock_threshold: minStockLevel,
        is_active: isActive,
        created_at: createdAt,
        updated_at: updatedAt
      }));

      const { error } = await client.from('products').upsert(payload, { onConflict: 'id' });

      if (error) {
        return { success: false, message: `Supabase Sync Error: ${error.message}` };
      }

      await db.transaction('rw', db.products, async () => {
        for (const p of unSynced) {
          await db.products.update(p.id, { synced: true });
        }
      });

      await get().loadProducts();
      return { success: true, message: `Successfully synced ${unSynced.length} products to Supabase!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Sync failed.' };
    }
  }
}));
