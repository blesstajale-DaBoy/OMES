import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InstructionalMaterialQA } from '../types';
import {
  matchesRoleSupervisionScope,
  SupervisionScopeBanner,
  resolveRecordSupervisor,
  resolveRecordSupervisorName,
  resolveActiveSupervisorForUser,
  getScopedTeachersForModal,
} from '../utils/supervisionScope';
import {
  BookOpen,
  Plus,
  Search,
  X,
  Trash2,
  ExternalLink,
  Pencil,
} from 'lucide-react';

export const ImsAssessmentsView: React.FC = () => {
  const {
    imsQA,
    teachers,
    supervisors,
    addIMQA,
    updateIMQA,
    deleteIMQA,
  } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const [isIMModalOpen, setIsIMModalOpen] = useState(false);
  const [isLMModalOpen, setIsLMModalOpen] = useState(false);

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors);

  // Edit States
  const [editingIM, setEditingIM] = useState<InstructionalMaterialQA | null>(null);

  // New IM Form
  const [imTitle, setImTitle] = useState('');
  const [imType, setImType] = useState<InstructionalMaterialQA['type']>('Learner Activity Sheet (LAS)');
  const [imTeacherId, setImTeacherId] = useState(teachers[0]?.id || '');
  const [imGradeSubject, setImGradeSubject] = useState('Science 9');
  const [imFileUrl, setImFileUrl] = useState('');

  // New LM Form State
  const [lmTitle, setLmTitle] = useState('');
  const [lmType, setLmType] = useState<InstructionalMaterialQA['type']>('Self-Learning Module (SLM)');
  const [lmTeacherId, setLmTeacherId] = useState(teachers[0]?.id || '');
  const [lmGradeSubject, setLmGradeSubject] = useState('Mathematics 10');
  const [lmFileUrl, setLmFileUrl] = useState('');

  // Edit IM / LM Form State
  const [editImTitle, setEditImTitle] = useState('');
  const [editImKind, setEditImKind] = useState<'IM' | 'LM'>('IM');
  const [editImType, setEditImType] = useState<InstructionalMaterialQA['type']>('Learner Activity Sheet (LAS)');
  const [editImTeacherId, setEditImTeacherId] = useState('');
  const [editImGradeSubject, setEditImGradeSubject] = useState('');
  const [editImFileUrl, setEditImFileUrl] = useState('');
  const [editImStatus, setEditImStatus] = useState<InstructionalMaterialQA['status']>('Approved for Use');
  const [editImEvaluatorNotes, setEditImEvaluatorNotes] = useState('');
  const [editImMelc, setEditImMelc] = useState(true);
  const [editImAccuracy, setEditImAccuracy] = useState(true);
  const [editImCopyright, setEditImCopyright] = useState(true);
  const [editImVisual, setEditImVisual] = useState(true);

  const filteredIMs = imsQA.filter((im) => {
    if (
      !matchesRoleSupervisionScope(
        im,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(im, teachers, supervisors);
    const q = searchQuery.toLowerCase();
    return (
      im.title.toLowerCase().includes(q) ||
      im.teacherName.toLowerCase().includes(q) ||
      im.gradeSubject.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const openEditIMModal = (im: InstructionalMaterialQA) => {
    setEditingIM(im);
    setEditImTitle(im.title);
    setEditImKind(im.materialKind || 'IM');
    setEditImType(im.type);
    const matchedTeacher =
      teachers.find((t) => t.id === im.teacherId) ||
      teachers.find((t) => t.fullName === im.teacherName) ||
      teachers[0];
    setEditImTeacherId(matchedTeacher?.id || im.teacherId);
    setEditImGradeSubject(im.gradeSubject);
    setEditImFileUrl(im.fileUrl || '');
    setEditImStatus(im.status);
    setEditImEvaluatorNotes(im.evaluatorNotes);
    setEditImMelc(im.alignmentToMELC);
    setEditImAccuracy(im.contentAccuracyVerified);
    setEditImCopyright(im.copyrightCompliant);
    setEditImVisual(im.visualClarity);
  };

  const handleUpdateIM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIM) return;
    const teacher = teachers.find((t) => t.id === editImTeacherId) || teachers[0];
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacher
        ? resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors)
        : undefined);
    updateIMQA(editingIM.id, {
      title: editImTitle.trim() || editingIM.title,
      materialKind: editImKind,
      type: editImType,
      teacherId: teacher ? teacher.id : editingIM.teacherId,
      teacherName: teacher ? teacher.fullName : editingIM.teacherName,
      supervisorId: resolvedSup?.id || editingIM.supervisorId,
      supervisorName: resolvedSup?.fullName || editingIM.supervisorName,
      gradeSubject: editImGradeSubject,
      fileUrl: editImFileUrl.trim(),
      status: editImStatus,
      evaluatorNotes: editImEvaluatorNotes,
      alignmentToMELC: editImMelc,
      contentAccuracyVerified: editImAccuracy,
      copyrightCompliant: editImCopyright,
      visualClarity: editImVisual,
    });
    setEditingIM(null);
  };

  const handleSaveIM = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === imTeacherId) || scopedTeachers[0] || teachers[0];
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacher
        ? resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors)
        : undefined);
    addIMQA({
      title: imTitle || 'Contextualized Learning Activity Sheet',
      type: imType,
      materialKind: 'IM',
      fileUrl: imFileUrl.trim(),
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      supervisorId: resolvedSup?.id || currentUser.id,
      supervisorName: resolvedSup?.fullName || currentUser.fullName,
      gradeSubject: imGradeSubject,
      dateSubmitted: new Date().toISOString().slice(0, 10),
      alignmentToMELC: true,
      contentAccuracyVerified: true,
      copyrightCompliant: true,
      visualClarity: true,
      status: 'Approved for Use',
      evaluatorNotes: 'Reviewed by instructional supervisor. Suitable for classroom deployment.',
    });
    setIsIMModalOpen(false);
    setImTitle('');
    setImFileUrl('');
  };

  const handleSaveLM = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === lmTeacherId) || scopedTeachers[0] || teachers[0];
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacher
        ? resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors)
        : undefined);
    addIMQA({
      title: lmTitle || 'Learner Material Module',
      type: lmType,
      materialKind: 'LM',
      fileUrl: lmFileUrl.trim(),
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      supervisorId: resolvedSup?.id || currentUser.id,
      supervisorName: resolvedSup?.fullName || currentUser.fullName,
      gradeSubject: lmGradeSubject,
      dateSubmitted: new Date().toISOString().slice(0, 10),
      alignmentToMELC: true,
      contentAccuracyVerified: true,
      copyrightCompliant: true,
      visualClarity: true,
      status: 'Approved for Use',
      evaluatorNotes: 'Reviewed by instructional supervisor. Suitable for learner independent study and review.',
    });
    setIsLMModalOpen(false);
    setLmTitle('');
    setLmFileUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>Instructional Quality Assurance</span>
            <span aria-hidden="true">·</span>
            <span>DepEd Standard MPS Tracking</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Instructional Materials (IMs / LMs)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            DepEd benchmark and quality assuring IMs & LMs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsIMModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Submit IM for Review</span>
          </button>
          <button
            onClick={() => setIsLMModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8B2635] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Submit LM for Review</span>
          </button>
        </div>
      </div>

      {/* Instructional Supervisor Output Scope Banner / Filter */}
      <SupervisionScopeBanner
        selectedSupervisorFilterId={selectedSupervisorFilterId}
        onChangeSupervisorFilterId={setSelectedSupervisorFilterId}
        currentUser={currentUser}
        teachers={teachers}
        supervisors={supervisors}
        moduleLabel="Instructional Materials (IMs / LMs) Table"
      />

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white px-5 rounded-t-xl gap-6 text-xs font-bold">
        <div className="py-3 border-b-2 border-[#701628] text-[#701628]">
          Instructional Materials (IMs Quality Assurance) ({filteredIMs.length})
        </div>
      </div>

      {/* IMs Section */}
      <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search instructional material title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
              />
            </div>
            <div className="text-xs text-stone-500 font-medium hidden sm:block">
              DepEd Quality Assurance Criteria Checklist
            </div>
          </div>

          {/* Instructional Materials (IMs Quality Assurance) Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Kind & Type</th>
                    <th className="py-3 px-4">Title & Document Link</th>
                    <th className="py-3 px-4">Author / Teacher</th>
                    <th className="py-3 px-4">Grade & Subject</th>
                    <th className="py-3 px-4">QA Checklist</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredIMs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        No instructional materials found.
                      </td>
                    </tr>
                  ) : (
                    filteredIMs.map((im) => (
                      <tr key={im.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider mb-1 ${
                              im.materialKind === 'LM'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {im.materialKind === 'LM' ? 'LM · Learner Material' : 'IM · Instructional'}
                          </span>
                          <div className="text-[11px] text-stone-500 font-medium">{im.type}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-stone-900">{im.title}</div>
                          {im.fileUrl ? (
                            <a
                              href={im.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701628] hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open Document Link</span>
                            </a>
                          ) : (
                            <div className="text-[11px] text-stone-400 italic mt-0.5 line-clamp-1">
                              {im.evaluatorNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-800">{im.teacherName}</div>
                          <div className="text-[10px] text-[#701628] font-medium">
                            Supervisor: {resolveRecordSupervisorName(im, teachers, supervisors)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-700">{im.gradeSubject}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-[10px]">
                            <div className={im.alignmentToMELC ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.alignmentToMELC ? '✓ MELC Aligned' : '✗ MELC Unverified'}
                            </div>
                            <div className={im.contentAccuracyVerified ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.contentAccuracyVerified ? '✓ Content Accurate' : '✗ Accuracy Pending'}
                            </div>
                            <div className={im.copyrightCompliant ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.copyrightCompliant ? '✓ Copyright OK' : '⚠ Needs Citation'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                              im.status === 'Approved for Use'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : im.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {im.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">{im.dateSubmitted}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditIMModal(im)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors"
                              title="Edit Instructional Material"
                            >
                              <Pencil className="w-3.5 h-3.5 text-stone-600" />
                              <span>Edit</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => deleteIMQA(im.id)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed QA Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIMs.map((im) => (
              <div
                key={im.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        im.materialKind === 'LM'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {im.materialKind === 'LM' ? 'LM · Learner Material' : 'IM · Instructional'}
                      </span>
                      <span className="text-[10px] font-bold bg-stone-50 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
                        {im.type}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        im.status === 'Approved for Use'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : im.status === 'Under Review'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {im.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm mb-1 leading-snug">{im.title}</h3>
                  <div className="text-xs text-stone-500 mb-3">
                    {im.gradeSubject} · Developed by {im.teacherName}
                  </div>

                  {im.fileUrl && (
                    <div className="mb-3">
                      <a
                        href={im.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#701628] hover:text-[#580e1c] bg-amber-50/70 hover:bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document (Google Drive / Web Link)</span>
                      </a>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px] bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-stone-700">
                    <div className="flex items-center justify-between">
                      <span>MELC Alignment:</span>
                      <span className={im.alignmentToMELC ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.alignmentToMELC ? '✓ Verified' : '✗ Unverified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Content Accuracy:</span>
                      <span className={im.contentAccuracyVerified ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.contentAccuracyVerified ? '✓ Verified' : '✗ Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Copyright Compliant:</span>
                      <span className={im.copyrightCompliant ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.copyrightCompliant ? '✓ Compliant' : '⚠ Requires Citation'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 mt-3 italic">
                    "{im.evaluatorNotes}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>Submitted: {im.dateSubmitted}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditIMModal(im)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-bold transition-colors"
                      title="Edit Instructional Material"
                    >
                      <Pencil className="w-3 h-3 text-stone-600" />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => deleteIMQA(im.id)}
                        className="p-1 text-stone-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      {/* Edit IM / LM Modal */}
      {editingIM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Edit Instructional / Learner Material QA</h3>
                <p className="text-[11px] text-amber-200">Update material details, Google Drive link, and QA status</p>
              </div>
              <button onClick={() => setEditingIM(null)} className="p-1 rounded-lg text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateIM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  value={editImTitle}
                  onChange={(e) => setEditImTitle(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Category</label>
                  <select
                    value={editImKind}
                    onChange={(e) => setEditImKind(e.target.value as 'IM' | 'LM')}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="IM">IM · Instructional Material</option>
                    <option value="LM">LM · Learner's Material</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={editImType}
                    onChange={(e) => setEditImType(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized IM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Subject</label>
                  <input
                    type="text"
                    required
                    value={editImGradeSubject}
                    onChange={(e) => setEditImGradeSubject(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">QA Status</label>
                  <select
                    value={editImStatus}
                    onChange={(e) => setEditImStatus(e.target.value as InstructionalMaterialQA['status'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-semibold"
                  >
                    <option value="Approved for Use">Approved for Use</option>
                    <option value="Under Review">Under Review</option>
                    <option value="For Revision">For Revision</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={editImTeacherId}
                  onChange={(e) => setEditImTeacherId(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                <div className="font-bold text-stone-700">DepEd QA Verification Checklist</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImMelc}
                      onChange={(e) => setEditImMelc(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>MELC Alignment Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImAccuracy}
                      onChange={(e) => setEditImAccuracy(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Content Accuracy Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImCopyright}
                      onChange={(e) => setEditImCopyright(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Copyright Compliant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImVisual}
                      onChange={(e) => setEditImVisual(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Visual Clarity & Layout</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Evaluator Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={editImEvaluatorNotes}
                  onChange={(e) => setEditImEvaluatorNotes(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Google Drive Link or Valid Web Link
                </label>
                <input
                  type="url"
                  value={editImFileUrl}
                  onChange={(e) => setEditImFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingIM(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IM Submission Modal */}
      {isIMModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Submit Instructional Material (IM) for QA</h3>
                <p className="text-[11px] text-amber-200">Teacher's Instructional Resource & Supplementary Aid</p>
              </div>
              <button onClick={() => setIsIMModalOpen(false)} className="p-1 rounded-lg text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Title of Instructional Material</label>
                <input
                  type="text"
                  required
                  value={imTitle}
                  onChange={(e) => setImTitle(e.target.value)}
                  placeholder="e.g. Contextualized Learning Activity Sheet on Quadratic Functions"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={imType}
                    onChange={(e) => setImType(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized IM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Subject</label>
                  <input
                    type="text"
                    required
                    value={imGradeSubject}
                    onChange={(e) => setImGradeSubject(e.target.value)}
                    placeholder="e.g. Science 9 or Math 8"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={imTeacherId}
                  onChange={(e) => setImTeacherId(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Google Drive Link or Valid Web Link Field */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Upload Data through Google Drive Link or Any Valid Web Link
                </label>
                <input
                  type="url"
                  value={imFileUrl}
                  onChange={(e) => setImFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-amber-900 mt-1">
                  * Note: The uploaded/linked file must be accessible to the website and shared with appropriate viewing permissions (e.g. <em>"Anyone with the link can view"</em>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsIMModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs"
                >
                  Submit IM for Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LM Submission Modal (Same content structure as IM Modal) */}
      {isLMModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#8B2635] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Submit Learner's Material (LM) for QA</h3>
                <p className="text-[11px] text-amber-200">Student Learning Resource & Modular Material</p>
              </div>
              <button onClick={() => setIsLMModalOpen(false)} className="p-1 rounded-lg text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Title of Learner's Material (LM)</label>
                <input
                  type="text"
                  required
                  value={lmTitle}
                  onChange={(e) => setLmTitle(e.target.value)}
                  placeholder="e.g. Self-Learning Module on Ecosystems & Biodiversity"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={lmType}
                    onChange={(e) => setLmType(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized LM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Subject</label>
                  <input
                    type="text"
                    required
                    value={lmGradeSubject}
                    onChange={(e) => setLmGradeSubject(e.target.value)}
                    placeholder="e.g. Mathematics 10 or English 7"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={lmTeacherId}
                  onChange={(e) => setLmTeacherId(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Google Drive Link or Valid Web Link Field */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Upload Data through Google Drive Link or Any Valid Web Link
                </label>
                <input
                  type="url"
                  value={lmFileUrl}
                  onChange={(e) => setLmFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-amber-900 mt-1">
                  * Note: The uploaded/linked file must be accessible to the website and shared with appropriate viewing permissions (e.g. <em>"Anyone with the link can view"</em>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsLMModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8B2635] hover:bg-[#701628] text-white font-bold rounded-lg shadow-xs"
                >
                  Submit LM for Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

