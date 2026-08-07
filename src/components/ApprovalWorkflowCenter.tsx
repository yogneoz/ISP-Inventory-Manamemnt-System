import React, { useState } from 'react';
import { ApprovalRequest, Branch, User } from '../types';
import { formatDualDate } from '../utils/nepaliCalendar';
import { isOperationAllowed } from '../utils/permissions';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  UserCheck,
  Layers,
  FileText,
  Barcode,
  ArrowRight,
  RefreshCw,
  Send,
  Building2,
} from 'lucide-react';

interface ApprovalWorkflowCenterProps {
  approvalRequests: ApprovalRequest[];
  branches: Branch[];
  currentUser?: User | null;
  dateMode: 'BS' | 'AD';
  isDarkMode?: boolean;
  onProcessApproval: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) => Promise<void>;
}

export const ApprovalWorkflowCenter: React.FC<ApprovalWorkflowCenterProps> = ({
  approvalRequests = [],
  branches = [],
  currentUser,
  dateMode,
  isDarkMode = false,
  onProcessApproval,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingReq, setApprovingReq] = useState<ApprovalRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ApprovalRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [viewingReq, setViewingReq] = useState<ApprovalRequest | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canApprove =
    isOperationAllowed('workflow-approval', currentUser?.role) ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'INVENTORY_MANAGER';

  const pendingCount = approvalRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = approvalRequests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = approvalRequests.filter((r) => r.status === 'REJECTED').length;

  const filteredList = approvalRequests.filter((req) => {
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchesBranch = filterBranchId === 'ALL' || req.branchId === filterBranchId;

    if (!searchQuery.trim()) return matchesStatus && matchesBranch;

    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      req.requestNumber.toLowerCase().includes(q) ||
      req.customerName.toLowerCase().includes(q) ||
      req.deviceSerial.toLowerCase().includes(q) ||
      (req.ponSerial && req.ponSerial.toLowerCase().includes(q)) ||
      req.requestedByName.toLowerCase().includes(q) ||
      req.productName.toLowerCase().includes(q);

    return matchesStatus && matchesBranch && matchesQ;
  });

  const handleApprove = (req: ApprovalRequest) => {
    if (!canApprove) {
      setToastMessage('Only Inventory Managers or Super Admins can authorize workflow approval requests.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setApprovingReq(req);
  };

  const handleConfirmApprove = async () => {
    if (!approvingReq) return;

    setIsProcessingId(approvingReq.id);
    try {
      await onProcessApproval(approvingReq.id, 'APPROVED');
      setToastMessage(`Approval Request #${approvingReq.requestNumber} for ${approvingReq.customerName} authorized & executed successfully!`);
      setApprovingReq(null);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage(`Approval failed: ${err.message}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReasonInput.trim()) {
      return;
    }

    setIsProcessingId(rejectingReq.id);
    try {
      await onProcessApproval(rejectingReq.id, 'REJECTED', rejectionReasonInput.trim());
      setToastMessage(`Request #${rejectingReq.requestNumber} rejected.`);
      setRejectingReq(null);
      setRejectionReasonInput('');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage(`Rejection failed: ${err.message}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsProcessingId(null);
    }
  };

  const cardBg = isDarkMode
    ? 'bg-slate-900/80 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200/80 text-slate-900';

  const subTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border shadow-xs p-5 space-y-5 ${cardBg}`}>
      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header & Role Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Workflow Approval & Authorization Center</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                    {pendingCount} Pending Review
                  </span>
                )}
              </h3>
              <p className={`text-xs mt-0.5 ${subTextColor}`}>
                <strong>Request Flow:</strong> Branch Manager / Front Desk ➔ Inventory Manager / Super Admin. Formal authorization center for Suspend, Disconnect & Refund/Restock actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span
            className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
              canApprove
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>
              {canApprove ? 'Authorized Approver Role' : 'Requester Role (Submit Mode)'}
            </span>
          </span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('PENDING')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'PENDING'
              ? 'ring-2 ring-amber-500 bg-amber-500/10 border-amber-500/50'
              : isDarkMode
              ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
              : 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Pending Approvals</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {pendingCount}
          </div>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5">
            Awaiting Super Admin review
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('APPROVED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'APPROVED'
              ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/50'
              : isDarkMode
              ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
              : 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>Approved Total</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
            {approvedCount}
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
            Executed & synchronized
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('REJECTED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'REJECTED'
              ? 'ring-2 ring-rose-500 bg-rose-500/10 border-rose-500/50'
              : isDarkMode
              ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
              : 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Rejected Requests</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
            {rejectedCount}
          </div>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-400 mt-0.5">
            Declined with reason
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'ring-2 ring-indigo-500 bg-indigo-500/10 border-indigo-500/50'
              : isDarkMode
              ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
              : 'bg-indigo-50/50 border-indigo-200/80 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <span>Total Requests</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">
            {approvalRequests.length}
          </div>
          <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 mt-0.5">
            Full audit log trace
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer shrink-0 ${
                filterStatus === st
                  ? st === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : st === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : st === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Requests' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Filter */}
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className={`rounded-xl px-2.5 py-1.5 text-xs font-bold border cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">🏢 All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial, customer, request #..."
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Request Table List */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100/80 text-slate-700'}>
              <th className="p-3 text-[11px] font-extrabold uppercase">Request # & Date</th>
              <th className="p-3 text-[11px] font-extrabold uppercase">Customer & Serial</th>
              <th className="p-3 text-[11px] font-extrabold uppercase">Status Transition</th>
              <th className="p-3 text-[11px] font-extrabold uppercase">Requester & Branch</th>
              <th className="p-3 text-[11px] font-extrabold uppercase">Reason / Justification</th>
              <th className="p-3 text-[11px] font-extrabold uppercase text-center">Status</th>
              <th className="p-3 text-[11px] font-extrabold uppercase text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <ShieldCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-sm">No authorization requests found</p>
                    <p className="text-xs">
                      Status change requests submitted by Branch Managers or Frontdesk will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';

                return (
                  <tr
                    key={req.id}
                    className={`transition-colors ${
                      isPending
                        ? isDarkMode
                          ? 'bg-amber-950/20 hover:bg-amber-950/30'
                          : 'bg-amber-50/40 hover:bg-amber-50/80'
                        : isDarkMode
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Request # & Date */}
                    <td className="p-3">
                      <div className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                        {req.requestNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {formatDualDate(req.requestedAtAD, dateMode)}
                      </div>
                    </td>

                    {/* Customer & Serial */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {req.customerName}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-slate-500">
                        <Barcode className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {req.deviceSerial}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Model: {req.productName}
                      </div>
                    </td>

                    {/* Status Transition */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-bold text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          {req.currentStatus}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span
                          className={`px-2 py-0.5 rounded-full border uppercase ${
                            req.requestedStatus === 'REFUND'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                              : req.requestedStatus === 'SUSPENDED'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {req.requestedStatus}
                        </span>
                      </div>
                      {req.restockQtyOnApproval && (
                        <div className="mt-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <RefreshCw className="h-2.5 w-2.5" />
                          <span>Restock +1 unit on approval</span>
                        </div>
                      )}
                    </td>

                    {/* Requester & Branch */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.requestedByName}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {req.requestedByRole}
                        </span>
                        <span>•</span>
                        <span>{req.branchName || req.branchId}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="p-3 max-w-xs">
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                        {req.reason}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-rose-600 dark:text-rose-400 text-[10px] font-bold mt-1 line-clamp-1">
                          Rejection: {req.rejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}
                      >
                        {isPending && <Clock className="h-3 w-3 animate-spin" />}
                        {isApproved && <CheckCircle2 className="h-3 w-3" />}
                        {isRejected && <XCircle className="h-3 w-3" />}
                        <span>{req.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isPending && canApprove ? (
                          <>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={isProcessingId === req.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Approve Request & Execute Status Change"
                            >
                              <Check className="h-3 w-3" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingReq(req);
                                setRejectionReasonInput('');
                              }}
                              disabled={isProcessingId === req.id}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Reject Request"
                            >
                              <X className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setViewingReq(req)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Approval Confirmation */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-600 font-extrabold text-base pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <span>Authorize Approval for Request #{approvingReq.requestNumber}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100">
                <span>Customer: {approvingReq.customerName}</span>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                  {approvingReq.customerCode}
                </span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <span>Serial #: {approvingReq.deviceSerial}</span>
                <span>Model: {approvingReq.productName}</span>
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-800/40">
                <span className="font-bold text-slate-700 dark:text-slate-300">Status Transition:</span>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {approvingReq.currentStatus}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase font-extrabold">
                    {approvingReq.requestedStatus}
                  </span>
                </div>
              </div>
              {approvingReq.restockQtyOnApproval && (
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 mt-1">
                  <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                  <span>+1 Unit will be automatically restocked to branch inventory stock.</span>
                </div>
              )}
            </div>

            <div className="text-xs space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Submitted Reason / Justification:
              </span>
              <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 leading-relaxed italic text-[11px]">
                "{approvingReq.reason}"
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Confirming authorization will instantly change the customer device status to <strong>{approvingReq.requestedStatus}</strong> and record an official audit log trace.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                disabled={isProcessingId === approvingReq.id}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isProcessingId === approvingReq.id}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingId === approvingReq.id ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm & Authorize Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Rejection Reason */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <XCircle className="h-5 w-5" />
              <span>Reject Request #{rejectingReq.requestNumber}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Rejecting status change for <strong>{rejectingReq.customerName}</strong> ({rejectingReq.deviceSerial}). Please state the rejection reason:
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Customer must return physical ONU router equipment to the branch office before disconnection..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingId === rejectingReq.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Request Details */}
      {viewingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {viewingReq.requestNumber}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Authorization Request Trace
                </h3>
              </div>
              <button
                onClick={() => setViewingReq(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Customer: {viewingReq.customerName}</span>
                  <span className="font-mono text-[10px]">{viewingReq.customerCode}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                  <span>Device Serial: {viewingReq.deviceSerial}</span>
                  <span>Model: {viewingReq.productName}</span>
                </div>
                <div className="pt-1.5 flex justify-between font-bold text-[11px]">
                  <span>Status Change:</span>
                  <div className="flex items-center gap-1.5">
                    <span>{viewingReq.currentStatus}</span>
                    <span>➔</span>
                    <span className="text-amber-600 uppercase">{viewingReq.requestedStatus}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                  Requester Details:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {viewingReq.requestedByName} ({viewingReq.requestedByRole}) • {viewingReq.requestedByEmail} • {viewingReq.branchName}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                  Reason / Justification:
                </span>
                <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {viewingReq.reason}
                </p>
              </div>

              {viewingReq.processedByName && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                    Processed Trace ({viewingReq.status}):
                  </span>
                  <p className="text-emerald-800 dark:text-emerald-400 text-[11px]">
                    By: {viewingReq.processedByName} ({viewingReq.processedByRole}) • {viewingReq.processedByEmail}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-500 font-mono text-[10px]">
                    At: {formatDualDate(viewingReq.processedAtAD || '', dateMode)}
                  </p>
                  {viewingReq.rejectionReason && (
                    <p className="text-rose-700 dark:text-rose-400 font-bold mt-1">
                      Reason: {viewingReq.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {viewingReq.status === 'PENDING' && canApprove && (
                  <>
                    <button
                      onClick={() => {
                        const target = viewingReq;
                        setViewingReq(null);
                        setApprovingReq(target);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        const target = viewingReq;
                        setViewingReq(null);
                        setRejectingReq(target);
                        setRejectionReasonInput('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setViewingReq(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
