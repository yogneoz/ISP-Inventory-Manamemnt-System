import React from 'react';
import {
  Branch,
  Product,
  InventoryStock,
  Asset,
  PurchaseOrder,
  Shipment,
  TransactionLog,
  FinancialSummary,
} from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Landmark,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  Plus,
  Sparkles,
  Layers,
  ArrowDownRight,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  stock: InventoryStock[];
  branches: Branch[];
  assets: Asset[];
  purchaseOrders: PurchaseOrder[];
  shipments: Shipment[];
  transactionLogs: TransactionLog[];
  financialSummary: FinancialSummary;
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  onNavigateTab: (tab: any) => void;
  onOpenAiModal: () => void;
  onGroupLowStockPO?: () => void;
  onUpdateStockLevel?: (stockId: string, newQty: number, reason: string) => Promise<void>;
  isDarkMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  stock,
  branches,
  assets,
  purchaseOrders,
  shipments,
  transactionLogs,
  financialSummary,
  selectedBranchId,
  dateMode,
  onNavigateTab,
  onOpenAiModal,
  onGroupLowStockPO,
  onUpdateStockLevel,
  isDarkMode = false,
}) => {
  // Quick Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [selectedStockId, setSelectedStockId] = React.useState('');
  const [adjustQty, setAdjustQty] = React.useState<number>(1);
  const [adjustAction, setAdjustAction] = React.useState<'ADD' | 'REMOVE'>('ADD');
  const [adjustReason, setAdjustReason] = React.useState('Physical Stock Audit');

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId || !onUpdateStockLevel) return;

    const currentItem = stock.find((s) => s.id === selectedStockId);
    if (!currentItem) return;

    const newQty =
      adjustAction === 'ADD'
        ? currentItem.quantityOnHand + Number(adjustQty)
        : Math.max(0, currentItem.quantityOnHand - Number(adjustQty));

    await onUpdateStockLevel(
      selectedStockId,
      newQty,
      `Quick ${adjustAction === 'ADD' ? 'Stock Entry (+)' : 'Stock Removal (-)'}: ${adjustReason}`
    );
    setIsAdjustModalOpen(false);
  };
  // Filter stock by branch if selected
  const filteredStock =
    selectedBranchId === 'ALL'
      ? stock
      : stock.filter((s) => s.branchId === selectedBranchId);

  // Compute total inventory value
  const totalStockValuation = filteredStock.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.costPrice * item.quantityOnHand : 0);
  }, 0);

  // Low stock items
  const lowStockItems = filteredStock.filter((s) => {
    const prod = products.find((p) => p.id === s.productId);
    if (!prod) return false;
    return prod.minReorderLevel > 0
      ? s.quantityOnHand <= prod.minReorderLevel
      : s.quantityOnHand < 0;
  });

  // Pending POs
  const pendingPOs = purchaseOrders.filter(
    (po) =>
      po.status === 'SENT' || po.status === 'APPROVED' || po.status === 'DRAFT'
  );

  // Active Shipments
  const activeShipments = shipments.filter(
    (sh) => sh.status === 'DISPATCHED' || sh.status === 'IN_TRANSIT'
  );

  // Total Fixed Assets Net Book Value
  const totalAssetNBV = assets.reduce((sum, a) => sum + a.netBookValue, 0);

  // Format currency NPR
  const formatNPR = (val: number) =>
    `रु ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // Card container class helper
  const cardBg = isDarkMode
    ? 'bg-[#0f1218] border-slate-800 text-slate-300'
    : 'bg-white border-slate-200 text-slate-800 shadow-xs';
  const cardTitleText = isDarkMode ? 'text-white' : 'text-slate-900';
  const cardSubText = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div
        className={`rounded-2xl p-6 text-white shadow-xl border relative overflow-hidden transition-colors duration-200 ${
          isDarkMode
            ? 'bg-gradient-to-r from-[#0f1218] via-indigo-950/40 to-[#0f1218] border-slate-800'
            : 'bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#0d47a1] border-indigo-900'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-400/30">
                ● Live Realtime Sync
              </span>
              <span className="text-indigo-100/80 text-xs font-medium">
                {selectedBranchId === 'ALL'
                  ? 'Consolidated - All Branches'
                  : branches.find((b) => b.id === selectedBranchId)?.name}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold tracking-tight text-white">
              Executive Inventory & Financial Dashboard
            </h2>
            <p className="text-indigo-100/70 text-xs mt-1 max-w-2xl">
              Real-time multi-branch stock levels, fixed asset registers,
              purchase invoice VAT, and Nepal Bikram Sambat fiscal accounting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Generate AI Forecast</span>
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
              <span>Financial Statements</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inventory Asset Value */}
        <div className={`rounded-xl p-5 border shadow-xs ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Total Stock Valuation
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              isDarkMode ? 'bg-indigo-950/60 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-serif font-bold ${cardTitleText}`}>
            {formatNPR(totalStockValuation)}
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] ${cardSubText}`}>
            <span>{filteredStock.length} SKU Locations</span>
            <span className="text-indigo-600 font-medium">Cost Basis</span>
          </div>
        </div>

        {/* KPI 2: Fixed Assets Value */}
        <div className={`rounded-xl p-5 border shadow-xs ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Fixed Asset Net Value
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              isDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-serif font-bold ${cardTitleText}`}>
            {formatNPR(totalAssetNBV)}
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] ${cardSubText}`}>
            <span>{assets.length} Active Assets</span>
            <span className="text-emerald-600 font-medium">Net Book Value</span>
          </div>
        </div>

        {/* KPI 3: Low Stock Warning */}
        <div
          onClick={() => onNavigateTab('branch-stock')}
          className={`rounded-xl p-5 border shadow-xs transition-all cursor-pointer group ${
            isDarkMode
              ? 'bg-[#0f1218] border-rose-950/60 hover:border-rose-800'
              : 'bg-white border-rose-200 hover:border-rose-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Low Stock Alerts
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border group-hover:scale-110 transition-transform ${
              isDarkMode ? 'bg-rose-950/60 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-rose-600">
              {lowStockItems.length} SKUs
            </span>
            <span className="text-xs text-rose-600 font-medium">Below Reorder</span>
          </div>
          <div className={`mt-2 flex items-center justify-between text-[11px] ${cardSubText}`}>
            <span>Requires Action</span>
            <span className="text-rose-600 font-medium group-hover:underline">
              View Matrix &rarr;
            </span>
          </div>
        </div>

        {/* KPI 4: Pending POs & In-Transit */}
        <div className={`rounded-xl p-5 border shadow-xs ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Procurement & Shipments
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className={`text-xl font-serif font-bold ${cardTitleText}`}>
                {pendingPOs.length} Pending POs
              </div>
              <div className={`text-[11px] mt-0.5 ${cardSubText}`}>
                {activeShipments.length} Active Shipments
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('purchase-orders')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split: Low Stock Reorder Widget + Recent Realtime Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Low Stock Alerts & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Low Stock Actionable Table */}
          <div className={`rounded-2xl border shadow-xs overflow-hidden ${cardBg}`}>
            <div className={`flex flex-wrap items-center justify-between p-4 sm:p-5 gap-3 border-b ${
              isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h3 className={`font-bold text-sm ${cardTitleText}`}>
                  Low Stock & Reorder Alerts ({lowStockItems.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('reorder-stock')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-amber-500" />
                  <span>View Reorder Stocks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(true)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Quick Add / Remove Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onGroupLowStockPO) {
                      onGroupLowStockPO();
                    } else {
                      onNavigateTab('create-po');
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 shadow-md shadow-indigo-950/50'
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Group Products & Create Single PO</span>
                </button>
              </div>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                All stock levels are optimal above reorder thresholds!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                    isDarkMode ? 'bg-slate-900/50 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Branch</th>
                      <th className="p-3.5 text-right">On Hand</th>
                      <th className="p-3.5 text-right">Min Level</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {lowStockItems.slice(0, 5).map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const branch = branches.find((b) => b.id === item.branchId);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                        >
                          <td className={`p-3.5 font-medium ${cardTitleText}`}>
                            {prod?.name || 'Unknown Item'}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500">
                            {prod?.sku}
                          </td>
                          <td className="p-3.5 text-slate-500">{branch?.name}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                            {item.quantityOnHand} {prod?.unit}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            {prod?.minReorderLevel} {prod?.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Branch Overview Matrix */}
          <div className={`rounded-2xl border shadow-xs p-5 ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${cardTitleText}`}>
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Branch Stock Summary</span>
              </h3>
              <button
                onClick={() => onNavigateTab('branch-stock')}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Full Matrix
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {branches.map((b) => {
                const branchStock = stock.filter((s) => s.branchId === b.id);
                const totalBranchQty = branchStock.reduce(
                  (s, item) => s + item.quantityOnHand,
                  0
                );
                const totalBranchVal = branchStock.reduce((sum, item) => {
                  const p = products.find((pr) => pr.id === item.productId);
                  return sum + (p ? p.costPrice * item.quantityOnHand : 0);
                }, 0);

                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDarkMode
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/50'
                        : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className={cardTitleText}>{b.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                        isDarkMode
                          ? 'text-indigo-300 bg-indigo-950/80 border-indigo-500/20'
                          : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      }`}>
                        {b.code}
                      </span>
                    </div>
                    <div className={`text-sm font-serif font-bold mt-1 ${cardTitleText}`}>
                      {formatNPR(totalBranchVal)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {totalBranchQty} Items in Stock
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Realtime Transaction Activity Stream */}
        <div className="space-y-6">
          <div className={`rounded-2xl border shadow-xs p-5 ${cardBg}`}>
            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${cardTitleText}`}>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Realtime Stock Audit Stream</span>
              </h3>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                View Logs
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {transactionLogs.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  No stock transactions recorded yet.
                </div>
              ) : (
                transactionLogs.slice(0, 7).map((log) => {
                  const isPositive = log.quantityChanged > 0;
                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-colors ${
                        isDarkMode
                          ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold truncate max-w-[140px] ${cardTitleText}`}>
                          {log.productName}
                        </span>
                        <span
                          className={`font-mono font-bold flex items-center text-xs ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? `+${log.quantityChanged}` : log.quantityChanged}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className={`rounded px-1.5 py-0.5 font-mono ${
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {log.changeType.replace('_', ' ')}
                        </span>
                        <span>{formatDualDate(log.timestampAD, dateMode)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add / Remove Stock Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1218] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" />
                <span>Quick Stock Level Adjustment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product & Branch Stock Item:
                </label>
                <select
                  required
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Stock Record --</option>
                  {stock.map((st) => {
                    const prod = products.find((p) => p.id === st.productId);
                    const br = branches.find((b) => b.id === st.branchId);
                    return (
                      <option key={st.id} value={st.id}>
                        {prod?.name || 'Item'} [{br?.code || 'Branch'}] — Current Qty: {st.quantityOnHand} {prod?.unit || 'Pcs'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Type:
                  </label>
                  <select
                    value={adjustAction}
                    onChange={(e) => setAdjustAction(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-200 font-bold focus:outline-none"
                  >
                    <option value="ADD">➕ Add Stock (+)</option>
                    <option value="REMOVE">➖ Remove Stock (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-200 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Adjustment Note:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-200 focus:outline-none"
                >
                  <option value="Physical Stock Audit">Physical Stock Audit Count</option>
                  <option value="Internal Branch Consumption">Internal Branch Consumption</option>
                  <option value="Damaged / Write-off">Damaged / Write-off</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Initial Opening Stock Entry">Initial Opening Stock Entry</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 shadow-lg cursor-pointer"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
