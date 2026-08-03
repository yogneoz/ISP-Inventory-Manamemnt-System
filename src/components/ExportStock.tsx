import React, { useState } from 'react';
import { Branch, InventoryStock, Product } from '../types';
import { DownloadCloud, FileSpreadsheet, Download, Filter, Layers, Package, DollarSign, AlertTriangle, Building2, CheckCircle2 } from 'lucide-react';

interface ExportStockProps {
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  selectedBranchId?: string;
  isDarkMode?: boolean;
}

export const ExportStock: React.FC<ExportStockProps> = ({
  products,
  branches,
  stock,
  selectedBranchId = 'ALL',
  isDarkMode = false,
}) => {
  const [filterBranch, setFilterBranch] = useState<string>(selectedBranchId);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Calculate stock on hand for product
  const getProductStock = (prodId: string) => {
    return stock
      .filter((s) => s.productId === prodId && (filterBranch === 'ALL' || s.branchId === filterBranch))
      .reduce((sum, item) => sum + item.quantityOnHand, 0);
  };

  const filteredProducts = products.filter((p) => {
    const matchesBranch = true; // Stock calculated dynamically
    const matchesCat = filterCategory === 'ALL' || p.category === filterCategory;
    const matchesGrp = filterGroup === 'ALL' || (p.productGroup || 'Product Item') === filterGroup;
    return matchesCat && matchesGrp;
  });

  const totalSKUs = filteredProducts.length;
  const totalQtyOnHand = filteredProducts.reduce((sum, p) => sum + getProductStock(p.id), 0);
  const totalCostValuation = filteredProducts.reduce((sum, p) => sum + getProductStock(p.id) * p.costPrice, 0);
  const totalSellingValuation = filteredProducts.reduce((sum, p) => sum + getProductStock(p.id) * p.sellingPrice, 0);
  const lowStockCount = filteredProducts.filter((p) => getProductStock(p.id) <= p.minReorderLevel).length;

  const generateAndDownloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // 1. Export Master Inventory Stock Matrix
  const handleExportStockMatrix = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Product Group',
      'Category',
      'UoM',
      'Cost Price (NPR)',
      'Selling Price (NPR)',
      'VAT %',
      'Stock On Hand',
      'Reorder Threshold',
      'Cost Valuation (NPR)',
      'Selling Valuation (NPR)',
    ];

    const rows = filteredProducts.map((p) => {
      const qty = getProductStock(p.id);
      return [
        p.sku,
        p.barcode,
        p.name,
        p.productGroup || 'Product Item',
        p.category,
        p.unit,
        p.costPrice,
        p.sellingPrice,
        p.taxRate,
        qty,
        p.minReorderLevel,
        qty * p.costPrice,
        qty * p.sellingPrice,
      ];
    });

    generateAndDownloadCsv(`iZone_Master_Stock_Matrix_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // 2. Export Low Stock & Reorder List
  const handleExportLowStock = () => {
    const headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'UoM', 'Current Stock', 'Reorder Level', 'Deficit Qty', 'Suggested Reorder Cost'];
    const lowItems = filteredProducts.filter((p) => getProductStock(p.id) <= p.minReorderLevel);

    const rows = lowItems.map((p) => {
      const qty = getProductStock(p.id);
      const deficit = Math.max(0, p.minReorderLevel - qty + 10);
      return [p.sku, p.barcode, p.name, p.category, p.unit, qty, p.minReorderLevel, deficit, deficit * p.costPrice];
    });

    generateAndDownloadCsv(`iZone_Reorder_Stock_List_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // 3. Export Branch Breakdown Matrix
  const handleExportBranchBreakdown = () => {
    const branchHeaders = branches.map((b) => `${b.code} (${b.name})`);
    const headers = ['SKU', 'Product Name', 'Category', ...branchHeaders, 'Total Stock On Hand'];

    const rows = filteredProducts.map((p) => {
      const branchQtys = branches.map((b) => {
        const item = stock.find((s) => s.productId === p.id && s.branchId === b.id);
        return item ? item.quantityOnHand : 0;
      });
      const total = branchQtys.reduce((sum, q) => sum + q, 0);
      return [p.sku, p.name, p.category, ...branchQtys, total];
    });

    generateAndDownloadCsv(`iZone_Branch_Stock_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <DownloadCloud className="h-5 w-5 text-indigo-500" />
            <span>Export Stock Data & Reports</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Generate and export complete inventory stock matrices, valuation logs, and branch balance reports.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-none">
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Catalog SKUs</span>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{totalSKUs} Items</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total On-Hand Qty</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{totalQtyOnHand.toLocaleString()}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Stock Cost Valuation</span>
          <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">रु {totalCostValuation.toLocaleString()}</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Low Stock Reorders</span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{lowStockCount} Items</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`p-3 rounded-2xl border shadow-sm flex flex-wrap items-center gap-3 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>

        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <option value="ALL">All Groups</option>
          <option value="Product Item">Product Item</option>
          <option value="Fixed Asset">Fixed Asset</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-none">
        <button
          onClick={handleExportStockMatrix}
          className="flex flex-col text-left p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-200" />
            <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <span className="font-bold text-sm">Export Master Stock Matrix</span>
          <span className="text-[11px] text-indigo-100 mt-1">
            Complete CSV of all SKUs, prices, VAT rates, and current branch stock levels.
          </span>
        </button>

        <button
          onClick={handleExportLowStock}
          className="flex flex-col text-left p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-6 w-6 text-rose-200" />
            <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <span className="font-bold text-sm">Export Reorder & Low Stock List</span>
          <span className="text-[11px] text-rose-100 mt-1">
            CSV report of items at or below reorder threshold for procurement planning.
          </span>
        </button>

        <button
          onClick={handleExportBranchBreakdown}
          className="flex flex-col text-left p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Building2 className="h-6 w-6 text-emerald-200" />
            <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <span className="font-bold text-sm">Export Branch Breakdown Matrix</span>
          <span className="text-[11px] text-emerald-100 mt-1">
            Side-by-side branch stock distribution across headquarters and regional hubs.
          </span>
        </button>
      </div>

      {/* Table Preview */}
      <div className={`flex-1 min-h-0 flex flex-col rounded-2xl border shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex-1 min-h-0 overflow-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="p-3 sticky top-0 bg-inherit">SKU / Barcode</th>
                <th className="p-3 sticky top-0 bg-inherit">Product Name</th>
                <th className="p-3 sticky top-0 bg-inherit">Group</th>
                <th className="p-3 sticky top-0 bg-inherit">Category</th>
                <th className="p-3 sticky top-0 bg-inherit text-center">On-Hand Stock</th>
                <th className="p-3 sticky top-0 bg-inherit text-right">Cost Price</th>
                <th className="p-3 sticky top-0 bg-inherit text-right">Cost Valuation</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredProducts.map((p) => {
                const qty = getProductStock(p.id);
                return (
                  <tr key={p.id} className={`transition-colors ${
                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.sku}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="p-3 text-slate-500">{p.productGroup || 'Product Item'}</td>
                    <td className="p-3 text-slate-500">{p.category}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {qty} {p.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">रु {p.costPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">रु {(qty * p.costPrice).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
