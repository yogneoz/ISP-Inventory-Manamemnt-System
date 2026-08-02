import React, { useState, useEffect } from 'react';
import { ChevronDown, Zap, X } from 'lucide-react';
import { User } from '../types';

export type NavTab =
  | 'dashboard'
  | 'all-stock'
  | 'branch-stock'
  | 'fixed-assets'
  | 'customers'
  | 'create-po'
  | 'po-list'
  | 'create-purchase'
  | 'purchase-list'
  | 'create-shipment'
  | 'receive-shipment'
  | 'shipment-list'
  | 'pullout'
  | 'damage'
  | 'stock-out'
  | 'assign-asset'
  | 'branches'
  | 'suppliers'
  | 'users'
  | 'permissions'
  | 'audit';

interface SidebarProps {
  currentUser?: User | null;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lowStockCount: number;
  pendingPoCount: number;
  inTransitShipmentCount: number;
  isDarkMode?: boolean;
  onCloseMobile?: () => void;
}

interface NavGroupDef {
  id: string;
  title: string;
  icon: string;
  children: {
    id: NavTab;
    label: string;
    icon: string;
    badge?: number;
    badgeColor?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  lowStockCount,
  pendingPoCount,
  inTransitShipmentCount,
  isDarkMode = false,
  onCloseMobile,
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isBranchManager = currentUser?.role === 'BRANCH_MANAGER';
  const isClerk = currentUser?.role === 'INVENTORY_CLERK';
  const isAccountant = currentUser?.role === 'ACCOUNTANT';
  const isBranchUser = Boolean(currentUser?.branchId && currentUser.branchId !== 'ALL' && !isSuperAdmin);

  // Build filtered navigation groups based on role permissions
  const groups: NavGroupDef[] = [];

  // 1. Dashboard Group
  const dashboardChildren = [
    { id: 'dashboard' as NavTab, label: 'Overview', icon: '📈' },
    ...(!isBranchUser ? [{ id: 'all-stock' as NavTab, label: 'All Available Stock', icon: '📦' }] : []),
    {
      id: 'branch-stock' as NavTab,
      label: isBranchUser ? 'My Branch Stock' : 'Stock By Branch',
      icon: '🏪',
      badge: lowStockCount,
      badgeColor: 'bg-rose-500 text-white',
    },
    ...(!isClerk ? [{ id: 'fixed-assets' as NavTab, label: 'Fixed Asset Register', icon: '🏗️' }] : []),
    { id: 'customers' as NavTab, label: 'Customer Device Serials', icon: '📶' },
  ];
  groups.push({
    id: 'dashboard',
    title: '📊 Dashboard',
    icon: '📊',
    children: dashboardChildren,
  });

  // 2. Procurement Group
  const procurementChildren = [
    ...(!isClerk ? [{
      id: 'create-po' as NavTab,
      label: 'Create Purchase Order',
      icon: '📋',
      badge: pendingPoCount,
      badgeColor: 'bg-indigo-600 text-white',
    }] : []),
    { id: 'po-list' as NavTab, label: 'Purchase Order View', icon: '📜' },
    ...(!isClerk ? [{ id: 'create-purchase' as NavTab, label: 'Create Purchase', icon: '📥' }] : []),
    { id: 'purchase-list' as NavTab, label: 'Purchase Invoices', icon: '📄' },
  ];
  groups.push({
    id: 'procurement',
    title: '📦 Procurement',
    icon: '📦',
    children: procurementChildren,
  });

  // 3. Logistics Group
  // CRITICAL RULE: Branch users CANNOT create shipments! Only Central HQ/Super Admin can create shipments.
  const logisticsChildren = [
    ...(isSuperAdmin ? [{ id: 'create-shipment' as NavTab, label: 'Create Shipment', icon: '📤' }] : []),
    {
      id: 'receive-shipment' as NavTab,
      label: 'Receive Shipment',
      icon: '📥',
      badge: inTransitShipmentCount,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'shipment-list' as NavTab, label: 'Shipment History', icon: '📋' },
  ];
  groups.push({
    id: 'logistics',
    title: '🚚 Logistics',
    icon: '🚚',
    children: logisticsChildren,
  });

  // 4. Stock Operations Group
  const stockOpsChildren = [
    { id: 'pullout' as NavTab, label: 'Pullout', icon: '📤' },
    { id: 'damage' as NavTab, label: 'Damage', icon: '💔' },
    { id: 'stock-out' as NavTab, label: 'Stock Out', icon: '📤' },
    ...(!isClerk && !isAccountant ? [{ id: 'assign-asset' as NavTab, label: 'Assign Fixed Asset', icon: '📱' }] : []),
  ];
  groups.push({
    id: 'stockops',
    title: '📤 Stock Operations',
    icon: '📤',
    children: stockOpsChildren,
  });

  // 5. Administration Group
  // CRITICAL RULE: Hide Administration panel completely for non-Super Admin users (Branch Managers, Clerks, Accountants)
  if (isSuperAdmin) {
    groups.push({
      id: 'admin',
      title: '⚙️ Administration',
      icon: '⚙️',
      children: [
        { id: 'branches' as NavTab, label: 'Branches', icon: '🏪' },
        { id: 'suppliers' as NavTab, label: 'Suppliers', icon: '🏭' },
        { id: 'users' as NavTab, label: 'Users', icon: '👤' },
        { id: 'permissions' as NavTab, label: 'Permission Management', icon: '🛡️' },
        { id: 'audit' as NavTab, label: 'Audit Trail', icon: '📋' },
      ],
    });
  }

  // Helper to find parent group of active tab
  const getParentGroupId = (tab: NavTab): string => {
    for (const g of groups) {
      if (g.children.some((c) => c.id === tab)) {
        return g.id;
      }
    }
    return 'dashboard';
  };

  // Keep track of open accordion sections
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const activeParent = getParentGroupId(activeTab);
    return { [activeParent]: true };
  });

  // Automatically open parent group when activeTab changes
  useEffect(() => {
    const parent = getParentGroupId(activeTab);
    setOpenGroups((prev) => ({ ...prev, [parent]: true }));
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <aside
      className={`w-64 h-full flex-shrink-0 border-r flex flex-col justify-between select-none transition-colors duration-200 ${
        isDarkMode
          ? 'border-slate-800 bg-[#0f1218] text-slate-300'
          : 'border-slate-200 bg-white text-slate-800 shadow-xs'
      }`}
    >
      {onCloseMobile && (
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation Menu</span>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="py-2 px-0 overflow-y-auto flex-1">
        {groups.map((group, idx) => {
          const isOpen = !!openGroups[group.id];
          const isParentActive = group.children.some((c) => c.id === activeTab);

          return (
            <div key={group.id} className="border-b border-slate-100 dark:border-slate-800/60">
              {idx > 0 && group.id === 'admin' && (
                <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
              )}

              {/* Group Parent Button */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-5 py-3 text-sm font-medium transition-colors cursor-pointer border-l-3 ${
                  isParentActive
                    ? isDarkMode
                      ? 'bg-slate-800/50 text-indigo-400 border-indigo-500 font-semibold'
                      : 'bg-[#eef1f7] text-[#1a237e] border-[#1a237e] font-semibold'
                    : isDarkMode
                    ? 'border-transparent text-slate-300 hover:bg-slate-800/30 hover:text-white'
                    : 'border-transparent text-slate-700 hover:bg-[#f5f7fa] hover:text-[#1a237e]'
                }`}
              >
                <span className="font-semibold text-xs tracking-wide">{group.title}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 opacity-60 ${
                    isOpen ? 'rotate-180 opacity-100' : ''
                  }`}
                />
              </button>

              {/* Group Children */}
              {isOpen && (
                <div
                  className={`py-1 space-y-0.5 ${
                    isDarkMode ? 'bg-slate-900/40' : 'bg-[#fafbfc]'
                  }`}
                >
                  {group.children.map((child) => {
                    const isActive = activeTab === child.id;

                    return (
                      <button
                        key={child.id}
                        onClick={() => onSelectTab(child.id)}
                        className={`w-full flex items-center justify-between pl-10 pr-5 py-2 text-xs transition-all cursor-pointer border-l-3 ${
                          isActive
                            ? isDarkMode
                              ? 'bg-indigo-600/15 text-indigo-300 border-indigo-500 font-semibold'
                              : 'bg-[#e8ecf5] text-[#1a237e] border-[#1a237e] font-semibold'
                            : isDarkMode
                            ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                            : 'border-transparent text-slate-600 hover:text-[#1a237e] hover:bg-[#f0f2f7]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm w-5 text-center">{child.icon}</span>
                          <span className="truncate">{child.label}</span>
                        </div>

                        {child.badge !== undefined && child.badge > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              child.badgeColor ||
                              (isDarkMode
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-slate-200 text-slate-700')
                            }`}
                          >
                            {child.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer System Info */}
      <div
        className={`p-3 m-3 rounded-xl text-xs border ${
          isDarkMode
            ? 'bg-slate-900/50 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold mb-1 text-[11px] text-indigo-600 dark:text-indigo-400">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>IZone ISP Admin v2.0</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug">
          Multi-branch realtime inventory & fiscal accounting system.
        </p>
      </div>
    </aside>
  );
};
