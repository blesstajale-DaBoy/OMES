import React from 'react';
import { ClassroomObservation } from '../types';
import { useData } from '../context/DataContext';
import { X, Printer, Download } from 'lucide-react';

interface PrintReportModalProps {
  observation: ClassroomObservation | null;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({ observation, onClose }) => {
  const { schoolProfile } = useData();

  if (!observation) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 print:border-none print:shadow-none print:m-0 print:max-w-full">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-[#701628] text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>Official DepEd Printable Form</span>
            <span className="text-xs bg-amber-400 text-stone-900 px-2 py-0.5 rounded font-mono">
              {observation.observationNo}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 sm:p-12 text-stone-900 font-sans print:p-8 bg-white print:text-black">
          {/* Official DepEd Header */}
          <div className="text-center border-b-2 border-stone-800 pb-4 mb-6">
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
            <div className="mt-3 text-xs font-bold uppercase tracking-wider bg-stone-100 py-1 border-y border-stone-300">
              {observation.evaluationType === 'classroom'
                ? 'CLASSROOM OBSERVATION RATING SHEET FOR TEACHERS I-III & MASTER TEACHERS I-IV'
                : 'COT-PMES RATING SHEET FOR TEACHERS I-III & MASTER TEACHERS I-IV'}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border border-stone-300 p-4 rounded-md mb-6 bg-stone-50/50 print:bg-transparent">
            <div>
              <span className="font-semibold text-stone-600">OBSERVER:</span>{' '}
              <span className="font-bold">{observation.supervisorName}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-600">DATE:</span>{' '}
              <span className="font-bold">{observation.date}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-600">TEACHER OBSERVED:</span>{' '}
              <span className="font-bold">{observation.teacherName}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-600">TIME STARTED / ENDED:</span>{' '}
              <span className="font-bold">
                {observation.timeStart} – {observation.timeEnd}
              </span>
            </div>
            <div>
              <span className="font-semibold text-stone-600">SUBJECT & GRADE:</span>{' '}
              <span className="font-bold">
                {observation.subjectTaught} ({observation.gradeAndSection})
              </span>
            </div>
            <div>
              <span className="font-semibold text-stone-600">QUARTER / SY:</span>{' '}
              <span className="font-bold">
                {observation.quarterTerm} · SY {observation.schoolYear}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-stone-200">
              <span className="font-semibold text-stone-600">TOPIC / LESSON:</span>{' '}
              <span className="font-medium italic">{observation.topicTitle}</span>
            </div>
          </div>

          {/* DepEd 9 Indicators / Classroom Monitoring Tool Table */}
          <div className="mb-6">
            {observation.evaluationType === 'classroom' && (
              <div className="text-center text-xs font-bold uppercase tracking-wider text-[#701628] print:text-black mb-1.5">
                Monitoring Tool On The Conduct Of Classroom Observations
              </div>
            )}
            <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              {observation.evaluationType === 'classroom'
                ? 'Indicators Evaluation Matrix (E=Evident, NE=Not Evident)'
                : 'Objective Indicators & Rubric Rating (Scale: 3 - 7)'}
            </div>
            <table className="w-full text-left text-xs border border-stone-300 border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300 font-bold text-stone-700">
                  <th className="p-2 border-r border-stone-300 w-12 text-center">No.</th>
                  <th className="p-2 border-r border-stone-300">Objective Indicator</th>
                  <th className="p-2 border-r border-stone-300 w-20 text-center">
                    {observation.evaluationType === 'classroom' ? 'Indicator' : 'Score'}
                  </th>
                  <th className="p-2">Observer Descriptive Remarks & Evidence</th>
                </tr>
              </thead>
              <tbody>
                {observation.ratings.map((r, idx) => {
                  const sectionHeader =
                    observation.evaluationType === 'classroom'
                      ? r.indicatorId === 1
                        ? 'Before Classroom Observation'
                        : r.indicatorId === 5
                          ? 'Actual Classroom Observation'
                          : r.indicatorId === 8
                            ? 'Post Classroom Observation'
                            : null
                      : null;

                  return (
                    <React.Fragment key={r.indicatorId}>
                      {sectionHeader && (
                        <tr className="bg-amber-50/70 border-b border-stone-300">
                          <td
                            colSpan={4}
                            className="p-1.5 text-center font-bold uppercase tracking-wider text-stone-800 text-[11px]"
                          >
                            {sectionHeader}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-stone-200">
                        <td className="p-2 border-r border-stone-300 text-center font-bold text-stone-600">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-stone-300 font-medium text-stone-800">
                          {r.title}
                        </td>
                        <td className="p-2 border-r border-stone-300 text-center font-bold text-sm font-mono text-[#701628] print:text-black">
                          {observation.evaluationType === 'classroom'
                            ? r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')
                            : r.score}
                        </td>
                        <td className="p-2 text-stone-600 italic text-[11px]">
                          {r.comments || 'Demonstrated consistent performance indicator.'}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-400">
                  {observation.evaluationType === 'classroom' ? (
                    <>
                      <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider text-stone-800">
                        Live Indicator: E=(Evident), NE=(Not Evident)
                      </td>
                      <td className="p-2.5 text-center font-mono text-sm text-[#701628] print:text-black">
                        E:{observation.ratings.filter((r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'E').length} / NE:{observation.ratings.filter((r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'NE').length}
                      </td>
                      <td className="p-2.5 text-xs text-stone-800 font-semibold uppercase">
                        Status: <span className="font-bold underline">{observation.overallRating}</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider text-stone-800">
                        Observation Mean Score / Overall Performance:
                      </td>
                      <td className="p-2.5 text-center font-mono text-base text-[#701628] print:text-black">
                        {observation.averageScore.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-xs text-stone-800 font-semibold uppercase">
                        Rating: <span className="font-bold underline">{observation.overallRating}</span>
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Qualitative Notes */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-8">
            <div className="border border-stone-300 p-3 rounded">
              <div className="font-bold text-stone-700 uppercase mb-1">Commendations & Strengths:</div>
              <p className="text-stone-600 leading-relaxed text-[11px]">{observation.strengths}</p>
            </div>
            <div className="border border-stone-300 p-3 rounded">
              <div className="font-bold text-stone-700 uppercase mb-1">Areas for Development & Next Steps:</div>
              <p className="text-stone-600 leading-relaxed text-[11px]">{observation.areasForDevelopment}</p>
            </div>
          </div>

          {/* Post Conference Agreement */}
          <div className="border border-stone-300 p-3 rounded text-xs mb-8">
            <div className="font-bold text-stone-700 uppercase mb-1">Post-Observation Conference Agreement:</div>
            <p className="text-stone-600 leading-relaxed text-[11px]">{observation.postConferenceNotes}</p>
          </div>

          {/* Signatures Block (Standard DepEd Layout) */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900">
                {observation.supervisorName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1">Observer / Instructional Supervisor</div>
              <div className="text-[10px] text-stone-400">Date: {observation.date}</div>
            </div>

            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900">
                {observation.teacherName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1">Teacher Observed (Conforme)</div>
              <div className="text-[10px] text-stone-400">
                Date: {observation.teacherSignatureDate || observation.date}
              </div>
            </div>

            <div>
              <div className="border-b border-stone-800 pb-1 font-bold text-stone-900">
                {schoolProfile.principalName}
              </div>
              <div className="text-[11px] text-stone-600 mt-1">{schoolProfile.principalTitle}</div>
              <div className="text-[10px] text-stone-400">School Head / Approving Authority</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
