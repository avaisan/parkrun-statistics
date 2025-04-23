export interface QuarterlyStats {
    eventName: string;
    eventCountry: string;
    year: number;
    quarter: number;
    fastest_time: number;
    fastest_quartile: number;
    avg_finish_time: number;
    slowest_quartile: number;
    avg_participants: number;
}

export type CountryCode = 'FI' | 'SE' | 'NO' | 'DK' | 'ALL';