import React, { useState } from 'react';
import { 
  Download, Laptop, Smartphone, Tablet, CheckCircle2, 
  WifiOff, Printer, Zap, X, Share, PlusSquare, Monitor, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  initialTab?: 'windows' | 'pwa';
}

export const WINDOWS_EXE_URL = 'https://github.com/infowebrajya-creator/chandra-trading-/releases/latest/download/WebRajya-Invoice-Setup.exe';

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  hasNativePrompt,
  isInstalled,
  isIos,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'pwa'>(
    initialTab || (typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent) ? 'windows' : 'pwa')
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handlePwaInstallClick = async () => {
    setIsInstalling(true);
    try {
      const result = await onInstall();
      if (result === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
          setInstallSuccess(false);
        }, 1800);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const isInsideElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#D8E1EC] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Card */}
        <div className="bg-[#123B70] text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#2563EB]/25 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden border-2 border-white/20">
              <img src="/logo.png" alt="WebRajya Invoice" className="w-full h-full object-contain" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#2563EB] text-white shadow-xs">
                  OFFICIAL APPS
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  100% Offline Ready
                </span>
              </div>
              <h2 className="text-lg font-black text-white leading-tight">
                WebRajya Invoice POS
              </h2>
              <p className="text-xs text-blue-100/80">
                Windows Desktop App (.exe) & Chrome PWA
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15 text-xs font-bold mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('windows')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'windows'
                  ? 'bg-white text-[#123B70] shadow-sm font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Monitor className="w-4 h-4 text-[#0078D4]" />
              <span>Windows .exe App</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pwa')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pwa'
                  ? 'bg-white text-[#123B70] shadow-sm font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Tablet & Mobile (PWA)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: WINDOWS .EXE DESKTOP APP */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              {isInsideElectron ? (
                <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-[#2563EB] shrink-0" />
                  <div>
                    <div className="font-extrabold text-sm text-[#1E40AF]">Already Running in Windows App!</div>
                    <div className="text-[#3B82F6] text-[11px] mt-0.5">
                      You are using the official native Windows desktop app with hardware silent printing enabled.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-[#1E40AF] font-black text-sm">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      Official WebRajya Desktop App for Windows
                    </div>
                    <p className="text-[11px] text-[#1E3A8A] leading-relaxed">
                      Download the standalone Windows installer (<strong>.exe</strong>). Ready-to-work setup with full hardware support for USB thermal printers, zero-popup silent printing, and offline database.
                    </p>

                    <a
                      href={WINDOWS_EXE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                    >
                      <Download className="w-5 h-5 text-white animate-bounce" />
                      <span>Download for Windows (.exe)</span>
                    </a>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                      Windows Desktop App Features:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#0F172A] block">100% Silent Printing</strong>
                          <span className="text-[#64748B] text-[10px]">Direct Windows spooler access, zero print dialog popups.</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                        <Printer className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#0F172A] block">Auto-Cut & Cash Drawer</strong>
                          <span className="text-[#64748B] text-[10px]">Cuts thermal roll & pops drawer pin automatically.</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                        <WifiOff className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#0F172A] block">100% Offline POS</strong>
                          <span className="text-[#64748B] text-[10px]">Operates completely without internet; syncs when online.</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#0F172A] block">Auto Updates</strong>
                          <span className="text-[#64748B] text-[10px]">Silently updates to latest version automatically.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Step Install Guide */}
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                    <div className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider">
                      Simple 3-Step Setup:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[#334155] text-[11px]">
                      <li>Click the button above to download <code className="font-mono font-bold text-[#2563EB]">WebRajya-Invoice-Setup.exe</code>.</li>
                      <li>Double-click the downloaded file and click <strong>Install</strong>.</li>
                      <li>A desktop shortcut will appear on your counter PC. Launch it and start billing!</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CHROME PWA (TABLET & MOBILE) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              {installSuccess ? (
                <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto animate-bounce" />
                  <div className="text-sm font-black text-[#15803D]">Installation Confirmed!</div>
                  <p className="text-xs text-[#166534]">
                    WebRajya Invoice is now added to your home screen.
                  </p>
                </div>
              ) : isInstalled ? (
                <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#2563EB] shrink-0" />
                  <div>
                    <div className="text-xs font-black text-[#1E40AF]">App Already Installed</div>
                    <div className="text-[11px] text-[#3B82F6]">You can launch it directly from your device home screen.</div>
                  </div>
                </div>
              ) : (
                <div>
                  {hasNativePrompt ? (
                    <button
                      type="button"
                      onClick={handlePwaInstallClick}
                      disabled={isInstalling}
                      className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                    >
                      <Download className="w-5 h-5 text-white animate-bounce" />
                      <span>{isInstalling ? 'Opening Installer...' : 'Install App via Chrome'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePwaInstallClick}
                      className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                    >
                      <Download className="w-5 h-5 text-white" />
                      <span>Install App on this Device</span>
                    </button>
                  )}
                </div>
              )}

              {/* Device Specific Step-by-Step Instructions */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                  Installation Guide:
                </div>

                {/* Tablet & Android Phone */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-[#15803D] rounded-lg shrink-0">
                    <Tablet className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-[#334155]">
                    <strong className="text-[#0F172A] block mb-0.5">Android Tablet / Mobile (Chrome)</strong>
                    Tap the three dots menu <strong>(⋮)</strong> at top right in Chrome, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>

                {/* iPhone / iPad */}
                {isIos && (
                  <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-[#B45309] rounded-lg shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-[#78350F]">
                      <strong className="text-[#92400E] block mb-0.5">iPhone & iPad (Safari)</strong>
                      Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5" />, scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B] font-mono">
            Version 1.0.0 • WebRajya Suite
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#F1F5F9] text-[#172B4D] border border-[#CBD5E1] rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
