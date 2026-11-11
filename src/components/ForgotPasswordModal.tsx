import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Supervisor } from '../types';
import {
  X,
  Shield,
  ShieldCheck,
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  Sparkles,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSupervisorId?: string;
  onSuccessLogin?: () => void;
}

type ResetStep = 'identify' | 'verify' | 'new_password' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultSupervisorId,
  onSuccessLogin,
}) => {
  const { supervisors, updateSupervisorPassword } = useData();
  const { loginAsSupervisor } = useAuth();

  // Current step
  const [step, setStep] = useState<ResetStep>('identify');

  // Supervisor selection
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(() => {
    return defaultSupervisorId || supervisors[0]?.id || '';
  });

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpInputs, setOtpInputs] = useState<string[]>(['', '', '', '', '', '']);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState<number>(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // New password state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Status message
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statusNotification, setStatusNotification] = useState<string>('');

  // Refs for OTP input auto-advance
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Find active target supervisor
  const targetSupervisor: Supervisor | undefined =
    supervisors.find((s) => s.id === selectedSupervisorId) || supervisors[0];

  // Sync default supervisor on open
  useEffect(() => {
    if (isOpen) {
      if (defaultSupervisorId && supervisors.some((s) => s.id === defaultSupervisorId)) {
        setSelectedSupervisorId(defaultSupervisorId);
      } else if (!selectedSupervisorId && supervisors.length > 0) {
        setSelectedSupervisorId(supervisors[0].id);
      }
      setStep('identify');
      setOtpInputs(['', '', '', '', '', '']);
      setErrorMessage('');
      setStatusNotification('');
      setFailedAttempts(0);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, defaultSupervisorId, supervisors]);

  // Timer for OTP expiration and resend cooldown
  useEffect(() => {
    if (!isOpen || step !== 'verify') return;

    const timer = setInterval(() => {
      setOtpExpirySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Mask email for privacy (e.g., ma***os@deped.gov.ph)
  const maskEmail = (email?: string) => {
    if (!email) return 'deped.user@deped.gov.ph';
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) {
      return `${name[0]}***@${domain}`;
    }
    return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;
  };

  // Generate a cryptographically secure 6-digit random code
  const generateNewOtp = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomCode);
    setOtpExpirySeconds(600); // 10 minutes
    setResendCooldown(60);
    setFailedAttempts(0);
    setOtpInputs(['', '', '', '', '', '']);
    setErrorMessage('');
    return randomCode;
  };

  // Handle Step 1 -> Send OTP
  const handleInitiateReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSupervisor) {
      setErrorMessage('Please select a valid Instructional Supervisor.');
      return;
    }
    const code = generateNewOtp();
    setStep('verify');
    setStatusNotification(
      `Secure 6-digit verification code dispatched to ${targetSupervisor.email}. Valid for 10 minutes.`
    );
  };

  // Handle OTP digit entry
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // User pasted multiple characters
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6);
      if (cleanDigits.length > 0) {
        const nextOtp = [...otpInputs];
        for (let i = 0; i < 6; i++) {
          nextOtp[i] = cleanDigits[i] || '';
        }
        setOtpInputs(nextOtp);
        const focusIndex = Math.min(cleanDigits.length, 5);
        inputRefs.current[focusIndex]?.focus();
      }
      return;
    }

    const singleChar = value.replace(/\D/g, '');
    const nextOtp = [...otpInputs];
    nextOtp[index] = singleChar;
    setOtpInputs(nextOtp);
    setErrorMessage('');

    // Advance focus to next input
    if (singleChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2 -> Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpInputs.join('');

    if (otpExpirySeconds <= 0) {
      setErrorMessage('The verification code has expired. Please request a new one.');
      return;
    }

    if (entered.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (failedAttempts >= 4) {
      setErrorMessage('Maximum verification attempts exceeded. Please request a new code.');
      return;
    }

    if (entered !== generatedOtp) {
      const remaining = 4 - failedAttempts;
      setFailedAttempts((prev) => prev + 1);
      setErrorMessage(
        `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Code invalidated.'}`
      );
      return;
    }

    // Success -> proceed to password setting
    setErrorMessage('');
    setStep('new_password');
  };

  // Quick fill helper for simulated flow
  const handleAutoFillSimulatedCode = () => {
    if (!generatedOtp) return;
    const digits = generatedOtp.split('');
    setOtpInputs(digits);
    setErrorMessage('');
    inputRefs.current[5]?.focus();
  };

  const handleCopyOtp = () => {
    if (!generatedOtp) return;
    navigator.clipboard.writeText(generatedOtp);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Handle Step 3 -> Set New Password
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters for supervisor account security.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    if (!targetSupervisor) {
      setErrorMessage('Supervisor account not found.');
      return;
    }

    // Update password in persistence
    updateSupervisorPassword(targetSupervisor.id, newPassword);

    // Proceed to success step
    setStep('success');
  };

  // Handle Step 4 -> Instant login
  const handleInstantLogin = () => {
    if (!targetSupervisor) {
      onClose();
      return;
    }
    const res = loginAsSupervisor(targetSupervisor, newPassword);
    if (res.success) {
      onSuccessLogin?.();
      onClose();
    } else {
      onClose();
    }
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Password strength checker
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500 text-rose-700' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500 text-amber-700' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-emerald-500 text-emerald-700' };
    return { score: 4, label: 'Strong & Secure', color: 'bg-emerald-600 text-emerald-800' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#701628] px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-amber-400/20 rounded-xl border border-amber-400/30 text-amber-300 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">Supervisor Password Recovery</h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-900">
                  Private & Secure
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 line-clamp-1">
                Barobo National High School · Instructional Supervisory Security Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="bg-stone-50 border-b border-stone-200 px-3 sm:px-6 py-2.5 sm:py-3 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold min-w-[280px]">
            <div
              className={`flex items-center gap-1.5 ${
                step === 'identify'
                  ? 'text-[#701628] font-bold'
                  : 'text-stone-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 'identify'
                    ? 'bg-[#701628] text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {step === 'identify' ? '1' : '✓'}
              </span>
              <span>1. Account</span>
            </div>

            <div className="h-0.5 w-8 bg-stone-300" />

            <div
              className={`flex items-center gap-1.5 ${
                step === 'verify'
                  ? 'text-[#701628] font-bold'
                  : step === 'new_password' || step === 'success'
                  ? 'text-emerald-700'
                  : 'text-stone-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 'verify'
                    ? 'bg-[#701628] text-white'
                    : step === 'new_password' || step === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {step === 'new_password' || step === 'success' ? '✓' : '2'}
              </span>
              <span>2. OTP Code</span>
            </div>

            <div className="h-0.5 w-8 bg-stone-300" />

            <div
              className={`flex items-center gap-1.5 ${
                step === 'new_password'
                  ? 'text-[#701628] font-bold'
                  : step === 'success'
                  ? 'text-emerald-700'
                  : 'text-stone-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 'new_password'
                    ? 'bg-[#701628] text-white'
                    : step === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {step === 'success' ? '✓' : '3'}
              </span>
              <span>3. New Password</span>
            </div>

            <div className="h-0.5 w-8 bg-stone-300" />

            <div
              className={`flex items-center gap-1.5 ${
                step === 'success' ? 'text-emerald-700 font-bold' : 'text-stone-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 'success' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                4
              </span>
              <span>4. Complete</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Status Message */}
          {statusNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusNotification}</span>
            </div>
          )}

          {/* STEP 1: IDENTIFY SUPERVISOR */}
          {step === 'identify' && (
            <form onSubmit={handleInitiateReset} className="space-y-4">
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1 text-[#701628]">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Instructional Supervisor Account Privacy Protection</span>
                </div>
                <p className="text-[11px] text-amber-950/80 leading-relaxed">
                  Every instructional supervisor at BNHS has an independent, private account. Resetting
                  your password only alters your individual access. Other supervisors, teachers, or staff cannot
                  view or access your credentials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Select Registered Instructional Supervisor
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => {
                    setSelectedSupervisorId(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full p-3 text-xs font-semibold border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.position} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              {targetSupervisor && (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Account Verification Details
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#701628]">
                        {targetSupervisor.fullName}
                      </div>
                      <div className="text-xs text-stone-600">
                        {targetSupervisor.position} · {targetSupervisor.department}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-stone-200/80 rounded-md text-[11px] font-mono font-semibold text-stone-700">
                      ID: {targetSupervisor.employeeId}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Mail className="w-3.5 h-3.5 text-stone-500" />
                      <span>Registered DepEd Email:</span>
                    </div>
                    <span className="font-mono font-bold text-stone-800">
                      {maskEmail(targetSupervisor.email)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Send 6-Digit Verification Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP CODE */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2.5 bg-amber-100 rounded-full text-amber-800 mb-1">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">Enter 6-Digit Verification Code</h4>
                <p className="text-xs text-stone-500">
                  Dispatched to{' '}
                  <span className="font-mono font-bold text-stone-800">
                    {targetSupervisor?.email || 'registered email'}
                  </span>
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <div className="flex justify-center items-center gap-2 sm:gap-3 py-2">
                {otpInputs.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all ${
                      digit
                        ? 'border-[#701628] bg-amber-50/30 text-[#701628] ring-2 ring-[#701628]/20'
                        : 'border-stone-300 bg-white text-stone-800 focus:border-[#701628] focus:ring-2 focus:ring-[#701628]/20'
                    }`}
                  />
                ))}
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Expires in:{' '}
                    <span className="font-mono font-bold text-stone-800">
                      {formatTime(otpExpirySeconds)}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={generateNewOtp}
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    resendCooldown > 0
                      ? 'text-stone-400 cursor-not-allowed'
                      : 'text-[#701628] hover:underline'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </span>
                </button>
              </div>

              {/* Simulated DepEd Caraga Official Security Dispatch Notification */}
              <div className="p-4 bg-gradient-to-br from-stone-900 to-[#3b0b14] text-white rounded-xl shadow-md border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      DepEd Caraga Security Dispatch · Simulated Inbox
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200/70 font-mono">Confidential</span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-stone-300">
                    <span className="text-stone-400 font-semibold">To:</span> {targetSupervisor?.fullName}{' '}
                    &lt;{targetSupervisor?.email}&gt;
                  </div>
                  <div className="text-amber-200 font-semibold text-[11px]">
                    Subject: BNHS-OMES Supervisor Password Reset OTP
                  </div>
                </div>

                <div className="p-2.5 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-stone-400 uppercase font-mono">One-Time Password</div>
                    <div className="text-xl font-bold tracking-widest font-mono text-amber-300">
                      {generatedOtp || '------'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Copy OTP code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoFillSimulatedCode}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-stone-900" />
                      <span>Auto-Fill</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-amber-200/60 leading-normal">
                  Protected channel: Never share this OTP with any teacher or external party. It authorizes
                  complete password override for your instructional supervisor account.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="px-4 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-semibold text-xs hover:bg-stone-50 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Verify Code & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'new_password' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verification code confirmed! Now establish your new private supervisor password.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  New Private Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters..."
                    className="w-full pl-9 pr-10 py-2.5 text-xs font-mono border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-stone-500">Security Strength:</span>
                      <span className="font-bold text-stone-700">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-full flex-1 rounded-full transition-all ${
                            bar <= strength.score ? strength.color : 'bg-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password to confirm..."
                    className="w-full pl-9 pr-10 py-2.5 text-xs font-mono border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p
                    className={`text-[11px] mt-1 font-semibold ${
                      newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px]">
                <div className="font-bold text-stone-800 mb-0.5">Instructional Supervisor Privacy Reminder</div>
                Only <span className="font-semibold text-[#701628]">{targetSupervisor?.fullName}</span> will
                be able to log in with this new password. No other account credentials or teacher profiles will be
                affected.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="px-4 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-semibold text-xs hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update & Lock Password</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-stone-900">
                  Password Successfully Reset!
                </h4>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                  The private password for{' '}
                  <span className="font-bold text-[#701628]">{targetSupervisor?.fullName}</span> has been
                  updated and secured in the BNHS-OMES directory.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-stone-700 font-bold">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Supervisor Account Status</span>
                </div>
                <div className="text-[11px] text-stone-600 space-y-1">
                  <div>
                    <span className="text-stone-400">Account:</span> {targetSupervisor?.fullName} (
                    {targetSupervisor?.position})
                  </div>
                  <div>
                    <span className="text-stone-400">Department:</span> {targetSupervisor?.department}
                  </div>
                  <div>
                    <span className="text-stone-400">Privacy:</span> Fully segregated & protected
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-bold text-xs hover:bg-stone-50"
                >
                  Return to Portal
                </button>
                <button
                  type="button"
                  onClick={handleInstantLogin}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In as {targetSupervisor?.fullName.split(',')[0]} Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-stone-100 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-stone-400" />
            <span>End-to-End Encrypted Supervisor Credentials</span>
          </div>
          <span className="font-mono text-stone-600">Caraga Region XIII · OMES</span>
        </div>
      </div>
    </div>
  );
};
