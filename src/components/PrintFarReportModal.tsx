import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FarRecord } from '../types';
import { getScopedTeachersForModal } from '../utils/supervisionScope';
import {
  X,
  Printer,
  Download,
  FileDown,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  School,
  Calendar,
  User,
} from 'lucide-react';

interface PrintFarReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedRecordId?: string | null;
  records?: FarRecord[];
}

export const PrintFarReportModal: React.FC<PrintFarReportModalProps> = ({
  isOpen,
  onClose,
  initialSelectedRecordId,
  records,
}) => {
  const { farRecords, schoolProfile, teachers, supervisors, mentors } = useData();
  const { currentUser, isTeacher, isMentor } = useAuth();
  const sourceRecords = records ?? farRecords;

  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialSelectedRecordId
      ? sourceRecords.find((r) => r.id === initialSelectedRecordId)?.teacherId || 'All'
      : 'All'
  );
  const [includeOnlySelectedRecord, setIncludeOnlySelectedRecord] = useState<boolean>(
    Boolean(initialSelectedRecordId)
  );

  if (!isOpen) return null;

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors, mentors);
  const availableTeacherIdsInRecords = new Set(sourceRecords.map((r) => r.teacherId));
  const filterTeacherOptions =
    scopedTeachers.length > 0
      ? scopedTeachers
      : teachers.filter((t) => availableTeacherIdsInRecords.has(t.id));
  const officerName = currentUser?.fullName || 'Instructional Supervisor';
  const officerRoleLabel = isMentor ? 'Mentor' : 'Instructional Supervisor';

  // Filter records according to user selection in preview modal
  const displayedRecords = sourceRecords.filter((r) => {
    if (includeOnlySelectedRecord && initialSelectedRecordId) {
      return r.id === initialSelectedRecordId;
    }
    const matchesTerm = selectedTerm === 'All' || r.term === selectedTerm;
    const matchesStatus =
      selectedStatus === 'All' ||
      (selectedStatus === 'Verified' && (r.status === 'Verified' || r.actionTaken)) ||
      (selectedStatus === 'In Progress' && r.status !== 'Verified' && !r.actionTaken);
    const matchesTeacher = selectedTeacherId === 'All' || r.teacherId === selectedTeacherId;
    return matchesTerm && matchesStatus && matchesTeacher;
  });

  const verifiedCount = displayedRecords.filter(
    (r) => r.status === 'Verified' || r.actionTaken
  ).length;
  const inProgressCount = displayedRecords.length - verifiedCount;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // Direct offline downloadable HTML report that auto-triggers print to PDF
  const handleDownloadOfflineReport = () => {
    const tableRowsHtml = displayedRecords
      .map((r, idx) => {
        const isVerified = r.status === 'Verified' || r.actionTaken;
        return `
        <tr style="border-bottom: 1px solid #cbd5e1; vertical-align: top; font-size: 11px;">
          <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #701628; border-right: 1px solid #cbd5e1; text-align: center;">
            ${r.farCode}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            ${r.date}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">
            <strong style="color: #0f172a;">${r.teacherName}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${r.term} · ${r.lessonPlanWeek}</span><br/>
            <span style="font-size: 10px; color: #701628;">${r.evaluatorRole === 'mentor' && r.mentorName ? `Mentor: ${r.mentorName}` : `Supervisor: ${r.supervisorName}`}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${r.findings.replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${r.analysis.replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${r.recommendations.replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; text-align: center; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; ${
              isVerified
                ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                : 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
            }">
              ${isVerified ? 'Verified' : 'In Progress'}
            </span>
          </td>
          <td style="padding: 8px; text-align: center; font-size: 10px; color: #475569;">
            ${isVerified ? 'Action Taken & Verified' : 'Coaching in Progress'}
          </td>
        </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DepEd_FAR_Report_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 1.5cm; }
    .header { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 12px; margin-bottom: 16px; }
    .header h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; }
    .header h3 { margin: 2px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; }
    .header h2 { margin: 4px 0; font-size: 18px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #64748b; }
    .title-banner { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 12px; margin-top: 10px; text-align: center; font-weight: bold; font-size: 12px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; }
    .meta-item strong { color: #475569; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    th { background: #f1f5f9; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 10px; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
    td { border: 1px solid #cbd5e1; }
    .signatories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 36px; text-align: center; font-size: 11px; page-break-inside: avoid; }
    .sign-line { border-bottom: 1px solid #0f172a; padding-bottom: 4px; font-weight: bold; margin-bottom: 4px; }
    .sign-title { font-size: 10px; color: #475569; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #701628; color: white; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <div><strong>Official DepEd Document Ready</strong> - Click "Print / Save as PDF" below or press Ctrl+P / Cmd+P to save as official PDF.</div>
    <button onclick="window.print()" style="background: #fbbf24; color: #000; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education</h3>
    <p>Caraga Administrative Region XIII · Schools Division of Surigao del Sur</p>
    <h2>${schoolProfile.schoolName}</h2>
    <p>School ID: ${schoolProfile.schoolId} · ${schoolProfile.address}</p>
    <div class="title-banner">
      INSTRUCTIONAL SUPERVISORY FINDINGS, ANALYSIS AND RECOMMENDATIONS (FAR) REPORT
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Reporting Scope:</strong> ${selectedTerm === 'All' ? 'All Terms (Consolidated)' : selectedTerm}</div>
    <div class="meta-item"><strong>Date Generated:</strong> ${currentDateFormatted}</div>
    <div class="meta-item"><strong>Total Records:</strong> ${displayedRecords.length} (${verifiedCount} Verified, ${inProgressCount} In Progress)</div>
    <div class="meta-item"><strong>${officerRoleLabel}:</strong> ${officerName}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 100px; text-align: center;">FAR Code</th>
        <th style="width: 80px;">Date</th>
        <th style="width: 140px;">Teacher & Week</th>
        <th>Findings</th>
        <th>Analysis</th>
        <th>Recommendations</th>
        <th style="width: 90px; text-align: center;">Status</th>
        <th style="width: 100px; text-align: center;">Action Taken</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="signatories">
    <div>
      <div class="sign-line">${officerName}</div>
      <div class="sign-title">Prepared by: ${officerRoleLabel}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Date: ${currentDateFormatted}</div>
    </div>
    <div>
      <div class="sign-line">Instructional Supervision & QA Committee</div>
      <div class="sign-title">Reviewed by: Master Teacher / QA Committee</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">DepEd Caraga Region XIII</div>
    </div>
    <div>
      <div class="sign-line">${schoolProfile.principalName}</div>
      <div class="sign-title">${schoolProfile.principalTitle}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">School Head / Approving Authority</div>
    </div>
  </div>

  <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
    Official DepEd Quality Management System Document · Barobo National High School OMES Portal · DepEd Order No. 42, s. 2016 & RPMS-PPST
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DepEd_FAR_Report_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 print:border-none print:shadow-none print:m-0 print:max-w-full print:w-full">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-[#701628] text-white px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Official DepEd Form: Findings, Analysis & Recommendations (FAR)</span>
                <span className="text-[11px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full font-bold">
                  PDF & Print Engine
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90">
                Generate official hard-copy reports with DepEd Division & School letterhead and formal signatories
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Open browser print dialog to print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-stone-900" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadOfflineReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Download standalone offline report file (opens and converts cleanly to PDF anywhere)"
            >
              <Download className="w-4 h-4" />
              <span>Download Report File</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden on print) */}
        <div className="bg-stone-50 border-b border-stone-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#701628]" />
              <span>Report Scope:</span>
            </span>

            {/* Term Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="far-term-select" className="text-stone-500 font-medium text-[11px]">Term:</label>
              <select
                id="far-term-select"
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setIncludeOnlySelectedRecord(false);
                }}
                className="border border-stone-300 rounded px-2 py-1 text-xs bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#701628]"
              >
                <option value="All">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="far-status-select" className="text-stone-500 font-medium text-[11px]">Status:</label>
              <select
                id="far-status-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setIncludeOnlySelectedRecord(false);
                }}
                className="border border-stone-300 rounded px-2 py-1 text-xs bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#701628]"
              >
                <option value="All">All Status</option>
                <option value="Verified">Verified Only</option>
                <option value="In Progress">In Progress Only</option>
              </select>
            </div>

            {/* Teacher Filter */}
            {!isTeacher && (
              <div className="flex items-center gap-1">
                <label htmlFor="far-teacher-select" className="text-stone-500 font-medium text-[11px]">Teacher:</label>
                <select
                  id="far-teacher-select"
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    setIncludeOnlySelectedRecord(false);
                  }}
                  className="border border-stone-300 rounded px-2 py-1 text-xs bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#701628] max-w-[200px]"
                >
                  <option value="All">All Scoped Teachers</option>
                  {filterTeacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {initialSelectedRecordId && includeOnlySelectedRecord && (
              <button
                onClick={() => setIncludeOnlySelectedRecord(false)}
                className="text-[11px] font-bold text-[#701628] hover:underline cursor-pointer ml-1"
              >
                Show Entire FAR Table ({sourceRecords.length})
              </button>
            )}
          </div>

          <div className="text-[11px] text-stone-500 font-medium flex items-center gap-2">
            <span>Showing: <strong className="text-stone-900">{displayedRecords.length}</strong> record(s)</span>
            <span className="text-stone-300">|</span>
            <span className="text-emerald-700 font-semibold">{verifiedCount} Verified</span>
            <span className="text-stone-300">·</span>
            <span className="text-amber-700 font-semibold">{inProgressCount} In Progress</span>
          </div>
        </div>

        {/* Printable Official DepEd Document Sheet */}
        <div className="p-6 sm:p-10 text-stone-900 font-sans print:p-6 bg-white print:text-black">
          {/* DepEd Letterhead */}
          <div className="text-center border-b-2 border-stone-800 pb-4 mb-5">
            <div className="text-[11px] uppercase tracking-widest font-serif text-stone-600 print:text-stone-800">
              Republic of the Philippines
            </div>
            <div className="text-sm font-bold uppercase tracking-wider font-serif text-stone-900">
              Department of Education
            </div>
            <div className="text-xs font-serif text-stone-700">
              Caraga Administrative Region XIII · Schools Division of Surigao del Sur
            </div>
            <div className="text-lg font-extrabold uppercase tracking-tight text-[#701628] mt-1 font-serif print:text-black">
              {schoolProfile.schoolName}
            </div>
            <div className="text-[11px] text-stone-600">
              School ID: {schoolProfile.schoolId} · {schoolProfile.address}
            </div>
            <div className="mt-3 text-xs font-bold uppercase tracking-wider bg-stone-100 py-1.5 px-3 border-y border-stone-300 print:bg-stone-100">
              INSTRUCTIONAL SUPERVISORY FINDINGS, ANALYSIS AND RECOMMENDATIONS (FAR) OFFICIAL REPORT
            </div>
          </div>

          {/* Report Metadata Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-stone-300 p-3.5 rounded-md mb-5 bg-stone-50/70 print:bg-transparent">
            <div>
              <span className="font-semibold text-stone-500 block text-[10px] uppercase">Reporting Scope:</span>
              <span className="font-bold text-stone-900">
                {selectedTerm === 'All' ? 'Consolidated All Terms' : selectedTerm}
              </span>
            </div>
            <div>
              <span className="font-semibold text-stone-500 block text-[10px] uppercase">Date Generated:</span>
              <span className="font-bold text-stone-900">{currentDateFormatted}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-500 block text-[10px] uppercase">Records Summary:</span>
              <span className="font-bold text-stone-900">
                {displayedRecords.length} Total ({verifiedCount} Verified, {inProgressCount} In Progress)
              </span>
            </div>
            <div>
              <span className="font-semibold text-stone-500 block text-[10px] uppercase">{officerRoleLabel}:</span>
              <span className="font-bold text-stone-900">{officerName}</span>
            </div>
          </div>

          {/* Official FAR Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border border-stone-300 border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300 font-bold text-stone-800 text-[11px] uppercase tracking-wider">
                  <th className="p-2 border-r border-stone-300 text-center w-28 whitespace-nowrap">FAR Code</th>
                  <th className="p-2 border-r border-stone-300 w-24 whitespace-nowrap">Date</th>
                  <th className="p-2 border-r border-stone-300 w-44">Teacher & Timeline</th>
                  <th className="p-2 border-r border-stone-300 min-w-[180px]">Findings</th>
                  <th className="p-2 border-r border-stone-300 min-w-[180px]">Analysis</th>
                  <th className="p-2 border-r border-stone-300 min-w-[180px]">Recommendations</th>
                  <th className="p-2 border-r border-stone-300 text-center w-24 whitespace-nowrap">Status</th>
                  <th className="p-2 text-center w-28 whitespace-nowrap">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-stone-500 italic">
                      No Findings, Analysis and Recommendations records match the selected scope.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((r) => {
                    const isVerified = r.status === 'Verified' || r.actionTaken;
                    return (
                      <tr key={r.id} className="align-top hover:bg-stone-50/50 print:hover:bg-transparent">
                        {/* FAR Code */}
                        <td className="p-2 border-r border-stone-300 font-mono font-bold text-[#701628] print:text-black text-center whitespace-nowrap text-[11px]">
                          {r.farCode}
                        </td>

                        {/* Date */}
                        <td className="p-2 border-r border-stone-300 text-stone-700 whitespace-nowrap text-[11px]">
                          {r.date}
                        </td>

                        {/* Teacher & Week */}
                        <td className="p-2 border-r border-stone-300">
                          <div className="font-bold text-stone-900 text-[11px]">
                            {r.teacherName}
                          </div>
                          <div className="text-[10px] text-stone-600 mt-0.5">
                            {r.term} · {r.lessonPlanWeek}
                          </div>
                          <div className="text-[10px] text-[#701628] mt-0.5">
                            {r.evaluatorRole === 'mentor' && r.mentorName
                              ? `Mentor: ${r.mentorName}`
                              : `Supervisor: ${r.supervisorName}`}
                          </div>
                        </td>

                        {/* Findings */}
                        <td className="p-2 border-r border-stone-300 text-stone-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.findings}
                        </td>

                        {/* Analysis */}
                        <td className="p-2 border-r border-stone-300 text-stone-700 text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.analysis}
                        </td>

                        {/* Recommendations */}
                        <td className="p-2 border-r border-stone-300 text-stone-700 text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.recommendations}
                        </td>

                        {/* Status */}
                        <td className="p-2 border-r border-stone-300 text-center whitespace-nowrap">
                          {isVerified ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded border border-emerald-200 print:text-black print:border-stone-400">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 rounded border border-amber-200 print:text-black print:border-stone-400">
                              In Progress
                            </span>
                          )}
                        </td>

                        {/* Action Taken */}
                        <td className="p-2 text-center text-[10px] whitespace-nowrap text-stone-600">
                          {isVerified ? (
                            <span className="font-semibold text-emerald-700 print:text-black">
                              Action Taken
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* DepEd Official Signatories Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-stone-300 text-center text-xs page-break-inside-avoid">
            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900 uppercase">
                {officerName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">Prepared by:</div>
              <div className="text-[10px] text-stone-500">{officerRoleLabel} / Observer</div>
              <div className="text-[9px] text-stone-400 mt-0.5">Date: {currentDateFormatted}</div>
            </div>

            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900 uppercase">
                SUPERVISORY QA COMMITTEE
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">Reviewed & Monitored by:</div>
              <div className="text-[10px] text-stone-500">Master Teacher / Quality Assurance</div>
              <div className="text-[9px] text-stone-400 mt-0.5">DepEd Caraga Region XIII</div>
            </div>

            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900 uppercase">
                {schoolProfile.principalName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">{schoolProfile.principalTitle}</div>
              <div className="text-[10px] text-stone-500">School Head / Approving Authority</div>
              <div className="text-[9px] text-stone-400 mt-0.5">Barobo National High School</div>
            </div>
          </div>

          {/* Document Verification Footer */}
          <div className="mt-8 pt-3 border-t border-dashed border-stone-300 flex flex-col sm:flex-row items-center justify-between text-[9px] text-stone-400">
            <div>
              Official DepEd Quality Management Record · DepEd Order No. 42, s. 2016 & RPMS-PPST Compliance
            </div>
            <div>
              Document Tracking: BNHS-FAR-{new Date().getFullYear()}-{displayedRecords.length}R
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
