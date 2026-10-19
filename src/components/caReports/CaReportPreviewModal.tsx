import React from 'react';
import { Printer, Download, Eye, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CaReportData } from '../../types/caReport';
import { triggerCaReportPrint, generateCaReportHtml } from '../../lib/caReportPdf';
import { exportCaMasterExcelWorkbook } from '../../lib/caReportExcel';

interface CaReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: CaReportData | null;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const CaReportPreviewModal: React.FC<CaReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reportData,
  onToast
}) => {
  if (!reportData) return null;

  const handlePrint = () => {
    triggerCaReportPrint(reportData);
    onToast('info', 'Print / PDF Triggered', 'Select "Save as PDF" in print dialog to save.');
  };

  const handleDownloadExcel = () => {
    exportCaMasterExcelWorkbook(reportData);
    onToast('success', 'Excel Downloaded', 'Multi-sheet CA Report workbook exported.');
  };

  const reportHtml = generateCaReportHtml(reportData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CA Report Preview"
      subtitle={`Period: ${reportData.period.label} | ${reportData.shopProfile.shopName}`}
      maxWidth="5xl"
    >
      <div className="space-y-3 font-sans text-xs">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl shadow-2xs">
          <div className="text-xs text-[#64748B]">
            Format: <strong className="text-[#1E3A8A]">A4 Accounting Statement</strong> | Status: <strong className="text-[#15803D]">Reconciled</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#15803D] border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Live Document Preview Container */}
        <div className="bg-[#E2E8F0] p-2 sm:p-4 rounded-xl border border-[#CBD5E1] max-h-[72vh] overflow-y-auto flex justify-center shadow-inner">
          <div className="bg-white shadow-xl rounded border border-gray-300 w-full max-w-[850px] overflow-hidden">
            <iframe
              srcDoc={reportHtml}
              title="CA Report Statement"
              className="w-full h-[650px] border-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
