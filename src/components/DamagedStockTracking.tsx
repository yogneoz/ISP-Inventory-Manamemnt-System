import React, { useState } from 'react';
import { Product, Branch, InventoryStock, User } from '../types';
import { NavTab } from './Sidebar';
import {
  AlertTriangle,
  Building2,
  Edit,
  CheckCircle2,
  X,
  Search,
  Filter,
  Truck,
  Plus,
  RefreshCw,
  AlertOctagon,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface DamagedStockTrackingProps {
  currentUser?: User | null;
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  selectedBranchId: string;
  onUpdateStockLevel?: (stockId: string, newQty: number, reason: string) => Promise<void>;
  onNavigateTab?: (tab: NavTab) => void;
  isDarkMode?: boolean;
}

export const DamagedStockTracking: React.FC<DamagedStockTrackingProps> = ({
  currentUser,
  products,
  branches,
  stock,
  selectedBranchId,
  onUpdateStockLevel,
  onNavigateTab,
  isDarkMode = false,
}) => {
  const [editingStock, setEditingStock] = useState<{
    stockItem: InventoryStock;
    product: Product;
    branch: Branch;
  } | null>(null);

  const [newDamagedQty, setNewDamagedQty] = useState<number>(0);
  const [reason, setReason] = useState<string>('Damaged stock balance verification');

  const [showZeroDamaged, setShowZeroDamaged] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const activeBranches =
    selectedBranchId === 'ALL'
      ? branches
      : branches.filter((b) => b.id === selectedBranchId);

  // Compute damaged stock quantity per product across visible branches
  const productsWithDamaged = products.map((prod) => {
    let totalDamagedQty = 0;
    let totalUsableQty = 0;

    activeBranches.forEach((b) => {
      const item = stock.find((st) => st.productId === prod.id && st.branchId === b.id);
      if (item) {
        totalDamagedQty += item.damagedQty || 0;
        totalUsableQty += item.quantityOnHand;
      }
    });

    const totalLossValuation = totalDamagedQty * prod.costPrice;

    return { prod, totalDamagedQty, totalUsableQty, totalLossValuation };
  });

  const visibleProducts = productsWithDamaged
    .filter(({ prod, totalDamagedQty }) => {
      const matchesDamagedFilter = showZeroDamaged || totalDamagedQty > 0;
      const matchesCat = filterCategory === 'ALL' || prod.category === filterCategory;
      const query = localSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.sku.toLowerCase().includes(query) ||
        prod.barcode.toLowerCase().includes(query) ||
        prod.category.toLowerCase().includes(query);

      return matchesDamagedFilter && matchesCat && matchesSearch;
    });

  // Calculate high-level summary metrics
  const grandTotalDamagedUnits = productsWithDamaged.reduce((sum, item) => sum + item.totalDamagedQty, 0);
  const grandTotalLossValuation = productsWithDamaged.reduce((sum, item) => sum + item.totalLossValuation, 0);
  const affectedSKUsCount = productsWithDamaged.filter((item) => item.totalDamagedQty > 0).length;

  const openDamagedStockEdit = (s: InventoryStock, p: Product, b: Branch) => {
    setEditingStock({ stockItem: s, product: p, branch: b });
    setNewDamagedQty(s.damagedQty || 0);
    setReason('Damaged Stock Balance Adjustment');
  };

  const handleDamagedSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock || !onUpdateStockLevel) return;
    // We update stock via callback
    await onUpdateStockLevel(editingStock.stockItem.id, editingStock.stockItem.quantityOnHand, `Damaged Stock set to ${newDamagedQty}: ${reason}`);
    setEditingStock(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Damaged Stock Matrix & Branch Loss Tracking</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Consolidated breakdown of damaged, defective, or unsellable stock units across all branch locations and central warehouse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('damage')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <AlertOctagon className="h-4 w-4 text-amber-500" />
                <span>Label New Damaged Stock</span>
              </button>

              <button
                onClick={() => onNavigateTab('pullout')}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
              >
                <Truck className="h-4 w-4" />
                <span>Dispatch Pullout to HQ</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Damaged Units</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            {grandTotalDamagedUnits.toLocaleString()} Pcs
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Across {affectedSKUsCount} affected SKUs
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Loss Valuation</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
            रु {grandTotalLossValuation.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            At unit cost basis
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monitored Locations</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {activeBranches.length} Branch / Warehouse Locations
          </div>
          <div className="text-[11px] text-indigo-500 mt-1 font-medium">
            {selectedBranchId === 'ALL' ? 'Consolidated matrix' : 'Selected branch view'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Scan Barcode or Search & Enter Product Name / SKU:"
            className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Zero Damaged */}
          <button
            onClick={() => setShowZeroDamaged(!showZeroDamaged)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showZeroDamaged
                ? 'bg-amber-600 text-white border-amber-600'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {showZeroDamaged ? 'Showing All Products' : 'Showing Damaged Products Only'}
          </button>
        </div>
      </div>

      {/* Main Damaged Matrix Table (Copied layout from BranchStockTracking) */}
      <div className={`rounded-2xl border shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-16rem)] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5 sticky left-0 z-30 bg-inherit border-r min-w-[200px]">
                  Product Name & SKU
                </th>
                <th className="p-3.5 text-center sticky top-0 bg-inherit">Category</th>
                <th className="p-3.5 text-right sticky top-0 bg-inherit">Unit Cost</th>
                <th className={`p-3.5 text-center sticky top-0 border-l border-r font-extrabold ${
                  isDarkMode ? 'bg-amber-950/50 text-amber-300 border-slate-800' : 'bg-amber-100/80 text-amber-900 border-slate-200'
                }`}>
                  Total Damaged Qty
                </th>
                <th className={`p-3.5 text-right sticky top-0 border-r font-extrabold ${
                  isDarkMode ? 'bg-rose-950/40 text-rose-300 border-slate-800' : 'bg-rose-50 text-rose-900 border-slate-200'
                }`}>
                  Total Loss Value
                </th>

                {/* Columns per Branch */}
                {activeBranches.map((b) => (
                  <th key={b.id} className={`p-3.5 text-center border-l sticky top-0 bg-inherit min-w-[130px] ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="h-3 w-3 text-amber-500" />
                      <span className="truncate">{b.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={5 + activeBranches.length} className="p-12 text-center text-slate-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">No damaged inventory recorded!</span>
                      <span className="text-[11px] text-slate-400">All stock items across branches are in usable condition. Click "Showing All Products" to inspect all inventory items.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleProducts.map(({ prod, totalDamagedQty, totalUsableQty, totalLossValuation }) => (
                  <tr key={prod.id} className={`transition-colors ${
                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}>
                    <td className={`p-3.5 sticky left-0 z-10 border-r font-medium ${
                      isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{prod.name}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        SKU: {prod.sku}
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                        isDarkMode
                          ? 'bg-slate-900 text-slate-300 border-slate-800'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {prod.category}
                      </span>
                    </td>

                    <td className={`p-3.5 text-right font-mono font-semibold ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      रु {prod.costPrice.toLocaleString()}
                    </td>

                    {/* Total Damaged Column */}
                    <td className={`p-3.5 text-center border-l border-r font-mono font-bold ${
                      totalDamagedQty > 0
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-slate-200 dark:border-slate-800'
                        : isDarkMode ? 'bg-slate-900/20 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      <span className="text-xs">
                        {totalDamagedQty} <span className="text-[10px] font-normal">{prod.unit}</span>
                      </span>
                    </td>

                    {/* Total Loss Value Column */}
                    <td className={`p-3.5 text-right border-r font-mono font-bold ${
                      totalLossValuation > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400'
                    }`}>
                      रु {totalLossValuation.toLocaleString()}
                    </td>

                    {/* Branch Cells */}
                    {activeBranches.map((b) => {
                      const s = stock.find(
                        (st) => st.productId === prod.id && st.branchId === b.id
                      ) || {
                        id: `stk-${prod.id}-${b.id}`,
                        productId: prod.id,
                        branchId: b.id,
                        quantityOnHand: 0,
                        damagedQty: 0,
                        reservedQty: 0,
                        incomingQty: 0,
                        lastUpdated: new Date().toISOString(),
                      };

                      const localDamaged = s.damagedQty || 0;

                      return (
                        <td
                          key={b.id}
                          className={`p-3 text-center border-l font-medium ${
                            isDarkMode ? 'border-slate-800' : 'border-slate-200'
                          } ${
                            localDamaged > 0 ? (isDarkMode ? 'bg-amber-950/20' : 'bg-amber-50/60') : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-col items-start">
                              {localDamaged > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{localDamaged} {prod.unit} damaged</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-mono">0 damaged</span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                ({s.quantityOnHand} usable)
                              </span>
                            </div>

                            {onUpdateStockLevel && (
                              <button
                                onClick={() => openDamagedStockEdit(s, prod, b)}
                                title="Adjust local damaged stock balance"
                                className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/80 transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT LOCAL DAMAGED STOCK COUNT */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Adjust Damaged Stock Count
                </h3>
              </div>
              <button
                onClick={() => setEditingStock(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDamagedSave} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Product Item</label>
                <div className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {editingStock.product.name}
                </div>
                <div className="text-xs text-indigo-500 font-mono">
                  SKU: {editingStock.product.sku} • Location: {editingStock.branch.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Damaged Units Count ({editingStock.product.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={newDamagedQty}
                  onChange={(e) => setNewDamagedQty(Math.max(0, Number(e.target.value)))}
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-mono font-bold ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Physical damage verification count"
                  className={`w-full rounded-xl border px-3 py-2 text-xs ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isDarkMode
                      ? 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 shadow-md transition-all cursor-pointer"
                >
                  Save Damaged Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
