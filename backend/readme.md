# ParkRun Statistics Backend

A Node.js application that fetches, stores, and serves parkrun results from Nordic countries.

## Prerequisites

- Node.js v22.14.0
- Docker and Docker Compose
- PostgreSQL client (optional, for direct database access)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
# Start PostgreSQL in Docker and apply migrations
npm run db:reset
```

## Database Management

### Managing the Database

```bash
# Reset database (removes all data and recreates tables)
npm run db:reset

# Apply new migrations only
npm run db:migrate

# View database contents in browser
npm run db:studio
```

### Database Structure

- `Event` table: Stores individual parkrun event results with:
  - Event details (ID, name, country, date)
  - Finish times array
  - Average and fastest finish times
- `event_quarterly_stats` view: Provides quarterly statistics:
  - Fastest finish time
  - Fast quartile (25th percentile)
  - Average finish time
  - Slow quartile (75th percentile)
  - Average participant count

## Running the Application

### Data Collection

With default parameters:
```bash
# Fetches Finnish events from 2025-01-01 onwards
npm run dev
```

With custom parameters:
```bash
# Format: npm run dev <countryCode> <fromDate>
npm run dev FI 2025-03-01
```

### API Server

Start the API server:
```bash
npm run serve
```

The server provides the following endpoints:
- `GET /api/stats` - Returns quarterly statistics for all events

### Available Country Codes
- `FI`: Finland
- `SE`: Sweden
- `NO`: Norway
- `DK`: Denmark

## Development

Build the TypeScript code:
```bash
npm run build
```

Run the compiled version:
```bash
npm start [countryCode] [fromDate]
```

## Database Connection

The application connects to PostgreSQL using these default credentials:
- Host: localhost
- Port: 5432
- Database: parkrun
- Username: parkrun
- Password: parkrun

To modify the connection settings, update the `DATABASE_URL` in `.env` file:
```
DATABASE_URL="postgresql://parkrun:parkrun@localhost:5432/parkrun?schema=public"
```

## API Documentation

### GET /api/stats

Returns quarterly statistics for all parkrun events.

Response format:
```typescript
interface QuarterlyStats {
    eventName: string;
    eventCountry: string;
    year: number;
    quarter: number;
    fastest_time: number;        // Minutes
    fastest_quartile: number;    // Minutes
    avg_finish_time: number;     // Minutes
    slowest_quartile: number;    // Minutes
    avg_participants: number;
}
```

Example response:
```json
[
  {
    "eventName": "tampere",
    "eventCountry": "Finland",
    "year": 2025,
    "quarter": 1,
    "fastest_time": 18.5,
    "fastest_quartile": 22.3,
    "avg_finish_time": 28.7,
    "slowest_quartile": 35.1,
    "avg_participants": 122
  }
]
```