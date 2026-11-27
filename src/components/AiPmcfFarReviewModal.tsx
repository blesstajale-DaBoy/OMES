import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  AiGeneratedPmcfPayload,
  AiGeneratedFarPayload,
  PMCFRecord,
  getFarCategory,
} from '../types';
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Printer,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  Loader2,
  Table2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const AiPmcfFarReviewModal: React.FC = () => {
  const {
    activeAiDraft,
    dismissAiDraft,
    regenerateAiDraft,
    saveReviewedAiPmcfFar,
    farRecords,
    schoolProfile,
  } = useData();

  const [pmcfDate, setPmcfDate] = useState('');
  const [pmcfCriticalIncidents, setPmcfCriticalIncidents] = useState('');
  const [pmcfActionPlan, setPmcfActionPlan] = useState('');
  const [pmcfExpectedOutput, setPmcfExpectedOutput] = useState('');
  const [pmcfStatus, setPmcfStatus] = useState<PMCFRecord['status']>('In Progress');

  const [farTeacher, setFarTeacher] = useState('');
  const [farFindings, setFarFindings] = useState('');
  const [farAnalysis, setFarAnalysis] = useState('');
  const [farRecommendations, setFarRecommendations] = useState('');

  const [savedNotice, setSavedNotice] = useState(false);
  const [showConsolidatedPreview, setShowConsolidatedPreview] = useState(false);

  useEffect(() => {
    if (!activeAiDraft) {
      setSavedNotice(false);
      setShowConsolidatedPreview(false);
      return;
    }

    setPmcfStatus(activeAiDraft.resolved ? 'Resolved' : 'In Progress');
    setSavedNotice(false);

    if (activeAiDraft.generated) {
      setPmcfDate(activeAiDraft.generated.pmcf.date || activeAiDraft.date);
      setPmcfCriticalIncidents(activeAiDraft.generated.pmcf.critical_incidents_and_outputs || '');
      setPmcfActionPlan(activeAiDraft.generated.pmcf.action_plan_intervention || '');
      setPmcfExpectedOutput(activeAiDraft.generated.pmcf.expected_output || '');

      setFarTeacher(
        activeAiDraft.generated.far.teacher ||
          `${activeAiDraft.teacherName}${activeAiDraft.subjectGrade ? ` (${activeAiDraft.subjectGrade})` : ''}`
      );
      setFarFindings(activeAiDraft.generated.far.findings || '');
      setFarAnalysis(activeAiDraft.generated.far.analysis || '');
      setFarRecommendations(activeAiDraft.generated.far.recommendations || '');
    } else if (!activeAiDraft.loading) {
      setPmcfDate(activeAiDraft.date);
      setFarTeacher(
        `${activeAiDraft.teacherName}${activeAiDraft.subjectGrade ? ` (${activeAiDraft.subjectGrade})` : ''}`
      );
    }
  }, [activeAiDraft]);

  const consolidatedCategoryFarRows = useMemo(() => {
    if (!activeAiDraft) return [];
    const existing = farRecords.filter(
      (r) =>
        getFarCategory(r) === activeAiDraft.category &&
        r.sourceRecordId !== activeAiDraft.sourceRecordId
    );
    return [
      {
        id: 'draft-current',
        isCurrentDraft: true,
        teacher: farTeacher || activeAiDraft.teacherName,
        findings: farFindings,
        analysis: farAnalysis,
        recommendations: farRecommendations,
      },
      ...existing.map((r) => ({
        id: r.id,
        isCurrentDraft: false,
        teacher: r.teacherName,
        findings: r.findings,
        analysis: r.analysis,
        recommendations: r.recommendations,
      })),
    ];
  }, [activeAiDraft, farRecords, farTeacher, farFindings, farAnalysis, farRecommendations]);

  if (!activeAiDraft) return null;

  const canSave =
    !activeAiDraft.loading &&
    (pmcfCriticalIncidents.trim().length > 0 ||
      farFindings.trim().length > 0 ||
      farRecommendations.trim().length > 0);

  const buildEditedPayloads = (): {
    pmcf: AiGeneratedPmcfPayload;
    far: AiGeneratedFarPayload;
  } => ({
    pmcf: {
      date: pmcfDate.trim() || activeAiDraft.date,
      critical_incidents_and_outputs: pmcfCriticalIncidents.trim(),
      action_plan_intervention: pmcfActionPlan.trim(),
      expected_output: pmcfExpectedOutput.trim(),
    },
    far: {
      teacher: farTeacher.trim() || activeAiDraft.teacherName,
      findings: farFindings.trim(),
      analysis: farAnalysis.trim(),
      recommendations: farRecommendations.trim(),
    },
  });

  const handleSave = (closeAfter = false) => {
    const { pmcf, far } = buildEditedPayloads();
    saveReviewedAiPmcfFar(pmcf, far, pmcfStatus);
    setSavedNotice(true);
    if (closeAfter) {
      setTimeout(() => {
        dismissAiDraft();
      }, 450);
    }
  };

  const printHtmlInHiddenIframe = (html: string) => {
    const existing = document.getElementById('omes-ai-pmcf-far-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'omes-ai-pmcf-far-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 250);
    }
  };

  const handleSaveAndPrintCombined = () => {
    const { pmcf, far } = buildEditedPayloads();
    saveReviewedAiPmcfFar(pmcf, far, pmcfStatus);
    setSavedNotice(true);

    const evaluatorLabel =
      activeAiDraft.evaluatorRole === 'mentor'
        ? activeAiDraft.mentorName || activeAiDraft.supervisorName
        : activeAiDraft.supervisorName;
    const evaluatorRoleTitle =
      activeAiDraft.evaluatorRole === 'mentor' ? 'Assigned Mentor' : 'Instructional Supervisor';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PMCF_and_FAR_${escapeHtml(activeAiDraft.sourceCode)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 11px; }
    .hdr { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 8px; margin-bottom: 14px; }
    .hdr h4 { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #475569; }
    .hdr h3 { margin: 2px 0; font-size: 12px; text-transform: uppercase; color: #1e293b; }
    .hdr h2 { margin: 4px 0; font-size: 16px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .hdr p { margin: 2px 0; font-size: 10px; color: #64748b; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 4px; margin-bottom: 14px; font-size: 10.5px; }
    .section-title { background: #701628; color: #ffffff; padding: 6px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 12px; margin-bottom: 0; border-radius: 4px 4px 0 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; text-align: left; line-height: 1.45; }
    th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    .signatories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 28px; text-align: center; page-break-inside: avoid; }
    .sign-line { border-bottom: 1px solid #0f172a; padding-bottom: 4px; font-weight: 700; margin-bottom: 4px; }
    .sign-role { font-size: 10px; color: #475569; }
  </style>
</head>
<body>
  <div class="hdr">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education · Caraga Administrative Region XIII</h3>
    <h2>${escapeHtml(schoolProfile.schoolName)}</h2>
    <p>School ID: ${escapeHtml(schoolProfile.schoolId)} · ${escapeHtml(schoolProfile.address)}</p>
  </div>

  <div class="meta">
    <div><strong>Evaluation Tool:</strong> ${escapeHtml(activeAiDraft.evaluationType)}</div>
    <div><strong>Reference Code:</strong> ${escapeHtml(activeAiDraft.sourceCode)}</div>
    <div><strong>Date &amp; Term:</strong> ${escapeHtml(pmcf.date)} (${escapeHtml(activeAiDraft.term)})</div>
    <div><strong>${escapeHtml(evaluatorRoleTitle)}:</strong> ${escapeHtml(evaluatorLabel)}</div>
  </div>

  <div class="section-title">1. Performance Monitoring and Coaching Form (PMCF)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 11%;">Date</th>
        <th style="width: 31%;">Critical Incidents / Outputs (Strengths &amp; Areas for Improvement)</th>
        <th style="width: 31%;">Coaching Action Plan / Intervention</th>
        <th style="width: 27%;">Expected Output</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(pmcf.date)}<br/><span style="color:#64748b;font-size:10px;">Status: ${escapeHtml(pmcfStatus)}</span></td>
        <td>${escapeHtml(pmcf.critical_incidents_and_outputs).replace(/\n/g, '<br/>')}</td>
        <td>${escapeHtml(pmcf.action_plan_intervention).replace(/\n/g, '<br/>')}</td>
        <td>${escapeHtml(pmcf.expected_output).replace(/\n/g, '<br/>')}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2. Findings, Analysis, and Recommendations (FAR)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Teacher</th>
        <th style="width: 28%;">Findings</th>
        <th style="width: 27%;">Analysis</th>
        <th style="width: 27%;">Recommendations</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${escapeHtml(far.teacher)}</strong></td>
        <td>${escapeHtml(far.findings).replace(/\n/g, '<br/>')}</td>
        <td>${escapeHtml(far.analysis).replace(/\n/g, '<br/>')}</td>
        <td>${escapeHtml(far.recommendations).replace(/\n/g, '<br/>')}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatories">
    <div>
      <div class="sign-line">${escapeHtml(activeAiDraft.teacherName)}</div>
      <div class="sign-role">Ratee / Teacher Conforme</div>
    </div>
    <div>
      <div class="sign-line">${escapeHtml(evaluatorLabel)}</div>
      <div class="sign-role">Rater / ${escapeHtml(evaluatorRoleTitle)}</div>
    </div>
    <div>
      <div class="sign-line">${escapeHtml(schoolProfile.principalName)}</div>
      <div class="sign-role">${escapeHtml(schoolProfile.principalTitle)}</div>
    </div>
  </div>
</body>
</html>`;

    printHtmlInHiddenIframe(html);
  };

  const handlePrintConsolidatedFourColumnFar = () => {
    const rowsHtml = consolidatedCategoryFarRows
      .map(
        (row) => `<tr>
          <td><strong>${escapeHtml(row.teacher)}</strong></td>
          <td>${escapeHtml(row.findings).replace(/\n/g, '<br/>')}</td>
          <td>${escapeHtml(row.analysis).replace(/\n/g, '<br/>')}</td>
          <td>${escapeHtml(row.recommendations).replace(/\n/g, '<br/>')}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Consolidated_FAR_${escapeHtml(activeAiDraft.category)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 11px; }
    .hdr { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 8px; margin-bottom: 12px; }
    .hdr h4 { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #475569; }
    .hdr h3 { margin: 2px 0; font-size: 12px; text-transform: uppercase; color: #1e293b; }
    .hdr h2 { margin: 4px 0; font-size: 16px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 5px 10px; margin-top: 8px; font-weight: 700; font-size: 11px; color: #701628; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; text-align: left; line-height: 1.45; }
    th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <div class="hdr">
    <h4>Republic of the Philippines · Department of Education</h4>
    <h3>Caraga Administrative Region XIII · Schools Division of Surigao del Sur</h3>
    <h2>${escapeHtml(schoolProfile.schoolName)}</h2>
    <div class="banner">Consolidated Findings, Analysis, and Recommendations (FAR) — ${escapeHtml(activeAiDraft.evaluationType)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Teacher</th>
        <th style="width: 28%;">Findings</th>
        <th style="width: 27%;">Analysis</th>
        <th style="width: 27%;">Recommendations</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

    printHtmlInHiddenIframe(html);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-3 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#701628] text-white px-5 py-4 flex items-start sm:items-center justify-between gap-3 border-b border-amber-400/30 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  AI-Generated PMCF &amp; FAR Review &amp; Approval
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-stone-900">
                  {activeAiDraft.evaluationType}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 text-amber-100">
                  {activeAiDraft.sourceCode}
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 mt-0.5">
                Review and adjust the DepEd PPST-aligned PMCF and 4-column FAR entries below before saving or printing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissAiDraft}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Evaluation Context Strip */}
        <div className="bg-stone-50 border-b border-stone-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] shrink-0">
          <div>
            <span className="text-stone-500 font-semibold block uppercase text-[9.5px]">
              Teacher / Ratee
            </span>
            <span className="font-bold text-stone-900">{activeAiDraft.teacherName}</span>
            <span className="text-stone-500 ml-1">({activeAiDraft.careerStage})</span>
          </div>
          <div>
            <span className="text-stone-500 font-semibold block uppercase text-[9.5px]">
              Subject &amp; Grade
            </span>
            <span className="font-semibold text-stone-800">{activeAiDraft.subjectGrade}</span>
          </div>
          <div>
            <span className="text-stone-500 font-semibold block uppercase text-[9.5px]">
              Term &amp; Date
            </span>
            <span className="font-semibold text-stone-800">
              {activeAiDraft.term} · {activeAiDraft.date}
            </span>
          </div>
          <div>
            <span className="text-stone-500 font-semibold block uppercase text-[9.5px]">
              Evaluator / Rater
            </span>
            <span className="font-semibold text-[#701628]">
              {activeAiDraft.evaluatorRole === 'mentor'
                ? `${activeAiDraft.mentorName || activeAiDraft.supervisorName} (Mentor)`
                : activeAiDraft.supervisorName}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Loading Banner */}
          {activeAiDraft.loading && (
            <div className="p-5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-[#701628] animate-spin shrink-0" />
              <div>
                <div className="font-bold text-stone-900 text-sm">
                  Generating PMCF &amp; FAR...
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  Analyzing evaluation ratings and observer notes with Gemini Structured Outputs to draft PPST-aligned PMCF and 4-column FAR entries for {activeAiDraft.teacherName}.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {!activeAiDraft.loading && activeAiDraft.error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">
                    Automatic Gemini PMCF &amp; FAR Generation Encountered an Error
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">{activeAiDraft.error}</p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    You may retry AI generation or manually complete and save the editable PMCF and FAR forms below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={regenerateAiDraft}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Gemini Generation</span>
              </button>
            </div>
          )}

          {/* Saved Toast */}
          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                PMCF and 4-column FAR have been saved to the OMES database and appended to the consolidated FAR table!
              </span>
            </div>
          )}

          {/* SECTION 1: Editable PMCF Form */}
          <div className="rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="bg-stone-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <span>1. Performance Monitoring and Coaching Form (PMCF) — Editable</span>
              </div>
              <span className="text-[10px] text-stone-300">
                DepEd RPMS-PPST Form 3
              </span>
            </div>

            <div className="p-4 bg-white space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Date of Observation / Evaluation
                  </label>
                  <input
                    type="date"
                    value={pmcfDate}
                    onChange={(e) => setPmcfDate(e.target.value)}
                    disabled={activeAiDraft.loading}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Coaching Status
                  </label>
                  <select
                    value={pmcfStatus}
                    onChange={(e) => setPmcfStatus(e.target.value as PMCFRecord['status'])}
                    disabled={activeAiDraft.loading}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Scheduled Follow-up">Scheduled Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Critical Incidents / Outputs (Strengths &amp; Areas for Improvement)
                </label>
                <textarea
                  rows={3}
                  value={pmcfCriticalIncidents}
                  onChange={(e) => setPmcfCriticalIncidents(e.target.value)}
                  disabled={activeAiDraft.loading}
                  placeholder="Summary of observed strengths and specific performance gaps based on the evaluation..."
                  className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Coaching Action Plan / Intervention
                  </label>
                  <textarea
                    rows={3}
                    value={pmcfActionPlan}
                    onChange={(e) => setPmcfActionPlan(e.target.value)}
                    disabled={activeAiDraft.loading}
                    placeholder="Agreed technical assistance, coaching steps, and timeline..."
                    className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Expected Output
                  </label>
                  <textarea
                    rows={3}
                    value={pmcfExpectedOutput}
                    onChange={(e) => setPmcfExpectedOutput(e.target.value)}
                    disabled={activeAiDraft.loading}
                    placeholder="Expected improvement in teaching practice, lesson plan, assessment, or instructional material..."
                    className="w-full border border-stone-300 rounded-lg p-2.5 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Editable 4-Column FAR Table */}
          <div className="rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="bg-[#701628] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                <FileText className="w-4 h-4 text-amber-300" />
                <span>2. Findings, Analysis, and Recommendations (FAR) — Editable 4-Column Table</span>
              </div>
              <span className="text-[10px] text-amber-200">
                Exact Headers: Teacher | Findings | Analysis | Recommendations
              </span>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-amber-50/90 border-b border-stone-300 text-[11px] font-bold uppercase text-stone-800">
                    <th className="px-3 py-2.5 border-r border-stone-200 w-[18%]">Teacher</th>
                    <th className="px-3 py-2.5 border-r border-stone-200 w-[28%]">Findings</th>
                    <th className="px-3 py-2.5 border-r border-stone-200 w-[27%]">Analysis</th>
                    <th className="px-3 py-2.5 w-[27%]">Recommendations</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    <td className="p-2 border-r border-stone-200">
                      <textarea
                        rows={5}
                        value={farTeacher}
                        onChange={(e) => setFarTeacher(e.target.value)}
                        disabled={activeAiDraft.loading}
                        placeholder="Teacher Full Name (Grade & Subject)"
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs font-semibold text-stone-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                      />
                    </td>
                    <td className="p-2 border-r border-stone-200">
                      <textarea
                        rows={5}
                        value={farFindings}
                        onChange={(e) => setFarFindings(e.target.value)}
                        disabled={activeAiDraft.loading}
                        placeholder="Concrete observable facts, scores, strengths, and gaps..."
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                      />
                    </td>
                    <td className="p-2 border-r border-stone-200">
                      <textarea
                        rows={5}
                        value={farAnalysis}
                        onChange={(e) => setFarAnalysis(e.target.value)}
                        disabled={activeAiDraft.loading}
                        placeholder="Instructional root cause and impact on student learning..."
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                      />
                    </td>
                    <td className="p-2">
                      <textarea
                        rows={5}
                        value={farRecommendations}
                        onChange={(e) => setFarRecommendations(e.target.value)}
                        disabled={activeAiDraft.loading}
                        placeholder="Specific, actionable technical assistance and recommendations..."
                        className="w-full border border-stone-300 rounded-lg p-2 text-xs text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#701628] disabled:bg-stone-100"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Consolidated 4-Column FAR Table Preview */}
          <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowConsolidatedPreview((v) => !v)}
                className="flex items-center gap-2 text-xs font-bold text-stone-800 hover:text-[#701628] cursor-pointer"
              >
                <Table2 className="w-4 h-4 text-[#701628]" />
                <span>
                  Consolidated 4-Column FAR Table ({consolidatedCategoryFarRows.length} Teachers in {activeAiDraft.evaluationType})
                </span>
                {showConsolidatedPreview ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handlePrintConsolidatedFourColumnFar}
                disabled={activeAiDraft.loading}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#701628]" />
                <span>Print Consolidated 4-Column FAR</span>
              </button>
            </div>

            {showConsolidatedPreview && (
              <div className="overflow-x-auto border-t border-stone-200 bg-white max-h-60 overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 bg-stone-100 border-b border-stone-300 uppercase text-[10px] text-stone-700">
                    <tr>
                      <th className="px-3 py-2 border-r border-stone-200 w-[18%]">Teacher</th>
                      <th className="px-3 py-2 border-r border-stone-200 w-[28%]">Findings</th>
                      <th className="px-3 py-2 border-r border-stone-200 w-[27%]">Analysis</th>
                      <th className="px-3 py-2 w-[27%]">Recommendations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {consolidatedCategoryFarRows.map((row) => (
                      <tr
                        key={row.id}
                        className={row.isCurrentDraft ? 'bg-amber-50/70' : 'bg-white'}
                      >
                        <td className="px-3 py-2 border-r border-stone-200 font-bold text-stone-900">
                          {row.teacher}
                          {row.isCurrentDraft && (
                            <span className="block text-[9px] font-bold uppercase text-[#701628] mt-0.5">
                              New Draft Row
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-stone-200 text-stone-700 whitespace-pre-wrap">
                          {row.findings || '—'}
                        </td>
                        <td className="px-3 py-2 border-r border-stone-200 text-stone-700 whitespace-pre-wrap">
                          {row.analysis || '—'}
                        </td>
                        <td className="px-3 py-2 text-stone-700 whitespace-pre-wrap">
                          {row.recommendations || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={regenerateAiDraft}
              disabled={activeAiDraft.loading}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activeAiDraft.loading ? 'animate-spin' : ''}`} />
              <span>Regenerate with Gemini</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={dismissAiDraft}
              className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
            >
              {savedNotice ? 'Close' : 'Skip / Close'}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={!canSave}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save PMCF &amp; FAR to Database</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndPrintCombined}
              disabled={!canSave}
              className="px-4 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Save &amp; Print Official PMCF + FAR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
