import axios from 'axios';
import { QuarterlyStats } from '../types';

export const getQuarterlyStats = async (): Promise<QuarterlyStats[]> => {
    try {
        const response = await axios.get('/stats');
        return response.data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
};

export const getLatestUpdateDate = async (): Promise<string> => {
    try {
        const response = await axios.get('/stats/latest-date');
        return response.data.eventDate;
    } catch (error) {
        console.error('Error fetching latest update date:', error);
        throw error;
    }
};