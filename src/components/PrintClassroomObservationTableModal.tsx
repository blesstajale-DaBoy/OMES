import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ClassroomObservation } from '../types';
import { getScopedTeachersForModal } from '../utils/supervisionScope';
import {
  X,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface PrintClassroomObservationTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ClassroomObservation[];
}

export const PrintClassroomObservationTableModal: React.FC<
  PrintClassroomObservationTableModalProps
> = ({ isOpen, onClose, records }) => {
  const { schoolProfile, teachers, supervisors, mentors } = useData();
  const { currentUser, isAdmin, isTeacher, isSupervisor } = useAuth();

  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('All');
  const [selectedSupervisorName, setSelectedSupervisorName] = useState<string>('All');

  if (!isOpen) return null;

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors, mentors);
  const availableTeacherIdsInRecords = new Set(records.map((r) => r.teacherId));
  const filterTeacherOptions =
    scopedTeachers.length > 0
      ? scopedTeachers
      : teachers.filter((t) => availableTeacherIdsInRecords.has(t.id));

  const displayedRecords = records.filter((r) => {
    const matchesTerm = selectedTerm === 'All' || r.quarterTerm === selectedTerm;
    const matchesStatus =
      selectedStatus === 'All' || r.overallRating === selectedStatus;
    const matchesTeacher =
      selectedTeacherId === 'All' || r.teacherId === selectedTeacherId;
    const matchesSupervisor =
      selectedSupervisorName === 'All' || r.supervisorName === selectedSupervisorName;
    return matchesTerm && matchesStatus && matchesTeacher && matchesSupervisor;
  });

  const evidentRecordsCount = displayedRecords.filter(
    (r) => r.overallRating !== 'Not Evident'
  ).length;
  const notEvidentRecordsCount = displayedRecords.length - evidentRecordsCount;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const activeObserverLabel =
    selectedSupervisorName !== 'All'
      ? selectedSupervisorName
      : displayedRecords.length === 1
        ? displayedRecords[0].supervisorName
        : currentUser?.fullName || 'Instructional Supervisor';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFormattedPdfReport = () => {
    const tableRowsHtml = displayedRecords
      .map((obs, idx) => {
        const evidentCount = obs.ratings.filter(
          (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'E'
        ).length;
        const notEvidentCount = obs.ratings.filter(
          (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'NE'
        ).length;
        const isEvident = obs.overallRating !== 'Not Evident';

        return `
        <tr style="border-bottom: 1px solid #cbd5e1; vertical-align: top; font-size: 11px;">
          <td style="padding: 8px; text-align: center; border-right: 1px solid #cbd5e1; font-weight: bold; color: #475569;">
            ${idx + 1}
          </td>
          <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #701628; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            ${obs.observationNo}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            <strong>${obs.date}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${obs.timeStart} - ${obs.timeEnd}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">
            <strong style="color: #0f172a;">${obs.teacherName}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${obs.department}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">
            <strong>${obs.subjectTaught}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${obs.gradeAndSection}</span><br/>
            <span style="font-size: 10px; font-style: italic; color: #475569;">Topic: ${obs.topicTitle}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">
            <strong style="color: #0f172a;">${obs.supervisorName}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${obs.quarterTerm} · SY ${obs.schoolYear}</span>
          </td>
          <td style="padding: 8px; text-align: center; border-right: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; white-space: nowrap;">
            E: ${evidentCount} / NE: ${notEvidentCount}
          </td>
          <td style="padding: 8px; text-align: center; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; ${
              isEvident
                ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                : 'background-color: #ffe4e6; color: #9f1239; border: 1px solid #fda4af;'
            }">
              ${obs.overallRating}
            </span>
          </td>
          <td style="padding: 8px; font-size: 10px; color: #334155; line-height: 1.4;">
            <strong>Strengths:</strong> ${obs.strengths}<br/>
            <strong>Growth Area:</strong> ${obs.areasForDevelopment}
          </td>
        </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Classroom_Observation_Table_Report_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 1.2cm; }
    .header { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 12px; margin-bottom: 16px; }
    .header h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; }
    .header h3 { margin: 2px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; }
    .header h2 { margin: 4px 0; font-size: 18px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #64748b; }
    .title-banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 6px 12px; margin-top: 10px; text-align: center; font-weight: bold; font-size: 12px; color: #701628; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; font-size: 11px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 4px; }
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
    <div><strong>Official DepEd Classroom Observation Table Document</strong> — Click "Print / Save as PDF" to export as a formatted PDF.</div>
    <button onclick="window.print()" style="background: #fbbf24; color: #000; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education</h3>
    <p>Caraga Administrative Region XIII · Schools Division of Surigao del Sur</p>
    <h2>${schoolProfile.schoolName}</h2>
    <p>School ID: ${schoolProfile.schoolId} · ${schoolProfile.address}</p>
    <div class="title-banner">
      MONITORING TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS · CLASSROOM OBSERVATION TABLE REPORT
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Observer / Rater:</strong> ${activeObserverLabel}</div>
    <div class="meta-item"><strong>Reporting Scope:</strong> ${selectedTerm === 'All' ? 'All Terms (Consolidated)' : selectedTerm}</div>
    <div class="meta-item"><strong>Date Generated:</strong> ${currentDateFormatted}</div>
    <div class="meta-item"><strong>Total Records:</strong> ${displayedRecords.length} (${evidentRecordsCount} Evident, ${notEvidentRecordsCount} Not Evident)</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 32px; text-align: center;">No.</th>
        <th style="width: 105px;">Observation Code</th>
        <th style="width: 95px;">Date & Time</th>
        <th style="width: 135px;">Teacher Observed</th>
        <th style="width: 150px;">Subject, Grade & Topic</th>
        <th style="width: 140px;">Assigned Instructional Supervisor</th>
        <th style="width: 90px; text-align: center;">Live Indicator</th>
        <th style="width: 85px; text-align: center;">Status</th>
        <th>Observer Commendations & Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="signatories">
    <div>
      <div class="sign-line">${activeObserverLabel}</div>
      <div class="sign-title">Prepared by: Assigned Instructional Supervisor / Observer</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Date: ${currentDateFormatted}</div>
    </div>
    <div>
      <div class="sign-line">Instructional Supervision & QA Committee</div>
      <div class="sign-title">Reviewed by: Master Teacher / Department Head</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${schoolProfile.schoolName}</div>
    </div>
    <div>
      <div class="sign-line">${schoolProfile.principalName}</div>
      <div class="sign-title">${schoolProfile.principalTitle}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">School Head / Approving Authority</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DepEd_Classroom_Observation_Table_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
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
                <span>Export Classroom Observation Table (PDF)</span>
                <span className="text-[11px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full font-bold">
                  Official DepEd Format
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90">
                Monitoring Tool On The Conduct Of Classroom Observations · Preserves School Header & Observer Details
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Open browser print dialog to Print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-stone-900" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadFormattedPdfReport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-white/20"
              title="Download standalone formatted printable document"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Download Report File</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar (Hidden on print) */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#701628]" />
              Report Scope:
            </span>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="border border-stone-300 rounded-md px-2.5 py-1 bg-white text-stone-800 font-medium"
            >
              <option value="All">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>

            {!isTeacher && (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="border border-stone-300 rounded-md px-2.5 py-1 bg-white text-stone-800 font-medium"
              >
                <option value="All">All Teachers</option>
                {filterTeacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            )}

            {isAdmin && (
              <select
                value={selectedSupervisorName}
                onChange={(e) => setSelectedSupervisorName(e.target.value)}
                className="border border-stone-300 rounded-md px-2.5 py-1 bg-white text-stone-800 font-medium"
              >
                <option value="All">All Assigned Supervisors</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.fullName}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-stone-300 rounded-md px-2.5 py-1 bg-white text-stone-800 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Evident">Evident</option>
              <option value="Not Evident">Not Evident</option>
            </select>
          </div>

          <div className="text-stone-600 font-medium">
            Showing <span className="font-bold text-stone-900">{displayedRecords.length}</span> record(s)
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-6 sm:p-10 text-stone-900 font-sans print:p-6 bg-white print:text-black max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Official DepEd School Header */}
          <div className="text-center border-b-2 border-[#701628] print:border-stone-800 pb-4 mb-5">
            <div className="text-xs uppercase tracking-widest font-serif text-stone-600">
              Republic of the Philippines
            </div>
            <div className="text-sm font-bold uppercase tracking-wider font-serif text-stone-800">
              Department of Education
            </div>
            <div className="text-xs font-serif text-stone-700">
              Caraga Administrative Region XIII · Schools Division of Surigao del Sur
            </div>
            <div className="text-base font-extrabold uppercase tracking-tight text-[#701628] mt-1 font-serif print:text-black">
              {schoolProfile.schoolName}
            </div>
            <div className="text-[11px] text-stone-600">
              School ID: {schoolProfile.schoolId} · {schoolProfile.address}
            </div>
            <div className="mt-3 text-xs font-bold uppercase tracking-wider bg-amber-50 print:bg-stone-100 py-1.5 px-3 border-y border-amber-300 print:border-stone-400 text-[#701628] print:text-black">
              MONITORING TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS · CLASSROOM OBSERVATION TABLE REPORT
            </div>
          </div>

          {/* Observer & Summary Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-stone-300 p-3.5 rounded-md mb-5 bg-stone-50/70 print:bg-transparent">
            <div>
              <span className="font-semibold text-stone-600 block text-[10px] uppercase">
                Observer / Instructional Supervisor:
              </span>
              <span className="font-bold text-stone-900">{activeObserverLabel}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-600 block text-[10px] uppercase">
                Term & School Year:
              </span>
              <span className="font-bold text-stone-900">
                {selectedTerm === 'All' ? 'All Terms' : selectedTerm} · SY {schoolProfile.currentSchoolYear}
              </span>
            </div>
            <div>
              <span className="font-semibold text-stone-600 block text-[10px] uppercase">
                Date Generated:
              </span>
              <span className="font-bold text-stone-900">{currentDateFormatted}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-600 block text-[10px] uppercase">
                Summary Status:
              </span>
              <span className="font-bold text-stone-900">
                {displayedRecords.length} Total ({evidentRecordsCount} Evident, {notEvidentRecordsCount} Not Evident)
              </span>
            </div>
          </div>

          {/* Classroom Observation Records Table */}
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center justify-between">
              <span>Indicators Evaluation Matrix (E=Evident, NE=Not Evident) — Consolidated Records</span>
              <span className="text-[#701628] print:text-black">
                Live Indicator: E=(Evident), NE=(Not Evident)
              </span>
            </div>

            <table className="w-full text-left text-xs border border-stone-300 border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300 font-bold text-stone-700 uppercase text-[10px]">
                  <th className="p-2 border-r border-stone-300 w-9 text-center">No.</th>
                  <th className="p-2 border-r border-stone-300">Observation Code</th>
                  <th className="p-2 border-r border-stone-300">Date & Time</th>
                  <th className="p-2 border-r border-stone-300">Teacher Observed</th>
                  <th className="p-2 border-r border-stone-300">Subject, Grade & Topic</th>
                  <th className="p-2 border-r border-stone-300">Assigned Instructional Supervisor</th>
                  <th className="p-2 border-r border-stone-300 text-center">Live Indicator (E / NE)</th>
                  <th className="p-2 border-r border-stone-300 text-center">Status</th>
                  <th className="p-2">Commendations & Conference Notes</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-stone-500 italic">
                      No Classroom Observation Table records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((obs, idx) => {
                    const evidentCount = obs.ratings.filter(
                      (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'E'
                    ).length;
                    const notEvidentCount = obs.ratings.filter(
                      (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'NE'
                    ).length;
                    const isEvident = obs.overallRating !== 'Not Evident';

                    return (
                      <tr key={obs.id} className="border-b border-stone-200 align-top">
                        <td className="p-2 border-r border-stone-300 text-center font-bold text-stone-600">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-stone-300 font-mono font-bold text-[#701628] print:text-black whitespace-nowrap">
                          {obs.observationNo}
                        </td>
                        <td className="p-2 border-r border-stone-300 whitespace-nowrap">
                          <div className="font-bold text-stone-800">{obs.date}</div>
                          <div className="text-[10px] text-stone-500">
                            {obs.timeStart} – {obs.timeEnd}
                          </div>
                        </td>
                        <td className="p-2 border-r border-stone-300">
                          <div className="font-bold text-stone-900">{obs.teacherName}</div>
                          <div className="text-[10px] text-stone-500">{obs.department}</div>
                        </td>
                        <td className="p-2 border-r border-stone-300">
                          <div className="font-semibold text-stone-800">{obs.subjectTaught}</div>
                          <div className="text-[10px] text-stone-600">{obs.gradeAndSection}</div>
                          <div className="text-[10px] italic text-stone-500 mt-0.5">
                            Topic: {obs.topicTitle}
                          </div>
                        </td>
                        <td className="p-2 border-r border-stone-300">
                          <div className="font-bold text-stone-900">{obs.supervisorName}</div>
                          <div className="text-[10px] text-stone-500">
                            {obs.quarterTerm} · SY {obs.schoolYear}
                          </div>
                        </td>
                        <td className="p-2 border-r border-stone-300 text-center font-mono font-bold whitespace-nowrap">
                          <span className="text-[#701628] print:text-black">E:{evidentCount}</span>
                          {' / '}
                          <span className="text-rose-700 print:text-black">NE:{notEvidentCount}</span>
                        </td>
                        <td className="p-2 border-r border-stone-300 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isEvident
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {isEvident && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {obs.overallRating}
                          </span>
                        </td>
                        <td className="p-2 text-[11px] text-stone-700 leading-snug">
                          <div>
                            <span className="font-semibold text-stone-800">Strengths:</span>{' '}
                            {obs.strengths}
                          </div>
                          <div className="mt-0.5">
                            <span className="font-semibold text-stone-800">Growth Area:</span>{' '}
                            {obs.areasForDevelopment}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Formal Signatories preserving Observer and School Head details */}
          <div className="grid grid-cols-3 gap-8 pt-6 text-center text-xs break-inside-avoid">
            <div>
              <div className="border-b border-stone-800 pb-1 font-bold uppercase text-stone-900">
                {activeObserverLabel}
              </div>
              <div className="text-[11px] text-stone-600 mt-1">
                Prepared by: Assigned Instructional Supervisor / Observer
              </div>
            </div>
            <div>
              <div className="border-b border-stone-800 pb-1 font-bold uppercase text-stone-900">
                Faculty Conforme
              </div>
              <div className="text-[11px] text-stone-600 mt-1">
                Observed Teacher Representative
              </div>
            </div>
            <div>
              <div className="border-b border-stone-800 pb-1 font-bold uppercase text-stone-900">
                {schoolProfile.principalName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1">
                {schoolProfile.principalTitle} · Approving Authority
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
