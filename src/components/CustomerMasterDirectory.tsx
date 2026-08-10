import React, { useState } from 'react';
import { CustomerRecord, Branch, User } from '../types';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CustomerMasterDirectoryProps {
  customers: CustomerRecord[];
  branches: Branch[];
  currentUser?: User | null;
  onAddCustomer: (customer: Omit<CustomerRecord, 'id'> | CustomerRecord) => Promise<void>;
  onUpdateCustomer: (id: string, updates: Partial<CustomerRecord>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onNavigateToImport: () => void;
  isDarkMode?: boolean;
}

export const CustomerMasterDirectory: React.FC<CustomerMasterDirectoryProps> = ({
  customers,
  branches,
  currentUser,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onNavigateToImport,
  isDarkMode = false,
}) => {
  // Check permission: Only Super Admin and Inventory Manager can Add / Edit / Delete in Customer Master Table
  const canManageMaster =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'INVENTORY_MANAGER';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Field States
  const [formData, setFormData] = useState({
    customerId: `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
    customerName: '',
    username: '',
    contactNumber: '',
    branchId: branches[0]?.id || 'WH001',
    address: '',
    email: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    creditLimit: 0,
  });

  const resetForm = () => {
    setFormData({
      customerId: `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: '',
      username: '',
      contactNumber: '',
      branchId: branches[0]?.id || 'WH001',
      address: '',
      email: '',
      status: 'ACTIVE',
      creditLimit: 0,
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: customer.customerId || customer.id,
      customerName: customer.customerName,
      username: customer.username,
      contactNumber: customer.contactNumber,
      branchId: customer.branchId,
      address: customer.address || '',
      email: customer.email || '',
      status: customer.status || 'ACTIVE',
      creditLimit: customer.creditLimit || 0,
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.contactNumber.trim() || !formData.username.trim()) {
      alert('Please fill in Customer Name, Username, and Primary Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, {
          customerId: formData.customerId,
          customerName: formData.customerName,
          username: formData.username,
          contactNumber: formData.contactNumber,
          branchId: formData.branchId,
          address: formData.address,
          email: formData.email,
          status: formData.status,
          creditLimit: Number(formData.creditLimit) || 0,
        });
        setEditingCustomer(null);
      } else {
        await onAddCustomer({
          id: formData.customerId,
          customerId: formData.customerId,
          customerName: formData.customerName,
          username: formData.username,
          contactNumber: formData.contactNumber,
          branchId: formData.branchId,
          address: formData.address,
          email: formData.email,
          status: formData.status,
          creditLimit: Number(formData.creditLimit) || 0,
          assignedDevicesCount: 0,
        });
        setIsAddModalOpen(false);
      }
      resetForm();
    } catch (err: any) {
      alert(`Save Failed: ${err.message || 'Error updating customer database'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    setIsSubmitting(true);
    try {
      await onDeleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
    } catch (err: any) {
      alert(`Delete Failed: ${err.message || 'Could not delete customer record'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Customers
  const filteredCustomers = customers.filter((c) => {
    const matchesBranch =
      selectedBranchFilter === 'ALL' || c.branchId === selectedBranchFilter;
    const matchesStatus =
      statusFilter === 'ALL' || c.status === statusFilter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.customerId?.toLowerCase().includes(query) ||
      c.customerName?.toLowerCase().includes(query) ||
      c.username?.toLowerCase().includes(query) ||
      c.contactNumber?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query);

    return matchesBranch && matchesStatus && matchesSearch;
  });

  // Export Customer Master Table to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      alert('No customer records available to export.');
      return;
    }

    const exportRows = filteredCustomers.map((c) => {
      const branchObj = branches.find((b) => b.id === c.branchId);
      return {
        'Cus. Code': c.customerId || c.id,
        'Customer Name': c.customerName,
        'Username': c.username,
        'Primary Mobile': c.contactNumber,
        'Branch Code': branchObj ? branchObj.code : c.branchId,
        'Branch Name': branchObj ? branchObj.name : c.branchId,
        'Address': c.address || '',
        'Email': c.email || '',
        'Status': c.status,
        'Credit Limit (NPR)': c.creditLimit || 0,
        'Assigned Hardware Count': c.assignedDevicesCount || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer_Master');

    const fileName = `Customer_Master_Database_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Customer Master Directory</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Central master table for customer records, usernames, primary mobile numbers, branch assignments, and credit profiles.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onNavigateToImport}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Upload className="h-4 w-4 text-indigo-600" />
              <span>Import Excel</span>
            </button>

            {canManageMaster ? (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Customer Record</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Master Edits Restricted (Super Admin / Inventory Mgr Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registered Customers</span>
            <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{customers.length} Accounts</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Status Accounts</span>
            <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
              {customers.filter((c) => c.status === 'ACTIVE').length} Active
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Assigned Branches</span>
            <div className="text-xl font-bold mt-1 text-indigo-700 dark:text-indigo-400">
              {new Set(customers.map((c) => c.branchId)).size} Branches
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Total Credit Capacity</span>
            <div className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-400">
              रु {customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Cus. Code, Name, Username, Primary Mobile, Email, or Address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl border transition-colors outline-none ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className={`px-3 py-2 text-sm rounded-xl border outline-none font-medium ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`px-3 py-2 text-sm rounded-xl border outline-none font-medium ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Master Directory Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className={`border-b text-xs uppercase font-semibold tracking-wider ${
                isDarkMode ? 'bg-slate-800/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="p-3.5">Cus. Code</th>
                <th className="p-3.5">Customer Name & Username</th>
                <th className="p-3.5">Primary Mobile</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Contact Details & Address</th>
                <th className="p-3.5 text-right">Credit Limit</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-base">No Customer Records Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery ? 'Try adjusting your search query or filters.' : 'Add a customer or import from Excel.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const branchObj = branches.find((b) => b.id === customer.branchId);
                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {/* Cus. Code */}
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {customer.customerId || customer.id}
                      </td>

                      {/* Customer Name & Username */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {customer.customerName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          @{customer.username}
                        </div>
                      </td>

                      {/* Primary Mobile */}
                      <td className="p-3.5 font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{customer.contactNumber}</span>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Building2 className="h-3 w-3 text-indigo-500" />
                          {branchObj ? `${branchObj.name} (${branchObj.code})` : customer.branchId}
                        </span>
                      </td>

                      {/* Contact Details & Address */}
                      <td className="p-3.5 max-w-xs">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-0.5 truncate">
                            <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                          <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span>{customer.address || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Credit Limit */}
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        रु {(customer.creditLimit || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {customer.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {canManageMaster ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(customer)}
                              title="Edit Customer Master Record"
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingCustomer(customer)}
                              title="Delete Customer Master Record"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-6 overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {editingCustomer ? 'Edit Customer Master Record' : 'Add New Customer Record'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingCustomer
                      ? `Updating master database profile for ${editingCustomer.customerName}`
                      : 'Create a new customer profile in the master database'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cus. Code (Customer ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    placeholder="e.g. CUS-10291"
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none font-mono ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. aarav.sharma"
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-3 py-2 text-sm rounded-xl border outline-none font-semibold ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="e.g. 9851092810"
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none font-mono ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Branch *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. aarav@gmail.com"
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Limit (NPR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none font-mono ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Address / Location
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Durbar Marg Ward 4, Kathmandu, Nepal"
                  className={`w-full px-3 py-2 text-sm rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="ACTIVE">Active Account</option>
                  <option value="INACTIVE">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Record' : 'Save Customer Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Confirm Delete Customer</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete customer account{' '}
              <span className="font-bold font-mono text-indigo-600">{deletingCustomer.customerId || deletingCustomer.id}</span> ({deletingCustomer.customerName}) from the master directory?
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Customer Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
