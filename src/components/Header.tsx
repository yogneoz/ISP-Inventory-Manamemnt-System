import React from 'react';
import { Branch, User } from '../types';
import { convertADToBS } from '../utils/nepaliCalendar';
import {
  Building2,
  Calendar,
  Sparkles,
  LogOut,
  ShieldCheck,
  Search,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  QrCode,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  dateMode: 'BS' | 'AD';
  onToggleDateMode: () => void;
  currentFiscalYear: string;
  onOpenAiModal: () => void;
  onOpenBarcodeModal?: () => void;
  onLogout: () => void;
  onSwitchUser?: (email: string, pass: string) => void;
  onRefreshData: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lowStockCount: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  branches,
  selectedBranchId,
  onSelectBranch,
  dateMode,
  onToggleDateMode,
  currentFiscalYear,
  onOpenAiModal,
  onOpenBarcodeModal,
  onLogout,
  onSwitchUser,
  onRefreshData,
  searchQuery,
  onSearchChange,
  lowStockCount,
  isDarkMode,
  onToggleTheme,
  onToggleSidebar,
  isSidebarOpen = false,
}) => {
  const todayAD = new Date().toISOString().split('T')[0];
  const bsInfo = convertADToBS(todayAD);

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 backdrop-blur-md shadow-md transition-colors duration-200 ${
        isDarkMode
          ? 'border-b border-slate-800 bg-[#0a0c10]/90 text-slate-300'
          : 'bg-gradient-to-r from-[#1a237e] via-[#151c65] to-[#0d47a1] text-white border-b border-indigo-900'
      }`}
    >
      {/* Left: Brand logo & Branch Switcher */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl border border-indigo-400/30 bg-indigo-900/40 hover:bg-indigo-800/60 p-2 text-indigo-100 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-label="Toggle Sidebar Navigation"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-serif font-bold text-xl tracking-tight border border-indigo-400/30">
            iZ
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif font-bold text-white text-base leading-none tracking-tight">
                IZone Inventory
              </h1>
              <span className="rounded-full bg-indigo-950/60 px-2 py-0.5 font-semibold text-indigo-300 text-[10px] uppercase border border-indigo-400/30">
                ISP Admin
              </span>
            </div>
            <p className="text-indigo-200/70 text-xs mt-0.5">
              Multi-Branch Realtime System
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 border-l border-white/20 pl-4 ml-2">
          <Building2 className="h-4 w-4 text-indigo-200" />
          <label htmlFor="branch-select" className="sr-only">
            Select Branch
          </label>
          {currentUser?.branchId && currentUser.branchId !== 'ALL' && currentUser.role !== 'SUPER_ADMIN' ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-950/60 px-3 py-1.5 font-bold text-xs text-amber-200">
              <span>📍 {branches.find((b) => b.id === currentUser.branchId)?.name || 'Chulachuli Branch'}</span>
              <span className="text-[10px] bg-amber-800/80 text-amber-100 px-1.5 py-0.2 rounded font-normal uppercase">Locked</span>
            </div>
          ) : (
            <select
              id="branch-select"
              value={selectedBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className={`rounded-lg px-3 py-1.5 font-medium text-xs focus:outline-none transition-all cursor-pointer ${
                isDarkMode
                  ? 'border border-slate-800 bg-[#0f1218] text-slate-300 focus:border-indigo-500'
                  : 'border border-white/30 bg-white/10 text-white focus:bg-white/20 backdrop-blur-xs'
              }`}
            >
              <option value="ALL" className="bg-slate-900 text-white">
                🏢 All Branches (Consolidated)
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.isHeadquarters ? '⭐ ' : '📍 '}
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Middle: Search input */}
      <div className="hidden lg:flex items-center max-w-md flex-1 mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-200/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Quick search products, SKUs, invoices, assets..."
            className={`w-full rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none transition-all ${
              isDarkMode
                ? 'border border-slate-800 bg-[#0f1218] text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:border-indigo-500'
                : 'border border-white/30 bg-white/10 text-white placeholder-indigo-200/60 focus:bg-white/20'
            }`}
          />
        </div>
      </div>

      {/* Right: Theme Toggle, Date Toggle, Fiscal Year, AI Assistant, User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isDarkMode
              ? 'bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-xs'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-100 fill-indigo-100" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Date Display Pill & Toggle */}
        <button
          onClick={onToggleDateMode}
          title="Click to toggle between Bikram Sambat (BS) and Anno Domini (AD)"
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            isDarkMode
              ? 'border border-slate-800 bg-[#0f1218] hover:bg-slate-800/60 text-slate-300'
              : 'border border-white/30 bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-indigo-200" />
          <span className="font-mono">
            {dateMode === 'BS' ? bsInfo.formattedBS : todayAD}
          </span>
          <span className="ml-1 rounded bg-indigo-950/80 px-1 py-0.2 font-bold text-[10px] text-indigo-300 border border-indigo-400/20 uppercase">
            {dateMode}
          </span>
        </button>

        {/* Fiscal Year Badge */}
        <div className="hidden sm:flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <span className="text-[10px] text-emerald-400 font-normal">FY:</span>
          <span>{currentFiscalYear} BS</span>
        </div>

        {/* Barcode & Serial Scanner Button */}
        {onOpenBarcodeModal && (
          <button
            onClick={onOpenBarcodeModal}
            title="Scan Barcode / Print Asset Tag"
            className="flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-900/40 hover:bg-indigo-800/60 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-all cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-indigo-300" />
            <span className="hidden sm:inline">Barcode / Tag</span>
          </button>
        )}

        {/* AI Inventory Assistant Button */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          <span className="hidden sm:inline">AI Analytics</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshData}
          title="Refresh realtime stock and logs"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDarkMode
              ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60'
              : 'text-white/80 hover:text-white hover:bg-white/20'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* Notifications badge */}
        <div className="relative">
          <button
            title="Notifications & Reorder Alerts"
            className={`p-1.5 rounded-lg transition-colors relative cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60'
                : 'text-white/80 hover:text-white hover:bg-white/20'
            }`}
          >
            <Bell className="h-4 w-4" />
            {lowStockCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* User Info, Switch User & Logout */}
        {currentUser ? (
          <div className="flex items-center gap-2 border-l border-white/20 pl-3">
            <div className="hidden xl:block text-right">
              <div className="font-semibold text-white text-xs">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-indigo-200/70 font-medium">
                {currentUser.role.replace('_', ' ')}
              </div>
            </div>

            {/* Quick Role / User Switcher Select */}
            {onSwitchUser && (
              <select
                title="Switch User to Test Permissions"
                value={currentUser.email}
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
                className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-indigo-300 hover:bg-slate-800'
                    : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                }`}
              >
                <option value="superadmin@izone.net.np" className="bg-slate-900 text-white">👤 Nabin S. (Super Admin)</option>
                <option value="subash.dhimal@izone.net.np" className="bg-slate-900 text-white">👤 Subash D. (Stock Controller)</option>
                <option value="sandesh.rai@izone.net.np" className="bg-slate-900 text-white">👤 Sandesh R. (Branch Mgr - Chulachuli)</option>
                <option value="bidhya.khatiwad@izone.net.np" className="bg-slate-900 text-white">👤 Bidhya K. (Front Desk - Chulachuli)</option>
                <option value="sanjiwani.chaudhary@izone.net.np" className="bg-slate-900 text-white">👤 Sanjiwani C. (Accountant)</option>
              </select>
            )}

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white font-bold text-xs border border-white/30">
              {currentUser.name.charAt(0)}
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-white/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Logged Out</span>
          </div>
        )}
      </div>
    </header>
  );
};

