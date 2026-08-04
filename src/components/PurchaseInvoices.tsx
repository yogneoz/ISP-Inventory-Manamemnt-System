import React, { useState } from 'react';
import { PurchaseInvoice, PurchaseInvoiceItem, PurchaseOrder, Product, Branch, InventoryStock, DeviceSerialPair } from '../types';
import { formatDualDate, convertADToBS } from '../utils/nepaliCalendar';
import { exportToCSV } from '../utils/exportUtils';
import { ProductSearchBar } from './ProductSearchBar';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  FileText,
  X,
  CreditCard,
  Building2,
  Calculator,
  Eye,
  Tag,
  AlertCircle,
  Printer,
  Calendar,
  Barcode,
  Wifi,
  Download,
  ShoppingCart,
  Link,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

interface PurchaseInvoicesProps {
  invoices: PurchaseInvoice[];
  products: Product[];
  branches: Branch[];
  stock: InventoryStock[];
  purchaseOrders?: PurchaseOrder[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  autoOpenModal?: boolean;
  onCreateInvoice: (inv: Omit<PurchaseInvoice, 'id' | 'invoiceNumber'> & { poReferenceId?: string }) => Promise<void>;
  onRecordPayment: (id: string, amount: number) => Promise<void>;
  isDarkMode?: boolean;
}

// Pre-seeded database vendors
const DB_SUPPLIERS = [
  'Himalayan Tech Distributors Pvt. Ltd.',
  'Nepal Optical & Fiber Optics Importers',
  'Apex Networking Hardware Traders',
  'Subisu & Hardware Supplies Pvt. Ltd.',
  'WorldLink Telecom Equipment Corp',
];

interface InvoiceFormLine {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  deviceSerials: DeviceSerialPair[];
}

export const PurchaseInvoices: React.FC<PurchaseInvoicesProps> = ({
  invoices,
  products,
  branches,
  stock,
  purchaseOrders = [],
  selectedBranchId,
  dateMode,
  autoOpenModal = false,
  onCreateInvoice,
  onRecordPayment,
  isDarkMode = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(autoOpenModal);
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Link Purchase Order State
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [isPoSelectModalOpen, setIsPoSelectModalOpen] = useState<boolean>(false);
  const [poSearchQuery, setPoSearchQuery] = useState<string>('');
  const [isPoChecklistOpen, setIsPoChecklistOpen] = useState<boolean>(false);

  // Bill-wise Discount State
  const [billDiscountType, setBillDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);

  // Form State
  const [supplierName, setSupplierName] = useState(DB_SUPPLIERS[0]);
  const [vendorBillNumber, setVendorBillNumber] = useState(`BILL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [vendorBillDateAD, setVendorBillDateAD] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [branchId, setBranchId] = useState(
    selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id || 'br-ktm'
  );
  const [taxationType, setTaxationType] = useState<'TAXABLE_13' | 'TAX_EXEMPTED'>('TAXABLE_13');
  const [notes, setNotes] = useState('');

  // Multi-Item Bill Lines (empty by default until scanned/searched)
  const [lines, setLines] = useState<InvoiceFormLine[]>([]);

  // Pending POs list for selection
  const pendingPOs = purchaseOrders.filter(
    (po) => po.status !== 'RECEIVED' && po.status !== 'CANCELLED'
  );
  const activePO = purchaseOrders.find((po) => po.id === selectedPoId || po.poNumber === selectedPoId);

  const filteredPendingPOs = pendingPOs.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(poSearchQuery.toLowerCase())
  );

  const filteredInvoices = invoices.filter((inv) => {
    const matchesBranch = selectedBranchId === 'ALL' || inv.branchId === selectedBranchId;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.vendorBillNumber && inv.vendorBillNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  // Financial Metrics
  const totalTaxable = filteredInvoices.reduce((s, i) => s + i.taxableAmount, 0);
  const totalVAT = filteredInvoices.reduce((s, i) => s + i.vatAmount, 0);
  const totalGrand = filteredInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalUnpaid = filteredInvoices.reduce(
    (s, i) => s + (i.grandTotal - i.amountPaid),
    0
  );

  // Search/Scan Product Add or Duplicate Quantity Increment
  const handleAddOrIncrementProduct = (prod: Product) => {
    const isSerialized = prod.requiresSerialTracking !== false;
    setLines((prevLines) => {
      const existingIdx = prevLines.findIndex((l) => l.productId === prod.id);
      if (existingIdx !== -1) {
        // Duplicate product entered -> Increase quantity!
        const updated = [...prevLines];
        const newQty = updated[existingIdx].quantity + 1;
        const currentSerials = [...(updated[existingIdx].deviceSerials || [])];
        if (isSerialized) {
          while (currentSerials.length < newQty) {
            currentSerials.push({
              deviceSerial: `SN-${prod.sku}-${Math.floor(100000 + Math.random() * 900000)}`,
              ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
            });
          }
        }
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          deviceSerials: isSerialized ? currentSerials : [],
        };
        return updated;
      } else {
        // Add new row with initial serial pair if serialized
        return [
          ...prevLines,
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            unit: prod.unit,
            quantity: 1,
            unitPrice: prod.costPrice,
            discount: 0,
            deviceSerials: isSerialized
              ? [
                  {
                    deviceSerial: `SN-${prod.sku}-${Math.floor(100000 + Math.random() * 900000)}`,
                    ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
                  },
                ]
              : [],
          },
        ];
      }
    });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLineQty = (index: number, newQty: number) => {
    const updated = [...lines];
    const qty = Math.max(1, newQty);
    updated[index].quantity = qty;
    const prod = products.find((p) => p.id === updated[index].productId);
    const isSerialized = prod ? prod.requiresSerialTracking !== false : true;

    if (isSerialized) {
      const currentSerials = [...(updated[index].deviceSerials || [])];
      while (currentSerials.length < qty) {
        currentSerials.push({
          deviceSerial: `SN-${updated[index].sku}-${Math.floor(100000 + Math.random() * 900000)}`,
          ponSerial: `HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`,
        });
      }
      updated[index].deviceSerials = currentSerials.slice(0, qty);
    } else {
      updated[index].deviceSerials = [];
    }
    setLines(updated);
  };

  const updateLineDeviceSerial = (lineIdx: number, serialIdx: number, deviceSerial: string) => {
    const updated = [...lines];
    const serials = [...(updated[lineIdx].deviceSerials || [])];
    serials[serialIdx] = { ...serials[serialIdx], deviceSerial };
    updated[lineIdx].deviceSerials = serials;
    setLines(updated);
  };

  const updateLinePonSerial = (lineIdx: number, serialIdx: number, ponSerial: string) => {
    const updated = [...lines];
    const serials = [...(updated[lineIdx].deviceSerials || [])];
    serials[serialIdx] = { ...serials[serialIdx], ponSerial };
    updated[lineIdx].deviceSerials = serials;
    setLines(updated);
  };

  const updateLinePrice = (index: number, newPrice: number) => {
    const updated = [...lines];
    updated[index].unitPrice = Math.max(0, newPrice);
    setLines(updated);
  };

  const updateLineDiscount = (index: number, newDisc: number) => {
    const updated = [...lines];
    updated[index].discount = Math.max(0, newDisc);
    setLines(updated);
  };

  // Bill-wise Calculations
  const calculatedLines = lines.map((l) => {
    const gross = l.quantity * l.unitPrice;
    return {
      ...l,
      gross,
      netSubtotal: gross,
    };
  });

  const grossSubtotal = calculatedLines.reduce((acc, curr) => acc + curr.gross, 0);

  // Bill-wise Discount calculation
  let totalDiscount = 0;
  if (billDiscountType === 'PERCENT') {
    totalDiscount = Math.min(grossSubtotal, (grossSubtotal * (billDiscountValue || 0)) / 100);
  } else {
    totalDiscount = Math.min(grossSubtotal, billDiscountValue || 0);
  }

  const netBillSubtotal = Math.max(0, grossSubtotal - totalDiscount);

  // Bill-wise Tax Rate: 13% if TAXABLE_13, 0% if TAX_EXEMPTED
  const isBillTaxable = taxationType === 'TAXABLE_13';
  const billTaxableAmount = isBillTaxable ? netBillSubtotal : 0;
  const billExemptAmount = isBillTaxable ? 0 : netBillSubtotal;
  const billVatAmount = isBillTaxable ? (netBillSubtotal * 13) / 100 : 0;
  const grandTotalCalculated = netBillSubtotal + billVatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      alert('Please search and add at least one product item to the purchase bill.');
      return;
    }

    const todayAD = new Date().toISOString().split('T')[0];
    const invBs = convertADToBS(todayAD);
    const vendorBillBs = convertADToBS(vendorBillDateAD);

    const items: PurchaseInvoiceItem[] = calculatedLines.map((l, idx) => ({
      id: `inv-item-${Date.now()}-${idx}`,
      productId: l.productId,
      productName: l.productName,
      sku: l.sku,
      unit: l.unit,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      discount: Number(l.discount),
      isTaxExempt: !isBillTaxable,
      taxRate: isBillTaxable ? 13 : 0,
      subtotal: l.netSubtotal,
      taxAmount: isBillTaxable ? (l.netSubtotal * 13) / 100 : 0,
      total: l.netSubtotal + (isBillTaxable ? (l.netSubtotal * 13) / 100 : 0),
      deviceSerials: l.deviceSerials,
    }));

    // Default to CREDIT mode transaction as requested by user
    await onCreateInvoice({
      supplierName,
      vendorBillNumber,
      poReferenceId: selectedPoId || undefined,
      branchId,
      invoiceDateAD: todayAD,
      invoiceDateBS: invBs.formattedBSShort,
      dueDateAD: vendorBillDateAD,
      dueDateBS: vendorBillBs.formattedBSShort,
      paymentMethod: 'CREDIT',
      items,
      subtotalAmount: grossSubtotal,
      totalDiscount,
      taxableAmount: billTaxableAmount,
      vatAmount: billVatAmount,
      nonTaxableAmount: billExemptAmount,
      grandTotal: grandTotalCalculated,
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      notes: `Vendor Bill Date: ${vendorBillDateAD} (${vendorBillBs.formattedBSShort}). ${notes}`,
    });

    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    exportToCSV('Subisu_Purchase_Invoices', filteredInvoices, [
      { key: 'invoiceNumber', label: 'Invoice Ref #' },
      { key: 'vendorBillNumber', label: 'Vendor Bill #' },
      { key: 'supplierName', label: 'Supplier / Vendor' },
      { key: 'invoiceDateAD', label: 'Invoice Date (AD)' },
      { key: 'invoiceDateBS', label: 'Invoice Date (BS)' },
      { key: 'taxableAmount', label: 'Taxable Base (NPR)' },
      { key: 'vatAmount', label: '13% VAT (NPR)' },
      { key: 'grandTotal', label: 'Grand Total (NPR)' },
      { key: 'paymentStatus', label: 'Status' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Receipt className="h-5 w-5 text-blue-500" />
            <span>Purchase Invoices & Vendor Bill Register</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bill-wise tax purchase entry with barcode search, credit tracking, and vendor bill logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Invoice #, Vendor Bill #, Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-64 shadow-xs ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Export to CSV Spreadsheet"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => {
              setLines([]);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Tax & Financial Summary Cards */}
      <div className="flex-none grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Taxable Purchases</span>
          <div className={`text-lg font-mono font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-blue-500/30 bg-blue-500/10 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">13% Input VAT</span>
          <div className="text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {totalVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`rounded-2xl p-4 border shadow-xs ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grand Total</span>
          <div className={`text-lg font-mono font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {totalGrand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Vendor Credit Payable</span>
          <div className="text-lg font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className={`rounded-2xl border shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 font-bold uppercase text-[10px] tracking-wider border-b shadow-xs ${
              isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="p-3.5 sticky top-0 bg-inherit">System Ref #</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Vendor Bill #</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Supplier / Vendor</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Branch</th>
                <th className="p-3.5 sticky top-0 bg-inherit">Bill Date</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">Taxable</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">13% VAT</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-right">Total Amount</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-center">Payment Mode</th>
                <th className="p-3.5 sticky top-0 bg-inherit text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 text-xs">
                    No purchase bills recorded. Click "New Purchase Bill" to record vendor transactions.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const branch = branches.find((b) => b.id === inv.branchId);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {inv.vendorBillNumber || '—'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {inv.supplierName}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {branch?.name || inv.branchId}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {formatDualDate(inv.invoiceDateAD, dateMode)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-700">
                        {inv.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-600">
                        {inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-slate-900">
                        {inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          CREDIT MODE
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          title="View Bill Details"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
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

      {/* Purchase Invoice Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span>Create Purchase Bill (Bill-Wise Taxation & Scan Entry)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan barcode or search product to add items. Duplicate items automatically increment quantity.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Bill Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Supplier / Vendor (From Database) *
                  </label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    {DB_SUPPLIERS.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Vendor Bill Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorBillNumber}
                    onChange={(e) => setVendorBillNumber(e.target.value)}
                    placeholder="e.g. BILL-9021"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Vendor Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={vendorBillDateAD}
                    onChange={(e) => setVendorBillDateAD(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Bill-Wise Taxation Radio Selection on Top */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">
                    Bill-Wise Taxation Terms (Whole Bill Application)
                  </span>
                  <span className="text-[11px] text-blue-700">
                    Vendors supply bills either entirely 13% Taxable or Tax Exempted. Select for entire bill.
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="taxationType"
                      checked={taxationType === 'TAXABLE_13'}
                      onChange={() => setTaxationType('TAXABLE_13')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>13% Taxable Bill</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="taxationType"
                      checked={taxationType === 'TAX_EXEMPTED'}
                      onChange={() => setTaxationType('TAX_EXEMPTED')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Tax Exempted Bill</span>
                  </label>
                </div>
              </div>

              {/* Link Pending Purchase Order (Sleek Top Action Banner) */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3.5 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {!activePO ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Purchase Order Reference (Optional)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {pendingPOs.length > 0
                            ? `${pendingPOs.length} pending PO(s) available for receiving.`
                            : 'No pending POs found. Direct bill mode active.'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPoSelectModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Link className="h-3.5 w-3.5" />
                      <span>Link / Import PO</span>
                      {pendingPOs.length > 0 && (
                        <span className="ml-1 bg-indigo-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                          {pendingPOs.length}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>Linked PO: #{activePO.poNumber}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-300">
                            {activePO.supplierName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Expected Items: {activePO.items.length} product line(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPoChecklistOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-600" />
                        <span>PO Item Checklist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPoId('');
                          setIsPoChecklistOpen(false);
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Item Search Bar / Barcode Scan Input (No Add Button) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Product Item Search & Barcode Scan
                </label>
                <ProductSearchBar
                  products={products}
                  onAddOrIncrementProduct={handleAddOrIncrementProduct}
                  placeholder="Scan barcode or type code/item name and press Enter to add..."
                />
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5 w-24">SKU</th>
                      <th className="p-2.5 w-24 text-center">Qty</th>
                      <th className="p-2.5 w-28 text-right">Cost Rate</th>
                      <th className="p-2.5 w-32 text-right">Line Subtotal</th>
                      <th className="p-2.5 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-xs italic">
                          No items added yet. Use the product search bar above to scan or search items.
                        </td>
                      </tr>
                    ) : (
                      calculatedLines.map((line, idx) => (
                        <React.Fragment key={line.productId}>
                          <tr className="hover:bg-white transition-colors">
                            <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              <div>{line.productName}</div>
                              {activePO && (() => {
                                const poItem = activePO.items.find((p) => p.productId === line.productId);
                                if (poItem) {
                                  const isExact = line.quantity === poItem.quantity;
                                  const isExceed = line.quantity > poItem.quantity;
                                  return (
                                    <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      isExact
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : isExceed
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>In PO #{activePO.poNumber} (Ordered: {poItem.quantity})</span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                                      <span>⚠️ Extra / Not in PO #{activePO.poNumber}</span>
                                    </div>
                                  );
                                }
                              })()}
                              {(() => {
                                const prod = products.find((p) => p.id === line.productId);
                                const isSerialized = prod ? prod.requiresSerialTracking !== false : true;
                                return isSerialized ? (
                                  <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                    Device & PON Serial Tracking ({line.quantity} Unit{line.quantity > 1 ? 's' : ''})
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                    Bulk Consumable Item ({line.quantity} {line.unit})
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500">
                              {line.sku}
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLineQty(idx, Number(e.target.value))}
                                className="w-16 rounded-lg border border-slate-300 bg-white p-1 text-xs text-center font-mono font-bold text-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                value={line.unitPrice}
                                onChange={(e) => updateLinePrice(idx, Number(e.target.value))}
                                className="w-24 text-right rounded-lg border border-slate-300 bg-white p-1 text-xs font-mono font-medium text-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">
                              {line.netSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Device Serial & PON Serial Row per Unit or Consumable Notice */}
                          {(() => {
                            const prod = products.find((p) => p.id === line.productId);
                            const isSerialized = prod ? prod.requiresSerialTracking !== false : true;

                            if (!isSerialized) {
                              return (
                                <tr className="bg-slate-100/50 border-b border-slate-200">
                                  <td colSpan={7} className="px-4 py-2">
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Bulk Consumable Item — Serial & MAC tracking skipped ({line.quantity} {line.unit})</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr className="bg-blue-50/40 border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-2.5">
                                  <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
                                    <Barcode className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Serial Numbers for {line.productName} (Qty: {line.quantity})</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Array.from({ length: line.quantity }).map((_, sIdx) => (
                                      <div key={sIdx} className="bg-white p-2 rounded-lg border border-blue-200 flex items-center gap-2 text-xs">
                                        <span className="font-mono text-[10px] font-bold text-slate-400">#{sIdx + 1}</span>
                                        
                                        <div className="flex-1 min-w-0">
                                          <input
                                            type="text"
                                            placeholder="Device Serial #"
                                            value={line.deviceSerials?.[sIdx]?.deviceSerial || ''}
                                            onChange={(e) => updateLineDeviceSerial(idx, sIdx, e.target.value)}
                                            className="w-full px-2 py-1 text-[11px] font-mono font-bold text-blue-900 bg-blue-50/50 rounded border border-blue-200 focus:bg-white focus:outline-none"
                                          />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <input
                                            type="text"
                                            placeholder="PON Serial #"
                                            value={line.deviceSerials?.[sIdx]?.ponSerial || ''}
                                            onChange={(e) => updateLinePonSerial(idx, sIdx, e.target.value)}
                                            className="w-full px-2 py-1 text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50/50 rounded border border-indigo-200 focus:bg-white focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bill Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Bill Remarks / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter vendor bill remarks..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Amount:</span>
                    <span className="font-mono font-bold">
                      {grossSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Total Discounts:</span>
                      <span className="font-mono font-bold">
                        - {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Taxation Status:</span>
                    <span className="font-bold text-blue-700">
                      {isBillTaxable ? '13% Taxable Bill' : 'Tax Exempted Bill'}
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold border-t border-slate-200 pt-2">
                    <span>13% VAT Amount:</span>
                    <span className="font-mono font-bold">
                      {billVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                    <span>Grand Total (Credit Mode):</span>
                    <span className="font-mono text-blue-600">
                      {grandTotalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Save Vendor Bill (Credit Mode)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Document Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span>Vendor Purchase Bill — {viewingInvoice.invoiceNumber}</span>
              </h3>
              <button
                onClick={() => setViewingInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {viewingInvoice.supplierName}
                  </h4>
                  <p className="text-xs text-slate-500">Vendor Bill #: <strong className="text-slate-800">{viewingInvoice.vendorBillNumber || 'N/A'}</strong></p>
                  <p className="text-xs text-slate-500">Target Branch: {branches.find(b => b.id === viewingInvoice.branchId)?.name || viewingInvoice.branchId}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-extrabold text-blue-600">
                    {viewingInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500">Bill Date: {viewingInvoice.invoiceDateAD} ({viewingInvoice.invoiceDateBS})</div>
                </div>
              </div>

              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                          <td className="p-3 text-center font-mono font-bold">{item.quantity} {item.unit || 'Pcs'}</td>
                          <td className="p-3 text-right font-mono">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Transaction Mode: <span className="font-bold text-amber-700">CREDIT MODE</span></div>
                  <div>Status: <span className="font-bold text-amber-600">UNPAID (Pending Accounting App Settlement)</span></div>
                </div>

                <div className="w-64 space-y-1.5 text-xs font-mono text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base:</span>
                    <span>{viewingInvoice.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>13% VAT:</span>
                    <span>{viewingInvoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>{viewingInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Searchable PO Selection Dialog */}
      {isPoSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Select Purchase Order to Link / Receive
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPoSelectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by PO Number or Vendor Name..."
                  value={poSearchQuery}
                  onChange={(e) => setPoSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {filteredPendingPOs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No pending purchase orders match your search.
                  </div>
                ) : (
                  filteredPendingPOs.map((po) => {
                    const isCurrent = po.id === selectedPoId;
                    return (
                      <div
                        key={po.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-indigo-900">
                              PO #{po.poNumber}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                              {po.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {po.supplierName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                            <span>📅 {po.orderDateAD}</span>
                            <span>📦 {po.items.length} item line(s)</span>
                            <span className="font-mono font-semibold text-slate-700">रु {po.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPoId(po.id);
                            if (po.supplierName) setSupplierName(po.supplierName);
                            if (po.branchId) setBranchId(po.branchId);
                            setIsPoSelectModalOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200'
                          }`}
                        >
                          {isCurrent ? 'Linked ✓' : 'Select PO'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedPoId('');
                  setIsPoSelectModalOpen(false);
                }}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                Clear Selection (Direct Purchase)
              </button>
              <button
                type="button"
                onClick={() => setIsPoSelectModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Active PO Item Checklist Dialog */}
      {isPoChecklistOpen && activePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    PO Verification Checklist — #{activePO.poNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500">Supplier: {activePO.supplierName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPoChecklistOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-200">
                💡 <strong>How receiving works:</strong> As you scan or search product items into the Purchase Invoice form below, this checklist automatically updates received counts.
              </div>

              <div className="space-y-2">
                {activePO.items.map((poItem) => {
                  const matchedLine = lines.find((l) => l.productId === poItem.productId);
                  const scannedQty = matchedLine ? matchedLine.quantity : 0;
                  const isComplete = scannedQty === poItem.quantity;
                  const isOver = scannedQty > poItem.quantity;
                  const isStarted = scannedQty > 0;

                  return (
                    <div
                      key={poItem.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        isComplete
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : isOver
                          ? 'bg-rose-50 border-rose-300 text-rose-950'
                          : isStarted
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{poItem.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          Ordered Quantity: <strong className="text-slate-800">{poItem.quantity} {poItem.unit}</strong> @ Rs {poItem.unitPrice.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className={`font-extrabold text-sm ${
                          isComplete ? 'text-emerald-700' : isOver ? 'text-rose-700' : isStarted ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                          {scannedQty} / {poItem.quantity}
                        </div>
                        <div className="text-[10px] font-bold">
                          {isComplete ? '✓ Fully Scanned' : isOver ? '⚠️ Exceeds Order' : isStarted ? '⏳ Partially Scanned' : 'Not Scanned Yet'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsPoChecklistOpen(false)}
                className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
