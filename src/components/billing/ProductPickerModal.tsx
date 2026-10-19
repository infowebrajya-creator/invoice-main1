import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Package, Plus } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Product } from '../../types';
import { Badge } from '../common/Badge';

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onOpenAddProduct?: () => void;
  initialSearch?: string;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onOpenAddProduct,
  initialSearch = ''
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch(initialSearch);
      setSelectedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 80);
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.hsnCode && p.hsnCode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 80);
  }, [products, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        onSelectProduct(selected);
        onClose();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Catalog Search & Keyboard Picker [F4]"
      subtitle="Use Up/Down Arrow keys and press Enter to select an item into bill"
      maxWidth="4xl"
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Product Name, SKU, Barcode, HSN, Category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] font-mono shadow-xs"
            />
          </div>
          {onOpenAddProduct && (
            <button
              onClick={() => { onClose(); onOpenAddProduct(); }}
              className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          )}
        </div>

        <div className="border border-[#D8E1EC] rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto font-sans text-xs bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F1F5F9] text-[#172B4D] uppercase font-bold sticky top-0 border-b border-[#D8E1EC] text-[11px]">
              <tr>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5">Barcode</th>
                <th className="p-2.5">Product Description</th>
                <th className="p-2.5">Pack</th>
                <th className="p-2.5 text-center">GST %</th>
                <th className="p-2.5 text-right">MRP</th>
                <th className="p-2.5 text-right">Selling Rate</th>
                <th className="p-2.5 text-right">Stock</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748B]">
                    <Package className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                    No products matching "{search}" found.
                  </td>
                </tr>
              ) : (
                filtered.map((prod, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <tr
                      key={prod.id}
                      onClick={() => { onSelectProduct(prod); onClose(); }}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#DBEAFE] border-l-4 border-[#2563EB] font-medium text-[#123B70]' 
                          : 'hover:bg-[#F0F6FF]'
                      }`}
                    >
                      <td className="p-2.5 font-mono text-[#2563EB] font-bold">{prod.sku || '-'}</td>
                      <td className="p-2.5 font-mono text-[#64748B]">{prod.barcode || '-'}</td>
                      <td className="p-2.5 font-medium text-[#172B4D]">
                        {prod.name}
                        {isSelected && <span className="ml-2 text-[10px] text-[#2563EB] font-mono font-bold">[Press Enter]</span>}
                      </td>
                      <td className="p-2.5 font-mono text-[#64748B] text-[11px]">{prod.packInfo || '1 Pcs'}</td>
                      <td className="p-2.5 text-center font-mono">
                        <Badge variant="cyan">{prod.gstRate}%</Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono text-[#64748B] line-through">₹{prod.mrp}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#15803D]">₹{prod.saleRate}</td>
                      <td className="p-2.5 text-right font-mono">
                        <span className={prod.stockQty <= prod.minStockLevel ? 'text-[#B91C1C] font-bold' : 'text-[#172B4D]'}>
                          {prod.stockQty} {prod.unit}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <button
                          type="button"
                          className="px-2 py-1 bg-[#F5F9FF] hover:bg-[#2563EB] text-[#172B4D] hover:text-white border border-[#D8E1EC] rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
