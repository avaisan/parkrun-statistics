# ParkRun Statistics Backend

- Scraper using cheerio to get ParkRun event results from Nordic countries
- PostgreSQL database for storing results and calculating aggregates
- API for offering data to frontend

Database and API run in Docker containers and are deployed to AWS. Scraper only runs locally.

## Prerequisites

- Node.js v22.14.0
- Docker

## Setup

1. Install dependencies:
```bash
npm install
npm run build
```

2. Set up the database:
```bash
# Start PostgreSQL in Docker and apply migrations
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
  - Average and fastest finish times per event
- `event_quarterly_stats` view: Provides quarterly statistics:
  - Fastest finish time
  - Fast quartile (25th percentile)
  - Average finish time
  - Slow quartile (75th percentile)
  - Average participant count

## Running the Application

### Data Collection with scraper
Ensure that database is up and running.
If event already exists in database, scraper tries to save but fails and moves on to next.
```bash
#With default parameters:
# Fetches events from all Nordic ParkRuns for the last 7 days
npm run scraper

#With custom parameters:
# Format: npm run scraper -- --country <countryCode> --from <fromDate>
npm run scraper -- --country FI --from 2025-04-12
```

### API Server

Start the API server:
```bash
npm run api
```

API will be available at `localhost:3001`.

The server provides the following endpoints:
- `GET /` - Returns info on available endpoints
- `GET /health` - Returns API and database health (up or down)
- `GET /api/stats` - Returns quarterly statistics for all events
- `GET /api/latest-date` - Returns latest available event date

Note: latest date is used in frontend UI to see when data has been refreshed. It might be misleading if data is refreshed only partially.

### Available Country Codes
- `FI`: Finland
- `SE`: Sweden
- `NO`: Norway
- `DK`: Denmark

Event names are in `events.ts` file. If events shutdown or new ones are found, that file needs to be updated.

## Local development

1. Install dependencies, generate lock file and build:
```bash
npm install
npm run build
```
2. Start Docker containers from project root with `docker compose up -d`.

Scraper is run locally, API and database runs in containers.

Create up `.env` file to backend folder with db credentials (set these in docker-compose for yourself).
```
DATABASE_URL=postgresql://parkrun:parkrun@localhost:5432/parkrun?schema=public
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3001 
```


## API Documentation
API offers root, health and statistics endpoints.

### GET /api/stats
Returns quarterly statistics for all parkrun events.

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