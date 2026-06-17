"use client";

import { use, useMemo, useState } from "react";
import { ChevronRight, Users, Wrench, TrendingUp, TrendingDown, Search, Layers, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentsdummy/ui/card";
import { Input } from "@/componentsdummy/ui/input";
import { Button } from "@/componentsdummy/ui/button";
import { Badge } from "@/componentsdummy/ui/badge";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooksdummy/hooks/use-count-up";

// ---------- Demo Data ----------
const TASKS = ["Desktop Plan", "BoQ", "Execution", "GoLive"] as const;
type TaskName = typeof TASKS[number];

// Per-task base totals at the block level (units vary by task type)
const TASK_BASE_TOTAL: Record<TaskName, number> = {
  "Desktop Plan": 12, // sheets
  BoQ: 80,            // line items
  Execution: 240,     // km / sites
  GoLive: 10,         // go-live sites
};

const TASK_UNIT: Record<TaskName, string> = {
  "Desktop Plan": "sheets",
  BoQ: "items",
  Execution: "km",
  GoLive: "sites",
};

type TaskStat = { completed: number; total: number; variance: number };

type Block = {
  name: string;
  stats: Record<TaskName, TaskStat>;
  manpower: number;
  machines: number;
};
type District = { name: string; blocks: Block[] };
type Zone = { name: string; districts: District[] };

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const makeBlock = (name: string, r: () => number): Block => {
  const p1 = 60 + r() * 40;
  const p2 = Math.max(0, p1 - 5 - r() * 25);
  const p3 = Math.max(0, p2 - 10 - r() * 30);
  const p4 = Math.max(0, p3 - 15 - r() * 35);
  const pcts: Record<TaskName, number> = {
    "Desktop Plan": p1, BoQ: p2, Execution: p3, GoLive: p4,
  };
  const stats = Object.fromEntries(
    TASKS.map((t) => {
      const total = Math.max(1, Math.round(TASK_BASE_TOTAL[t] * (0.7 + r() * 0.6)));
      const completed = Math.round((pcts[t] / 100) * total);
      const variance = Math.round((r() - 0.5) * 18);
      return [t, { completed, total, variance }];
    }),
  ) as Record<TaskName, TaskStat>;
  return {
    name,
    stats,
    manpower: Math.round(20 + r() * 80),
    machines: Math.round(2 + r() * 12),
  };
};

const buildData = (): { package: string; zones: Zone[] } => {
  const r = rand(42);
  const blockNames = [
    ["Sonamura", "Belonia", "Amarpur", "Kumarghat", "Khowai"],
    ["Bishalgarh", "Udaipur", "Kailashahar", "Dharmanagar"],
    ["Sabroom", "Teliamura", "Ambassa", "Panisagar", "Jirania"],
  ];
  const layout: { zone: string; districts: string[] }[] = [
    { zone: "Tripura", districts: ["West Tripura", "South Tripura", "Gomati", "Dhalai"] },
    { zone: "Mizoram", districts: ["Aizawl", "Lunglei", "Champhai"] },
    { zone: "Meghalaya", districts: ["East Khasi Hills", "West Garo Hills", "Ri-Bhoi", "Jaintia Hills"] },
  ];
  return {
    package: "NER1",
    zones: layout.map((z) => ({
      name: z.zone,
      districts: z.districts.map((d, di) => ({
        name: d,
        blocks: blockNames[di % blockNames.length]
          .slice(0, 4 + Math.floor(r() * 2))
          .map((b) => makeBlock(`${b}`, r)),
      })),
    })),
  };
};

const DATA = buildData();

// ---------- Helpers ----------
const pct = (s: TaskStat) => (s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0);

// Returns gradient classes for the % bar
const barGradient = (v: number) => {
  if (v >= 85) return "from-emerald-400 to-emerald-600";
  if (v >= 70) return "from-lime-400 to-emerald-500";
  if (v >= 55) return "from-amber-400 to-lime-500";
  if (v >= 40) return "from-orange-400 to-amber-400";
  if (v >= 25) return "from-rose-400 to-orange-400";
  if (v > 0) return "from-rose-500 to-rose-400";
  return "from-muted to-muted";
};

const dotColorFor = (v: number) => {
  if (v >= 85) return "bg-emerald-500";
  if (v >= 70) return "bg-lime-500";
  if (v >= 55) return "bg-amber-400";
  if (v >= 40) return "bg-orange-400";
  if (v > 0) return "bg-rose-500";
  return "bg-muted-foreground/40";
};

const sumStats = (list: TaskStat[]): TaskStat => {
  const total = list.reduce((s, x) => s + x.total, 0);
  const completed = list.reduce((s, x) => s + x.completed, 0);
  // weighted variance by total
  const wSum = list.reduce((s, x) => s + x.variance * x.total, 0);
  const variance = total > 0 ? Math.round(wSum / total) : 0;
  return { completed, total, variance };
};

const aggregateBlocks = (blocks: Block[]) => {
  const stats = Object.fromEntries(
    TASKS.map((t) => [t, sumStats(blocks.map((b) => b.stats[t]))]),
  ) as Record<TaskName, TaskStat>;
  const overallStat = sumStats(Object.values(stats));
  return {
    stats,
    overall: pct(overallStat),
    variance: overallStat.variance,
    manpower: blocks.reduce((s, b) => s + b.manpower, 0),
    machines: blocks.reduce((s, b) => s + b.machines, 0),
  };
};

const aggregateDistricts = (districts: District[]) => {
  const blocks = districts.flatMap((d) => d.blocks);
  return { ...aggregateBlocks(blocks), count: blocks.length };
};

const aggregateZones = (zones: Zone[]) => {
  const blocks = zones.flatMap((z) => z.districts.flatMap((d) => d.blocks));
  return { ...aggregateBlocks(blocks), count: blocks.length };
};

const formatNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// ---------- Components ----------
const ProgressTile = ({
  stat,
  task,
  delay = 0,
}: {
  stat: TaskStat;
  task: TaskName;
  delay?: number;
}) => {
  const percent = pct(stat);
  const animatedPct = useCountUp({ end: percent, duration: 1200, delay });
  const animatedDone = useCountUp({ end: stat.completed, duration: 1400, delay });
  const ahead = stat.variance > 0;
  const onTime = stat.variance === 0;
  const varianceColor = onTime
    ? "text-muted-foreground"
    : ahead
      ? "text-emerald-600"
      : "text-rose-600";

  return (
    <div
      className="group relative h-[68px] rounded-lg border border-border bg-card px-2.5 py-1.5 flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-default"
      style={{ animation: `slide-fade-in 0.5s ease-out ${delay}ms backwards` }}
      title={`${task}: ${stat.completed} of ${stat.total} ${TASK_UNIT[task]} (${percent}%)`}
    >
      {/* qty + variance */}
      <div className="flex items-baseline justify-between gap-1">
        <div className="flex items-baseline gap-0.5 tabular-nums leading-none">
          <span className="text-sm font-bold text-foreground">{formatNum(animatedDone)}</span>
          <span className="text-[10px] text-muted-foreground">/{formatNum(stat.total)}</span>
        </div>
        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums leading-none", varianceColor)}>
          {!onTime && (ahead ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />)}
          {onTime ? <Clock className="h-2.5 w-2.5" /> : null}
          {onTime ? "0d" : `${ahead ? "+" : ""}${stat.variance}d`}
        </span>
      </div>

      {/* progress bar */}
      <div className="space-y-0.5">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
              barGradient(percent),
            )}
            style={{ width: `${animatedPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between leading-none">
          <span className="inline-flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColorFor(percent))} />
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{TASK_UNIT[task]}</span>
          </span>
          <span className="text-[10px] font-bold tabular-nums text-foreground">{animatedPct}%</span>
        </div>
      </div>
    </div>
  );
};

const VarianceBadge = ({ days }: { days: number }) => {
  const ahead = days > 0;
  const onTime = days === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums",
        onTime && "bg-muted text-muted-foreground",
        ahead && "bg-emerald-100 text-emerald-700",
        !ahead && !onTime && "bg-rose-100 text-rose-700",
      )}
    >
      {ahead ? <TrendingUp className="h-3 w-3" /> : !onTime && <TrendingDown className="h-3 w-3" />}
      {onTime ? "On Time" : `${ahead ? "+" : ""}${days}d`}
    </span>
  );
};

const ResourcePill = ({ icon: Icon, value, color }: { icon: any; value: number; color: string }) => (
  <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", color)}>
    <Icon className="h-3 w-3" /> {value}
  </span>
);

type Row = {
  level: "package" | "zone" | "district" | "block";
  name: string;
  id: string;
  stats: Record<TaskName, TaskStat>;
  overall: number;
  variance: number;
  manpower: number;
  machines: number;
  childCount?: number;
  hasChildren: boolean;
};

const HierarchyRow = ({
  row,
  expanded,
  onToggle,
  depth,
  index,
}: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
  depth: 0 | 1 | 2 | 3;
  index: number;
}) => {
  const overallAnim = useCountUp({ end: row.overall, duration: 1200 });
  const indent = ["pl-4", "pl-10", "pl-16", "pl-24"][depth];
  const bg = ["bg-gradient-to-r from-primary/5 to-transparent", "bg-muted/40", "bg-background", "bg-background"][depth];
  const labelStyle = [
    "text-base font-bold text-foreground",
    "text-sm font-semibold text-foreground",
    "text-sm font-medium text-foreground",
    "text-sm text-muted-foreground",
  ][depth];
  const dotColor = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-slate-400"][depth];

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(240px,1.4fr)_minmax(90px,0.8fr)_repeat(4,minmax(120px,1fr))_minmax(120px,0.9fr)] items-center gap-3 px-3 py-2.5 border-b border-border/60 transition-colors hover:bg-muted/30",
        bg,
        indent,
      )}
      style={{ animation: `slide-fade-in 0.45s ease-out ${index * 30}ms backwards` }}
    >
      <button
        onClick={row.hasChildren ? onToggle : undefined}
        className={cn(
          "flex items-center gap-2 text-left -ml-2 pr-2",
          row.hasChildren && "cursor-pointer hover:text-primary",
        )}
      >
        {row.hasChildren ? (
          <ChevronRight
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", expanded && "rotate-90")}
          />
        ) : (
          <span className={cn("h-1.5 w-1.5 rounded-full ml-1", dotColor)} />
        )}
        <span className={labelStyle}>{row.name}</span>
        {row.childCount !== undefined && (
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
            {row.childCount}
          </Badge>
        )}
      </button>
      {/* Overall progress circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(overallAnim / 100) * 94.25} 94.25`}
              className="transition-all duration-700"
            />
          </svg>
          <span className="text-xs font-bold tabular-nums">{overallAnim}%</span>
        </div>
      </div>
      {TASKS.map((t, ti) => (
        <ProgressTile key={t} stat={row.stats[t]} task={t} delay={ti * 60} />
      ))}
      <div className="flex flex-col items-end gap-1.5">
        <VarianceBadge days={row.variance} />
        <div className="flex items-center gap-2">
          <ResourcePill icon={Users} value={row.manpower} color="text-sky-600" />
          <ResourcePill icon={Wrench} value={row.machines} color="text-violet-600" />
        </div>
      </div>
    </div>
  );
};

const ColumnHeader = () => (
  <div className="grid grid-cols-[minmax(240px,1.4fr)_minmax(90px,0.8fr)_repeat(4,minmax(120px,1fr))_minmax(120px,0.9fr)] items-center gap-3 px-3 py-3 bg-muted/60 border-b border-border sticky top-0 z-10">
    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      Package / Zone / District / Block
    </div>
    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Overall</div>
    {TASKS.map((t) => (
      <div key={t} className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
        {t}
      </div>
    ))}
    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
      Schedule & Resources
    </div>
  </div>
);

// ---------- KPI Cards ----------
const KpiCard = ({
  label,
  value,
  suffix,
  accent,
  delay,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  delay: number;
  icon: any;
}) => {
  const animated = useCountUp({ end: value, duration: 1600 });
  return (
    <Card
      className="border-border overflow-hidden relative group hover:shadow-md transition-shadow"
      style={{ animation: `slide-fade-in 0.6s ease-out ${delay}ms backwards` }}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1", accent)} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold tabular-nums">
          {animated.toLocaleString()}
          {suffix && <span className="text-lg text-muted-foreground ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Legend ----------
const Legend = () => (
  <div className="flex items-center gap-3 text-xs flex-wrap">
    <div className="flex items-center gap-1.5">
      <span className="font-medium text-muted-foreground">Progress</span>
      {[
        ["0%", "from-muted to-muted"],
        ["<25", "from-rose-500 to-rose-400"],
        ["25-54", "from-orange-400 to-amber-400"],
        ["55-84", "from-amber-400 to-lime-500"],
        ["85%+", "from-emerald-400 to-emerald-600"],
      ].map(([label, cls]) => (
        <div key={label} className="flex items-center gap-1">
          <span className={cn("h-2 w-6 rounded-full bg-gradient-to-r", cls)} />
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 pl-2 border-l border-border">
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
        <TrendingUp className="h-3 w-3" /> Ahead
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
        <TrendingDown className="h-3 w-3" /> Delayed
      </span>
    </div>
  </div>
);

// ---------- Page ----------
const TaskManager = () => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["pkg:NER1"]));
  const [query, setQuery] = useState("");

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll = () => {
    const ids = new Set<string>(["pkg:NER1"]);
    DATA.zones.forEach((z) => {
      ids.add(`zone:${z.name}`);
      z.districts.forEach((d) => ids.add(`dist:${z.name}:${d.name}`));
    });
    setExpanded(ids);
  };
  const collapseAll = () => setExpanded(new Set(["pkg:NER1"]));

  const pkgAgg = useMemo(() => aggregateZones(DATA.zones), []);

  const rows = useMemo(() => {
    const out: { row: Row; depth: 0 | 1 | 2 | 3 }[] = [];
    out.push({
      depth: 0,
      row: {
        level: "package",
        id: "pkg:NER1",
        name: `Package ${DATA.package}`,
        stats: pkgAgg.stats,
        overall: pkgAgg.overall,
        variance: pkgAgg.variance,
        manpower: pkgAgg.manpower,
        machines: pkgAgg.machines,
        childCount: DATA.zones.length,
        hasChildren: true,
      },
    });
    if (!expanded.has("pkg:NER1")) return out;

    const q = query.toLowerCase();
    DATA.zones.forEach((zone) => {
      const zAgg = aggregateDistricts(zone.districts);
      const zId = `zone:${zone.name}`;
      const zoneMatch =
        !q ||
        zone.name.toLowerCase().includes(q) ||
        zone.districts.some(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.blocks.some((b) => b.name.toLowerCase().includes(q)),
        );
      if (!zoneMatch) return;

      out.push({
        depth: 1,
        row: {
          level: "zone",
          id: zId,
          name: zone.name,
          stats: zAgg.stats,
          overall: zAgg.overall,
          variance: zAgg.variance,
          manpower: zAgg.manpower,
          machines: zAgg.machines,
          childCount: zone.districts.length,
          hasChildren: true,
        },
      });
      if (!expanded.has(zId)) return;

      zone.districts.forEach((dist) => {
        const dAgg = aggregateBlocks(dist.blocks);
        const dId = `dist:${zone.name}:${dist.name}`;
        const distMatch =
          !q ||
          dist.name.toLowerCase().includes(q) ||
          dist.blocks.some((b) => b.name.toLowerCase().includes(q)) ||
          zone.name.toLowerCase().includes(q);
        if (!distMatch) return;

        out.push({
          depth: 2,
          row: {
            level: "district",
            id: dId,
            name: dist.name,
            stats: dAgg.stats,
            overall: dAgg.overall,
            variance: dAgg.variance,
            manpower: dAgg.manpower,
            machines: dAgg.machines,
            childCount: dist.blocks.length,
            hasChildren: true,
          },
        });
        if (!expanded.has(dId)) return;

        dist.blocks
          .filter(
            (b) =>
              !q ||
              b.name.toLowerCase().includes(q) ||
              dist.name.toLowerCase().includes(q) ||
              zone.name.toLowerCase().includes(q),
          )
          .forEach((b) => {
            const bAgg = aggregateBlocks([b]);
            out.push({
              depth: 3,
              row: {
                level: "block",
                id: `block:${dId}:${b.name}`,
                name: b.name,
                stats: b.stats,
                overall: bAgg.overall,
                variance: bAgg.variance,
                manpower: b.manpower,
                machines: b.machines,
                hasChildren: false,
              },
            });
          });
      });
    });
    return out;
  }, [expanded, query, pkgAgg]);

  return (
    <div className="space-y-6 p-8 bg-white">
      {/* Header */}
      <div
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        style={{ animation: "slide-fade-in 0.5s ease-out" }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Layers className="h-3.5 w-3.5" /> Task Manager
          </div>
          <h1 className="text-3xl font-bold text-foreground">Package NER1 — Progress Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quantity, completion and schedule adherence across Zones, Districts and Blocks. Click any row to drill in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search zone, district, block..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Overall Completion"
          value={pkgAgg.overall}
          suffix="%"
          accent="bg-gradient-to-r from-primary to-emerald-400"
          delay={50}
          icon={TrendingUp}
        />
        <KpiCard
          label="Blocks Tracked"
          value={pkgAgg.count}
          accent="bg-gradient-to-r from-sky-400 to-cyan-400"
          delay={150}
          icon={Layers}
        />
        <KpiCard
          label="Manpower Deployed"
          value={pkgAgg.manpower}
          accent="bg-gradient-to-r from-violet-500 to-fuchsia-400"
          delay={250}
          icon={Users}
        />
        <KpiCard
          label="Machines Deployed"
          value={pkgAgg.machines}
          accent="bg-gradient-to-r from-amber-400 to-orange-500"
          delay={350}
          icon={Wrench}
        />
      </div>

      {/* Hierarchy */}
      <Card
        className="border-border overflow-hidden"
        style={{ animation: "slide-fade-in 0.6s ease-out 200ms backwards" }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg">Hierarchy Progress</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Each tile shows completed / total qty, a colored % bar and schedule adherence.
            </p>
          </div>
          <Legend />
        </CardHeader>
        <CardContent className="p-0">
          <ColumnHeader />
          <div>
            {rows.map(({ row, depth }, i) => (
              <HierarchyRow
                key={row.id}
                row={row}
                depth={depth}
                expanded={expanded.has(row.id)}
                onToggle={() => toggle(row.id)}
                index={i}
              />
            ))}
            {rows.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No matches.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskManager;
