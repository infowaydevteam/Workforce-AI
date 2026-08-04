using System;

public static class WorkScheduleHelper
{
    public static bool IsMonitoringAllowed(DateTime localTime)
    {
        return localTime.DayOfWeek is not DayOfWeek.Saturday
            and not DayOfWeek.Sunday;
    }
}
