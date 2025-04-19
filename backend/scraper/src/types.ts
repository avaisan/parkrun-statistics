export interface IEventStatistics {
    EventID: string;
    EventName: string;
    EventCountry: string;
    Year: number;
    Quarter: number;
    AvgFinishTimeInMin: number;
    FastestFinishTimeInMin: number;
    AmountOfRunners: number;
}