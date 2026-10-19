import React, { useState } from 'react';
import { 
  Download, Laptop, Smartphone, Tablet, CheckCircle2, 
  WifiOff, Printer, Zap, X, Share, PlusSquare, Monitor, ShieldCheck, Sparkles, Copy, Check
} from 'lucide-react';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  initialTab?: 'windows' | 'ios' | 'android' | 'pwa';
}

import { WINDOWS_EXE_URL } from '../../utils/constants';
export { WINDOWS_EXE_URL };

const AppleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.63-.78 1.06-1.86.94-2.94-1 .04-2.17.67-2.85 1.46-.59.69-1.12 1.78-.98 2.83 1.12.09 2.24-.59 2.89-1.35z"/>
  </svg>
);

const WindowsIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.799"/>
  </svg>
);

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  hasNativePrompt,
  isInstalled,
  isIos,
  initialTab
}) => {
  const detectPlatform = (): 'windows' | 'ios' | 'android' => {
    if (initialTab === 'ios') return 'ios';
    if (initialTab === 'windows') return 'windows';
    if (initialTab === 'android') return 'android';
    if (initialTab === 'pwa') return isIos ? 'ios' : 'android';
    if (typeof navigator !== 'undefined') {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) || isIos) return 'ios';
      if (/win/i.test(navigator.userAgent)) return 'windows';
    }
    return 'windows';
  };

  const [activeTab, setActiveTab] = useState<'windows' | 'ios' | 'android'>(detectPlatform);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialTab === 'ios') setActiveTab('ios');
      else if (initialTab === 'windows') setActiveTab('windows');
      else if (initialTab === 'android') setActiveTab('android');
      else if (initialTab === 'pwa') setActiveTab(isIos ? 'ios' : 'android');
      else setActiveTab(detectPlatform());
    }
  }, [isOpen, initialTab, isIos]);

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

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      });
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
                WebRajya Invoice
              </h2>
              <p className="text-xs text-blue-100/80">
                Windows .exe, Apple iOS & Android Apps
              </p>
            </div>
          </div>

          {/* 3-Platform Mode Switcher Tabs */}
          <div className="flex gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15 text-xs font-bold mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('windows')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'windows'
                  ? 'bg-white text-[#123B70] shadow-sm font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <WindowsIcon className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Windows (.exe)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-[#123B70] shadow-sm font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <AppleIcon className="w-3.5 h-3.5 text-slate-800" />
              <span>Apple iOS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-[#123B70] shadow-sm font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android / PWA</span>
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
                      <span>Download WebRajya for Windows (.exe)</span>
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
                          <strong className="text-[#0F172A] block">100% Offline Invoicing</strong>
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

          {/* TAB 2: APPLE IOS (IPHONE & IPAD) */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white border border-blue-900/40 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 font-black text-sm text-white">
                  <AppleIcon className="w-5 h-5 text-white" />
                  <span>WebRajya for iPhone & iPad (Safari Standalone App)</span>
                </div>
                <p className="text-[11px] text-blue-100/90 leading-relaxed">
                  Run WebRajya as a native full-screen app on iOS with zero Safari navigation bars or tabs, 100% offline database caching, and touch-optimized checkout.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/20"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-200" />}
                    <span>{copiedUrl ? 'Web Link Copied!' : 'Copy Web App Link for Safari'}</span>
                  </button>
                  <span className="text-[10px] text-blue-200/80">Open this link in Safari on your iPhone/iPad</span>
                </div>
              </div>

              {/* iOS Capabilities Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                  Apple iOS App Highlights:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                    <Laptop className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#0F172A] block">Full-Screen Standalone</strong>
                      <span className="text-[#64748B] text-[10px]">Zero Safari URL bars. Maximizes counter touch space.</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                    <WifiOff className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#0F172A] block">100% Offline Billing</strong>
                      <span className="text-[#64748B] text-[10px]">Works in airplane mode; syncs automatically upon reconnect.</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                    <Printer className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#0F172A] block">AirPrint & Bluetooth</strong>
                      <span className="text-[#64748B] text-[10px]">Instant receipt rollout to mobile thermal & wireless printers.</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#0F172A] block">Retina HD Icon</strong>
                      <span className="text-[#64748B] text-[10px]">Lives directly on your iPhone or iPad home screen.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step by Step iOS Install Walkthrough */}
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#92400E]">
                  <Share className="w-4 h-4 text-[#B45309]" />
                  <span>How to Install on iPhone & iPad (Safari Guide):</span>
                </div>
                
                <ol className="space-y-2 text-[#78350F] text-xs">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-[#92400E] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>Open <strong>Safari</strong> on your iPhone or iPad and open WebRajya Invoice.</div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-[#92400E] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom of Safari (or top bar on iPad).</div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-[#92400E] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>Scroll down in the action sheet and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#0F172A]" />.</div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-[#92400E] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>Tap <strong>"Add"</strong> in the top-right corner. WebRajya is now installed on your iOS counter!</div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: ANDROID & CHROME PWA */}
          {activeTab === 'android' && (
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

              {/* Android Specific Step-by-Step Instructions */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                  Android Installation Guide:
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-[#15803D] rounded-lg shrink-0">
                    <Tablet className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-[#334155]">
                    <strong className="text-[#0F172A] block mb-0.5">Android Tablet / Mobile (Chrome)</strong>
                    Tap the three dots menu <strong>(⋮)</strong> at top right in Chrome, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B] font-mono">
            Version 1.0.0 • Multi-Platform Edition
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
