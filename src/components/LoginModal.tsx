import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (email: string, pass: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('superadmin@izone.net.np');
  const [password, setPassword] = useState('superadmin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { name: 'Nabin Shrestha', role: 'Super Admin', email: 'superadmin@izone.net.np', pass: 'superadmin@123', branch: 'All Branches' },
    { name: 'Subash Dhimal', role: 'Inventory Manager', email: 'subash.dhimal@izone.net.np', pass: 'subash@123', branch: 'All Branches' },
    { name: 'Sandesh Rai', role: 'Branch Manager', email: 'sandesh.rai@izone.net.np', pass: 'Sandesh@123', branch: 'Chulachuli' },
    { name: 'Bidhya Khatiwada', role: 'Front Desk', email: 'bidhya.khatiwad@izone.net.np', pass: 'Bidhya@123', branch: 'Chulachuli' },
    { name: 'Sanjiwani Chaudhary', role: 'Accountant', email: 'sanjiwani.chaudhary@izone.net.np', pass: 'Sanjiwani@123', branch: 'All Branches' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLoginSuccess(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-6 text-white text-center relative">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-extrabold text-2xl shadow-inner">
            iZ
          </div>
          <h2 className="text-xl font-bold tracking-tight">IZone Inventory System</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Enterprise Multi-Branch Stock & Financial Architecture
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@izone.net.np"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-100"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to IZone</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Seeded System User Accounts for Testing Permissions */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-indigo-600" />
                <span>Select User Account to Test Role & Permissions:</span>
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillQuickCredentials(acc.email, acc.pass)}
                  className={`w-full flex items-center justify-between rounded-lg p-2 text-left border transition-all cursor-pointer ${
                    email === acc.email
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{acc.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {acc.email} • {acc.branch}
                    </div>
                  </div>
                  {email === acc.email && <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
