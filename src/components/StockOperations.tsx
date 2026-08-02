import React, { useState } from 'react';
import { StockOperation, Product, Branch } from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  ArrowLeftRight,
  Plus,
  AlertOctagon,
  Trash2,
  FileSpreadsheet,
  X,
  UserCheck,
} from 'lucide-react';

interface StockOperationsProps {
  operations: StockOperation[];
  products: Product[];
  branches: Branch[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  initialType?: StockOperation['type'];
  autoOpenModal?: boolean;
  isDarkMode?: boolean;
  onCreateOperation: (
    op: Omit<
      StockOperation,
      'id' | 'referenceNumber' | 'dateAD' | 'dateBS' | 'totalValue' | 'fiscalYear'
    >
  ) => Promise<void>;
}

export const StockOperations: React.FC<StockOperationsProps> = ({
  operations,
  products,
  branches,
  selectedBranchId,
  dateMode,
  initialType = 'DAMAGE',
  autoOpenModal = false,
  isDarkMode = false,
  onCreateOperation,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(autoOpenModal);
  const [type, setType] = useState<StockOperation['type']>(initialType);
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantityChanged, setQuantityChanged] = useState<number>(-5);
  const [costPerUnit, setCostPerUnit] = useState<number>(products[0]?.costPrice || 1000);
  const [reason, setReason] = useState('Transit damaged / defective packaging');
  const [inspectorName, setInspectorName] = useState('Senior Quality Inspector');

  const filteredOperations = operations.filter((op) => {
    return selectedBranchId === 'ALL' || op.branchId === selectedBranchId;
  });

  const handleProductChange = (prodId: string) => {
    setProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setCostPerUnit(prod.costPrice);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    await onCreateOperation({
      type,
      branchId,
      productId,
      productName: prod.name,
      quantityChanged: Number(quantityChanged),
      costPerUnit: Number(costPerUnit),
      reason,
      inspectorName,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-rose-500" />
            <span>Stock Operations: Pullout, Damage & Write-offs</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Log vendor returns (pullout), transit damage write-offs, and store consumption logs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Record Stock Operation</span>
        </button>
      </div>

      {/* Operations Table */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden transition-colors ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
              isDarkMode ? 'bg-slate-900/50 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5">Reference #</th>
                <th className="p-3.5">Operation Type</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5 text-right">Qty Change</th>
                <th className="p-3.5 text-right">Total Loss Value</th>
                <th className="p-3.5">Inspector / Officer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Reason Note</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                    No stock write-offs or pullout operations recorded.
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
                      <td className="p-3.5">
                        <span
                          className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            op.type === 'PULLOUT'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : op.type === 'DAMAGE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}
                        >
                          {op.type}
                        </span>
                      </td>
                      <td className={`p-3.5 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{op.productName}</td>
                      <td className={`p-3.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{branch?.name}</td>
                      <td className="p-3.5 text-right font-extrabold text-rose-600 font-mono">
                        {op.quantityChanged}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        रु {op.totalValue.toLocaleString()}
                      </td>
                      <td className={`p-3.5 text-[11px] font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transition-colors ${
            isDarkMode
              ? 'bg-[#0f1218] border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b p-4 ${
              isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
                <span>Log Stock Write-Off / Pullout</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Operation Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <option value="PULLOUT">PULLOUT (Vendor Return)</option>
                    <option value="DAMAGE">DAMAGE / Wastage</option>
                    <option value="STOCK_OUT">STOCK_OUT (Internal Use)</option>
                    <option value="MANUAL_ADJUSTMENT">MANUAL ADJUSTMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Branch Location
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Quantity Adjustment (e.g. -5)
                  </label>
                  <input
                    type="number"
                    required
                    value={quantityChanged}
                    onChange={(e) => setQuantityChanged(Number(e.target.value))}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono font-extrabold text-rose-600 ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Unit Cost Basis (NPR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(Number(e.target.value))}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Inspector / Authorizing Officer
                </label>
                <input
                  type="text"
                  required
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Detailed Reason / Audit Explanation
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Liquid leakage during transportation"
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    isDarkMode
                      ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-200"
                >
                  Commit Write-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
