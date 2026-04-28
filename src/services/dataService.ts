import { demoFeeds, demoIncidents, demoMatches, demoReports, demoWatchlist } from "../lib/demo-data";
import { hasSupabase, supabase } from "../lib/supabase";
import type {
  Feed,
  Incident,
  IncidentStatus,
  Report,
  ReportType,
  Severity,
  WatchlistEntry,
  WatchlistMatch,
} from "../lib/types";

type DemoStore = {
  feeds: Feed[];
  incidents: Incident[];
  watchlist: WatchlistEntry[];
  matches: WatchlistMatch[];
  reports: Report[];
};

const STORAGE_KEY = "axis-demo-store-v2";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultStore(): DemoStore {
  return {
    feeds: clone(demoFeeds),
    incidents: clone(demoIncidents),
    watchlist: clone(demoWatchlist),
    matches: clone(demoMatches),
    reports: clone(demoReports),
  };
}

function readDemoStore(): DemoStore {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) {
    const initial = defaultStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(cached) as DemoStore;
  } catch {
    const initial = defaultStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeDemoStore(store: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getDemoStoreSnapshot(): DemoStore {
  return clone(readDemoStore());
}

export function isBackendConfigured() {
  return hasSupabase && Boolean(supabase);
}

export async function getFeeds(): Promise<Feed[]> {
  if (!isBackendConfigured() || !supabase) {
    return readDemoStore().feeds;
  }

  const { data, error } = await supabase.from("feeds").select("*").order("created_at");
  if (error) throw error;
  return (data as Feed[]) ?? [];
}

export async function getIncidents(): Promise<Incident[]> {
  if (!isBackendConfigured() || !supabase) {
    return readDemoStore().incidents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data as Incident[]) ?? [];
}

export async function createIncident(
  payload: Omit<Incident, "id" | "timestamp"> & { timestamp?: string; id?: string },
): Promise<Incident> {
  const incident: Incident = {
    ...payload,
    id: payload.id ?? `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  if (!isBackendConfigured() || !supabase) {
    const store = readDemoStore();
    store.incidents = [incident, ...store.incidents];
    writeDemoStore(store);
    return incident;
  }

  const { error } = await supabase.from("incidents").insert(incident);
  if (error) throw error;
  return incident;
}

export async function updateIncident(
  id: string,
  updates: Partial<Pick<Incident, "status" | "assigned_to" | "notes">>,
): Promise<Incident | null> {
  if (!isBackendConfigured() || !supabase) {
    const store = readDemoStore();
    let updated: Incident | null = null;
    store.incidents = store.incidents.map((incident) => {
      if (incident.id !== id) return incident;
      updated = { ...incident, ...updates };
      return updated;
    });
    writeDemoStore(store);
    return updated;
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return (data as Incident) ?? null;
}

export async function getWatchlist(): Promise<WatchlistEntry[]> {
  if (!isBackendConfigured() || !supabase) {
    return readDemoStore().watchlist;
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as WatchlistEntry[]) ?? [];
}

export async function getWatchlistMatches(): Promise<WatchlistMatch[]> {
  if (!isBackendConfigured() || !supabase) {
    return readDemoStore().matches;
  }

  const { data, error } = await supabase
    .from("watchlist_matches")
    .select("*")
    .order("matched_at", { ascending: false });
  if (error) throw error;
  return (data as WatchlistMatch[]) ?? [];
}

export async function getReports(): Promise<Report[]> {
  if (!isBackendConfigured() || !supabase) {
    return readDemoStore().reports;
  }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Report[]) ?? [];
}

export async function createReport(payload: {
  type: ReportType;
  date_from: string;
  date_to: string;
  generated_by: string;
}): Promise<Report> {
  const report: Report = {
    id: `REP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    created_at: new Date().toISOString(),
    ...payload,
  };

  if (!isBackendConfigured() || !supabase) {
    const store = readDemoStore();
    store.reports = [report, ...store.reports];
    writeDemoStore(store);
    return report;
  }

  const { error } = await supabase.from("reports").insert(report);
  if (error) throw error;
  return report;
}

export async function createWatchlistEntry(
  entry: Omit<WatchlistEntry, "id" | "created_at" | "last_seen" | "associated_feed"> & {
    associated_feed?: string;
    last_seen?: string;
  },
): Promise<WatchlistEntry> {
  const watchlistEntry: WatchlistEntry = {
    id: `WL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    created_at: new Date().toISOString(),
    last_seen: entry.last_seen ?? new Date().toISOString(),
    associated_feed: entry.associated_feed ?? "CCTV-01",
    ...entry,
  };

  if (!isBackendConfigured() || !supabase) {
    const store = readDemoStore();
    store.watchlist = [watchlistEntry, ...store.watchlist];
    writeDemoStore(store);
    return watchlistEntry;
  }

  const { error } = await supabase.from("watchlist").insert(watchlistEntry);
  if (error) throw error;
  return watchlistEntry;
}

export async function ensureSeededBackend() {
  if (!isBackendConfigured() || !supabase) return;

  const { data, error } = await supabase.from("feeds").select("id").limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) return;

  await supabase.from("feeds").insert(demoFeeds);
  await supabase.from("incidents").insert(demoIncidents);
  await supabase.from("watchlist").insert(demoWatchlist);
  await supabase.from("watchlist_matches").insert(demoMatches);
  await supabase.from("reports").insert(demoReports);
}

export function generateSimulatedIncident(feeds: Feed[]): Incident {
  const threatCatalog = [
    { threat_type: "Weapon detected", severity: "CRITICAL" },
    { threat_type: "Suspicious activity", severity: "HIGH" },
    { threat_type: "Perimeter breach", severity: "CRITICAL" },
    { threat_type: "Unauthorized loitering", severity: "MEDIUM" },
    { threat_type: "Watchlist face match", severity: "HIGH" },
    { threat_type: "Object abandonment", severity: "MEDIUM" },
  ] as const satisfies Array<{ threat_type: string; severity: Severity }>;

  const selected = threatCatalog[Math.floor(Math.random() * threatCatalog.length)];
  const activeFeeds = feeds.filter((feed) => feed.status !== "offline");
  const feed = activeFeeds[Math.floor(Math.random() * activeFeeds.length)] ?? feeds[0];

  return {
    id: `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    feed_id: feed?.id ?? "feed-cctv-01",
    threat_type: selected.threat_type,
    confidence_score: 70 + Math.floor(Math.random() * 29),
    severity: selected.severity,
    status: "Open",
    assigned_to: "Auto-routed",
    timestamp: new Date().toISOString(),
    notes: "Simulated alert generated for demo mode to mimic live operational surveillance traffic.",
  };
}

export function nextSimulationDelay() {
  return 5000 + Math.floor(Math.random() * 5000);
}

export function getFeedHealth(feed: Feed, incidents: Incident[]) {
  const feedIncidents = incidents.filter((incident) => incident.feed_id === feed.id);
  const hasCritical = feedIncidents.some((incident) => incident.severity === "CRITICAL");
  const hasHigh = feedIncidents.some((incident) => incident.severity === "HIGH");
  const latest = feedIncidents[0];

  return {
    pulse: hasCritical ? "critical" : hasHigh ? "elevated" : "nominal",
    latest,
    liveLabel: hasCritical ? "THREAT LOCK" : hasHigh ? "TRACKING" : "MONITORING",
  };
}

export function getStatusActionLabel(status: IncidentStatus) {
  return status === "Resolved"
    ? "Resolved"
    : status === "Acknowledged"
      ? "Acknowledge"
      : "Open";
}
