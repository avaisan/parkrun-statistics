# ParkRun Nordic Statistics Frontend

A React-based frontend application for displaying parkrun statistics from Nordic countries.

## Features

- View quarterly statistics for parkrun events across Nordic countries
- Filter data by country, year, and quarter
- Sort data by any column
- Responsive design with Material-UI components
- Interactive data visualization

## Prerequisites

- Node.js v22.14.0 or later
- npm or yarn package manager

## Installation

1. Clone the repository
2. Install dependencies:
```bash
cd frontend
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static files
│   └── parkrun_logo.png
├── src/
│   ├── components/     # React components
│   │   └── StatsTable.tsx
│   ├── services/      # API services
│   │   └── api.ts
│   ├── types/         # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # Application entry point
│   └── theme.ts       # Material-UI theme configuration
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Data Display

The application shows the following statistics for each parkrun event:

- Fastest finish time in the quarter
- Fast quartile (25% of runners finished faster)
- Average finish time
- Slow quartile (75% of runners finished faster)
- Average number of participants

All times are displayed in minutes.

## API Integration

The frontend expects a backend API running at `http://localhost:3001` providing:

- `/api/stats` - GET endpoint returning quarterly statistics

## Technology Stack

- React 19
- TypeScript
- Vite
- Material-UI v7
- Axios for API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
