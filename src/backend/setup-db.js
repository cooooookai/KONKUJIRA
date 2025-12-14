/**
 * Database Setup Script for Band Sync Calendar
 * 
 * This script helps initialize the D1 database with the required schema.
 * Run this after creating your D1 database in Cloudflare.
 * 
 * Usage:
 * 1. Create D1 database: wrangler d1 create band-sync-calendar-db
 * 2. Update wrangler.toml with the database ID
 * 3. Run schema: wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql
 */

// Database initialization queries
export const SCHEMA_QUERIES = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('live', 'rehearsal', 'other')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
  )`,
  
  `CREATE TABLE IF NOT EXISTS availability (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    member_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('good', 'ok', 'bad')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(member_name, start_time, end_time)
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_events_time_range ON events(start_time, end_time)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`,
  `CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_availability_member ON availability(member_name)`,
  `CREATE INDEX IF NOT EXISTS idx_availability_time_range ON availability(start_time, end_time)`,
  `CREATE INDEX IF NOT EXISTS idx_availability_status ON availability(status)`
];

// Sample data for testing (optional)
export const SAMPLE_DATA = {
  events: [
    {
      title: "下北沢LIVE",
      type: "live",
      start_time: "2024-02-15T19:00:00Z",
      end_time: "2024-02-15T22:00:00Z",
      created_by: "田中"
    },
    {
      title: "リハーサル",
      type: "rehearsal", 
      start_time: "2024-02-10T14:00:00Z",
      end_time: "2024-02-10T17:00:00Z",
      created_by: "佐藤"
    }
  ],
  availability: [
    {
      member_name: "田中",
      start_time: "2024-02-15T18:00:00Z",
      end_time: "2024-02-15T23:00:00Z",
      status: "good"
    },
    {
      member_name: "佐藤",
      start_time: "2024-02-15T19:00:00Z", 
      end_time: "2024-02-15T22:00:00Z",
      status: "ok"
    }
  ]
};

/**
 * Initialize database with schema and optional sample data
 * @param {D1Database} db - D1 database instance
 * @param {boolean} includeSampleData - Whether to insert sample data
 */
export async function initializeDatabase(db, includeSampleData = false) {
  try {
    // Execute schema queries
    for (const query of SCHEMA_QUERIES) {
      await db.prepare(query).run();
    }
    
    console.log('Database schema created successfully');
    
    if (includeSampleData) {
      // Insert sample events
      for (const event of SAMPLE_DATA.events) {
        await db.prepare(`
          INSERT INTO events (title, type, start_time, end_time, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          event.title,
          event.type,
          event.start_time,
          event.end_time,
          event.created_by
        ).run();
      }
      
      // Insert sample availability
      for (const avail of SAMPLE_DATA.availability) {
        await db.prepare(`
          INSERT OR REPLACE INTO availability (member_name, start_time, end_time, status)
          VALUES (?, ?, ?, ?)
        `).bind(
          avail.member_name,
          avail.start_time,
          avail.end_time,
          avail.status
        ).run();
      }
      
      console.log('Sample data inserted successfully');
    }
    
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error: error.message };
  }
}