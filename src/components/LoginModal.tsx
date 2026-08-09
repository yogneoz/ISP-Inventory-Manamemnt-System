import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (email: string, pass: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('superadmin@izone.net.np');
  const [password, setPassword] = useState('superadmin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLoginSuccess(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all">
        {/* Modern Enterprise Header */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-7 text-white relative overflow-hidden text-center">
          {/* Subtle Ambient Background Lighting Glow */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-serif font-extrabold text-2xl shadow-xl">
              iZ
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white font-serif">
              IZone Enterprise System
            </h2>
            <p className="text-xs text-indigo-200/90 mt-1 max-w-xs font-medium">
              Multi-Branch Inventory & Financial Control Portal
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-semibold text-indigo-200 border border-indigo-400/30">
              <Building2 className="h-3 w-3 text-indigo-300" />
              <span>Enterprise Single Sign-On</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3.5 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address / User ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@izone.net.np"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Please contact your System Administrator to reset your password.')}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Keep me logged in
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-3 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Security Assurance Badge */}
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>256-Bit Encrypted Multi-Branch Session</span>
          </div>
        </form>
      </div>
    </div>
  );
};
