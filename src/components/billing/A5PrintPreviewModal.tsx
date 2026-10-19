import React, { useState, useEffect } from 'react';
import { Printer, Receipt, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Invoice, ShopProfile, PrintSettings, PaperSize } from '../../types';
import { triggerInvoicePrint } from '../../lib/print';
import { A5PrintInvoice } from './A5PrintInvoice';
import { Thermal80mmInvoice } from './Thermal80mmInvoice';

interface A5PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  shopProfile: ShopProfile;
  printSettings: PrintSettings;
}

export const A5PrintPreviewModal: React.FC<A5PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  shopProfile,
  printSettings
}) => {
  const [selectedSize, setSelectedSize] = useState<PaperSize>(printSettings?.paperSize || 'A5');

  useEffect(() => {
    if (isOpen) {
      setSelectedSize(printSettings?.paperSize || 'A5');
    }
  }, [isOpen, printSettings?.paperSize]);

  if (!invoice) return null;

  const is80mm = selectedSize === '80mm' || selectedSize === 'Thermal';

  const handlePrint = () => {
    triggerInvoicePrint(invoice, shopProfile, { ...printSettings, paperSize: selectedSize });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice Print Preview - #${invoice.invoiceNumber}`}
      subtitle={is80mm ? "80mm / 3-Inch POS Receipt Roll (Thermal / Plain Paper)" : "Standard Stationery Wholesale Format (148mm x 210mm)"}
      maxWidth={is80mm ? "lg" : "4xl"}
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#172B4D]">Paper Format:</span>
            <div className="inline-flex bg-white border border-[#D8E1EC] p-0.5 rounded-lg text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedSize('80mm')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  is80mm ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> 80mm Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedSize('A5')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  !is80mm ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> A5 Half-Page
              </button>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>

        {/* Invoice Preview Box */}
        <div className="bg-[#F1F5F9] p-4 rounded-lg border border-[#D8E1EC] max-h-[65vh] overflow-y-auto flex justify-center">
          {is80mm ? (
            <Thermal80mmInvoice invoice={invoice} shopProfile={shopProfile} printSettings={printSettings} />
          ) : (
            <div className="bg-white shadow-md rounded p-2 text-black border border-slate-400">
              <A5PrintInvoice invoice={invoice} shopProfile={shopProfile} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
