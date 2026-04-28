create extension if not exists "pgcrypto";

create table if not exists public.feeds (
  id text primary key,
  name text not null,
  type text not null check (type in ('cctv', 'drone', 'bodycam', 'legacy')),
  status text not null check (status in ('live', 'offline', 'standby')),
  location text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id text primary key,
  feed_id text not null references public.feeds(id) on delete cascade,
  threat_type text not null,
  confidence_score integer not null check (confidence_score between 0 and 100),
  severity text not null check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status text not null check (status in ('Open', 'Acknowledged', 'Resolved')),
  assigned_to text not null,
  timestamp timestamptz not null default now(),
  notes text not null default ''
);

create table if not exists public.watchlist (
  id text primary key,
  name text not null,
  risk_level text not null check (risk_level in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  photo_url text,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist_matches (
  id text primary key,
  watchlist_id text not null references public.watchlist(id) on delete cascade,
  incident_id text not null references public.incidents(id) on delete cascade,
  matched_at timestamptz not null default now(),
  confidence integer not null check (confidence between 0 and 100)
);

create table if not exists public.reports (
  id text primary key,
  type text not null check (type in ('Daily Summary', 'Incident Report', 'Pattern Analysis')),
  date_from timestamptz not null,
  date_to timestamptz not null,
  generated_by text not null,
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.incidents;

insert into public.feeds (id, name, type, status, location, created_at) values
  ('feed-cctv-01', 'CCTV-01', 'cctv', 'live', 'North Gate', now() - interval '10 day'),
  ('feed-drone-alpha', 'Drone-Alpha', 'drone', 'live', 'Perimeter Air Grid', now() - interval '10 day'),
  ('feed-bodycam-07', 'Body-Cam-07', 'bodycam', 'live', 'South Concourse', now() - interval '10 day'),
  ('feed-archive', 'Archive', 'legacy', 'standby', 'Forensics Vault', now() - interval '10 day')
on conflict (id) do nothing;

insert into public.incidents (id, feed_id, threat_type, confidence_score, severity, status, assigned_to, timestamp, notes) values
  ('INC-001', 'feed-cctv-01', 'Unidentified weapon detected', 97, 'CRITICAL', 'Open', 'Op. Mehra', now() - interval '20 minutes', 'Object classifier and pose estimator aligned.'),
  ('INC-002', 'feed-drone-alpha', 'Perimeter breach signature', 91, 'HIGH', 'Acknowledged', 'Op. Khan', now() - interval '1 hour', 'Thermal trace intersected a restricted corridor.'),
  ('INC-003', 'feed-bodycam-07', 'Suspicious crowd surge', 88, 'HIGH', 'Open', 'Op. Singh', now() - interval '2 hours', 'Crowd density exceeded safe threshold.'),
  ('INC-004', 'feed-cctv-01', 'Restricted zone loitering', 74, 'MEDIUM', 'Resolved', 'Op. Rao', now() - interval '3 hours', 'Subject remained in protected area past tolerance.'),
  ('INC-005', 'feed-archive', 'Archived match review hit', 81, 'MEDIUM', 'Open', 'Op. Iyer', now() - interval '5 hours', 'Forensics comparison found a prior face match.'),
  ('INC-006', 'feed-drone-alpha', 'Vehicle pattern anomaly', 69, 'LOW', 'Resolved', 'Op. Thomas', now() - interval '7 hours', 'Vehicle paused outside expected route.'),
  ('INC-007', 'feed-bodycam-07', 'Face match on watchlist', 94, 'CRITICAL', 'Acknowledged', 'Op. Sharma', now() - interval '10 hours', 'High-confidence biometric match.'),
  ('INC-008', 'feed-cctv-01', 'Dropped object near barrier', 77, 'MEDIUM', 'Open', 'Op. Kapoor', now() - interval '12 hours', 'Object abandonment pattern triggered review.'),
  ('INC-009', 'feed-drone-alpha', 'Thermal cluster detected', 84, 'HIGH', 'Open', 'Op. Ali', now() - interval '16 hours', 'Multiple heat signatures converged rapidly.'),
  ('INC-010', 'feed-bodycam-07', 'Aggressive posture classification', 73, 'MEDIUM', 'Open', 'Op. Das', now() - interval '21 hours', 'Behavior model detected escalation posture.')
on conflict (id) do nothing;

insert into public.watchlist (id, name, risk_level, photo_url, notes, created_at) values
  ('WL-001', 'Arman Qureshi', 'CRITICAL', null, 'Known facilitator with prior reconnaissance pattern.', now() - interval '15 day'),
  ('WL-002', 'UNKNOWN', 'HIGH', null, 'Repeated masked appearance across west service corridor.', now() - interval '12 day'),
  ('WL-003', 'Mira Sen', 'MEDIUM', null, 'Observed in proximity to multiple flagged assets.', now() - interval '10 day')
on conflict (id) do nothing;

insert into public.watchlist_matches (id, watchlist_id, incident_id, matched_at, confidence) values
  ('WM-001', 'WL-001', 'INC-007', now() - interval '10 hours', 94),
  ('WM-002', 'WL-002', 'INC-005', now() - interval '5 hours', 81),
  ('WM-003', 'WL-003', 'INC-004', now() - interval '3 hours', 75)
on conflict (id) do nothing;

insert into public.reports (id, type, date_from, date_to, generated_by, created_at) values
  ('REP-240428-A', 'Daily Summary', now() - interval '1 day', now(), 'AXIS AutoGen', now() - interval '30 minutes')
on conflict (id) do nothing;
