import React, { useState, useMemo } from 'react';
import {
  User,
  Product,
  Branch,
  InventoryStock,
} from '../types';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  Download,
  Filter,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Building,
  Save,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { convertADToBS } from '../utils/nepaliCalendar';

interface PhysicalStockAuditProps {
  currentUser: User | null;
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  isDarkMode?: boolean;
  onUpdateStockLevel?: (
    productId: string,
    branchId: string,
    deltaQty: number,
    type: string,
    notes?: string
  ) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
}

interface AuditRow {
  productId: string;
  sku: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  unitCost: number;
  bookQty: number;
  countedQty: number | '';
  isCounted: boolean;
  varianceReason: string;
  requiresSerialTracking?: boolean;
}

export const PhysicalStockAudit: React.FC<PhysicalStockAuditProps> = ({
  currentUser,
  products,
  branches,
  stock,
  selectedBranchId,
  dateMode,
  isDarkMode = false,
  onUpdateStockLevel,
  onNavigateTab,
}) => {
  const [activeBranchId, setActiveBranchId] = useState<string>(
    selectedBranchId === 'ALL' ? branches[0]?.id || 'BR-KTM' : selectedBranchId
  );

  const [auditorName, setAuditorName] = useState<string>(
    currentUser?.name || 'Authorized Auditor'
  );

  const [auditRefNumber] = useState<string>(
    `AUD-2083-${Math.floor(100 + Math.random() * 900)}`
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterVariance, setFilterVariance] = useState<
    'ALL' | 'DISCREPANCY' | 'MATCHED' | 'SHORTAGE' | 'EXCESS' | 'UNCOUNTED'
  >('ALL');

  const [isReconciled, setIsReconciled] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize count state per branch
  const initialAuditRows = useMemo(() => {
    return products.map((prod) => {
      const stockItem = stock.find(
        (s) => s.productId === prod.id && s.branchId === activeBranchId
      );
      const bookQty = stockItem ? stockItem.quantityOnHand : 0;

      return {
        productId: prod.id,
        sku: prod.sku,
        barcode: prod.barcode,
        productName: prod.name,
        category: prod.category || 'General',
        unit: prod.unit || 'Pcs',
        unitCost: prod.costPrice || 0,
        bookQty,
        countedQty: bookQty, // default to book qty for convenience
        isCounted: true,
        varianceReason: 'Verified Matched',
        requiresSerialTracking: prod.requiresSerialTracking,
      } as AuditRow;
    });
  }, [products, stock, activeBranchId]);

  const [auditRows, setAuditRows] = useState<AuditRow[]>(initialAuditRows);

  // Update rows if active branch changes
  React.useEffect(() => {
    setAuditRows(initialAuditRows);
    setIsReconciled(false);
  }, [initialAuditRows]);

  const handleCountChange = (productId: string, val: string) => {
    setAuditRows((prev) =>
      prev.map((row) => {
        if (row.productId === productId) {
          if (val === '') {
            return { ...row, countedQty: '', isCounted: false };
          }
          const num = parseInt(val, 10);
          const safeNum = isNaN(num) ? 0 : Math.max(0, num);
          const variance = safeNum - row.bookQty;
          let defaultReason = row.varianceReason;
          if (variance === 0) defaultReason = 'Verified Matched';
          else if (variance < 0 && defaultReason === 'Verified Matched')
            defaultReason = 'Shrinkage / Missing Stock';
          else if (variance > 0 && defaultReason === 'Verified Matched')
            defaultReason = 'Unrecorded Surplus / Found';

          return {
            ...row,
            countedQty: safeNum,
            isCounted: true,
            varianceReason: defaultReason,
          };
        }
        return row;
      })
    );
  };

  const handleQuickAdjust = (productId: string, delta: number) => {
    setAuditRows((prev) =>
      prev.map((row) => {
        if (row.productId === productId) {
          const current = typeof row.countedQty === 'number' ? row.countedQty : 0;
          const next = Math.max(0, current + delta);
          return {
            ...row,
            countedQty: next,
            isCounted: true,
            varianceReason: next === row.bookQty ? 'Verified Matched' : row.varianceReason,
          };
        }
        return row;
      })
    );
  };

  const handleSetMatchAll = () => {
    setAuditRows((prev) =>
      prev.map((row) => ({
        ...row,
        countedQty: row.bookQty,
        isCounted: true,
        varianceReason: 'Verified Matched',
      }))
    );
  };

  const handleSetZeroAll = () => {
    setAuditRows((prev) =>
      prev.map((row) => ({
        ...row,
        countedQty: 0,
        isCounted: true,
        varianceReason: 'Shrinkage / Missing Stock',
      }))
    );
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Calculations
  const filteredRows = useMemo(() => {
    return auditRows.filter((row) => {
      // Category
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) return false;

      // Variance Status
      const counted = typeof row.countedQty === 'number' ? row.countedQty : 0;
      const variance = counted - row.bookQty;

      if (filterVariance === 'MATCHED' && variance !== 0) return false;
      if (filterVariance === 'SHORTAGE' && variance >= 0) return false;
      if (filterVariance === 'EXCESS' && variance <= 0) return false;
      if (filterVariance === 'DISCREPANCY' && variance === 0) return false;
      if (filterVariance === 'UNCOUNTED' && row.isCounted) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.productName.toLowerCase().includes(q) ||
          row.sku.toLowerCase().includes(q) ||
          row.barcode.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [auditRows, selectedCategory, filterVariance, searchQuery]);

  const stats = useMemo(() => {
    let totalItems = auditRows.length;
    let countedItems = 0;
    let totalBookQty = 0;
    let totalCountedQty = 0;
    let shortageQty = 0;
    let excessQty = 0;
    let shortageValue = 0;
    let excessValue = 0;

    auditRows.forEach((row) => {
      if (row.isCounted) countedItems++;
      totalBookQty += row.bookQty;
      const counted = typeof row.countedQty === 'number' ? row.countedQty : 0;
      totalCountedQty += counted;

      const diff = counted - row.bookQty;
      if (diff < 0) {
        shortageQty += Math.abs(diff);
        shortageValue += Math.abs(diff) * row.unitCost;
      } else if (diff > 0) {
        excessQty += diff;
        excessValue += diff * row.unitCost;
      }
    });

    const netValueVariance = excessValue - shortageValue;

    return {
      totalItems,
      countedItems,
      totalBookQty,
      totalCountedQty,
      shortageQty,
      excessQty,
      shortageValue,
      excessValue,
      netValueVariance,
      discrepancyCount: auditRows.filter((r) => {
        const c = typeof r.countedQty === 'number' ? r.countedQty : 0;
        return c !== r.bookQty;
      }).length,
    };
  }, [auditRows]);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const handlePostReconciliation = async () => {
    if (!onUpdateStockLevel) return;
    setIsSubmitting(true);
    try {
      // Find all rows with non-zero variance
      const rowsToAdjust = auditRows.filter((r) => {
        const c = typeof r.countedQty === 'number' ? r.countedQty : 0;
        return c !== r.bookQty;
      });

      for (const row of rowsToAdjust) {
        const c = typeof row.countedQty === 'number' ? row.countedQty : 0;
        const delta = c - row.bookQty;
        await onUpdateStockLevel(
          row.productId,
          activeBranchId,
          delta,
          delta > 0 ? 'PHYSICAL_AUDIT_EXCESS' : 'PHYSICAL_AUDIT_SHORTAGE',
          `Physical Audit Ref: ${auditRefNumber} - ${row.varianceReason}`
        );
      }

      setIsReconciled(true);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to post audit reconciliation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Unit Cost (NPR)',
      'Book System Qty',
      'Physical Counted Qty',
      'Variance Qty',
      'Variance Value (NPR)',
      'Variance Reason',
    ];

    const csvContent = [
      headers.join(','),
      ...auditRows.map((r) => {
        const counted = typeof r.countedQty === 'number' ? r.countedQty : 0;
        const variance = counted - r.bookQty;
        const value = variance * r.unitCost;
        return [
          `"${r.sku}"`,
          `"${r.barcode}"`,
          `"${r.productName.replace(/"/g, '""')}"`,
          `"${r.category}"`,
          `"${r.unit}"`,
          r.unitCost,
          r.bookQty,
          counted,
          variance,
          value,
          `"${r.varianceReason}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Audit_${activeBranch?.code || 'HQ'}_${auditRefNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayAD = new Date().toISOString().split('T')[0];
  const todayBS = convertADToBS(todayAD).formattedBS;

  return (
    <div className="space-y-5">
      {/* HEADER SECTION */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold tracking-tight">
                Physical Stock Count & Reconciliation Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perform stock counting, record physical discrepancies, and auto-adjust branch inventory balances.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
            <Building className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-slate-500 dark:text-slate-400">Location:</span>
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Audit CSV</span>
          </button>

          {!isReconciled ? (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={stats.discrepancyCount === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                stats.discrepancyCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600'
                  : 'bg-slate-400 dark:bg-slate-800 text-slate-200 cursor-not-allowed opacity-60'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>Reconcile Stock ({stats.discrepancyCount})</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Audit Reconciled & Posted</span>
            </div>
          )}
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total SKUs */}
        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Audit SKUs
          </p>
          <p className="text-xl font-extrabold font-mono mt-1 text-slate-900 dark:text-slate-100">
            {stats.totalItems}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            System Qty: <span className="font-bold">{stats.totalBookQty.toLocaleString()}</span> {auditRows[0]?.unit || 'Pcs'}
          </p>
        </div>

        {/* Card 2: Shortage Stock */}
        <div
          className={`p-4 rounded-2xl border ${
            stats.shortageQty > 0
              ? isDarkMode
                ? 'bg-rose-950/20 border-rose-900/40'
                : 'bg-rose-50/80 border-rose-200'
              : isDarkMode
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>Stock Shortage</span>
            <AlertTriangle className="h-3.5 w-3.5" />
          </p>
          <p className="text-xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
            -{stats.shortageQty.toLocaleString()}
          </p>
          <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-mono">
            Value Loss: -NPR {stats.shortageValue.toLocaleString()}
          </p>
        </div>

        {/* Card 3: Surplus / Excess Stock */}
        <div
          className={`p-4 rounded-2xl border ${
            stats.excessQty > 0
              ? isDarkMode
                ? 'bg-emerald-950/20 border-emerald-900/40'
                : 'bg-emerald-50/80 border-emerald-200'
              : isDarkMode
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Stock Excess</span>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </p>
          <p className="text-xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            +{stats.excessQty.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-mono">
            Value Surplus: +NPR {stats.excessValue.toLocaleString()}
          </p>
        </div>

        {/* Card 4: Net Financial Variance */}
        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Net Variance Value
          </p>
          <p
            className={`text-xl font-extrabold font-mono mt-1 ${
              stats.netValueVariance < 0
                ? 'text-rose-500'
                : stats.netValueVariance > 0
                ? 'text-emerald-500'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {stats.netValueVariance >= 0 ? '+' : ''}NPR {stats.netValueVariance.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Discrepancies: <span className="font-bold text-amber-500">{stats.discrepancyCount} items</span>
          </p>
        </div>

        {/* Card 5: Audit Batch Meta */}
        <div
          className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50/50 border-indigo-200 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Audit Session
          </p>
          <p className="text-xs font-mono font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
            {auditRefNumber}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {dateMode === 'BS' ? `BS Date: ${todayBS}` : `AD Date: ${todayAD}`}
          </p>
        </div>
      </div>

      {/* TOOLBAR & CONTROLS */}
      <div
        className={`p-3.5 rounded-2xl border space-y-3 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, barcode, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filters & Bulk Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Variance Filter */}
            <select
              value={filterVariance}
              onChange={(e) => setFilterVariance(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stock Rows</option>
              <option value="DISCREPANCY">Discrepancies Only</option>
              <option value="MATCHED">Matched Only</option>
              <option value="SHORTAGE">Shortage (-)</option>
              <option value="EXCESS">Excess (+)</option>
            </select>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            {/* Bulk Quick Fill buttons */}
            <button
              onClick={handleSetMatchAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Set physical count equal to book count for all"
            >
              Match All System Qty
            </button>
            <button
              onClick={handleSetZeroAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
              title="Zero out physical counts"
            >
              Zero All
            </button>
          </div>
        </div>
      </div>

      {/* TABLE DATA GRID */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}
            >
              <tr>
                <th className="p-3">SKU / Barcode</th>
                <th className="p-3">Product Name & Category</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-center">Book Qty</th>
                <th className="p-3 text-center w-36">Physical Counted Qty</th>
                <th className="p-3 text-center">Variance</th>
                <th className="p-3 text-right">Variance Value</th>
                <th className="p-3">Discrepancy Reason</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No audit records match the current search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const counted = typeof row.countedQty === 'number' ? row.countedQty : 0;
                  const variance = counted - row.bookQty;
                  const varianceVal = variance * row.unitCost;

                  return (
                    <tr
                      key={row.productId}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        variance !== 0
                          ? variance < 0
                            ? 'bg-rose-500/5'
                            : 'bg-emerald-500/5'
                          : ''
                      }`}
                    >
                      {/* SKU & Barcode */}
                      <td className="p-3 font-mono font-medium">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{row.sku}</div>
                        <div className="text-[10px] text-slate-400">{row.barcode}</div>
                      </td>

                      {/* Name & Category */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{row.productName}</span>
                          {row.requiresSerialTracking && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 text-[9px] font-bold border border-indigo-500/20">
                              Serial/MAC
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{row.category}</div>
                      </td>

                      {/* Unit Cost */}
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        NPR {row.unitCost.toLocaleString()}
                      </td>

                      {/* Book System Qty */}
                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {row.bookQty} <span className="text-[10px] text-slate-400 font-normal">{row.unit}</span>
                      </td>

                      {/* Physical Input */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleQuickAdjust(row.productId, -1)}
                            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Decrease 1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={row.countedQty}
                            onChange={(e) => handleCountChange(row.productId, e.target.value)}
                            className={`w-16 text-center font-mono font-bold py-1 px-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 ${
                              variance < 0
                                ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : variance > 0
                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                            }`}
                          />
                          <button
                            onClick={() => handleQuickAdjust(row.productId, 1)}
                            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Increase 1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* Variance Qty */}
                      <td className="p-3 text-center font-mono font-extrabold">
                        {variance === 0 ? (
                          <span className="text-slate-400 font-medium">0</span>
                        ) : variance < 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {variance}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            +{variance}
                          </span>
                        )}
                      </td>

                      {/* Variance Value */}
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          variance < 0
                            ? 'text-rose-500'
                            : variance > 0
                            ? 'text-emerald-500'
                            : 'text-slate-400 font-normal'
                        }`}
                      >
                        {varianceVal === 0
                          ? 'NPR 0'
                          : `${varianceVal > 0 ? '+' : ''}NPR ${varianceVal.toLocaleString()}`}
                      </td>

                      {/* Variance Reason */}
                      <td className="p-3">
                        <select
                          value={row.varianceReason}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAuditRows((prev) =>
                              prev.map((r) =>
                                r.productId === row.productId ? { ...r, varianceReason: val } : r
                              )
                            );
                          }}
                          disabled={variance === 0}
                          className={`w-full py-1 px-2 text-[11px] rounded-lg border bg-transparent focus:outline-none ${
                            variance === 0
                              ? 'border-transparent text-slate-400 opacity-60 cursor-not-allowed'
                              : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <option value="Verified Matched">Verified Matched</option>
                          <option value="Shrinkage / Missing Stock">Shrinkage / Missing Stock</option>
                          <option value="Damaged Stock Discarded">Damaged Stock Discarded</option>
                          <option value="Unrecorded Return / Surplus">Unrecorded Return / Surplus</option>
                          <option value="Data Entry Miscount">Data Entry Miscount</option>
                          <option value="Misplaced Location">Misplaced Location</option>
                        </select>
                      </td>

                      {/* Row Quick Action */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleCountChange(row.productId, String(row.bookQty))}
                          className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                          title="Reset to Book Qty"
                        >
                          Match
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

      {/* CONFIRMATION RECONCILIATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-xl rounded-2xl p-6 border shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base">Confirm Stock Reconciliation & Adjustment</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              You are about to finalize Physical Audit batch <strong className="text-indigo-500 font-mono">{auditRefNumber}</strong> for location <strong className="text-slate-800 dark:text-slate-200">{activeBranch?.name}</strong>.
              This will write system stock adjustment transactions for all variance items.
            </p>

            {/* Discrepancy Breakdown Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2">Item SKU</th>
                    <th className="p-2">Book Qty</th>
                    <th className="p-2">Counted</th>
                    <th className="p-2 text-right">Adjustment Delta</th>
                    <th className="p-2 text-right">Value Loss/Surplus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {auditRows
                    .filter((r) => {
                      const c = typeof r.countedQty === 'number' ? r.countedQty : 0;
                      return c !== r.bookQty;
                    })
                    .map((r) => {
                      const c = typeof r.countedQty === 'number' ? r.countedQty : 0;
                      const delta = c - r.bookQty;
                      const val = delta * r.unitCost;

                      return (
                        <tr key={r.productId}>
                          <td className="p-2 font-bold">{r.sku}</td>
                          <td className="p-2">{r.bookQty}</td>
                          <td className="p-2">{c}</td>
                          <td
                            className={`p-2 text-right font-extrabold ${
                              delta < 0 ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </td>
                          <td
                            className={`p-2 text-right font-bold ${
                              val < 0 ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            NPR {val.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              <span>Total Discrepancies: <strong>{stats.discrepancyCount} items</strong></span>
              <span>Net Financial Impact: <strong>NPR {stats.netValueVariance.toLocaleString()}</strong></span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePostReconciliation}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Posting Audit Adjustments...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Authorize & Update Inventory Balances</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
