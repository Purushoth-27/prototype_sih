import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";
import type {
  Feed,
  Incident,
  IncidentStatus,
  Report,
  ReportType,
  WatchlistEntry,
  WatchlistMatch,
} from "./types";
import { isBackendConfigured, getDemoStoreSnapshot, getFeeds, getIncidents, getReports, getWatchlist, getWatchlistMatches, createIncident as createIncidentRecord, createReport as createReportRecord, createWatchlistEntry as createWatchlistRecord, ensureSeededBackend, generateSimulatedIncident, nextSimulationDelay, updateIncident as updateIncidentRecord } from "../services/dataService";
import { supabase } from "./supabase";

type DataContextValue = {
  feeds: Feed[];
  incidents: Incident[];
  watchlist: WatchlistEntry[];
  matches: WatchlistMatch[];
  reports: Report[];
  loading: boolean;
  usingDemoMode: boolean;
  latestRealtimeId: string | null;
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

export function DataProvider({ children }: PropsWithChildren) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [matches, setMatches] = useState<WatchlistMatch[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestRealtimeId, setLatestRealtimeId] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(isBackendConfigured());
  const demoTimerRef = useRef<number | null>(null);

  const usingDemoMode = !backendAvailable;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        if (!usingDemoMode) {
          await ensureSeededBackend();
        }

        const [feedRows, incidentRows, watchlistRows, matchRows, reportRows] =
          await Promise.all([
            getFeeds(),
            getIncidents(),
            getWatchlist(),
            getWatchlistMatches(),
            getReports(),
          ]);

        if (!isMounted) return;
        setFeeds(feedRows);
        setIncidents(incidentRows);
        setWatchlist(watchlistRows);
        setMatches(matchRows);
        setReports(reportRows);
        setBackendAvailable(!usingDemoMode);
      } catch (error) {
        if (!isMounted) return;

        const demoStore = getDemoStoreSnapshot();
        console.error("Falling back to demo data", error);
        setBackendAvailable(false);
        setFeeds(demoStore.feeds);
        setIncidents(demoStore.incidents);
        setWatchlist(demoStore.watchlist);
        setMatches(demoStore.matches);
        setReports(demoStore.reports);
        toast.error("Backend unavailable", {
          description: "AXIS switched to demo mode so the dashboard stays usable.",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    if (!usingDemoMode || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [usingDemoMode]);

  useEffect(() => {
    if (!usingDemoMode || loading || feeds.length === 0) {
      return;
    }

    const schedule = () => {
      demoTimerRef.current = window.setTimeout(async () => {
        const next = generateSimulatedIncident(feeds);
        await createIncidentRecord(next);
        setIncidents((current) => [next, ...current]);
        setLatestRealtimeId(next.id);
        toast.warning("New alert received", {
          description: `${next.threat_type} on ${feeds.find((feed) => feed.id === next.feed_id)?.name ?? next.feed_id}`,
        });
        schedule();
      }, nextSimulationDelay());
    };

    schedule();

    return () => {
      if (demoTimerRef.current) {
        window.clearTimeout(demoTimerRef.current);
      }
    };
  }, [feeds, loading, usingDemoMode]);

  useEffect(() => {
    if (usingDemoMode || !supabase) {
      return;
    }

    const channel = supabase
      .channel("axis-incidents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => {
          const next = payload.new as Incident;
          setIncidents((current) => {
            if (current.some((incident) => incident.id === next.id)) {
              return current;
            }
            return [next, ...current];
          });
          setLatestRealtimeId(next.id);
          toast.warning("New alert received", {
            description: `${next.threat_type} from ${next.feed_id}`,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [usingDemoMode]);

  const updateStatus = async (id: string, status: IncidentStatus) => {
    const updated = await updateIncidentRecord(id, { status });
    if (updated) {
      setIncidents((current) =>
        current.map((incident) => (incident.id === id ? updated : incident)),
      );
    }
    toast.success(status === "Resolved" ? "Incident resolved" : "Incident acknowledged");
  };

  const value = useMemo<DataContextValue>(
    () => ({
      feeds,
      incidents,
      watchlist,
      matches,
      reports,
      loading,
      usingDemoMode,
      latestRealtimeId,
      acknowledgeIncident: (id) => updateStatus(id, "Acknowledged"),
      resolveIncident: (id) => updateStatus(id, "Resolved"),
      createIncident: async (payload) => {
        const next = await createIncidentRecord(payload);
        setIncidents((current) => [next, ...current]);
        setLatestRealtimeId(next.id);
        toast.warning("New alert received", {
          description: next.threat_type,
        });
      },
      createReport: async (payload) => {
        const next = await createReportRecord(payload);
        setReports((current) => [next, ...current]);
        toast.success("Report generated");
      },
      createWatchlistEntry: async (entry) => {
        const next = await createWatchlistRecord({
          associated_feed: entry.associated_feed ?? feeds[0]?.name ?? "CCTV-01",
          ...entry,
        });
        setWatchlist((current) => [next, ...current]);
        toast.success("Watchlist entry added");
      },
    }),
    [feeds, incidents, latestRealtimeId, loading, matches, reports, usingDemoMode, watchlist],
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
