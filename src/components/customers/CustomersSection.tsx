import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, AlertCircle, IndianRupee, Search, 
  Plus, Share2, CheckCircle2, Download, Phone, MapPin, 
  FileText, ArrowDownRight, X, Clock, Landmark
} from 'lucide-react';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Customer } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CustomersSectionProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const CustomersSection: React.FC<CustomersSectionProps> = ({ onToast }) => {
  const { customers, loadCustomers, addCustomer, recordCustomerPayment } = useCustomerStore();
  const shopProfile = useSettingsStore((state) => state.shopProfile);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('all');
  
  // Payment Collection Modal State
  const [selectedCustForPayment, setSelectedCustForPayment] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'cash' | 'upi'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // New Customer Modal State
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newInitialCredit, setNewInitialCredit] = useState(0);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const realCustomers = customers.filter(c => c.name.toLowerCase() !== 'cash customer');
  const totalOutstanding = realCustomers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
  const customersWithDue = realCustomers.filter(c => (c.creditBalance || 0) > 0);

  const filteredCustomers = realCustomers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.mobile && c.mobile.includes(searchQuery)) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterMode === 'due') {
      return matchesSearch && (c.creditBalance || 0) > 0;
    }
    return matchesSearch;
  });

  const handleOpenPayment = (cust: Customer) => {
    setSelectedCustForPayment(cust);
    setPayAmount(cust.creditBalance || 0);
    setPayMode('cash');
    setPayNotes('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForPayment || payAmount <= 0) {
      onToast('error', 'Invalid Amount', 'Please enter a payment amount greater than zero.');
      return;
    }

    setIsSubmittingPay(true);
    try {
      await recordCustomerPayment(selectedCustForPayment.id, payAmount, payMode, payNotes.trim());
      onToast('success', 'Payment Received', `₹${payAmount} recorded for ${selectedCustForPayment.name}. Balance updated.`);
      setSelectedCustForPayment(null);
    } catch (err: any) {
      onToast('error', 'Failed to record payment', err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      onToast('error', 'Name Required', 'Please enter customer or business name.');
      return;
    }

    const trimmedName = newName.trim();
    const cleanPhone = newMobile.trim();

    // Prevent duplicate party creation in UI
    const existing = customers.find((c) => 
      c.name.toLowerCase() === trimmedName.toLowerCase() ||
      (cleanPhone && c.mobile && c.mobile.trim() === cleanPhone)
    );

    if (existing) {
      onToast('info', 'Customer Already Exists', `Party "${existing.name}" is already in your Khata directory.`);
      setIsNewCustModalOpen(false);
      return;
    }

    try {
      await addCustomer({
        name: trimmedName,
        mobile: cleanPhone || '',
        gstin: newGstin.trim() || undefined,
        address: newAddress.trim() || undefined,
        creditBalance: newInitialCredit || 0,
        isActive: true
      });

      onToast('success', 'Customer Added', `${trimmedName} saved to directory.`);
      setIsNewCustModalOpen(false);
      setNewName('');
      setNewMobile('');
      setNewGstin('');
      setNewAddress('');
      setNewInitialCredit(0);
    } catch (err: any) {
      onToast('error', 'Failed to save customer', err.message);
    }
  };

  const handleSendWhatsAppStatement = (cust: Customer) => {
    const cleanPhone = (cust.mobile || '').replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = [
      `📢 *KHATA STATEMENT / PAYMENT REMINDER*`,
      `*${shopProfile.shopName.toUpperCase()}*`,
      `--------------------------------`,
      `Dear ${cust.name},`,
      `This is a friendly statement of your account with us:`,
      `*Outstanding Balance Due: ₹${(cust.creditBalance || 0).toFixed(2)}*`,
      `--------------------------------`,
      shopProfile.upiId ? `Pay via UPI VPA: *${shopProfile.upiId}*` : '',
      shopProfile.bankName ? `Bank: ${shopProfile.bankName} | A/C: ${shopProfile.accountNo} | IFSC: ${shopProfile.ifscCode}` : '',
      `Phone: ${shopProfile.phone}`,
      `--------------------------------`,
      `Thank you for your prompt settlement! 🙏`
    ].filter(Boolean).join('\n');

    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Mobile', 'GSTIN', 'Address', 'Credit Balance', 'Created At'];
    const rows = realCustomers.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.mobile || ''}"`,
      `"${c.gstin || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      (c.creditBalance || 0).toFixed(2),
      c.createdAt
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_khata_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('success', 'Export Complete', `${realCustomers.length} customer records exported to CSV.`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] gap-3 font-sans text-[#172B4D] pb-16 md:pb-2">
      {/* 1. TOP METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 shrink-0">
        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Customers</span>
            <div className="p-1.5 sm:p-2 bg-[#DBEAFE] text-[#2563EB] rounded-lg">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#172B4D] font-mono mt-1.5">{realCustomers.length}</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Active parties & accounts</p>
        </div>

        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Udhar / Due</span>
            <div className="p-1.5 sm:p-2 bg-red-100 text-red-600 rounded-lg">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600 font-mono mt-1.5">{formatCurrency(totalOutstanding)}</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Across {customersWithDue.length} party account(s)</p>
        </div>

        <div className="col-span-2 lg:col-span-1 p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Accounts Due</span>
            <div className="p-1.5 sm:p-2 bg-amber-100 text-amber-700 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1.5">{customersWithDue.length} Parties</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Require follow-up & collection</p>
        </div>
      </div>

      {/* 2. SEARCH, FILTER CHIPS & ACTION BAR */}
      <div className="bg-white border border-[#D8E1EC] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer by name, mobile, GSTIN..."
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#D8E1EC] text-xs shrink-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              All ({realCustomers.length})
            </button>
            <button
              onClick={() => setFilterMode('due')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'due' ? 'bg-red-600 text-white shadow-xs' : 'text-[#64748B] hover:text-red-600'
              }`}
            >
              Due Udhar ({customersWithDue.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-[#D8E1EC] text-[#172B4D] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setIsNewCustModalOpen(true)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* 3. CUSTOMER LIST (DESKTOP TABLE & MOBILE CARDS) */}
      <div className="bg-white border border-[#D8E1EC] rounded-xl overflow-hidden flex flex-col shadow-xs flex-1">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F5F9FF] text-[#123B70] uppercase font-bold sticky top-0 border-b border-[#D8E1EC] text-[11px]">
              <tr>
                <th className="p-3">Customer / Party Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">GSTIN / Address</th>
                <th className="p-3 text-right">Outstanding Udhar</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#64748B] italic">
                    No customers found matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDue = (cust.creditBalance || 0) > 0;
                  return (
                    <tr key={cust.id} className="hover:bg-[#F0F6FF] transition-colors">
                      <td className="p-3 font-bold text-[#172B4D]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-black flex items-center justify-center shrink-0 text-xs">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#172B4D]">{cust.name}</div>
                            <div className="text-[10px] text-[#64748B]">Member since {formatDate(cust.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[#64748B]">
                        {cust.mobile ? (
                          <div className="flex items-center gap-1 text-[#172B4D]">
                            <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>{cust.mobile}</span>
                          </div>
                        ) : (
                          <span className="italic text-[11px]">Not provided</span>
                        )}
                      </td>
                      <td className="p-3 text-[#64748B] max-w-[200px] truncate">
                        {cust.gstin && <div className="font-mono text-[10px] text-[#123B70] font-bold">GSTIN: {cust.gstin}</div>}
                        {cust.address ? <div className="truncate text-[11px]">{cust.address}</div> : <span className="italic text-[11px]">-</span>}
                      </td>
                      <td className="p-3 text-right font-mono">
                        <div className={`text-sm font-black ${hasDue ? 'text-red-600' : 'text-emerald-700'}`}>
                          {formatCurrency(cust.creditBalance || 0)}
                        </div>
                        {hasDue && <span className="text-[9px] font-bold uppercase text-red-500 bg-red-50 px-1.5 py-0.2 rounded">Payment Due</span>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasDue && (
                            <button
                              onClick={() => handleOpenPayment(cust)}
                              className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                              title="Record received cash/UPI payment"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>Receive</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsAppStatement(cust)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Send WhatsApp Khata Statement"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden p-2.5 space-y-2.5 overflow-y-auto flex-1">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] italic text-xs">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const hasDue = (cust.creditBalance || 0) > 0;
              return (
                <div key={cust.id} className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#172B4D]">{cust.name}</div>
                      {cust.mobile && (
                        <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#2563EB]" />
                          <span>{cust.mobile}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono font-black ${hasDue ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatCurrency(cust.creditBalance || 0)}
                      </div>
                      <span className="text-[10px] text-[#64748B]">{hasDue ? 'Due Udhar' : 'Zero Balance'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#D8E1EC]">
                    <button
                      onClick={() => handleSendWhatsAppStatement(cust)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Bill</span>
                    </button>

                    {hasDue && (
                      <button
                        onClick={() => handleOpenPayment(cust)}
                        className="px-3 py-1 bg-[#2563EB] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Receive Payment</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. RECEIVE PAYMENT MODAL */}
      {selectedCustForPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D8E1EC] pb-2.5">
              <div className="flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-extrabold uppercase text-[#172B4D]">Receive Customer Payment</span>
              </div>
              <button 
                onClick={() => setSelectedCustForPayment(null)}
                className="p-1 text-[#64748B] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F5F9FF] p-2.5 rounded-xl border border-[#D8E1EC] text-xs">
              <div className="text-[11px] text-[#64748B]">Customer Name:</div>
              <div className="font-bold text-[#123B70] text-sm">{selectedCustForPayment.name}</div>
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-[#D8E1EC] text-[11px]">
                <span className="text-[#64748B]">Current Outstanding:</span>
                <span className="font-mono font-bold text-red-600">{formatCurrency(selectedCustForPayment.creditBalance || 0)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Payment Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-xl text-base font-mono font-black text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMode('cash')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      payMode === 'cash' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#F8FAFC] text-[#172B4D] border-[#D8E1EC]'
                    }`}
                  >
                    Cash in Hand
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('upi')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      payMode === 'upi' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#F8FAFC] text-[#172B4D] border-[#D8E1EC]'
                    }`}
                  >
                    UPI / Online
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Narration / Notes (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Received via PhonePe / cash at shop"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustForPayment(null)}
                  className="flex-1 py-2.5 bg-white border border-[#D8E1EC] text-[#172B4D] rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  {isSubmittingPay ? 'Recording...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD CUSTOMER MODAL */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#D8E1EC] pb-2.5">
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-extrabold uppercase text-[#172B4D]">Add New Customer Account</span>
              </div>
              <button 
                onClick={() => setIsNewCustModalOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Customer / Party Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar or Balaji Stores"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono uppercase text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Address / Market (Optional)</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Main Market, Seoni"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Opening Credit / Old Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newInitialCredit || ''}
                  onChange={(e) => setNewInitialCredit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="flex-1 py-2 bg-white border border-[#D8E1EC] text-[#172B4D] rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-black shadow-md cursor-pointer active:scale-95"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
