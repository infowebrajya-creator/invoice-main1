import React, { useState } from 'react';
import { 
  Download, Laptop, Smartphone, Tablet, CheckCircle2, 
  WifiOff, Printer, Zap, X, Share, MoreVertical, PlusSquare
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  hasNativePrompt,
  isInstalled,
  isIos
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#D8E1EC] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Card (Matching WebRajya theme) */}
        <div className="bg-[#123B70] text-white p-5 sm:p-6 relative overflow-hidden">
          {/* Subtle background glow */}
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
                  PWA READY
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Offline POS
                </span>
              </div>
              <h2 className="text-lg font-black text-white leading-tight">
                WebRajya Invoice POS
              </h2>
              <p className="text-xs text-blue-100/80">
                Stationery Billing • Inventory • 80mm Print
              </p>
            </div>
          </div>

          <p className="text-xs text-blue-100/90 leading-relaxed mt-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
            Install on your <strong>Laptop, Tablet, or Mobile</strong> for high-speed offline billing, full-screen workspace, and instant 1-click launch.
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {installSuccess ? (
            <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto animate-bounce" />
              <div className="text-sm font-black text-[#15803D]">Installation Confirmed!</div>
              <p className="text-xs text-[#166534]">
                WebRajya Invoice is now added to your desktop / home screen.
              </p>
            </div>
          ) : isInstalled ? (
            <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#2563EB] shrink-0" />
              <div>
                <div className="text-xs font-black text-[#1E40AF]">App Already Installed</div>
                <div className="text-[11px] text-[#3B82F6]">You can launch it directly from your device home screen or applications menu.</div>
              </div>
            </div>
          ) : (
            <div>
              {/* Primary Native Install Button */}
              {hasNativePrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                >
                  <Download className="w-5 h-5 text-white animate-bounce" />
                  <span>{isInstalling ? 'Opening Installer...' : 'Install App via Chrome'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
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
              Installation Guide by Device:
            </div>

            {/* Laptop & PC */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3">
              <div className="p-2 bg-blue-100 text-[#2563EB] rounded-lg shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#334155]">
                <strong className="text-[#0F172A] block mb-0.5">Laptop / Desktop (Chrome / Edge)</strong>
                Click the <Download className="w-3.5 h-3.5 inline mx-1 text-[#2563EB]" /> <strong>Install</strong> icon in Chrome's address bar (top right), or click Chrome Menu <strong>(⋮) → Save and share → Install WebRajya POS</strong>.
              </div>
            </div>

            {/* Tablet & Android Phone */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-[#15803D] rounded-lg shrink-0">
                <Tablet className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#334155]">
                <strong className="text-[#0F172A] block mb-0.5">Android Tablet / Mobile (Chrome)</strong>
                Tap the three dots menu <strong>(⋮)</strong> in Chrome at top right, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
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

          {/* Key PWA Features */}
          <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
            <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
              Installed App Benefits:
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span className="font-semibold text-[#172B4D]">100% Offline Billing</span>
              </div>
              <div className="p-2 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="font-semibold text-[#172B4D]">80mm & A5 Print</span>
              </div>
              <div className="p-2 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#15803D] shrink-0" />
                <span className="font-semibold text-[#172B4D]">Fast Shortcut Keys</span>
              </div>
              <div className="p-2 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <span className="font-semibold text-[#172B4D]">Full-Screen POS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B] font-mono">
            Version 1.2.0 • PWA Standard
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
