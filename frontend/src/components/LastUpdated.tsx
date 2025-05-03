import { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { getLatestEventDate } from '../services/api';

export const LastUpdated = () => {
  const [latestDate, setLatestDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestDate = async () => {
        try {
            const response = await getLatestEventDate();
            console.log('Received response:', response);
            if (response?.latest_date) {
                setLatestDate(response.latest_date);
            }
        } catch (err) {
            setError('Failed to fetch latest update date');
            console.error('Error fetching date:', err);
        }
    }
    fetchLatestDate();
  }, []);

  if (error) {
    throw new Error(error);
  }

  if (!latestDate) {
    return null;
  }

  return (
    <Typography 
      variant="body2" 
      color="text.secondary"
      sx={{ 
        position: 'absolute',
        top: 8,
        right: 16
      }}
    >
      Last updated: {latestDate}
    </Typography>
  );
};
