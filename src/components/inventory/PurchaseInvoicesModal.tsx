import React, { useState, useEffect } from 'react';
import { FileText, Calendar, DollarSign, Package, X, ChevronRight, Eye } from 'lucide-react';
import { usePurchaseStore } from '../../store/usePurchaseStore';
import type { PurchaseInvoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PurchaseInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseInvoicesModal: React.FC<PurchaseInvoicesModalProps> = ({
  isOpen,
  onClose
}) => {
  const { purchaseInvoices, loadPurchases } = usePurchaseStore();
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPurchases();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs font-sans text-[#172B4D] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-[#D8E1EC]">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-[#F5F9FF] border-b border-[#D8E1EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#2563EB] text-white rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#172B4D]">
                Purchase Invoices & Inward History
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Track all incoming supplier bills and stock additions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#B91C1C] hover:bg-white rounded-lg border border-transparent hover:border-[#D8E1EC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          {selectedInvoice ? (
            /* Invoice Details Subview */
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← Back to All Purchase Invoices
              </button>

              <div className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-[#172B4D]">{selectedInvoice.supplierName}</div>
                  <div className="text-xs text-[#64748B] font-mono mt-0.5">
                    Bill #{selectedInvoice.invoiceNumber} • Date: {selectedInvoice.invoiceDate}
                  </div>
                  {selectedInvoice.supplierGstin && (
                    <div className="text-[10px] text-[#64748B] font-mono">
                      GSTIN: {selectedInvoice.supplierGstin}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#64748B] uppercase font-bold">Total Inward Amount</div>
                  <div className="text-lg font-black text-[#15803D] font-mono">
                    {formatCurrency(selectedInvoice.grandTotal)}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono">
                    Subtotal: {formatCurrency(selectedInvoice.subtotal)} | GST: {formatCurrency(selectedInvoice.totalGst)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white border border-[#D8E1EC] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F1F5F9] text-[#172B4D] uppercase font-bold text-[11px] border-b border-[#D8E1EC]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Free Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] font-mono">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-sans">
                          <div className="font-bold text-[#172B4D]">{item.matchedProductName || item.rawName}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            HSN: {item.hsnCode || '-'} • GST: {item.gstRate}%
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#172B4D]">{item.qty} {item.unit}</td>
                        <td className="p-2.5 text-right text-[#15803D]">{item.freeQty ? `+${item.freeQty}` : '-'}</td>
                        <td className="p-2.5 text-right text-[#64748B]">₹{item.purchaseRate}</td>
                        <td className="p-2.5 text-right font-bold text-[#172B4D]">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Invoices List */
            <div>
              {purchaseInvoices.length === 0 ? (
                <div className="py-12 text-center text-[#64748B] space-y-2">
                  <Package className="w-10 h-10 mx-auto text-[#94A3B8]" />
                  <div className="text-sm font-bold text-[#172B4D]">No purchase bills recorded yet</div>
                  <p className="text-xs">
                    Scan your first supplier invoice using the AI Bill Scanner to build purchase history.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchaseInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-3 bg-white hover:bg-[#F8FAFC] border border-[#D8E1EC] hover:border-[#2563EB] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#172B4D] group-hover:text-[#2563EB] transition-colors truncate">
                            {inv.supplierName}
                          </span>
                          <span className="text-[10px] font-mono bg-[#DBEAFE] text-[#1E40AF] px-1.5 py-0.2 rounded font-bold">
                            #{inv.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                          Date: {inv.invoiceDate} • {inv.totalItems} line items
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <div className="text-xs font-black text-[#15803D] font-mono">
                            {formatCurrency(inv.grandTotal)}
                          </div>
                          <div className="text-[9px] text-[#64748B]">Inwarded</div>
                        </div>
                        <Eye className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
