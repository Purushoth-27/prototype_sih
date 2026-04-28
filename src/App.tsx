import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  FileText,
  LayoutDashboard,
  Map,
  Radar,
  Settings,
  ShieldAlert,
  UserCircle2,
  Users,
  Video,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Toaster, toast } from "sonner";

import { DataProvider, useAxisData } from "./lib/data-context";
import { hasSupabase, supabase } from "./lib/supabase";
import type { Feed, Incident, ReportType, Severity, WatchlistEntry } from "./lib/types";

const DEMO_AUTH_KEY = "axis-demo-auth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/feeds", label: "Live Feeds", icon: Video },
  { to: "/incidents", label: "Incidents", icon: ShieldAlert },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/heatmaps", label: "Heatmaps", icon: Map },
  { to: "/watchlist", label: "Watchlist", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const severityClasses: Record<Severity, string> = {
  CRITICAL: "border-red-600/30 bg-red-600/10 text-red-400",
  HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  MEDIUM: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  LOW: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-teal-500",
        props.className,
      )}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500",
        props.className,
      )}
    />
  );
}

function FeedPlaceholder({ feed }: { feed: Feed }) {
  return (
    <div className="feed-grid relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(220,38,38,0.18),transparent_30%)]" />
      <div className="scanline absolute inset-0 opacity-40" />
      <div className="absolute left-4 top-4 h-16 w-28 rounded border border-slate-700/70" />
      <div className="absolute bottom-5 right-8 h-20 w-14 rounded border border-red-500/80" />
      <div className="absolute left-1/3 top-1/3 h-10 w-10 rounded-full border border-teal-400/80" />
      <div className="absolute bottom-3 left-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
        {feed.location}
      </div>
      <div className="absolute right-3 top-3">
        <Badge
          className={
            feed.status === "live"
              ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }
        >
          {feed.status}
        </Badge>
      </div>
    </div>
  );
}

function ThreatLevelBar() {
  const { incidents } = useAxisData();
  const currentLevel = incidents.some((item) => item.severity === "CRITICAL")
    ? "CRITICAL"
    : incidents.some((item) => item.severity === "HIGH")
      ? "HIGH"
      : incidents.some((item) => item.severity === "MEDIUM")
        ? "MODERATE"
        : "LOW";

  const classes =
    currentLevel === "CRITICAL"
      ? "from-red-950 via-red-700 to-red-500 text-red-100"
      : currentLevel === "HIGH"
        ? "from-orange-950 via-orange-700 to-orange-500 text-orange-100"
        : currentLevel === "MODERATE"
          ? "from-amber-950 via-amber-700 to-amber-500 text-amber-100"
          : "from-teal-950 via-teal-700 to-teal-500 text-teal-100";

  return (
    <div className={cn("rounded-xl bg-gradient-to-r px-4 py-2 text-xs font-bold tracking-[0.2em]", classes)}>
      GLOBAL THREAT LEVEL: {currentLevel}
    </div>
  );
}

function AppShell() {
  const { incidents } = useAxisData();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setCollapsed(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const criticalCount = incidents.filter((item) => item.severity === "CRITICAL").length;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.8),transparent_45%)]" />
      <div className="relative flex min-h-screen">
        <aside className={cn("border-r border-slate-800 bg-black/40 px-3 py-4 backdrop-blur", collapsed ? "w-20" : "w-72")}>
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-300">
              <Radar className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-xl font-black tracking-[0.4em] text-white">AXIS</div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  AI Surveillance Intel
                </div>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {!collapsed && (
            <Card className="mt-6 p-3">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Deployment Mode</div>
              <div className="mt-2 text-sm text-slate-200">
                {hasSupabase ? "Connected to Supabase" : "Demo mode active"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {hasSupabase
                  ? "Realtime events are backed by database subscriptions."
                  : "Local seeded intelligence is running until env keys are added."}
              </div>
            </Card>
          )}
        </aside>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCollapsed((value) => !value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-300"
              >
                Menu
              </button>
              <ThreatLevelBar />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-red-600/30 bg-red-600/10 px-3 py-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                  {criticalCount} live threats
                </span>
              </div>
              <button
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300"
                onClick={() => navigate("/incidents")}
              >
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Operator Delta-4</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {location.pathname.replace("/", "") || "dashboard"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/feeds" element={<FeedsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/heatmaps" element={<HeatmapsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/watchlist/:id" element={<WatchlistProfilePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { feeds, incidents, acknowledgeIncident } = useAxisData();
  const alertFeed = incidents.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {feeds.map((feed) => (
            <Card key={feed.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">{feed.name}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {feed.type} source
                  </div>
                </div>
                <Badge className="border-slate-700 text-slate-300">{feed.location}</Badge>
              </div>
              <FeedPlaceholder feed={feed} />
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                <span>{feed.type}</span>
                <span className={feed.status === "live" ? "text-teal-400" : "text-amber-300"}>
                  {feed.status}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Active Alerts</div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Realtime incident stream
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>

          <div className="max-h-[540px] space-y-3 overflow-auto pr-1">
            {alertFeed.map((incident) => {
              const feed = feeds.find((item) => item.id === incident.feed_id);
              return (
                <div key={incident.id} className="rounded-2xl border border-slate-800 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge className={severityClasses[incident.severity]}>{incident.severity}</Badge>
                    <span className="text-xs text-slate-500">{formatDate(incident.timestamp)}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-100">{incident.threat_type}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {feed?.name ?? incident.feed_id} • confidence {incident.confidence_score}%
                  </div>
                  <Button
                    className="mt-3 w-full border-teal-700 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20"
                    onClick={() => void acknowledgeIncident(incident.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Pipeline Status</div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Ingest to analysis state
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Ingest", "active", "border-teal-500/30 bg-teal-500/10 text-teal-300"],
            ["Feature Extraction", "processing", "border-amber-500/30 bg-amber-500/10 text-amber-300"],
            ["ML Processing", "processing", "border-amber-500/30 bg-amber-500/10 text-amber-300"],
            ["Analysis", "active", "border-teal-500/30 bg-teal-500/10 text-teal-300"],
          ].map(([label, value, colors]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
              <Badge className={cn("mt-3", colors)}>{value}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FeedsPage() {
  const { feeds, incidents } = useAxisData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {feeds.map((feed) => (
        <Card key={feed.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{feed.name}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {feed.type} • {feed.location}
              </div>
            </div>
            <Badge className="border-slate-700 text-slate-300">{feed.status}</Badge>
          </div>
          <FeedPlaceholder feed={feed} />
          <div className="space-y-2">
            {incidents
              .filter((incident) => incident.feed_id === feed.id)
              .slice(0, 3)
              .map((incident) => (
                <div key={incident.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{incident.threat_type}</span>
                    <Badge className={severityClasses[incident.severity]}>{incident.severity}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function IncidentsPage() {
  const { incidents, feeds, acknowledgeIncident, resolveIncident, createIncident } = useAxisData();
  const [selected, setSelected] = useState<Incident | null>(incidents[0] ?? null);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setSelected((current) => current ?? incidents[0] ?? null);
  }, [incidents]);

  const filtered = incidents.filter((incident) => {
    return (
      (!severity || incident.severity === severity) &&
      (!status || incident.status === status) &&
      (!source || incident.feed_id === source)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 md:grid-cols-4 xl:w-2/3">
          <TextInput type="date" />
          <SelectInput value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </SelectInput>
          <SelectInput value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All sources</option>
            {feeds.map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </SelectInput>
        </div>

        <Button className="border-teal-700 bg-teal-500/10 text-teal-200" onClick={() => setShowForm(true)}>
          New Incident
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Source Feed</th>
                  <th className="px-4 py-3">Threat Type</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => setSelected(incident)}
                    className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">{incident.id}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(incident.timestamp)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {feeds.find((feed) => feed.id === incident.feed_id)?.name ?? incident.feed_id}
                    </td>
                    <td className="px-4 py-3">{incident.threat_type}</td>
                    <td className="px-4 py-3">{incident.confidence_score}%</td>
                    <td className="px-4 py-3">
                      <Badge className={severityClasses[incident.severity]}>{incident.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{incident.assigned_to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-4">
          {selected ? (
            <>
              <div>
                <div className="text-lg font-semibold text-white">{selected.threat_type}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={severityClasses[selected.severity]}>{selected.severity}</Badge>
                  <Badge className="border-slate-700 text-slate-300">{selected.status}</Badge>
                </div>
              </div>

              <div className="relative h-56 rounded-2xl border border-slate-700 bg-slate-950">
                <div className="scanline absolute inset-0 opacity-20" />
                <svg className="absolute inset-0 h-full w-full">
                  <rect x="120" y="54" width="90" height="110" fill="none" stroke="#dc2626" strokeWidth="3" />
                  <line x1="120" y1="54" x2="145" y2="54" stroke="#dc2626" strokeWidth="3" />
                  <line x1="120" y1="54" x2="120" y2="79" stroke="#dc2626" strokeWidth="3" />
                  <line x1="210" y1="164" x2="185" y2="164" stroke="#dc2626" strokeWidth="3" />
                  <line x1="210" y1="164" x2="210" y2="139" stroke="#dc2626" strokeWidth="3" />
                </svg>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div>Source: {feeds.find((feed) => feed.id === selected.feed_id)?.name ?? selected.feed_id}</div>
                <div>Timestamp: {formatDate(selected.timestamp)}</div>
                <div>Confidence: {selected.confidence_score}%</div>
                <div>Notes: {selected.notes}</div>
              </div>

              <div className="grid gap-3">
                <Button className="border-red-700 bg-red-500/10 text-red-200">Escalate</Button>
                <Button onClick={() => void resolveIncident(selected.id)}>Resolve</Button>
                <Button onClick={() => toast.success("PDF export queued")}>Export PDF</Button>
                <Button onClick={() => void acknowledgeIncident(selected.id)}>Acknowledge</Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">Select an incident to inspect details.</div>
          )}
        </Card>
      </div>

      {showForm && (
        <Modal title="Log New Incident" onClose={() => setShowForm(false)}>
          <NewIncidentForm
            feeds={feeds}
            onSubmit={async (payload) => {
              await createIncident(payload);
              setShowForm(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function NewIncidentForm({
  feeds,
  onSubmit,
}: {
  feeds: Feed[];
  onSubmit: (payload: Omit<Incident, "id" | "timestamp"> & { timestamp?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    feed_id: feeds[0]?.id ?? "",
    threat_type: "",
    confidence_score: 85,
    severity: "HIGH" as Severity,
    status: "Open" as Incident["status"],
    assigned_to: "Operator Dispatch",
    notes: "",
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <SelectInput value={form.feed_id} onChange={(event) => setForm({ ...form, feed_id: event.target.value })}>
        {feeds.map((feed) => (
          <option key={feed.id} value={feed.id}>
            {feed.name}
          </option>
        ))}
      </SelectInput>
      <TextInput
        placeholder="Threat type"
        value={form.threat_type}
        onChange={(event) => setForm({ ...form, threat_type: event.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          type="number"
          placeholder="Confidence"
          value={form.confidence_score}
          onChange={(event) => setForm({ ...form, confidence_score: Number(event.target.value) })}
        />
        <SelectInput value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as Severity })}>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </SelectInput>
      </div>
      <TextInput
        placeholder="Assigned operator"
        value={form.assigned_to}
        onChange={(event) => setForm({ ...form, assigned_to: event.target.value })}
      />
      <textarea
        className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none"
        placeholder="Incident notes"
        value={form.notes}
        onChange={(event) => setForm({ ...form, notes: event.target.value })}
      />
      <Button type="submit" className="w-full border-teal-700 bg-teal-500/10 text-teal-200">
        Save Incident
      </Button>
    </form>
  );
}

function HeatmapsPage() {
  const { incidents } = useAxisData();
  const [range, setRange] = useState("Last 6hr");
  const zones = [
    { name: "North Gate", activity: 41, threat: 12, last: incidents[0]?.timestamp, className: "fill-red-500/70" },
    { name: "Central Plaza", activity: 28, threat: 8, last: incidents[2]?.timestamp, className: "fill-amber-500/60" },
    { name: "East Wing", activity: 16, threat: 4, last: incidents[4]?.timestamp, className: "fill-green-500/50" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Spatial Intelligence</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">2D operational site map</div>
          </div>
          <SelectInput className="w-40" value={range} onChange={(event) => setRange(event.target.value)}>
            <option>Last 1hr</option>
            <option>Last 6hr</option>
            <option>Last 24hr</option>
            <option>Last 7 days</option>
          </SelectInput>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
          <svg viewBox="0 0 860 420" className="w-full">
            <rect x="0" y="0" width="860" height="420" fill="#020617" />
            {Array.from({ length: 22 }).map((_, index) => (
              <line key={`v-${index}`} x1={index * 40} x2={index * 40} y1="0" y2="420" stroke="#1e293b" strokeWidth="1" />
            ))}
            {Array.from({ length: 12 }).map((_, index) => (
              <line key={`h-${index}`} y1={index * 38} y2={index * 38} x1="0" x2="860" stroke="#1e293b" strokeWidth="1" />
            ))}
            <rect x="60" y="60" width="220" height="120" rx="18" fill="#0f172a" stroke="#334155" />
            <rect x="330" y="90" width="180" height="110" rx="18" fill="#0f172a" stroke="#334155" />
            <rect x="560" y="60" width="220" height="170" rx="18" fill="#0f172a" stroke="#334155" />
            <rect x="180" y="250" width="460" height="120" rx="18" fill="#0f172a" stroke="#334155" />

            <circle cx="180" cy="130" r="90" className="fill-red-500/35" />
            <circle cx="420" cy="140" r="70" className="fill-amber-500/30" />
            <circle cx="650" cy="130" r="55" className="fill-green-500/20" />

            <text x="130" y="120" className="fill-slate-200 text-[18px]">North Gate</text>
            <text x="385" y="150" className="fill-slate-200 text-[18px]">Central Plaza</text>
            <text x="625" y="130" className="fill-slate-200 text-[18px]">East Wing</text>
            <text x="340" y="312" className="fill-slate-300 text-[18px]">Response Corridor</text>
          </svg>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <div className="text-lg font-semibold">Legend</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{range}</div>
        </div>
        {zones.map((zone) => (
          <div key={zone.name} className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">{zone.name}</div>
              <span className={cn("h-3 w-3 rounded-full", zone.className.replace("fill-", "bg-").replace("/70", "").replace("/60", "").replace("/50", ""))} />
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              <div>Activity count: {zone.activity}</div>
              <div>Threat count: {zone.threat}</div>
              <div>Last incident: {zone.last ? formatDate(zone.last) : "No incidents"}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function WatchlistPage() {
  const { watchlist, createWatchlistEntry } = useAxisData();
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const filtered = watchlist.filter((entry) => {
    const haystack = `${entry.name} ${entry.risk_level}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <TextInput placeholder="Search by name or tag" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button className="border-teal-700 bg-teal-500/10 text-teal-200 md:w-52" onClick={() => setShowModal(true)}>
          Add to Watchlist
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <Card key={entry.id} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <div className="text-lg font-semibold">{entry.name}</div>
                <Badge className={severityClasses[entry.risk_level]}>{entry.risk_level}</Badge>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              <div>Last seen: {formatDate(entry.last_seen)}</div>
              <div>Feed: {entry.associated_feed}</div>
            </div>
            <Link className="text-sm font-medium text-teal-300" to={`/watchlist/${entry.id}`}>
              View Profile
            </Link>
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title="Add Watchlist Entry" onClose={() => setShowModal(false)}>
          <WatchlistForm
            onSubmit={async (payload) => {
              await createWatchlistEntry(payload);
              setShowModal(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function WatchlistForm({
  onSubmit,
}: {
  onSubmit: (payload: Omit<WatchlistEntry, "id" | "created_at" | "last_seen" | "associated_feed"> & {
    associated_feed?: string;
    last_seen?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [risk, setRisk] = useState<Severity>("HIGH");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          name,
          risk_level: risk,
          notes,
          photo_url: photoUrl || null,
        });
      }}
    >
      <TextInput placeholder="Name or UNKNOWN" value={name} onChange={(event) => setName(event.target.value)} />
      <SelectInput value={risk} onChange={(event) => setRisk(event.target.value as Severity)}>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </SelectInput>
      <TextInput
        placeholder="Photo URL (or Supabase storage path)"
        value={photoUrl}
        onChange={(event) => setPhotoUrl(event.target.value)}
      />
      <textarea
        className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none"
        placeholder="Notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <Button type="submit" className="w-full border-teal-700 bg-teal-500/10 text-teal-200">
        Save Entry
      </Button>
    </form>
  );
}

function WatchlistProfilePage() {
  const { id } = useParams();
  const { watchlist, matches, incidents } = useAxisData();
  const entry = watchlist.find((item) => item.id === id);
  const profileMatches = matches.filter((item) => item.watchlist_id === id);

  if (!entry) {
    return <Card>Watchlist profile not found.</Card>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800 text-slate-500">
            <Users className="h-10 w-10" />
          </div>
          <div>
            <div className="text-2xl font-semibold">{entry.name}</div>
            <Badge className={severityClasses[entry.risk_level]}>{entry.risk_level}</Badge>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-400">
          <div>Associated feed: {entry.associated_feed}</div>
          <div>Last seen: {formatDate(entry.last_seen)}</div>
          <div>Notes: {entry.notes}</div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <div className="text-lg font-semibold">Match History</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident correlations</div>
        </div>
        <div className="space-y-3">
          {profileMatches.map((match) => {
            const incident = incidents.find((item) => item.id === match.incident_id);
            return (
              <div key={match.id} className="rounded-2xl border border-slate-800 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{incident?.threat_type ?? match.incident_id}</div>
                  <Badge className="border-teal-500/30 bg-teal-500/10 text-teal-200">
                    {match.confidence}%
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-slate-400">{formatDate(match.matched_at)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ReportsPage() {
  const { reports, incidents, feeds, createReport } = useAxisData();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="border-teal-700 bg-teal-500/10 text-teal-200" onClick={() => setShowModal(true)}>
          Generate Report
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold">{report.id}</div>
              <div className="text-sm text-slate-400">
                {report.type} • generated {formatDate(report.created_at)}
              </div>
            </div>
            <Button onClick={() => toast.success("Download placeholder ready")}>Download JSON/PDF</Button>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div>
          <div className="text-lg font-semibold">Demo Intelligence Report</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Pre-populated summary card</div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total incidents" value={String(incidents.length)} icon={<ShieldAlert className="h-4 w-4" />} />
          <StatCard label="Threats detected" value={String(incidents.filter((item) => item.severity !== "LOW").length)} icon={<AlertTriangle className="h-4 w-4" />} />
          <StatCard label="Feeds monitored" value={String(feeds.length)} icon={<Camera className="h-4 w-4" />} />
          <StatCard label="Avg response time" value="03m 42s" icon={<Bell className="h-4 w-4" />} />
        </div>
      </Card>

      {showModal && (
        <Modal title="Generate Report" onClose={() => setShowModal(false)}>
          <ReportForm
            feeds={feeds}
            onSubmit={async (payload) => {
              await createReport(payload);
              setShowModal(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ReportForm({
  feeds,
  onSubmit,
}: {
  feeds: Feed[];
  onSubmit: (payload: {
    type: ReportType;
    date_from: string;
    date_to: string;
    generated_by: string;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<ReportType>("Daily Summary");
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFeeds, setSelectedFeeds] = useState(feeds.map((feed) => feed.name).join(", "));

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          type,
          date_from: dateFrom,
          date_to: dateTo,
          generated_by: `Operator Delta-4 (${selectedFeeds})`,
        });
      }}
    >
      <SelectInput value={type} onChange={(event) => setType(event.target.value as ReportType)}>
        <option value="Daily Summary">Daily Summary</option>
        <option value="Incident Report">Incident Report</option>
        <option value="Pattern Analysis">Pattern Analysis</option>
      </SelectInput>
      <div className="grid grid-cols-2 gap-3">
        <TextInput type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <TextInput type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <TextInput
        value={selectedFeeds}
        onChange={(event) => setSelectedFeeds(event.target.value)}
        placeholder="Feeds to include"
      />
      <Button type="submit" className="w-full border-teal-700 bg-teal-500/10 text-teal-200">
        Generate Report
      </Button>
    </form>
  );
}

function SettingsPage() {
  const { usingDemoMode } = useAxisData();
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <div className="text-lg font-semibold">System Settings</div>
        <div className="mt-3 space-y-4 text-sm text-slate-400">
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            Auth provider: {usingDemoMode ? "Local demo access" : "Supabase Auth"}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            Realtime transport: {usingDemoMode ? "Simulated local event stream" : "Supabase realtime channel"}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            Storage target: Supabase Storage-ready for watchlist image uploads.
          </div>
        </div>
      </Card>
      <Card>
        <div className="text-lg font-semibold">Operator Notes</div>
        <p className="mt-3 text-sm text-slate-400">
          Add your Supabase project URL and anon key in `.env`, then run the SQL migration to move from seeded local demo mode to full backend mode.
        </p>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between text-slate-500">
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      if (hasSupabase && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify({ email }));
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Unable to authenticate.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.08),transparent_25%),radial-gradient(circle_at_bottom,rgba(20,184,166,0.08),transparent_30%)]" />
      <Card className="relative w-full max-w-md space-y-6 rounded-[2rem] p-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl font-black tracking-[0.5em] text-white">AXIS</div>
          <div className="text-xs uppercase tracking-[0.32em] text-slate-500">
            AI Surveillance Intel System
          </div>
        </div>
        <div className="space-y-3">
          <TextInput placeholder="operator@nsg.axis" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextInput
            type="password"
            placeholder="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            onClick={() => void login()}
            disabled={loading || !email || !password}
            className="w-full border-red-700 bg-red-600/10 text-red-100"
          >
            {loading ? "Authenticating..." : "Secure Login"}
          </Button>
        </div>
        <div className="text-center text-xs text-slate-500">
          {hasSupabase
            ? "Email/password auth is handled by Supabase Auth."
            : "Demo mode: any email/password will unlock the protected routes."}
        </div>
      </Card>
    </div>
  );
}

function ProtectedApp() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      setAuthenticated(Boolean(localStorage.getItem(DEMO_AUTH_KEY)));
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthenticated(Boolean(session));
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading AXIS...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
