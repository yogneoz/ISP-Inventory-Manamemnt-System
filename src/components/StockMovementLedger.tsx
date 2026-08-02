import React, { useState } from 'react';
import { TransactionLog, Product, Branch, InventoryStock, StockOperation, Shipment, PurchaseOrder } from '../types';
import { exportToCSV } from '../utils/exportUtils';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  BookOpen,
  Calendar,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  RefreshCw,
  PackageCheck,
  AlertTriangle,
  History,
  Layers,
  ArrowRight
} from 'lucide-react';

interface StockMovementLedgerProps {
  transactionLogs: TransactionLog[];
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  stockOperations?: StockOperation[];
  shipments?: Shipment[];
  purchaseOrders?: PurchaseOrder[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  isDarkMode?: boolean;
}

export const StockMovementLedger: React.FC<StockMovementLedgerProps> = ({
  transactionLogs,
  products,
  branches,
  stock,
  stockOperations = [],
  shipments = [],
  purchaseOrders = [],
  selectedBranchId,
  dateMode,
  isDarkMode = false,
}) => {
  const [activeBranchId, setActiveBranchId] = useState<string>(selectedBranchId);
  const [startDateAD, setStartDateAD] = useState<string>('');
  const [endDateAD, setEndDateAD] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTab, setViewTab] = useState<'SUMMARY_MATRIX' | 'TRANSACTION_LOGS'>('SUMMARY_MATRIX');

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Date Presets
  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'ALL_TIME') => {
    const today = new Date();
    if (preset === 'ALL_TIME') {
      setStartDateAD('');
      setEndDateAD('');
      return;
    }
    if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateAD(first.toISOString().split('T')[0]);
      setEndDateAD(today.toISOString().split('T')[0]);
      return;
    }
    if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDateAD(past30.toISOString().split('T')[0]);
      setEndDateAD(today.toISOString().split('T')[0]);
      return;
    }
    if (preset === 'THIS_YEAR') {
      const startYear = new Date(today.getFullYear(), 0, 1);
      setStartDateAD(startYear.toISOString().split('T')[0]);
      setEndDateAD(today.toISOString().split('T')[0]);
      return;
    }
  };

  // Filter logs based on branch, date, search
  const filteredLogs = transactionLogs.filter((log) => {
    if (activeBranchId !== 'ALL' && log.branchId !== activeBranchId) return false;

    // Extract date YYYY-MM-DD
    const logDate = log.timestampAD.split('T')[0];
    if (startDateAD && logDate < startDateAD) return false;
    if (endDateAD && logDate > endDateAD) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = log.productName.toLowerCase().includes(q);
      const matchSku = log.productSku.toLowerCase().includes(q);
      const matchTx = log.transactionNumber.toLowerCase().includes(q);
      const matchType = log.changeType.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchTx && !matchType) return false;
    }

    return true;
  });

  // Calculate product-level ledger metrics (Opening, Received, Delivered, Damaged, Closing)
  const productLedgerMatrix = products.map((prod) => {
    // Visible stock on hand
    let currentOnHand = 0;
    const branchScope = activeBranchId === 'ALL' ? branches : branches.filter((b) => b.id === activeBranchId);

    branchScope.forEach((b) => {
      const st = stock.find((s) => s.productId === prod.id && s.branchId === b.id);
      if (st) currentOnHand += st.quantityOnHand;
    });

    // Get logs for this product in current branch scope
    const prodLogs = transactionLogs.filter((l) => {
      if (l.productId !== prod.id) return false;
      if (activeBranchId !== 'ALL' && l.branchId !== activeBranchId) return false;
      return true;
    });

    // Split logs: Before startDateAD (to find opening balance) vs Within Period
    let receivedQty = 0;
    let deliveredQty = 0;
    let damagedQty = 0;
    let totalAfterPeriodQtyChanges = 0;

    prodLogs.forEach((l) => {
      const logDate = l.timestampAD.split('T')[0];

      if (startDateAD && logDate < startDateAD) {
        // Log is BEFORE start date, part of opening balance
      } else if (endDateAD && logDate > endDateAD) {
        // Log occurred AFTER period end
        totalAfterPeriodQtyChanges += l.quantityChanged;
      } else {
        // Log is WITHIN period
        if (l.changeType === 'INBOUND_PO' || (l.changeType === 'SHIPMENT_TRANSFER' && l.quantityChanged > 0)) {
          receivedQty += Math.abs(l.quantityChanged);
        } else if (l.changeType === 'DAMAGE') {
          damagedQty += Math.abs(l.quantityChanged);
        } else if (
          l.changeType === 'PULLOUT' ||
          l.changeType === 'STOCK_OUT' ||
          (l.changeType === 'SHIPMENT_TRANSFER' && l.quantityChanged < 0)
        ) {
          deliveredQty += Math.abs(l.quantityChanged);
        } else if (l.changeType === 'MANUAL_ADJUSTMENT') {
          if (l.quantityChanged > 0) receivedQty += l.quantityChanged;
          else deliveredQty += Math.abs(l.quantityChanged);
        }
      }
    });

    // Opening Qty = CurrentOnHand - (net movement in period) - (net movement after period)
    const netPeriodMovement = receivedQty - deliveredQty - damagedQty;
    const openingQty = currentOnHand - totalAfterPeriodQtyChanges - netPeriodMovement;
    const closingQty = openingQty + netPeriodMovement;

    // Financial Values
    const unitCost = prod.costPrice;
    const openingValue = openingQty * unitCost;
    const receivedValue = receivedQty * unitCost;
    const deliveredValue = deliveredQty * unitCost;
    const damagedValue = damagedQty * unitCost;
    const closingValue = closingQty * unitCost;

    return {
      prod,
      unitCost,
      openingQty,
      openingValue,
      receivedQty,
      receivedValue,
      deliveredQty,
      deliveredValue,
      damagedQty,
      damagedValue,
      closingQty,
      closingValue,
    };
  });

  // Filter Product Ledger Matrix by Category and Search
  const filteredProductLedger = productLedgerMatrix.filter(({ prod }) => {
    if (selectedCategory !== 'ALL' && prod.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchSku = prod.sku.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  // KPI Summary Card Totals
  const totalOpeningVal = filteredProductLedger.reduce((sum, p) => sum + p.openingValue, 0);
  const totalReceivedVal = filteredProductLedger.reduce((sum, p) => sum + p.receivedValue, 0);
  const totalDeliveredVal = filteredProductLedger.reduce((sum, p) => sum + p.deliveredValue, 0);
  const totalDamagedVal = filteredProductLedger.reduce((sum, p) => sum + p.damagedValue, 0);
  const totalClosingVal = filteredProductLedger.reduce((sum, p) => sum + p.closingValue, 0);

  // Export Product Ledger CSV
  const exportLedgerCSV = () => {
    const columns = [
      { key: 'sku', label: 'SKU Code', formatter: (_: any, r: any) => r.prod.sku },
      { key: 'name', label: 'Product Name', formatter: (_: any, r: any) => r.prod.name },
      { key: 'category', label: 'Category', formatter: (_: any, r: any) => r.prod.category },
      { key: 'unitCost', label: 'Unit Cost Price (NPR)' },
      { key: 'openingQty', label: 'Opening Qty' },
      { key: 'openingValue', label: 'Opening Cost Value (NPR)' },
      { key: 'receivedQty', label: 'Received Qty' },
      { key: 'receivedValue', label: 'Received Value (NPR)' },
      { key: 'deliveredQty', label: 'Delivered Qty' },
      { key: 'deliveredValue', label: 'Delivered Value (NPR)' },
      { key: 'damagedQty', label: 'Damaged Qty' },
      { key: 'damagedValue', label: 'Damaged Loss Value (NPR)' },
      { key: 'closingQty', label: 'Closing Qty' },
      { key: 'closingValue', label: 'Closing Cost Value (NPR)' },
    ];
    exportToCSV('Stock_Movement_Ledger_Report', filteredProductLedger, columns);
  };

  // Export Transaction Logs CSV
  const exportLogsCSV = () => {
    const columns = [
      { key: 'transactionNumber', label: 'Transaction #' },
      { key: 'timestampAD', label: 'Timestamp (AD)' },
      { key: 'timestampBS', label: 'Timestamp (BS)' },
      { key: 'productSku', label: 'SKU' },
      { key: 'productName', label: 'Product Name' },
      {
        key: 'branchId',
        label: 'Branch Location',
        formatter: (val: string) => branches.find((b) => b.id === val)?.name || val,
      },
      { key: 'changeType', label: 'Movement Event Type' },
      { key: 'quantityBefore', label: 'Qty Before' },
      { key: 'quantityChanged', label: 'Qty Changed (+/-)' },
      { key: 'quantityAfter', label: 'Qty After' },
      { key: 'unitCost', label: 'Unit Cost (NPR)' },
      {
        key: 'totalValue',
        label: 'Total Movement Value (NPR)',
        formatter: (_: any, r: any) => String(Math.abs(r.quantityChanged) * r.unitCost),
      },
      { key: 'referenceDocId', label: 'Ref Document ID' },
    ];
    exportToCSV('Stock_Movement_Logs_Detail', filteredLogs, columns);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <span>Robust Stock Movement Ledger</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Track opening stock balances, inbound receipts, outbound dispatches, damaged stock, and closing inventory valuations with date filters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {viewTab === 'SUMMARY_MATRIX' ? (
            <button
              onClick={exportLedgerCSV}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Ledger Summary CSV</span>
            </button>
          ) : (
            <button
              onClick={exportLogsCSV}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Detailed Logs CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Opening Value */}
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Opening Stock Value</div>
          <div className={`text-lg font-bold font-mono mt-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            रु {totalOpeningVal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Start balance</div>
        </div>

        {/* Received Value */}
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Inbound Received Value</div>
          <div className="text-lg font-bold font-mono mt-1 text-emerald-500">
            +रु {totalReceivedVal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">POs & Transfers In</div>
        </div>

        {/* Delivered Value */}
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Outbound Delivered Value</div>
          <div className="text-lg font-bold font-mono mt-1 text-sky-500">
            -रु {totalDeliveredVal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Dispatches & Stock Outs</div>
        </div>

        {/* Damaged Value */}
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Damaged Stock Value</div>
          <div className="text-lg font-bold font-mono mt-1 text-rose-500">
            -रु {totalDamagedVal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Defective / Write-offs</div>
        </div>

        {/* Closing Value */}
        <div className={`p-3.5 rounded-2xl border ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Closing Stock Value</div>
          <div className={`text-lg font-bold font-mono mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            रु {totalClosingVal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Net closing valuation</div>
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <div className={`p-4 rounded-2xl border space-y-4 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Ledger Date & Location Filters
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => applyPreset('THIS_MONTH')} className="text-indigo-500 font-semibold hover:underline cursor-pointer">
              This Month
            </button>
            <span className="text-slate-400">•</span>
            <button onClick={() => applyPreset('LAST_30_DAYS')} className="text-indigo-500 font-semibold hover:underline cursor-pointer">
              Last 30 Days
            </button>
            <span className="text-slate-400">•</span>
            <button onClick={() => applyPreset('THIS_YEAR')} className="text-indigo-500 font-semibold hover:underline cursor-pointer">
              This Year
            </button>
            <span className="text-slate-400">•</span>
            <button onClick={() => applyPreset('ALL_TIME')} className="text-rose-500 font-semibold hover:underline cursor-pointer">
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date (AD)</label>
            <input
              type="date"
              value={startDateAD}
              onChange={(e) => setStartDateAD(e.target.value)}
              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date (AD)</label>
            <input
              type="date"
              value={endDateAD}
              onChange={(e) => setEndDateAD(e.target.value)}
              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Branch Location</label>
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="ALL">All Branch Locations</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
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
        </div>

        {/* Search Bar & Subview Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Product Name, SKU code or Transaction reference..."
              className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-medium ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewTab('SUMMARY_MATRIX')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewTab === 'SUMMARY_MATRIX'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Item Ledger Summary Matrix
            </button>
            <button
              onClick={() => setViewTab('TRANSACTION_LOGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewTab === 'TRANSACTION_LOGS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed Movement Event Logs ({filteredLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Summary Matrix Table */}
      {viewTab === 'SUMMARY_MATRIX' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto max-h-[calc(100vh-22rem)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5 sticky left-0 z-30 bg-inherit border-r min-w-[180px]">Product SKU & Name</th>
                  <th className="p-3.5 text-center">Unit Cost</th>
                  <th className="p-3.5 text-center border-l bg-slate-500/5">Opening Qty</th>
                  <th className="p-3.5 text-right border-r bg-slate-500/5">Opening Value</th>
                  <th className="p-3.5 text-center bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">Received Qty</th>
                  <th className="p-3.5 text-right border-r bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">Received Value</th>
                  <th className="p-3.5 text-center bg-sky-500/5 text-sky-600 dark:text-sky-400">Delivered Qty</th>
                  <th className="p-3.5 text-right border-r bg-sky-500/5 text-sky-600 dark:text-sky-400">Delivered Value</th>
                  <th className="p-3.5 text-center bg-rose-500/5 text-rose-500">Damaged Qty</th>
                  <th className="p-3.5 text-center border-l border-r bg-indigo-500/10 text-indigo-500">Closing Qty</th>
                  <th className="p-3.5 text-right bg-indigo-500/10 text-indigo-500">Closing Value</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredProductLedger.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      No stock items found in movement ledger.
                    </td>
                  </tr>
                ) : (
                  filteredProductLedger.map(({ prod, unitCost, openingQty, openingValue, receivedQty, receivedValue, deliveredQty, deliveredValue, damagedQty, damagedValue, closingQty, closingValue }) => (
                    <tr key={prod.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className={`p-3.5 sticky left-0 z-10 border-r font-medium ${
                        isDarkMode ? 'bg-[#0f1218]' : 'bg-white'
                      }`}>
                        <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{prod.name}</div>
                        <div className="text-[10px] text-indigo-500 font-mono">SKU: {prod.sku} • {prod.category}</div>
                      </td>

                      <td className="p-3.5 text-center font-mono text-slate-500">
                        रु {unitCost.toLocaleString()}
                      </td>

                      {/* Opening */}
                      <td className="p-3.5 text-center font-mono font-bold border-l bg-slate-500/5">
                        {openingQty} {prod.unit}
                      </td>
                      <td className="p-3.5 text-right font-mono border-r bg-slate-500/5 text-slate-500">
                        रु {openingValue.toLocaleString()}
                      </td>

                      {/* Received */}
                      <td className="p-3.5 text-center font-mono font-bold bg-emerald-500/5 text-emerald-500">
                        +{receivedQty}
                      </td>
                      <td className="p-3.5 text-right font-mono border-r bg-emerald-500/5 text-emerald-500 font-semibold">
                        +रु {receivedValue.toLocaleString()}
                      </td>

                      {/* Delivered */}
                      <td className="p-3.5 text-center font-mono font-bold bg-sky-500/5 text-sky-500">
                        -{deliveredQty}
                      </td>
                      <td className="p-3.5 text-right font-mono border-r bg-sky-500/5 text-sky-500 font-semibold">
                        -रु {deliveredValue.toLocaleString()}
                      </td>

                      {/* Damaged */}
                      <td className="p-3.5 text-center font-mono font-bold bg-rose-500/5 text-rose-500">
                        {damagedQty > 0 ? `-${damagedQty}` : '0'}
                      </td>

                      {/* Closing */}
                      <td className="p-3.5 text-center font-mono font-bold border-l border-r bg-indigo-500/10 text-indigo-500 text-xs">
                        {closingQty} {prod.unit}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold bg-indigo-500/10 ${
                        isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                      }`}>
                        रु {closingValue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Detailed Transaction Logs Table */}
      {viewTab === 'TRANSACTION_LOGS' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto max-h-[calc(100vh-22rem)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Tx Reference</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Product Name & SKU</th>
                  <th className="p-3.5">Branch Location</th>
                  <th className="p-3.5 text-center">Event Type</th>
                  <th className="p-3.5 text-center">Qty Before</th>
                  <th className="p-3.5 text-center">Qty Change</th>
                  <th className="p-3.5 text-center">Qty After</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5 text-right">Movement Value</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No transaction movement logs match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const branchName = branches.find((b) => b.id === log.branchId)?.name || log.branchId;
                    const formattedDate = formatDualDate(log.timestampAD.split('T')[0], dateMode);
                    const isPositive = log.quantityChanged > 0;
                    const movementVal = Math.abs(log.quantityChanged) * log.unitCost;

                    return (
                      <tr key={log.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3.5 font-bold font-mono text-indigo-500">{log.transactionNumber}</td>
                        <td className="p-3.5 text-slate-500">{formattedDate}</td>
                        <td className="p-3.5">
                          <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {log.productSku}</div>
                        </td>
                        <td className="p-3.5 text-slate-500">{branchName}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.changeType === 'INBOUND_PO'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : log.changeType === 'SHIPMENT_TRANSFER'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : log.changeType === 'DAMAGE'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                          }`}>
                            {log.changeType}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-400">{log.quantityBefore}</td>
                        <td className={`p-3.5 text-center font-mono font-bold ${
                          isPositive ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {isPositive ? `+${log.quantityChanged}` : log.quantityChanged}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">{log.quantityAfter}</td>
                        <td className="p-3.5 text-right font-mono text-slate-500">रु {log.unitCost.toLocaleString()}</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-500' : 'text-sky-500'
                        }`}>
                          रु {movementVal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
