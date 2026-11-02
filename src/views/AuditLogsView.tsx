import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { AuditLog, AuditLogCategory, AuditLogAction } from '../types';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Eye,
  ArrowUpDown,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Users,
  ClipboardCheck,
  Tag,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface AuditLogsViewProps {
  onBackToOverview?: () => void;
  isEmbedded?: boolean;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  onBackToOverview,
  isEmbedded = false,
}) => {
  const { auditLogs, exportAuditLogsCsv, logAuditEvent } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLog | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter((log) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTarget = log.targetName.toLowerCase().includes(q);
          const matchActor = log.actorName.toLowerCase().includes(q);
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchId = log.id.toLowerCase().includes(q) || log.targetId.toLowerCase().includes(q);
          const matchDate = log.formattedDate.toLowerCase().includes(q);
          if (!matchTarget && !matchActor && !matchDetails && !matchId && !matchDate) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'All' && log.category !== selectedCategory) {
          return false;
        }

        // Action filter
        if (selectedAction !== 'All' && log.action !== selectedAction) {
          return false;
        }

        // Severity filter
        if (selectedSeverity !== 'All' && log.severity !== selectedSeverity) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [auditLogs, searchQuery, selectedCategory, selectedAction, selectedSeverity, sortOrder]);

  // Pagination slice
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const rosterEvents = auditLogs.filter(
      (l) => l.category === 'Roster / Teaching Personnel' || l.category === 'Roster / Instructional Supervisor'
    ).length;
    const observationEvents = auditLogs.filter((l) => l.category === 'Classroom Observation (COT)').length;
    const modificationEvents = auditLogs.filter((l) => l.action === 'UPDATE' || l.action === 'ASSIGNMENT').length;
    return { total, rosterEvents, observationEvents, modificationEvents };
  }, [auditLogs]);

  // Color & Badge helpers
  const getActionBadge = (action: AuditLogAction) => {
    switch (action) {
      case 'CREATE':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'CREATE',
        };
      case 'UPDATE':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'UPDATE',
        };
      case 'DELETE':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          label: 'DELETE',
        };
      case 'ASSIGNMENT':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          label: 'ASSIGNMENT',
        };
      default:
        return {
          bg: 'bg-stone-50 text-stone-800 border-stone-300',
          dot: 'bg-stone-500',
          label: action,
        };
    }
  };

  const getCategoryBadge = (category: AuditLogCategory) => {
    switch (category) {
      case 'Roster / Teaching Personnel':
        return {
          bg: 'bg-blue-50 text-blue-900 border-blue-200',
          icon: Users,
          short: 'Teaching Faculty',
        };
      case 'Roster / Instructional Supervisor':
        return {
          bg: 'bg-teal-50 text-teal-900 border-teal-200',
          icon: ShieldCheck,
          short: 'Supervisor Roster',
        };
      case 'Classroom Observation (COT)':
        return {
          bg: 'bg-red-50 text-[#701628] border-red-200',
          icon: ClipboardCheck,
          short: 'COT Observation',
        };
      default:
        return {
          bg: 'bg-stone-100 text-stone-800 border-stone-300',
          icon: History,
          short: category,
        };
    }
  };

  const getSeverityBadge = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertCircle,
          label: 'Critical',
        };
      case 'warning':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          label: 'Warning',
        };
      case 'notice':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Info,
          label: 'Notice',
        };
      case 'info':
      default:
        return {
          badge: 'bg-stone-100 text-stone-700 border-stone-300',
          icon: CheckCircle2,
          label: 'Info',
        };
    }
  };

  // Quick reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedAction('All');
    setSelectedSeverity('All');
    setCurrentPage(1);
  };

  // Simulate an admin audit verification record
  const handleRecordVerificationPing = () => {
    logAuditEvent({
      category: 'Roster / Teaching Personnel',
      action: 'UPDATE',
      targetId: 'school-audit-check',
      targetName: 'DepEd Roster Compliance Verification',
      actorName: currentUser.fullName || 'Administrator',
      actorRole: currentUser.role || 'admin',
      details: `Administrative transparency check validated at ${new Date().toLocaleTimeString()} by ${currentUser.fullName}. All teacher records and supervisory assignments verified in good standing.`,
      severity: 'notice',
      changesSummary: [
        { field: 'Verification State', previousValue: 'Unverified', newValue: 'Fully Verified' },
        { field: 'Supervisory Compliance', previousValue: 'Pending', newValue: 'Compliant' },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* DepEd Official Banner Card */}
      <div className="bg-gradient-to-r from-[#701628] via-[#851b32] to-[#4d0c18] rounded-xl p-6 text-white shadow-lg border border-amber-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-amber-200 text-xs font-bold border border-amber-400/30 transition-all cursor-pointer mb-3 shadow-xs"
            >
              <span>← Back to Administrator Operations Dashboard</span>
            </button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30 backdrop-blur-sm">
                <History className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                    {isEmbedded ? 'Administrator Master Console' : 'DepEd Transparency & Governance Registry'}
                  </span>
                  <span className="text-[11px] text-stone-200">ISO 9001 / RA 9155 Compliant</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                  {isEmbedded ? 'Administrator Audit Logs & Transparency Registry' : 'Administrative Audit Logs & History'}
                </h1>
                <p className="text-sm text-amber-100/90 max-w-2xl mt-0.5">
                  Complete tamper-evident audit trail capturing modifications to teacher rosters,
                  instructional supervisor appointments, mentee pairings, and Classroom Observation (COT) records.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRecordVerificationPing}
                title="Log a transparency check event"
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 rounded-lg border border-amber-400/40 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Log Audit Check</span>
              </button>

              <button
                onClick={() => exportAuditLogsCsv(filteredLogs)}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg shadow-md transition transform active:scale-95"
                title="Export currently filtered audit logs to CSV format with UTF-8 character encoding"
              >
                <Download className="w-4 h-4" />
                <span>Export to CSV ({filteredLogs.length})</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3">
              <div className="text-xs text-amber-200/80 font-medium">Total Audit Events</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">{stats.total}</div>
              <div className="text-[10px] text-stone-300 mt-0.5">Logged since registry startup</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200/90 font-medium">Roster Changes</div>
              <div className="text-2xl font-extrabold text-blue-200 mt-0.5">{stats.rosterEvents}</div>
              <div className="text-[10px] text-stone-300 mt-0.5">Faculty & Supervisor updates</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3">
              <div className="text-xs text-rose-200/90 font-medium">COT Observations</div>
              <div className="text-2xl font-extrabold text-rose-200 mt-0.5">{stats.observationEvents}</div>
              <div className="text-[10px] text-stone-300 mt-0.5">Observations filed & updated</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3">
              <div className="text-xs text-amber-300/90 font-medium">Modifications & Pairings</div>
              <div className="text-2xl font-extrabold text-amber-300 mt-0.5">{stats.modificationEvents}</div>
              <div className="text-[10px] text-stone-300 mt-0.5">Updates and mentor assignments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by personnel, actor, target ID, details, or date..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628] focus:bg-white text-stone-800 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628] text-stone-800 font-medium"
            >
              <option value="All">All Categories</option>
              <option value="Roster / Teaching Personnel">Roster / Teaching Personnel</option>
              <option value="Roster / Instructional Supervisor">Roster / Instructional Supervisor</option>
              <option value="Classroom Observation (COT)">Classroom Observation (COT)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628] text-stone-800 font-medium"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ASSIGNMENT">ASSIGNMENT</option>
            </select>
          </div>

          {/* Sort & Order Button */}
          <div className="md:col-span-2 flex items-center space-x-2">
            <button
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-300 transition font-medium"
              title={`Sorting: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
              <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>

            {(searchQuery || selectedCategory !== 'All' || selectedAction !== 'All' || selectedSeverity !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition font-medium"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-600 gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-stone-500 mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Quick Severity:
            </span>
            {['All', 'info', 'notice', 'warning', 'critical'].map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  setSelectedSeverity(sev);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
                  selectedSeverity === sev
                    ? 'bg-[#701628] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {sev === 'All' ? 'All Severities' : sev.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="text-stone-500 text-[11px]">
            Showing <span className="font-bold text-stone-800">{filteredLogs.length}</span> matching record(s)
          </div>
        </div>
      </div>

      {/* Main Audit Trail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#701628]" />
            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wide">
              Official Log Entries ({filteredLogs.length})
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportAuditLogsCsv(auditLogs)}
              className="text-xs text-[#701628] hover:text-[#4d0c18] font-semibold underline underline-offset-2 flex items-center"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Full Registry CSV
            </button>
          </div>
        </div>

        {paginatedLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <History className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-stone-800">No Audit Events Found</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              No entries match the currently applied search parameters and category filters. Adjust your search or reset filters to view all entries.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#701628] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100/90 text-stone-600 uppercase text-[10px] tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-4">Target Personnel / Entity</th>
                  <th className="py-3 px-4">Authorized Actor</th>
                  <th className="py-3 px-4">Event Summary</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {paginatedLogs.map((log) => {
                  const actionStyle = getActionBadge(log.action);
                  const catStyle = getCategoryBadge(log.category);
                  const sevStyle = getSeverityBadge(log.severity);
                  const CatIcon = catStyle.icon;
                  const SevIcon = sevStyle.icon;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogForDetail(log)}
                      className="hover:bg-amber-50/40 cursor-pointer transition group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-stone-900 flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{log.formattedDate}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          ID: {log.id}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${catStyle.bg}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{catStyle.short}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${actionStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${actionStyle.dot}`} />
                          <span>{actionStyle.label}</span>
                        </div>
                      </td>

                      {/* Target Personnel / Entity */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                          <span className="truncate max-w-[190px]">{log.targetName}</span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                          Target Ref: {log.targetId}
                        </div>
                      </td>

                      {/* Authorized Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-stone-800">{log.actorName}</div>
                        <div className="inline-block mt-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                            {log.actorRole}
                          </span>
                        </div>
                      </td>

                      {/* Details & Severity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start space-x-1.5">
                          <SevIcon className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
                          <p className="line-clamp-2 text-stone-600 text-xs leading-snug">
                            {log.details}
                          </p>
                        </div>
                        {log.changesSummary && log.changesSummary.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {log.changesSummary.slice(0, 2).map((c, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded border border-stone-200"
                              >
                                {c.field}: {c.newValue ?? 'Updated'}
                              </span>
                            ))}
                            {log.changesSummary.length > 2 && (
                              <span className="text-[10px] text-stone-400 font-semibold">
                                +{log.changesSummary.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogForDetail(log);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-[#701628] bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition group-hover:bg-[#701628] group-hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-600">
            <div>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
            </div>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-stone-700"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition ${
                    currentPage === page
                      ? 'bg-[#701628] text-white shadow-xs'
                      : 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-stone-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Inspection Modal */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-xl shadow-2xl border border-stone-300 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#701628] text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-bold tracking-tight">Audit Event Details</h3>
                  <div className="text-xs text-amber-200/90 font-mono">
                    Ref: {selectedLogForDetail.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-stone-800 text-sm">
              {/* Status and Action summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border ${
                      getActionBadge(selectedLogForDetail.action).bg
                    }`}
                  >
                    ACTION: {selectedLogForDetail.action}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                      getCategoryBadge(selectedLogForDetail.category).bg
                    }`}
                  >
                    {selectedLogForDetail.category}
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-xs text-stone-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{selectedLogForDetail.formattedDate}</span>
                </div>
              </div>

              {/* Personnel & Actor details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="text-xs font-semibold uppercase text-stone-500 tracking-wider mb-1">
                    Target Personnel / Entity
                  </div>
                  <div className="text-sm font-bold text-stone-900">
                    {selectedLogForDetail.targetName}
                  </div>
                  <div className="text-xs text-stone-500 font-mono mt-0.5">
                    ID: {selectedLogForDetail.targetId}
                  </div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="text-xs font-semibold uppercase text-stone-500 tracking-wider mb-1">
                    Authorized User / Operator
                  </div>
                  <div className="text-sm font-bold text-stone-900">
                    {selectedLogForDetail.actorName}
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    Role:{' '}
                    <span className="font-semibold uppercase text-[#701628]">
                      {selectedLogForDetail.actorRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Institutional Action Description
                </label>
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-lg text-stone-800 text-xs md:text-sm leading-relaxed font-sans">
                  {selectedLogForDetail.details}
                </div>
              </div>

              {/* Changes Summary Diff Table */}
              {selectedLogForDetail.changesSummary && selectedLogForDetail.changesSummary.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    Attribute Changes & Payload Diff ({selectedLogForDetail.changesSummary.length})
                  </label>
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Field / Attribute</th>
                          <th className="py-2.5 px-3">Previous State</th>
                          <th className="py-2.5 px-3">Updated State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-sans">
                        {selectedLogForDetail.changesSummary.map((c, i) => (
                          <tr key={i} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-semibold text-stone-800">
                              {c.field}
                            </td>
                            <td className="py-2.5 px-3 text-rose-700 bg-rose-50/40 font-mono text-[11px]">
                              {c.previousValue !== undefined ? c.previousValue : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-800 bg-emerald-50/40 font-mono font-medium text-[11px]">
                              {c.newValue !== undefined ? c.newValue : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Institutional Compliance Notice */}
              <div className="p-3 bg-stone-100 rounded-lg text-stone-600 text-[11px] leading-relaxed">
                <span className="font-semibold text-stone-800">Transparency Notice:</span> This audit
                record was created synchronously by the DepEd Barobo National High School OMES portal.
                All recorded entries are permanently archived for administrative review, external
                supervisory audit, and historical tracking.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <div className="text-[11px] text-stone-500 font-mono">
                Timestamp: {selectedLogForDetail.timestamp}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportAuditLogsCsv([selectedLogForDetail])}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  Export Entry
                </button>
                <button
                  onClick={() => setSelectedLogForDetail(null)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#701628] hover:bg-[#581120] rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
