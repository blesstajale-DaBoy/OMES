import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, Lock, KeyRound, Check } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenForgotPassword?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onOpenForgotPassword,
}) => {
  const { currentUser, isSupervisor, isAdmin } = useAuth();
  const { supervisors, updateSupervisorPassword } = useData();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentSupervisor = isSupervisor
    ? supervisors.find((s) => s.id === currentUser.supervisorId || s.id === currentUser.id)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (isSupervisor && currentSupervisor) {
      const actualCurrentPass = currentSupervisor.password || 'omes123';
      if (currentPassword !== actualCurrentPass) {
        setErrorMsg('Current password is incorrect.');
        return;
      }

      updateSupervisorPassword(currentSupervisor.id, newPassword);
      setSuccessMsg('Your password has been changed successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } else if (isAdmin) {
      const actualAdminPass = localStorage.getItem('bnhs_omes_admin_pass') || 'omes123';
      if (currentPassword !== actualAdminPass) {
        setErrorMsg('Current password is incorrect.');
        return;
      }
      localStorage.setItem('bnhs_omes_admin_pass', newPassword);
      setSuccessMsg('Administrator password updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-[#701628] px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-base font-bold">Change Account Password</h3>
              <p className="text-xs text-amber-200/80">{currentUser.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-700 mb-1">Current Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new private password..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
              />
            </div>
          </div>

          {onOpenForgotPassword && (
            <div className="pt-1 text-center sm:text-left">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenForgotPassword();
                }}
                className="text-[11px] text-[#701628] hover:text-[#580e1c] font-bold hover:underline"
              >
                Forgot your current password? Reset via Supervisor Verification Code (OTP) →
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
