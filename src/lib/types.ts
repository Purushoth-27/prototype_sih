export type FeedType = "cctv" | "drone" | "bodycam" | "legacy";
export type FeedStatus = "live" | "offline" | "standby";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "Open" | "Acknowledged" | "Resolved";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ReportType =
  | "Daily Summary"
  | "Incident Report"
  | "Pattern Analysis";

export interface Feed {
  id: string;
  name: string;
  type: FeedType;
  status: FeedStatus;
  location: string;
  created_at: string;
}

export interface Incident {
  id: string;
  feed_id: string;
  threat_type: string;
  confidence_score: number;
  severity: Severity;
  status: IncidentStatus;
  assigned_to: string;
  timestamp: string;
  notes: string;
}

export interface WatchlistEntry {
  id: string;
  name: string;
  risk_level: RiskLevel;
  photo_url: string | null;
  notes: string;
  created_at: string;
  last_seen: string;
  associated_feed: string;
}

export interface WatchlistMatch {
  id: string;
  watchlist_id: string;
  incident_id: string;
  matched_at: string;
  confidence: number;
}

export interface Report {
  id: string;
  type: ReportType;
  date_from: string;
  date_to: string;
  generated_by: string;
  created_at: string;
}
