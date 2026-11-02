import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PMCFRecord } from '../types';
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

interface PrintPmcfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedRecordId?: string | null;
  records?: PMCFRecord[];
}

export const PrintPmcfReportModal: React.FC<PrintPmcfReportModalProps> = ({
  isOpen,
  onClose,
  initialSelectedRecordId,
  records,
}) => {
  const { pmcfRecords, schoolProfile, teachers } = useData();
  const { currentUser } = useAuth();
  const sourceRecords = records ?? pmcfRecords;

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

  // Filter records according to user selection in preview modal
  const displayedRecords = sourceRecords.filter((r) => {
    if (includeOnlySelectedRecord && initialSelectedRecordId) {
      return r.id === initialSelectedRecordId;
    }
    const matchesTerm = selectedTerm === 'All' || r.quarterTerm === selectedTerm;
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    const matchesTeacher = selectedTeacherId === 'All' || r.teacherId === selectedTeacherId;
    return matchesTerm && matchesStatus && matchesTeacher;
  });

  const resolvedCount = displayedRecords.filter((r) => r.status === 'Resolved').length;
  const inProgressCount = displayedRecords.filter((r) => r.status === 'In Progress').length;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // Direct downloadable HTML report that auto-triggers print to PDF
  const handleDownloadOfflineReport = () => {
    const tableRowsHtml = displayedRecords
      .map((r) => {
        const isResolved = r.status === 'Resolved';
        return `
        <tr style="border-bottom: 1px solid #cbd5e1; vertical-align: top; font-size: 11px;">
          <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #701628; border-right: 1px solid #cbd5e1; text-align: center;">
            ${r.recordNo}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            <strong>${r.date}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">${r.quarterTerm}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">
            <strong style="color: #0f172a;">${r.teacherName}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">Coach: ${r.supervisorName}</span>
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; font-weight: 600; color: #92400e;">
            ${r.coachingMechanism}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${r.criticalIncidentDescription.replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${r.actionPlanOutput.replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; line-height: 1.4;">
            ${(r.impactOnJobPerformance || 'Pending post-evaluation.').replace(/\n/g, '<br/>')}
          </td>
          <td style="padding: 8px; text-align: center; border-right: 1px solid #cbd5e1; white-space: nowrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; ${
              isResolved
                ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                : 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
            }">
              ${r.status}
            </span>
          </td>
        </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DepEd_PMCF_Report_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}</title>
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
    <div><strong>Official DepEd PMCF Document Ready</strong> - Click "Print / Save as PDF" below or press Ctrl+P / Cmd+P to save as official PDF.</div>
    <button onclick="window.print()" style="background: #fbbf24; color: #000; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education</h3>
    <p>Caraga Administrative Region XIII · Schools Division of Surigao del Sur</p>
    <h2>${schoolProfile.schoolName}</h2>
    <p>School ID: ${schoolProfile.schoolId} · ${schoolProfile.address}</p>
    <div class="title-banner">
      PERFORMANCE MONITORING AND COACHING FORM (PMCF) · DEPED RPMS FORM 3
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Reporting Scope:</strong> ${selectedTerm === 'All' ? 'All Terms (Consolidated)' : selectedTerm}</div>
    <div class="meta-item"><strong>Date Generated:</strong> ${currentDateFormatted}</div>
    <div class="meta-item"><strong>Total Records:</strong> ${displayedRecords.length} (${resolvedCount} Resolved, ${inProgressCount} In Progress)</div>
    <div class="meta-item"><strong>Rater / Supervisor:</strong> ${currentUser.fullName}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 90px; text-align: center;">Record No.</th>
        <th style="width: 85px;">Date & Term</th>
        <th style="width: 140px;">Teacher (Ratee)</th>
        <th style="width: 120px;">Coaching Mechanism</th>
        <th>Critical Incident Description</th>
        <th>Output / Action Plan</th>
        <th>Impact on Job Performance</th>
        <th style="width: 80px; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="signatories">
    <div>
      <div class="sign-line">${currentUser.fullName}</div>
      <div class="sign-title">Rater / Instructional Supervisor</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Date: ${currentDateFormatted}</div>
    </div>
    <div>
      <div class="sign-line">Faculty Conforme</div>
      <div class="sign-title">Ratee / Teacher Signature</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Barobo National High School</div>
    </div>
    <div>
      <div class="sign-line">${schoolProfile.principalName}</div>
      <div class="sign-title">${schoolProfile.principalTitle}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Secondary School Head</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.focus();
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `DepEd_PMCF_Report_${schoolProfile.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="bg-[#701628] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                Print / Download PMCF Official Report (PDF)
              </h3>
              <p className="text-[11px] text-amber-200/90">
                DepEd RPMS Form 3 · Performance Monitoring and Coaching Form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadOfflineReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              title="Open standalone printable HTML page or save to PDF"
            >
              <Download className="w-4 h-4" />
              <span>Down PMCF (PDF)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              title="Print document using browser dialog"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Configuration Ribbon */}
        <div className="bg-stone-50 border-b border-stone-200 p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-stone-700">
              <Filter className="w-3.5 h-3.5 text-[#701628]" />
              <span>Scope Filters:</span>
            </div>

            {/* Term Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200">
              <span className="text-stone-500 font-medium">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="All">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200">
              <span className="text-stone-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Resolved">Resolved</option>
                <option value="In Progress">In Progress</option>
                <option value="Scheduled Follow-up">Scheduled Follow-up</option>
              </select>
            </div>

            {/* Teacher Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200">
              <span className="text-stone-500 font-medium">Teacher:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="All">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox if single record opened */}
            {initialSelectedRecordId && (
              <label className="flex items-center gap-1.5 font-medium text-stone-700 cursor-pointer bg-white px-2 py-1 rounded border border-stone-200">
                <input
                  type="checkbox"
                  checked={includeOnlySelectedRecord}
                  onChange={(e) => setIncludeOnlySelectedRecord(e.target.checked)}
                  className="rounded text-[#701628] focus:ring-[#701628]"
                />
                <span>Current Record Only</span>
              </label>
            )}
          </div>

          <div className="text-[11px] font-semibold text-stone-500">
            Previewing: <span className="font-bold text-[#701628]">{displayedRecords.length}</span> record(s)
          </div>
        </div>

        {/* Printable DepEd Document Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-stone-100 flex-1">
          <div className="bg-white border border-stone-300 shadow-sm p-6 sm:p-8 rounded-lg max-w-4xl mx-auto text-stone-900 print:border-none print:shadow-none print:p-0">
            {/* DepEd Official Document Header */}
            <div className="text-center border-b-2 border-[#701628] pb-3 mb-4">
              <div className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                Republic of the Philippines
              </div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-stone-800">
                Department of Education
              </div>
              <div className="text-[11px] text-stone-600">
                Caraga Administrative Region XIII · Schools Division of Surigao del Sur
              </div>
              <h1 className="text-lg font-black text-[#701628] uppercase mt-1">
                {schoolProfile.schoolName}
              </h1>
              <div className="text-[10px] text-stone-500">
                School ID: {schoolProfile.schoolId} · {schoolProfile.address}
              </div>

              <div className="mt-3 py-1 px-3 bg-stone-50 border border-stone-200 rounded font-bold text-xs uppercase tracking-wider text-stone-800">
                PERFORMANCE MONITORING AND COACHING FORM (PMCF) · DEPED RPMS FORM 3
              </div>
            </div>

            {/* Meta Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-stone-50 border border-stone-200 rounded-md text-[11px] mb-4">
              <div>
                <span className="font-bold text-stone-500 block">Rating Period:</span>
                <span className="font-semibold text-stone-800">SY 2026-2027 ({selectedTerm})</span>
              </div>
              <div>
                <span className="font-bold text-stone-500 block">Date Generated:</span>
                <span className="font-semibold text-stone-800">{currentDateFormatted}</span>
              </div>
              <div>
                <span className="font-bold text-stone-500 block">Total Records:</span>
                <span className="font-semibold text-stone-800">
                  {displayedRecords.length} ({resolvedCount} Resolved)
                </span>
              </div>
              <div>
                <span className="font-bold text-stone-500 block">Rater / Coach:</span>
                <span className="font-semibold text-stone-800">{currentUser.fullName}</span>
              </div>
            </div>

            {/* Official Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-stone-300 text-[11px]">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    <th className="border border-stone-300 py-2 px-2.5 w-24 text-center">Record No.</th>
                    <th className="border border-stone-300 py-2 px-2.5 w-24">Date & Term</th>
                    <th className="border border-stone-300 py-2 px-2.5 w-36">Ratee / Teacher</th>
                    <th className="border border-stone-300 py-2 px-2.5 w-28">Mechanism</th>
                    <th className="border border-stone-300 py-2 px-2.5">Critical Incident</th>
                    <th className="border border-stone-300 py-2 px-2.5">Output / Action Plan</th>
                    <th className="border border-stone-300 py-2 px-2.5">Impact on Performance</th>
                    <th className="border border-stone-300 py-2 px-2.5 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {displayedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                        No PMCF coaching intervention records match the selected preview filters.
                      </td>
                    </tr>
                  ) : (
                    displayedRecords.map((r) => {
                      const isResolved = r.status === 'Resolved';
                      return (
                        <tr key={r.id} className="align-top hover:bg-stone-50/50">
                          <td className="border border-stone-300 py-2 px-2.5 font-mono font-bold text-[#701628] text-center">
                            {r.recordNo}
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5">
                            <div className="font-bold">{r.date}</div>
                            <div className="text-[10px] text-stone-500">{r.quarterTerm}</div>
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5">
                            <div className="font-bold text-stone-900">{r.teacherName}</div>
                            <div className="text-[10px] text-stone-500">Coach: {r.supervisorName}</div>
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5 font-semibold text-amber-900">
                            {r.coachingMechanism}
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5 text-stone-800 leading-snug">
                            {r.criticalIncidentDescription}
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5 text-stone-700 leading-snug">
                            {r.actionPlanOutput}
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5 text-stone-700 leading-snug">
                            {r.impactOnJobPerformance || 'Pending post-evaluation.'}
                          </td>
                          <td className="border border-stone-300 py-2 px-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                isResolved
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Official DepEd Signatories Block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 pt-4 border-t border-stone-200 text-center text-xs">
              <div>
                <div className="font-bold border-b border-stone-900 pb-1 text-stone-900">
                  {currentUser.fullName}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Rater / Instructional Supervisor</div>
                <div className="text-[10px] text-stone-400 font-mono mt-0.5">Date: {currentDateFormatted}</div>
              </div>

              <div>
                <div className="font-bold border-b border-stone-900 pb-1 text-stone-900">
                  Faculty Conforme
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Ratee / Teacher Signature</div>
                <div className="text-[10px] text-stone-400 font-mono mt-0.5">DepEd Barobo NHS</div>
              </div>

              <div>
                <div className="font-bold border-b border-stone-900 pb-1 text-stone-900">
                  {schoolProfile.principalName}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">{schoolProfile.principalTitle}</div>
                <div className="text-[10px] text-stone-400 font-mono mt-0.5">Secondary School Head</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-3 px-5 flex items-center justify-between shrink-0 text-xs">
          <div className="text-stone-500">
            Form conforming to <span className="font-bold text-stone-700">DepEd Order No. 2, s. 2015</span> & RPMS PPST.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-100 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
