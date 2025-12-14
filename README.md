# Band Sync Calendar

A web-based synchronized calendar system for band members to coordinate schedules, share availability, and manage important events like performances and rehearsals.

## Features

- Mobile-first responsive design
- Real-time synchronization across devices
- Japanese holiday integration
- Simple nickname-based identification
- Availability tracking with ○/△/× status
- Event management for performances and rehearsals

## Tech Stack

- **Frontend**: Vanilla JavaScript with FullCalendar
- **Backend**: Cloudflare Workers + D1 Database
- **Hosting**: GitHub Pages
- **Testing**: Jest + fast-check for property-based testing

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run property-based tests
npm run test:pbt

# Start development server
npm run dev
```

## Deployment

The frontend is deployed via GitHub Pages. The backend runs on Cloudflare Workers.

## Project Structure

```
band-sync-calendar/
├── src/
│   ├── frontend/
│   │   ├── js/
│   │   ├── css/
│   │   └── index.html
│   └── backend/
│       └── worker.js
├── tests/
│   ├── unit/
│   └── property/
├── docs/
└── package.json
```