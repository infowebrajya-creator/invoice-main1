import React, { useState, useEffect } from 'react';
import { 
  Store, Save, RefreshCw, Download, Upload, ShieldCheck, Trash2 
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useProductStore } from '../../store/useProductStore';
import { useSalesStore } from '../../store/useSalesStore';
import { ShopProfileSchema } from '../../utils/validation';

interface SettingsSectionProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ onToast }) => {
  const { 
    shopProfile, printSettings, supabaseConfig, isLoading, isTestingConnection,
    loadSettings, saveShopProfile, savePrintSettings, saveSupabaseConfig, testConnection, exportBackupJSON, importBackupJSON, clearAllDemoData
  } = useSettingsStore();

  const { loadProducts } = useProductStore();
  const { loadInvoices } = useSalesStore();

  const { syncWithSupabase: syncProducts } = useProductStore();
  const { syncInvoicesWithSupabase: syncInvoices } = useSalesStore();

  const [activeTab, setActiveTab] = useState<'shop' | 'print' | 'supabase' | 'backup'>('shop');
  
  // Local form states
  const [profileForm, setProfileForm] = useState(shopProfile);
  const [printForm, setPrintForm] = useState(printSettings);
  const [supaForm, setSupaForm] = useState(supabaseConfig);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setProfileForm(shopProfile);
    setPrintForm(printSettings);
    setSupaForm(supabaseConfig);
  }, [shopProfile, printSettings, supabaseConfig]);

  const handleSaveShopProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = ShopProfileSchema.safeParse(profileForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setProfileErrors(errors);
      onToast('error', 'Validation Error', 'Please check shop profile fields');
      return;
    }
    await saveShopProfile(profileForm);
    setProfileErrors({});
    onToast('success', 'Shop Profile Saved', 'Updated invoice header and shop details');
  };

  const handleSavePrintSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePrintSettings(printForm);
    onToast('success', 'Print Settings Saved', 'A5 invoice preferences updated');
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSupabaseConfig(supaForm);
    onToast('success', 'Supabase Config Saved', 'Supabase endpoint updated');
  };

  const handleTestConnection = async () => {
    const res = await testConnection(supaForm.url, supaForm.anonKey);
    if (res.success) {
      onToast('success', 'Connection Successful', res.message);
    } else {
      onToast('error', 'Connection Failed', res.message);
    }
  };

  const handleSyncToCloud = async () => {
    onToast('info', 'Sync Started', 'Pushing local products and invoices to Supabase...');
    const prodRes = await syncProducts();
    const invRes = await syncInvoices();
    
    if (prodRes.success && invRes.success) {
      onToast('success', 'Sync Complete!', `${prodRes.message} | ${invRes.message}`);
    } else {
      onToast('error', 'Sync Partial Error', `${prodRes.message || ''} ${invRes.message || ''}`);
    }
  };

  const handleDownloadBackup = async () => {
    const jsonStr = await exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WebRajya_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', 'Backup Exported', 'Downloaded full JSON database backup file.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importBackupJSON(content);
      if (res.success) {
        onToast('success', 'Database Restored!', res.message);
      } else {
        onToast('error', 'Import Failed', res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearDemoData = async () => {
    if (confirm('Are you sure you want to delete all demo data (products, invoices, stock movements, and drafts)? This action cannot be undone.')) {
      await clearAllDemoData();
      await loadProducts();
      await loadInvoices();
      onToast('success', 'Demo Data Deleted', 'All products, sales history, stock movements, and drafts have been cleared.');
    }
  };

  return (
    <div className="flex flex-col h-auto md:h-[calc(100vh-4.5rem)] gap-3 font-sans text-[#172B4D] pb-24 md:pb-0">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#D8E1EC] rounded-xl p-3 sm:p-4 shadow-sm shrink-0">
        <div>
          <h2 className="text-base font-extrabold text-[#172B4D] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#2563EB]" /> Settings & Configuration
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage shop profile, A5 print layout, Supabase credentials, and data backups</p>
        </div>

        {/* Tab Switcher - Horizontally scrollable on mobile */}
        <div className="flex gap-1 bg-[#F5F9FF] p-1 rounded-xl border border-[#D8E1EC] text-xs font-semibold overflow-x-auto touch-scroll no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${activeTab === 'shop' ? 'bg-[#2563EB] text-white shadow-xs font-bold' : 'text-[#64748B] hover:text-[#172B4D]'}`}
          >
            Shop Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${activeTab === 'print' ? 'bg-[#2563EB] text-white shadow-xs font-bold' : 'text-[#64748B] hover:text-[#172B4D]'}`}
          >
            A5 Print Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${activeTab === 'supabase' ? 'bg-[#2563EB] text-white shadow-xs font-bold' : 'text-[#64748B] hover:text-[#172B4D]'}`}
          >
            Supabase Cloud Setup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${activeTab === 'backup' ? 'bg-[#2563EB] text-white shadow-xs font-bold' : 'text-[#64748B] hover:text-[#172B4D]'}`}
          >
            Backup & Restore
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 bg-white border border-[#D8E1EC] rounded-xl overflow-y-auto p-4 sm:p-6 text-xs shadow-sm">
        {activeTab === 'shop' && (
          <form onSubmit={handleSaveShopProfile} className="max-w-3xl space-y-4">
            <h3 className="text-sm font-extrabold text-[#172B4D] uppercase tracking-wider border-b border-[#D8E1EC] pb-2">
              Stationery Shop Details & Invoice Header
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={profileForm.shopName}
                  onChange={(e) => setProfileForm({ ...profileForm, shopName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-bold text-sm"
                />
                {profileErrors.shopName && <p className="text-[#B91C1C] text-[11px] font-mono mt-0.5">{profileErrors.shopName}</p>}
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Address *</label>
                <textarea
                  rows={2}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">GSTIN (15 Digits) *</label>
                <input
                  type="text"
                  value={profileForm.gstin}
                  onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] uppercase font-bold text-[#B45309] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Invoice Number Prefix *</label>
                <input
                  type="text"
                  value={profileForm.invoicePrefix}
                  onChange={(e) => setProfileForm({ ...profileForm, invoicePrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">UPI Payment ID (for Invoice QR)</label>
                <input
                  type="text"
                  value={profileForm.upiId}
                  onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                  placeholder="e.g. webrajyastationery@sbi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={profileForm.bankName}
                  onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={profileForm.accountNo}
                  onChange={(e) => setProfileForm({ ...profileForm, accountNo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8E1EC]">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Shop Profile
              </button>
            </div>
          </form>
        )}

        {activeTab === 'print' && (
          <form onSubmit={handleSavePrintSettings} className="max-w-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-[#172B4D] uppercase tracking-wider border-b border-[#D8E1EC] pb-2">
              A5 Invoice Print Template Preferences
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={printForm.showGstBreakdown}
                  onChange={(e) => setPrintForm({ ...printForm, showGstBreakdown: e.target.checked })}
                  className="rounded border-[#D8E1EC] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <div>
                  <div className="font-bold text-[#172B4D]">Show Tax Breakdown Table</div>
                  <div className="text-[11px] text-[#64748B]">Includes CGST + SGST or IGST tax slab columns on printed A5 invoice</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={printForm.showBankDetails}
                  onChange={(e) => setPrintForm({ ...printForm, showBankDetails: e.target.checked })}
                  className="rounded border-[#D8E1EC] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <div>
                  <div className="font-bold text-[#172B4D]">Include Bank & UPI QR Payment Info</div>
                  <div className="text-[11px] text-[#64748B]">Prints bank account, IFSC and UPI ID on bottom left of invoice</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={printForm.showTerms}
                  onChange={(e) => setPrintForm({ ...printForm, showTerms: e.target.checked })}
                  className="rounded border-[#D8E1EC] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <div>
                  <div className="font-bold text-[#172B4D]">Print Terms & Conditions Footer</div>
                  <div className="text-[11px] text-[#64748B]">Include return policy & jurisdiction terms</div>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-[#D8E1EC]">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Print Settings
              </button>
            </div>
          </form>
        )}

        {activeTab === 'supabase' && (
          <div className="max-w-2xl space-y-6">
            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
              <h3 className="text-sm font-extrabold text-[#172B4D] uppercase tracking-wider border-b border-[#D8E1EC] pb-2">
                Supabase PostgreSQL & Cloud Sync Credentials
              </h3>

              <div className="p-3 bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg text-[11px] text-[#123B70]">
                <ShieldCheck className="w-4 h-4 text-[#15803D] inline mr-1" />
                WebRajya operates 100% offline using IndexedDB. Configuring Supabase syncs your products and sales history to cloud PostgreSQL. Service-role keys are never exposed.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  value={supaForm.url}
                  onChange={(e) => setSupaForm({ ...supaForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Supabase Publishable / Anon Key</label>
                <input
                  type="password"
                  value={supaForm.anonKey}
                  onChange={(e) => setSupaForm({ ...supaForm, anonKey: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-mono"
                  placeholder="eyJhbGciOi..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" /> Save Credentials
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-4 py-2 bg-white hover:bg-[#F5F9FF] text-[#172B4D] border border-[#D8E1EC] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingConnection ? 'animate-spin text-[#2563EB]' : ''}`} /> Test Connection
                </button>
              </div>
            </form>

            <div className="p-4 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#172B4D]">Manual Cloud Sync Trigger</span>
                <button
                  onClick={handleSyncToCloud}
                  className="px-3.5 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sync Local Data Now
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="max-w-2xl space-y-6">
            <h3 className="text-sm font-extrabold text-[#172B4D] uppercase tracking-wider border-b border-[#D8E1EC] pb-2">
              Database Backup & JSON Data Management
            </h3>

            <div className="p-4 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-3">
              <div className="font-bold text-[#172B4D]">Export Complete JSON Database Backup</div>
              <p className="text-[11px] text-[#64748B]">Download all local products, invoices, stock movements, and settings into a single JSON file for safe offline keeping.</p>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Backup (.json)
              </button>
            </div>

            <div className="p-4 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-3">
              <div className="font-bold text-[#172B4D]">Restore Database from Backup JSON</div>
              <p className="text-[11px] text-[#64748B]">Upload a previously exported WebRajya JSON backup file to restore product catalog and sales history.</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F5F9FF] text-[#172B4D] border border-[#D8E1EC] rounded-lg text-xs font-bold cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-[#15803D]" /> Select Backup JSON File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl space-y-3">
              <div className="font-bold text-[#B91C1C]">Purge All Demo Data</div>
              <p className="text-[11px] text-[#B91C1C]/80">Permanently delete all sample products, demo sales history, stock movements, and draft bills from database.</p>
              <button
                onClick={handleClearDemoData}
                className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete All Demo Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
