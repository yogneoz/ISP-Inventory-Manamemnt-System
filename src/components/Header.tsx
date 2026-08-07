import React from 'react';
import { Branch, User } from '../types';
import { convertADToBS } from '../utils/nepaliCalendar';
import { canUserSeeAllBranches, getAllowedBranches } from '../utils/permissions';
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
  onOpenSearchModal?: () => void;
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
  onOpenSearchModal,
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
      className={`sticky top-0 z-30 flex h-13 w-full items-center justify-between px-3 backdrop-blur-md shadow-sm transition-colors duration-200 ${
        isDarkMode
          ? 'border-b border-slate-800 bg-[#0a0c10]/95 text-slate-300'
          : 'bg-gradient-to-r from-[#1a237e] via-[#151c65] to-[#0d47a1] text-white border-b border-indigo-900'
      }`}
    >
      {/* Left: Brand logo & Branch Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-serif font-bold text-base tracking-tight border border-indigo-400/30">
            iZ
          </div>
          <h1 className="font-serif font-bold text-white text-sm leading-none tracking-tight hidden sm:block">
            IZone Inventory
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-1.5 border-l border-white/20 pl-3 ml-1">
          <Building2 className="h-3.5 w-3.5 text-indigo-200" />
          <label htmlFor="branch-select" className="sr-only">
            Select Branch
          </label>
          {(() => {
            const canSeeAll = canUserSeeAllBranches(currentUser);
            const allowed = getAllowedBranches(currentUser, branches);

            if (!canSeeAll && allowed.length === 1) {
              return (
                <div className="flex items-center gap-1 rounded-md border border-amber-300/40 bg-amber-950/60 px-2 py-1 font-bold text-[11px] text-amber-200">
                  <span>📍 {allowed[0]?.name || 'Assigned Branch'}</span>
                  <span className="text-[9px] bg-amber-800/80 text-amber-100 px-1 py-0.2 rounded font-normal uppercase">
                    Assigned
                  </span>
                </div>
              );
            }

            return (
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={(e) => onSelectBranch(e.target.value)}
                className={`rounded-md px-2.5 py-1 font-medium text-[11px] focus:outline-none transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border border-slate-800 bg-[#0f1218] text-slate-300 focus:border-indigo-500'
                    : 'border border-white/30 bg-white/10 text-white focus:bg-white/20 backdrop-blur-xs'
                }`}
              >
                {canSeeAll ? (
                  <option value="ALL" className="bg-slate-900 text-white">
                    🏢 All Branches (Consolidated)
                  </option>
                ) : (
                  <option value="ALL" className="bg-slate-900 text-white">
                    🏢 My Assigned Branches ({allowed.length})
                  </option>
                )}
                {allowed.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.isHeadquarters ? '⭐ ' : '📍 '}
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            );
          })()}
        </div>
      </div>

      {/* Middle: Search input (Desktop) */}
      <div className="hidden lg:flex items-center max-w-sm flex-1 mx-4">
        <div
          className="relative w-full cursor-pointer"
          onClick={() => {
            if (onOpenSearchModal) onOpenSearchModal();
          }}
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-200/70" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => {
              if (onOpenSearchModal) onOpenSearchModal();
            }}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (onOpenSearchModal) onOpenSearchModal();
            }}
            placeholder="Scan Barcode or Search Product Name / SKU:"
            className={`w-full rounded-full pl-8 pr-10 py-1 text-[11px] focus:outline-none transition-all cursor-pointer ${
              isDarkMode
                ? 'border border-slate-800 bg-[#0f1218] text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:border-indigo-500'
                : 'border border-white/30 bg-white/10 text-white placeholder-indigo-200/60 focus:bg-white/20'
            }`}
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:inline-block px-1 py-0.2 text-[9px] font-mono text-indigo-200 bg-white/10 rounded border border-white/20 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Theme Toggle, Date Toggle, Fiscal Year, AI Assistant, Logout */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Icon Button */}
        {onOpenSearchModal && (
          <button
            onClick={onOpenSearchModal}
            title="Global Quick Search (Ctrl+K)"
            className={`lg:hidden p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-slate-300 hover:bg-slate-800 text-indigo-300'
                : 'text-white/90 hover:bg-white/20'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer shadow-xs ${
            isDarkMode
              ? 'bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-xs'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-3 w-3 text-indigo-100 fill-indigo-100" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Date Display Pill & Toggle */}
        <button
          onClick={onToggleDateMode}
          title="Click to toggle between Bikram Sambat (BS) and Anno Domini (AD)"
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            isDarkMode
              ? 'border border-slate-800 bg-[#0f1218] hover:bg-slate-800/60 text-slate-300'
              : 'border border-white/30 bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-indigo-200" />
          <span className="font-mono">
            {dateMode === 'BS' ? (bsInfo.formattedBSShort ? bsInfo.formattedBSShort.replace(' BS', '') : `${bsInfo.yearBS}-${String(bsInfo.monthBS).padStart(2, '0')}-${String(bsInfo.dayBS).padStart(2, '0')}`) : todayAD}
          </span>
          <span className="ml-0.5 rounded bg-indigo-950/80 px-1 py-0.2 font-bold text-[9px] text-indigo-300 border border-indigo-400/20 uppercase">
            {dateMode}
          </span>
        </button>

        {/* Fiscal Year Badge */}
        <div className="hidden sm:flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-950/40 px-2 py-1 text-[11px] font-semibold text-emerald-300">
          <span className="text-[9px] text-emerald-400 font-normal">FY:</span>
          <span>{currentFiscalYear} BS</span>
        </div>

        {/* Barcode & Serial Scanner Button */}
        {onOpenBarcodeModal && (
          <button
            onClick={onOpenBarcodeModal}
            title="Scan Barcode / Print Asset Tag"
            className="flex items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-900/40 hover:bg-indigo-800/60 px-2.5 py-1 text-[11px] font-medium text-indigo-200 transition-all cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-indigo-300" />
            <span className="hidden sm:inline">Tag</span>
          </button>
        )}

        {/* AI Inventory Assistant Button */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs hover:brightness-110 transition-all cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshData}
          title="Refresh realtime stock and logs"
          className={`p-1 rounded-lg transition-colors cursor-pointer ${
            isDarkMode
              ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60'
              : 'text-white/80 hover:text-white hover:bg-white/20'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Notifications badge */}
        <div className="relative">
          <button
            title="Notifications & Reorder Alerts"
            className={`p-1 rounded-lg transition-colors relative cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60'
                : 'text-white/80 hover:text-white hover:bg-white/20'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* Logout */}
        {currentUser ? (
          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 text-white/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/30 px-2 py-0.5 rounded-md">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Out</span>
          </div>
        )}
      </div>
    </header>
  );
};

