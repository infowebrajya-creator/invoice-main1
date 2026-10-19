import { create } from 'zustand';
import { ShopProfile, PrintSettings, SupabaseConfig } from '../types';
import { db, DEFAULT_SHOP_PROFILE, DEFAULT_PRINT_SETTINGS, DEFAULT_SUPABASE_CONFIG } from '../lib/db';
import { resetSupabaseClient, testSupabaseConnection } from '../lib/supabase';

interface SettingsState {
  shopProfile: ShopProfile;
  printSettings: PrintSettings;
  supabaseConfig: SupabaseConfig;
  isLoading: boolean;
  isTestingConnection: boolean;
  connectionStatus: { success: boolean; message: string } | null;

  loadSettings: () => Promise<void>;
  saveShopProfile: (profile: ShopProfile) => Promise<void>;
  savePrintSettings: (settings: PrintSettings) => Promise<void>;
  saveSupabaseConfig: (config: SupabaseConfig) => Promise<void>;
  testConnection: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  resetToDefaults: () => Promise<void>;
  exportBackupJSON: () => Promise<string>;
  importBackupJSON: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  clearAllDemoData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shopProfile: DEFAULT_SHOP_PROFILE,
  printSettings: DEFAULT_PRINT_SETTINGS,
  supabaseConfig: DEFAULT_SUPABASE_CONFIG,
  isLoading: false,
  isTestingConnection: false,
  connectionStatus: null,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const shopRec = await db.keyValueSettings.get('shopProfile');
      const printRec = await db.keyValueSettings.get('printSettings');
      const supaRec = await db.keyValueSettings.get('supabaseConfig');

      let currentShop = shopRec ? shopRec.value : DEFAULT_SHOP_PROFILE;
      if (!shopRec || currentShop.shopName === 'WebRajya Stationery & Books' || currentShop.shopName === 'KARE STATIONARY KATANGI') {
        currentShop = DEFAULT_SHOP_PROFILE;
        await db.keyValueSettings.put({ key: 'shopProfile', value: DEFAULT_SHOP_PROFILE });
      }

      set({
        shopProfile: currentShop,
        printSettings: printRec ? { ...DEFAULT_PRINT_SETTINGS, ...printRec.value } : DEFAULT_PRINT_SETTINGS,
        supabaseConfig: supaRec ? supaRec.value : DEFAULT_SUPABASE_CONFIG,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  saveShopProfile: async (shopProfile) => {
    await db.keyValueSettings.put({ key: 'shopProfile', value: shopProfile });
    set({ shopProfile });
  },

  savePrintSettings: async (printSettings) => {
    await db.keyValueSettings.put({ key: 'printSettings', value: printSettings });
    set({ printSettings });
  },

  saveSupabaseConfig: async (supabaseConfig) => {
    await db.keyValueSettings.put({ key: 'supabaseConfig', value: supabaseConfig });
    resetSupabaseClient();
    set({ supabaseConfig });
  },

  testConnection: async (url, key) => {
    set({ isTestingConnection: true, connectionStatus: null });
    const result = await testSupabaseConnection(url, key);
    set({ isTestingConnection: false, connectionStatus: result });
    return result;
  },

  resetToDefaults: async () => {
    await db.keyValueSettings.put({ key: 'shopProfile', value: DEFAULT_SHOP_PROFILE });
    await db.keyValueSettings.put({ key: 'printSettings', value: DEFAULT_PRINT_SETTINGS });
    await db.keyValueSettings.put({ key: 'supabaseConfig', value: DEFAULT_SUPABASE_CONFIG });
    set({
      shopProfile: DEFAULT_SHOP_PROFILE,
      printSettings: DEFAULT_PRINT_SETTINGS,
      supabaseConfig: DEFAULT_SUPABASE_CONFIG
    });
  },

  exportBackupJSON: async () => {
    const products = await db.products.toArray();
    const invoices = await db.invoices.toArray();
    const stockMovements = await db.stockMovements.toArray();
    const settings = await db.keyValueSettings.toArray();

    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products,
      invoices,
      stockMovements,
      settings
    };

    return JSON.stringify(data, null, 2);
  },

  importBackupJSON: async (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.products || !Array.isArray(data.products)) {
        return { success: false, message: 'Invalid backup file format.' };
      }

      await db.transaction('rw', db.products, db.invoices, db.stockMovements, db.keyValueSettings, async () => {
        if (data.products) await db.products.bulkPut(data.products);
        if (data.invoices) await db.invoices.bulkPut(data.invoices);
        if (data.stockMovements) await db.stockMovements.bulkPut(data.stockMovements);
        if (data.settings) await db.keyValueSettings.bulkPut(data.settings);
      });

      await get().loadSettings();
      return { success: true, message: `Imported backup successfully! (${data.products.length} products loaded).` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to import backup.' };
    }
  },

  clearAllDemoData: async () => {
    await db.transaction('rw', [db.products, db.invoices, db.drafts, db.stockMovements, db.customers, db.auditLogs], async () => {
      await db.products.clear();
      await db.invoices.clear();
      await db.drafts.clear();
      await db.stockMovements.clear();
      await db.customers.clear();
      await db.auditLogs.clear();
    });
  }
}));
