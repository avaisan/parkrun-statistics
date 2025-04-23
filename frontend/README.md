# ParkRun Nordic Statistics Frontend

A React-based frontend application for displaying parkrun statistics from Nordic countries.

## Features

- View quarterly statistics for parkrun events across Nordic countries
- Filter data by country, year, and quarter
- Sort data by any column

## Prerequisites

- Node.js v22.14.0 or later
- Backend and database

## Installation and development

1. Start backend.

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
│   │   └── api.ts
│   │   └── time_format.ts # The only "calculation" done in UI.
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # Application entry point
│   └── theme.ts       # Material-UI theme configuration
```

## API Integration

The frontend expects a backend API running at `http://localhost:3001` providing:

- `/api/stats` - GET endpoint returning quarterly statistics.
- `/api/latest-date` - GET endpoint for latest event date available.

## Technology Stack

- React 19
- TypeScript
- Vite
- Material-UI v7
- Axios for API calls