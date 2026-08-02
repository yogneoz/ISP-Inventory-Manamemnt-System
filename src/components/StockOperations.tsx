import React, { useState } from 'react';
import { StockOperation, Product, Branch, InventoryStock, PulloutItem } from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  AlertOctagon,
  Plus,
  Trash2,
  X,
  Search,
  Barcode,
  Package,
  Building2,
  CheckCircle2,
  Truck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  Info,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface StockOperationsProps {
  operations: StockOperation[];
  products: Product[];
  branches: Branch[];
  stock?: InventoryStock[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  initialType?: StockOperation['type'];
  autoOpenModal?: boolean;
  isDarkMode?: boolean;
  onCreateOperation: (op: Partial<StockOperation>) => Promise<void>;
  onReceiveOperation?: (id: string) => Promise<void>;
}

export const StockOperations: React.FC<StockOperationsProps> = ({
  operations,
  products,
  branches,
  stock = [],
  selectedBranchId,
  dateMode,
  initialType = 'PULLOUT',
  autoOpenModal = false,
  isDarkMode = false,
  onCreateOperation,
  onReceiveOperation,
}) => {
  const [activeTab, setActiveTab] = useState<'PULLOUT_BINS' | 'DAMAGE_TRACKING' | 'LOGS'>(
    initialType === 'DAMAGE' ? 'DAMAGE_TRACKING' : 'PULLOUT_BINS'
  );

  // Filter state
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranchId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBinId, setExpandedBinId] = useState<string | null>(null);

  // Modals state
  const [isPulloutModalOpen, setIsPulloutModalOpen] = useState(autoOpenModal && initialType === 'PULLOUT');
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(autoOpenModal && initialType === 'DAMAGE');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Pullout Bin Form State
  const [sourceBranchId, setSourceBranchId] = useState<string>(
    branches.find((b) => !b.isHeadquarters)?.id || branches[0]?.id || ''
  );
  const [destWarehouseId, setDestWarehouseId] = useState<string>(
    branches.find((b) => b.isHeadquarters)?.id || 'WH001'
  );
  const [binInspector, setBinInspector] = useState<string>('Senior Quality & Logistics Officer');
  const [binNotes, setBinNotes] = useState<string>('Overstock / Damaged stock return dispatch to central warehouse');
  const [pulloutItems, setPulloutItems] = useState<PulloutItem[]>([]);

  // Product Search State for Pullout Form
  const [prodSearchInput, setProdSearchInput] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Single Damage Labeling Form State
  const [damageBranchId, setDamageBranchId] = useState<string>(branches[0]?.id || '');
  const [damageProductId, setDamageProductId] = useState<string>(products[0]?.id || '');
  const [damageQty, setDamageQty] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('Transit damage / defective unit');
  const [damageInspector, setDamageInspector] = useState<string>('Branch Quality Inspector');

  // Filtered list of products for search
  const matchingProducts = products.filter((p) => {
    if (!prodSearchInput.trim()) return false;
    const q = prodSearchInput.toLowerCase().trim();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Helper to add product to Pullout items list
  const handleAddProductToPullout = (prod: Product) => {
    const existing = pulloutItems.find((i) => i.productId === prod.id);
    if (existing) {
      setPulloutItems(
        pulloutItems.map((i) =>
          i.productId === prod.id
            ? { ...i, quantity: i.quantity + 1, totalValue: (i.quantity + 1) * i.unitCost }
            : i
        )
      );
    } else {
      const srcStock = stock.find((s) => s.productId === prod.id && s.branchId === sourceBranchId);
      const availDamaged = srcStock?.damagedQty || 0;
      // Default condition to DAMAGED_STOCK if branch has damaged stock, else OVERSTOCK
      const defaultCond = availDamaged > 0 ? 'DAMAGED_STOCK' : 'OVERSTOCK';

      setPulloutItems([
        ...pulloutItems,
        {
          id: `pli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          quantity: 1,
          condition: defaultCond,
          unitCost: prod.costPrice,
          totalValue: prod.costPrice,
          reason: defaultCond === 'DAMAGED_STOCK' ? 'Damaged inventory return' : 'Surplus stock return to warehouse',
        },
      ]);
    }
    setProdSearchInput('');
    setIsSearchOpen(false);
  };

  const handleUpdatePulloutItem = (id: string, updates: Partial<PulloutItem>) => {
    setPulloutItems(
      pulloutItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          updated.totalValue = updated.quantity * updated.unitCost;
        }
        return updated;
      })
    );
  };

  const handleRemovePulloutItem = (id: string) => {
    setPulloutItems(pulloutItems.filter((i) => i.id !== id));
  };

  // Submit Pullout Bin Dispatch
  const handleSubmitPulloutBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pulloutItems.length === 0) {
      alert('Please add at least one stock item to the pullout bin.');
      return;
    }

    const srcBranch = branches.find((b) => b.id === sourceBranchId);
    const destWh = branches.find((b) => b.id === destWarehouseId);

    const grandTotal = pulloutItems.reduce((sum, item) => sum + item.totalValue, 0);

    await onCreateOperation({
      type: 'PULLOUT',
      branchId: sourceBranchId,
      branchName: srcBranch?.name,
      destinationWarehouseId: destWarehouseId,
      destinationWarehouseName: destWh?.name,
      items: pulloutItems,
      totalValue: grandTotal,
      reason: binNotes,
      inspectorName: binInspector,
      status: 'DISPATCHED',
    });

    setIsPulloutModalOpen(false);
    setPulloutItems([]);
  };

  // Submit Local Damage Tagging
  const handleSubmitDamageTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === damageProductId);
    if (!prod) return;

    await onCreateOperation({
      type: 'DAMAGE',
      branchId: damageBranchId,
      productId: damageProductId,
      productName: prod.name,
      quantityChanged: Number(damageQty),
      costPerUnit: prod.costPrice,
      reason: damageReason,
      inspectorName: damageInspector,
      status: 'LOGGED',
    });

    setIsDamageModalOpen(false);
  };

  // Filter operations based on tab and branch
  const filteredOperations = operations.filter((op) => {
    const matchesBranch =
      branchFilter === 'ALL' ||
      op.branchId === branchFilter ||
      op.destinationWarehouseId === branchFilter;

    if (!matchesBranch) return false;

    if (activeTab === 'PULLOUT_BINS') {
      return op.type === 'PULLOUT';
    } else if (activeTab === 'DAMAGE_TRACKING') {
      return op.type === 'DAMAGE';
    }
    return true; // LOGS tab shows all
  });

  const pulloutOperations = operations.filter((op) => op.type === 'PULLOUT');
  const damageOperations = operations.filter((op) => op.type === 'DAMAGE');

  const totalPulloutVal = pulloutOperations.reduce((sum, op) => sum + op.totalValue, 0);
  const totalDamageVal = damageOperations.reduce((sum, op) => sum + op.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <AlertOctagon className="h-5 w-5 text-rose-500" />
            <span>Pullouts & Damage Inventory Management</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Dispatch overstock & damaged stock back to main warehouse or track damaged stock locally across branches.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsDamageModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Label Local Damaged Stock</span>
          </button>

          <button
            onClick={() => setIsPulloutModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Pullout Bin (Return to Warehouse)</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className={`flex items-center gap-1 border-b pb-1 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('PULLOUT_BINS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'PULLOUT_BINS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Warehouse Pullout Bins ({pulloutOperations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DAMAGE_TRACKING')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'DAMAGE_TRACKING'
              ? 'bg-rose-600 text-white shadow-sm'
              : isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Branch Damaged Stock Tracking ({damageOperations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'LOGS'
              ? 'bg-slate-700 text-white shadow-sm'
              : isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>All Stock Operation Logs ({operations.length})</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Pullout Dispatches</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {pulloutOperations.length} Bins
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
            Total Value: रु {totalPulloutVal.toLocaleString()}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Locally Tagged Damaged Stock</div>
          <div className={`text-2xl font-bold font-mono mt-1 text-rose-600 dark:text-rose-400`}>
            {damageOperations.length} Records
          </div>
          <div className="text-[11px] text-rose-500 mt-1 font-semibold">
            Total Value: रु {totalDamageVal.toLocaleString()}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">In-Transit Pullout Bins</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            {pulloutOperations.filter((op) => op.status === 'DISPATCHED').length} Pending Receipt
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Awaiting Warehouse stock check
          </div>
        </div>
      </div>

      {/* TAB 1: PULLOUT BINS VIEW */}
      {activeTab === 'PULLOUT_BINS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-500">
              Dispatched Pullout Bins (Surplus & Damaged Stock Returning to HQ)
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">All Source Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pullout Bins List */}
          <div className={`rounded-2xl border shadow-lg overflow-hidden ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                  isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3.5">Reference #</th>
                    <th className="p-3.5">Source Branch</th>
                    <th className="p-3.5">Target Warehouse</th>
                    <th className="p-3.5 text-center">Bin Items</th>
                    <th className="p-3.5 text-right">Total Bin Value</th>
                    <th className="p-3.5">Officer / Inspector</th>
                    <th className="p-3.5">Dispatch Date</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                        No pullout bins created yet. Click "Create Pullout Bin" to return overstock or damaged stock to central warehouse.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op) => {
                      const isExpanded = expandedBinId === op.id;
                      const itemCount = op.items ? op.items.length : op.quantityChanged ? 1 : 0;

                      return (
                        <React.Fragment key={op.id}>
                          <tr className={`transition-colors ${
                            isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                          }`}>
                            <td className={`p-3.5 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-indigo-500" />
                                <span>{op.referenceNumber}</span>
                              </div>
                            </td>
                            <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {op.branchName || op.branchId}
                            </td>
                            <td className={`p-3.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {op.destinationWarehouseName || 'Central Warehouse'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 text-[10px] font-extrabold border border-indigo-200 dark:border-indigo-800">
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                              </span>
                            </td>
                            <td className={`p-3.5 text-right font-mono font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              रु {op.totalValue.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-slate-500 text-[11px] font-medium">
                              {op.inspectorName}
                            </td>
                            <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                              {formatDualDate(op.dateAD, dateMode)}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                op.status === 'RECEIVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}>
                                {op.status || 'DISPATCHED'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {op.status === 'DISPATCHED' && onReceiveOperation && (
                                  <button
                                    onClick={() => onReceiveOperation(op.id)}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition-all cursor-pointer shadow-xs"
                                  >
                                    Receive at HQ
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedBinId(isExpanded ? null : op.id)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isDarkMode
                                      ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title="View items inside bin"
                                >
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Multi-Item Drawer */}
                          {isExpanded && (
                            <tr className={isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/80'}>
                              <td colSpan={9} className="p-4 border-t border-b border-indigo-200/50 dark:border-indigo-900/30">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-300">
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      <span>Pullout Bin Line Items ({op.items ? op.items.length : 1})</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-normal">Reason: {op.reason}</span>
                                  </div>

                                  <div className={`rounded-xl border overflow-hidden ${
                                    isDarkMode ? 'border-slate-800 bg-[#0a0c10]' : 'border-slate-200 bg-white'
                                  }`}>
                                    <table className="w-full text-left text-xs">
                                      <thead className={`text-[10px] uppercase font-bold ${
                                        isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        <tr>
                                          <th className="p-2.5">Product SKU & Name</th>
                                          <th className="p-2.5 text-center">Condition</th>
                                          <th className="p-2.5 text-right">Qty Pulled</th>
                                          <th className="p-2.5 text-right">Unit Cost</th>
                                          <th className="p-2.5 text-right">Total Subtotal</th>
                                          <th className="p-2.5">Line Reason</th>
                                        </tr>
                                      </thead>
                                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                        {op.items && op.items.length > 0 ? (
                                          op.items.map((it) => (
                                            <tr key={it.id}>
                                              <td className="p-2.5 font-semibold">
                                                <div>{it.productName}</div>
                                                <div className="text-[10px] text-indigo-500 font-mono">SKU: {it.sku}</div>
                                              </td>
                                              <td className="p-2.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                  it.condition === 'DAMAGED_STOCK'
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                }`}>
                                                  {it.condition}
                                                </span>
                                              </td>
                                              <td className="p-2.5 text-right font-mono font-bold">
                                                {it.quantity} {it.unit || 'Pcs'}
                                              </td>
                                              <td className="p-2.5 text-right font-mono">रु {it.unitCost.toLocaleString()}</td>
                                              <td className="p-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                रु {it.totalValue.toLocaleString()}
                                              </td>
                                              <td className="p-2.5 text-slate-500 text-[11px]">{it.reason || '-'}</td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td className="p-2.5 font-semibold">{op.productName}</td>
                                            <td className="p-2.5 text-center font-bold">PULLOUT</td>
                                            <td className="p-2.5 text-right font-mono font-bold">{Math.abs(op.quantityChanged || 0)}</td>
                                            <td className="p-2.5 text-right font-mono">रु {(op.costPerUnit || 0).toLocaleString()}</td>
                                            <td className="p-2.5 text-right font-mono font-bold">रु {op.totalValue.toLocaleString()}</td>
                                            <td className="p-2.5 text-slate-500">{op.reason}</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOCAL DAMAGE TRACKING */}
      {activeTab === 'DAMAGE_TRACKING' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-500">
              Local Branch & Warehouse Damaged Inventory Tracking
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">All Branch Locations & Warehouses</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`rounded-2xl border shadow-lg overflow-hidden ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                  isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3.5">Reference #</th>
                    <th className="p-3.5">Location (Branch/HQ)</th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5 text-right">Damaged Qty</th>
                    <th className="p-3.5 text-right">Loss Cost Basis</th>
                    <th className="p-3.5 text-right">Total Loss (NPR)</th>
                    <th className="p-3.5">Quality Inspector</th>
                    <th className="p-3.5">Log Date</th>
                    <th className="p-3.5">Damage Cause / Explanation</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                        No damaged stock logged for this selection. Use "Label Local Damaged Stock" to record damage at any branch or warehouse.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op) => {
                      const branch = branches.find((b) => b.id === op.branchId);
                      return (
                        <tr key={op.id} className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                          <td className={`p-3.5 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {op.referenceNumber}
                          </td>
                          <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {branch?.name || op.branchId}
                          </td>
                          <td className={`p-3.5 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {op.productName}
                          </td>
                          <td className="p-3.5 text-right font-extrabold font-mono text-rose-600 dark:text-rose-400">
                            {Math.abs(op.quantityChanged || 0)}
                          </td>
                          <td className={`p-3.5 text-right font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            रु {(op.costPerUnit || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            रु {op.totalValue.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px] font-medium">
                            {op.inspectorName}
                          </td>
                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                            {formatDualDate(op.dateAD, dateMode)}
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                            {op.reason}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL OPERATION LOGS */}
      {activeTab === 'LOGS' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Ref #</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Product / Items</th>
                  <th className="p-3.5 text-right">Total Value</th>
                  <th className="p-3.5">Inspector</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Reason</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {operations.map((op) => {
                  const br = branches.find((b) => b.id === op.branchId);
                  return (
                    <tr key={op.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="p-3.5 font-mono font-bold">{op.referenceNumber}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          op.type === 'PULLOUT'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {op.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">{br?.name || op.branchId}</td>
                      <td className="p-3.5 font-bold">
                        {op.items ? `${op.items.length} Multiple Items` : op.productName}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold">रु {op.totalValue.toLocaleString()}</td>
                      <td className="p-3.5 text-slate-500">{op.inspectorName}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{formatDualDate(op.dateAD, dateMode)}</td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">{op.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: MULTI-STOCK PULLOUT BIN DISPATCH FORM */}
      {isPulloutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 ${
              isDarkMode ? 'border-slate-800 bg-[#12161f]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-600" />
                <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Create Multi-Stock Pullout Bin Dispatch
                </h3>
              </div>
              <button
                onClick={() => setIsPulloutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPulloutBin} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Branch Routing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Source Branch (Dispatching Location)
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Destination Central Warehouse
                  </label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {branches.filter((b) => b.isHeadquarters || b.id === 'WH001').map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ⭐ (Central Storage)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Search Bar */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  🔍 Search & Add Stock Items to Pullout Bin (Name, SKU or Barcode)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={prodSearchInput}
                      onChange={(e) => {
                        setProdSearchInput(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder="Type SKU (e.g. DRP001), Barcode or Product Name to add..."
                      className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-medium ${
                        isDarkMode
                          ? 'bg-slate-900 border-indigo-500/50 text-white placeholder-slate-500'
                          : 'bg-white border-indigo-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    <Barcode className="h-4 w-4 text-indigo-500" />
                    <span>Scan</span>
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchOpen && matchingProducts.length > 0 && (
                  <div className={`absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border shadow-xl ${
                    isDarkMode ? 'bg-[#0f1218] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    {matchingProducts.map((p) => {
                      const pStock = stock.find((s) => s.productId === p.id && s.branchId === sourceBranchId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProductToPullout(p)}
                          className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between border-b last:border-0 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer ${
                            isDarkMode ? 'border-slate-800' : 'border-slate-100'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{p.name}</div>
                            <div className="text-[10px] text-indigo-500 font-mono">
                              SKU: {p.sku} • Cost: रु {p.costPrice.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {pStock?.quantityOnHand || 0} {p.unit} Usable
                            </span>
                            {(pStock?.damagedQty || 0) > 0 && (
                              <div className="text-[10px] text-rose-500 font-semibold">
                                {pStock?.damagedQty} Damaged
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Multi-Item Table in Bin Draft */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Bin Contents ({pulloutItems.length} items added)</span>
                  {pulloutItems.length > 0 && (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Bin Subtotal: रु {pulloutItems.reduce((s, i) => s + i.totalValue, 0).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className={`rounded-xl border overflow-hidden ${
                  isDarkMode ? 'border-slate-800 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[10px] uppercase font-bold ${
                      isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-700'
                    }`}>
                      <tr>
                        <th className="p-2.5">Item & SKU</th>
                        <th className="p-2.5">Condition</th>
                        <th className="p-2.5 text-center">Qty to Return</th>
                        <th className="p-2.5 text-right">Unit Cost</th>
                        <th className="p-2.5 text-right">Total Value</th>
                        <th className="p-2.5">Reason Note</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {pulloutItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                            No items added to bin yet. Search product above to add to bin.
                          </td>
                        </tr>
                      ) : (
                        pulloutItems.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2.5">
                              <div className="font-bold text-xs">{item.productName}</div>
                              <div className="text-[10px] font-mono text-indigo-500">SKU: {item.sku}</div>
                            </td>
                            <td className="p-2.5">
                              <select
                                value={item.condition}
                                onChange={(e) =>
                                  handleUpdatePulloutItem(item.id, {
                                    condition: e.target.value as any,
                                  })
                                }
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer ${
                                  isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                                }`}
                              >
                                <option value="OVERSTOCK">OVERSTOCK (Usable)</option>
                                <option value="DAMAGED_STOCK">DAMAGED (Defective)</option>
                                <option value="EXPIRED">EXPIRED</option>
                                <option value="RECALLED">RECALLED</option>
                              </select>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdatePulloutItem(item.id, {
                                    quantity: Math.max(1, Number(e.target.value)),
                                  })
                                }
                                className={`w-16 text-center font-mono font-bold rounded-lg border px-2 py-1 ${
                                  isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              रु {item.unitCost.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              रु {item.totalValue.toLocaleString()}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.reason || ''}
                                onChange={(e) =>
                                  handleUpdatePulloutItem(item.id, { reason: e.target.value })
                                }
                                placeholder="Reason for returning item..."
                                className={`w-full rounded-lg border px-2 py-1 text-[11px] ${
                                  isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePulloutItem(item.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Officer & Dispatch Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Authorizing Officer / Logistics Inspector
                  </label>
                  <input
                    type="text"
                    required
                    value={binInspector}
                    onChange={(e) => setBinInspector(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-1.5 text-xs ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    General Dispatch Notes
                  </label>
                  <input
                    type="text"
                    value={binNotes}
                    onChange={(e) => setBinNotes(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-1.5 text-xs ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPulloutModalOpen(false)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold border cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pulloutItems.length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md cursor-pointer disabled:opacity-50"
                >
                  Dispatch Pullout Bin to Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOCAL DAMAGE LABELING FORM */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
            isDarkMode ? 'bg-[#0f1218] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${
              isDarkMode ? 'border-slate-800 bg-[#12161f]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Label Damaged Stock in Local Inventory
                </h3>
              </div>
              <button
                onClick={() => setIsDamageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDamageTag} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Branch or Warehouse Location
                </label>
                <select
                  value={damageBranchId}
                  onChange={(e) => setDamageBranchId(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-medium ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Product Item
                </label>
                <select
                  value={damageProductId}
                  onChange={(e) => setDamageProductId(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-medium ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Cost: रु {p.costPrice.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Damaged Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={damageQty}
                    onChange={(e) => setDamageQty(Math.max(1, Number(e.target.value)))}
                    className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono font-bold text-rose-600 ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    required
                    value={damageInspector}
                    onChange={(e) => setDamageInspector(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-1.5 text-xs ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Damage Cause / Reason Note
                </label>
                <textarea
                  rows={2}
                  required
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  placeholder="e.g. Broken casing during shipment, water leakage in storage..."
                  className={`w-full rounded-xl border px-3 py-1.5 text-xs ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className={`rounded-xl px-4 py-1.5 text-xs font-medium border cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow-md cursor-pointer"
                >
                  Tag Damaged Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Pullout */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        products={products}
        onScanResult={(code) => {
          const matched = products.find(
            (p) =>
              p.barcode.toLowerCase() === code.toLowerCase() ||
              p.sku.toLowerCase() === code.toLowerCase()
          );
          if (matched) {
            handleAddProductToPullout(matched);
          }
          setIsBarcodeScannerOpen(false);
        }}
      />
    </div>
  );
};
