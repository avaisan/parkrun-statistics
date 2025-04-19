import axios from 'axios';
import { QuarterlyStats } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getQuarterlyStats = async (): Promise<QuarterlyStats[]> => {
    try {
        const response = await axios.get(`${API_URL}/stats`);
        return response.data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
};

export const getLatestEventDate = async (): Promise<string> => {
    try {
        const response = await axios.get(`${API_URL}/latest-date`);
        console.log('API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching latest update date:', error);
        throw error;
    }
};