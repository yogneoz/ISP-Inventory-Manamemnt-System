import React, { useState } from 'react';
import { PurchaseOrder, PurchaseInvoice, Shipment, Branch, Supplier } from '../types';
import { exportToCSV } from '../utils/exportUtils';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  Building2,
  Truck,
  Receipt,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ExportReportsProps {
  purchaseOrders: PurchaseOrder[];
  invoices: PurchaseInvoice[];
  shipments: Shipment[];
  branches: Branch[];
  suppliers: Supplier[];
  dateMode: 'BS' | 'AD';
  isDarkMode?: boolean;
}

export const ExportReports: React.FC<ExportReportsProps> = ({
  purchaseOrders,
  invoices,
  shipments,
  branches,
  suppliers,
  dateMode,
  isDarkMode = false,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'PO' | 'PI' | 'SHIPMENTS'>('PO');

  // Common Date Filters
  const [startDateAD, setStartDateAD] = useState<string>('');
  const [endDateAD, setEndDateAD] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('ALL');

  // Specific Filters
  const [poStatusFilter, setPoStatusFilter] = useState<string>('ALL');
  const [piPaymentStatusFilter, setPiPaymentStatusFilter] = useState<string>('ALL');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<string>('ALL');
  const [shipmentMode, setShipmentMode] = useState<'ALL' | 'CREATED' | 'RECEIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reset Filters
  const handleResetFilters = () => {
    setStartDateAD('');
    setEndDateAD('');
    setSelectedBranchId('ALL');
    setSelectedSupplierName('ALL');
    setPoStatusFilter('ALL');
    setPiPaymentStatusFilter('ALL');
    setShipmentStatusFilter('ALL');
    setShipmentMode('ALL');
    setSearchQuery('');
  };

  // Quick Date Presets
  const applyDatePreset = (preset: 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'ALL_TIME') => {
    const today = new Date();
    if (preset === 'ALL_TIME') {
      setStartDateAD('');
      setEndDateAD('');
      return;
    }
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateAD(firstDay.toISOString().split('T')[0]);
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
      const firstYearDay = new Date(today.getFullYear(), 0, 1);
      setStartDateAD(firstYearDay.toISOString().split('T')[0]);
      setEndDateAD(today.toISOString().split('T')[0]);
      return;
    }
  };

  // ----------------
  // 1. PO Filtering
  // ----------------
  const filteredPOs = purchaseOrders.filter((po) => {
    if (startDateAD && po.orderDateAD < startDateAD) return false;
    if (endDateAD && po.orderDateAD > endDateAD) return false;
    if (selectedBranchId !== 'ALL' && po.branchId !== selectedBranchId) return false;
    if (selectedSupplierName !== 'ALL' && po.supplierName !== selectedSupplierName) return false;
    if (poStatusFilter !== 'ALL' && po.status !== poStatusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNo = po.poNumber.toLowerCase().includes(q);
      const matchSup = po.supplierName.toLowerCase().includes(q);
      const matchItem = po.items.some((it) => it.productName.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
      if (!matchNo && !matchSup && !matchItem) return false;
    }
    return true;
  });

  const exportPOCSV = () => {
    const columns = [
      { key: 'poNumber', label: 'PO Number' },
      { key: 'orderDateAD', label: 'Order Date (AD)' },
      { key: 'orderDateBS', label: 'Order Date (BS)' },
      { key: 'supplierName', label: 'Supplier Name' },
      {
        key: 'branchId',
        label: 'Branch Location',
        formatter: (val: string) => branches.find((b) => b.id === val)?.name || val,
      },
      {
        key: 'items',
        label: 'Items Summary',
        formatter: (items: any[]) => items.map((i) => `${i.productName} (${i.quantity} ${i.unit || 'Pcs'})`).join('; '),
      },
      { key: 'itemsCount', label: 'Total Item Types', formatter: (_: any, row: any) => String(row.items?.length || 0) },
      { key: 'subtotalAmount', label: 'Subtotal Amount (NPR)' },
      { key: 'taxAmount', label: 'VAT Amount (NPR)' },
      { key: 'totalAmount', label: 'Grand Total Amount (NPR)' },
      { key: 'status', label: 'PO Status' },
      { key: 'notes', label: 'Notes' },
    ];
    exportToCSV('Purchase_Orders_Report', filteredPOs, columns);
  };

  // ----------------
  // 2. PI Filtering
  // ----------------
  const filteredPIs = invoices.filter((pi) => {
    if (startDateAD && pi.invoiceDateAD < startDateAD) return false;
    if (endDateAD && pi.invoiceDateAD > endDateAD) return false;
    if (selectedBranchId !== 'ALL' && pi.branchId !== selectedBranchId) return false;
    if (selectedSupplierName !== 'ALL' && pi.supplierName !== selectedSupplierName) return false;
    if (piPaymentStatusFilter !== 'ALL' && pi.paymentStatus !== piPaymentStatusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchInv = pi.invoiceNumber.toLowerCase().includes(q);
      const matchBill = pi.vendorBillNumber?.toLowerCase().includes(q);
      const matchSup = pi.supplierName.toLowerCase().includes(q);
      if (!matchInv && !matchBill && !matchSup) return false;
    }
    return true;
  });

  const exportPICSV = () => {
    const columns = [
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'vendorBillNumber', label: 'Vendor Bill No.' },
      { key: 'poReferenceId', label: 'PO Ref' },
      { key: 'invoiceDateAD', label: 'Invoice Date (AD)' },
      { key: 'invoiceDateBS', label: 'Invoice Date (BS)' },
      { key: 'dueDateAD', label: 'Due Date (AD)' },
      { key: 'supplierName', label: 'Supplier Name' },
      {
        key: 'branchId',
        label: 'Branch Location',
        formatter: (val: string) => branches.find((b) => b.id === val)?.name || val,
      },
      { key: 'taxableAmount', label: 'Taxable Subtotal (NPR)' },
      { key: 'vatAmount', label: 'VAT Amount (NPR)' },
      { key: 'grandTotal', label: 'Grand Total (NPR)' },
      { key: 'amountPaid', label: 'Amount Paid (NPR)' },
      {
        key: 'balanceDue',
        label: 'Balance Due (NPR)',
        formatter: (_: any, row: any) => String(Math.max(0, row.grandTotal - row.amountPaid)),
      },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'notes', label: 'Notes' },
    ];
    exportToCSV('Purchase_Invoices_Report', filteredPIs, columns);
  };

  // --------------------
  // 3. Shipment Filtering
  // --------------------
  const filteredShipments = shipments.filter((sh) => {
    if (startDateAD && sh.dispatchDateAD < startDateAD) return false;
    if (endDateAD && sh.dispatchDateAD > endDateAD) return false;

    if (selectedBranchId !== 'ALL') {
      const isSource = sh.sourceBranchId === selectedBranchId;
      const isDest = sh.destinationBranchId === selectedBranchId;
      if (shipmentMode === 'CREATED' && !isSource) return false;
      if (shipmentMode === 'RECEIVED' && !isDest) return false;
      if (shipmentMode === 'ALL' && !isSource && !isDest) return false;
    } else {
      if (shipmentMode === 'CREATED' && !sh.sourceBranchId) return false;
    }

    if (shipmentStatusFilter !== 'ALL' && sh.status !== shipmentStatusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrack = sh.trackingCode.toLowerCase().includes(q);
      const matchDest = sh.destinationBranchName.toLowerCase().includes(q);
      const matchSrc = sh.sourceBranchName?.toLowerCase().includes(q);
      const matchItem = sh.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      if (!matchTrack && !matchDest && !matchSrc && !matchItem) return false;
    }
    return true;
  });

  const exportShipmentsCSV = () => {
    const columns = [
      { key: 'trackingCode', label: 'Tracking Code' },
      { key: 'type', label: 'Shipment Type' },
      { key: 'dispatchDateAD', label: 'Dispatch Date (AD)' },
      { key: 'dispatchDateBS', label: 'Dispatch Date (BS)' },
      { key: 'sourceBranchName', label: 'Source Origin' },
      { key: 'destinationBranchName', label: 'Destination Branch' },
      {
        key: 'totalSentUnits',
        label: 'Total Sent Units',
        formatter: (_: any, row: any) => String(row.items.reduce((sum: number, i: any) => sum + i.quantitySent, 0)),
      },
      {
        key: 'totalReceivedUnits',
        label: 'Total Received Units',
        formatter: (_: any, row: any) => String(row.items.reduce((sum: number, i: any) => sum + (i.quantityReceived || 0), 0)),
      },
      { key: 'status', label: 'Shipment Status' },
      {
        key: 'itemsSummary',
        label: 'Manifest Items',
        formatter: (_: any, row: any) =>
          row.items.map((i: any) => `${i.productName} (Sent: ${i.quantitySent}, Rec: ${i.quantityReceived || 0})`).join('; '),
      },
      { key: 'notes', label: 'Notes' },
    ];
    exportToCSV('Shipments_Transfer_Report', filteredShipments, columns);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Download className="h-5 w-5 text-indigo-500" />
            <span>Administration Export Reports</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Generate and download audit-ready Excel/CSV reports for Purchase Orders, Purchase Invoices, and Inbound/Outbound Shipments.
          </p>
        </div>

        {/* Action Trigger Button */}
        <div>
          {activeReportTab === 'PO' && (
            <button
              onClick={exportPOCSV}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
              <span>Export Purchase Orders CSV ({filteredPOs.length})</span>
            </button>
          )}

          {activeReportTab === 'PI' && (
            <button
              onClick={exportPICSV}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-white" />
              <span>Export Purchase Invoices CSV ({filteredPIs.length})</span>
            </button>
          )}

          {activeReportTab === 'SHIPMENTS' && (
            <button
              onClick={exportShipmentsCSV}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 shadow-md shadow-amber-900/30 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-white" />
              <span>Export Shipments Report CSV ({filteredShipments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Selection */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-2 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveReportTab('PO')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'PO'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>1. Purchase Orders (PO)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
            {purchaseOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('PI')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'PI'
              ? 'bg-emerald-600 text-white shadow-md'
              : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>2. Purchase Invoices (PI)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('SHIPMENTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'SHIPMENTS'
              ? 'bg-amber-600 text-white shadow-md'
              : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>3. Shipments (Created / Received)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
            {shipments.length}
          </span>
        </button>
      </div>

      {/* Filter Control Bar */}
      <div className={`p-4 rounded-2xl border space-y-4 ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Report Filter Parameters
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => applyDatePreset('THIS_MONTH')}
              className="text-[11px] font-semibold text-indigo-500 hover:underline cursor-pointer"
            >
              This Month
            </button>
            <span className="text-slate-400">•</span>
            <button
              onClick={() => applyDatePreset('LAST_30_DAYS')}
              className="text-[11px] font-semibold text-indigo-500 hover:underline cursor-pointer"
            >
              Last 30 Days
            </button>
            <span className="text-slate-400">•</span>
            <button
              onClick={() => applyDatePreset('THIS_YEAR')}
              className="text-[11px] font-semibold text-indigo-500 hover:underline cursor-pointer"
            >
              This Year
            </button>
            <span className="text-slate-400">•</span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Start Date (AD)
            </label>
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
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              End Date (AD)
            </label>
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
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Branch Location
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Tab Specific Filters */}
          {activeReportTab === 'PO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                PO Status
              </label>
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent / Active</option>
                <option value="RECEIVED">Received</option>
                <option value="APPROVED">Approved</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          {activeReportTab === 'PI' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Payment Status
              </label>
              <select
                value={piPaymentStatusFilter}
                onChange={(e) => setPiPaymentStatusFilter(e.target.value)}
                className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Fully Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid / Outstanding</option>
              </select>
            </div>
          )}

          {activeReportTab === 'SHIPMENTS' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Shipment Direction / Mode
              </label>
              <select
                value={shipmentMode}
                onChange={(e) => setShipmentMode(e.target.value as any)}
                className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Shipments (Created & Received)</option>
                <option value="CREATED">Created Dispatches (Outbound)</option>
                <option value="RECEIVED">Received Shipments (Inbound)</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Query */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeReportTab} records by reference code, supplier, product name or SKU...`}
            className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-medium ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* TABLE DISPLAY AREA */}
      {/* 1. Purchase Orders Table */}
      {activeReportTab === 'PO' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Order Date</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Branch Location</th>
                  <th className="p-3.5 text-center">Item Types</th>
                  <th className="p-3.5 text-right">Subtotal</th>
                  <th className="p-3.5 text-right">VAT Amount</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No Purchase Orders found matching selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => {
                    const branchName = branches.find((b) => b.id === po.branchId)?.name || po.branchId;
                    const dateFormatted = formatDualDate(po.orderDateAD, dateMode);

                    return (
                      <tr key={po.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3.5 font-bold font-mono text-indigo-500">{po.poNumber}</td>
                        <td className="p-3.5 text-slate-500">{dateFormatted}</td>
                        <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {po.supplierName}
                        </td>
                        <td className="p-3.5 text-slate-500">{branchName}</td>
                        <td className="p-3.5 text-center font-mono">{po.items?.length || 0} items</td>
                        <td className="p-3.5 text-right font-mono">रु {po.subtotalAmount.toLocaleString()}</td>
                        <td className="p-3.5 text-right font-mono text-indigo-500">रु {po.taxAmount.toLocaleString()}</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          रु {po.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            po.status === 'RECEIVED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : po.status === 'SENT'
                              ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                              : po.status === 'APPROVED'
                              ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                              : po.status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}>
                            {po.status}
                          </span>
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

      {/* 2. Purchase Invoices Table */}
      {activeReportTab === 'PI' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Bill / Ref #</th>
                  <th className="p-3.5">Invoice Date</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Branch</th>
                  <th className="p-3.5 text-right">Taxable Subtotal</th>
                  <th className="p-3.5 text-right">13% VAT</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5 text-right">Paid Amount</th>
                  <th className="p-3.5 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredPIs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No Purchase Invoices found matching selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPIs.map((pi) => {
                    const branchName = branches.find((b) => b.id === pi.branchId)?.name || pi.branchId;
                    const dateFormatted = formatDualDate(pi.invoiceDateAD, dateMode);

                    return (
                      <tr key={pi.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3.5 font-bold font-mono text-emerald-500">{pi.invoiceNumber}</td>
                        <td className="p-3.5 font-mono text-slate-400">{pi.vendorBillNumber || pi.poReferenceId || '-'}</td>
                        <td className="p-3.5 text-slate-500">{dateFormatted}</td>
                        <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {pi.supplierName}
                        </td>
                        <td className="p-3.5 text-slate-500">{branchName}</td>
                        <td className="p-3.5 text-right font-mono">रु {pi.taxableAmount.toLocaleString()}</td>
                        <td className="p-3.5 text-right font-mono text-indigo-500">रु {pi.vatAmount.toLocaleString()}</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          रु {pi.grandTotal.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-emerald-600 font-semibold">
                          रु {pi.amountPaid.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pi.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : pi.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {pi.paymentStatus}
                          </span>
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

      {/* 3. Shipments Table */}
      {activeReportTab === 'SHIPMENTS' && (
        <div className={`rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`font-bold uppercase text-[10px] tracking-wider border-b ${
                isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">Tracking Code</th>
                  <th className="p-3.5">Dispatch Date</th>
                  <th className="p-3.5">Origin (From)</th>
                  <th className="p-3.5">Destination (To)</th>
                  <th className="p-3.5 text-center">Manifest Types</th>
                  <th className="p-3.5 text-center">Sent Units</th>
                  <th className="p-3.5 text-center">Received Units</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No Shipment records found matching selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((sh) => {
                    const dateFormatted = formatDualDate(sh.dispatchDateAD, dateMode);
                    const sentUnits = sh.items.reduce((s, i) => s + i.quantitySent, 0);
                    const recUnits = sh.items.reduce((s, i) => s + (i.quantityReceived || 0), 0);

                    return (
                      <tr key={sh.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3.5 font-bold font-mono text-amber-500">{sh.trackingCode}</td>
                        <td className="p-3.5 text-slate-500">{dateFormatted}</td>
                        <td className="p-3.5 text-slate-400">{sh.sourceBranchName || 'Central HQ'}</td>
                        <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {sh.destinationBranchName}
                        </td>
                        <td className="p-3.5 text-center font-mono">{sh.items?.length || 0} SKUs</td>
                        <td className="p-3.5 text-center font-mono font-bold">{sentUnits} Pcs</td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-500">{recUnits} Pcs</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sh.status === 'RECEIVED' || sh.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : sh.status === 'IN_TRANSIT' || sh.status === 'DISPATCHED'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {sh.status}
                          </span>
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
