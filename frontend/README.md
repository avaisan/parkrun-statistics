# ParkRun Nordic Statistics Frontend

A React-based frontend application for displaying ParkRun statistics from Nordic countries.

## Features

- View quarterly statistics for parkrun events across Nordic countries
- Filter data by country, year, and quarter
- Sort data by any column

## Prerequisites

- Node.js v22 or later
- API running either locally or in Docker
- Source data in correct format

## Installation and development

1. Start API and provide source data in `data` folder.
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
│   └── 404.html
│   └── 500.html
├── src/
│   ├── components/     # React components
│   │   └── StatsTable.tsx
│   │   └── LastUpdated.tsx
│   │   └── ErrorBoundary.tsx
│   ├── services/
│   │   └── api.ts # Use API to fetch data
│   │   └── time_format.ts  # The only "calculation" done in UI.
│   ├── data/
│   │   └── parkrun-data.ts # Source data
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── theme.ts            # Material-UI theme configuration
```



## Technology Stack

- React
- TypeScript
- Vite
- Material-UI
