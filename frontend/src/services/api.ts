import axios from 'axios';
import { QuarterlyStats } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

interface IEventsResponse {
    event_quarterly_stats: QuarterlyStats[];
}

export const getQuarterlyStats = async (): Promise<QuarterlyStats[]> => {
    try {
        const response = await axios.get<IEventsResponse>(`${API_URL}api/events`);
        return response.data.event_quarterly_stats;
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
};

interface ILatestDateResponse {
    latest_date: string;
}

export const getLatestEventDate = async (): Promise<ILatestDateResponse> => {
    try {
        const response = await axios.get(`${API_URL}api/latest-date`);
        return response.data;
    } catch (error) {
        console.error('Error fetching latest update date:', error);
        throw error;
    }
};