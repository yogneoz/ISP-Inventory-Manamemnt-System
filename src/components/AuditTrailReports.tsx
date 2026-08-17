import React, { useState } from 'react';
import {
  AuditLog,
  TransactionLog,
  FinancialSummary,
  Product,
  Branch,
  Asset,
  PurchaseInvoice,
} from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import { exportToCSV } from '../utils/exportUtils';
import {
  FileSpreadsheet,
  History,
  ShieldCheck,
  TrendingUp,
  Scale,
  Receipt,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';

interface AuditTrailReportsProps {
  auditLogs: AuditLog[];
  transactionLogs: TransactionLog[];
  financialSummary: FinancialSummary;
  products: Product[];
  branches: Branch[];
  assets: Asset[];
  invoices: PurchaseInvoice[];
  dateMode: 'BS' | 'AD';
  onOpenAiModal: () => void;
}

export const AuditTrailReports: React.FC<AuditTrailReportsProps> = ({
  auditLogs,
  transactionLogs,
  financialSummary,
  products,
  branches,
  assets,
  invoices,
  dateMode,
  onOpenAiModal,
}) => {
  const [subTab, setSubTab] = useState<
    'AUDIT_TRAIL' | 'STOCK_TRANSACTIONS'
  >('AUDIT_TRAIL');

  // Compute Balance Sheet numbers
  const inventoryAssetVal = financialSummary.totalInventoryAssetValue;
  const fixedAssetNBV = assets.reduce((sum, a) => sum + a.netBookValue, 0);
  const totalAssets = inventoryAssetVal + fixedAssetNBV;

  const accountsPayable = invoices.reduce(
    (sum, inv) => sum + (inv.grandTotal - inv.amountPaid),
    0
  );
  const netEquity = totalAssets - accountsPayable;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span>Activities Log (System Audit Trail)</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Realtime security audit trails, user access activities, role permissions changes, and system mutation records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-950/50 hover:brightness-110 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI Activity Analysis</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print Log</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('AUDIT_TRAIL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'AUDIT_TRAIL'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>User & Security Activities</span>
        </button>

        <button
          onClick={() => setSubTab('STOCK_TRANSACTIONS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'STOCK_TRANSACTIONS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Stock Audit Events</span>
        </button>
      </div>

      {/* Sub-Tab 1: Financial Statements */}
      {subTab === 'FINANCIAL_STATEMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Sheet Card */}
          <div className="rounded-2xl bg-[#0f1218] border border-slate-800 p-5 shadow-xl space-y-4 text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-400" />
                <span>Statement of Financial Position (Balance Sheet)</span>
              </h3>
              <span className="text-[11px] font-bold font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                FY {financialSummary.currentFiscalYear} BS
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-bold text-indigo-400 uppercase text-[10px] tracking-wider">
                Current & Non-Current Assets
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <span>Inventory Stock Assets (At Cost Basis)</span>
                <span className="font-mono font-bold text-white">रु {inventoryAssetVal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <span>Fixed Assets (Net Book Value)</span>
                <span className="font-mono font-bold text-white">रु {fixedAssetNBV.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-indigo-950/60 border border-indigo-500/30 font-extrabold text-white text-sm">
                <span>Total Calculated Assets</span>
                <span className="font-mono">रु {totalAssets.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 font-bold text-indigo-400 uppercase text-[10px] tracking-wider">
                Liabilities & Equity
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <span>Accounts Payable (Unpaid Purchase Invoices)</span>
                <span className="font-mono font-bold text-rose-400">रु {accountsPayable.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <span>Owner's Working Capital Equity</span>
                <span className="font-mono font-bold text-white">रु {netEquity.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-extrabold text-emerald-300 text-sm">
                <span>Total Liabilities & Equity</span>
                <span className="font-mono">रु {(accountsPayable + netEquity).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Income Statement Summary Card */}
          <div className="rounded-2xl bg-[#0f1218] border border-slate-800 p-5 shadow-xl space-y-4 text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Financial Loss & Expense Statement</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                YTD Summary
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <span>Total Inventory Purchases</span>
                <span className="font-mono font-bold text-white">रु {invoices.reduce((s, i) => s + i.taxableAmount, 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-rose-950/40 border border-rose-500/20 text-rose-300">
                <span>Damage, Wastage & Pullout Write-off Value</span>
                <span className="font-mono font-bold">रु {financialSummary.totalDamageLossValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-300">
                <span>Input VAT Claimable Credit</span>
                <span className="font-mono font-bold">रु {financialSummary.totalVatInputTax.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: VAT Tax Register */}
      {subTab === 'VAT_REGISTER' && (
        <div className="rounded-2xl bg-[#0f1218] border border-slate-800 shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm">
              Inland Revenue Department (IRD) Nepal VAT Purchase Register
            </h3>
            <button
              onClick={() =>
                exportToCSV('IZone_IRD_VAT_Register', invoices, [
                  { key: 'invoiceNumber', label: 'Invoice Ref #' },
                  { key: 'supplierName', label: 'Supplier Name' },
                  { key: 'invoiceDateAD', label: 'Date (AD)' },
                  { key: 'invoiceDateBS', label: 'Date (BS)' },
                  { key: 'taxableAmount', label: 'Taxable Base (NPR)' },
                  { key: 'vatAmount', label: '13% VAT (NPR)' },
                  { key: 'grandTotal', label: 'Grand Total (NPR)' },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>Export VAT Register CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Invoice Date</th>
                  <th className="p-3 text-right">Taxable Amount</th>
                  <th className="p-3 text-right">13% VAT Amount</th>
                  <th className="p-3 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3 font-bold text-white">{inv.supplierName}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {formatDualDate(inv.invoiceDateAD, dateMode)}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-slate-200">
                      रु {inv.taxableAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-400">
                      रु {inv.vatAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-white">
                      रु {inv.grandTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Stock Transactions Ledger */}
      {subTab === 'STOCK_TRANSACTIONS' && (
        <div className="rounded-2xl bg-[#0f1218] border border-slate-800 shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm">
              Realtime Stock Movement Transaction Logs
            </h3>
            <button
              onClick={() =>
                exportToCSV('IZone_Stock_Transaction_Ledger', transactionLogs, [
                  { key: 'transactionNumber', label: 'Txn #' },
                  { key: 'productName', label: 'Product' },
                  { key: 'productSku', label: 'SKU' },
                  { key: 'changeType', label: 'Type' },
                  { key: 'quantityBefore', label: 'Qty Before' },
                  { key: 'quantityChanged', label: 'Change' },
                  { key: 'quantityAfter', label: 'Qty After' },
                  { key: 'timestampAD', label: 'Timestamp (AD)' },
                  { key: 'timestampBS', label: 'Timestamp (BS)' },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>Export Stock Ledger CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Txn #</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Change Type</th>
                  <th className="p-3 text-right">Qty Before</th>
                  <th className="p-3 text-right">Change</th>
                  <th className="p-3 text-right">Qty After</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-300">
                      {log.transactionNumber}
                    </td>
                    <td className="p-3 font-bold text-white">{log.productName}</td>
                    <td className="p-3">
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-800">
                        {log.changeType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">{log.quantityBefore}</td>
                    <td
                      className={`p-3 text-right font-mono font-extrabold ${
                        log.quantityChanged > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {log.quantityAfter}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {formatDualDate(log.timestampAD, dateMode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: System User Audit Log */}
      {subTab === 'AUDIT_TRAIL' && (
        <div className="rounded-2xl bg-[#0f1218] border border-slate-800 shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm">
              System Action Audit Log (User & Security Actions)
            </h3>
            <button
              onClick={() =>
                exportToCSV('IZone_System_Audit_Log', auditLogs, [
                  { key: 'userName', label: 'User Name' },
                  { key: 'userEmail', label: 'User Email' },
                  { key: 'module', label: 'Module' },
                  { key: 'action', label: 'Action' },
                  { key: 'details', label: 'Details' },
                  { key: 'timestampAD', label: 'Timestamp (AD)' },
                  { key: 'timestampBS', label: 'Timestamp (BS)' },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>Export Audit Logs CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">{log.userName}</td>
                    <td className="p-3">
                      <span className="rounded bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200">{log.action}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{log.details}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {formatDualDate(log.timestampAD, dateMode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
