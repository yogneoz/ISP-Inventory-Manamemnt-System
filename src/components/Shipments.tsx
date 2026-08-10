import React, { useState, useEffect } from 'react';
import { Shipment, ShipmentItem, Product, Branch, InventoryStock, User, CustomerDeviceRecord } from '../types';
import { formatDualDate, convertADToBS } from '../utils/nepaliCalendar';
import { getAllowedBranches } from '../utils/permissions';
import { ProductSearchBar } from './ProductSearchBar';
import {
  Truck,
  Plus,
  Search,
  PackageCheck,
  CheckCircle2,
  X,
  Trash2,
  Eye,
  Building2,
  ArrowRight,
  AlertCircle,
  Boxes,
  Barcode,
} from 'lucide-react';

interface ShipmentsProps {
  currentUser?: User | null;
  activeTab?: string;
  shipments: Shipment[];
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  customerDevices?: CustomerDeviceRecord[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  onCreateShipment: (
    shipment: Omit<Shipment, 'id' | 'trackingCode'>
  ) => Promise<void>;
  onReceiveShipment: (id: string) => Promise<void>;
  isDarkMode?: boolean;
}

interface ShipmentFormLine {
  productId: string;
  quantitySent: number;
  deviceSerials: { deviceSerial: string; ponSerial?: string }[];
}

export const Shipments: React.FC<ShipmentsProps> = ({
  currentUser,
  activeTab = 'shipment-list',
  shipments,
  products,
  branches,
  stock,
  customerDevices = [],
  selectedBranchId,
  dateMode,
  onCreateShipment,
  onReceiveShipment,
  isDarkMode = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(activeTab === 'create-shipment');
  const [viewingShipment, setViewingShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize modal open state if activeTab switches to create-shipment
  useEffect(() => {
    if (activeTab === 'create-shipment') {
      setIsModalOpen(true);
    }
  }, [activeTab]);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const userBranchId = currentUser?.branchId && currentUser.branchId !== 'ALL' ? currentUser.branchId : null;

  // Form State - Strict Inter-Branch Stock Transfer
  const type = 'INTER_BRANCH';
  const [sourceBranchId, setSourceBranchId] = useState(branches[0]?.id || 'WH001');
  const [destinationBranchId, setDestinationBranchId] = useState(branches[1]?.id || 'WH002');
  const [notes, setNotes] = useState('');

  // Helper to generate serial pairs for a product
  const generateSerialsForProduct = (prod?: Product, qty: number = 1) => {
    const serials = [];
    const sku = prod?.sku || 'SKU';
    for (let i = 0; i < qty; i++) {
      serials.push({
        deviceSerial: `SN-${sku}-${Math.floor(100000 + Math.random() * 900000)}`,
        ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
      });
    }
    return serials;
  };

  // Multi-Item Transfer Lines with Serial tracking
  const [lines, setLines] = useState<ShipmentFormLine[]>([]);

  const filteredShipments = shipments.filter((sh) => {
    // If branch user, show shipments involving their branch
    const effectiveBranchId = userBranchId || selectedBranchId;
    const matchesBranch =
      effectiveBranchId === 'ALL' ||
      sh.destinationBranchId === effectiveBranchId ||
      sh.sourceBranchId === effectiveBranchId;
    const matchesSearch =
      sh.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sh.sourceBranchName && sh.sourceBranchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sh.destinationBranchName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const getSourceStock = (pId: string, bId: string) => {
    const item = stock.find((s) => s.productId === pId && s.branchId === bId);
    return item ? item.quantityOnHand : 0;
  };

  const addLine = () => {
    const existingIds = new Set(lines.map((l) => l.productId));
    const nextProd = products.find((p) => !existingIds.has(p.id)) || products[0];
    setLines([
      ...lines,
      {
        productId: nextProd?.id || '',
        quantitySent: 1,
        deviceSerials: generateSerialsForProduct(nextProd, 1),
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineProduct = (index: number, newProductId: string) => {
    const updated = [...lines];
    const prod = products.find((p) => p.id === newProductId);
    const qty = updated[index].quantitySent || 1;
    updated[index] = {
      productId: newProductId,
      quantitySent: qty,
      deviceSerials: generateSerialsForProduct(prod, qty),
    };
    setLines(updated);
  };

  const updateLineQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...lines];
    const line = updated[index];
    const prod = products.find((p) => p.id === line.productId);
    const currentSerials = [...(line.deviceSerials || [])];

    while (currentSerials.length < qty) {
      currentSerials.push({
        deviceSerial: `SN-${prod?.sku || 'SKU'}-${Math.floor(100000 + Math.random() * 900000)}`,
        ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
      });
    }
    if (currentSerials.length > qty) {
      currentSerials.length = qty;
    }

    updated[index] = {
      ...line,
      quantitySent: qty,
      deviceSerials: currentSerials,
    };
    setLines(updated);
  };

  const updateLineDeviceSerial = (lineIdx: number, sIdx: number, val: string) => {
    const updated = [...lines];
    const serials = [...(updated[lineIdx].deviceSerials || [])];
    serials[sIdx] = { ...serials[sIdx], deviceSerial: val };
    updated[lineIdx] = { ...updated[lineIdx], deviceSerials: serials };
    setLines(updated);
  };

  const updateLinePonSerial = (lineIdx: number, sIdx: number, val: string) => {
    const updated = [...lines];
    const serials = [...(updated[lineIdx].deviceSerials || [])];
    serials[sIdx] = { ...serials[sIdx], ponSerial: val };
    updated[lineIdx] = { ...updated[lineIdx], deviceSerials: serials };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return;

    const todayAD = new Date().toISOString().split('T')[0];
    const bsObj = convertADToBS(todayAD);
    const srcBranch = branches.find((b) => b.id === sourceBranchId);
    const destBranch = branches.find((b) => b.id === destinationBranchId);

    // Validate Branch Stock Quantity & Serial Register for Source Branch
    const seenSerials = new Set<string>();
    for (const l of lines) {
      const prod = products.find((p) => p.id === l.productId);
      const prodName = prod?.name || 'Item';
      const isSerialized = prod ? prod.requiresSerialTracking !== false && prod.trackingType !== 'QUANTITY_ONLY' : true;
      const srcStock = stock.find((s) => s.productId === l.productId && s.branchId === sourceBranchId);
      const availStock = srcStock ? srcStock.quantityOnHand : 0;

      if (availStock < l.quantitySent) {
        alert(`Branch Stock Error: "${srcBranch?.name || sourceBranchId}" only has ${availStock} unit(s) of "${prodName}" on hand, but ${l.quantitySent} unit(s) are requested for transfer shipment.`);
        return;
      }

      if (isSerialized) {
        if (!l.deviceSerials || l.deviceSerials.length < l.quantitySent) {
          alert(`Validation Error: Please enter serial numbers for all ${l.quantitySent} unit(s) of "${prodName}".`);
          return;
        }
        for (let sIdx = 0; sIdx < l.quantitySent; sIdx++) {
          const s = l.deviceSerials[sIdx];
          if (!s || !s.deviceSerial?.trim()) {
            alert(`Validation Error: Device Serial # is required for "${prodName}" (Unit #${sIdx + 1}).`);
            return;
          }
          const cleanSerial = s.deviceSerial.trim().toUpperCase();
          const cleanPon = s.ponSerial?.trim().toUpperCase();

          if (seenSerials.has(cleanSerial)) {
            alert(`Validation Error: Duplicate Device Serial #${cleanSerial} detected in shipment lines.`);
            return;
          }
          seenSerials.add(cleanSerial);

          if (customerDevices.length > 0) {
            const match = customerDevices.find(
              (cd) =>
                cd.deviceSerial.trim().toUpperCase() === cleanSerial ||
                (cleanPon && cd.ponSerial && cd.ponSerial.trim().toUpperCase() === cleanPon)
            );

            if (match) {
              if (match.branchId !== sourceBranchId) {
                const regBranch = branches.find((b) => b.id === match.branchId);
                alert(`Serial Register Error: Serial #${cleanSerial} is registered to branch "${regBranch?.name || match.branchId}", not "${srcBranch?.name || sourceBranchId}".`);
                return;
              }
              if (match.status && match.status !== 'IN_STOCK') {
                alert(`Serial Register Error: Serial #${cleanSerial} in branch "${srcBranch?.name || sourceBranchId}" has status "${match.status}" (must be "IN_STOCK").`);
                return;
              }
            } else {
              const branchInStockSerials = customerDevices.filter(
                (cd) => cd.branchId === sourceBranchId && cd.status === 'IN_STOCK'
              );
              if (branchInStockSerials.length > 0) {
                alert(`Serial Register Error: Serial #${cleanSerial} for "${prodName}" is not found in the branch serial register for "${srcBranch?.name || sourceBranchId}".`);
                return;
              }
            }
          }
        }
      }
    }

    const items: ShipmentItem[] = lines.map((l, idx) => {
      const prod = products.find((p) => p.id === l.productId);
      return {
        id: `sh-item-${Date.now()}-${idx}`,
        productId: l.productId,
        productName: prod?.name || 'Item',
        sku: prod?.sku || 'SKU',
        quantitySent: Number(l.quantitySent),
        deviceSerials: l.deviceSerials,
      };
    });

    await onCreateShipment({
      type: 'INTER_BRANCH',
      sourceBranchId,
      sourceBranchName: srcBranch?.name || 'Source Branch',
      destinationBranchId,
      destinationBranchName: destBranch?.name || 'Destination Branch',
      dispatchDateAD: todayAD,
      dispatchDateBS: bsObj.formattedBSShort,
      estimatedArrivalAD: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      status: 'IN_TRANSIT',
      items,
      notes,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Truck className="h-5 w-5 text-indigo-500" />
            <span>
              {activeTab === 'create-shipment'
                ? 'Dispatch Inter-Branch Stock Transfers'
                : activeTab === 'receive-shipment'
                ? 'Inbound Shipment Stock Receiving & Verification'
                : 'All Inter-Branch Shipment Logs & Waybills'}
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeTab === 'create-shipment'
              ? 'Scan barcode or search products to dispatch stock transfers to destination branches.'
              : activeTab === 'receive-shipment'
              ? 'Acknowledge and confirm inbound stock transfers arriving at your branch.'
              : 'Complete tracking registry of all inter-branch shipments and vendor inbound deliveries.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Tracking Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {isSuperAdmin ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Dispatch Multi-Item Transfer</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
              <PackageCheck className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span>Branch Inbound Mode: Receive incoming stock shipments below.</span>
            </div>
          )}
        </div>
      </div>

      {/* Shipment Metrics */}
      <div className="flex-none grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 border shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Transfers Recorded</span>
          <div className={`text-xl font-mono font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {filteredShipments.length} Shipments
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Stock In-Transit</span>
          <div className="text-xl font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {filteredShipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED').length} Active
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Received Stock Transfers</span>
          <div className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {filteredShipments.filter((s) => s.status === 'RECEIVED').length} Received
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-indigo-500/30 bg-indigo-500/5 shadow-sm">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Total In-Transit Quantity</span>
          <div className="text-xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {filteredShipments
              .filter((s) => s.status !== 'RECEIVED')
              .reduce((acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + item.quantitySent, 0), 0)}{' '}
            Units
          </div>
        </div>
      </div>

      {/* Shipment Table */}
      <div className={`rounded-2xl border shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5 sticky top-0 bg-inherit">Tracking Code</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Shipment Type</th>
                <th className="p-3.5 sticky top-0 bg-inherit">From (Source)</th>
                <th className="p-3.5 sticky top-0 bg-inherit">To (Destination)</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Dispatch Date</th>
                <th className="p-3.5 text-center">Transfer Items</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    No shipments or stock transfers recorded.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {sh.trackingCode}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {sh.type === 'INTER_BRANCH' ? 'Inter-Branch Transfer' : 'Supplier Inbound'}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {sh.sourceBranchName || 'External Vendor'}
                    </td>
                    <td className="p-3.5 text-slate-900 dark:text-white font-bold">
                      {sh.destinationBranchName}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {formatDualDate(sh.dispatchDateAD, dateMode)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {sh.items.reduce((s, i) => s + i.quantitySent, 0)} Units ({sh.items.length} skus)
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          sh.status === 'RECEIVED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : sh.status === 'IN_TRANSIT' || sh.status === 'DISPATCHED'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sh.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingShipment(sh)}
                          title="View Shipment Details"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {sh.status !== 'RECEIVED' && (
                          <button
                            onClick={() => onReceiveShipment(sh.id)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-colors cursor-pointer"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Acknowledge & Receive</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Item Shipment Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0f1218] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-slate-800 dark:text-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dispatch Multi-Item Inter-Branch Stock Transfer</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select source branch, target branch, and enter device serial numbers for each transferred item.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    From (Source Branch)
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {getAllowedBranches(currentUser, branches).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    To (Destination Branch)
                  </label>
                  <select
                    value={destinationBranchId}
                    onChange={(e) => setDestinationBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & SKU Fast Entry Search Bar */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Barcode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Scan Barcode or Search Product to Add Transfer Line:</span>
                </label>
                <ProductSearchBar
                  products={products}
                  placeholder="🔍 Scan barcode or type item SKU / name to add transfer line..."
                  onAddOrIncrementProduct={(product) => {
                    setLines((prev) => {
                      const existingIdx = prev.findIndex((l) => l.productId === product.id);
                      if (existingIdx >= 0) {
                        const updated = [...prev];
                        const existing = updated[existingIdx];
                        const newQty = existing.quantitySent + 1;
                        const currentSerials = [...(existing.deviceSerials || [])];
                        currentSerials.push({
                          deviceSerial: `SN-${product.sku}-${Math.floor(100000 + Math.random() * 900000)}`,
                          ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
                        });
                        updated[existingIdx] = {
                          ...existing,
                          quantitySent: newQty,
                          deviceSerials: currentSerials,
                        };
                        return updated;
                      }
                      return [
                        ...prev,
                        {
                          productId: product.id,
                          quantitySent: 1,
                          deviceSerials: generateSerialsForProduct(product, 1),
                        },
                      ];
                    });
                  }}
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-indigo-500" />
                    <span>Transfer Line Items ({lines.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                {lines.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                    <Boxes className="h-8 w-8 text-indigo-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Transfer Bin is Empty
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Scan barcodes or search item names above to add products into this transfer dispatch, or click <strong className="text-indigo-600 dark:text-indigo-400">+ Add Item Line</strong> to choose manually.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5">
                    {lines.map((line, idx) => {
                      const availableStock = getSourceStock(line.productId, sourceBranchId);
                      const prod = products.find((p) => p.id === line.productId);
                      return (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
                        >
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-6">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Product Item</label>
                              <select
                                value={line.productId}
                                onChange={(e) => updateLineProduct(idx, e.target.value)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-3 text-center">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Available Stock</label>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                {availableStock} Units
                              </span>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Transfer Qty</label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={line.quantitySent}
                                onChange={(e) => updateLineQuantity(idx, Number(e.target.value))}
                                className="w-full text-center font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="col-span-1 text-center pt-3">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Remove item line"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expandable Device Serial & PON Serial Fields per Unit */}
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                            <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                              <Barcode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Serial Numbers for {prod?.name || 'Item'} (Qty: {line.quantitySent})</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Array.from({ length: line.quantitySent }).map((_, sIdx) => (
                                <div key={sIdx} className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-slate-400">#{sIdx + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      placeholder="Device Serial #"
                                      value={line.deviceSerials?.[sIdx]?.deviceSerial || ''}
                                      onChange={(e) => updateLineDeviceSerial(idx, sIdx, e.target.value)}
                                      className="w-full px-2 py-1 text-[11px] font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/50 rounded border border-indigo-200 dark:border-indigo-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      placeholder="PON Serial #"
                                      value={line.deviceSerials?.[sIdx]?.ponSerial || ''}
                                      onChange={(e) => updateLinePonSerial(idx, sIdx, e.target.value)}
                                      className="w-full px-2 py-1 text-[11px] font-mono font-bold text-blue-900 dark:text-blue-200 bg-blue-50/50 dark:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {lines.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="font-semibold">Transfer Bin Summary:</span>
                    <span className="font-bold font-mono">
                      {lines.length} Product SKU{lines.length > 1 ? 's' : ''} | {lines.reduce((sum, l) => sum + (l.quantitySent || 0), 0)} Total Units
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Vehicle / Waybill / Transport Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Driver Ramesh Shrestha (Ba 2 Kha 9021)"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Dispatch Stock Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Shipment Details Modal */}
      {viewingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0f1218] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-500" />
                <span>Stock Transfer Manifest — {viewingShipment.trackingCode}</span>
              </h3>
              <button
                onClick={() => setViewingShipment(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Source Branch</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{viewingShipment.sourceBranchName || 'Central Warehouse'}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-500" />
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination Branch</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{viewingShipment.destinationBranchName}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-center">Qty Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {viewingShipment.items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-white">{item.productName}</td>
                          <td className="p-3 font-mono text-slate-500">{item.sku}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.quantitySent} Units</td>
                        </tr>

                        {/* Render Serial Numbers if present */}
                        {item.deviceSerials && item.deviceSerials.length > 0 && (
                          <tr className="bg-indigo-50/40 dark:bg-indigo-950/30">
                            <td colSpan={4} className="p-3">
                              <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                                <Barcode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Attached Device & PON Serial Numbers:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.deviceSerials.map((s, sIdx) => (
                                  <div key={sIdx} className="bg-white dark:bg-slate-900 p-2 rounded border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between font-mono text-[11px]">
                                    <span className="text-slate-400 font-bold">#{sIdx + 1}</span>
                                    <span className="text-indigo-700 dark:text-indigo-300 font-bold">{s.deviceSerial}</span>
                                    {s.ponSerial && <span className="text-blue-600 dark:text-blue-400 font-semibold">{s.ponSerial}</span>}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
