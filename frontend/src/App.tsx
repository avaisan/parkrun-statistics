import { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Stack, Link } from '@mui/material';
import { StatsTable } from './components/StatsTable';
import { LastUpdated } from './components/LastUpdated';
import { QuarterlyStats } from './types';
import { parkrunStats } from './data/parkrun-data';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
    const [stats, setStats] = useState<QuarterlyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            setStats(parkrunStats.event_quarterly_stats);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box display="flex" justifyContent="center" mt={4}>
                    <Typography>Loading...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg">
                <Box display="flex" justifyContent="center" mt={4}>
                    <Typography color="error">{error}</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Paper 
                elevation={1} 
                sx={{ 
                    padding: 3,
                    mt: 3,
                    backgroundColor: 'background.paper',
                    position: 'relative'
                }}
            >
                <ErrorBoundary>
                    <LastUpdated />
                </ErrorBoundary>
                
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2, 
                        mb: 4,
                        borderBottom: 1,
                        borderColor: 'divider',
                        pb: 2
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <img 
                            src="/parkrun_logo.png" 
                            alt="ParkRun Logo" 
                            style={{ 
                                height: '50px',
                                width: 'auto'
                            }} 
                        />
                        <Typography 
                            variant="h4" 
                            component="h1"
                        >
                            ParkRun Nordic Statistics
                        </Typography>
                    </Box>
                </Box>

                <Stack spacing={2} sx={{ mb: 4 }}>
                    <Typography>
                        This dashboard shows quarterly statistics from parkrun events across Nordic countries. 
                        All times are shown in minutes.
                    </Typography>
                    <Typography>
                        Key statistics explained:
                    </Typography>
                    <ul>
                        <Typography component="li">Fastest finish time: The single fastest completion time in the quarter</Typography>
                        <Typography component="li">Fastest quartile: 25% of runners finished faster than this time</Typography>
                        <Typography component="li">Average time: Average finish time of all participants</Typography>
                        <Typography component="li">Slowest quartile: 75% of runners finished faster than this time</Typography>
                    </ul>
                    <Typography>
                        Use the filters above the table to view specific countries, years, or quarters. 
                        Click on column headers to sort the data.
                    </Typography>
                    <Typography>
                        Data is collected from official parkrun results pages. Visit{' '}
                        <Link href="https://www.parkrun.com" target="_blank" rel="noopener">
                            parkrun website
                        </Link>{' '}
                        to learn more about these events.
                    </Typography>
                </Stack>

                <ErrorBoundary>
                    <StatsTable data={stats} />
                </ErrorBoundary>
                
            </Paper>
        </Container>
    );
}

export default function FrontendApp() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
