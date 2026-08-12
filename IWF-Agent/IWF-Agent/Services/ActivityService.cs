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

    public static void Start()
    {
        Console.WriteLine("Activity Service Started");

        lastWindow =
            WindowService.GetActiveWindow();

        lastWindowTitle =
            WindowService.GetActiveWindowTitle();

        lastActivitySave =
            DateTime.Now;

        Console.WriteLine(
            $"Initial Window: {lastWindow}"
        );

        _ = ApiService.UpdateStatus(
            "Online"
        );

        timer = new System.Timers.Timer(
            5000
        );

        timer.Elapsed += Track;

        timer.AutoReset = true;

        timer.Start();
    }

    private static async void Track(
        object? sender,
        ElapsedEventArgs e
    )
    {
        try
        {

            string currentWindow =
                WindowService.GetActiveWindow();

                string title =
    WindowService.GetActiveWindowTitle();

    if (UserSessionState.IsLocked)
{
    Console.WriteLine("Windows is locked. Skipping activity tracking.");
    return;
}

            if (!IsMonitoringAllowed(GetPolicyNow(), out string pauseReason))
            {
                await PauseMonitoring(currentWindow, title, pauseReason);
                return;
            }

            if (monitoringPaused)
            {
                monitoringPaused = false;
                lastPauseReason = "";
                lastWindow = currentWindow;
                lastWindowTitle = title;
                lastActivitySave = DateTime.Now;

                await ApiService.UpdateStatus("Online");

                Console.WriteLine("Monitoring resumed.");
            }

            int idleSeconds = IdleHelper.GetIdleTime();

Console.WriteLine($"Idle Seconds: {idleSeconds}");

bool idle = idleSeconds >= monitoringPolicy.IdleThresholdSeconds;

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
                        DateTime.Now;
                         idleAppName = lastWindow;

                    Console.WriteLine(
                        "Idle Started"
                    );

                    if (monitoringPolicy.AppTrackingEnabled)
                    {
                        await ApiService.SendActivity(
                            lastWindow,
                            lastActivitySave,
                            DateTime.Now,
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
                    DateTime.Now,
                    idleAppName
                );

                lastActivitySave =
                    DateTime.Now;

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
                        DateTime.Now,
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
                    DateTime.Now;

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
        restrictedStartTime = DateTime.Now;
        emailSent = false;

        Console.WriteLine($"Started Timer for {restrictedName}");
    }
    else if (restrictedSite == restrictedName)
    {
        double minutes =
            (DateTime.Now - restrictedStartTime).TotalMinutes;

        Console.WriteLine(
            $"{restrictedName} Running: {minutes:F1} min"
        );

        if (minutes >= 0.2 && !emailSent)
        {
            emailSent = true;

            Console.WriteLine(
                $"Sending Restricted Alert: {restrictedName}"
            );

            await ApiService.SendRestrictedAlert(
                UserContext.UserId,
                restrictedName,
                minutes
            );
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
                    DateTime.Now -
                    lastActivitySave
                ).TotalSeconds;

            if (activeSeconds >= 30)
            {
                if (monitoringPolicy.AppTrackingEnabled)
                {
                    await ApiService.SendActivity(
                        currentWindow,
                        lastActivitySave,
                        DateTime.Now,
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
                    DateTime.Now;
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

        DateTime now = DateTime.Now;

        if (monitoringPaused)
        {
            Console.WriteLine("Agent stopped while monitoring was paused.");
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
            if ((now - lastActivitySave).TotalSeconds > 1)
            {
                await ApiService.SendActivity(
                    lastWindow,
                    lastActivitySave,
                    now
                );
            }
        }

        await ApiService.UpdateStatus("Offline");

        await ApiService.EndSession();

        Console.WriteLine("Agent Stopped");
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"Stop Error: {ex.Message}"
        );
    }
}

private static bool IsMonitoringAllowed(DateTime now, out string reason)
{
    reason = "";

    string today = now.DayOfWeek.ToString();

    bool isWorkingDay = organizationPolicy.WorkingDays.Any(
        day => string.Equals(day, today, StringComparison.OrdinalIgnoreCase)
    );

    if (!isWorkingDay)
    {
        reason = $"outside configured working days ({today})";
        return false;
    }

    string todayDate = now.ToString("yyyy-MM-dd");

    bool isHoliday = organizationPolicy.Holidays.Any(
        holiday => string.Equals(
            NormalizeDate(holiday),
            todayDate,
            StringComparison.OrdinalIgnoreCase
        )
    );

    if (isHoliday)
    {
        reason = $"company holiday ({todayDate})";
        return false;
    }

    TimeSpan currentTime = now.TimeOfDay;

    if (!TimeSpan.TryParse(organizationPolicy.WorkingStart, out TimeSpan start))
    {
        start = new TimeSpan(9, 0, 0);
    }

    if (!TimeSpan.TryParse(organizationPolicy.WorkingEnd, out TimeSpan end))
    {
        end = new TimeSpan(17, 0, 0);
    }

    bool isWithinHours =
        start <= end
            ? currentTime >= start && currentTime <= end
            : currentTime >= start || currentTime <= end;

    if (!isWithinHours)
    {
        reason =
            $"outside configured working hours ({organizationPolicy.WorkingStart}-{organizationPolicy.WorkingEnd})";
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

    DateTime now = DateTime.Now;

    if (isIdle)
    {
        await ApiService.SendIdle(
            idleStartTime,
            now,
            idleAppName
        );

        isIdle = false;
    }
    else if (monitoringPolicy.AppTrackingEnabled &&
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

    await ApiService.UpdateStatus("Offline");

    Console.WriteLine($"Monitoring stopped by policy: {lastPauseReason}");
}



public static void OnLocked()
{
    isIdle = false;
idleAppName = "";
    restrictedRunning = false;
    restrictedSite = "";
    emailSent = false;

    Console.WriteLine("ActivityService: Lock state reset.");
}

public static void OnUnlocked()
{
    lastWindow = WindowService.GetActiveWindow();
    lastWindowTitle = WindowService.GetActiveWindowTitle();
    lastActivitySave = DateTime.Now;

    isIdle = false;
idleAppName = "";
    restrictedRunning = false;
    restrictedSite = "";
    emailSent = false;

    Console.WriteLine("ActivityService: Unlock state reset.");
}

}
