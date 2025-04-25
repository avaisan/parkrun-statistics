import { Typography, Box } from '@mui/material';
import { parkrunStats } from '../data/parkrun-data';

export const LastUpdated = () => {
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
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

    return (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Typography variant="body2" color="text.secondary">
                Last updated: {formatDate(parkrunStats.latest_date)}
            </Typography>
        </Box>
    );
};
