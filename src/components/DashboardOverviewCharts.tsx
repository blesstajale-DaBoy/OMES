import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Teacher, Supervisor, ClassroomObservation, LessonPlanCheck } from '../types';
import { NavTab } from './Header';
import {
  FileSpreadsheet,
  ClipboardCheck,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface DashboardOverviewChartsProps {
  teachers: Teacher[];
  supervisors: Supervisor[];
  observations: ClassroomObservation[];
  lessonPlans: LessonPlanCheck[];
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverviewCharts: React.FC<DashboardOverviewChartsProps> = ({
  teachers,
  supervisors,
  observations,
  lessonPlans,
  onNavigate,
}) => {
  // Chart active tab: 'all' (3-chart grid), 'lesson-plans', 'observations', 'faculty'
  const [activeMetricTab, setActiveMetricTab] = useState<'all' | 'lesson-plans' | 'observations' | 'faculty'>('all');

  // Hovered item state for interactive D3 tooltip
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
    value: string | number;
    percentage?: string;
    color?: string;
    details?: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    value: '',
  });

  // SVG Refs
  const lessonPlansChartRef = useRef<SVGSVGElement | null>(null);
  const observationsChartRef = useRef<SVGSVGElement | null>(null);
  const facultyChartRef = useRef<SVGSVGElement | null>(null);
  const combinedBarChartRef = useRef<SVGSVGElement | null>(null);

  // Computed data summaries
  const totalLessonPlans = lessonPlans.length;
  const approvedLessonPlans = lessonPlans.filter((lp) => lp.status === 'Approved').length;
  const pendingLessonPlans = lessonPlans.filter((lp) => lp.status === 'Pending Inspection').length;
  const revisionLessonPlans = lessonPlans.filter((lp) => lp.status === 'Needs Revision').length;

  const totalObservations = observations.length;
  const completedObservations = observations.filter((o) => o.status === 'Completed').length;
  const pendingPostConfObservations = observations.filter((o) => o.status === 'Pending Post-Conference').length;
  const scheduledObservations = observations.filter((o) => o.status === 'Scheduled').length;

  const activeFaculty = teachers.filter((t) => t.status === 'Active' || !t.status);
  const totalActiveFaculty = activeFaculty.length;
  const jhsFaculty = activeFaculty.filter((t) => t.department === 'Junior High School').length;
  const shsFaculty = activeFaculty.filter((t) => t.department === 'Senior High School').length;
  const otherFaculty = totalActiveFaculty - jhsFaculty - shsFaculty;

  // Supervision coverage: teachers assigned to a supervisor
  const assignedFaculty = activeFaculty.filter((t) => t.assignedSupervisorId && t.assignedSupervisorId !== '').length;
  const unassignedFaculty = totalActiveFaculty - assignedFaculty;

  // Observation Ratings Breakdown
  const outstandingObs = observations.filter((o) => o.overallRating === 'Outstanding').length;
  const verySatisfactoryObs = observations.filter((o) => o.overallRating === 'Very Satisfactory').length;
  const satisfactoryObs = observations.filter((o) => o.overallRating === 'Satisfactory').length;

  // -------------------------------------------------------------
  // D3 Chart 1: Lesson Plans Submitted by Status (Donut & Stacked Bar)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!lessonPlansChartRef.current) return;
    const svg = d3.select(lessonPlansChartRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 12;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const data = [
      { label: 'Approved', count: approvedLessonPlans, color: '#059669', desc: 'Checked & verified by supervisor' },
      { label: 'Pending Review', count: pendingLessonPlans, color: '#d97706', desc: 'Awaiting instructional review' },
      { label: 'Needs Revision', count: revisionLessonPlans, color: '#e11d48', desc: 'Returned with remarks' },
    ].filter((d) => d.count > 0 || totalLessonPlans === 0);

    const safeData = data.length > 0 ? data : [{ label: 'No Submissions', count: 1, color: '#e2e8f0', desc: 'No records' }];

    const pie = d3
      .pie<(typeof safeData)[0]>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.04);

    const arc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius + 5)
      .cornerRadius(5);

    // Render Slices
    const paths = g
      .selectAll('path')
      .data(pie(safeData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    paths
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', hoverArc(d) || '');
        const [x, y] = d3.pointer(event, document.body);
        const pct = totalLessonPlans > 0 ? ((d.data.count / totalLessonPlans) * 100).toFixed(1) + '%' : '0%';
        setTooltipData({
          visible: true,
          x,
          y,
          title: `Lesson Plans: ${d.data.label}`,
          value: `${d.data.count} Plans`,
          percentage: pct,
          color: d.data.color,
          details: d.data.desc,
        });
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, document.body);
        setTooltipData((prev) => ({ ...prev, x, y }));
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).transition().duration(150).attr('d', arc(d) || '');
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('class', 'font-mono font-bold text-stone-900')
      .style('font-size', '24px')
      .style('fill', '#1c1917')
      .text(totalLessonPlans);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('class', 'text-[10px] font-semibold uppercase tracking-wider text-stone-500')
      .style('font-size', '10px')
      .style('fill', '#78716c')
      .text('Total Plans');
  }, [lessonPlans, approvedLessonPlans, pendingLessonPlans, revisionLessonPlans, totalLessonPlans]);

  // -------------------------------------------------------------
  // D3 Chart 2: Classroom Observations Conducted & Rating Arc
  // -------------------------------------------------------------
  useEffect(() => {
    if (!observationsChartRef.current) return;
    const svg = d3.select(observationsChartRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 12;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const data = [
      { label: 'Completed COTs', count: completedObservations, color: '#701628', desc: 'Fully conducted with ratings' },
      { label: 'Pending Post-Conf', count: pendingPostConfObservations, color: '#f59e0b', desc: 'Observation done, awaiting post-con' },
      { label: 'Scheduled Ahead', count: scheduledObservations, color: '#0284c7', desc: 'Pre-conference scheduled' },
    ].filter((d) => d.count > 0 || totalObservations === 0);

    const safeData = data.length > 0 ? data : [{ label: 'No Observations', count: 1, color: '#e2e8f0', desc: 'No records' }];

    const pie = d3
      .pie<(typeof safeData)[0]>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.04);

    const arc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius + 5)
      .cornerRadius(5);

    const paths = g
      .selectAll('path')
      .data(pie(safeData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    paths
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', hoverArc(d) || '');
        const [x, y] = d3.pointer(event, document.body);
        const pct = totalObservations > 0 ? ((d.data.count / totalObservations) * 100).toFixed(1) + '%' : '0%';
        setTooltipData({
          visible: true,
          x,
          y,
          title: `Observation: ${d.data.label}`,
          value: `${d.data.count} Visits`,
          percentage: pct,
          color: d.data.color,
          details: d.data.desc,
        });
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, document.body);
        setTooltipData((prev) => ({ ...prev, x, y }));
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).transition().duration(150).attr('d', arc(d) || '');
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('class', 'font-mono font-bold text-[#701628]')
      .style('font-size', '24px')
      .style('fill', '#701628')
      .text(completedObservations);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('class', 'text-[10px] font-semibold uppercase tracking-wider text-stone-500')
      .style('font-size', '10px')
      .style('fill', '#78716c')
      .text('Completed');
  }, [observations, completedObservations, pendingPostConfObservations, scheduledObservations, totalObservations]);

  // -------------------------------------------------------------
  // D3 Chart 3: Active Faculty Members & Department Breakdown
  // -------------------------------------------------------------
  useEffect(() => {
    if (!facultyChartRef.current) return;
    const svg = d3.select(facultyChartRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 12;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const data = [
      { label: 'Junior High School', count: jhsFaculty, color: '#1e40af', desc: 'Grades 7 to 10 teaching personnel' },
      { label: 'Senior High School', count: shsFaculty, color: '#b45309', desc: 'Grades 11 & 12 specialized tracks' },
      ...(otherFaculty > 0 ? [{ label: 'Other Active Staff', count: otherFaculty, color: '#4b5563', desc: 'Non-graded faculty' }] : []),
    ].filter((d) => d.count > 0 || totalActiveFaculty === 0);

    const safeData = data.length > 0 ? data : [{ label: 'No Active Faculty', count: 1, color: '#e2e8f0', desc: 'No records' }];

    const pie = d3
      .pie<(typeof safeData)[0]>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.04);

    const arc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<(typeof safeData)[0]>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius + 5)
      .cornerRadius(5);

    const paths = g
      .selectAll('path')
      .data(pie(safeData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    paths
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('d', hoverArc(d) || '');
        const [x, y] = d3.pointer(event, document.body);
        const pct = totalActiveFaculty > 0 ? ((d.data.count / totalActiveFaculty) * 100).toFixed(1) + '%' : '0%';
        setTooltipData({
          visible: true,
          x,
          y,
          title: `Faculty: ${d.data.label}`,
          value: `${d.data.count} Teachers`,
          percentage: pct,
          color: d.data.color,
          details: d.data.desc,
        });
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, document.body);
        setTooltipData((prev) => ({ ...prev, x, y }));
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).transition().duration(150).attr('d', arc(d) || '');
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('class', 'font-mono font-bold text-stone-900')
      .style('font-size', '24px')
      .style('fill', '#1c1917')
      .text(totalActiveFaculty);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('class', 'text-[10px] font-semibold uppercase tracking-wider text-stone-500')
      .style('font-size', '10px')
      .style('fill', '#78716c')
      .text('Active Faculty');
  }, [teachers, activeFaculty, totalActiveFaculty, jhsFaculty, shsFaculty, otherFaculty]);

  // -------------------------------------------------------------
  // D3 Chart 4: Comparative Key Metrics Overview (Normalized Horizontal Bar)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!combinedBarChartRef.current) return;
    const svg = d3.select(combinedBarChartRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 35, bottom: 25, left: 160 };
    const width = 640;
    const height = 180;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const summaryData = [
      {
        category: 'Lesson Plans Submitted',
        value: totalLessonPlans,
        subtext: `${approvedLessonPlans} Approved · ${pendingLessonPlans} Pending`,
        color: '#059669',
        target: Math.max(totalLessonPlans, totalActiveFaculty * 2),
      },
      {
        category: 'Observations Conducted',
        value: completedObservations,
        subtext: `${completedObservations} Done · ${scheduledObservations} Scheduled`,
        color: '#701628',
        target: Math.max(completedObservations, totalActiveFaculty * 2),
      },
      {
        category: 'Active Faculty Members',
        value: totalActiveFaculty,
        subtext: `${jhsFaculty} JHS · ${shsFaculty} SHS · ${assignedFaculty} Paired`,
        color: '#2563eb',
        target: Math.max(totalActiveFaculty, teachers.length),
      },
    ];

    const maxValue = d3.max(summaryData, (d) => Math.max(d.value, d.target)) || 20;

    const yScale = d3
      .scaleBand()
      .domain(summaryData.map((d) => d.category))
      .range([0, innerHeight])
      .padding(0.35);

    const xScale = d3.scaleLinear().domain([0, maxValue * 1.1]).range([0, innerWidth]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickSize(innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '2,2');

    g.select('.grid .domain').remove();

    // Background track bars
    g.selectAll('.track-bar')
      .data(summaryData)
      .enter()
      .append('rect')
      .attr('class', 'track-bar')
      .attr('y', (d) => yScale(d.category) || 0)
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('width', innerWidth)
      .attr('rx', 6)
      .attr('fill', '#f1f5f9');

    // Active metric bars
    const bars = g
      .selectAll('.metric-bar')
      .data(summaryData)
      .enter()
      .append('rect')
      .attr('class', 'metric-bar')
      .attr('y', (d) => yScale(d.category) || 0)
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('width', (d) => Math.max(8, xScale(d.value)))
      .attr('rx', 6)
      .attr('fill', (d) => d.color)
      .style('cursor', 'pointer');

    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.85);
        const [x, y] = d3.pointer(event, document.body);
        setTooltipData({
          visible: true,
          x,
          y,
          title: d.category,
          value: `${d.value} Records`,
          percentage: `${((d.value / (d.target || 1)) * 100).toFixed(0)}% of Target`,
          color: d.color,
          details: d.subtext,
        });
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, document.body);
        setTooltipData((prev) => ({ ...prev, x, y }));
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        setTooltipData((prev) => ({ ...prev, visible: false }));
      });

    // Value Labels at end of bar
    g.selectAll('.value-label')
      .data(summaryData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(d.value) + 8)
      .attr('y', (d) => (yScale(d.category) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#1c1917')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('font-family', 'monospace')
      .text((d) => d.value);

    // Y-Axis category text
    const yAxis = g
      .append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .attr('font-family', 'inherit')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('color', '#334155');

    yAxis.select('.domain').remove();
  }, [totalLessonPlans, approvedLessonPlans, pendingLessonPlans, completedObservations, scheduledObservations, totalActiveFaculty, jhsFaculty, shsFaculty, assignedFaculty, teachers.length]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all">
      {/* Floating Interactive Tooltip */}
      {tooltipData.visible && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 bg-stone-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl border border-stone-700 min-w-[150px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${tooltipData.x}px`, top: `${tooltipData.y - 10}px` }}
        >
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: tooltipData.color || '#f59e0b' }}
            />
            <span className="truncate">{tooltipData.title}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-stone-200">
            <span className="font-mono text-sm font-bold text-white">{tooltipData.value}</span>
            {tooltipData.percentage && (
              <span className="text-[10px] font-semibold text-amber-300 font-mono">
                {tooltipData.percentage}
              </span>
            )}
          </div>
          {tooltipData.details && (
            <p className="text-[10px] text-stone-400 mt-1 border-t border-stone-800 pt-1">
              {tooltipData.details}
            </p>
          )}
        </div>
      )}

      {/* Widget Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-[#701628] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-amber-300">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>DepEd BNHS Real-Time Supervision Analytics</span>
            <span className="text-stone-400">·</span>
            <span className="text-emerald-300 font-mono">D3 Active Engine</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
            School Overview: Plans, Observations & Faculty Summary
          </h3>
          <p className="text-xs text-stone-300 mt-0.5">
            Interactive multi-dimensional visualization of Weekly DLL submissions, Classroom COT visits, and Active Staff
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-xl bg-black/30 p-1 border border-white/10 text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setActiveMetricTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetricTab === 'all'
                ? 'bg-[#701628] text-white font-bold shadow-sm border border-amber-400/40'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All 3 Pillars</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('lesson-plans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetricTab === 'lesson-plans'
                ? 'bg-emerald-700 text-white font-bold shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lesson Plans</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('observations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetricTab === 'observations'
                ? 'bg-rose-900 text-white font-bold shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">COTs</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('faculty')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetricTab === 'faculty'
                ? 'bg-blue-800 text-white font-bold shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Faculty</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Pillar KPI Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 border-b border-stone-200 bg-stone-50/50 text-xs">
        {/* KPI 1: Lesson Plans */}
        <div
          onClick={() => onNavigate('lesson-plans')}
          className="p-4 sm:p-5 hover:bg-emerald-50/40 transition-colors cursor-pointer group"
          title="Click to inspect all Lesson Plans"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-stone-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Lesson Plans Submitted</span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-stone-900 tracking-tight">
              {totalLessonPlans}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              {approvedLessonPlans} Approved
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-2">
            <span className="text-amber-700 font-semibold">{pendingLessonPlans} Pending Review</span>
            <span>·</span>
            <span className="text-rose-600 font-semibold">{revisionLessonPlans} Revisions</span>
          </div>
        </div>

        {/* KPI 2: Classroom Observations */}
        <div
          onClick={() => onNavigate('observation')}
          className="p-4 sm:p-5 hover:bg-rose-50/40 transition-colors cursor-pointer group"
          title="Click to view all COT Classroom Observations"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-stone-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-[#701628]" />
              <span>Observations Conducted</span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#701628] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-[#701628] tracking-tight">
              {completedObservations}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              of {totalObservations} total visits
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-2">
            <span className="text-emerald-700 font-semibold">{outstandingObs} Outstanding</span>
            <span>·</span>
            <span className="text-stone-600">{verySatisfactoryObs} Very Satisfactory</span>
          </div>
        </div>

        {/* KPI 3: Active Faculty Members */}
        <div
          onClick={() => onNavigate('roster')}
          className="p-4 sm:p-5 hover:bg-blue-50/40 transition-colors cursor-pointer group"
          title="Click to view full personnel roster"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-stone-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Active Faculty Members</span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-700 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-stone-900 tracking-tight">
              {totalActiveFaculty}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
              {((assignedFaculty / (totalActiveFaculty || 1)) * 100).toFixed(0)}% Supervised
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-2">
            <span className="font-semibold text-blue-900">{jhsFaculty} Junior High</span>
            <span>·</span>
            <span className="font-semibold text-amber-900">{shsFaculty} Senior High</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Display Section */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* VIEW 1: All 3 Pillars (Side-by-side D3 Donut Charts + Comparative Bar) */}
        {activeMetricTab === 'all' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top row: 3 Specialized D3 Donut/Ring Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Chart Panel 1: Lesson Plans Submitted */}
              <div className="bg-stone-50/60 rounded-xl border border-stone-200 p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-stone-800">Lesson Plans Submitted</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    DLL Weekly
                  </span>
                </div>

                <div className="py-1 flex justify-center">
                  <svg ref={lessonPlansChartRef} className="w-full max-w-[240px] h-[170px]" />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-stone-200 text-[10px] text-center font-medium">
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1" />
                    <span className="text-stone-700">Approved ({approvedLessonPlans})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-600 mr-1" />
                    <span className="text-stone-700">Pending ({pendingLessonPlans})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-600 mr-1" />
                    <span className="text-stone-700">Revision ({revisionLessonPlans})</span>
                  </div>
                </div>
              </div>

              {/* Chart Panel 2: Classroom Observations Conducted */}
              <div className="bg-stone-50/60 rounded-xl border border-stone-200 p-4 flex flex-col justify-between hover:border-rose-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#701628]" />
                    <span className="text-xs font-bold text-stone-800">Observations Conducted</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#701628] bg-rose-100 px-1.5 py-0.5 rounded">
                    COT-PMES
                  </span>
                </div>

                <div className="py-1 flex justify-center">
                  <svg ref={observationsChartRef} className="w-full max-w-[240px] h-[170px]" />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-stone-200 text-[10px] text-center font-medium">
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#701628] mr-1" />
                    <span className="text-stone-700">Done ({completedObservations})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />
                    <span className="text-stone-700">Post-Con ({pendingPostConfObservations})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-600 mr-1" />
                    <span className="text-stone-700">Sched ({scheduledObservations})</span>
                  </div>
                </div>
              </div>

              {/* Chart Panel 3: Active Faculty Members */}
              <div className="bg-stone-50/60 rounded-xl border border-stone-200 p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-stone-800">Active Faculty Members</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    Roster
                  </span>
                </div>

                <div className="py-1 flex justify-center">
                  <svg ref={facultyChartRef} className="w-full max-w-[240px] h-[170px]" />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-stone-200 text-[10px] text-center font-medium">
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-700 mr-1" />
                    <span className="text-stone-700">JHS ({jhsFaculty})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-700 mr-1" />
                    <span className="text-stone-700">SHS ({shsFaculty})</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1" />
                    <span className="text-stone-700">Paired ({assignedFaculty})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: D3 Normalized Comparative Bar Chart */}
            <div className="bg-stone-50/80 rounded-xl border border-stone-200 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-stone-600" />
                    <span>D3 Comparative Supervision Benchmark</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Side-by-side volume metrics across Lesson Plans, COT Classroom Visits, and Rostered Active Faculty
                  </p>
                </div>
                <span className="text-[10px] text-stone-400 font-mono self-start sm:self-auto">
                  Interactive hover enabled
                </span>
              </div>

              <div className="overflow-x-auto">
                <svg ref={combinedBarChartRef} className="w-full min-w-[500px] h-[160px]" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Deep Dive - Lesson Plans Submitted */}
        {activeMetricTab === 'lesson-plans' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5 flex justify-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                <svg ref={lessonPlansChartRef} className="w-full max-w-[260px] h-[190px]" />
              </div>
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Weekly Lesson Plan (DLL) Submissions</h4>
                    <p className="text-xs text-stone-500">
                      Total {totalLessonPlans} instructional plans logged across Junior & Senior High departments
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">Approved</div>
                    <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">{approvedLessonPlans}</div>
                    <div className="text-[10px] text-emerald-700">
                      {totalLessonPlans > 0 ? ((approvedLessonPlans / totalLessonPlans) * 100).toFixed(0) : 0}% compliance rate
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Pending Review</div>
                    <div className="text-xl font-bold font-mono text-amber-950 mt-0.5">{pendingLessonPlans}</div>
                    <div className="text-[10px] text-amber-700">Awaiting supervisor</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-[10px] font-bold text-rose-800 uppercase">Needs Revision</div>
                    <div className="text-xl font-bold font-mono text-rose-950 mt-0.5">{revisionLessonPlans}</div>
                    <div className="text-[10px] text-rose-700">Remarks for improvement</div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('lesson-plans')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open Lesson Plan Tracker & Drive Links</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Deep Dive - Classroom Observations Conducted */}
        {activeMetricTab === 'observations' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5 flex justify-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                <svg ref={observationsChartRef} className="w-full max-w-[260px] h-[190px]" />
              </div>
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-rose-100 text-[#701628]">
                    <ClipboardCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">COT-PMES Classroom Observations</h4>
                    <p className="text-xs text-stone-500">
                      {completedObservations} completed visits out of {totalObservations} scheduled monitoring cycles
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-[10px] font-bold text-[#701628] uppercase">Completed COTs</div>
                    <div className="text-xl font-bold font-mono text-rose-950 mt-0.5">{completedObservations}</div>
                    <div className="text-[10px] text-rose-700">DepEd Rubric Signed</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Post-Conference</div>
                    <div className="text-xl font-bold font-mono text-amber-950 mt-0.5">{pendingPostConfObservations}</div>
                    <div className="text-[10px] text-amber-700">Feedback in progress</div>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                    <div className="text-[10px] font-bold text-sky-800 uppercase">Upcoming Scheduled</div>
                    <div className="text-xl font-bold font-mono text-sky-950 mt-0.5">{scheduledObservations}</div>
                    <div className="text-[10px] text-sky-700">Pre-conference done</div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('observation')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open COT Observations & Print Tool</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: Deep Dive - Active Faculty Members */}
        {activeMetricTab === 'faculty' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5 flex justify-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                <svg ref={facultyChartRef} className="w-full max-w-[260px] h-[190px]" />
              </div>
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-blue-100 text-blue-800">
                    <Users className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Teaching Faculty & Instructional Supervisors</h4>
                    <p className="text-xs text-stone-500">
                      {totalActiveFaculty} active teachers rostered across junior high and senior high curricula
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[10px] font-bold text-blue-800 uppercase">Junior High</div>
                    <div className="text-xl font-bold font-mono text-blue-950 mt-0.5">{jhsFaculty}</div>
                    <div className="text-[10px] text-blue-700">Grades 7–10</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Senior High</div>
                    <div className="text-xl font-bold font-mono text-amber-950 mt-0.5">{shsFaculty}</div>
                    <div className="text-[10px] text-amber-700">Grades 11–12</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">Paired with Supervisor</div>
                    <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">{assignedFaculty}</div>
                    <div className="text-[10px] text-emerald-700">
                      {totalActiveFaculty > 0 ? ((assignedFaculty / totalActiveFaculty) * 100).toFixed(0) : 0}% paired
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('roster')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open Personnel Directory & Supervisory Roster</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Insight Note */}
      <div className="px-6 py-3 bg-stone-50/90 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#701628]" />
          <span>Surigao del Sur Division · DepEd Results-Based Performance Management System (RPMS-PPST)</span>
        </div>
        <div className="text-stone-400 font-mono text-[10px]">
          Data synchronized with OMES Personnel & COT database
        </div>
      </div>
    </div>
  );
};
