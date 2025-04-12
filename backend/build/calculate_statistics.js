"use strict";
function getQuarter(date) {
    return Math.floor(date.getMonth() / 3) + 1;
}
function calculateStatistics(data) {
    const stats = {};
    data.forEach(({ event, date, finishTimeSec }) => {
        const eventDate = new Date(date);
        const year = eventDate.getFullYear();
        const quarter = getQuarter(eventDate);
        const key = `${event}-${year}-${quarter}`;
        if (!stats[key]) {
            stats[key] = {
                total: 0,
                count: 0,
                fastest: Infinity
            };
        }
        stats[key].total += finishTimeSec;
        stats[key].count += 1;
        stats[key].fastest = Math.min(stats[key].fastest, finishTimeSec);
    });
    return Object.entries(stats).map(([key, { total, count, fastest }]) => {
        const [event, year, quarter] = key.split("-");
        return {
            event,
            year: parseInt(year),
            quarter: parseInt(quarter),
            avgFinishTimeMin: (total / count) / 60,
            fastestFinishTimeMin: fastest / 60,
            totalRunners: count
        };
    });
}
