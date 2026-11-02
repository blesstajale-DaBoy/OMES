import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header, NavTab } from './components/Header';
import { SchoolBanner } from './components/SchoolBanner';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { PrintReportModal } from './components/PrintReportModal';

// Views
import { DashboardView } from './views/DashboardView';
import { CotObservationView } from './views/CotObservationView';
import { LessonPlanCheckView } from './views/LessonPlanCheckView';
import { FleetingObservationView } from './views/FleetingObservationView';
import { FarPmcfView } from './views/FarPmcfView';
import { ImsAssessmentsView } from './views/ImsAssessmentsView';
import { SupervisoryRosterView } from './views/SupervisoryRosterView';
import { AuditLogsView } from './views/AuditLogsView';
import { ReportsLinksView } from './views/ReportsLinksView';
import { SettingsBannerView } from './views/SettingsBannerView';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotSupervisorId, setForgotSupervisorId] = useState<string | undefined>(undefined);
  const [selectedObservationIdForPrint, setSelectedObservationIdForPrint] = useState<string | null>(null);

  const { observations, schoolProfile } = useData();
  const currentYear = new Date().getFullYear();

  const selectedObservation = observations.find((o) => o.id === selectedObservationIdForPrint) || null;

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 font-sans selection:bg-[#701628] selection:text-white">
      {/* Maroon Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
      />

      {/* School Panoramic Banner Area (2763 x 394 px proportion) */}
      <SchoolBanner />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={setActiveTab}
            onSelectObservationForPrint={(id) => setSelectedObservationIdForPrint(id)}
          />
        )}
        {activeTab === 'observation' && (
          <CotObservationView
            onSelectObservationForPrint={(id) => setSelectedObservationIdForPrint(id)}
          />
        )}
        {activeTab === 'lesson-plans' && <LessonPlanCheckView />}
        {activeTab === 'fleeting' && (
          <FleetingObservationView
            onSelectObservationForPrint={(id) => setSelectedObservationIdForPrint(id)}
          />
        )}
        {activeTab === 'far-pmcf' && <FarPmcfView />}
        {activeTab === 'ims-assessments' && <ImsAssessmentsView />}
        {activeTab === 'roster' && <SupervisoryRosterView />}
        {activeTab === 'audit-logs' && <AuditLogsView />}
        {activeTab === 'reports' && <ReportsLinksView />}
        {activeTab === 'settings' && <SettingsBannerView />}
      </main>

      {/* Formal DepEd Footer */}
      <footer className="bg-[#4d0c18] border-t border-amber-500/20 text-amber-100/80 py-8 px-4 sm:px-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white tracking-wide">
              {schoolProfile.schoolName.toUpperCase()} · OMES PORTAL
            </div>
            <div className="text-[11px] text-amber-200/80">
              Department of Education · Caraga Administrative Region XIII · Schools Division of Surigao del Sur
            </div>
            <div className="text-[11px] text-amber-300/70">
              School ID: {schoolProfile.schoolId} · Barobo I District · Poblacion, Barobo, Surigao del Sur
            </div>
          </div>

          <div className="text-[11px] text-amber-200/70 space-y-1 md:text-right">
            <div>DepEd Order No. 42, s. 2016 & RPMS-PPST Guidelines</div>
            <div>Instructional Supervision, Teacher Monitoring & Assessment System</div>
            <div className="text-amber-400 font-semibold text-[10px]">
              Ready for Local Offline & Hosted Database Operations
            </div>
          </div>
        </div>
      </footer>

      {/* Dynamic Animated Running Marquee Footer Section */}
      <div 
        className="bg-[#23040a] text-amber-300 py-2.5 border-t border-amber-500/30 overflow-hidden shadow-inner select-none relative z-10 print:hidden"
        title="Copyright © BNHS-OMES (Hover to pause animation)"
      >
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="bnhs-marquee-track">
            {/* Sequence 1 */}
            <div className="flex items-center gap-12 pr-12 text-xs sm:text-sm font-semibold tracking-wide">
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
            </div>

            {/* Sequence 2 (Identical clone for seamless infinite loop) */}
            <div className="flex items-center gap-12 pr-12 text-xs sm:text-sm font-semibold tracking-wide" aria-hidden="true">
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
              <span>Copyright © {currentYear} BNHS-OMES. Powered by: Bless T. Tajale</span>
              <span className="text-amber-500/80 text-xs">✦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login / Demo Accounts Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenForgotPassword={(supId) => {
          setForgotSupervisorId(supId);
          setIsForgotPasswordOpen(true);
        }}
      />

      {/* Supervisor & User Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
      />

      {/* Secure Forgot Password / OTP Reset Modal for Instructional Supervisors */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultSupervisorId={forgotSupervisorId}
        onSuccessLogin={() => setIsForgotPasswordOpen(false)}
      />

      {/* Official DepEd Printable Observation Report Modal */}
      <PrintReportModal
        observation={selectedObservation}
        onClose={() => setSelectedObservationIdForPrint(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
