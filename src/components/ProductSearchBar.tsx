import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { Search, Barcode, Plus } from 'lucide-react';

interface ProductSearchBarProps {
  products: Product[];
  onAddOrIncrementProduct: (product: Product) => void;
  placeholder?: string;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  products,
  onAddOrIncrementProduct,
  placeholder = 'Scan Barcode or Search & Enter Product Name / SKU:',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter matching products
  const matchingProducts = products.filter((p) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  });

  const handleSelect = (product: Product) => {
    onAddOrIncrementProduct(product);
    setQuery('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim()) return;

      const exactBarcodeMatch = products.find(
        (p) => p.barcode.toLowerCase() === query.trim().toLowerCase()
      );
      const exactSkuMatch = products.find(
        (p) => p.sku.toLowerCase() === query.trim().toLowerCase()
      );

      if (exactBarcodeMatch) {
        handleSelect(exactBarcodeMatch);
        return;
      }

      if (exactSkuMatch) {
        handleSelect(exactSkuMatch);
        return;
      }

      // First matching product if available
      if (matchingProducts.length > 0) {
        handleSelect(matchingProducts[0]);
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center gap-1 text-slate-400">
          <Search className="h-4 w-4" />
          <Barcode className="h-4 w-4 text-blue-600 hidden sm:inline" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-blue-200 bg-white pl-10 sm:pl-16 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium shadow-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-blue-200 bg-white shadow-xl">
          {matchingProducts.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center font-medium">
              No product found matching "{query}". Check SKU code or Barcode.
            </div>
          ) : (
            matchingProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleSelect(prod)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                      {prod.sku}
                    </span>
                    <span>{prod.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>Barcode: <strong className="font-mono text-slate-700">{prod.barcode}</strong></span>
                    <span>Category: {prod.category}</span>
                    <span>Unit: {prod.unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {prod.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 justify-end">
                    <Plus className="h-3 w-3" /> Select / Add
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
