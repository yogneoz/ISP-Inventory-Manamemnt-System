import React, { useState } from 'react';
import { CustomerDeviceRecord, Branch, Product, User, ApprovalRequest } from '../types';
import { formatDualDate, convertADToBS } from '../utils/nepaliCalendar';
import { getWarrantyInfo } from '../utils/warranty';
import { isOperationAllowed } from '../utils/permissions';
import { api } from '../services/api';
import {
  Users,
  Search,
  Plus,
  Barcode,
  Wifi,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Building2,
  X,
  FileText,
  Tag,
  Clock,
  Tv,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  SlidersHorizontal,
  Send,
  Lock,
} from 'lucide-react';

interface CustomersManagementProps {
  customerDevices: CustomerDeviceRecord[];
  branches: Branch[];
  products: Product[];
  selectedBranchId: string;
  dateMode: 'BS' | 'AD';
  autoOpenModal?: boolean;
  currentUser?: User | null;
  onCreateCustomerDevice: (record: Omit<CustomerDeviceRecord, 'id'>) => Promise<void>;
  onUpdateStatus: (id: string, status: CustomerDeviceRecord['status']) => Promise<void>;
  onRequestApproval?: (request: Omit<ApprovalRequest, 'id' | 'requestNumber' | 'status' | 'requestedAtAD' | 'requestedAtBS'>) => Promise<void>;
}

export const CustomersManagement: React.FC<CustomersManagementProps> = ({
  customerDevices = [],
  branches = [],
  products = [],
  selectedBranchId,
  dateMode,
  autoOpenModal = false,
  currentUser,
  onCreateCustomerDevice,
  onUpdateStatus,
  onRequestApproval,
}) => {
  const canManageCustomers = isOperationAllowed('customers-manage', currentUser?.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(autoOpenModal);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<CustomerDeviceRecord | null>(null);

  // Approval Request Modal State
  const [approvalTarget, setApprovalTarget] = useState<{
    record: CustomerDeviceRecord;
    targetStatus: CustomerDeviceRecord['status'];
  } | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalRestock, setApprovalRestock] = useState(true);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleStatusChangeAttempt = async (
    rec: CustomerDeviceRecord,
    newSt: CustomerDeviceRecord['status']
  ) => {
    if (rec.status === newSt) return;

    const requiresApproval = ['SUSPENDED', 'DISCONNECTED', 'REFUND', 'RETURNED', 'IN_STOCK'].includes(
      newSt
    );
    const isBranchStaff =
      currentUser?.role === 'BRANCH_MANAGER' || currentUser?.role === 'FRONT_DESK';

    if (requiresApproval && isBranchStaff) {
      setApprovalTarget({ record: rec, targetStatus: newSt });
      setApprovalReason('');
      setApprovalRestock(newSt === 'REFUND' || newSt === 'RETURNED' || newSt === 'IN_STOCK');
    } else {
      await onUpdateStatus(rec.id, newSt);
      if (newSt === 'IN_STOCK' || newSt === 'RETURNED' || newSt === 'REFUND') {
        setToastMessage(`Status updated to ${newSt}! +1 unit synchronized back to branch inventory stock.`);
      } else {
        setToastMessage(`Device status updated to ${newSt}.`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalTarget) return;
    if (!approvalReason.trim()) {
      alert('Please provide a justification / reason for this status change request.');
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const branchName =
        branches.find((b) => b.id === approvalTarget.record.branchId)?.name || 'Branch Office';
      const reqData = {
        type: 'CUSTOMER_DEVICE_STATUS',
        targetId: approvalTarget.record.id,
        customerName: approvalTarget.record.customerName,
        customerCode: approvalTarget.record.customerCode,
        deviceSerial: approvalTarget.record.deviceSerial,
        ponSerial: approvalTarget.record.ponSerial,
        productName: approvalTarget.record.productName,
        currentStatus: approvalTarget.record.status,
        requestedStatus: approvalTarget.targetStatus,
        requestedByRole: currentUser?.role || 'FRONT_DESK',
        requestedByEmail: currentUser?.email || 'staff@subisu.com.np',
        requestedByName: currentUser?.name || 'Branch Staff',
        branchId: approvalTarget.record.branchId,
        branchName,
        reason: approvalReason.trim(),
        restockQtyOnApproval: approvalRestock,
      };

      if (onRequestApproval) {
        await onRequestApproval(reqData);
      } else {
        await api.createApprovalRequest(reqData);
      }

      setToastMessage(
        `Approval request submitted successfully! Request pending Inventory Manager / Super Admin authorization.`
      );
      setApprovalTarget(null);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Failed to submit approval request: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Modal Form State
  const [customerName, setCustomerName] = useState('');
  const [customerCode, setCustomerCode] = useState(`CUST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [contactPhone, setContactPhone] = useState('+977-98');
  const [installationAddress, setInstallationAddress] = useState('');
  const [branchId, setBranchId] = useState(
    selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id || 'br-ktm'
  );
  const [productName, setProductName] = useState('ONU ROUTER 2.4G');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [ponSerial, setPonSerial] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [issuedDateAD, setIssuedDateAD] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [purchaseBillRef, setPurchaseBillRef] = useState('BILL-9021');
  const [notes, setNotes] = useState('');

  const filteredRecords = customerDevices.filter((rec) => {
    const matchesBranch = selectedBranchId === 'ALL' || rec.branchId === selectedBranchId;
    const matchesStatus = selectedStatus === 'ALL' || rec.status === selectedStatus;
    
    if (!searchQuery.trim()) return matchesBranch && matchesStatus;

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      rec.deviceSerial.toLowerCase().includes(q) ||
      rec.ponSerial.toLowerCase().includes(q) ||
      (rec.macAddress && rec.macAddress.toLowerCase().includes(q)) ||
      rec.customerName.toLowerCase().includes(q) ||
      rec.customerCode.toLowerCase().includes(q) ||
      rec.contactPhone.toLowerCase().includes(q) ||
      rec.productName.toLowerCase().includes(q) ||
      (rec.purchaseBillRef && rec.purchaseBillRef.toLowerCase().includes(q));

    return matchesBranch && matchesStatus && matchesQuery;
  });

  // Metrics
  const activeCount = customerDevices.filter((c) => c.status === 'ACTIVE').length;
  const suspendedCount = customerDevices.filter((c) => c.status === 'SUSPENDED').length;
  const inStockCount = customerDevices.filter((c) => c.status === 'IN_STOCK').length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !deviceSerial.trim() || !ponSerial.trim()) {
      alert('Please fill customer name, device serial number, and PON serial number.');
      return;
    }

    const dateBSObj = convertADToBS(issuedDateAD);

    await onCreateCustomerDevice({
      customerId: `c-${Date.now()}`,
      customerName,
      customerCode,
      contactPhone,
      installationAddress,
      branchId,
      productName,
      deviceSerial,
      ponSerial,
      macAddress: macAddress.trim() || undefined,
      status: 'ACTIVE',
      issuedDateAD,
      issuedDateBS: dateBSObj.formattedBSShort,
      purchaseBillRef: purchaseBillRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2 break-words leading-tight">
            <Wifi className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Customer Hardware Directory & Serial Number Lookup</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1 break-words leading-normal max-w-3xl">
            Lookup router, ONU, or set-top box devices by Device Serial, PON Serial, MAC address, or Customer name.
          </p>
        </div>

        {canManageCustomers && (
          <button
            onClick={() => {
              setCustomerCode(`CUST-${Math.floor(1000 + Math.random() * 9000)}`);
              setDeviceSerial(`SN-ONU24G-${Math.floor(100000 + Math.random() * 900000)}`);
              setPonSerial(`HWTC-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 cursor-pointer transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Customer Device</span>
          </button>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Tracked Serials</div>
          <div className="text-xl font-mono font-bold text-slate-900 mt-1">
            {customerDevices.length} Devices
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800">Active Deployed Routers</div>
          <div className="text-xl font-mono font-extrabold text-emerald-700 mt-1">
            {activeCount} Active
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-xs font-semibold text-amber-800">Suspended Connections</div>
          <div className="text-xl font-mono font-extrabold text-amber-700 mt-1">
            {suspendedCount} Suspended
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs font-semibold text-blue-800">Available / In-Stock</div>
          <div className="text-xl font-mono font-extrabold text-blue-600 mt-1">
            {inStockCount} In Stock
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Instant Lookup by Device Serial (e.g. SN-ONU24G-881923), PON Serial (e.g. HWTC-90A812C4), MAC, Customer, Phone..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DISCONNECTED">DISCONNECTED</option>
            <option value="IN_STOCK">IN_STOCK</option>
            <option value="RETURNED">RETURNED</option>
          </select>
        </div>
      </div>

      {/* Customer & Serial Number Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 break-words">Customer & Account</th>
                <th className="p-3.5 break-words">Branch & Address</th>
                <th className="p-3.5 break-words">Hardware Item</th>
                <th className="p-3.5 break-words">Device Serial #</th>
                <th className="p-3.5 break-words">PON Serial #</th>
                <th className="p-3.5 break-words">Issued Date</th>
                <th className="p-3.5 text-center break-words">Warranty Status</th>
                <th className="p-3.5 text-center break-words">Device Status & Stock Sync</th>
                <th className="p-3.5 text-center break-words">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs break-words">
                    No matching customer devices found. Use the search bar above to query Device Serial or PON Serial numbers.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const branch = branches.find((b) => b.id === rec.branchId);
                  const wInfo = getWarrantyInfo(rec.issuedDateAD, rec.warrantyMonths || 12);
                  return (
                    <tr key={rec.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm break-words leading-snug">{rec.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5 break-words">
                          <span className="text-blue-700 font-semibold">{rec.customerCode}</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone className="h-3 w-3 shrink-0" /> {rec.contactPhone}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 text-xs break-words">{branch?.name || rec.branchId}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 break-words">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{rec.installationAddress}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs inline-block break-words">
                          {rec.productName}
                        </span>
                        {rec.purchaseBillRef && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1 break-words">
                            Bill Ref: <strong className="text-slate-700">{rec.purchaseBillRef}</strong>
                          </div>
                        )}
                      </td>

                      {/* Device Serial Number */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 w-fit">
                          <Barcode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono font-extrabold text-blue-900 text-xs select-all break-all">
                            {rec.deviceSerial}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(rec.deviceSerial)}
                            title="Copy Device Serial"
                            className="p-0.5 text-blue-500 hover:text-blue-700 cursor-pointer ml-1 shrink-0"
                          >
                            {copiedText === rec.deviceSerial ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {rec.macAddress && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 break-all">
                            MAC: {rec.macAddress}
                          </div>
                        )}
                      </td>

                      {/* PON Serial Number */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1 w-fit">
                          <Wifi className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="font-mono font-extrabold text-indigo-900 text-xs select-all break-all">
                            {rec.ponSerial}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(rec.ponSerial)}
                            title="Copy PON Serial"
                            className="p-0.5 text-indigo-500 hover:text-indigo-700 cursor-pointer ml-1 shrink-0"
                          >
                            {copiedText === rec.ponSerial ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-500 break-words">
                        {formatDualDate(rec.issuedDateAD, dateMode)}
                      </td>

                      {/* Warranty Status Column */}
                      <td className="p-3.5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border whitespace-normal break-words max-w-[130px] text-center justify-center ${
                          wInfo.status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : wInfo.status === 'EXPIRING_SOON'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}>
                          {wInfo.status === 'VALID' && <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />}
                          {wInfo.status === 'EXPIRING_SOON' && <Clock className="h-3 w-3 text-amber-600 shrink-0" />}
                          {wInfo.status === 'EXPIRED' && <ShieldAlert className="h-3 w-3 text-rose-600 shrink-0" />}
                          <span>{wInfo.label}</span>
                        </div>
                      </td>

                      {/* Device Status & Action Button to Set Status */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={rec.status}
                            onChange={(e) => {
                              const newSt = e.target.value as any;
                              handleStatusChangeAttempt(rec, newSt);
                            }}
                            className={`rounded-xl px-2.5 py-1.5 text-[10px] font-extrabold uppercase cursor-pointer border shadow-2xs transition-all ${
                              rec.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                : rec.status === 'RENTAL'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200'
                                : rec.status === 'SUSPENDED'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                : rec.status === 'IN_STOCK'
                                ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                : rec.status === 'REFUND'
                                ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                            }`}
                          >
                            <option value="ACTIVE">🟢 ACTIVE (Deployed)</option>
                            <option value="RENTAL">🔵 RENTAL (ISP Rental)</option>
                            <option value="SUSPENDED">🟡 SUSPENDED (Approval Req.)</option>
                            <option value="DISCONNECTED">🔴 DISCONNECTED (Approval Req.)</option>
                            <option value="IN_STOCK">📦 IN_STOCK (Approval Req.)</option>
                            <option value="REFUND">💸 REFUND & RESTOCK (Approval Req.)</option>
                          </select>
                          {(currentUser?.role === 'BRANCH_MANAGER' || currentUser?.role === 'FRONT_DESK') && (
                            <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5 text-amber-500" />
                              <span>Approval required</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          Details
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

      {/* Customer Record Detail Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wifi className="h-4 w-4 text-blue-600" />
                <span>Customer Hardware Deployment Details</span>
              </h3>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-base font-extrabold text-slate-900">{viewingRecord.customerName}</div>
                  <div className="text-xs text-blue-700 font-mono font-bold mt-0.5">
                    Account: {viewingRecord.customerCode} | Phone: {viewingRecord.contactPhone}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{viewingRecord.installationAddress}</span>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  viewingRecord.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingRecord.status}
                </span>
              </div>

              {/* Serials Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Device Serial Number
                  </span>
                  <div className="text-sm font-mono font-extrabold text-blue-900 mt-1 select-all">
                    {viewingRecord.deviceSerial}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Physical Barcode Label</div>
                </div>

                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    PON Serial Number
                  </span>
                  <div className="text-sm font-mono font-extrabold text-indigo-900 mt-1 select-all">
                    {viewingRecord.ponSerial}
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">Optical Line Terminal ID</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Device Hardware Model:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.productName}</span>
                </div>
                {viewingRecord.macAddress && (
                  <div className="flex justify-between text-slate-600">
                    <span>MAC Address:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingRecord.macAddress}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Assigned Branch:</span>
                  <span className="font-bold text-slate-900">{branches.find(b => b.id === viewingRecord.branchId)?.name || viewingRecord.branchId}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Issued Date:</span>
                  <span className="font-mono font-bold">{viewingRecord.issuedDateAD} ({viewingRecord.issuedDateBS})</span>
                </div>
                {viewingRecord.purchaseBillRef && (
                  <div className="flex justify-between text-slate-600">
                    <span>Origin Purchase Bill #:</span>
                    <span className="font-mono font-bold text-blue-700">{viewingRecord.purchaseBillRef}</span>
                  </div>
                )}
              </div>

              {viewingRecord.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <strong className="block font-bold mb-0.5">Technical Notes:</strong>
                  {viewingRecord.notes}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="rounded-xl bg-blue-600 text-white px-5 py-2 text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Customer Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wifi className="h-4 w-4 text-blue-600" />
                <span>Assign Customer Device (Device & PON Serial Entry)</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Aashish Subedi"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Account / Code
                  </label>
                  <input
                    type="text"
                    required
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Serving Branch
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Installation Address *
                </label>
                <input
                  type="text"
                  required
                  value={installationAddress}
                  onChange={(e) => setInstallationAddress(e.target.value)}
                  placeholder="e.g. Lazimpat Ward 2, Kathmandu"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Device Hardware Model
                </label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ONU ROUTER 2.4G">ONU ROUTER 2.4G</option>
                  <option value="ONU ROUTER 5G">ONU ROUTER 5G</option>
                  <option value="IP TV SETUP BOX">IP TV SETUP BOX</option>
                  <option value="SWITCH (HUAWEI S6700-24-EI)-FA">SWITCH (HUAWEI S6700-24-EI)</option>
                  <option value="MIKROTIK HEX RB750Gr3">MIKROTIK HEX RB750Gr3</option>
                </select>
              </div>

              {/* Highlighted Serial Inputs */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <span className="text-xs font-bold text-blue-900 block flex items-center gap-1">
                  <Barcode className="h-4 w-4 text-blue-600" />
                  Hardware Device Identification Numbers
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">
                      Device Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={deviceSerial}
                      onChange={(e) => setDeviceSerial(e.target.value)}
                      placeholder="e.g. SN-ONU24G-881923"
                      className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 font-mono text-xs text-blue-900 font-extrabold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-800 mb-1">
                      PON Serial Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={ponSerial}
                      onChange={(e) => setPonSerial(e.target.value)}
                      placeholder="e.g. HWTC-90A812C4"
                      className="w-full rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 font-mono text-xs text-indigo-900 font-extrabold focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      MAC Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={macAddress}
                      onChange={(e) => setMacAddress(e.target.value)}
                      placeholder="e.g. 70:A8:E3:4B:91:10"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Vendor Purchase Bill Ref
                    </label>
                    <input
                      type="text"
                      value={purchaseBillRef}
                      onChange={(e) => setPurchaseBillRef(e.target.value)}
                      placeholder="e.g. BILL-9021"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
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
                  Save Device Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-slide-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs leading-relaxed font-medium">
            {toastMessage}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Trigger Approval Request Modal */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Send Approval Request</h3>
                  <p className="text-amber-100 text-xs">
                    Workflow Authorization: Branch Staff ➔ Inventory Manager / Super Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalTarget(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitApproval} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Role Restriction Notice:</strong> As a <strong>{currentUser?.role || 'Staff Member'}</strong>, changing status to <strong>{approvalTarget.targetStatus}</strong> requires formal approval. Upon authorization, the record will update automatically.
                </div>
              </div>

              {/* Target Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
                  <span>Customer: {approvalTarget.record.customerName}</span>
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {approvalTarget.record.customerCode}
                  </span>
                </div>
                <div className="text-slate-500 flex items-center justify-between font-mono text-[11px]">
                  <span>Device SN: {approvalTarget.record.deviceSerial}</span>
                  <span>Model: {approvalTarget.record.productName}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Status Change:</span>
                  <div className="flex items-center gap-2 font-bold text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {approvalTarget.record.status}
                    </span>
                    <span>➔</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                      {approvalTarget.targetStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Justification for Request *
                </label>
                <textarea
                  required
                  rows={3}
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="e.g. Customer returned ONU router in good condition. Requested deposit refund NPR 3,500..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Restock Toggle */}
              {(approvalTarget.targetStatus === 'REFUND' || approvalTarget.targetStatus === 'RETURNED' || approvalTarget.targetStatus === 'IN_STOCK') && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <input
                    type="checkbox"
                    id="restockCheck"
                    checked={approvalRestock}
                    onChange={(e) => setApprovalRestock(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="restockCheck" className="text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer">
                    Synchronize Inventory: Restock +1 unit back to branch stock upon approval
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmittingApproval ? 'Submitting...' : 'Send Approval Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
