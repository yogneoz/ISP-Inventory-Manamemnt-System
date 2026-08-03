import React, { useState } from 'react';
import { Branch, Product } from '../types';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle, ArrowRight, Layers, FileText, Check } from 'lucide-react';

interface ImportStockProps {
  branches: Branch[];
  products: Product[];
  onCreateProduct: (prod: Omit<Product, 'id'>) => Promise<void>;
  onRefreshData?: () => void;
  isDarkMode?: boolean;
}

interface ParsedImportRow {
  sku: string;
  barcode: string;
  name: string;
  productGroup: 'Product Item' | 'Fixed Asset';
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  minReorderLevel: number;
  targetBranchId: string;
  initialQty: number;
  isValid: boolean;
  notes: string;
}

export const ImportStock: React.FC<ImportStockProps> = ({
  branches,
  products,
  onCreateProduct,
  onRefreshData,
  isDarkMode = false,
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const sampleCsvData = `SKU,Barcode,ProductName,ProductGroup,Category,Unit,CostPrice,SellingPrice,TaxRate,MinReorder,TargetBranch,InitialQty
IZ-109281,890102938101,Fiber Optic Patch Cord SC/UPC-LC/UPC 3M,Product Item,Fiber Accessories & Cables,Pcs,450,750,13,25,ALL,120
IZ-109282,890102938102,Dual Band Wi-Fi 6 GPON ONT Fiber Router,Product Item,Routers & ONTs,Pcs,4200,6500,13,15,BR-KTM,40
IZ-109283,890102938103,Fusion Splicer Fiber Toolkit Heavy Duty,Fixed Asset,Fixed Assets,Set,145000,185000,13,0,BR-KTM,3
IZ-109284,890102938104,Cat6 Outdoor UTP Ethernet Cable Roll 305M,Product Item,Networking Cables,Roll,12500,16800,13,8,BR-PKR,15`;

  const parseCsvContent = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows: ParsedImportRow[] = [];
    const existingSkus = new Set(products.map((p) => p.sku.toLowerCase().trim()));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 5) continue;

      const sku = cols[0] || `IZ-${Math.floor(100000 + Math.random() * 900000)}`;
      const barcode = cols[1] || `890${Math.floor(100000000 + Math.random() * 900000000)}`;
      const name = cols[2] || 'Imported Stock Item';
      const rawGrp = cols[3] || 'Product Item';
      const productGroup: 'Product Item' | 'Fixed Asset' =
        rawGrp.toLowerCase().includes('asset') || rawGrp.toLowerCase().includes('fixed')
          ? 'Fixed Asset'
          : 'Product Item';

      const category = cols[4] || 'General Inventory';
      const unit = cols[5] || 'Pcs';
      const costPrice = parseFloat(cols[6]) || 0;
      const sellingPrice = parseFloat(cols[7]) || 0;
      const taxRate = parseFloat(cols[8]) || 13;
      const minReorderLevel = parseInt(cols[9]) || 10;
      const targetBranchCode = cols[10] || 'ALL';
      const initialQty = parseInt(cols[11]) || 0;

      // Find branch ID
      const matchingBranch = branches.find(
        (b) => b.code.toLowerCase() === targetBranchCode.toLowerCase() || b.id.toLowerCase() === targetBranchCode.toLowerCase()
      );
      const targetBranchId = matchingBranch ? matchingBranch.id : branches[0]?.id || 'ALL';

      const isDuplicateSku = existingSkus.has(sku.toLowerCase());
      const isValid = Boolean(sku && name && costPrice >= 0);
      let notes = 'Ready for import';
      if (isDuplicateSku) notes = 'SKU already exists in system (will update)';
      if (!name) notes = 'Missing Product Name';

      rows.push({
        sku,
        barcode,
        name,
        productGroup,
        category,
        unit,
        costPrice,
        sellingPrice,
        taxRate,
        minReorderLevel,
        targetBranchId,
        initialQty,
        isValid,
        notes,
      });
    }

    setParsedRows(rows);
  };

  const handleLoadSample = () => {
    setCsvText(sampleCsvData);
    parseCsvContent(sampleCsvData);
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iZone_Stock_Import_Template.csv';
    a.click();
  };

  const handleProcessImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setImportSuccessMessage(null);

    try {
      let count = 0;
      for (const row of parsedRows) {
        if (!row.isValid) continue;
        await onCreateProduct({
          sku: row.sku,
          barcode: row.barcode,
          name: row.name,
          productGroup: row.productGroup,
          category: row.category,
          unit: row.unit,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          taxRate: row.taxRate,
          minReorderLevel: row.minReorderLevel,
          description: `Bulk imported stock record. Initial Qty: ${row.initialQty} ${row.unit}`,
        });
        count++;
      }

      if (onRefreshData) onRefreshData();
      setImportSuccessMessage(`Successfully imported ${count} stock items into Product Master catalog!`);
      setParsedRows([]);
      setCsvText('');
    } catch (err: any) {
      alert(`Import error: ${err.message || 'Failed to import records'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-serif font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <UploadCloud className="h-5 w-5 text-indigo-500" />
            <span>Import Stock Data</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bulk import new product SKUs, prices, VAT rates, and initial stock quantities via CSV/Excel spreadsheet upload.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleCsv}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${
              isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Download CSV Template</span>
          </button>

          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs font-semibold hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Load Sample Data</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {importSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            onClick={() => setImportSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* CSV Input Panel */}
        <div className={`lg:col-span-5 flex flex-col rounded-2xl border p-4 shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span>Paste CSV or Spreadsheet Rows</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Comma-separated</span>
          </div>

          <textarea
            rows={12}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              parseCsvContent(e.target.value);
            }}
            placeholder={`SKU,Barcode,ProductName,ProductGroup,Category,Unit,CostPrice,SellingPrice,TaxRate,MinReorder,TargetBranch,InitialQty\nPaste spreadsheet lines here...`}
            className={`flex-1 w-full rounded-xl border p-3 font-mono text-[11px] focus:outline-none focus:border-indigo-500 resize-none ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {parsedRows.length} Rows Detected
            </span>
            <button
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleProcessImport}
              className={`flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md transition-all ${
                parsedRows.length === 0 || isProcessing
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-indigo-500 cursor-pointer'
              }`}
            >
              <span>Process Bulk Import</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className={`lg:col-span-7 flex flex-col rounded-2xl border shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-3.5 border-b flex items-center justify-between ${
            isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Parsed Import Preview</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Valid: {parsedRows.filter((r) => r.isValid).length} / {parsedRows.length}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 z-20 font-bold uppercase text-[9px] tracking-wider border-b ${
                isDarkMode ? 'bg-[#12161f] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="p-2.5">SKU / Name</th>
                  <th className="p-2.5">Group & Category</th>
                  <th className="p-2.5 text-right">Cost / Sell</th>
                  <th className="p-2.5 text-center">Initial Qty</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {parsedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 text-xs">
                      No data entered yet. Paste CSV data on the left or click "Load Sample Data" above.
                    </td>
                  </tr>
                ) : (
                  parsedRows.map((row, idx) => (
                    <tr key={idx} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">{row.sku}</div>
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{row.name}</div>
                      </td>
                      <td className="p-2.5 text-[11px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{row.category}</div>
                        <div className="text-[10px] text-slate-500">{row.productGroup}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-[11px]">
                        <div>रु {row.costPrice.toLocaleString()}</div>
                        <div className="text-slate-400 text-[10px]">रु {row.sellingPrice.toLocaleString()}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.initialQty} {row.unit}
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          row.isValid
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}>
                          {row.isValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          <span>{row.notes}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
