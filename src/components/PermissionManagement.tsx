import React, { useState } from 'react';
import { UserRole } from '../types';
import { ShieldCheck, Check, Save, RotateCcw, Lock, Users } from 'lucide-react';

interface PermissionModule {
  id: string;
  category: string;
  operationName: string;
  description: string;
  permissions: Record<UserRole, boolean>;
}

const DEFAULT_MODULES: PermissionModule[] = [
  {
    id: 'prod-view',
    category: 'Inventory Master',
    operationName: 'View Products & Stock Levels',
    description: 'Access product catalog, SKUs, barcodes, and current branch stock balance',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: true },
  },
  {
    id: 'prod-edit',
    category: 'Inventory Master',
    operationName: 'Create & Edit Products',
    description: 'Add new items, update cost rates, selling prices, and reorder levels',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: false, ACCOUNTANT: false },
  },
  {
    id: 'po-create',
    category: 'Procurement',
    operationName: 'Create Purchase Orders',
    description: 'Generate multi-item POs to suppliers and vendors',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: false },
  },
  {
    id: 'po-receive',
    category: 'Procurement',
    operationName: 'Receive PO Stock Inbound',
    description: 'Accept stock deliveries and update branch inventory on hand',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: false },
  },
  {
    id: 'inv-create',
    category: 'Invoicing & Tax',
    operationName: 'Record Purchase Tax Invoices',
    description: 'Entry of vendor bills with 13% VAT bill-wise taxation and credit mode tracking',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: false, ACCOUNTANT: true },
  },
  {
    id: 'inv-pay',
    category: 'Invoicing & Tax',
    operationName: 'Process Vendor Payment Settlements',
    description: 'Record credit settlements, bank transfers, and partial invoice payments',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: false, INVENTORY_CLERK: false, ACCOUNTANT: true },
  },
  {
    id: 'shipment-create',
    category: 'Logistics',
    operationName: 'Create Inter-Branch Shipments',
    description: 'Dispatch stock transfers between headquarters and regional branch hubs',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: false },
  },
  {
    id: 'shipment-receive',
    category: 'Logistics',
    operationName: 'Acknowledge Received Shipments',
    description: 'Confirm arrival of in-transit shipments and update local branch stock',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: false },
  },
  {
    id: 'stock-ops',
    category: 'Stock Operations',
    operationName: 'Log Damage, Pullout & Write-Offs',
    description: 'Record vendor returns, transit damages, and internal store consumption',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: true, ACCOUNTANT: false },
  },
  {
    id: 'assets-manage',
    category: 'Fixed Assets',
    operationName: 'Fixed Asset Register & Allocation',
    description: 'Register capital assets, assign branch locations, and calculate depreciation',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: false, ACCOUNTANT: true },
  },
  {
    id: 'suppliers-manage',
    category: 'Suppliers & Vendors',
    operationName: 'Vendor Master & PAN/VAT Directory',
    description: 'Add and manage verified vendor profiles, PAN/VAT numbers, and contacts',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: true, INVENTORY_CLERK: false, ACCOUNTANT: true },
  },
  {
    id: 'admin-users',
    category: 'Administration',
    operationName: 'User Management & Role Assignment',
    description: 'Create system users, reset passwords, and assign branch affiliations',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: false, INVENTORY_CLERK: false, ACCOUNTANT: false },
  },
  {
    id: 'admin-audit',
    category: 'Administration',
    operationName: 'View Audit Logs & Fiscal Settlement',
    description: 'Inspect system transaction logs and manage Nepali Bikram Sambat fiscal years',
    permissions: { SUPER_ADMIN: true, BRANCH_MANAGER: false, INVENTORY_CLERK: false, ACCOUNTANT: true },
  },
];

const ROLES: { key: UserRole; title: string; badgeColor: string }[] = [
  { key: 'SUPER_ADMIN', title: 'Super Admin', badgeColor: 'bg-blue-600 text-white' },
  { key: 'BRANCH_MANAGER', title: 'Branch Manager', badgeColor: 'bg-indigo-600 text-white' },
  { key: 'INVENTORY_CLERK', title: 'Inventory Clerk', badgeColor: 'bg-emerald-600 text-white' },
  { key: 'ACCOUNTANT', title: 'Accountant', badgeColor: 'bg-amber-600 text-white' },
];

export const PermissionManagement: React.FC = () => {
  const [modules, setModules] = useState<PermissionModule[]>(DEFAULT_MODULES);
  const [savedNotification, setSavedNotification] = useState(false);

  const togglePermission = (moduleId: string, role: UserRole) => {
    setModules((prev) =>
      prev.map((mod) => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            permissions: {
              ...mod.permissions,
              [role]: !mod.permissions[role],
            },
          };
        }
        return mod;
      })
    );
  };

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  const handleReset = () => {
    setModules(DEFAULT_MODULES);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span>Role & Operations Permission Management</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure access matrix and functional privileges across user roles in tabular format.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Permission Matrix</span>
          </button>
        </div>
      </div>

      {savedNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Role permissions updated successfully across all system modules!</span>
        </div>
      )}

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 w-1/3">Operation & Module</th>
                {ROLES.map((role) => (
                  <th key={role.key} className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${role.badgeColor}`}>
                      {role.title}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {mod.category}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {mod.operationName}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {mod.description}
                    </div>
                  </td>
                  {ROLES.map((role) => {
                    const isChecked = mod.permissions[role.key];
                    return (
                      <td key={role.key} className="p-4 text-center align-middle">
                        <label className="inline-flex items-center justify-center cursor-pointer p-2 rounded-lg hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(mod.id, role.key)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
