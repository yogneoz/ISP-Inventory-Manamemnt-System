import React, { useState } from 'react';
import { CustomerDeviceRecord, Asset, Branch, Product } from '../types';
import { getWarrantyInfo } from '../utils/warranty';
import { formatDualDate } from '../utils/nepaliCalendar';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  Building2,
  Barcode,
  Wifi,
  MapPin,
  Calendar,
  Filter,
  CheckCircle2,
  Tag,
  Info,
} from 'lucide-react';

interface WarrantyProductsProps {
  customerDevices: CustomerDeviceRecord[];
  assets: Asset[];
  branches: Branch[];
  products: Product[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
}

export const WarrantyProducts: React.FC<WarrantyProductsProps> = ({
  customerDevices = [],
  assets = [],
  branches = [],
  products = [],
  selectedBranchId,
  dateMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'>('VALID');
  const [categoryType, setCategoryType] = useState<'ALL' | 'CPE' | 'FIXED_ASSET'>('ALL');

  // Build combined list of warranty-tracked items (CPE customer devices + fixed assets)
  const cpeItems = customerDevices.map((c) => {
    const wInfo = getWarrantyInfo(c.issuedDateAD, c.warrantyMonths || 12);
    const branch = branches.find((b) => b.id === c.branchId);
    return {
      id: c.id,
      type: 'CPE' as const,
      name: c.productName,
      serialOrTag: c.deviceSerial,
      secondarySerial: c.ponSerial,
      macAddress: c.macAddress,
      assignedTo: `${c.customerName} (${c.customerCode})`,
      assignedAddress: c.installationAddress,
      branchId: c.branchId,
      branchName: branch?.name || c.branchId,
      issuedDateAD: c.issuedDateAD,
      status: c.status,
      warrantyInfo: wInfo,
      purchaseBillRef: c.purchaseBillRef,
    };
  });

  const assetItems = assets.map((a) => {
    const wInfo = getWarrantyInfo(a.acquisitionDateAD, 12);
    const branch = branches.find((b) => b.id === a.branchId);
    let assigned = a.assignedCustomerName ? `Customer: ${a.assignedCustomerName}` : a.assignedLocationName ? `Location: ${a.assignedLocationName}` : 'Internal Branch Office / Node';
    return {
      id: a.id,
      type: 'FIXED_ASSET' as const,
      name: a.name,
      serialOrTag: a.tagNumber,
      secondarySerial: '-',
      macAddress: undefined,
      assignedTo: assigned,
      assignedAddress: branch?.location || '-',
      branchId: a.branchId,
      branchName: branch?.name || a.branchId,
      issuedDateAD: a.acquisitionDateAD,
      status: a.status,
      warrantyInfo: wInfo,
      purchaseBillRef: a.invoiceNo,
    };
  });

  const allWarrantyItems = [...cpeItems, ...assetItems];

  const filteredItems = allWarrantyItems.filter((item) => {
    const matchesBranch = selectedBranchId === 'ALL' || item.branchId === selectedBranchId;
    const matchesWarranty =
      warrantyFilter === 'ALL' || item.warrantyInfo.status === warrantyFilter;
    const matchesCat = categoryType === 'ALL' || item.type === categoryType;

    if (!searchQuery.trim()) return matchesBranch && matchesWarranty && matchesCat;

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      item.name.toLowerCase().includes(q) ||
      item.serialOrTag.toLowerCase().includes(q) ||
      (item.secondarySerial && item.secondarySerial.toLowerCase().includes(q)) ||
      item.assignedTo.toLowerCase().includes(q) ||
      item.branchName.toLowerCase().includes(q);

    return matchesBranch && matchesWarranty && matchesCat && matchesQuery;
  });

  // Metrics
  const validCount = allWarrantyItems.filter((i) => i.warrantyInfo.status === 'VALID').length;
  const expiringSoonCount = allWarrantyItems.filter((i) => i.warrantyInfo.status === 'EXPIRING_SOON').length;
  const expiredCount = allWarrantyItems.filter((i) => i.warrantyInfo.status === 'EXPIRED').length;

  return (
    <div className="space-y-6">
      {/* Page Title & Sub-Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2 break-words leading-tight">
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
            <span>Warranty Valid Products Directory</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1 break-words leading-normal max-w-3xl">
            Centralized registry of active CPE routers, ONU devices, set-top boxes, and fixed assets with active manufacturer or ISP warranty status.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 break-words">Total Registered Hardware</div>
          <div className="text-xl font-mono font-bold text-slate-900 mt-1">
            {allWarrantyItems.length} Items
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 break-words flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Valid Active Warranty</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-700 mt-1">
            {validCount} Items
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 break-words flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Expiring Within 30 Days</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-700 mt-1">
            {expiringSoonCount} Items
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50/50 p-4 border border-rose-200 shadow-xs">
          <div className="text-xs font-bold text-rose-800 break-words flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span>Expired Warranties</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-rose-700 mt-1">
            {expiredCount} Items
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Device Serial, Tag #, Customer, Product Name, Branch..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Warranty:</span>
            <select
              value={warrantyFilter}
              onChange={(e) => setWarrantyFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="VALID">VALID (Active)</option>
              <option value="EXPIRING_SOON">EXPIRING SOON (&lt;30 Days)</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="CPE">Customer CPE Devices</option>
              <option value="FIXED_ASSET">Fixed Assets</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warranty Data Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 break-words max-w-[200px]">Hardware & Category</th>
                <th className="p-3.5 break-words">Serial Number / Tag</th>
                <th className="p-3.5 break-words">Assigned Location / Account</th>
                <th className="p-3.5 break-words">Branch</th>
                <th className="p-3.5 break-words">Commissioned Date</th>
                <th className="p-3.5 break-words">Warranty Expiry</th>
                <th className="p-3.5 text-center break-words">Warranty Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No warranty products found matching your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const w = item.warrantyInfo;
                  return (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm break-words leading-snug">{item.name}</div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                          item.type === 'CPE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {item.type === 'CPE' ? 'Customer CPE Router' : 'Fixed Asset'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 w-fit font-mono font-bold text-slate-800 text-xs">
                          <Barcode className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{item.serialOrTag}</span>
                        </div>
                        {item.secondarySerial && item.secondarySerial !== '-' && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            PON: {item.secondarySerial}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 text-xs break-words">{item.assignedTo}</div>
                        {item.assignedAddress && item.assignedAddress !== '-' && (
                          <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5 break-words">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{item.assignedAddress}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 text-xs break-words">{item.branchName}</div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        {formatDualDate(item.issuedDateAD, dateMode)}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-900">
                        {formatDualDate(w.warrantyEndDateAD, dateMode)}
                      </td>

                      <td className="p-3.5 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase border whitespace-normal break-words max-w-[160px] text-center justify-center ${
                            w.status === 'VALID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : w.status === 'EXPIRING_SOON'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {w.status === 'VALID' && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                          {w.status === 'EXPIRING_SOON' && <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                          {w.status === 'EXPIRED' && <ShieldAlert className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                          <span>{w.label}</span>
                        </div>
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
  );
};
