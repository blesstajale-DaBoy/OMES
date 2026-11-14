import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import {
  X,
  Lock,
  ShieldCheck,
  UserCheck,
  Check,
  Users,
  BookOpenCheck,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenForgotPassword?: (role?: 'supervisor' | 'mentor', accountId?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onOpenForgotPassword }) => {
  const { loginAsAdmin, loginAsSupervisor, loginAsMentor, loginAsTeacher } = useAuth();
  const { supervisors, mentors, teachers } = useData();

  const [loginRole, setLoginRole] = useState<UserRole>('admin');

  // Account selections
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(supervisors[0]?.id || '');
  const [selectedMentorId, setSelectedMentorId] = useState(mentors[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');

  // Password state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginRole === 'admin') {
      const res = loginAsAdmin(password);
      if (res.success) {
        setSuccessMsg('Successfully logged in as Administrator');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.message || 'Invalid Administrator password. Default: omes123');
      }
    } else if (loginRole === 'supervisor') {
      const targetSupervisor = supervisors.find((s) => s.id === selectedSupervisorId) || supervisors[0];
      if (!targetSupervisor) {
        setErrorMsg('Please select an Instructional Supervisor.');
        return;
      }
      const res = loginAsSupervisor(targetSupervisor, password);
      if (res.success) {
        setSuccessMsg(`Welcome, ${targetSupervisor.fullName}`);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.message || 'Incorrect password for this supervisor.');
      }
    } else if (loginRole === 'mentor') {
      const targetMentor = mentors.find((m) => m.id === selectedMentorId) || mentors[0];
      if (!targetMentor) {
        setErrorMsg('Please select a Mentor.');
        return;
      }
      const res = loginAsMentor(targetMentor, password);
      if (res.success) {
        setSuccessMsg(`Welcome, Mentor ${targetMentor.fullName}`);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.message || 'Incorrect password for this mentor.');
      }
    } else if (loginRole === 'teacher') {
      const targetTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
      if (!targetTeacher) {
        setErrorMsg('Please select a teacher.');
        return;
      }
      const res = loginAsTeacher(targetTeacher, password);
      if (res.success) {
        setSuccessMsg(`Welcome, ${targetTeacher.fullName}`);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.message || 'Invalid password.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#701628] px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="./assets/aistudio/BNHS_LOGO_29bb7e4c.jpg"
              alt="BNHS Logo"
              className="w-9 h-9 rounded-full object-cover bg-white p-0.5 border border-amber-300 shrink-0 shadow-xs"
            />
            <div>
              <h3 className="text-base font-bold tracking-tight">OMES Switch Account</h3>
              <p className="text-xs text-amber-200/80">Barobo National High School · Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Role Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-stone-100 p-1.5 border-b border-stone-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setLoginRole('admin');
              setErrorMsg('');
              setPassword('');
            }}
            className={`py-2 px-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              loginRole === 'admin'
                ? 'bg-white text-[#701628] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginRole('supervisor');
              setErrorMsg('');
              setPassword('');
            }}
            className={`py-2 px-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              loginRole === 'supervisor'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginRole('mentor');
              setErrorMsg('');
              setPassword('');
            }}
            className={`py-2 px-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              loginRole === 'mentor'
                ? 'bg-white text-indigo-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Mentor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginRole('teacher');
              setErrorMsg('');
              setPassword('');
            }}
            className={`py-2 px-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              loginRole === 'teacher'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Teacher</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          {/* Role-Specific Account Field */}
          {loginRole === 'admin' && (
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <label className="block text-[11px] font-bold text-stone-500 uppercase">Account</label>
              <div className="text-sm font-bold text-[#701628] mt-0.5">Administrator</div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Full system administration and personnel management access.
              </p>
            </div>
          )}

          {loginRole === 'supervisor' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Select Registered Instructional Supervisor
              </label>
              <select
                value={selectedSupervisorId}
                onChange={(e) => {
                  setSelectedSupervisorId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full p-2.5 text-xs font-semibold border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
              >
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.position} - {s.department})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Each registered supervisor sees only their assigned teachers and evaluations.
              </p>
            </div>
          )}

          {loginRole === 'mentor' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Select Registered Mentor
              </label>
              <select
                value={selectedMentorId}
                onChange={(e) => {
                  setSelectedMentorId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full p-2.5 text-xs font-semibold border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.position} - {m.subjectArea || m.department})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Mentors manage Lesson Plans, Assessments, IMs & LMs for assigned teachers.
              </p>
            </div>
          )}

          {loginRole === 'teacher' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Select Teaching Faculty Member
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full p-2.5 text-xs font-semibold border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.department} · {t.subject})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Teachers access only their personal records and personal PMCF/FAR reports.
              </p>
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700">Account Password</label>
              <span className="text-[10px] text-stone-400 font-mono">Default: omes123</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: omes123)..."
                className="w-full pl-9 pr-10 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {(loginRole === 'supervisor' || loginRole === 'mentor') && onOpenForgotPassword && (
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-[11px] text-stone-500">Need help accessing your account?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgotPassword(
                      loginRole === 'mentor' ? 'mentor' : 'supervisor',
                      loginRole === 'mentor' ? selectedMentorId : selectedSupervisorId
                    );
                  }}
                  className="text-[11px] text-[#701628] hover:text-[#580e1c] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3 text-amber-700" />
                  <span>Forgot Password?</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#701628] hover:bg-[#580e1c] text-white text-sm font-bold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
            >
              Sign In as{' '}
              {loginRole === 'admin'
                ? 'Administrator'
                : loginRole === 'supervisor'
                ? 'Supervisor'
                : loginRole === 'mentor'
                ? 'Mentor'
                : 'Teacher'}
            </button>
          </div>
        </form>

        <div className="bg-stone-50 px-6 py-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>Barobo National High School</span>
          <span className="font-mono text-stone-600 font-semibold">School ID: 304861</span>
        </div>
      </div>
    </div>
  );
};
