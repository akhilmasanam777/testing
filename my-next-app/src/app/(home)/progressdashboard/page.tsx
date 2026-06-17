"use client";

/**
 * Performance Dashboard — NextAdmin (TailAdmin) compatible
 * ---------------------------------------------------------
 * Drop-in for Next.js App Router projects using the NextAdmin theme:
 *   app/performance/page.tsx  →  export { default } from "@/components/PerformanceDashboard"
 *
 * Requirements in target Next.js project:
 *   - tailwind.config with NextAdmin tokens: primary, stroke, strokedark, boxdark,
 *     boxdark-2, bodydark, bodydark1, bodydark2, meta-1..meta-9, success, warning,
 *     danger, whiten, whiter, body, title-*, shadow-default, shadow-card
 *   - "recharts" and "lucide-react" installed
 *   - Tailwind dark mode = "class"
 *
 * No shadcn/Radix dependencies. Uses semantic NextAdmin classes only.
 */

import { useState, useEffect } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area,
} from "recharts";
import {
  Sparkles, TrendingUp, Users, Wrench, CalendarCheck, Target, Clock,
  ChevronUp, ChevronDown, Minus, X,
} from "lucide-react";
import { useCountUp } from "@/hookscopy/use-count-up";

/* ─── Utility ─── */
const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/* ─── Mock Data ─── */
const overallData = { completed: 34, daysVariance: -12 };

const milestoneData = [
  { name: "Gp Ring 50%", target: "19 Aug 2026", status: "on-track", daysLeft: 137 },
  { name: "Block Ring 100%", target: "15 Oct 2026", status: "delayed", daysLeft: 194 },
  { name: "Go Live", target: "01 Jan 2027", status: "at-risk", daysLeft: 262 },
];

const taskPerformance = [
  { task: "Desktop Plan", completed: 81, total: 81, pct: 100, variance: 0, status: "ahead" },
  { task: "Boq", completed: 45, total: 126, pct: 36, variance: -8, status: "behind" },
  { task: "Execution", completed: 13, total: 81, pct: 16, variance: 3, status: "ahead" },
  { task: "Go Live", completed: 0, total: 81, pct: 0, variance: 0, status: "on-track" },
];

const teamData = {
  attendance: { total: 95, present: 78, weeklyChange: 5 },
  taskManpower: [
    { task: "Desktop Plan", deployed: 12, productivity: 6.75, prodChange: 0.5 },
    { task: "Boq", deployed: 18, productivity: 2.5, prodChange: -1.2 },
    { task: "Execution", deployed: 35, productivity: 0.37, prodChange: 0.1 },
    { task: "Go Live", deployed: 8, productivity: 0, prodChange: 0 },
  ],
  machines: { total: 24, weeklyChange: 3 },
};

const analyticsInsights = [
  { task: "Boq", manpowerIncrease: 6, pctIncrease: 50, reason: "Approval backlog requires additional surveyors" },
  { task: "Execution", manpowerIncrease: 10, pctIncrease: 29, reason: "Pole erection acceleration needed to meet milestone" },
  { task: "Go Live", manpowerIncrease: 4, pctIncrease: 50, reason: "Router commissioning prep ahead of schedule target" },
];

const weeklyTrend = [
  { week: "W1", attendance: 72, productivity: 3.2 },
  { week: "W2", attendance: 75, productivity: 3.5 },
  { week: "W3", attendance: 80, productivity: 3.1 },
  { week: "W4", attendance: 78, productivity: 4.0 },
  { week: "W5", attendance: 82, productivity: 3.8 },
  { week: "W6", attendance: 78, productivity: 4.2 },
];

/* ─── NextAdmin status classes ─── */
const statusChip = (status: string) => {
  switch (status) {
    case "ahead":     return "bg-success/10 text-success";
    case "behind":    return "bg-danger/10 text-danger";
    case "on-track":  return "bg-green-500/10  text-green-500 ";
    case "delayed":   return "bg-danger/10 text-danger";
    case "at-risk":   return "bg-warning/10 text-yellow-400";
    default:          return "bg-meta-2 text-body dark:bg-meta-4 dark:text-bodydark";
  }
};

const markerColor = (status: string) => {
  switch (status) {
    case "on-track": return "#3C50E0"; // NextAdmin primary
    case "delayed":  return "#D34053"; // danger
    case "at-risk":  return "#FFA70B"; // warning
    default:         return "#64748B";
  }
};

/* ─── Reusable Card (NextAdmin pattern) ─── */
const Card = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div style={style} className={cx(
    "rounded-sm border border-stroke bg-white px-5 pt-6 pb-5 shadow-default",
    "dark:border-strokedark dark:bg-boxdark sm:px-7.5",
    className,
  )}>
    {children}
  </div>
);

const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cx("text-lg font-semibold text-black dark:text-white flex items-center gap-2", className)}> 
    {children}
  </h3>
);

/* ─── Animated helpers ─── */
const AnimatedNumber = ({ end, decimals = 0, delay = 0, suffix = "", prefix = "" }: {
  end: number; decimals?: number; delay?: number; suffix?: string; prefix?: string;
}) => {
  const value = useCountUp({ end, decimals, delay });
  return <>{prefix}{value}{suffix}</>;
};

const ChangeIndicator = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  if (value === 0) return (
    <span className="text-bodydark2 text-xs flex items-center gap-0.5">
      <Minus className="h-3 w-3" /> No change
    </span>
  );
  const positive = value > 0;
  return (
    <span className={cx("text-xs font-semibold flex items-center gap-0.5", positive ? "text-success" : "text-danger")}>
      {positive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {positive ? "+" : ""}{value}{suffix}
    </span>
  );
};

const AnimatedBar = ({ pct, className }: { pct: number; className?: string }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  return (
    <div className="h-2 rounded-full bg-stroke dark:bg-strokedark overflow-hidden">
      <div
        className={cx("h-full rounded-full transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]", className ?? "bg-green-500")}
        style={{ width: mounted ? `${pct}%` : "0%" }}
      />
    </div>
  );
};

/* ─── Performance Gauge (SVG) ─── */
interface MilestoneMarker { name: string; pctPosition: number; status: string; }

const PerformanceGauge = ({ pct, variance, milestones }: {
  pct: number; variance: number; milestones: MilestoneMarker[];
}) => {
  const [animatedPct, setAnimatedPct] = useState(0);
  const isGood = variance >= 0;
  const cxC = 120, cyC = 120, r = 90;
  const startAngle = 225, endAngle = -45;
  const totalSweep = startAngle - endAngle;
  const pctToAngle = (p: number) => startAngle - (p / 100) * totalSweep;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  useEffect(() => {
    const t = setTimeout(() => setAnimatedPct(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);

  const describeArc = (radius: number, start: number, end: number) => {
    const s = toRad(start), e = toRad(end);
    const x1 = cxC + radius * Math.cos(s), y1 = cyC - radius * Math.sin(s);
    const x2 = cxC + radius * Math.cos(e), y2 = cyC - radius * Math.sin(e);
    const sweep = start - end;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleAngle = pctToAngle(animatedPct);
  const needleRad = toRad(needleAngle);
  const needleLen = r - 20;
  const nx = cxC + needleLen * Math.cos(needleRad);
  const ny = cyC - needleLen * Math.sin(needleRad);

  const displayPct = useCountUp({ end: pct, delay: 300, duration: 1500 });

  return (
    <div className="flex flex-col items-center relative">
      <svg width="280" height="200" viewBox="-20 -20 280 200" className="overflow-visible">
        <defs>
          <linearGradient id="naGaugeFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={isGood ? "#10B981" : "#D34053"} />
            <stop offset="100%" stopColor={isGood ? "#3C50E0" : "#FFA70B"} />
          </linearGradient>
          <filter id="naNeedleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1C2434" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Track */}
        <path d={describeArc(r, startAngle, endAngle)} fill="none"
          className="stroke-stroke dark:stroke-strokedark" strokeWidth="14" strokeLinecap="round" />

        {/* Filled arc */}
        {animatedPct > 0 && (
          <path
            d={describeArc(r, startAngle, pctToAngle(animatedPct))}
            fill="none" stroke="url(#naGaugeFill)" strokeWidth="14" strokeLinecap="round"
            style={{ transition: "all 1.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        )}

        {/* Milestone markers */}
        {milestones.map((m, i) => {
          const angle = toRad(pctToAngle(m.pctPosition));
          const innerR = r + 4, outerR = r + 14, labelR = r + 24;
          const x1 = cxC + innerR * Math.cos(angle), y1 = cyC - innerR * Math.sin(angle);
          const x2 = cxC + outerR * Math.cos(angle), y2 = cyC - outerR * Math.sin(angle);
          const lx = cxC + labelR * Math.cos(angle), ly = cyC - labelR * Math.sin(angle);
          const color = markerColor(m.status);
          return (
            <g key={i} className="animate-pulse-glow" style={{ animationDelay: `${i * 400}ms` }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3" strokeLinecap="round" />
              <circle cx={x2} cy={y2} r="4" fill={color} /> test
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                className="text-[7px] font-semibold" fill={color}>
                {m.name}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <g className="needle-tremble"
           style={{ "--needle-cx": `${cxC}px`, "--needle-cy": `${cyC}px` } as React.CSSProperties}>
          <line x1={cxC} y1={cyC} x2={nx} y2={ny}
            className="stroke-black dark:stroke-white" strokeWidth="2.5" strokeLinecap="round"
            filter="url(#naNeedleShadow)"
            style={{ transition: "all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
          <circle cx={cxC} cy={cyC} r="6" className="fill-black dark:fill-white" />
          <circle cx={cxC} cy={cyC} r="3" className="fill-white dark:fill-boxdark" />
        </g>

        {/* Center labels */}
        <text x={cxC} y={cyC + 30} textAnchor="middle"
          className="text-2xl font-bold fill-black dark:fill-white">
          {displayPct}%
        </text>
        <text x={cxC} y={cyC + 46} textAnchor="middle"
          className="text-[10px] font-semibold"
          fill={isGood ? "#10B981" : "#D34053"}>
          {variance >= 0 ? "+" : ""}{variance} days
        </text>
      </svg>
    </div>
  );
};

/* ─── Task Ring ─── */
const TaskRing = ({ pct, status }: { pct: number; status: string }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);
  const displayPct = useCountUp({ end: pct, delay: 200 });
  const stroke = mounted ? pct * 0.9738 : 0;
  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-stroke dark:stroke-strokedark" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none"
          stroke={status === "behind" ? "#D34053" : "var(--chart-color-1)"}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${stroke} 97.38`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black dark:text-white">
        {displayPct}%
      </span>
    </div>
  );
};

/* ─── Analytics Slide-over (no Radix) ─── */
const AnalyticsDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <>
    <div
      className={cx("fixed inset-0 bg-black/40 z-40 transition-opacity",
        open ? "opacity-100" : "opacity-0 pointer-events-none")}
      onClick={onClose}
    />
    <aside
      className={cx(
        "fixed right-0 top-0 h-full w-full sm:w-[520px] z-50 bg-white dark:bg-boxdark",
        "shadow-elevated border-l border-stroke dark:border-strokedark overflow-y-auto",
        "transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-stroke dark:border-strokedark">
        <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-green-500" /> Performance Analytics                                             
        </h3>
        <button onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-2 dark:hover:bg-meta-4 text-body dark:text-bodydark">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-body dark:text-bodydark">
          Tasks requiring increased manpower and resources:
        </p>

        {analyticsInsights.map((insight, i) => (
          <div key={insight.task}
            className="rounded-sm border border-stroke dark:border-strokedark p-4 space-y-3 animate-fade-in"
            style={{ animationDelay: `${i * 120}ms` }}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black dark:text-white">{insight.task}</h4>
              <span className={cx("px-2.5 py-1 rounded-full text-xs font-medium", statusChip("at-risk"))}>
                +{insight.pctIncrease}% manpower
              </span>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-black dark:text-white">+{insight.manpowerIncrease}</p>
                <p className="text-[10px] uppercase tracking-wide text-bodydark2">People Needed</p>
              </div>
              <div className="flex-1 pl-4 border-l border-stroke dark:border-strokedark">
                <p className="text-xs text-body dark:text-bodydark">{insight.reason}</p>
              </div>
            </div>
            <AnimatedBar pct={insight.pctIncrease} className="bg-gradient-to-r from-warning to-danger" />
          </div>
        ))}

        <div className="rounded-sm border border-stroke dark:border-strokedark p-4">
          <h4 className="text-sm font-semibold text-black dark:text-white mb-3">Weekly Trend</h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="naAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3C50E0" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3C50E0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip />
                <Area type="monotone" dataKey="attendance" stroke="#3C50E0" fill="url(#naAreaGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="productivity" stroke="#10B981" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </aside>
  </>
);

/* ─── Main Page ─── */
const PerformanceDashboard = () => {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const attendancePresent = useCountUp({ end: teamData.attendance.present, delay: 400 });
  const machinesTotal = useCountUp({ end: teamData.machines.total, delay: 600 });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-title-md2 font-semibold text-black dark:text-white">
            Performance Dashboard
          </h1>
          <p className="text-sm text-body dark:text-bodydark mt-1">
            Track project progress, team efficiency, and task milestones.
          </p>
        </div>
        <button
          onClick={() => setAnalyticsOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition shadow-default"
        >
          <Sparkles className="h-4 w-4" /> Analytics
        </button>
      </div>

      {/* Section 1: Overall + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-stagger">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <CardTitle>
              <Target className="h-5 w-5 text-green-500" /> Overall Completion
            </CardTitle>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span className="text-[10px] font-medium text-success uppercase tracking-wider">Live</span>
            </span>
          </div>
          <div className="flex justify-center">
            <PerformanceGauge
              pct={overallData.completed}
              variance={overallData.daysVariance}
              milestones={milestoneData.map((m) => ({
                name: m.name.replace(" 100%", "").replace(" 50%", ""),
                pctPosition: Math.round(((262 - m.daysLeft) / 262) * 100),
                status: m.status,
              }))}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">
            <Clock className="h-5 w-5 text-green-500" /> Schedule & Milestones
          </CardTitle>
          <div className="space-y-3">
            {milestoneData.map((m, i) => (
              <div key={m.name}
                className="flex items-center gap-4 p-3 rounded-sm border border-stroke dark:border-strokedark hover:bg-gray-2 dark:hover:bg-meta-4 transition-colors"
                style={{ animation: `slide-fade-in 0.4s ease-out ${200 + i * 100}ms forwards`, opacity: 0 }}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-black dark:text-white">{m.name}</p>
                  <p className="text-xs text-body dark:text-bodydark">Target: {m.target}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-black dark:text-white">
                    <AnimatedNumber end={m.daysLeft} delay={300 + i * 100} />
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-bodydark2">Days Left</p>
                </div>
                <span className={cx("px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide", statusChip(m.status))}>
                  {m.status.replace("-", " ")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Section 2: Task-Wise */}
      <Card style={{ animation: "slide-fade-in 0.5s ease-out 100ms forwards", opacity: 0 } as React.CSSProperties}>
        <CardTitle className="mb-4">
          <TrendingUp className="h-5 w-5 text-success" /> Task-Wise Performance
        </CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
          {taskPerformance.map((t, i) => (
            <div key={t.task}
              className="p-4 rounded-sm border border-stroke dark:border-strokedark hover:shadow-card transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-black dark:text-white">{t.task}</p>
                <span className={cx("px-2 py-0.5 rounded-full text-[10px] font-medium", statusChip(t.status))}>
                  {t.status.replace("-", " ")}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <TaskRing pct={t.pct} status={t.status} />
                <div className="space-y-1">
                  <p className="text-xs text-body dark:text-bodydark">
                    <AnimatedNumber end={t.completed} delay={300 + i * 80} />/{t.total} completed
                  </p>
                  <ChangeIndicator value={t.variance} suffix=" days" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 3: Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-stagger">
        <Card>
          <CardTitle className="mb-4">
            <CalendarCheck className="h-5 w-5 text-green-500" /> Attendance
          </CardTitle>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-title-lg font-bold text-black dark:text-white">{attendancePresent}</p>
                <p className="text-xs text-body dark:text-bodydark">of {teamData.attendance.total} total</p>
              </div>
              <ChangeIndicator value={teamData.attendance.weeklyChange} suffix=" this week" />
            </div>
            <AnimatedBar pct={(teamData.attendance.present / teamData.attendance.total) * 100} className="bg-green-500" />
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-bodydark2">
              <span>Present {Math.round((teamData.attendance.present / teamData.attendance.total) * 100)}%</span>
              <span>Absent {Math.round(((teamData.attendance.total - teamData.attendance.present) / teamData.attendance.total) * 100)}%</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">
            <Users className="h-5 w-5 text-green-500" /> Task Manpower & Productivity
          </CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-bodydark2 uppercase tracking-wide">Task</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-bodydark2 uppercase tracking-wide">Deployed</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-bodydark2 uppercase tracking-wide">Productivity</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-bodydark2 uppercase tracking-wide">Change</th>
                </tr>
              </thead>
              <tbody>
                {teamData.taskManpower.map((row, i) => (
                  <tr key={row.task}
                    className="border-b border-stroke/60 dark:border-strokedark/60 hover:bg-gray-2 dark:hover:bg-meta-4 transition-colors"
                    style={{ animation: `slide-fade-in 0.4s ease-out ${i * 80}ms forwards`, opacity: 0 }}>
                    <td className="py-3 px-3 font-medium text-black dark:text-white">{row.task}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                        <Users className="h-3 w-3" /> <AnimatedNumber end={row.deployed} delay={400 + i * 80} />
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx("font-bold",
                        row.productivity >= 3 ? "text-success" :
                        row.productivity >= 1 ? "text-warning" : "text-bodydark2")}>
                        <AnimatedNumber end={row.productivity} decimals={1} delay={400 + i * 80} />
                      </span>
                      <span className="text-bodydark2 text-[10px] ml-1">/ person</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ChangeIndicator value={row.prodChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Section 4: Machines + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-stagger">
        <Card>
          <CardTitle className="mb-4">
            <Wrench className="h-5 w-5 text-warning" /> Machines Deployed
          </CardTitle>
          <div className="flex items-end justify-between">
            <p className="text-title-lg font-bold text-black dark:text-white">{machinesTotal}</p>
            <ChangeIndicator value={teamData.machines.weeklyChange} suffix=" this week" />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Task Completion Overview</CardTitle>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskPerformance} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="task" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[6, 6, 0, 0]} animationDuration={1500} />
                <Bar dataKey="total" name="Total" fill="#E2E8F0" radius={[6, 6, 0, 0]} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <AnalyticsDrawer open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
    </div>
  );
};

export default PerformanceDashboard;
