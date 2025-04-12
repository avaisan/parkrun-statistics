CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCountry" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "finishTimes" INTEGER[] NOT NULL,
    "avgFinishTimeInMin" DOUBLE PRECISION NOT NULL,
    "fastestFinishTimeInMin" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Event_eventName_eventId_key" UNIQUE ("eventName", "eventId")
);

CREATE OR REPLACE VIEW event_quarterly_stats AS
WITH event_times AS (
  SELECT 
    "eventName",
    "eventCountry",
    EXTRACT(YEAR FROM "eventDate")::integer as year,
    EXTRACT(QUARTER FROM "eventDate")::integer as quarter,
    unnest("finishTimes") as finish_time,
    ARRAY_LENGTH("finishTimes", 1) as runners,
    "avgFinishTimeInMin",
    "fastestFinishTimeInMin"
  FROM "Event"
),
event_quartiles AS (
  SELECT
    "eventName",
    "eventCountry",
    year,
    quarter,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY finish_time) / 60.0 as fastest_quartile,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY finish_time) / 60.0 as slowest_quartile,
    AVG(runners) as avg_runners,
    AVG("avgFinishTimeInMin") as avg_time,
    MIN("fastestFinishTimeInMin") as fastest_time
  FROM event_times
  GROUP BY "eventName", "eventCountry", year, quarter
)
SELECT 
  "eventName",
  "eventCountry",
  year,
  quarter,
  fastest_time,
  fastest_quartile,
  avg_time as avg_finish_time,
  slowest_quartile,
  avg_runners as avg_participants
FROM event_quartiles
ORDER BY "eventName", year, quarter;