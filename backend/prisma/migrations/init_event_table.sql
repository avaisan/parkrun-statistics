-- Create the Event table with basic statistics
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