import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Lock, Trash2, Loader2, Phone, Mail, ShieldX, UserCheck } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { recordDeletionAttempt } from '../../lib/firebase.ts';

interface DeleteProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: 'students' | 'courses' | 'batches' | 'users' | 'expenses' | 'vouchers' | 'payments';
  recordId: string | number;
  recordName: string;
  onSuccess: () => void;
}

export const DeleteProtectionModal: React.FC<DeleteProtectionModalProps> = ({
  isOpen,
  onClose,
  module,
  recordId,
  recordName,
  onSuccess
}) => {
  const { user, isOwner } = useAuth();
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifiedOwner, setNotifiedOwner] = useState(false);

  // Automatically record deletion attempt in Firestore and alert Owner when non-owner attempts to delete
  useEffect(() => {
    if (isOpen && !isOwner && recordId) {
      recordDeletionAttempt({
        userId: user?.id || 'unknown',
        userName: user?.name || user?.email || 'Authorized User',
        userEmail: user?.email || 'staff@digiskool.pk',
        userRole: user?.role || 'staff',
        recordType: module,
        recordId,
        recordTitle: recordName,
        reason: 'Attempted record deletion from interface'
      }).then(() => {
        setNotifiedOwner(true);
      }).catch(() => {});
    }
  }, [isOpen, isOwner, module, recordId, recordName, user]);

  // If user is not Owner, show strict contact owner deletion message
  if (!isOwner) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Institutional Data Deletion Restricted"
        subtitle="Security & Owner Policy"
        maxWidth="md"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 border border-rose-200 text-[#6E1231] flex items-center justify-center shadow-inner">
            <ShieldX className="w-8 h-8 text-[#6E1231]" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
              Action Prohibited
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Please contact to the owner for data deletion
            </h3>
            <p className="text-xs text-rose-700 font-semibold mt-1">
              Data delete karnay kai liye please contact to the owner
            </p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              To prevent irreversible data loss and safeguard student transcripts, admissions, and financial ledgers, staff accounts cannot delete records. This attempt has been logged for Owner review.
            </p>
          </div>

          {notifiedOwner && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-medium flex items-center justify-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pending Deletion Alert has been notified to the Owner dashboard.</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
            <div className="font-semibold text-slate-700">Target Record Requested:</div>
            <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
              Module: <span className="font-bold text-[#6E1231] uppercase">{module}</span> | Record: <span className="font-bold text-slate-900">{recordName}</span> (ID: #{recordId})
            </div>
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5 text-slate-600">
              <div className="font-bold text-slate-900">DigiSkool Owner / Main Admin Contact:</div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#6E1231]" />
                <span className="font-mono font-medium text-slate-800">adnanmrao@gmail.com / jameshut629@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Phone className="w-3.5 h-3.5 text-[#6E1231]" />
                <span className="font-mono font-medium text-slate-800">Lahore: +92 331-715-5174 | Okara: +92 310-436-7347</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#6E1231] hover:bg-[#580E27] text-white text-xs font-bold transition-all shadow-md shadow-[#6E1231]/20 cursor-pointer"
            >
              Close & Return to Dashboard
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const expectedPhrase = `PERMANENT DELETE ${module.toUpperCase()} ${recordId}`;
  const isPhraseMatch = phrase.trim().toUpperCase() === expectedPhrase;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhraseMatch) {
      setError(`Confirmation phrase does not match. You must type exactly: "${expectedPhrase}"`);
      return;
    }
    if (!reason.trim()) {
      setError('A mandatory reason is required for security audit logging.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/api/admin/permanent-delete', {
        method: 'POST',
        body: JSON.stringify({
          module,
          recordId,
          confirmationPhrase: phrase,
          reason,
          password
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Permanent deletion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Owner Security Protection – Permanent Deletion"
      subtitle="Strict Data Governance & Audit Protection System"
      maxWidth="lg"
    >
      <form onSubmit={handleDelete} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-red-800 text-sm">CRITICAL WARNING: DATA LOSS IRREVERSIBLE</p>
            <p>
              You are attempting to permanently destroy record: <span className="font-semibold">{recordName} (ID: {recordId})</span>.
            </p>
            <p className="text-red-700">
              DigiSkool strongly recommends using <strong>Archive</strong> or <strong>Cancel</strong> instead to maintain historical ledgers, certificates, and compliance.
            </p>
            <p className="text-amber-800 font-semibold bg-amber-50 p-2 rounded border border-amber-200 mt-2">
              Note: Staff accounts are blocked with: <em>"Please contact to admin for deletion of data."</em> Only Main Admin can execute this action.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Confirmation Phrase */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Step 1: Type the exact confirmation phrase below:
          </label>
          <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 font-bold select-all mb-2">
            {expectedPhrase}
          </div>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={expectedPhrase}
            className="w-full px-3 py-2 text-xs border rounded-lg font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 border-slate-300"
            required
          />
        </div>

        {/* Step 2: Mandatory Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Step 2: Mandatory Reason (Logged to Immutable Audit Trail):
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="E.g., Test mock student created mistakenly during initial setup"
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 border-slate-300"
            required
          />
        </div>

        {/* Step 3: Owner Password Verification */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Step 3: Confirm Owner Account Password:
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 border-slate-300"
              required
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Default owner password is: <span className="font-mono font-medium text-slate-600">Owner@123</span>
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isPhraseMatch || !reason.trim() || !password || loading}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              isPhraseMatch && reason.trim() && password && !loading
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Confirm Permanent Deletion
          </button>
        </div>
      </form>
    </Modal>
  );
};
