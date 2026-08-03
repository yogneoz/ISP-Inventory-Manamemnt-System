import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  Store,
  Bell,
  AlertTriangle,
  DollarSign,
  BookOpen,
  Building,
  Smartphone,
  ShoppingCart,
  FilePlus,
  FileText,
  PlusCircle,
  Receipt,
  Truck,
  Send,
  Inbox,
  History,
  Layers,
  ArrowUpRight,
  HeartOff,
  PackageMinus,
  Wrench,
  Settings,
  Building2,
  Users,
  UserCheck,
  ShieldCheck,
  ClipboardList,
  Download,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  X,
  Search,
  Scale,
  Calculator,
  SlidersHorizontal,
  Grid,
  Ruler,
  UploadCloud,
  DownloadCloud,
  Boxes,
  FolderTree,
} from 'lucide-react';
import { User } from '../types';

export type NavTab =
  | 'dashboard'
  | 'all-stock'
  | 'branch-stock'
  | 'reorder-stock'
  | 'damaged-stock'
  | 'stock-valuation'
  | 'stock-ledger'
  | 'fixed-assets'
  | 'customers'
  | 'product-master'
  | 'category-management'
  | 'uom-management'
  | 'import-stock'
  | 'export-stock'
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
  | 'financial-statements'
  | 'vat-register'
  | 'depreciation-register'
  | 'audit'
  | 'export-reports';

interface SidebarProps {
  currentUser?: User | null;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lowStockCount: number;
  pendingPoCount: number;
  inTransitShipmentCount: number;
  isDarkMode?: boolean;
  onCloseMobile?: () => void;
  onSwitchUser?: (email: string, pass: string) => void;
}

interface NavGroupDef {
  id: string;
  title: string;
  shortLabel: string;
  icon: React.ElementType;
  badgeCount?: number;
  children: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
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
  onSwitchUser,
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isClerk = currentUser?.role === 'INVENTORY_CLERK';
  const isAccountant = currentUser?.role === 'ACCOUNTANT';
  const isBranchUser = Boolean(currentUser?.branchId && currentUser.branchId !== 'ALL' && !isSuperAdmin);

  // Build filtered navigation groups based on role permissions
  const groups: NavGroupDef[] = [];

  // 1. Dashboard Group
  const dashboardChildren = [
    { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard },
    ...(!isBranchUser ? [{ id: 'all-stock' as NavTab, label: 'All Available Stock', icon: Package }] : []),
    {
      id: 'branch-stock' as NavTab,
      label: isBranchUser ? 'My Branch Stock' : 'Stock By Branch',
      icon: Store,
    },
    {
      id: 'reorder-stock' as NavTab,
      label: 'Reorder Stock Matrix',
      icon: Bell,
      badge: lowStockCount,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'damaged-stock' as NavTab,
      label: 'Damaged Stock Matrix',
      icon: AlertTriangle,
    },
    { id: 'stock-valuation' as NavTab, label: 'Stock Valuation', icon: DollarSign },
    { id: 'stock-ledger' as NavTab, label: 'Stock Movement Ledger', icon: BookOpen },
    ...(!isClerk ? [{ id: 'fixed-assets' as NavTab, label: 'Fixed Asset Register', icon: Building }] : []),
    { id: 'customers' as NavTab, label: 'Customer Device Serials', icon: Smartphone },
  ];
  groups.push({
    id: 'dashboard',
    title: 'Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    badgeCount: lowStockCount,
    children: dashboardChildren,
  });

  // 2. Procurement Group
  const procurementChildren = [
    ...(!isClerk
      ? [
          {
            id: 'create-po' as NavTab,
            label: 'Create Purchase Order',
            icon: FilePlus,
            badge: pendingPoCount,
            badgeColor: 'bg-indigo-600 text-white',
          },
        ]
      : []),
    { id: 'po-list' as NavTab, label: 'Purchase Order View', icon: FileText },
    ...(!isClerk ? [{ id: 'create-purchase' as NavTab, label: 'Create Purchase', icon: PlusCircle }] : []),
    { id: 'purchase-list' as NavTab, label: 'Purchase Invoices', icon: Receipt },
  ];
  groups.push({
    id: 'procurement',
    title: 'Procurement',
    shortLabel: 'Purchases',
    icon: ShoppingCart,
    badgeCount: pendingPoCount,
    children: procurementChildren,
  });

  // 3. Logistics Group
  const logisticsChildren = [
    ...(isSuperAdmin ? [{ id: 'create-shipment' as NavTab, label: 'Create Shipment', icon: Send }] : []),
    {
      id: 'receive-shipment' as NavTab,
      label: 'Receive Shipment',
      icon: Inbox,
      badge: inTransitShipmentCount,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'shipment-list' as NavTab, label: 'Shipment History', icon: History },
  ];
  groups.push({
    id: 'logistics',
    title: 'Logistics',
    shortLabel: 'Logistics',
    icon: Truck,
    badgeCount: inTransitShipmentCount,
    children: logisticsChildren,
  });

  // 4. Stock Operations Group
  const stockOpsChildren = [
    { id: 'pullout' as NavTab, label: 'Pullout', icon: ArrowUpRight },
    { id: 'damage' as NavTab, label: 'Damage', icon: HeartOff },
    { id: 'stock-out' as NavTab, label: 'Stock Out', icon: PackageMinus },
    ...(!isClerk && !isAccountant ? [{ id: 'assign-asset' as NavTab, label: 'Assign Fixed Asset', icon: Wrench }] : []),
  ];
  groups.push({
    id: 'stockops',
    title: 'Stock Operations',
    shortLabel: 'Stock Ops',
    icon: Layers,
    children: stockOpsChildren,
  });

  // 5. Inventory Setup Group (Above Admin)
  const inventorySetupChildren = [
    { id: 'product-master' as NavTab, label: 'Product Master Page', icon: Package },
    { id: 'category-management' as NavTab, label: 'Category Management', icon: Grid },
    { id: 'uom-management' as NavTab, label: 'UoM Management', icon: Ruler },
    ...(!isClerk ? [{ id: 'branches' as NavTab, label: 'Branch Management', icon: Building2 }] : []),
    ...(!isClerk ? [{ id: 'suppliers' as NavTab, label: 'Suppliers Management', icon: Users }] : []),
    ...(isSuperAdmin ? [{ id: 'users' as NavTab, label: 'Users Management', icon: UserCheck }] : []),
    { id: 'import-stock' as NavTab, label: 'Import Stock', icon: UploadCloud },
    { id: 'export-stock' as NavTab, label: 'Export All Stock', icon: DownloadCloud },
  ];
  groups.push({
    id: 'inventory-setup',
    title: 'Inventory Setup',
    shortLabel: 'Setup',
    icon: SlidersHorizontal,
    children: inventorySetupChildren,
  });

  // 6. Administration Group
  if (isSuperAdmin) {
    groups.push({
      id: 'admin',
      title: 'Administration',
      shortLabel: 'Admin',
      icon: Settings,
      children: [
        { id: 'financial-statements' as NavTab, label: 'Financial Statements', icon: Scale },
        { id: 'vat-register' as NavTab, label: 'VAT Register', icon: Receipt },
        { id: 'depreciation-register' as NavTab, label: 'Depreciation Register', icon: Calculator },
        { id: 'permissions' as NavTab, label: 'Permission Management', icon: ShieldCheck },
        { id: 'audit' as NavTab, label: 'Activities Log', icon: ClipboardList },
        { id: 'export-reports' as NavTab, label: 'Export Reports', icon: Download },
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

  const [activeGroup, setActiveGroup] = useState<string>(() => getParentGroupId(activeTab));
  const [isSubPanelExpanded, setIsSubPanelExpanded] = useState<boolean>(true);
  const [menuFilter, setMenuFilter] = useState<string>('');

  const sidebarRef = useRef<HTMLElement>(null);

  // Keep activeGroup in sync when activeTab changes
  useEffect(() => {
    const parent = getParentGroupId(activeTab);
    setActiveGroup(parent);
  }, [activeTab]);

  // Hide sub-menu panel if click is detected outside the sidebar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSubPanelExpanded &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSubPanelExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSubPanelExpanded]);

  const handlePrimaryGroupClick = (groupId: string) => {
    if (activeGroup === groupId) {
      // Toggle secondary sub-panel expansion if clicking the same active group
      setIsSubPanelExpanded((prev) => !prev);
    } else {
      setActiveGroup(groupId);
      setIsSubPanelExpanded(true);
    }
  };

  const handleSubItemClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const currentGroupDef = groups.find((g) => g.id === activeGroup) || groups[0];

  const filteredSubItems = currentGroupDef
    ? currentGroupDef.children.filter((child) =>
        child.label.toLowerCase().includes(menuFilter.trim().toLowerCase())
      )
    : [];

  return (
    <aside
      ref={sidebarRef}
      className={`h-full flex flex-row flex-shrink-0 select-none relative ${
        isDarkMode ? 'bg-[#0f1218] text-slate-300' : 'bg-white text-slate-800'
      }`}
    >
      {/* PRIMARY NARROW RAIL (76px wide) */}
      <div
        className={`w-[76px] flex-shrink-0 border-r flex flex-col justify-between items-center py-3.5 z-20 ${
          isDarkMode ? 'border-slate-800/80 bg-[#0f1218]' : 'border-slate-200 bg-slate-50/90'
        }`}
      >
        {/* Primary Main Menu Header Stack */}
        <div className="flex-1 w-full space-y-1 overflow-y-auto custom-scrollbar px-1.5 py-2">
          {groups.map((group) => {
            const isActive = activeGroup === group.id;
            const GroupIcon = group.icon;

            return (
              <button
                key={group.id}
                onClick={() => handlePrimaryGroupClick(group.id)}
                title={group.title}
                className={`w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all cursor-pointer relative group ${
                  isActive
                    ? isDarkMode
                      ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/50 shadow-xs'
                      : 'bg-indigo-100/90 text-indigo-900 font-bold border border-indigo-300/80 shadow-xs'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="relative">
                  <GroupIcon className={`h-5 w-5 ${isActive ? 'scale-110 text-indigo-500' : ''}`} />
                  {group.badgeCount !== undefined && group.badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                      {group.badgeCount > 99 ? '99+' : group.badgeCount}
                    </span>
                  )}
                </div>
                {/* MENU LABEL DIRECTLY BELOW ICON */}
                <span
                  className={`text-[10px] font-semibold leading-tight tracking-tight mt-1.5 text-center truncate w-full px-0.5 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                  }`}
                >
                  {group.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Rail Collapse / Expand Toggle Button */}
        <div className="pt-2 w-full px-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
          <button
            onClick={() => setIsSubPanelExpanded((prev) => !prev)}
            title={isSubPanelExpanded ? 'Collapse Submenu Panel' : 'Expand Submenu Panel'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {isSubPanelExpanded ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4 text-indigo-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* SECONDARY SUBMENU FLYOUT PANEL (OVERLAY - 220px wide) */}
      {isSubPanelExpanded && (
        <div
          className={`absolute left-[76px] top-0 bottom-0 z-30 w-56 border-r shadow-2xl flex flex-col justify-between transition-all duration-200 animate-in fade-in slide-in-from-left-1 ${
            isDarkMode ? 'border-slate-800/90 bg-[#0c0e13]/98' : 'border-slate-200/90 bg-white/98 backdrop-blur-md'
          }`}
        >
          {/* Mobile Header bar with close button */}
          {onCloseMobile && (
            <div className="flex md:hidden items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation</span>
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                title="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Submenu Title & Collapse Header */}
          <div
            className={`px-3.5 py-3 border-b flex items-center justify-between ${
              isDarkMode ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {currentGroupDef && (
                <>
                  <currentGroupDef.icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider truncate text-slate-700 dark:text-slate-200">
                    {currentGroupDef.title}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setIsSubPanelExpanded(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Collapse to small bar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Submenu Search/Filter (renders if group has > 4 sub-items) */}
          {currentGroupDef && currentGroupDef.children.length > 4 && (
            <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/60">
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs ${
                  isDarkMode
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                    : 'bg-slate-100/80 border-slate-200 text-slate-700'
                }`}
              >
                <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Filter menu..."
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value)}
                  className="w-full bg-transparent text-[11px] focus:outline-none placeholder:text-slate-400"
                />
                {menuFilter && (
                  <button onClick={() => setMenuFilter('')} className="text-[10px] text-slate-400 hover:text-slate-200">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sub-menu Nav Items List */}
          <div className="py-2 px-2 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredSubItems.map((child) => {
              const isActive = activeTab === child.id;
              const ItemIcon = child.icon;

              return (
                <button
                  key={child.id}
                  onClick={() => handleSubItemClick(child.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer font-medium ${
                    isActive
                      ? isDarkMode
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-3 border-indigo-500 shadow-xs'
                        : 'bg-indigo-50 text-indigo-900 font-semibold border-l-3 border-indigo-700 shadow-xs'
                      : isDarkMode
                      ? 'border-l-3 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'border-l-3 border-transparent text-slate-600 hover:text-indigo-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="truncate text-left">{child.label}</span>
                  </div>

                  {child.badge !== undefined && child.badge > 0 && (
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
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

          {/* Bottom User Login Info & Switcher Box */}
          <div
            className={`p-2 m-2 rounded-xl border flex flex-col gap-1.5 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {/* User Switcher with explicit Label */}
            {onSwitchUser && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Switch User Login
                </label>
                <select
                  title="Switch User Login"
                  value={currentUser?.email || ''}
                  onChange={(e) => {
                    const passMap: Record<string, string> = {
                      'superadmin@izone.net.np': 'superadmin@123',
                      'subash.dhimal@izone.net.np': 'subash@123',
                      'sandesh.rai@izone.net.np': 'Sandesh@123',
                      'bidhya.khatiwad@izone.net.np': 'Bidhya@123',
                      'sanjiwani.chaudhary@izone.net.np': 'Sanjiwani@123',
                    };
                    const selectedEmail = e.target.value;
                    onSwitchUser(selectedEmail, passMap[selectedEmail] || 'superadmin@123');
                  }}
                  className={`w-full text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-700 text-indigo-300 hover:bg-slate-900'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <option value="superadmin@izone.net.np">👤 Nabin S. (Super Admin)</option>
                  <option value="subash.dhimal@izone.net.np">👤 Subash D. (Stock Controller)</option>
                  <option value="sandesh.rai@izone.net.np">👤 Sandesh R. (Branch Mgr - Chulachuli)</option>
                  <option value="bidhya.khatiwad@izone.net.np">👤 Bidhya K. (Front Desk)</option>
                  <option value="sanjiwani.chaudhary@izone.net.np">👤 Sanjiwani C. (Accountant)</option>
                </select>
              </div>
            )}

            {/* Current Active User Profile details */}
            {currentUser && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate text-slate-800 dark:text-slate-100 leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 truncate leading-tight">
                    {currentUser.role ? currentUser.role.replace(/_/g, ' ') : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
