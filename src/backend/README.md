# Backend Setup Guide

## Cloudflare D1 Database Setup

### 1. Create D1 Database

```bash
# Create the database
wrangler d1 create band-sync-calendar-db
```

This will output something like:
```
✅ Successfully created DB 'band-sync-calendar-db'!

[[d1_databases]]
binding = "DB"
database_name = "band-sync-calendar-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Update wrangler.toml

Copy the database_id from the output above and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "band-sync-calendar-db"
database_id = "your-actual-database-id-here"
```

### 3. Initialize Database Schema

```bash
# Run the schema file to create tables
wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql
```

### 4. Verify Database Setup

```bash
# List tables to verify creation
wrangler d1 execute band-sync-calendar-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 5. Optional: Insert Sample Data

```bash
# Insert sample events
wrangler d1 execute band-sync-calendar-db --command="
INSERT INTO events (title, type, start_time, end_time, created_by) 
VALUES ('下北沢LIVE', 'live', '2024-02-15T19:00:00Z', '2024-02-15T22:00:00Z', '田中');
"

# Insert sample availability
wrangler d1 execute band-sync-calendar-db --command="
INSERT INTO availability (member_name, start_time, end_time, status) 
VALUES ('田中', '2024-02-15T18:00:00Z', '2024-02-15T23:00:00Z', 'good');
"
```

## Database Schema

### Events Table
- `id`: Unique identifier (auto-generated UUID)
- `title`: Event title (e.g., "下北沢LIVE")
- `type`: Event type ('live', 'rehearsal', 'other')
- `start_time`: ISO 8601 datetime string
- `end_time`: ISO 8601 datetime string
- `created_by`: Nickname of the creator
- `created_at`: Creation timestamp (auto-generated)

### Availability Table
- `id`: Unique identifier (auto-generated UUID)
- `member_name`: Member's nickname
- `start_time`: ISO 8601 datetime string
- `end_time`: ISO 8601 datetime string
- `status`: Availability status ('good', 'ok', 'bad')
- `updated_at`: Last update timestamp (auto-generated)
- **Unique constraint**: (member_name, start_time, end_time) for upsert behavior

## Development Commands

```bash
# Deploy worker to development environment
wrangler deploy

# View logs
wrangler tail

# Test database queries locally
wrangler d1 execute band-sync-calendar-db --command="SELECT * FROM events LIMIT 5;"
```

## Production Deployment

1. Update `wrangler.toml` environment variables for production
2. Set correct `ALLOWED_ORIGINS` for your GitHub Pages domain
3. Deploy: `wrangler deploy --env production`