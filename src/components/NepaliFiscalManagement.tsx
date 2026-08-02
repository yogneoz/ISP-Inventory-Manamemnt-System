import React, { useState } from 'react';
import { FiscalYear } from '../types';
import { convertADToBS, getNepaliFiscalYear } from '../utils/nepaliCalendar';
import {
  CalendarDays,
  CheckCircle2,
  Lock,
  Calendar as CalendarIcon,
  Sparkles,
  Zap,
} from 'lucide-react';

interface NepaliFiscalManagementProps {
  fiscalYears: FiscalYear[];
  onSetCurrentFiscalYear: (id: string) => Promise<void>;
  dateMode: 'BS' | 'AD';
}

export const NepaliFiscalManagement: React.FC<NepaliFiscalManagementProps> = ({
  fiscalYears,
  onSetCurrentFiscalYear,
  dateMode,
}) => {
  const [testDateAD, setTestDateAD] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const convertedBS = convertADToBS(testDateAD);
  const calculatedFy = getNepaliFiscalYear(testDateAD);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-400" />
          <span>Nepali Bikram Sambat Calendar & Fiscal Year Management</span>
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Configure active Nepali fiscal period locks (Shrawan 1 to Ashadh end) and run date conversions.
        </p>
      </div>

      {/* Fiscal Year Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fiscalYears.map((fy) => (
          <div
            key={fy.id}
            className={`rounded-2xl p-5 border transition-all ${
              fy.isCurrent
                ? 'bg-gradient-to-br from-indigo-950 via-[#0f1218] to-slate-900 text-white border-indigo-500/50 shadow-xl shadow-indigo-950/20'
                : 'bg-[#0f1218] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  fy.isCurrent
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                FY {fy.code} BS
              </span>

              {fy.isCurrent ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active Period
                </span>
              ) : (
                <button
                  onClick={() => onSetCurrentFiscalYear(fy.id)}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  Set Active
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">
                  BS Period:
                </span>
                <span className="font-mono font-semibold text-white">
                  {fy.startDateBS} to {fy.endDateBS}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">
                  AD Period:
                </span>
                <span className="font-mono font-medium text-slate-300">
                  {fy.startDateAD} to {fy.endDateAD}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Period Status:
                </span>
                <span className="font-bold flex items-center gap-1">
                  {fy.isClosed ? (
                    <>
                      <Lock className="h-3 w-3 text-amber-400" /> Closed & Audited
                    </>
                  ) : (
                    <span className="text-emerald-400">Open for Posting</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Built-in Nepali Date Conversion Tester Widget */}
      <div className="rounded-2xl bg-[#0f1218] border border-slate-800 p-6 shadow-xl space-y-4 text-slate-300">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-400" />
          <span>Interactive Nepali Bikram Sambat (BS) Date Converter</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Select Anno Domini (AD) Gregorian Date
            </label>
            <input
              type="date"
              value={testDateAD}
              onChange={(e) => setTestDateAD(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-slate-200 font-medium"
            />
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400 font-medium">Converted Nepali Bikram Sambat Date:</div>
            <div className="text-lg font-mono font-extrabold text-indigo-400">
              {convertedBS.formattedBS}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>Short BS Format: <span className="font-mono font-bold text-white">{convertedBS.formattedBSShort}</span></span>
              <span>Fiscal Year: <span className="font-bold font-mono text-emerald-400">FY {calculatedFy} BS</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
