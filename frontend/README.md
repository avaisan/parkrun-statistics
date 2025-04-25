# ParkRun Nordic Statistics Frontend

A React-based frontend application for displaying parkrun statistics from Nordic countries.

## Features

- View quarterly statistics for parkrun events across Nordic countries
- Filter data by country, year, and quarter
- Sort data by any column

## Prerequisites

- Node.js v22.14.0 or later
- Source data provided in correct format

## Installation and development

1. Provide source data as TS file to `src/data/parkrun-data.ts`:
```typescript
export const parkrunStats = {
  latest_date: "YYYY-MM-DD",
  event_quarterly_stats: [
    {
      eventName: string,
      eventCountry: string,
      year: number,
      quarter: number,
      fastest_time: number,
      fastest_quartile: number,
      avg_finish_time: number,
      slowest_quartile: number,
      avg_participants: number
    }
  ]
};
```
2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Start the server:
```bash
npm run ui
```

The application will be available at `http://localhost:5173`

### Debugging
- Error boundary: if statistics or latest date fails to render, error boundary catches on and tells more info on what is failing.

## Project Structure

```
frontend/
├── public/              # Static files
│   └── parkrun_logo.png
├── src/
│   ├── components/     # React components
│   │   └── StatsTable.tsx
│   │   └── LastUpdated.tsx
│   │   └── ErrorBoundary.tsx
│   ├── services/
│   │   └── time_format.ts # The only "calculation" done in UI.
│   ├── data/
│   │   └── parkrun-data.ts # Source data
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # Application entry point
│   └── theme.ts       # Material-UI theme configuration
```



## Technology Stack

- React 19
- TypeScript
- Vite
- Material-UI v7
