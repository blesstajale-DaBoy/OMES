import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import {
  Lock,
  ShieldCheck,
  UserCheck,
  Users,
  BookOpenCheck,
  Eye,
  EyeOff,
  Key,
  Check,
  ArrowRight,
  AlertCircle,
  Lightbulb,
  Power,
  MoveDown,
} from 'lucide-react';

interface LoginPortalViewProps {
  onOpenForgotPassword: (role?: 'supervisor' | 'mentor', accountId?: string) => void;
}

export const LoginPortalView: React.FC<LoginPortalViewProps> = ({ onOpenForgotPassword }) => {
  const { loginAsAdmin, loginAsSupervisor, loginAsMentor, loginAsTeacher } = useAuth();
  const { schoolProfile, supervisors, mentors, teachers, cloudSyncStatus } = useData();

  // Lamp-shade lighting & pull-sling physics state
  const [isLightOn, setIsLightOn] = useState<boolean>(false);
  const [pullOffset, setPullOffset] = useState<number>(0);
  const [isDraggingCord, setIsDraggingCord] = useState<boolean>(false);
  const [cordSnapAnim, setCordSnapAnim] = useState<boolean>(false);
  const dragStartYRef = useRef<number | null>(null);
  const maxPullReachedRef = useRef<number>(0);

  // Login form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(supervisors[0]?.id || '');
  const [selectedMentorId, setSelectedMentorId] = useState<string>(mentors[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');

  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (!selectedSupervisorId && supervisors.length > 0) {
      setSelectedSupervisorId(supervisors[0].id);
    }
  }, [supervisors, selectedSupervisorId]);

  useEffect(() => {
    if (!selectedMentorId && mentors.length > 0) {
      setSelectedMentorId(mentors[0].id);
    }
  }, [mentors, selectedMentorId]);

  useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  const toggleLampLight = () => {
    setIsLightOn((prev) => !prev);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Sling / Pull-Cord pointer handlers (supports mouse drag, touch pull, and tap)
  const handleCordPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    maxPullReachedRef.current = 0;
    setIsDraggingCord(true);
    setCordSnapAnim(false);
  };

  const handleCordPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingCord || dragStartYRef.current === null) return;
    const deltaY = Math.max(0, Math.min(54, e.clientY - dragStartYRef.current));
    if (deltaY > maxPullReachedRef.current) {
      maxPullReachedRef.current = deltaY;
    }
    setPullOffset(deltaY);
  };

  const handleCordPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingCord) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const pulledDistance = maxPullReachedRef.current;
    setIsDraggingCord(false);
    dragStartYRef.current = null;
    setCordSnapAnim(true);
    setPullOffset(0);

    // Trigger toggle either on deliberate pull (>= 18px) or quick tap/click (< 8px)
    if (pulledDistance >= 18 || pulledDistance < 8) {
      toggleLampLight();
    }
    setTimeout(() => setCordSnapAnim(false), 300);
  };

  const handleCordKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setCordSnapAnim(true);
      setPullOffset(26);
      setTimeout(() => {
        setPullOffset(0);
        toggleLampLight();
        setTimeout(() => setCordSnapAnim(false), 260);
      }, 110);
    }
  };

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedRole === 'admin') {
      const res = loginAsAdmin(password);
      if (!res.success) {
        setErrorMsg(res.message || 'Invalid Administrator password.');
      } else {
        setSuccessMsg('Authenticated as Administrator / School Head.');
      }
      return;
    }

    if (selectedRole === 'supervisor') {
      const sup = supervisors.find((s) => s.id === selectedSupervisorId) || supervisors[0];
      if (!sup) {
        setErrorMsg('No registered Instructional Supervisor found.');
        return;
      }
      const res = loginAsSupervisor(sup, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Incorrect password for this Instructional Supervisor.');
      } else {
        setSuccessMsg(`Welcome back, ${sup.fullName}!`);
      }
      return;
    }

    if (selectedRole === 'mentor') {
      const mentor = mentors.find((m) => m.id === selectedMentorId) || mentors[0];
      if (!mentor) {
        setErrorMsg('No registered Mentor found.');
        return;
      }
      const res = loginAsMentor(mentor, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Incorrect password for this Mentor account.');
      } else {
        setSuccessMsg(`Welcome back, Mentor ${mentor.fullName}!`);
      }
      return;
    }

    if (selectedRole === 'teacher') {
      const teacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
      if (!teacher) {
        setErrorMsg('No registered Teaching Personnel found.');
        return;
      }
      const res = loginAsTeacher(teacher, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Incorrect password for this Teacher account.');
      } else {
        setSuccessMsg(`Welcome back, ${teacher.fullName}!`);
      }
    }
  };

  const activeSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
  const activeMentor = mentors.find((m) => m.id === selectedMentorId);
  const activeTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const currentYear = new Date().getFullYear();

  const roleMetadata: Record<
    UserRole,
    { label: string; shortLabel: string; privacySummary: string }
  > = {
    admin: {
      label: 'Administrator / Principal',
      shortLabel: 'Admin',
      privacySummary:
        'Full school-wide oversight: consolidated Monitoring & Evaluation reports, all Supervisor and Mentor PMCF & FAR reports, and Roster management.',
    },
    supervisor: {
      label: 'Instructional Supervisor',
      shortLabel: 'Supervisor',
      privacySummary:
        'Accesses only your assigned teachers, COT-PMES, Classroom/Fleeting Observations, Lesson Plans, Assessments, IMs/LMs, and your generated PMCF & FAR.',
    },
    mentor: {
      label: 'Instructional Mentor',
      shortLabel: 'Mentor',
      privacySummary:
        'Manages Lesson Plans, Formative & Summative Assessments, IMs & LMs, and Mentor PMCF & FAR reports for your assigned mentees.',
    },
    teacher: {
      label: 'Teacher / Faculty',
      shortLabel: 'Teacher',
      privacySummary:
        'Personal privacy active: displays only your own evaluations, submissions, assigned Instructional Supervisor/Mentor, and personal PMCF & FAR reports.',
    },
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-700 relative overflow-hidden ${
        isLightOn
          ? 'bg-gradient-to-br from-[#2d0810] via-[#4a0f1c] to-[#1e060b] text-stone-900'
          : 'bg-gradient-to-b from-[#0b0406] via-[#15070b] to-[#0a0305] text-stone-100'
      }`}
    >
      {/* Ambient Warm Room Glow when Lamp is ON */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ${
          isLightOn ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 32% 38%, rgba(253, 224, 71, 0.22) 0%, rgba(251, 191, 36, 0.08) 38%, rgba(15, 5, 8, 0) 72%)',
        }}
      />

      {/* Top Institutional Bar (1 clean row) */}
      <header className="relative z-10 w-full border-b border-amber-400/15 bg-black/30 backdrop-blur-xs px-4 sm:px-6 lg:px-10 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./assets/aistudio/BNHS_LOGO_29bb7e4c.jpg"
              alt="Barobo National High School Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-white p-0.5 border border-amber-300 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                {schoolProfile.schoolName} · OMES
              </div>
              <div className="text-[11px] text-amber-200/75 truncate">
                School ID {schoolProfile.schoolId} · {schoolProfile.currentSchoolYear} ·{' '}
                {cloudSyncStatus === 'synced' ? 'Cloud Synced' : 'Local & Cloud Ready'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLampLight}
            aria-pressed={isLightOn}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${
              isLightOn
                ? 'bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm'
                : 'bg-white/10 text-amber-200 hover:bg-white/20 border border-amber-400/30'
            }`}
          >
            <Power className="w-3.5 h-3.5 shrink-0" />
            <span>{isLightOn ? 'Light On' : 'Turn On Light'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Stage: Interactive Lamp-Shade + Revealed Login Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-10">
          {/* LEFT / TOP STAGE: Interactive Desk & Study Lamp-Shade */}
          <div className="lg:col-span-5 flex flex-col items-center text-center select-none">
            {/* Interactive Lamp SVG + Pull Sling Rig */}
            <div className="relative w-full max-w-[300px] sm:max-w-[330px] flex flex-col items-center">
              {/* Warm Light Cone radiating beneath shade when ON */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute top-[128px] sm:top-[142px] w-72 sm:w-80 h-60 sm:h-64 transition-all duration-700 origin-top ${
                  isLightOn ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-75'
                }`}
                style={{
                  clipPath: 'polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)',
                  background:
                    'linear-gradient(180deg, rgba(254, 240, 138, 0.52) 0%, rgba(251, 191, 36, 0.16) 55%, rgba(251, 191, 36, 0) 100%)',
                }}
              />

              {/* Interactive Lamp Fixture */}
              <div className="relative w-64 sm:w-72 h-56 sm:h-64 flex items-center justify-center">
                <svg
                  viewBox="0 0 260 240"
                  className="w-full h-full overflow-visible drop-shadow-2xl"
                  role="img"
                  aria-label={isLightOn ? 'Study lamp switched on' : 'Study lamp switched off'}
                >
                  <defs>
                    {/* Lamp Shade Gradient (Off vs Illuminated) */}
                    <linearGradient id="lampShadeOff" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3c1720" />
                      <stop offset="55%" stopColor="#260c13" />
                      <stop offset="100%" stopColor="#17060b" />
                    </linearGradient>
                    <linearGradient id="lampShadeOn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9d213a" />
                      <stop offset="45%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#fde68a" />
                    </linearGradient>
                    <linearGradient id="brassStand" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#785418" />
                      <stop offset="45%" stopColor="#f3cd69" />
                      <stop offset="100%" stopColor="#8c621d" />
                    </linearGradient>
                    <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="45%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Soft Desk Reflection Ellipse */}
                  <ellipse
                    cx="130"
                    cy="226"
                    rx={isLightOn ? 92 : 68}
                    ry="10"
                    fill={isLightOn ? 'rgba(253, 224, 71, 0.25)' : 'rgba(0, 0, 0, 0.45)'}
                    className="transition-all duration-500"
                  />

                  {/* Lamp Base Pedestal */}
                  <path
                    d="M 80 222 Q 130 206 180 222 L 186 228 Q 130 232 74 228 Z"
                    fill="url(#brassStand)"
                  />
                  <rect x="92" y="216" width="76" height="5" rx="2.5" fill="#422c0a" opacity="0.45" />

                  {/* Lamp Center Stem */}
                  <rect x="125" y="128" width="10" height="88" rx="3" fill="url(#brassStand)" />
                  <ellipse cx="130" cy="212" rx="14" ry="4" fill="url(#brassStand)" />

                  {/* Glowing Bulb Core underneath Shade */}
                  {isLightOn && (
                    <circle cx="130" cy="138" r="34" fill="url(#bulbGlow)" />
                  )}
                  <ellipse
                    cx="130"
                    cy="134"
                    rx="11"
                    ry="13"
                    fill={isLightOn ? '#fffbeb' : '#44403c'}
                    stroke={isLightOn ? '#fde047' : '#292524'}
                    strokeWidth="1.5"
                    className="transition-colors duration-300"
                  />

                  {/* Top Finial Cap */}
                  <path d="M 124 38 L 136 38 L 133 30 L 127 30 Z" fill="url(#brassStand)" />
                  <circle cx="130" cy="26" r="4.5" fill="url(#brassStand)" />

                  {/* Tapered Lamp-Shade Body */}
                  <path
                    d="M 86 40 L 174 40 L 208 130 Q 130 142 52 130 Z"
                    fill={isLightOn ? 'url(#lampShadeOn)' : 'url(#lampShadeOff)'}
                    stroke={isLightOn ? '#fcd34d' : '#6e2a39'}
                    strokeWidth="2.5"
                    className="transition-all duration-500"
                  />

                  {/* Subtle Shade Ribbing Lines */}
                  <line
                    x1="108"
                    y1="41"
                    x2="92"
                    y2="133"
                    stroke={isLightOn ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'}
                    strokeWidth="1.2"
                  />
                  <line
                    x1="152"
                    y1="41"
                    x2="168"
                    y2="133"
                    stroke={isLightOn ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'}
                    strokeWidth="1.2"
                  />

                  {/* Bottom Shade Rim */}
                  <path
                    d="M 52 130 Q 130 142 208 130"
                    fill="none"
                    stroke={isLightOn ? '#fef08a' : '#854d0e'}
                    strokeWidth="3"
                  />

                  {/* Pull Sling / Beaded Cord hanging from Right Side of Shade */}
                  <g
                    style={{
                      transform: `translateY(${pullOffset}px)`,
                      transition: isDraggingCord
                        ? 'none'
                        : 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    {/* Extended Cord Line when pulled */}
                    <line
                      x1="172"
                      y1={126 - pullOffset}
                      x2="172"
                      y2="168"
                      stroke={isLightOn ? '#fde68a' : '#d6b26e'}
                      strokeWidth="2.5"
                      strokeDasharray="3 3"
                    />
                    {/* Tassel / Brass Acorn Handle */}
                    <rect
                      x="166"
                      y="168"
                      width="12"
                      height="20"
                      rx="6"
                      fill={isLightOn ? '#fbbf24' : '#b4832c'}
                      stroke="#fef3c7"
                      strokeWidth="1.5"
                    />
                    <circle cx="172" cy="192" r="4" fill="#fde68a" />
                  </g>
                </svg>

                {/* Accessible Interactive Hit Target Overlay for the Pull Sling */}
                <button
                  type="button"
                  onPointerDown={handleCordPointerDown}
                  onPointerMove={handleCordPointerMove}
                  onPointerUp={handleCordPointerUp}
                  onPointerCancel={handleCordPointerUp}
                  onKeyDown={handleCordKeyDown}
                  aria-label={isLightOn ? 'Pull sling cord to turn off light' : 'Pull sling cord to turn on light'}
                  title="Pull down or click to switch the lamp light"
                  style={{
                    transform: `translateY(${pullOffset}px)`,
                    transition: isDraggingCord
                      ? 'none'
                      : cordSnapAnim
                      ? 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                      : 'transform 160ms ease',
                  }}
                  className="touch-none absolute right-[18%] sm:right-[19%] top-[54%] w-14 h-24 rounded-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-amber-300 bg-transparent group flex items-end justify-center pb-1"
                >
                  <span className="sr-only">Pull sling cord</span>
                </button>

                {/* Accessible Clickable Switch on Lamp Base */}
                <button
                  type="button"
                  onClick={toggleLampLight}
                  aria-pressed={isLightOn}
                  aria-label={isLightOn ? 'Turn off lamp switch' : 'Turn on lamp switch'}
                  title={isLightOn ? 'Click switch to turn off' : 'Click switch to turn on'}
                  className={`absolute bottom-[8px] left-1/2 -translate-x-1/2 w-12 h-8 rounded-full border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    isLightOn
                      ? 'bg-amber-400 border-amber-200 text-stone-950 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                      : 'bg-stone-800 border-amber-500/40 text-amber-300 hover:bg-stone-700'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Interactive Controls Hint & Direct Switch CTA */}
              <div className="mt-2 space-y-3 w-full max-w-sm">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={toggleLampLight}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all inline-flex items-center gap-2 cursor-pointer min-h-[44px] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-300 ${
                      isLightOn
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 hover:bg-amber-400/30'
                        : 'bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-lg shadow-amber-500/25'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>{isLightOn ? 'Turn Off Lamp' : 'Switch On Light to Sign In'}</span>
                  </button>
                </div>

                <p className="text-xs text-amber-100/75 flex items-center justify-center gap-1.5">
                  <MoveDown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    {isLightOn
                      ? 'Lamp is lit — workspace unlocked for authentication'
                      : 'Pull down the brass sling cord or press the lamp switch'}
                  </span>
                </p>
              </div>
            </div>

            {/* Institutional Summary Strip */}
            <div className="hidden lg:block mt-6 pt-5 border-t border-white/10 max-w-sm text-center space-y-1.5">
              <h1 className="text-lg font-bold text-white text-balance">
                Barobo National High School · OMES
              </h1>
              <p className="text-xs text-amber-100/70 leading-relaxed">
                Online Monitoring &amp; Evaluation System · Region XIII (Caraga) · Division of Surigao del Sur
              </p>
            </div>
          </div>

          {/* RIGHT / BOTTOM STAGE: Login Card (Shadowed until Light is Turned On) */}
          <div className="lg:col-span-7 w-full">
            {!isLightOn ? (
              /* Lights-Off Veiled Card Prompt */
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 sm:p-10 text-center space-y-5 shadow-2xl">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-300">
                  <Lock className="w-6 h-6" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-xl sm:text-2xl font-bold text-white text-balance">
                    Sign in to access your private OMES Workspace
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300/80 leading-relaxed">
                    All Administrator, Instructional Supervisor, Mentor, and Teacher records remain sealed in darkness until you turn on the desk lamp.
                  </p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleLampLight}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all inline-flex items-center justify-center gap-2 min-h-[44px] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>Turn On Lamp &amp; Open Login</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10 text-[11px] text-stone-400 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <span>Administrator</span>
                  <span aria-hidden="true">·</span>
                  <span>Instructional Supervisors ({supervisors.length})</span>
                  <span aria-hidden="true">·</span>
                  <span>Mentors ({mentors.length})</span>
                  <span aria-hidden="true">·</span>
                  <span>Faculty ({teachers.length})</span>
                </div>
              </div>
            ) : (
              /* Lights-On Illuminated Login Workspace */
              <div className="rounded-2xl bg-white text-stone-900 border border-amber-300/60 shadow-[0_25px_70px_-15px_rgba(251,191,36,0.32)] p-5 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-stone-200">
                  <div>
                    <div className="text-xs font-semibold text-[#701628]">
                      Account Authentication
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5 text-balance">
                      Sign in to access your private OMES Workspace
                    </h2>
                  </div>
                  <div className="text-xs text-stone-500 whitespace-nowrap shrink-0">
                    DepEd RPMS-PPST Portal
                  </div>
                </div>

                {/* 4-Role Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-200 mb-5">
                  {(
                    [
                      { id: 'admin', label: 'Administrator', Icon: UserCheck },
                      { id: 'supervisor', label: 'Supervisor', Icon: ShieldCheck },
                      { id: 'mentor', label: 'Mentor', Icon: BookOpenCheck },
                      { id: 'teacher', label: 'Teacher', Icon: Users },
                    ] as const
                  ).map(({ id, label, Icon }) => {
                    const active = selectedRole === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleRoleSwitch(id)}
                        className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[40px] whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#701628] text-white shadow-xs font-bold'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Role Privacy Scope Summary */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-xs mb-5">
                  <div className="font-bold text-[#701628] mb-0.5">
                    {roleMetadata[selectedRole].label} Scope
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                    {roleMetadata[selectedRole].privacySummary}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Account Selector per Role */}
                  {selectedRole === 'admin' && (
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500">
                        Authorized Account
                      </div>
                      <div className="text-sm font-bold text-[#701628] mt-0.5">
                        School Head / System Administrator
                      </div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {schoolProfile.principalName} · {schoolProfile.principalTitle}
                      </div>
                    </div>
                  )}

                  {selectedRole === 'supervisor' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Select Instructional Supervisor Account
                      </label>
                      <select
                        value={selectedSupervisorId}
                        onChange={(e) => {
                          setSelectedSupervisorId(e.target.value);
                          setErrorMsg('');
                        }}
                        className="w-full p-2.5 text-xs sm:text-sm font-semibold border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628] min-h-[42px]"
                      >
                        {supervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} — {s.position} ({s.department})
                          </option>
                        ))}
                      </select>
                      {activeSupervisor && (
                        <div className="mt-1.5 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-1 px-1 tabular-nums">
                          <span>ID: {activeSupervisor.employeeId}</span>
                          <span>
                            Assigned Teachers:{' '}
                            {
                              teachers.filter(
                                (t) =>
                                  t.assignedSupervisorId === activeSupervisor.id ||
                                  activeSupervisor.assignedTeacherIds?.includes(t.id)
                              ).length
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRole === 'mentor' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Select Instructional Mentor Account
                      </label>
                      <select
                        value={selectedMentorId}
                        onChange={(e) => {
                          setSelectedMentorId(e.target.value);
                          setErrorMsg('');
                        }}
                        className="w-full p-2.5 text-xs sm:text-sm font-semibold border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628] min-h-[42px]"
                      >
                        {mentors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} — {m.position} ({m.subjectArea || m.department})
                          </option>
                        ))}
                      </select>
                      {activeMentor && (
                        <div className="mt-1.5 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-1 px-1 tabular-nums">
                          <span>ID: {activeMentor.employeeId}</span>
                          <span>
                            Assigned Mentees:{' '}
                            {
                              teachers.filter(
                                (t) =>
                                  t.assignedMentorId === activeMentor.id ||
                                  activeMentor.assignedTeacherIds?.includes(t.id)
                              ).length
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRole === 'teacher' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Select Teacher / Faculty Account
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => {
                          setSelectedTeacherId(e.target.value);
                          setErrorMsg('');
                        }}
                        className="w-full p-2.5 text-xs sm:text-sm font-semibold border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628] min-h-[42px]"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} — {t.position} ({t.department})
                          </option>
                        ))}
                      </select>
                      {activeTeacher && (
                        <div className="mt-1.5 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-1 px-1 tabular-nums">
                          <span>ID: {activeTeacher.employeeId}</span>
                          <span>{activeTeacher.subject}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <label className="block text-xs font-bold text-stone-700">
                        Account Password
                      </label>
                      <span className="text-[11px] text-stone-500 font-mono">
                        Default: <strong className="text-stone-700">omes123</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Enter account password (default: omes123)..."
                        className="w-full pl-10 pr-11 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#701628] font-mono min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1.5 p-2 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {(selectedRole === 'supervisor' || selectedRole === 'mentor') && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-stone-500">
                          Forgot your private password?
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenForgotPassword(
                              selectedRole === 'mentor' ? 'mentor' : 'supervisor',
                              selectedRole === 'mentor' ? selectedMentorId : selectedSupervisorId
                            )
                          }
                          className="text-[11px] text-[#701628] hover:text-[#580e1c] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Key className="w-3 h-3 text-amber-700" />
                          <span>Reset Password (OTP)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-[#701628] hover:bg-[#580e1c] text-white text-sm font-bold rounded-xl shadow-md transition-all focus-visible:outline-2 focus-visible:outline-amber-400 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                  >
                    <span>Sign In as {roleMetadata[selectedRole].shortLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="relative z-10 bg-black/40 text-amber-200/80 py-3 px-4 text-center text-xs border-t border-amber-500/15">
        Copyright © {currentYear} BNHS-OMES · Barobo National High School · Powered by: Bless T. Tajale
      </footer>
    </div>
  );
};
