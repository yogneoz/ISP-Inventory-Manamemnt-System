import React, { useState } from 'react';
import { Branch, CustomerRecord } from '../types';
import { UserPlus, Download, CheckCircle2, AlertCircle, ArrowRight, FileText, Check, Upload, RefreshCw, Smartphone } from 'lucide-react';

interface ImportCustomersProps {
  branches: Branch[];
  onImportCustomersSuccess?: (newCustomers: CustomerRecord[]) => void;
  isDarkMode?: boolean;
}

interface ParsedCustomerRow {
  customerId: string;
  customerName: string;
  username: string;
  contactNumber: string;
  targetBranchCode: string;
  address: string;
  email?: string;
  isValid: boolean;
  notes: string;
}

export const ImportCustomers: React.FC<ImportCustomersProps> = ({
  branches,
  onImportCustomersSuccess,
  isDarkMode = false,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCustomerRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const sampleCsvData = `CustomerID,CustomerName,Username,ContactNumber,Branch,Address,Email
CUS-10291,Aarav Sharma,aarav.sharma,9851092810,BR-KTM,Durbar Marg Ward 4 Kathmandu,aarav@gmail.com
CUS-10292,Pooja Gurung,pooja.g,9846019283,BR-PKR,Lakeside Ward 6 Pokhara,pooja.g@yahoo.com
CUS-10293,Subash Shrestha,subash.sh,9801029381,BR-KTM,Jawalakhel Ward 2 Lalitpur,subash@outlook.com
CUS-10294,Bina Thapa,bina.t,9855019284,BR-CTN,Lions Chowk Ward 1 Narayangarh,bina@gmail.com`;

  const parseCsvContent = (content: string, filename?: string) => {
    if (filename) setSelectedFileName(filename);
    const lines = content.trim().split('\n');
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows: ParsedCustomerRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 4) continue;

      const customerId = cols[0] || `CUS-${Math.floor(10000 + Math.random() * 90000)}`;
      const customerName = cols[1] || 'Imported Customer';
      const username = cols[2] || customerId.toLowerCase();
      const contactNumber = cols[3] || '9800000000';
      const targetBranchCode = cols[4] || 'BR-KTM';
      const address = cols[5] || 'Kathmandu Nepal';
      const email = cols[6] || `${username}@izone.np`;

      const isValid = Boolean(customerId && customerName && contactNumber);
      let notes = 'Valid Customer Record';
      if (!customerName) notes = 'Missing Customer Name';
      if (!contactNumber) notes = 'Missing Contact Number';

      rows.push({
        customerId,
        customerName,
        username,
        contactNumber,
        targetBranchCode,
        address,
        email,
        isValid,
        notes,
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseCsvContent(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    parseCsvContent(sampleCsvData, 'Sample_Customer_List.csv');
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iZone_Customer_Import_Template.csv';
    a.click();
  };

  const handleProcessImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setImportSuccessMessage(null);

    try {
      const importedCustomers: CustomerRecord[] = parsedRows
        .filter((r) => r.isValid)
        .map((r) => {
          const matchingBranch = branches.find(
            (b) => b.code.toLowerCase() === r.targetBranchCode.toLowerCase() || b.id.toLowerCase() === r.targetBranchCode.toLowerCase()
          );
          return {
            id: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
            customerId: r.customerId,
            customerName: r.customerName,
            username: r.username,
            contactNumber: r.contactNumber,
            branchId: matchingBranch ? matchingBranch.id : branches[0]?.id || 'BR-KTM',
            address: r.address,
            email: r.email,
            status: 'ACTIVE',
            assignedDevicesCount: 0,
          };
        });

      if (onImportCustomersSuccess) {
        onImportCustomersSuccess(importedCustomers);
      }

      setImportSuccessMessage(`Successfully imported ${importedCustomers.length} customer records into system directory!`);
      setParsedRows([]);
      setSelectedFileName(null);
    } catch (err: any) {
      alert(`Import error: ${err.message || 'Failed to import customer records'}`);
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
            <UserPlus className="h-5 w-5 text-indigo-500" />
            <span>Import Customer Data</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bulk import customer master records (Customer ID, Customer Name, Username, Contact Number, Branch, Address) via spreadsheet template.
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
            <Smartphone className="h-4 w-4" />
            <span>Load Sample Customers</span>
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
        {/* Upload Dropzone */}
        <div className={`lg:col-span-5 flex flex-col justify-between rounded-2xl border p-5 shadow-sm ${
          isDarkMode ? 'bg-[#0f1218] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span>Upload Customer File</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">.csv, .txt</span>
            </div>

            <div className={`relative border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-all ${
              selectedFileName
                ? isDarkMode ? 'border-indigo-500 bg-indigo-950/20' : 'border-indigo-500 bg-indigo-50/50'
                : isDarkMode ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700' : 'border-slate-300 bg-slate-50 hover:border-indigo-300'
            }`}>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Upload className="h-6 w-6" />
              </div>

              {selectedFileName ? (
                <div>
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block truncate max-w-[200px]">
                    {selectedFileName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {parsedRows.length} customer records loaded
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Click to browse or drag & drop customer CSV file
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Fields: Customer ID, Customer Name, Username, Contact Number, Branch, Address
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Admin Governance Protection</span>
              </div>
              <p>
                Imported customers will immediately be accessible across device assignment workflows and customer hardware registers.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              {parsedRows.length} Records Validated
            </span>
            <button
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleProcessImport}
              className={`flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all ${
                parsedRows.length === 0 || isProcessing
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-indigo-500 cursor-pointer'
              }`}
            >
              <span>Import Customer Records</span>
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
              <span>Customer Import Preview</span>
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
                  <th className="p-2.5">Customer ID / Name</th>
                  <th className="p-2.5">Username & Contact</th>
                  <th className="p-2.5">Branch Code</th>
                  <th className="p-2.5">Installation Address</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {parsedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 text-xs">
                      No file loaded yet. Upload a CSV file or click "Load Sample Customers" above.
                    </td>
                  </tr>
                ) : (
                  parsedRows.map((row, idx) => (
                    <tr key={idx} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">{row.customerId}</div>
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{row.customerName}</div>
                      </td>
                      <td className="p-2.5 text-[11px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200">@{row.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{row.contactNumber}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {row.targetBranchCode}
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                        {row.address}
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
