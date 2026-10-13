import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';

export const AccountsView: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAccount, setFilterAccount] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, led] = await Promise.all([
        apiRequest<any>('/api/accounts/summary'),
        apiRequest<any[]>('/api/accounts/ledger')
      ]);
      setSummary(sum || null);
      setLedger(Array.isArray(led) ? led : []);
    } catch (err: any) {
      console.error('Failed to load accounts ledger:', err);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLedger = (Array.isArray(ledger) ? ledger : []).filter((entry) => {
    if (!filterAccount) return true;
    return entry.payment_method === filterAccount;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Accounts & Cashbook Ledger</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time reconciliation of physical Cash Desk, Bank Al Habib, and Bank Islami Accounts
        </p>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bank Al Habib */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Bank Al Habib</span>
            <span className="p-2 bg-rose-50 text-[#6E1231] rounded-xl">
              <Building2 className="w-4 h-4 text-[#6E1231]" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-display">
            {formatPKR(summary?.balances?.bankAlHabib || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-mono">A/C: 57270081000203018</span>
          </div>
        </div>

        {/* Bank Islami */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Bank Islami</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-display">
            {formatPKR(summary?.balances?.bankIslami || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-mono">A/C: 211100277400001</span>
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Cash in Hand (Desk)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-display">
            {formatPKR(summary?.balances?.cashDesk || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>DigiSkool Campus Windows</span>
          </div>
        </div>

        {/* Net Combined Balance */}
        <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Net Funds</span>
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-display">
            {formatPKR(summary?.totalBalance || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Inflows: {formatPKR(summary?.totalInflows || 0)}</span>
            <span>Outflows: {formatPKR(summary?.totalOutflows || 0)}</span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Chronological Financial Transaction Ledger
            </h3>
            <p className="text-[11px] text-slate-500">Merged fee receipts (credit) and operational disbursements (debit)</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">All Accounts</option>
              <option value="Cash">Cash Desk</option>
              <option value="Bank Al Habib">Bank Al Habib</option>
              <option value="Bank Islami">Bank Islami</option>
              <option value="Bank Transfer">Bank Accounts (Al Habib / Bank Islami)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Reference #</th>
                <th className="p-3.5">Account / Method</th>
                <th className="p-3.5">Particulars / Party</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5 text-right">Debit (Disbursement)</th>
                <th className="p-3.5 text-right">Credit (Receipt)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Reconciling ledger accounts...</td>
                </tr>
              ) : filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No transactions recorded.</td>
                </tr>
              ) : (
                filteredLedger.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 text-slate-600 font-medium">{formatDate(row.date)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{row.ref_no}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                        {row.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{row.party}</div>
                      <div className="text-[10px] text-slate-500">{row.description}</div>
                    </td>
                    <td className="p-3.5">
                      {row.type === 'INFLOW' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-full">
                          <ArrowDownLeft className="w-3 h-3" /> Fee Inflow
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 px-2 py-0.5 bg-red-50 rounded-full">
                          <ArrowUpRight className="w-3 h-3" /> Expense
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold text-red-600 font-display">
                      {row.type === 'OUTFLOW' ? formatPKR(row.amount) : '—'}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-600 font-display">
                      {row.type === 'INFLOW' ? formatPKR(row.amount) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
