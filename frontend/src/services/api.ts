import axios from 'axios';
import { QuarterlyStats } from '../types';

const API_URL = 'http://localhost:3001/api';

export const getQuarterlyStats = async (): Promise<QuarterlyStats[]> => {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
};