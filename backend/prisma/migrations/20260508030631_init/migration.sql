/*
  Warnings:

  - A unique constraint covering the columns `[doctorId,weekDay,startTime,weekStartDate]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "schedules_doctorId_weekDay_weekStartDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "schedules_doctorId_weekDay_startTime_weekStartDate_key" ON "schedules"("doctorId", "weekDay", "startTime", "weekStartDate");
