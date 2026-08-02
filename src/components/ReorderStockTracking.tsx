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
  ShoppingCart,
  Plus,
  RefreshCw,
  BellRing,
  ArrowRight
} from 'lucide-react';

interface ReorderStockTrackingProps {
  currentUser?: User | null;
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  selectedBranchId: string;
  onUpdateStockLevel?: (stockId: string, newQty: number, reason: string) => Promise<void>;
  onGroupLowStockPO?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  isDarkMode?: boolean;
}

export const ReorderStockTracking: React.FC<ReorderStockTrackingProps> = ({
  currentUser,
  products,
  branches,
  stock,
  selectedBranchId,
  onUpdateStockLevel,
  onGroupLowStockPO,
  onNavigateTab,
  isDarkMode = false,
}) => {
  const [editingStock, setEditingStock] = useState<{
    stockItem: InventoryStock;
    product: Product;
    branch: Branch;
  } | null>(null);

  const [newQty, setNewQty] = useState<number>(0);
  const [reason, setReason] = useState<string>('Stock Level Reorder Adjustment');

  const [showOnlyReorder, setShowOnlyReorder] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const activeBranches =
    selectedBranchId === 'ALL'
      ? branches
      : branches.filter((b) => b.id === selectedBranchId);

  // Calculate reorder deficit per product across visible branches
  const productsReorderData = products.map((prod) => {
    let totalOnHand = 0;
    let totalDeficit = 0;
    let lowBranchesCount = 0;

    activeBranches.forEach((b) => {
      const item = stock.find((st) => st.productId === prod.id && st.branchId === b.id);
      const onHand = item ? item.quantityOnHand : 0;
      totalOnHand += onHand;

      if (prod.minReorderLevel > 0 && onHand <= prod.minReorderLevel) {
        lowBranchesCount++;
        totalDeficit += Math.max(1, prod.minReorderLevel - onHand);
      } else if (prod.minReorderLevel === 0 && onHand < 0) {
        lowBranchesCount++;
        totalDeficit += Math.abs(onHand);
      }
    });

    const totalReorderValuation = totalDeficit * prod.costPrice;
    const isBelowMinOverall = prod.minReorderLevel > 0
      ? (totalOnHand <= prod.minReorderLevel || lowBranchesCount > 0)
      : (totalOnHand < 0 || lowBranchesCount > 0);

    return {
      prod,
      totalOnHand,
      totalDeficit,
      lowBranchesCount,
      totalReorderValuation,
      isBelowMinOverall,
    };
  });

  const visibleProducts = productsReorderData.filter(
    ({ prod, isBelowMinOverall }) => {
      const matchesReorderFilter = !showOnlyReorder || isBelowMinOverall;
      const matchesCat = filterCategory === 'ALL' || prod.category === filterCategory;
      const query = localSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.sku.toLowerCase().includes(query) ||
        prod.barcode.toLowerCase().includes(query) ||
        prod.category.toLowerCase().includes(query);

      return matchesReorderFilter && matchesCat && matchesSearch;
    }
  );

  // Summary Metrics
  const lowStockSKUCount = productsReorderData.filter((p) => p.isBelowMinOverall).length;
  const grandTotalDeficitUnits = productsReorderData.reduce((sum, p) => sum + p.totalDeficit, 0);
  const grandTotalReorderCost = productsReorderData.reduce((sum, p) => sum + p.totalReorderValuation, 0);

  const openStockEdit = (s: InventoryStock, p: Product, b: Branch) => {
    setEditingStock({ stockItem: s, product: p, branch: b });
    setNewQty(s.quantityOnHand);
    setReason('Reorder stock count correction');
  };

  const handleStockSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock || !onUpdateStockLevel) return;
    await onUpdateStockLevel(editingStock.stockItem.id, Number(newQty), reason);
    setEditingStock(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <BellRing className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Reorder Stock Matrix & Branch Thresholds</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Consolidated overview of all items at or below minimum reorder thresholds across branch locations with total required stock calculation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onGroupLowStockPO && (
            <button
              onClick={onGroupLowStockPO}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Group Products & Create Single PO</span>
            </button>
          )}

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('branch-stock')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="h-4 w-4 text-indigo-500" />
              <span>View Full Branch Matrix</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
            {lowStockSKUCount} Unique SKUs
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            At or below min reorder levels
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Required Stock (Deficit)</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            {grandTotalDeficitUnits.toLocaleString()} Pcs
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Aggregated deficit across branches
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Est. Reorder Budget</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            रु {grandTotalReorderCost.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Estimated procurement valuation
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search low stock products by Name, SKU, Barcode or Category..."
            className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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

          {/* Toggle Reorder Filter */}
          <button
            onClick={() => setShowOnlyReorder(!showOnlyReorder)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showOnlyReorder
                ? 'bg-rose-600 text-white border-rose-600'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {showOnlyReorder ? 'Showing Reorder Items Only' : 'Showing All Products'}
          </button>
        </div>
      </div>

      {/* Main Reorder Table Matrix */}
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
                <th className="p-3.5 text-right sticky top-0 bg-inherit">Min Reorder</th>
                <th className={`p-3.5 text-center sticky top-0 border-l border-r font-extrabold ${
                  isDarkMode ? 'bg-rose-950/60 text-rose-300 border-slate-800' : 'bg-rose-100/90 text-rose-900 border-slate-200'
                }`}>
                  Total Required Deficit
                </th>

                {/* Columns per Branch */}
                {activeBranches.map((b) => (
                  <th key={b.id} className={`p-3.5 text-center border-l sticky top-0 bg-inherit min-w-[130px] ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="h-3 w-3 text-indigo-500" />
                      <span className="truncate">{b.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={4 + activeBranches.length} className="p-12 text-center text-slate-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">All inventory levels are optimal!</span>
                      <span className="text-[11px] text-slate-400">No stock items are currently below minimum reorder thresholds. Click "Showing All Products" to view complete inventory.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleProducts.map(({ prod, totalOnHand, totalDeficit, isBelowMinOverall }) => (
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
                      {prod.minReorderLevel} {prod.unit}
                    </td>

                    {/* Total Required Deficit Column */}
                    <td className={`p-3.5 text-center border-l border-r font-mono font-bold ${
                      totalDeficit > 0
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-slate-200 dark:border-slate-800'
                        : isDarkMode ? 'bg-slate-900/20 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-extrabold">
                          {totalDeficit > 0 ? `+${totalDeficit}` : '0'} <span className="text-[10px] font-normal">{prod.unit}</span>
                        </span>
                        {totalDeficit > 0 && (
                          <span className="text-[9px] text-rose-500 font-semibold mt-0.5">
                            Reorder Required
                          </span>
                        )}
                      </div>
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

                      const onHand = s.quantityOnHand;
                      const isLow = prod.minReorderLevel > 0
                        ? onHand <= prod.minReorderLevel
                        : onHand < 0;
                      const branchDeficit = prod.minReorderLevel > 0
                        ? Math.max(0, prod.minReorderLevel - onHand)
                        : (onHand < 0 ? Math.abs(onHand) : 0);

                      return (
                        <td
                          key={b.id}
                          className={`p-3 text-center border-l font-medium ${
                            isDarkMode ? 'border-slate-800' : 'border-slate-200'
                          } ${
                            isLow ? (isDarkMode ? 'bg-rose-950/20' : 'bg-rose-50/60') : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-col items-start">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{onHand} {prod.unit}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                                  {onHand} {prod.unit}
                                </span>
                              )}

                              {branchDeficit > 0 ? (
                                <span className="text-[9px] text-rose-500 font-semibold font-mono">
                                  Deficit: +{branchDeficit}
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Optimal
                                </span>
                              )}
                            </div>

                            {onUpdateStockLevel && (
                              <button
                                onClick={() => openStockEdit(s, prod, b)}
                                title="Adjust local branch stock count"
                                className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors cursor-pointer"
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

      {/* EDIT MODAL */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-500" />
                <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Adjust Branch Stock Count
                </h3>
              </div>
              <button
                onClick={() => setEditingStock(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockSave} className="mt-4 space-y-4">
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
                  On Hand Units Count ({editingStock.product.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(0, Number(e.target.value)))}
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
