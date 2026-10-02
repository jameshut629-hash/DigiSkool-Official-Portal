import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  History
} from 'lucide-react';
import { FeeVoucher } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';

export const RemindersView: React.FC = () => {
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vchs, remLogs] = await Promise.all([
        apiRequest<FeeVoucher[]>('/api/vouchers'),
        apiRequest<any[]>('/api/reminders/logs')
      ]);
      // Filter unpaid or overdue safely
      const voucherList = Array.isArray(vchs) ? vchs : [];
      setVouchers(voucherList.filter((v) => v.status === 'unpaid' || v.status === 'overdue' || v.status === 'partial'));
      setLogs(Array.isArray(remLogs) ? remLogs : []);
    } catch (err: any) {
      console.error('Failed to load reminders:', err);
      setVouchers([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendWhatsAppReminder = async (voucher: FeeVoucher) => {
    try {
      await apiRequest('/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({
          voucher_id: voucher.id,
          student_id: voucher.student_id,
          channel: 'whatsapp'
        })
      });

      const phone = (voucher.student_phone || '').replace(/[^0-9]/g, '');
      const cleanPhone = phone.startsWith('0') ? '92' + phone.slice(1) : (phone.startsWith('92') ? phone : '92' + phone);
      const remainingAmount = voucher.total_payable - (voucher.paid_amount || 0);

      const message = `*DIGISKOOL - FEE REMINDER*
Dear ${voucher.student_name},

This is an official fee reminder from *DigiSkool - Institute of Digital Skills*.

*Voucher #:* ${voucher.voucher_no}
*Course:* ${voucher.course_name || 'Enrolled Course'}
*Amount Due:* ${formatPKR(remainingAmount)}
*Due Date:* ${formatDate(voucher.due_date)}

*Official Deposit Bank Accounts:*
1. *Bank Al Habib*
   • Title: DIGISKOOL
   • A/C: 57270081000203018
   • IBAN: PK05BAHL5727008100020301

2. *Bank Islami*
   • Title: DIGISKOOL
   • A/C: 211100277400001
   • IBAN: PK50BKIP0211100277400001

*Note:* Please share your deposit slip / transaction screenshot on this WhatsApp number after payment for immediate receipt issuance.

DigiSkool Accounts Desk
Lahore & Okara Campuses
Phone: 0331-7155174`;

      const text = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');

      setActionSuccess(`WhatsApp reminder opened & logged for ${voucher.student_name}`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err: any) {
      alert('Failed to send WhatsApp reminder: ' + err.message);
    }
  };

  const handleBroadcastWhatsAppAll = async () => {
    if (!window.confirm(`Broadcast WhatsApp fee reminders to all ${vouchers.length} students with pending vouchers?`)) {
      return;
    }
    setBroadcasting(true);
    try {
      await apiRequest('/api/reminders/broadcast', {
        method: 'POST',
        body: JSON.stringify({ voucher_ids: vouchers.map((v) => v.id) })
      });
      setActionSuccess(`Broadcast completed! ${vouchers.length} WhatsApp reminders recorded.`);
      setTimeout(() => setActionSuccess(null), 5000);
      loadData();
    } catch (err: any) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 font-display">WhatsApp Fee Reminders</h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">WhatsApp Only</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Send instant WhatsApp reminders with Bank Al Habib and Bank Islami account details to students
          </p>
        </div>
        {vouchers.length > 0 && (
          <button
            onClick={handleBroadcastWhatsAppAll}
            disabled={broadcasting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{broadcasting ? 'Broadcasting...' : `Broadcast Reminders (${vouchers.length})`}</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overdue List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display">Pending & Overdue Fee Vouchers</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">{vouchers.length} Vouchers Pending</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Voucher #</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">WhatsApp Number</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Outstanding Due</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Send via WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading vouchers...</td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-emerald-600 font-medium">
                    All fee vouchers are fully settled! No pending dues.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const rem = Math.max(0, v.total_payable - (v.paid_amount || 0));
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{v.voucher_no}</td>
                      <td className="p-3.5 font-bold text-slate-900">{v.student_name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{v.student_phone || '—'}</td>
                      <td className="p-3.5 font-medium">
                        <span className={v.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-600'}>
                          {formatDate(v.due_date)}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-rose-600 font-display">{formatPKR(rem)}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleSendWhatsAppReminder(v)}
                          title="Send WhatsApp Reminder Message"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Reminder</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminder History Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 font-display">Recent Reminder Logs & Deliveries</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Sent At</th>
                <th className="p-3">Student</th>
                <th className="p-3">Voucher #</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Delivery Status</th>
                <th className="p-3">Message Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(logs) || logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No reminder logs recorded yet.</td>
                </tr>
              ) : (
                logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{formatDate(log.sent_at)}</td>
                    <td className="p-3 font-semibold text-slate-900">{log.student_name || 'Student'}</td>
                    <td className="p-3 font-mono text-slate-600">{log.voucher_no}</td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-600">{log.channel}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 truncate max-w-[250px]">{log.message}</td>
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
