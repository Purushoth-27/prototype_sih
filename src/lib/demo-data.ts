import type {
  Feed,
  Incident,
  Report,
  WatchlistEntry,
  WatchlistMatch,
} from "./types";

const now = new Date();
const ago = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const demoFeeds: Feed[] = [
  {
    id: "feed-cctv-01",
    name: "CCTV-01",
    type: "cctv",
    status: "live",
    location: "North Gate",
    created_at: ago(240),
  },
  {
    id: "feed-drone-alpha",
    name: "Drone-Alpha",
    type: "drone",
    status: "live",
    location: "Perimeter Air Grid",
    created_at: ago(240),
  },
  {
    id: "feed-bodycam-07",
    name: "Body-Cam-07",
    type: "bodycam",
    status: "live",
    location: "South Concourse",
    created_at: ago(240),
  },
  {
    id: "feed-archive",
    name: "Archive",
    type: "legacy",
    status: "standby",
    location: "Forensics Vault",
    created_at: ago(240),
  },
];

export const demoIncidents: Incident[] = [
  ["INC-001", "feed-cctv-01", "Unidentified weapon detected", 97, "CRITICAL", "Open", "Op. Mehra", 0.3],
  ["INC-002", "feed-drone-alpha", "Perimeter breach signature", 91, "HIGH", "Acknowledged", "Op. Khan", 1.1],
  ["INC-003", "feed-bodycam-07", "Suspicious crowd surge", 88, "HIGH", "Open", "Op. Singh", 2.4],
  ["INC-004", "feed-cctv-01", "Restricted zone loitering", 74, "MEDIUM", "Resolved", "Op. Rao", 3.2],
  ["INC-005", "feed-archive", "Archived match review hit", 81, "MEDIUM", "Open", "Op. Iyer", 5.6],
  ["INC-006", "feed-drone-alpha", "Vehicle pattern anomaly", 69, "LOW", "Resolved", "Op. Thomas", 7.3],
  ["INC-007", "feed-bodycam-07", "Face match on watchlist", 94, "CRITICAL", "Acknowledged", "Op. Sharma", 10.8],
  ["INC-008", "feed-cctv-01", "Dropped object near barrier", 77, "MEDIUM", "Open", "Op. Kapoor", 12.2],
  ["INC-009", "feed-drone-alpha", "Thermal cluster detected", 84, "HIGH", "Open", "Op. Ali", 16.5],
  ["INC-010", "feed-bodycam-07", "Aggressive posture classification", 73, "MEDIUM", "Open", "Op. Das", 21.4],
].map(
  ([id, feed_id, threat_type, confidence_score, severity, status, assigned_to, hours]) => ({
    id,
    feed_id,
    threat_type,
    confidence_score,
    severity: severity as Incident["severity"],
    status: status as Incident["status"],
    assigned_to,
    timestamp: ago(hours as number),
    notes:
      "AI pipeline correlated movement, object, and identity signals. Operator review recommended within the next response window.",
  }),
);

export const demoWatchlist: WatchlistEntry[] = [
  {
    id: "WL-001",
    name: "Arman Qureshi",
    risk_level: "CRITICAL",
    photo_url: null,
    notes: "Known facilitator with prior reconnaissance pattern.",
    created_at: ago(400),
    last_seen: ago(10.8),
    associated_feed: "Body-Cam-07",
  },
  {
    id: "WL-002",
    name: "UNKNOWN",
    risk_level: "HIGH",
    photo_url: null,
    notes: "Repeated masked appearance across west service corridor.",
    created_at: ago(320),
    last_seen: ago(5.6),
    associated_feed: "Archive",
  },
  {
    id: "WL-003",
    name: "Mira Sen",
    risk_level: "MEDIUM",
    photo_url: null,
    notes: "Observed in proximity to multiple flagged assets.",
    created_at: ago(290),
    last_seen: ago(28),
    associated_feed: "CCTV-01",
  },
];

export const demoMatches: WatchlistMatch[] = [
  {
    id: "WM-001",
    watchlist_id: "WL-001",
    incident_id: "INC-007",
    matched_at: ago(10.8),
    confidence: 94,
  },
  {
    id: "WM-002",
    watchlist_id: "WL-002",
    incident_id: "INC-005",
    matched_at: ago(5.6),
    confidence: 81,
  },
  {
    id: "WM-003",
    watchlist_id: "WL-003",
    incident_id: "INC-004",
    matched_at: ago(3.2),
    confidence: 75,
  },
];

export const demoReports: Report[] = [
  {
    id: "REP-240428-A",
    type: "Daily Summary",
    date_from: ago(24),
    date_to: now.toISOString(),
    generated_by: "AXIS AutoGen",
    created_at: ago(0.5),
  },
];
