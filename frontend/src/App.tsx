import { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Stack, Link } from '@mui/material';
import { StatsTable } from './components/StatsTable';
import { QuarterlyStats } from './types';
import { getQuarterlyStats, getLatestUpdateDate } from './services/api';

function App() {
    const [stats, setStats] = useState<QuarterlyStats[]>([]);
    const [latestUpdate, setLatestUpdate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, latestDate] = await Promise.all([
                    getQuarterlyStats(),
                    getLatestUpdateDate()
                ]);
                setStats(statsData);
                setLatestUpdate(latestDate);
            } catch (err) {
                setError('Failed to fetch data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <Typography>Loading...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <Container maxWidth="lg">
            <Paper 
                elevation={1} 
                sx={{ 
                    padding: 3,
                    mt: 3,
                    backgroundColor: 'background.paper' 
                }}
            >
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
                    {latestUpdate && (
                        <Typography variant="body2" color="text.secondary">
                            Last updated: {new Intl.DateTimeFormat('fi-FI', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }).format(new Date(latestUpdate))}
                        </Typography>
                    )}
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

                <StatsTable data={stats} />
            </Paper>
        </Container>
    );
}

export default App;
