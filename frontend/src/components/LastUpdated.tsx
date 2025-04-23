import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { getLatestEventDate } from '../services/api';

export const LastUpdated = () => {
    const [latestDate, setLatestDate] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestDate = async () => {
            try {
                const date = await getLatestEventDate();
                // Debug log to see what we're getting
                console.log('Received date:', date);
                if (date) {
                    setLatestDate(date);
                }
            } catch (err) {
                setError('Failed to fetch latest update date');
                console.error('Error fetching date:', err);
            }
        };

        fetchLatestDate();
    }, []);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Date not available';
        
        try {
            const date = new Date(dateString);

            // Format the date
            return new Intl.DateTimeFormat('fi-FI', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(date);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Date not available';
        }
    };

    if (error) {
        return (
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                <Typography variant="body2" color="error">
                    {error}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Typography variant="body2" color="text.secondary">
                Last updated: {formatDate(latestDate)}
            </Typography>
        </Box>
    );
};
