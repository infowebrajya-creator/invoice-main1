import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  ShoppingBag, Package, Boxes, Users, Receipt, Settings, Store, 
  Headphones, LogOut, FileSpreadsheet, Download, Smartphone, Monitor,
  ShieldCheck, X, Calculator
} from 'lucide-react';
import { BillingSection } from './components/billing/BillingSection';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { usePwaInstall } from './utils/usePwaInstall';
import { useAuthStore } from './store/useAuthStore';
import { useKeyboardShortcuts } from './utils/keyboard';
import { useProductStore } from './store/useProductStore';
import { useCustomerStore } from './store/useCustomerStore';
import { useSalesStore } from './store/useSalesStore';
import { useBillingStore } from './store/useBillingStore';
import { useSettingsStore } from './store/useSettingsStore';

// Code-split heavy views to guarantee instant 0ms first-contentful-paint
const ProductsSection = lazy(() => import('./components/products/ProductsSection').then(m => ({ default: m.ProductsSection })));
const InventorySection = lazy(() => import('./components/inventory/InventorySection').then(m => ({ default: m.InventorySection })));
const CustomersSection = lazy(() => import('./components/customers/CustomersSection').then(m => ({ default: m.CustomersSection })));
const SalesSection = lazy(() => import('./components/sales/SalesSection').then(m => ({ default: m.SalesSection })));
const SettingsSection = lazy(() => import('./components/settings/SettingsSection').then(m => ({ default: m.SettingsSection })));
const SupportModal = lazy(() => import('./components/common/SupportModal').then(m => ({ default: m.SupportModal })));
const ShareReportsModal = lazy(() => import('./components/caReports/ShareReportsModal').then(m => ({ default: m.ShareReportsModal })));
const PwaInstallModal = lazy(() => import('./components/common/PwaInstallModal').then(m => ({ default: m.PwaInstallModal })));
const DailyCashRegisterModal = lazy(() => import('./components/cashRegister/DailyCashRegisterModal').then(m => ({ default: m.DailyCashRegisterModal })));
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));

export type MainSection = 'billing' | 'products' | 'inventory' | 'customers' | 'sales' | 'settings';

const VALID_SECTIONS: MainSection[] = ['billing', 'products', 'inventory', 'customers', 'sales', 'settings'];

function getInitialSection(): MainSection {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as MainSection;
    if (VALID_SECTIONS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('webrajya_active_section') as MainSection;
    if (saved && VALID_SECTIONS.includes(saved)) {
      return saved;
    }
  }
  return 'billing';
}

export function App() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadCustomers = useCustomerStore((state) => state.loadCustomers);
  const loadInvoices = useSalesStore((state) => state.loadInvoices);
  const cartItemsCount = useBillingStore((state) => state.items.length);

  // Restore current tab on page refresh
  const [activeSection, setActiveSection] = useState<MainSection>(getInitialSection);

  useEffect(() => {
    localStorage.setItem('webrajya_active_section', activeSection);
    window.location.hash = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as MainSection;
      if (['billing', 'products', 'sales', 'settings'].includes(hash)) {
        setActiveSection(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const { shopProfile, loadSettings } = useSettingsStore();
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadInvoices();
    loadSettings();

    const handleOnline = () => {
      loadInvoices();
      loadProducts();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadProducts, loadCustomers, loadInvoices, loadSettings]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAddProductOpenFromApp, setIsAddProductOpenFromApp] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isShareReportsOpen, setIsShareReportsOpen] = useState(false);

  const { 
    hasNativePrompt, isInstalled, isStandalone, isIos, promptInstall 
  } = usePwaInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installModalTab, setInstallModalTab] = useState<'windows' | 'pwa'>('windows');
  const isInsideElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  const [showBackupAlert, setShowBackupAlert] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('webrajya_backup_banner_dismissed') === 'true') return false;
    const lastBackup = localStorage.getItem('webrajya_last_backup_date');
    if (!lastBackup) return true;
    const lastTime = new Date(lastBackup).getTime();
    const diffDays = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  });

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Keyboard Navigation Shortcuts
  useKeyboardShortcuts({
    onF2_NewBill: () => {
      setActiveSection('billing');
    },
    onF4_SearchProduct: () => {
      setActiveSection('billing');
    },
    onF8_QuickPay: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    },
    onF9_SaveAndPrint: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    },
    onF10_HoldDraft: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    }
  });

  const navItems: { id: MainSection; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'billing', label: 'Billing POS', icon: <ShoppingBag className="w-4 h-4 text-white" />, shortcut: 'F2' },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'inventory', label: 'Stock', icon: <Boxes className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'customers', label: 'Khata', icon: <Users className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'sales', label: 'Sales History', icon: <Receipt className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-white" />, shortcut: '' },
  ];

  // Render Login Page if user is not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F7F4EC] flex items-center justify-center font-bold text-[#0F172A]">Loading WebRajya...</div>}>
        <LoginPage onOpenSupport={() => setIsSupportOpen(true)} />
        {isSupportOpen && <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#172B4D] flex flex-col font-sans antialiased">
      {/* SECTION 3: Compact Horizontal Top Navigation Bar (#123B70) */}
      <header className="no-print bg-[#123B70] text-white shrink-0 border-b border-[#0D2D56] shadow-sm sticky top-0 z-40 px-3 sm:px-4 py-2 flex items-center justify-between safe-area-pt">
        {/* Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-0.5 shadow-sm shrink-0 flex items-center justify-center overflow-hidden border border-white/20">
            <img src="/logo.png" alt="WebRajya Invoice" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase leading-none">
              WEBRAJYA <span className="text-[#FF8A00]">INVOICE</span>
            </h1>
            <span className="hidden sm:inline-block text-[11px] text-blue-200/80 font-medium border-l border-white/20 pl-2 leading-none">
              Stationery POS
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Tabs (Desktop only) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.id === 'billing' && cartItemsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#EF4444] text-white text-[10px] font-mono font-black">
                    {cartItemsCount}
                  </span>
                )}
                {item.shortcut && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-mono font-bold">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Info: Windows Download, PWA Install, CA Reports, Support Button & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Single Unified App Download & Install Button */}
          {!isInsideElectron ? (
            <button
              onClick={() => {
                setInstallModalTab(typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent) ? 'windows' : 'pwa');
                setIsInstallModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-400/50 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 group"
              title="Download WebRajya App (Windows .exe or Mobile/Chrome PWA)"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200 group-hover:translate-y-0.5 transition-transform" />
              <span className="font-extrabold tracking-wide hidden xs:inline sm:inline">
                {isInstalled || isStandalone ? 'App Ready' : 'Download / Install App'}
              </span>
              <span className="xs:hidden sm:hidden font-black text-[11px]">
                App
              </span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Windows App v1.0</span>
            </div>
          )}

          <button
            onClick={() => setIsShareReportsOpen(true)}
            className="bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-400/50 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Share Reports with CA (Excel & PDF)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
            <span className="font-extrabold tracking-wide hidden xs:inline sm:inline">CA Reports</span>
          </button>

          <button
            onClick={() => setIsCashRegisterOpen(true)}
            className="bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-400/50 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Daily Cash Register & Drawer Reconciliation"
          >
            <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
            <span className="font-extrabold tracking-wide hidden xs:inline sm:inline">Register</span>
          </button>

          <button
            onClick={() => setIsSupportOpen(true)}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border border-red-400/50 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Support (Aryan Rajput: 9630013483)"
          >
            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="font-extrabold tracking-wide hidden xs:inline sm:inline">Support</span>
          </button>

          <button
            onClick={() => logout()}
            className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white font-bold text-xs px-2 sm:px-2.5 py-1.5 rounded-lg border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Logout of POS"
          >
            <LogOut className="w-3.5 h-3.5 text-red-300" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 7-Day Safety Net Automated Backup Reminder */}
      {showBackupAlert && (
        <div className="no-print bg-gradient-to-r from-amber-600 to-amber-700 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-sm shrink-0 border-b border-amber-800">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <ShieldCheck className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="truncate">
              <strong>Database Safety Reminder:</strong> No offline backup taken in the last 7 days. Download your JSON backup to protect sales and stock records.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveSection('settings');
                setShowBackupAlert(false);
              }}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 rounded-md font-black text-[11px] shadow-2xs transition-colors cursor-pointer"
            >
              Backup Now
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('webrajya_backup_banner_dismissed', 'true');
                setShowBackupAlert(false);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors text-white/90 cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Area (#F5F9FF background) */}
      <main className="no-print flex-1 p-2 pb-28 md:p-3 md:pb-4 w-full mx-auto overflow-x-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[350px] text-xs font-bold text-[#64748B]">
            <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mr-2" />
            Loading workspace...
          </div>
        }>
          {activeSection === 'billing' && (
            <BillingSection 
              onToast={addToast} 
              onOpenAddProductModal={() => {
                setActiveSection('products');
                setIsAddProductOpenFromApp(true);
              }} 
            />
          )}
          {activeSection === 'products' && (
            <ProductsSection 
              onToast={addToast} 
              isAddModalOpenFromExternal={isAddProductOpenFromApp}
              onCloseExternalModal={() => setIsAddProductOpenFromApp(false)}
            />
          )}
          {activeSection === 'inventory' && <InventorySection onToast={addToast} />}
          {activeSection === 'customers' && <CustomersSection onToast={addToast} />}
          {activeSection === 'sales' && <SalesSection onToast={addToast} onNavigateToBilling={() => setActiveSection('billing')} />}
          {activeSection === 'settings' && <SettingsSection onToast={addToast} />}
        </Suspense>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar with Safe Area Support */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#123B70] text-white border-t border-[#0D2D56] flex items-center justify-around py-1.5 px-2 shadow-2xl safe-area-pb">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex-1 active:scale-95 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs font-black'
                  : 'text-blue-200/75 hover:text-white'
              }`}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                {item.icon}
                {item.id === 'billing' && cartItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-mono font-black flex items-center justify-center border border-[#123B70]">
                    {cartItemsCount}
                  </span>
                )}
              </div>
              <span className="mt-0.5 leading-none">{item.label.replace(' POS', '')}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals rendered on-demand inside Suspense */}
      <Suspense fallback={null}>
        {/* Support Contact Modal */}
        {isSupportOpen && <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />}

        {/* Share Reports with CA Modal */}
        {isShareReportsOpen && (
          <ShareReportsModal
            isOpen={isShareReportsOpen}
            onClose={() => setIsShareReportsOpen(false)}
            onToast={addToast}
          />
        )}

        {/* PWA / Windows Install Modal (Laptop, Tablet & Mobile) */}
        {isInstallModalOpen && (
          <PwaInstallModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            onInstall={promptInstall}
            hasNativePrompt={hasNativePrompt}
            isInstalled={isInstalled}
            isIos={isIos}
            initialTab={installModalTab}
          />
        )}

        {/* Daily Cash Register & Day-End Cash Closure Modal */}
        {isCashRegisterOpen && (
          <DailyCashRegisterModal
            isOpen={isCashRegisterOpen}
            onClose={() => setIsCashRegisterOpen(false)}
            shopProfile={shopProfile}
            onToast={addToast}
          />
        )}
      </Suspense>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
