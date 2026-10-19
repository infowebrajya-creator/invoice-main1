import { create } from 'zustand';
import { Customer } from '../types';
import { db } from '../lib/db';
import { getSupabaseClient } from '../lib/supabase';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;

  loadCustomers: () => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  findOrCreateCustomer: (name: string, mobile?: string, gstin?: string, address?: string) => Promise<Customer | null>;
  recordCustomerPayment: (customerId: string, amount: number, paymentMode: 'cash' | 'upi', notes?: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  loadCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Poka-Yoke: Auto-clean any dummy 'Cash Customer' records with zero credit balance
      await db.customers.filter(c => c.name.toLowerCase() === 'cash customer' && (!c.creditBalance || c.creditBalance === 0)).delete();

      // 2. Load from local IndexedDB Dexie (excluding Cash Customer)
      const localCustomers = await db.customers
        .filter(c => c.name.toLowerCase() !== 'cash customer')
        .toArray();
      
      // Sort: customers with outstanding udhar at the top, then alphabetically
      localCustomers.sort((a, b) => {
        const balDiff = (b.creditBalance || 0) - (a.creditBalance || 0);
        if (balDiff !== 0) return balDiff;
        return a.name.localeCompare(b.name);
      });

      set({ customers: localCustomers });

      // 3. Fetch from Supabase PostgreSQL if client is available
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('customers')
          .select('*')
          .order('credit_balance', { ascending: false });

        if (error) {
          console.warn('[useCustomerStore] Supabase fetch error:', error.message);
        } else if (data && data.length > 0) {
          const mapped: Customer[] = data
            .filter((row: any) => (row.name || '').toLowerCase() !== 'cash customer')
            .map((row: any) => ({
              id: String(row.id),
              name: row.name || 'Unnamed Client',
              mobile: row.mobile || '',
              email: row.email || '',
              address: row.address || '',
              city: row.city || '',
              state: row.state || '',
              pincode: row.pincode || '',
              gstin: row.gstin || '',
              creditBalance: Number(row.credit_balance || 0),
              creditLimit: Number(row.credit_limit || 0),
              notes: row.notes || '',
              isActive: row.is_active !== false,
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString()
            }));

          // Bulk save to local Dexie
          await db.customers.bulkPut(mapped);
          set({ customers: mapped });
        }
      }
    } catch (err: any) {
      console.error('[useCustomerStore] Failed to load customers:', err);
      set({ error: err.message || 'Failed to load customers' });
    } finally {
      set({ isLoading: false });
    }
  },

  addCustomer: async (customerData) => {
    const now = new Date().toISOString();
    const newId = 'cust_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      creditBalance: customerData.creditBalance || 0,
      isActive: customerData.isActive !== false
    };

    // 1. Save to local Dexie
    await db.customers.put(newCustomer);
    set((state) => ({ customers: [...state.customers, newCustomer].sort((a, b) => a.name.localeCompare(b.name)) }));

    // 2. Save to Supabase Cloud
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('customers').insert([{
          id: newCustomer.id,
          name: newCustomer.name,
          mobile: newCustomer.mobile || null,
          email: newCustomer.email || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          state: newCustomer.state || null,
          pincode: newCustomer.pincode || null,
          gstin: newCustomer.gstin || null,
          credit_balance: newCustomer.creditBalance,
          credit_limit: newCustomer.creditLimit || 0,
          notes: newCustomer.notes || null,
          is_active: newCustomer.isActive
        }]);

        if (error) {
          console.warn('[useCustomerStore] Supabase insert warning:', error.message);
        }
      } catch (err) {
        console.warn('[useCustomerStore] Supabase connection error on addCustomer:', err);
      }
    }

    return newCustomer;
  },

  updateCustomer: async (id, updates) => {
    const now = new Date().toISOString();
    const existing = await db.customers.get(id);
    if (!existing) return;

    const updated: Customer = {
      ...existing,
      ...updates,
      updatedAt: now
    };

    await db.customers.put(updated);
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? updated : c))
    }));

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload: any = { updated_at: now };
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.mobile !== undefined) payload.mobile = updates.mobile || null;
        if (updates.address !== undefined) payload.address = updates.address || null;
        if (updates.gstin !== undefined) payload.gstin = updates.gstin || null;
        if (updates.creditBalance !== undefined) payload.credit_balance = updates.creditBalance;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        await client.from('customers').update(payload).eq('id', id);
      } catch (err) {
        console.warn('[useCustomerStore] Supabase update warning:', err);
      }
    }
  },

  deleteCustomer: async (id) => {
    await db.customers.delete(id);
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id)
    }));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('customers').delete().eq('id', id);
      } catch (err) {
        console.warn('[useCustomerStore] Supabase delete warning:', err);
      }
    }
  },

  findOrCreateCustomer: async (name, mobile = '', gstin = '', address = '') => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.toLowerCase() === 'cash customer') {
      return null;
    }

    const { customers, addCustomer } = get();

    // Check if customer exists by mobile (if mobile given) or by exact name
    const cleanMobile = mobile.trim();
    let existing = cleanMobile 
      ? customers.find((c) => c.mobile && c.mobile.trim() === cleanMobile)
      : null;

    if (!existing) {
      existing = customers.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    }

    if (existing) {
      return existing;
    }

    // Auto-create customer
    return await addCustomer({
      name: cleanName,
      mobile: cleanMobile,
      gstin: gstin.trim() || undefined,
      address: address.trim() || undefined,
      creditBalance: 0
    });
  },

  recordCustomerPayment: async (customerId, amount, paymentMode, notes = '') => {
    const existing = await db.customers.get(customerId);
    if (!existing) return;

    const prevBalance = existing.creditBalance || 0;
    const newBalance = Math.max(0, prevBalance - amount);
    await get().updateCustomer(customerId, { creditBalance: newBalance });

    // Record Audit Log Entry for Khata reconciliation
    await db.auditLogs.put({
      id: 'audit_pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action: 'CUSTOMER_PAYMENT_RECEIVED',
      tableName: 'customers',
      recordId: customerId,
      details: {
        customerName: existing.name,
        amountReceived: amount,
        paymentMode,
        previousBalance: prevBalance,
        newBalance,
        notes
      },
      createdAt: new Date().toISOString()
    });
  }
}));
