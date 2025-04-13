export interface IEventHistory {
    eventId: number;
    date: string;
}

export interface IEvent {
    id: number;
    eventId: number;
    eventName: string;
    eventCountry: string;
    eventDate: Date;
    finishTimes: number[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IEventResult {
    eventCountry: string
    eventName: string;
    eventId: number;
    eventDate: string;
    finishTimes: number[];
}

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