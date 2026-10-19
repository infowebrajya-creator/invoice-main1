import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, Calculator, Plus, Trash2, Printer, 
  Send, CheckCircle2, AlertTriangle, Clock, ArrowDownRight, 
  ArrowUpRight, ShieldCheck, Lock, Unlock, X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Invoice, ShopProfile, PettyExpense, DenominationCount } from '../../types';
import { db } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';

interface DailyCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopProfile: ShopProfile;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Tea & Refreshments',
  'Transport & Loading',
  'Packing Material',
  'Cleaning & Maintenance',
  'Courier & Post',
  'Bank Deposit',
  'Other'
] as const;

export const DailyCashRegisterModal: React.FC<DailyCashRegisterModalProps> = ({
  isOpen,
  onClose,
  shopProfile,
  onToast
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Storage Keys
  const openingKey = `webrajya_opening_cash_${todayStr}`;
  const expensesKey = `webrajya_petty_expenses_${todayStr}`;
  const denomsKey = `webrajya_denominations_${todayStr}`;
  const closedKey = `webrajya_register_closed_${todayStr}`;

  const [openingCash, setOpeningCash] = useState<number>(() => {
    if (typeof window === 'undefined') return 2000;
    const saved = localStorage.getItem(openingKey);
    return saved ? parseFloat(saved) : 2000;
  });

  const [expenses, setExpenses] = useState<PettyExpense[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(expensesKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [denominations, setDenominations] = useState<DenominationCount>(() => {
    if (typeof window === 'undefined') return { c500: 0, c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, coins: 0 };
    try {
      const saved = localStorage.getItem(denomsKey);
      return saved ? JSON.parse(saved) : { c500: 0, c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, coins: 0 };
    } catch {
      return { c500: 0, c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, coins: 0 };
    }
  });

  const [isClosed, setIsClosed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(closedKey) === 'true';
  });

  // Today's Sales State (queried from Dexie)
  const [todayInvoices, setTodayInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'denominations'>('overview');

  // New Expense form
  const [newExpCategory, setNewExpCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('Tea & Refreshments');
  const [newExpAmount, setNewExpAmount] = useState<number>(50);
  const [newExpDesc, setNewExpDesc] = useState('');

  // Load today's invoices from Dexie DB
  useEffect(() => {
    if (isOpen) {
      db.invoices.where('date').equals(todayStr).toArray().then(invs => {
        setTodayInvoices(invs.filter(i => i.status === 'completed'));
      });
    }
  }, [isOpen, todayStr]);

  // Save states to localStorage
  const handleUpdateOpeningCash = (val: number) => {
    const valid = Math.max(0, val || 0);
    setOpeningCash(valid);
    localStorage.setItem(openingKey, valid.toString());
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpAmount <= 0) {
      onToast('error', 'Invalid Amount', 'Petty cash expense must be greater than zero.');
      return;
    }

    const exp: PettyExpense = {
      id: 'exp_' + Date.now(),
      category: newExpCategory,
      amount: newExpAmount,
      description: newExpDesc.trim() || newExpCategory,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    const updated = [exp, ...expenses];
    setExpenses(updated);
    localStorage.setItem(expensesKey, JSON.stringify(updated));
    setNewExpAmount(50);
    setNewExpDesc('');
    onToast('success', 'Expense Recorded', `₹${exp.amount} recorded under ${exp.category}.`);
  };

  const handleRemoveExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(expensesKey, JSON.stringify(updated));
  };

  const handleUpdateDenom = (field: keyof DenominationCount, val: number) => {
    const updated = { ...denominations, [field]: Math.max(0, val || 0) };
    setDenominations(updated);
    localStorage.setItem(denomsKey, JSON.stringify(updated));
  };

  // Calculations
  const cashSalesTotal = useMemo(() => {
    return todayInvoices
      .filter(i => i.paymentMode === 'cash')
      .reduce((sum, i) => sum + i.netPayable, 0);
  }, [todayInvoices]);

  const upiSalesTotal = useMemo(() => {
    return todayInvoices
      .filter(i => i.paymentMode === 'upi')
      .reduce((sum, i) => sum + i.netPayable, 0);
  }, [todayInvoices]);

  const otherSalesTotal = useMemo(() => {
    return todayInvoices
      .filter(i => i.paymentMode !== 'cash' && i.paymentMode !== 'upi')
      .reduce((sum, i) => sum + i.netPayable, 0);
  }, [todayInvoices]);

  const totalRevenue = cashSalesTotal + upiSalesTotal + otherSalesTotal;

  const totalPettyExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const expectedDrawerCash = openingCash + cashSalesTotal - totalPettyExpenses;

  const countedCash = useMemo(() => {
    return (
      (denominations.c500 * 500) +
      (denominations.c200 * 200) +
      (denominations.c100 * 100) +
      (denominations.c50 * 50) +
      (denominations.c20 * 20) +
      (denominations.c10 * 10) +
      (denominations.coins)
    );
  }, [denominations]);

  const discrepancy = countedCash - expectedDrawerCash;

  const handleToggleClose = () => {
    const next = !isClosed;
    setIsClosed(next);
    localStorage.setItem(closedKey, next ? 'true' : 'false');
    onToast('info', next ? 'Register Closed' : 'Register Reopened', next ? 'Daily cash register has been finalized.' : 'Register is open for edits.');
  };

  // WhatsApp Day Closing Report
  const handleShareWhatsApp = () => {
    const message = [
      `📊 *DAILY CASH REGISTER & CLOSURE REPORT*`,
      `*Store:* ${shopProfile.shopName.toUpperCase()}`,
      `*Date:* ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`,
      `--------------------------------`,
      `*REVENUE SUMMARY:*`,
      `• Total Bills: ${todayInvoices.length}`,
      `• Cash Sales: ₹${cashSalesTotal.toLocaleString('en-IN')}`,
      `• UPI / Online: ₹${upiSalesTotal.toLocaleString('en-IN')}`,
      `• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`,
      `--------------------------------`,
      `*CASH DRAWER RECONCILIATION:*`,
      `• Opening Cash: ₹${openingCash.toLocaleString('en-IN')}`,
      `• Cash Added (Sales): +₹${cashSalesTotal.toLocaleString('en-IN')}`,
      `• Petty Expenses (${expenses.length}): -₹${totalPettyExpenses.toLocaleString('en-IN')}`,
      `• Expected Cash: *₹${expectedDrawerCash.toLocaleString('en-IN')}*`,
      `• Counted Cash: *₹${countedCash.toLocaleString('en-IN')}*`,
      `• Discrepancy: ${discrepancy === 0 ? '✅ MATCH (₹0.00)' : discrepancy > 0 ? `+₹${discrepancy.toFixed(2)} Surplus` : `-₹${Math.abs(discrepancy).toFixed(2)} Shortage`}`,
      `--------------------------------`,
      `*Status:* ${isClosed ? '🔒 Register Closed & Reconciled' : '🟢 Active Shift'}`,
      `Generated via WebRajya Invoice POS`
    ].join('\n');

    const cleanPhone = (shopProfile.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone.length === 10
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  // Print Day Closing Slip (Thermal / Paper)
  const handlePrintSlip = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Cash Closure - ${todayStr}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: monospace, sans-serif; font-size: 11px; width: 72mm; margin: 0 auto; padding: 6mm 2mm; color: #000; }
          .c { text-align: center; }
          .b { font-weight: bold; }
          .d { border-top: 1px dashed #000; margin: 4px 0; }
          .r { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="c b" style="font-size: 14px;">${shopProfile.shopName}</div>
        <div class="c">DAILY CASH REGISTER CLOSURE</div>
        <div class="c">${new Date().toLocaleString('en-IN')}</div>
        <div class="d"></div>
        <div class="r"><span>Bills Created:</span><span>${todayInvoices.length}</span></div>
        <div class="r"><span>Cash Sales:</span><span>₹${cashSalesTotal.toFixed(2)}</span></div>
        <div class="r"><span>UPI / Card Sales:</span><span>₹${upiSalesTotal.toFixed(2)}</span></div>
        <div class="r b" style="font-size: 12px; border-top: 1px solid #000; padding-top: 2px;"><span>TOTAL SALES:</span><span>₹${totalRevenue.toFixed(2)}</span></div>
        <div class="d"></div>
        <div class="b">CASH DRAWER RECONCILIATION</div>
        <div class="r"><span>Opening Cash:</span><span>₹${openingCash.toFixed(2)}</span></div>
        <div class="r"><span>+ Cash Sales:</span><span>₹${cashSalesTotal.toFixed(2)}</span></div>
        <div class="r"><span>- Petty Expenses:</span><span>₹${totalPettyExpenses.toFixed(2)}</span></div>
        <div class="r b" style="border-top: 1px solid #000; padding-top: 2px;"><span>Expected Drawer:</span><span>₹${expectedDrawerCash.toFixed(2)}</span></div>
        <div class="r b" style="font-size: 12px;"><span>Counted Drawer:</span><span>₹${countedCash.toFixed(2)}</span></div>
        <div class="r"><span>Discrepancy:</span><span>${discrepancy === 0 ? 'MATCH (₹0.00)' : (discrepancy > 0 ? '+₹' + discrepancy.toFixed(2) : '-₹' + Math.abs(discrepancy).toFixed(2))}</span></div>
        <div class="d"></div>
        <div class="c b" style="margin-top: 8px;">VERIFIED & CLOSED</div>
        <div class="c" style="margin-top: 20px;">Manager Signature</div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };</script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Cash Register & Day-End Cash Closure"
      subtitle={`Shift management, petty cash expense ledger & drawer reconciliation for ${todayStr}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Shift Status & Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Opening Cash</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-[#64748B]">₹</span>
              <input
                type="number"
                disabled={isClosed}
                value={openingCash}
                onChange={e => handleUpdateOpeningCash(parseFloat(e.target.value))}
                className="w-full text-base font-black text-[#172B4D] font-mono bg-transparent border-b border-dashed border-[#2563EB] focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-[#64748B]">Morning Float</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Cash Collected</span>
            <div className="text-lg font-black text-[#15803D] font-mono mt-1">
              {formatCurrency(cashSalesTotal)}
            </div>
            <span className="text-[10px] text-emerald-700">From {todayInvoices.filter(i => i.paymentMode === 'cash').length} Cash Bills</span>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">UPI / Online</span>
            <div className="text-lg font-black text-[#2563EB] font-mono mt-1">
              {formatCurrency(upiSalesTotal)}
            </div>
            <span className="text-[10px] text-blue-700">Digital QR / Card</span>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Expected in Drawer</span>
            <div className="text-lg font-black text-[#B45309] font-mono mt-1">
              {formatCurrency(expectedDrawerCash)}
            </div>
            <span className="text-[10px] text-amber-700">Opening + Cash - Petty</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-[#D8E1EC] pb-2">
          <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Drawer Reconciliation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'expenses' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Petty Expenses ({expenses.length})
              {totalPettyExpenses > 0 && (
                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full text-[10px]">
                  ₹{totalPettyExpenses}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('denominations')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'denominations' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Note Denomination Calculator
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleClose}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isClosed 
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                  : 'bg-[#15803D] text-white hover:bg-[#166534]'
              }`}
            >
              {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isClosed ? 'Reopen Register' : 'Close Day Register'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Reconciliation */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 bg-white border border-[#D8E1EC] rounded-xl p-4 space-y-3 shadow-xs">
              <span className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider block">
                Cash Flow Reconciliation
              </span>

              <div className="space-y-2 text-xs divide-y divide-[#E2E8F0]">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">1. Morning Opening Cash Float:</span>
                  <span className="font-mono font-bold text-[#172B4D]">₹{openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[#15803D]">
                  <span>2. Total Cash Sales Today:</span>
                  <span className="font-mono font-bold">+₹{cashSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[#EF4444]">
                  <span>3. Total Petty Cash Outflows:</span>
                  <span className="font-mono font-bold">-₹{totalPettyExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black border-t-2 border-[#172B4D]">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-[#2563EB]">₹{expectedDrawerCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black bg-[#F8FAFC] p-2 rounded-lg">
                  <span>Physical Cash Counted:</span>
                  <span className="font-mono text-[#172B4D]">₹{countedCash.toFixed(2)}</span>
                </div>
              </div>

              {/* Discrepancy Alert */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                discrepancy === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : discrepancy > 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-2">
                  {discrepancy === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {discrepancy === 0 
                        ? 'Drawer Balanced - Zero Discrepancy' 
                        : discrepancy > 0 
                        ? 'Cash Surplus in Drawer' 
                        : 'Cash Shortage in Drawer'}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {discrepancy === 0 
                        ? 'All counted notes match the calculated transactions.' 
                        : discrepancy > 0 
                        ? `Drawer has ₹${discrepancy.toFixed(2)} more than expected transactions.` 
                        : `Drawer is missing ₹${Math.abs(discrepancy).toFixed(2)}.`}
                    </div>
                  </div>
                </div>

                <div className="text-base font-black font-mono">
                  {discrepancy === 0 ? '₹0.00' : (discrepancy > 0 ? `+₹${discrepancy.toFixed(2)}` : `-₹${Math.abs(discrepancy).toFixed(2)}`)}
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider block mb-2">
                  Daily Business Snapshot
                </span>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-[#D8E1EC] flex justify-between">
                    <span className="text-[#64748B]">Total Invoices Generated:</span>
                    <strong className="font-mono text-[#172B4D]">{todayInvoices.length} Bills</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#D8E1EC] flex justify-between">
                    <span className="text-[#64748B]">Gross Day Turnover:</span>
                    <strong className="font-mono text-[#15803D]">₹{totalRevenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#D8E1EC] flex justify-between">
                    <span className="text-[#64748B]">UPI Digital Share:</span>
                    <strong className="font-mono text-[#2563EB]">
                      {totalRevenue > 0 ? ((upiSalesTotal / totalRevenue) * 100).toFixed(1) : 0}%
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#D8E1EC] flex justify-between">
                    <span className="text-[#64748B]">Petty Cash Outflows:</span>
                    <strong className="font-mono text-[#EF4444]">₹{totalPettyExpenses.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4 text-emerald-200" /> Share Report via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="w-full py-2 bg-white hover:bg-[#EFF6FF] text-[#172B4D] border border-[#D8E1EC] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#2563EB]" /> Print Day Closure Slip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Petty Cash Expenses Ledger */}
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            {/* Add Expense Form */}
            <form onSubmit={handleAddExpense} className="p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl flex flex-wrap items-center gap-2">
              <select
                value={newExpCategory}
                onChange={e => setNewExpCategory(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-bold text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Amount (₹)"
                value={newExpAmount}
                onChange={e => setNewExpAmount(parseFloat(e.target.value) || 0)}
                className="w-28 px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-bold font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
              />

              <input
                type="text"
                placeholder="Description / Note (e.g. 5 cups tea, auto fare)"
                value={newExpDesc}
                onChange={e => setNewExpDesc(e.target.value)}
                className="flex-1 min-w-[180px] px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
              />

              <button
                type="submit"
                className="px-4 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </form>

            {/* Expenses List */}
            <div className="bg-white border border-[#D8E1EC] rounded-xl overflow-hidden shadow-xs">
              <div className="max-h-64 overflow-y-auto divide-y divide-[#E2E8F0]">
                {expenses.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No petty cash expenses logged today. Record tea, loading, or courier expenses above.
                  </div>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC]">
                      <div>
                        <div className="font-bold text-[#172B4D]">{exp.description}</div>
                        <div className="text-[10px] text-[#64748B] flex items-center gap-2">
                          <span className="font-semibold text-[#2563EB]">{exp.category}</span>
                          <span>•</span>
                          <span>{exp.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-red-600 text-sm">
                          -₹{exp.amount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="p-1 text-[#64748B] hover:text-[#EF4444] rounded hover:bg-red-50 cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Denomination Calculator */}
        {activeTab === 'denominations' && (
          <div className="bg-white border border-[#D8E1EC] rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8E1EC] pb-2">
              <span className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider">
                Physical Indian Currency Note Counter
              </span>
              <div className="text-sm font-black font-mono text-[#15803D]">
                Counted Total: ₹{countedCash.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {[
                { note: 500, key: 'c500' as const },
                { note: 200, key: 'c200' as const },
                { note: 100, key: 'c100' as const },
                { note: 50, key: 'c50' as const },
                { note: 20, key: 'c20' as const },
                { note: 10, key: 'c10' as const },
              ].map(item => (
                <div key={item.key} className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#172B4D]">₹{item.note} Notes</span>
                    <span className="font-mono text-[11px] text-[#64748B]">
                      = ₹{denominations[item.key] * item.note}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={denominations[item.key]}
                    onChange={e => handleUpdateDenom(item.key, parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              ))}

              <div className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[#172B4D]">Coins & Loose Change</span>
                  <span className="font-mono text-[11px] text-[#64748B]">Total Amount</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={denominations.coins}
                  onChange={e => handleUpdateDenom('coins', parseInt(e.target.value, 10))}
                  placeholder="Total loose coins value in ₹"
                  className="w-full px-2 py-1 bg-white border border-[#D8E1EC] rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
