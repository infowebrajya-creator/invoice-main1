import React from 'react';
import { Headphones, Phone, Mail, User, MessageSquare, X, ShieldCheck, FileText } from 'lucide-react';
import { Modal } from './Modal';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer & Technical Support"
      subtitle="Direct help line for WebRajya Invoice"
      maxWidth="md"
    >
      <div className="space-y-4 font-sans text-[#172B4D]">
        {/* Support Header Profile Card */}
        <div className="bg-linear-to-r from-[#DC2626] to-[#991B1B] text-white rounded-2xl p-4 shadow-md flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-200">Official Support</div>
            <h3 className="text-lg font-black leading-tight text-white">Aryan Rajput</h3>
            <p className="text-xs text-red-100 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 inline" /> Dedicated Invoicing Specialist
            </p>
          </div>
        </div>

        {/* Contact Details List */}
        <div className="space-y-2.5">
          {/* Phone Detail */}
          <div className="p-3.5 bg-white border border-[#D8E1EC] rounded-xl flex items-center justify-between shadow-xs hover:border-[#DC2626] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#64748B] uppercase">Mobile Number</div>
                <div className="text-sm font-black text-[#172B4D] font-mono">+91 9630013483</div>
              </div>
            </div>
            <a
              href="tel:9630013483"
              className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          </div>

          {/* WhatsApp Direct */}
          <div className="p-3.5 bg-white border border-[#D8E1EC] rounded-xl flex items-center justify-between shadow-xs hover:border-[#25D366] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16a34a] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#64748B] uppercase">WhatsApp Chat</div>
                <div className="text-sm font-black text-[#172B4D] font-mono">9630013483</div>
              </div>
            </div>
            <a
              href="https://wa.me/919630013483?text=Hi%20Aryan,%20I%20need%20support%20with%20WebRajya%20Invoice"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </a>
          </div>

          {/* Email Detail */}
          <div className="p-3.5 bg-white border border-[#D8E1EC] rounded-xl flex items-center justify-between shadow-xs hover:border-[#2563EB] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#64748B] uppercase">Email Support</div>
                <div className="text-sm font-bold text-[#172B4D] font-mono">infowebrajya@gmail.com</div>
              </div>
            </div>
            <a
              href="mailto:infowebrajya@gmail.com?subject=WebRajya%20Invoice%20Support"
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
          </div>

          {/* Contact Person Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Support Lead</div>
              <div className="text-sm font-black text-slate-800">Aryan Rajput</div>
            </div>
          </div>

          {/* Sales & Product Brochure Flyer */}
          <a
            href="/brochure.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#334155] text-white rounded-xl flex items-center justify-between shadow-sm transition-all cursor-pointer border border-slate-700/60"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Marketing Asset</div>
                <div className="text-sm font-black text-white">Sales & Product Brochure</div>
                <div className="text-[11px] text-slate-300">Executive 2-page A4 flyer for print & clients</div>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0">
              View Flyer ↗
            </div>
          </a>
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-center text-xs text-[#64748B] border-t border-[#D8E1EC]">
          Available for instant setup help, custom updates, and technical assistance.
        </div>
      </div>
    </Modal>
  );
};
