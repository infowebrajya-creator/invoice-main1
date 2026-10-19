import React, { useState, useEffect } from 'react';
import { 
  Boxes, AlertTriangle, TrendingUp, DollarSign, 
  RefreshCw, PackageCheck, Camera, FileText 
} from 'lucide-react';
import { useProductStore } from '../../store/useProductStore';
import { db } from '../../lib/db';
import { StockMovement } from '../../types';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PurchaseBillScannerModal } from './PurchaseBillScannerModal';
import { PurchaseInvoicesModal } from './PurchaseInvoicesModal';

interface InventorySectionProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ onToast }) => {
  const { products, loadProducts } = useProductStore();
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, []);

  const loadMovements = async () => {
    const logs = await db.stockMovements.orderBy('createdAt').reverse().limit(50).toArray();
    setMovements(logs);
  };

  const lowStockItems = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStockLevel);
  const outOfStockItems = products.filter(p => p.stockQty <= 0);

  const totalCostValuation = products.reduce((acc, p) => acc + (p.purchaseRate * p.stockQty), 0);
  const totalMrpValuation = products.reduce((acc, p) => acc + (p.mrp * p.stockQty), 0);

  const filteredProducts = products.filter(p => {
    if (stockFilter === 'low') return p.stockQty > 0 && p.stockQty <= p.minStockLevel;
    if (stockFilter === 'out') return p.stockQty <= 0;
    return true;
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] gap-3 font-sans text-[#172B4D] pb-16 md:pb-2">
      {/* Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-[#D8E1EC] rounded-xl p-3 sm:p-4 shadow-xs shrink-0 gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#172B4D] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#2563EB]" /> Stationery Inventory & Valuation
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor real-time stock balances, valuations, and scan supplier purchase bills
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsInvoicesModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-[#F5F9FF] text-[#172B4D] border border-[#D8E1EC] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <FileText className="w-4 h-4 text-[#64748B]" /> Inward Bills
          </button>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" /> Scan Purchase Bill
          </button>
        </div>
      </div>
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Items</span>
            <div className="p-1.5 sm:p-2 bg-[#DBEAFE] text-[#2563EB] rounded-lg">
              <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#172B4D] font-mono mt-1.5">{products.length} SKUs</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Active stationery catalog</p>
        </div>

        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Low Stock</span>
            <div className="p-1.5 sm:p-2 bg-[#FEF3C7] text-[#B45309] rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#B45309] font-mono mt-1.5">{lowStockItems.length} Items</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Below reorder minimum</p>
        </div>

        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Out of Stock</span>
            <div className="p-1.5 sm:p-2 bg-[#FEE2E2] text-[#B91C1C] rounded-lg">
              <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#B91C1C] font-mono mt-1.5">{outOfStockItems.length} Items</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 truncate">Requires replenishment</p>
        </div>

        <div className="p-3 sm:p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-wider">Stock Valuation</span>
            <div className="p-1.5 sm:p-2 bg-[#DCFCE7] text-[#15803D] rounded-lg">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#15803D] font-mono mt-1.5">{formatCurrency(totalCostValuation)}</div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 font-mono truncate">MRP: {formatCurrency(totalMrpValuation)}</p>
        </div>
      </div>

      {/* Main Content Split: Stock List & Movement Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Stock Status Table */}
        <div className="col-span-1 lg:col-span-7 bg-white border border-[#D8E1EC] rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="p-3 bg-[#F5F9FF] border-b border-[#D8E1EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider">Stationery Stock Balances</h3>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D8E1EC] text-[11px] self-stretch sm:self-auto justify-between">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2 py-1 rounded transition-colors font-bold cursor-pointer text-center flex-1 sm:flex-initial ${stockFilter === 'all' ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-2 py-1 rounded transition-colors font-bold cursor-pointer text-center flex-1 sm:flex-initial ${stockFilter === 'low' ? 'bg-[#B45309] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                Low ({lowStockItems.length})
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-2 py-1 rounded transition-colors font-bold cursor-pointer text-center flex-1 sm:flex-initial ${stockFilter === 'out' ? 'bg-[#B91C1C] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                Out ({outOfStockItems.length})
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F1F5F9] text-[#172B4D] uppercase font-bold sticky top-0 border-b border-[#D8E1EC] text-[11px]">
                <tr>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Current Stock</th>
                  <th className="p-2.5 text-right">Min Level</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredProducts.map((p) => {
                  const isOut = p.stockQty <= 0;
                  const isLow = p.stockQty > 0 && p.stockQty <= p.minStockLevel;
                  return (
                    <tr key={p.id} className="hover:bg-[#F0F6FF] transition-colors">
                      <td className="p-2.5 font-semibold text-[#172B4D]">{p.name}</td>
                      <td className="p-2.5 text-[#64748B] text-[11px]">{p.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#172B4D]">{p.stockQty} {p.unit}</td>
                      <td className="p-2.5 text-right font-mono text-[#64748B]">{p.minStockLevel} {p.unit}</td>
                      <td className="p-2.5 text-center font-mono">
                        {isOut ? (
                          <Badge variant="rose">OUT OF STOCK</Badge>
                        ) : isLow ? (
                          <Badge variant="amber">LOW STOCK</Badge>
                        ) : (
                          <Badge variant="emerald">HEALTHY</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden p-2.5 space-y-2 overflow-y-auto max-h-[380px]">
            {filteredProducts.map((p) => {
              const isOut = p.stockQty <= 0;
              const isLow = p.stockQty > 0 && p.stockQty <= p.minStockLevel;
              return (
                <div key={p.id} className="p-2.5 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-xs font-bold text-[#172B4D] truncate">{p.name}</div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{p.category} • Min: {p.minStockLevel} {p.unit}</div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="text-xs font-mono font-black text-[#172B4D]">{p.stockQty} {p.unit}</div>
                    {isOut ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">OUT</span>
                    ) : isLow ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">LOW</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">OK</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Movement History Log */}
        <div className="col-span-1 lg:col-span-5 bg-white border border-[#D8E1EC] rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="p-3 bg-[#F5F9FF] border-b border-[#D8E1EC] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#15803D]" /> Recent Stock Movements Log
            </h3>
            <button
              onClick={loadMovements}
              className="text-[#64748B] hover:text-[#172B4D] p-1 rounded hover:bg-white border border-transparent hover:border-[#D8E1EC] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {movements.length === 0 ? (
              <div className="py-12 text-center text-[#64748B] text-xs">
                No stock movement logs recorded yet.
              </div>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="p-2.5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#172B4D] truncate">{m.productName}</span>
                    <span className={`font-mono font-bold ${m.quantityChange > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Reason: {m.reason}</span>
                    <span className="font-mono">{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Purchase Bill Scanner Modal */}
      <PurchaseBillScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          loadProducts(true);
          loadMovements();
        }}
        onToast={onToast}
      />

      {/* Past Purchase Invoices History Modal */}
      <PurchaseInvoicesModal
        isOpen={isInvoicesModalOpen}
        onClose={() => setIsInvoicesModalOpen(false)}
      />
    </div>
  );
};
