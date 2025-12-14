-- Band Sync Calendar Database Schema
-- Cloudflare D1 (SQLite) Database

-- Events table for shared band events (performances, rehearsals, etc.)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('live', 'rehearsal', 'other')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- Availability table for member availability status (○/△/×)
CREATE TABLE IF NOT EXISTS availability (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    member_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('good', 'ok', 'bad')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(member_name, start_time, end_time)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_time_range ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

CREATE INDEX IF NOT EXISTS idx_availability_member ON availability(member_name);
CREATE INDEX IF NOT EXISTS idx_availability_time_range ON availability(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_availability_status ON availability(status);