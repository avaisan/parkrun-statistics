import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { getLatestEventDate } from '../services/api';

export const LastUpdated = () => {
    const [latestDate, setLatestDate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestDate = async () => {
            try {
                const date = await getLatestEventDate();
                setLatestDate(date);
            } catch (err) {
                setError('Failed to fetch latest update date');
                console.error(err);
            }
        };

        fetchLatestDate();
    }, []);

    if (error) return null;

    return (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Typography variant="body2" color="text.secondary">
                Last updated: {latestDate ? new Intl.DateTimeFormat('fi-FI', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }).format(latestDate) : 'Loading...'}
            </Typography>
        </Box>
    );
}; 