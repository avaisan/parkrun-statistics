-- Create view for quarterly statistics
CREATE OR REPLACE VIEW event_quarterly_stats AS
WITH event_stats AS (
  SELECT 
    "eventName",
    "eventCountry",
    EXTRACT(YEAR FROM "eventDate")::integer as year,
    EXTRACT(QUARTER FROM "eventDate")::integer as quarter,
    ARRAY_LENGTH("finishTimes", 1) as runners,
    "avgFinishTimeInMin",
    "fastestFinishTimeInMin",
    percentile_cont(0.25) WITHIN GROUP (ORDER BY unnest("finishTimes")) / 60.0 as fastest_quartile,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY unnest("finishTimes")) / 60.0 as slowest_quartile
  FROM "Event"
  GROUP BY "eventName", "eventCountry", year, quarter, "avgFinishTimeInMin", "fastestFinishTimeInMin", "finishTimes"
)
SELECT 
  "eventName",
  "eventCountry",
  year,
  quarter,
  MIN("fastestFinishTimeInMin") as fastest_time,
  AVG(fastest_quartile) as fastest_quartile,
  AVG("avgFinishTimeInMin") as avg_finish_time,
  AVG(slowest_quartile) as slowest_quartile,
  AVG(runners)::float as avg_participants
FROM event_stats
GROUP BY "eventName", "eventCountry", year, quarter
ORDER BY "eventName", year, quarter;