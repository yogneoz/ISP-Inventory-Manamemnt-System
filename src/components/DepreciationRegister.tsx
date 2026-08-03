import React, { useState } from 'react';
import { Asset, Branch } from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import { exportToCSV } from '../utils/exportUtils';
import {
  Calculator,
  Download,
  Printer,
  Search,
  Building,
  TrendingDown,
  Percent,
  CheckCircle2,
  Landmark,
} from 'lucide-react';

interface DepreciationRegisterProps {
  assets: Asset[];
  branches: Branch[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  isDarkMode?: boolean;
}

export const DepreciationRegister: React.FC<DepreciationRegisterProps> = ({
  assets,
  branches,
  selectedBranchId,
  dateMode,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredAssets = (assets || []).filter((asset) => {
    const matchesBranch = selectedBranchId === 'ALL' || asset.branchId === selectedBranchId;
    const matchesSearch =
      !searchQuery ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tagNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || asset.category === categoryFilter;

    return matchesBranch && matchesSearch && matchesCategory;
  });

  const totalCost = filteredAssets.reduce((sum, a) => sum + (a.acquisitionCost ?? 0), 0);
  const totalAccumDep = filteredAssets.reduce((sum, a) => sum + (a.accumulatedDepreciation ?? 0), 0);
  const totalNBV = filteredAssets.reduce((sum, a) => sum + (a.netBookValue ?? 0), 0);

  const categories = Array.from(new Set(assets.map((a) => a.category)));

  const handleExportCSV = () => {
    const data = filteredAssets.map((a) => {
      const bObj = branches.find((b) => b.id === a.branchId);
      return {
        TagNumber: a.tagNumber,
        AssetTitle: a.name,
        Category: a.category,
        Branch: bObj?.name || 'Central Headquarter',
        AcquisitionDateAD: a.acquisitionDateAD,
        AcquisitionDateBS: a.acquisitionDateBS,
        AcquisitionCost: a.acquisitionCost,
        Method: a.depreciationMethod === 'STRAIGHT_LINE' ? 'Straight Line Method' : 'Diminishing Balance',
        RatePercent: `${a.depreciationRatePercent}%`,
        AccumulatedDepreciation: a.accumulatedDepreciation,
        NetBookValue: a.netBookValue,
        Status: a.status,
      };
    });

    exportToCSV('Fixed_Asset_Depreciation_Register', data, [
      { key: 'TagNumber', label: 'Tag Number' },
      { key: 'AssetTitle', label: 'Asset Title' },
      { key: 'Category', label: 'Category' },
      { key: 'Branch', label: 'Branch' },
      { key: 'AcquisitionDateAD', label: 'Acquisition Date (AD)' },
      { key: 'AcquisitionCost', label: 'Original Cost (NPR)' },
      { key: 'Method', label: 'Method' },
      { key: 'RatePercent', label: 'Annual Rate' },
      { key: 'AccumulatedDepreciation', label: 'Accumulated Depreciation (NPR)' },
      { key: 'NetBookValue', label: 'Net Book Value (NPR)' },
      { key: 'Status', label: 'Status' },
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-indigo-500" />
            <span>Fixed Asset Depreciation Register</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Annual depreciation schedules, diminishing value vs straight-line calculations, accumulated depreciation, and Net Book Value (NBV).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export Depreciation Schedule</span>
          </button>

          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>GROSS ACQUISITION COST</span>
            <Landmark className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            NPR {totalCost.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total capital expenditure across {filteredAssets.length} fixed assets
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>TOTAL ACCUMULATED DEPRECIATION</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-500">
            NPR {totalAccumDep.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Cumulative depreciation write-offs to date
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>NET BOOK VALUE (NBV)</span>
            <Calculator className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-indigo-500">
            NPR {totalNBV.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Carrying value on corporate balance sheet
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full md:w-80 text-xs ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search Tag Number, Asset Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
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

      {/* Depreciation Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <tr>
                <th className="px-4 py-3">Tag #</th>
                <th className="px-4 py-3">Asset Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Acquisition Date</th>
                <th className="px-4 py-3 text-right">Original Cost</th>
                <th className="px-4 py-3 text-center">Method & Rate</th>
                <th className="px-4 py-3 text-right">Accum. Dep.</th>
                <th className="px-4 py-3 text-right">Net Book Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No fixed assets found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-800'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {asset.tagNumber}
                    </td>
                    <td className="px-4 py-3 font-bold">{asset.name}</td>
                    <td className="px-4 py-3 text-slate-500">{asset.category}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {formatDualDate(asset.acquisitionDateAD, dateMode)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      NPR {(asset.acquisitionCost ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {asset.depreciationMethod === 'STRAIGHT_LINE' ? 'Straight Line' : 'Diminishing'} ({asset.depreciationRatePercent ?? 0}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-500 font-semibold">
                      NPR {(asset.accumulatedDepreciation ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      NPR {(asset.netBookValue ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot
              className={`border-t font-bold text-xs ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider">
                  Total Fixed Asset Schedule:
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                  NPR {totalCost.toLocaleString()}
                </td>
                <td></td>
                <td className="px-4 py-3 text-right font-mono text-rose-500">
                  NPR {totalAccumDep.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                  NPR {totalNBV.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
