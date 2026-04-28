import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { toast } from "sonner";

import {
  demoFeeds,
  demoIncidents,
  demoMatches,
  demoReports,
  demoWatchlist,
} from "./demo-data";
import { hasSupabase, supabase } from "./supabase";
import type {
  Feed,
  Incident,
  IncidentStatus,
  Report,
  ReportType,
  WatchlistEntry,
  WatchlistMatch,
} from "./types";

type DataContextValue = {
  feeds: Feed[];
  incidents: Incident[];
  watchlist: WatchlistEntry[];
  matches: WatchlistMatch[];
  reports: Report[];
  loading: boolean;
  usingDemoMode: boolean;
  acknowledgeIncident: (id: string) => Promise<void>;
  resolveIncident: (id: string) => Promise<void>;
  createIncident: (
    incident: Omit<Incident, "id" | "timestamp"> & { timestamp?: string },
  ) => Promise<void>;
  createReport: (payload: {
    type: ReportType;
    date_from: string;
    date_to: string;
    generated_by: string;
  }) => Promise<void>;
  createWatchlistEntry: (
    entry: Omit<WatchlistEntry, "id" | "created_at" | "last_seen" | "associated_feed"> & {
      associated_feed?: string;
      last_seen?: string;
    },
  ) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

const DEMO_KEY = "axis-demo-state";

function persistDemoState(state: Omit<DataContextValue, "loading" | "usingDemoMode" | "acknowledgeIncident" | "resolveIncident" | "createIncident" | "createReport" | "createWatchlistEntry">) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
}

function readDemoState() {
  const cached = localStorage.getItem(DEMO_KEY);
  if (!cached) {
    return {
      feeds: demoFeeds,
      incidents: demoIncidents,
      watchlist: demoWatchlist,
      matches: demoMatches,
      reports: demoReports,
    };
  }

  return JSON.parse(cached) as {
    feeds: Feed[];
    incidents: Incident[];
    watchlist: WatchlistEntry[];
    matches: WatchlistMatch[];
    reports: Report[];
  };
}

export function DataProvider({ children }: PropsWithChildren) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [matches, setMatches] = useState<WatchlistMatch[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !supabase) {
      const local = readDemoState();
      setFeeds(local.feeds);
      setIncidents(local.incidents);
      setWatchlist(local.watchlist);
      setMatches(local.matches);
      setReports(local.reports);
      setLoading(false);

      const interval = window.setInterval(() => {
        setIncidents((current) => {
          const next: Incident = {
            id: `INC-${String(Date.now()).slice(-6)}`,
            feed_id: demoFeeds[Math.floor(Math.random() * 3)].id,
            threat_type: [
              "Suspicious motion cluster",
              "Weapon silhouette detected",
              "Perimeter traversal anomaly",
              "Identity mismatch on checkpoint",
            ][Math.floor(Math.random() * 4)],
            confidence_score: 72 + Math.floor(Math.random() * 26),
            severity: ["MEDIUM", "HIGH", "CRITICAL"][Math.floor(Math.random() * 3)] as Incident["severity"],
            status: "Open",
            assigned_to: "Auto-routed",
            timestamp: new Date().toISOString(),
            notes: "Demo-mode realtime event emitted locally because Supabase is not configured.",
          };
          const updated = [next, ...current].slice(0, 24);
          toast.warning("New alert received", {
            description: `${next.threat_type} on ${demoFeeds.find((feed) => feed.id === next.feed_id)?.name ?? next.feed_id}`,
          });
          return updated;
        });
      }, 30000);

      return () => window.clearInterval(interval);
    }

    const load = async () => {
      const [
        feedsResult,
        incidentsResult,
        watchlistResult,
        matchesResult,
        reportsResult,
      ] = await Promise.all([
        supabase.from("feeds").select("*").order("created_at"),
        supabase.from("incidents").select("*").order("timestamp", { ascending: false }),
        supabase.from("watchlist").select("*").order("created_at", { ascending: false }),
        supabase.from("watchlist_matches").select("*").order("matched_at", { ascending: false }),
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
      ]);

      const feedRows = (feedsResult.data as Feed[]) ?? [];
      if (!feedRows.length) {
        await supabase.from("feeds").insert(demoFeeds);
        await supabase.from("incidents").insert(demoIncidents);
        await supabase.from("watchlist").insert(demoWatchlist);
        await supabase.from("watchlist_matches").insert(demoMatches);
        await supabase.from("reports").insert(demoReports);
        toast.success("AXIS demo data seeded");
        return load();
      }

      setFeeds(feedRows);
      setIncidents((incidentsResult.data as Incident[]) ?? []);
      setWatchlist((watchlistResult.data as WatchlistEntry[]) ?? []);
      setMatches((matchesResult.data as WatchlistMatch[]) ?? []);
      setReports((reportsResult.data as Report[]) ?? []);
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("axis-incidents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => {
          const next = payload.new as Incident;
          setIncidents((current) => [next, ...current]);
          toast.warning("New alert received", {
            description: `${next.threat_type} from ${next.feed_id}`,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!hasSupabase && !loading) {
      persistDemoState({ feeds, incidents, watchlist, matches, reports });
    }
  }, [feeds, incidents, loading, matches, reports, watchlist]);

  const updateStatus = async (id: string, status: IncidentStatus) => {
    if (!hasSupabase || !supabase) {
      setIncidents((current) => {
        const updated = current.map((incident) =>
          incident.id === id ? { ...incident, status } : incident,
        );
        persistDemoState({ feeds, incidents: updated, watchlist, matches, reports });
        return updated;
      });
      toast.success(
        status === "Resolved" ? "Incident resolved" : "Incident acknowledged",
      );
      return;
    }

    await supabase.from("incidents").update({ status }).eq("id", id);
    setIncidents((current) =>
      current.map((incident) =>
        incident.id === id ? { ...incident, status } : incident,
      ),
    );
    toast.success(
      status === "Resolved" ? "Incident resolved" : "Incident acknowledged",
    );
  };

  const value = useMemo<DataContextValue>(
    () => ({
      feeds,
      incidents,
      watchlist,
      matches,
      reports,
      loading,
      usingDemoMode: !hasSupabase,
      acknowledgeIncident: (id) => updateStatus(id, "Acknowledged"),
      resolveIncident: (id) => updateStatus(id, "Resolved"),
      createIncident: async (payload) => {
        const next: Incident = {
          ...payload,
          id: `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          timestamp: payload.timestamp ?? new Date().toISOString(),
        };

        if (!hasSupabase || !supabase) {
          const updated = [next, ...incidents];
          setIncidents(updated);
          persistDemoState({ feeds, incidents: updated, watchlist, matches, reports });
          toast.warning("New alert received", {
            description: next.threat_type,
          });
          return;
        }

        await supabase.from("incidents").insert(next);
      },
      createReport: async (payload) => {
        const next: Report = {
          id: `REP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          created_at: new Date().toISOString(),
          ...payload,
        };

        if (!hasSupabase || !supabase) {
          const updated = [next, ...reports];
          setReports(updated);
          persistDemoState({ feeds, incidents, watchlist, matches, reports: updated });
          toast.success("Report generated");
          return;
        }

        await supabase.from("reports").insert(next);
        toast.success("Report generated");
      },
      createWatchlistEntry: async (entry) => {
        const next: WatchlistEntry = {
          id: `WL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          created_at: new Date().toISOString(),
          associated_feed: entry.associated_feed ?? feeds[0]?.name ?? "CCTV-01",
          last_seen: entry.last_seen ?? new Date().toISOString(),
          ...entry,
        };

        if (!hasSupabase || !supabase) {
          const updated = [next, ...watchlist];
          setWatchlist(updated);
          persistDemoState({ feeds, incidents, watchlist: updated, matches, reports });
          toast.success("Watchlist entry added");
          return;
        }

        await supabase.from("watchlist").insert(next);
        toast.success("Watchlist entry added");
      },
    }),
    [feeds, incidents, loading, matches, reports, watchlist],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAxisData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useAxisData must be used inside DataProvider");
  }

  return context;
}
