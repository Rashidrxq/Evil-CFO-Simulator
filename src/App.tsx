import { useState } from "react";
import { runAudit } from "./game/auditor";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileSearch,
  Landmark,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  actionDetails,
  applyCFOAction,
  calculateOperatingProfit,
  initialCompany,
  type CFOAction,
  type CompanyState,
  type GameEvent,
} from "./game/engine";

type Page =
  | "Dashboard"
  | "CFO Activity"
  | "Investigation"
  | "Risk Analysis"
  | "Reports";

const navigation: {
  name: Page;
  icon: typeof LayoutDashboard;
}[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "CFO Activity", icon: Activity },
  { name: "Investigation", icon: FileSearch },
  { name: "Risk Analysis", icon: ShieldAlert },
  { name: "Reports", icon: ClipboardCheck },
];

const actionOptions: {
  id: CFOAction;
  title: string;
  description: string;
  icon: typeof Wallet;
  color: string;
}[] = [
  {
    id: "cut_maintenance",
    title: "Cut maintenance",
    description: "Reduce current costs while allowing maintenance risk to accumulate.",
    icon: Zap,
    color: "amber",
  },
  {
    id: "delay_suppliers",
    title: "Delay supplier payments",
    description: "Preserve cash now at the expense of supplier confidence.",
    icon: Wallet,
    color: "rose",
  },
  {
    id: "borrow_money",
    title: "Borrow more money",
    description: "Increase available cash and add to outstanding debt.",
    icon: Landmark,
    color: "blue",
  },
  {
    id: "invest_efficiency",
    title: "Invest in efficiency",
    description: "Spend cash to lower expenses and improve operational resilience.",
    icon: Target,
    color: "emerald",
  },
];

const formatMoney = (value: number) => {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000) {
    return `${value < 0 ? "-" : ""}₹${(absolute / 1_000_000_000).toFixed(2)}B`;
  }

  if (absolute >= 1_000_000) {
    return `${value < 0 ? "-" : ""}₹${(absolute / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `${value < 0 ? "-" : ""}₹${(absolute / 1_000).toFixed(0)}K`;
  }

  return `${value < 0 ? "-" : ""}₹${absolute.toFixed(0)}`;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function getProfitMargin(company: CompanyState) {
  if (company.revenue <= 0) return 0;
  return (calculateOperatingProfit(company) / company.revenue) * 100;
}

function getOverallRisk(company: CompanyState) {
  const maintenanceRisk = Math.min(company.maintenanceBacklog, 100) * 0.35;
  const supplierRisk = (100 - company.supplierTrust) * 0.25;
  const moraleRisk = (100 - company.employeeMorale) * 0.15;
  const operationalRisk = company.operationalRisk * 0.25;

  return Math.min(
    100,
    Math.max(
      0,
      maintenanceRisk + supplierRisk + moraleRisk + operationalRisk,
    ),
  );
}

function getRiskLabel(risk: number) {
  if (risk >= 70) return "Critical";
  if (risk >= 45) return "High";
  if (risk >= 25) return "Moderate";
  return "Low";
}

function getRiskColor(risk: number) {
  if (risk >= 70) return "text-rose-400";
  if (risk >= 45) return "text-orange-400";
  if (risk >= 25) return "text-amber-400";
  return "text-emerald-400";
}

function getActionName(action: CFOAction) {
  return actionDetails[action]?.title ?? action;
}

function getEventTone(event: GameEvent) {
  const text = `${event.title} ${event.description}`.toLowerCase();

  if (
    text.includes("risk") ||
    text.includes("critical") ||
    text.includes("backlog") ||
    text.includes("trust") ||
    text.includes("delay")
  ) {
    return "rose";
  }

  if (
    text.includes("invest") ||
    text.includes("improv") ||
    text.includes("efficiency")
  ) {
    return "emerald";
  }

  return "blue";
}

function App() {
  const [company, setCompany] = useState<CompanyState>(initialCompany);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<CompanyState[]>([initialCompany]);
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [selectedAction, setSelectedAction] =
    useState<CFOAction>("cut_maintenance");
  const [pendingAction, setPendingAction] = useState<CFOAction | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const profit = calculateOperatingProfit(company);
  const profitMargin = getProfitMargin(company);
  const overallRisk = getOverallRisk(company);
  const previousCompany = history.length > 1 ? history[history.length - 2] : null;

  const profitChange = previousCompany
    ? profit - calculateOperatingProfit(previousCompany)
    : 0;

  const visibleEvents = events.filter((event) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return `${event.title} ${event.description} ${event.category ?? ""}`
      .toLowerCase()
      .includes(query);
  });

  function advanceRound() {
    const action = pendingAction ?? selectedAction;
    const result = applyCFOAction(company, action);

    if (result.company === company) {
      setNotice("Not enough cash to execute this decision.");
      return;
    }

    setCompany(result.company);
    setHistory((current) => [...current, result.company]);
    setEvents((current) => [...result.events, ...current]);
    setPendingAction(null);
    setNotice(`Decision executed: ${getActionName(action)}.`);
  }

  function restartCampaign() {
    setCompany(initialCompany);
    setEvents([]);
    setHistory([initialCompany]);
    setSelectedAction("cut_maintenance");
    setPendingAction(null);
    setNotice("Campaign restarted. All metrics have been reset.");
    setActivePage("Dashboard");
  }

  function choosePage(page: Page) {
    setActivePage(page);
    setSidebarOpen(false);
    setNotice("");
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.07] bg-[#0c1019] transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <Bot size={23} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide">EVIL CFO</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Simulator
              </div>
            </div>
            <button
              className="ml-auto rounded-lg p-1 text-slate-500 hover:bg-white/5 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Workspace
            </div>

            <nav className="space-y-1">
              {navigation.map(({ name, icon: Icon }) => {
                const active = activePage === name;

                return (
                  <button
                    key={name}
                    onClick={() => choosePage(name)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      active
                        ? "bg-rose-500/10 font-medium text-rose-300 ring-1 ring-inset ring-rose-500/15"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{name}</span>
                    {name === "Investigation" && events.length > 0 && (
                      <span className="ml-auto rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-300">
                        {events.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-rose-500/15 bg-gradient-to-br from-rose-500/[0.09] to-transparent p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                <ShieldAlert size={15} />
                Hidden liabilities
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {Math.round(overallRisk)}
                <span className="ml-1 text-sm font-normal text-slate-500">
                  /100
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full transition-all ${
                    overallRisk >= 70
                      ? "bg-rose-500"
                      : overallRisk >= 45
                        ? "bg-orange-400"
                        : "bg-amber-400"
                  }`}
                  style={{ width: `${overallRisk}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {getRiskLabel(overallRisk)} exposure
              </div>
            </div>

            <button
              onClick={restartCampaign}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
            >
              <Settings size={16} />
              Restart simulation
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/[0.07] bg-[#080b12]/90 px-4 backdrop-blur-xl sm:px-7 xl:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Workspace</span>
                  <ChevronRight size={13} />
                  <span className="truncate text-slate-200">{activePage}</span>
                </div>
                <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">
                  {activePage === "Dashboard"
                    ? "Corporate health overview"
                    : activePage}
                </h1>
              </div>
            </div>

            <div className="ml-3 flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 md:flex">
                <Search size={15} className="text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search activity..."
                  className="w-32 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 lg:w-44"
                />
                <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600">
                  /
                </kbd>
              </div>

              <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] sm:flex">
                <CircleHelp size={17} className="text-slate-400" />
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-xs font-semibold text-rose-300">
                CFO
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] p-4 sm:p-7 xl:p-10">
            {notice && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span>{notice}</span>
                <button
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notice"
                  className="text-slate-500 hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {activePage === "Dashboard" && (
              <Dashboard
                company={company}
                history={history}
                events={visibleEvents}
                profit={profit}
                profitMargin={profitMargin}
                overallRisk={overallRisk}
                profitChange={profitChange}
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
                pendingAction={pendingAction}
                setPendingAction={setPendingAction}
                advanceRound={advanceRound}
                setActivePage={choosePage}
              />
            )}

            {activePage === "CFO Activity" && (
              <CFOActivity
                company={company}
                events={visibleEvents}
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
                pendingAction={pendingAction}
                setPendingAction={setPendingAction}
                advanceRound={advanceRound}
              />
            )}

            {activePage === "Investigation" && (
              <Investigation
                company={company}
                events={visibleEvents}
                setActivePage={choosePage}
              />
            )}

            {activePage === "Risk Analysis" && (
              <RiskAnalysis
                company={company}
                overallRisk={overallRisk}
                history={history}
              />
            )}

            {activePage === "Reports" && (
              <Reports
                company={company}
                history={history}
                events={visibleEvents}
                reportOpen={reportOpen}
                setReportOpen={setReportOpen}
              />
            )}

            <footer className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] py-5 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>EVIL CFO SIMULATOR · CORPORATE RESILIENCE LAB</span>
              <span>
                Simulation only — all figures are illustrative, not financial
                advice.
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Dashboard({
  company,
  history,
  events,
  profit,
  profitMargin,
  overallRisk,
  profitChange,
  selectedAction,
  setSelectedAction,
  pendingAction,
  setPendingAction,
  advanceRound,
  setActivePage,
}: {
  company: CompanyState;
  history: CompanyState[];
  events: GameEvent[];
  profit: number;
  profitMargin: number;
  overallRisk: number;
  profitChange: number;
  selectedAction: CFOAction;
  setSelectedAction: (action: CFOAction) => void;
  pendingAction: CFOAction | null;
  setPendingAction: (action: CFOAction | null) => void;
  advanceRound: () => void;
  setActivePage: (page: Page) => void;
}) {
  const metrics = [
    {
      label: "Reported operating profit",
      value: formatMoney(profit),
      change:
        profitChange === 0
          ? "Baseline period"
          : `${profitChange > 0 ? "+" : ""}${formatMoney(profitChange)} vs last round`,
      icon: BadgeDollarSign,
      tone: "emerald",
      note: "Current period",
    },
    {
      label: "Cash reserves",
      value: formatMoney(company.cash),
      change: "Available liquidity",
      icon: Wallet,
      tone: "blue",
      note: "Cash on hand",
    },
    {
      label: "Outstanding debt",
      value: formatMoney(company.debt),
      change: "Principal outstanding",
      icon: Landmark,
      tone: "violet",
      note: "Balance sheet",
    },
    {
      label: "Underlying risk",
      value: `${Math.round(overallRisk)}/100`,
      change: getRiskLabel(overallRisk),
      icon: ShieldAlert,
      tone: overallRisk >= 45 ? "rose" : "amber",
      note: "Estimated exposure",
    },
  ];

  const chartData = history.map((item, index) => ({
    period: `R${index + 1}`,
    revenue: item.revenue / 1_000_000,
    profit: calculateOperatingProfit(item) / 1_000_000,
    cash: item.cash / 1_000_000,
    risk: getOverallRisk(item),
  }));

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151b29] via-[#111725] to-[#11101a] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-rose-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-64 rounded-full bg-blue-500/[0.04] blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-300">
              <Sparkles size={13} />
              Adversarial finance simulation
            </div>

            <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Make the numbers look good.
              <br />
              <span className="text-slate-400">
                See what breaks underneath.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              You control the CFO. Improve the reported picture, manage
              short-term pressure, and watch an independent audit uncover the
              long-term consequences of each decision.
            </p>
          </div>

          <div className="relative min-w-[190px] rounded-2xl border border-white/[0.08] bg-black/20 p-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Simulation round
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold">{company.round}</span>
              <span className="text-sm text-slate-500">of 12+</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{
                  width: `${Math.min(100, (company.round / 12) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Each decision changes the company
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          const iconTone: Record<string, string> = {
            emerald: "bg-emerald-500/10 text-emerald-400",
            blue: "bg-blue-500/10 text-blue-400",
            violet: "bg-violet-500/10 text-violet-400",
            rose: "bg-rose-500/10 text-rose-400",
            amber: "bg-amber-500/10 text-amber-400",
          };

          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 transition hover:border-white/[0.12]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-slate-400">{metric.label}</div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTone[metric.tone]}`}
                >
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-5 text-2xl font-semibold tracking-tight">
                {metric.value}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                {metric.tone === "rose" ? (
                  <AlertTriangle size={12} className="text-rose-400" />
                ) : (
                  <ArrowUpRight size={12} className="text-slate-500" />
                )}
                <span>{metric.change}</span>
              </div>
              <div className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-slate-600">
                {metric.note}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Financial trajectory</h3>
              <p className="mt-1 text-xs text-slate-500">
                How the company changes with every CFO decision
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Operating profit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Cash
              </span>
            </div>
          </div>

          <div className="mt-6 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#ffffff"
                  strokeOpacity={0.06}
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${value}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151b29",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    `₹${Number(value).toFixed(1)}M`,
                    name === "revenue"
                      ? "Revenue"
                      : name === "profit"
                        ? "Operating profit"
                        : "Cash",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#profitFill)"
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#cashFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Risk indicators</h3>
              <p className="mt-1 text-xs text-slate-500">
                Hidden operational vulnerabilities
              </p>
            </div>
            <ShieldAlert size={18} className="text-amber-400" />
          </div>

          <div className="mt-6 space-y-5">
            <RiskBar
              label="Maintenance backlog"
              value={company.maintenanceBacklog}
              description="Deferred maintenance"
              color="bg-amber-400"
            />
            <RiskBar
              label="Supplier trust"
              value={company.supplierTrust}
              description="Payment reliability"
              color="bg-blue-400"
              inverse
            />
            <RiskBar
              label="Employee morale"
              value={company.employeeMorale}
              description="Workforce resilience"
              color="bg-violet-400"
              inverse
            />
            <RiskBar
              label="Operational risk"
              value={company.operationalRisk}
              description="Business disruption exposure"
              color="bg-rose-400"
            />
          </div>

          <button
            onClick={() => setActivePage("Risk Analysis")}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3 text-xs text-slate-300 transition hover:bg-white/[0.04]"
          >
            View full risk analysis
            <ChevronRight size={15} />
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">CFO decision console</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a strategy and observe its consequences
              </p>
            </div>
            <div className="rounded-lg border border-rose-500/15 bg-rose-500/[0.07] px-2.5 py-1.5 text-[10px] text-rose-300">
              Round {company.round}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actionOptions.map((action) => {
              const Icon = action.icon;
              const active = selectedAction === action.id;

              const tone: Record<string, string> = {
                amber: "text-amber-400 bg-amber-500/10",
                rose: "text-rose-400 bg-rose-500/10",
                blue: "text-blue-400 bg-blue-500/10",
                emerald: "text-emerald-400 bg-emerald-500/10",
              };

              return (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action.id);
                    setPendingAction(action.id);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-rose-500/40 bg-rose-500/[0.06]"
                      : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone[action.color]}`}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      className={`mt-1 h-3 w-3 rounded-full border ${
                        active
                          ? "border-rose-400 bg-rose-400"
                          : "border-slate-600"
                      }`}
                    />
                  </div>
                  <div className="mt-4 text-sm font-medium">{action.title}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-300">
                Selected decision
              </div>
              <div className="mt-1 text-sm text-rose-300">
                {getActionName(pendingAction ?? selectedAction)}
              </div>
            </div>
            <button
              onClick={advanceRound}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-xs font-semibold text-white transition hover:bg-rose-400"
            >
              Execute decision
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Recent activity</h3>
              <p className="mt-1 text-xs text-slate-500">
                Decisions and emerging warning signs
              </p>
            </div>
            <button
              onClick={() => setActivePage("Investigation")}
              className="text-[11px] text-rose-300 hover:text-rose-200"
            >
              View all
            </button>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity recorded"
              description="Execute your first CFO decision to begin the event trail."
            />
          ) : (
            <div className="mt-5 space-y-4">
              {events.slice(0, 5).map((event, index) => (
                <EventRow key={`${event.title}-${index}`} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.035] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-200">
              Auditor's watchlist
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              A positive profit figure does not guarantee a healthy company.
              Review cash availability, supplier confidence, maintenance
              backlog, and operational risk together before assessing the
              business.
            </p>
            <button
              onClick={() => setActivePage("Investigation")}
              className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-amber-300 hover:text-amber-200"
            >
              Open investigation
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function RiskBar({
  label,
  value,
  description,
  color,
  inverse = false,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
  inverse?: boolean;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  const riskValue = inverse ? 100 - normalized : normalized;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-300">{label}</div>
          <div className="mt-1 text-[10px] text-slate-600">{description}</div>
        </div>
        <div className="text-xs tabular-nums text-slate-400">
          {Math.round(normalized)}%
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[9px] text-slate-600">
        {inverse
          ? riskValue >= 50
            ? "Elevated exposure"
            : "Relatively resilient"
          : riskValue >= 50
            ? "Elevated exposure"
            : "Monitor"}
      </div>
    </div>
  );
}

function CFOActivity({
  company,
  events,
  selectedAction,
  setSelectedAction,
  pendingAction,
  setPendingAction,
  advanceRound,
}: {
  company: CompanyState;
  events: GameEvent[];
  selectedAction: CFOAction;
  setSelectedAction: (action: CFOAction) => void;
  pendingAction: CFOAction | null;
  setPendingAction: (action: CFOAction | null) => void;
  advanceRound: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Executive control"
        title="CFO Activity"
        description="Choose financial decisions, execute them, and inspect their effect on the simulated company."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Current round" value={`${company.round}`} icon={Activity} />
        <MiniStat label="Operating profit" value={formatMoney(calculateOperatingProfit(company))} icon={BadgeDollarSign} />
        <MiniStat label="Cash reserves" value={formatMoney(company.cash)} icon={Wallet} />
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <div className="text-sm font-semibold">Available executive decisions</div>
        <p className="mt-1 text-xs text-slate-500">
          Each decision has a trade-off. The reported outcome may differ from
          the company's underlying resilience.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {actionOptions.map((action) => {
            const Icon = action.icon;
            const active = selectedAction === action.id;

            return (
              <button
                key={action.id}
                onClick={() => {
                  setSelectedAction(action.id);
                  setPendingAction(action.id);
                }}
                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-rose-500/40 bg-rose-500/[0.06]"
                    : "border-white/[0.07] hover:border-white/[0.15]"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300">
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{action.title}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                </div>
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${
                    active
                      ? "border-rose-400 bg-rose-400"
                      : "border-slate-600"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Ready to execute
            </div>
            <div className="mt-1 text-sm font-medium text-rose-300">
              {getActionName(pendingAction ?? selectedAction)}
            </div>
          </div>
          <button
            onClick={advanceRound}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-xs font-semibold text-white transition hover:bg-rose-400"
          >
            Execute decision
            <Zap size={15} />
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Decision history</h3>
        <p className="mt-1 text-xs text-slate-500">
          A chronological record of simulation events
        </p>
        {events.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No decisions yet"
            description="Your actions and their consequences will appear here."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {events.map((event, index) => (
              <EventRow key={`${event.title}-${index}`} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Investigation({
  company,
  events,
  setActivePage,
}: {
  company: CompanyState;
  events: GameEvent[];
  setActivePage: (page: Page) => void;
}) {
  const risk = getOverallRisk(company);
  const findings = [
    {
      title: "Maintenance and reliability",
      value: company.maintenanceBacklog,
      threshold: 40,
      description:
        "Deferred maintenance can make near-term costs look better while increasing disruption exposure.",
      type: "risk",
    },
    {
      title: "Supplier relationship health",
      value: 100 - company.supplierTrust,
      threshold: 40,
      description:
        "Declining supplier trust may indicate payment delays or deteriorating commercial relationships.",
      type: "trust",
    },
    {
      title: "Workforce resilience",
      value: 100 - company.employeeMorale,
      threshold: 40,
      description:
        "Lower morale can signal pressure on productivity, retention, and execution quality.",
      type: "people",
    },
    {
      title: "Operational risk",
      value: company.operationalRisk,
      threshold: 45,
      description:
        "Operational risk aggregates exposure to disruptions that may not be visible in current profit.",
      type: "operations",
    },
  ];

  const flagged = findings.filter((item) => item.value >= item.threshold);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Independent audit"
        title="Investigation"
        description="Investigate warning signs that reported financial performance may be hiding underlying fragility."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Findings flagged" value={`${flagged.length}`} icon={FileSearch} />
        <MiniStat label="Events recorded" value={`${events.length}`} icon={Activity} />
        <MiniStat label="Overall exposure" value={getRiskLabel(risk)} icon={ShieldAlert} />
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Audit findings</h3>
            <p className="mt-1 text-xs text-slate-500">
              Current signals from the company's simulated operating state
            </p>
          </div>
          <span
            className={`rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs ${getRiskColor(risk)}`}
          >
            {getRiskLabel(risk)} risk
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {findings.map((finding) => {
            const isFlagged = finding.value >= finding.threshold;

            return (
              <div
                key={finding.title}
                className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isFlagged
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {isFlagged ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <ShieldCheck size={17} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-medium">{finding.title}</h4>
                      <span
                        className={`text-[10px] font-medium ${
                          isFlagged ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        {isFlagged ? "Review required" : "Below threshold"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {finding.description}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${
                          isFlagged ? "bg-rose-400" : "bg-emerald-400"
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, finding.value))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-600">
                      Indicator: {Math.round(finding.value)} / 100
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Evidence timeline</h3>
        <p className="mt-1 text-xs text-slate-500">
          Recorded events from executed decisions
        </p>

        {events.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No evidence recorded"
            description="Execute a CFO decision to start generating evidence for the auditor."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {events.map((event, index) => (
              <EventRow key={`${event.title}-${index}`} event={event} />
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => setActivePage("Risk Analysis")}
        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-xs text-slate-300 transition hover:bg-white/[0.04]"
      >
        Explore risk analysis
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function RiskAnalysis({
  company,
  overallRisk,
  history,
}: {
  company: CompanyState;
  overallRisk: number;
  history: CompanyState[];
}) {
  const riskHistory = history.map((item, index) => ({
    period: `R${index + 1}`,
    risk: getOverallRisk(item),
    profit: calculateOperatingProfit(item) / 1_000_000,
    maintenance: item.maintenanceBacklog,
    supplierTrust: item.supplierTrust,
  }));

  const indicators = [
    {
      title: "Maintenance backlog",
      value: company.maintenanceBacklog,
      description: "Accumulated maintenance deferrals",
      color: "bg-amber-400",
      severity:
        company.maintenanceBacklog >= 60
          ? "Critical"
          : company.maintenanceBacklog >= 40
            ? "High"
            : "Moderate",
    },
    {
      title: "Supplier trust",
      value: company.supplierTrust,
      description: "Confidence in payment reliability",
      color: "bg-blue-400",
      severity:
        company.supplierTrust < 30
          ? "Critical"
          : company.supplierTrust < 55
            ? "High"
            : "Stable",
    },
    {
      title: "Employee morale",
      value: company.employeeMorale,
      description: "Workforce confidence and resilience",
      color: "bg-violet-400",
      severity:
        company.employeeMorale < 30
          ? "Critical"
          : company.employeeMorale < 55
            ? "Low"
            : "Stable",
    },
    {
      title: "Operational risk",
      value: company.operationalRisk,
      description: "Exposure to business interruption",
      color: "bg-rose-400",
      severity:
        company.operationalRisk >= 70
          ? "Critical"
          : company.operationalRisk >= 45
            ? "High"
            : "Moderate",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Resilience monitoring"
        title="Risk Analysis"
        description="Evaluate the company's underlying resilience, not just the financial results visible on its income statement."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Overall risk score" value={`${Math.round(overallRisk)}/100`} icon={ShieldAlert} />
        <MiniStat label="Operating profit" value={formatMoney(calculateOperatingProfit(company))} icon={BadgeDollarSign} />
        <MiniStat label="Maintenance backlog" value={`${Math.round(company.maintenanceBacklog)}%`} icon={AlertTriangle} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <h3 className="text-sm font-semibold">Risk trajectory</h3>
          <p className="mt-1 text-xs text-slate-500">
            Overall exposure by simulation round
          </p>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskHistory} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151b29",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}/100`, "Risk"]}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#riskFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-400" />
            <h3 className="text-sm font-semibold">Current exposure</h3>
          </div>
          <div className={`mt-6 text-4xl font-semibold ${getRiskColor(overallRisk)}`}>
            {Math.round(overallRisk)}
            <span className="ml-2 text-sm font-normal text-slate-500">/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-rose-400 transition-all"
              style={{ width: `${overallRisk}%` }}
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            This score combines maintenance backlog, supplier trust, employee
            morale, and operational risk. It is a simplified game indicator,
            not a validated financial risk model.
          </p>
          <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/10 p-4">
            <div className="text-xs font-medium text-slate-300">
              Assessment
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {overallRisk >= 70
                ? "Critical exposure: the simulation indicates multiple vulnerabilities that may threaten business continuity."
                : overallRisk >= 45
                  ? "High exposure: investigate deferred costs and deteriorating relationships before relying on reported results."
                  : overallRisk >= 25
                    ? "Moderate exposure: monitor the trend and avoid allowing short-term gains to mask accumulating liabilities."
                    : "Lower exposure: continue monitoring operational indicators alongside reported financial performance."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Risk factor breakdown</h3>
        <p className="mt-1 text-xs text-slate-500">
          Individual operational and organizational indicators
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {indicators.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/[0.07] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="mt-1 text-[10px] text-slate-600">
                    {item.description}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {Math.round(item.value)}%
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {item.severity}
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, item.value))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Reports({
  company,
  history,
  events,
  reportOpen,
  setReportOpen,
}: {
  company: CompanyState;
  history: CompanyState[];
  events: GameEvent[];
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
}) {
  const profit = calculateOperatingProfit(company);
  const risk = getOverallRisk(company);
  const [copied, setCopied] = useState(false);

  const reportText = [
    "EVIL CFO SIMULATOR — COMPANY HEALTH REPORT",
    `Simulation round: ${company.round}`,
    `Revenue: ${formatMoney(company.revenue)}`,
    `Operating expenses: ${formatMoney(company.operatingExpenses)}`,
    `Operating profit: ${formatMoney(profit)}`,
    `Profit margin: ${formatPercent(getProfitMargin(company))}`,
    `Cash reserves: ${formatMoney(company.cash)}`,
    `Outstanding debt: ${formatMoney(company.debt)}`,
    `Maintenance backlog: ${Math.round(company.maintenanceBacklog)}/100`,
    `Supplier trust: ${Math.round(company.supplierTrust)}/100`,
    `Employee morale: ${Math.round(company.employeeMorale)}/100`,
    `Operational risk: ${Math.round(company.operationalRisk)}/100`,
    `Overall risk: ${Math.round(risk)}/100 (${getRiskLabel(risk)})`,
    "",
    "RECORDED EVENTS",
    ...events.map(
      (event) => `- ${event.title}: ${event.description}`,
    ),
    "",
    "Simulation only. All figures are illustrative.",
  ].join("\n");

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setReportOpen(true);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Reporting centre"
        title="Reports"
        description="Review a snapshot of simulated financial performance, operational exposure, and the audit trail."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Reports available" value="1" icon={ClipboardCheck} />
        <MiniStat label="Rounds simulated" value={`${history.length}`} icon={ChartNoAxesCombined} />
        <MiniStat label="Events recorded" value={`${events.length}`} icon={FileSearch} />
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Company health report
              </h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
                A current snapshot of revenue, expenses, profit, liquidity,
                debt, and the operational indicators tracked by the simulator.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-slate-500">
                  Round {company.round}
                </span>
                <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-slate-500">
                  {events.length} events
                </span>
                <span
                  className={`rounded-md border border-white/[0.08] px-2 py-1 text-[10px] ${getRiskColor(risk)}`}
                >
                  {getRiskLabel(risk)} risk
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={() => setReportOpen(!reportOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.04]"
            >
              {reportOpen ? "Hide preview" : "Preview report"}
              <ChevronDown
                size={14}
                className={`transition ${reportOpen ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={copyReport}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-400"
            >
              {copied ? "Copied" : "Copy report"}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {reportOpen && (
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#090d15] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <FileSearch size={15} />
              Report preview
            </div>
            <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-400">
              {reportText}
            </pre>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Current financial snapshot</h3>
        <p className="mt-1 text-xs text-slate-500">
          Figures from the active simulation round
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] text-slate-500">
                <th className="pb-3 pr-4 font-medium">Metric</th>
                <th className="pb-3 pr-4 font-medium">Current value</th>
                <th className="pb-3 font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Revenue", formatMoney(company.revenue), "Operating scale"],
                ["Operating expenses", formatMoney(company.operatingExpenses), "Cost base"],
                ["Operating profit", formatMoney(profit), "Revenue less operating expenses"],
                ["Profit margin", formatPercent(getProfitMargin(company)), "Operating profit as a share of revenue"],
                ["Cash reserves", formatMoney(company.cash), "Available liquidity"],
                ["Outstanding debt", formatMoney(company.debt), "Borrowing obligations"],
                ["Overall risk", `${Math.round(risk)}/100`, getRiskLabel(risk)],
              ].map(([label, value, interpretation]) => (
                <tr
                  key={label}
                  className="border-b border-white/[0.05] last:border-0"
                >
                  <td className="py-3 pr-4 text-slate-300">{label}</td>
                  <td className="py-3 pr-4 font-medium tabular-nums text-slate-200">
                    {value}
                  </td>
                  <td className="py-3 text-slate-500">{interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">Round-by-round history</h3>
        <p className="mt-1 text-xs text-slate-500">
          Financial performance and risk over the course of the simulation
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] text-slate-500">
                <th className="pb-3 pr-4 font-medium">Round</th>
                <th className="pb-3 pr-4 font-medium">Revenue</th>
                <th className="pb-3 pr-4 font-medium">Operating profit</th>
                <th className="pb-3 pr-4 font-medium">Cash</th>
                <th className="pb-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <tr
                  key={`round-${index + 1}`}
                  className="border-b border-white/[0.05] last:border-0"
                >
                  <td className="py-3 pr-4 text-slate-300">R{index + 1}</td>
                  <td className="py-3 pr-4 tabular-nums text-slate-400">
                    {formatMoney(item.revenue)}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-400">
                    {formatMoney(calculateOperatingProfit(item))}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-400">
                    {formatMoney(item.cash)}
                  </td>
                  <td className={`py-3 tabular-nums ${getRiskColor(getOverallRisk(item))}`}>
                    {Math.round(getOverallRisk(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0e131e] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">{label}</div>
        <Icon size={17} className="text-slate-500" />
      </div>
      <div className="mt-4 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function EventRow({ event }: { event: GameEvent }) {
  const tone = getEventTone(event);
  const tones: Record<string, string> = {
    rose: "bg-rose-500/10 text-rose-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue: "bg-blue-500/10 text-blue-400",
  };
  const Icon = tone === "rose" ? AlertTriangle : tone === "emerald" ? ShieldCheck : Activity;

  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-300">{event.title}</div>
          <div className="text-[10px] text-slate-600">
            {event.round !== undefined ? `Round ${event.round}` : ""}
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {event.description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-5 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
        <Icon size={19} />
      </div>
      <div className="mt-3 text-xs font-medium text-slate-300">{title}</div>
      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}

export default App;