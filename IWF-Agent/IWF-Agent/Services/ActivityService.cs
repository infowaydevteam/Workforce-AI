using System;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;

public class ActivityService
{
    static System.Timers.Timer? timer;

    static string lastWindow = "";

    static string lastWindowTitle = "";

    static DateTime lastActivitySave;

    static bool isIdle = false;

    static DateTime idleStartTime;
    static string idleAppName = "";

    static MonitoringPolicy monitoringPolicy = new();

    static OrganizationPolicy organizationPolicy = new();

    static bool monitoringPaused = false;

    static string lastPauseReason = "";

    // Restricted Website Timer

static bool restrictedRunning = false;

static string restrictedSite = "";

static DateTime restrictedStartTime;

static bool emailSent = false;

    public static void Configure(AgentPolicyConfig? policyConfig)
    {
        if (policyConfig?.MonitoringPolicy != null)
        {
            monitoringPolicy = policyConfig.MonitoringPolicy;
        }

        if (policyConfig?.OrganizationPolicy != null)
        {
            organizationPolicy = policyConfig.OrganizationPolicy;
        }

        ProductivityRuleService.Load(
            policyConfig?.ProductivityRules ?? new()
        );

        if (monitoringPolicy.IdleThresholdSeconds <= 0)
        {
            monitoringPolicy.IdleThresholdSeconds = 300;
        }
    }

  public static async Task Start()
{
    Console.WriteLine("Activity Service Started");

    DateTime now = GetPolicyNow();

    lastWindow = WindowService.GetActiveWindow();
    lastWindowTitle = WindowService.GetActiveWindowTitle();
    lastActivitySave = now;

    // Initial policy check
    if (!IsMonitoringAllowed(now, out string pauseReason))
    {
        monitoringPaused = true;
        lastPauseReason = pauseReason;

        Console.WriteLine(
            $"Monitoring waiting: {pauseReason}"
        );

        await ApiService.UpdateStatus("Offline");
    }
    else
    {
        monitoringPaused = false;
        lastPauseReason = "";

        await StartMonitoringSession(now);
    }

    // IMPORTANT:
    // Timer ALWAYS starts.
    // So if agent starts before 9 PM,
    // it can automatically start at 9 PM.
    timer = new System.Timers.Timer(5000);

    timer.Elapsed += Track;
    timer.AutoReset = true;
    timer.Start();

    Console.WriteLine("Activity timer started.");
}

    private static async void Track(
        object? sender,
        ElapsedEventArgs e
    )
    {
        try
        {
  DateTime now = GetPolicyNow();

        // =========================
        // WINDOWS LOCKED
        // =========================

        if (UserSessionState.IsLocked)
        {
            Console.WriteLine(
                "Windows is locked. Skipping activity tracking."
            );

            return;
        }

        string currentWindow =
            WindowService.GetActiveWindow();

        string title =
            WindowService.GetActiveWindowTitle();


        // =========================
        // POLICY CHECK
        // =========================

        if (!IsMonitoringAllowed(
            now,
            out string pauseReason))
        {
            await PauseMonitoring(
                currentWindow,
                title,
                pauseReason
            );

            return;
        }


        // =========================
        // MONITORING RESUME
        // =========================

        if (monitoringPaused)
        {
            Console.WriteLine(
                $"Monitoring allowed now. Resuming: {now}"
            );

            await StartMonitoringSession(now);

            return;
        }


        // =========================
        // IDLE CHECK
        // =========================

        int idleSeconds =
            IdleHelper.GetIdleTime();

        Console.WriteLine(
            $"Idle Seconds: {idleSeconds}"
        );

        bool idle =
            idleSeconds >=
            monitoringPolicy.IdleThresholdSeconds;

        Console.WriteLine(
            $"Idle: {idle} | Window: {currentWindow}"
        );

            // =====================
            // IDLE START
            // =====================
            if (idle)
            {
                if (!isIdle)
                {
                    isIdle = true;

                    idleStartTime =
                        now;
                         idleAppName = lastWindow;

                    Console.WriteLine(
                        "Idle Started"
                    );

                    if (monitoringPolicy.AppTrackingEnabled)
                    {
                        await ApiService.SendActivity(
                            lastWindow,
                            lastActivitySave,
                            now,
                            ProductivityRuleService.GetCategory(
                                lastWindow,
                                lastWindowTitle
                            )
                        );
                    }

                    await ApiService.UpdateStatus(
                        "Idle"
                    );
                }

                return;
            }

            // =====================
            // IDLE END
            // =====================
            if (isIdle)
            {
                isIdle = false;

                Console.WriteLine(
                    "Idle Ended"
                );

                await ApiService.SendIdle(
                    idleStartTime,
                    now,
                    idleAppName
                );

                lastActivitySave =
                    now;

                await ApiService.UpdateStatus(
                    "Online"
                );
            }

            // =====================
            // APP SWITCH
            // =====================
            if (currentWindow != lastWindow)
            {
                Console.WriteLine(
                    $"Switch: {lastWindow} → {currentWindow}"
                );

                if (monitoringPolicy.AppTrackingEnabled)
                {
                    await ApiService.SendActivity(
                        lastWindow,
                        lastActivitySave,
                        now,
                        ProductivityRuleService.GetCategory(
                            lastWindow,
                            lastWindowTitle
                        )
                    );
                }

                lastWindow =
                    currentWindow;

                lastWindowTitle =
                    title;

                lastActivitySave =
                    now;

                return;
            }

// =====================
// APP / WEBSITE RESTRICTED
// =====================

string matchedApp =
    monitoringPolicy.AppTrackingEnabled
        ? RestrictedAppService.GetMatchedApp(currentWindow)
        : "";

string matchedSite =
    monitoringPolicy.UrlTrackingEnabled
        ? RestrictedSiteService.GetMatchedSite(title)
        : "";

string restrictedName = "";

if (!string.IsNullOrEmpty(matchedApp))
{
    restrictedName = matchedApp;
    Console.WriteLine($"Restricted App: {restrictedName}");
}
else if (!string.IsNullOrEmpty(matchedSite))
{
    restrictedName = matchedSite;
    Console.WriteLine($"Restricted Website: {restrictedName}");
}

if (!string.IsNullOrEmpty(restrictedName))
{
    if (!restrictedRunning)
    {
        restrictedRunning = true;
        restrictedSite = restrictedName;
        restrictedStartTime = now;
        emailSent = false;

        Console.WriteLine($"Started Timer for {restrictedName}");
    }
    else if (restrictedSite == restrictedName)
    {
        double minutes =
            (now - restrictedStartTime).TotalMinutes;

        Console.WriteLine(
            $"{restrictedName} Running: {minutes:F1} min"
        );

       if (minutes >= 0.2)
{
    Console.WriteLine(
        $"ALERT CHECK => Site: {restrictedName}, Minutes: {minutes:F2}, EmailSent: {emailSent}"
    );

    if (!emailSent)
    {
        Console.WriteLine(
            $"Sending Restricted Alert: {restrictedName}"
        );

        try
        {
            Console.WriteLine(
                $"BEFORE EMAIL API => UserId: {UserContext.UserId}, Site: {restrictedName}, Minutes: {minutes:F2}"
            );

            await ApiService.SendRestrictedAlert(
                UserContext.UserId,
                restrictedName,
                minutes
            );

            emailSent = true;

            Console.WriteLine(
                $"AFTER EMAIL API => emailSent: {emailSent}"
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"Restricted alert failed: {ex}"
            );
        }
    }
}
    }
}
else
{
    if (restrictedRunning)
    {
        Console.WriteLine(
            $"Stopped Timer for {restrictedSite}"
        );
    }

    restrictedRunning = false;
    restrictedSite = "";
    emailSent = false;
}


            // =====================
            // CONTINUOUS ACTIVE
            // =====================
            double activeSeconds =
                (
                    now -
                    lastActivitySave
                ).TotalSeconds;

            if (activeSeconds >= 30)
            {
                if (monitoringPolicy.AppTrackingEnabled)
                {
                    await ApiService.SendActivity(
                        currentWindow,
                        lastActivitySave,
                        now,
                        ProductivityRuleService.GetCategory(
                            currentWindow,
                            title
                        )
                    );
                }

                Console.WriteLine(
                    $"Active Chunk Saved: {currentWindow}"
                );

                lastActivitySave =
                    now;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR: {ex.Message}"
            );
        }
    }

public static async Task Stop()
{
    try
    {
        timer?.Stop();

        DateTime now = GetPolicyNow();

        if (monitoringPaused)
        {
            Console.WriteLine(
                "Agent stopped while monitoring was paused."
            );
        }
        else if (UserSessionState.IsLocked)
        {
            Console.WriteLine(
                "Agent stopped while Windows was locked."
            );
        }
        else if (isIdle)
        {
            await ApiService.SendIdle(
                idleStartTime,
                now,
                idleAppName
            );
        }
        else
        {
            if (
                monitoringPolicy.AppTrackingEnabled &&
                (now - lastActivitySave).TotalSeconds > 1
            )
            {
                await ApiService.SendActivity(
                    lastWindow,
                    lastActivitySave,
                    now,
                    ProductivityRuleService.GetCategory(
                        lastWindow,
                        lastWindowTitle
                    )
                );
            }
        }

        await ApiService.UpdateStatus("Offline");

        await ApiService.EndSession(DateTime.Now);

        Console.WriteLine("Agent Stopped");
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Stop Error: {ex.Message}"
        );
    }
}

private static bool IsMonitoringAllowed(
    DateTime now,
    out string reason
)
{
    reason = "";

    // =========================
    // SHIFT TIME
    // =========================

    if (!TimeSpan.TryParse(
        organizationPolicy.WorkingStart,
        out TimeSpan start))
    {
        start = new TimeSpan(9, 0, 0);
    }

    if (!TimeSpan.TryParse(
        organizationPolicy.WorkingEnd,
        out TimeSpan end))
    {
        end = new TimeSpan(17, 0, 0);
    }


    TimeSpan currentTime = now.TimeOfDay;

    bool overnight = start > end;

    bool isWithinHours;

    if (!overnight)
    {
        isWithinHours =
            currentTime >= start &&
            currentTime <= end;
    }
    else
    {
        isWithinHours =
            currentTime >= start ||
            currentTime <= end;
    }


    // =========================
    // OUTSIDE SHIFT
    // =========================

    if (!isWithinHours)
    {
        reason =
            $"outside configured working hours " +
            $"({organizationPolicy.WorkingStart}-" +
            $"{organizationPolicy.WorkingEnd})";

        return false;
    }


    // =========================
    // DETERMINE SHIFT DATE
    // =========================

    DateTime shiftDate = now.Date;

    // Example:
    // Thursday 21:00 -> Thursday shift
    // Friday 02:00   -> Thursday shift

    if (overnight && currentTime <= end)
    {
        shiftDate = shiftDate.AddDays(-1);
    }


    // =========================
    // WORKING DAY
    // =========================

    string shiftDay =
        shiftDate.DayOfWeek.ToString();

    bool isWorkingDay =
        organizationPolicy.WorkingDays.Any(
            day => string.Equals(
                day,
                shiftDay,
                StringComparison.OrdinalIgnoreCase
            )
        );

    if (!isWorkingDay)
    {
        reason =
            $"outside configured working days ({shiftDay})";

        return false;
    }


    // =========================
    // HOLIDAY
    // =========================

    string shiftDateString =
        shiftDate.ToString("yyyy-MM-dd");

    bool isHoliday =
        organizationPolicy.Holidays.Any(
            holiday => string.Equals(
                NormalizeDate(holiday),
                shiftDateString,
                StringComparison.OrdinalIgnoreCase
            )
        );

    if (isHoliday)
    {
        reason =
            $"company holiday ({shiftDateString})";

        return false;
    }


    return true;
}

private static DateTime GetPolicyNow()
{
    try
    {
        TimeZoneInfo timeZone = TimeZoneInfo.FindSystemTimeZoneById(
            organizationPolicy.Timezone
        );

        return TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow,
            timeZone
        ).DateTime;
    }
    catch
    {
        return DateTime.Now;
    }
}

private static DateTime GetUtcNow()
{
    return DateTime.UtcNow;
}

private static string NormalizeDate(string value)
{
    if (DateTime.TryParse(value, out DateTime date))
    {
        return date.ToString("yyyy-MM-dd");
    }

    return value.Length >= 10 ? value[..10] : value;
}

private static async Task PauseMonitoring(
    string currentWindow,
    string title,
    string reason
)
{
    if (monitoringPaused)
    {
        return;
    }

    DateTime now = GetPolicyNow();

    Console.WriteLine(
        $"Pausing monitoring: {reason}"
    );


    if (isIdle)
    {
        await ApiService.SendIdle(
            idleStartTime,
            now,
            idleAppName
        );

        isIdle = false;
    }
    else if (
        monitoringPolicy.AppTrackingEnabled &&
        (now - lastActivitySave).TotalSeconds > 1)
    {
        await ApiService.SendActivity(
            lastWindow,
            lastActivitySave,
            now,
            ProductivityRuleService.GetCategory(
                lastWindow,
                lastWindowTitle
            )
        );
    }


    restrictedRunning = false;
    restrictedSite = "";
    emailSent = false;


    monitoringPaused = true;
    lastPauseReason = reason;


    lastWindow = currentWindow;
    lastWindowTitle = title;
    lastActivitySave = now;


    // End session
    await ApiService.EndSession(DateTime.Now);

    // User offline
    await ApiService.UpdateStatus("Offline");


    Console.WriteLine(
        $"Monitoring stopped by policy: {lastPauseReason}"
    );
}



public static async Task HandleLocked()
{
    try
    {
        Console.WriteLine(
            "ActivityService: Handling Windows Lock."
        );

        timer?.Stop();

        isIdle = false;
        idleAppName = "";

        restrictedRunning = false;
        restrictedSite = "";
        emailSent = false;

        // End currently running session
        await ApiService.EndSession(DateTime.Now);

        // User must immediately become Offline
        await ApiService.UpdateStatus("Offline");

        Console.WriteLine(
            "ActivityService: Session ended because Windows was locked."
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"HandleLocked Error: {ex.Message}"
        );
    }
}

public static async Task HandleUnlocked()
{
    try
    {
        Console.WriteLine(
            "ActivityService: Handling Windows Unlock."
        );

        DateTime now = GetPolicyNow();

        isIdle = false;
        idleAppName = "";

        restrictedRunning = false;
        restrictedSite = "";
        emailSent = false;

        lastWindow =
            WindowService.GetActiveWindow();

        lastWindowTitle =
            WindowService.GetActiveWindowTitle();

        lastActivitySave = now;


        // Check shift policy again
        if (!IsMonitoringAllowed(
            now,
            out string reason))
        {
            monitoringPaused = true;
            lastPauseReason = reason;

            await ApiService.UpdateStatus("Offline");

            Console.WriteLine(
                $"Unlock occurred outside working hours: {reason}"
            );

            // Timer start nahi karna because
            // policy already says outside hours.
            return;
        }


        monitoringPaused = false;
        lastPauseReason = "";

        await StartMonitoringSession(now);

        timer?.Start();

        Console.WriteLine(
            "ActivityService: Monitoring resumed after unlock."
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"HandleUnlocked Error: {ex.Message}"
        );
    }
}


private static async Task StartMonitoringSession(DateTime now)
{
    if (UserSessionState.IsLocked)
    {
        Console.WriteLine(
            "Cannot start monitoring session because Windows is locked."
        );

        return;
    }

    if (!IsMonitoringAllowed(now, out string reason))
    {
        monitoringPaused = true;
        lastPauseReason = reason;

        await ApiService.UpdateStatus("Offline");

        return;
    }

    monitoringPaused = false;
    lastPauseReason = "";

    lastWindow = WindowService.GetActiveWindow();
    lastWindowTitle = WindowService.GetActiveWindowTitle();
    lastActivitySave = now;


    await ApiService.StartSession(now);

    await ApiService.UpdateStatus("Online");

    Console.WriteLine(
        $"Monitoring session started at {now}"
    );
}

}
