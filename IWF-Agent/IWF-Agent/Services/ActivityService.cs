using System;
using System.Timers;

public class ActivityService
{
    static System.Timers.Timer? timer;

    static string lastWindow = "";

    static DateTime lastActivitySave;

    static bool isIdle = false;
    static bool idleAlertSent = false;

    static DateTime idleStartTime;

    static string idleApp = "";

    // Restricted Website Timer

static bool restrictedRunning = false;

static string restrictedSite = "";

static DateTime restrictedStartTime;

static bool emailSent = false;

    public static void Start()
    {
        Console.WriteLine("Activity Service Started");
lastWindow = WindowService.GetDisplayName();

string matchedWebsite =
    TrackedWebsiteService.GetMatchedWebsite(lastWindow);

if (!string.IsNullOrEmpty(matchedWebsite))
{
    lastWindow = matchedWebsite;
}

        lastActivitySave =
            DateTime.Now;

        Console.WriteLine(
            $"Initial Window: {lastWindow}"
        );


        if(!UserSessionState.IsLocked)
{
    _ = ApiService.UpdateStatus(
        "Online"
    );
}

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
            if (!WorkScheduleHelper.IsMonitoringAllowed(DateTime.Now))
            {
                timer?.Stop();
                Console.WriteLine("Weekend detected. Monitoring stopped.");
                return;
            }

 // =====================
        // WINDOWS LOCK CHECK
        // =====================
        if (UserSessionState.IsLocked)
        {
            Console.WriteLine(
                "PC Locked - Skipping Activity Tracking"
            );

            return;
        }

string appName = WindowService.GetActiveWindow();

string title = WindowService.GetActiveWindowTitle();

string currentWindow = WindowService.GetDisplayName();

string matchedWebsite =
    TrackedWebsiteService.GetMatchedWebsite(currentWindow);

if (!string.IsNullOrEmpty(matchedWebsite))
{
    currentWindow = matchedWebsite;
}

            int idleSeconds = IdleHelper.GetIdleTime();

Console.WriteLine($"Idle Seconds: {idleSeconds}");

bool idle = idleSeconds >= 5;

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

        idleStartTime = DateTime.Now;

        idleApp = lastWindow;

        Console.WriteLine("Idle Started");

        await ApiService.SendActivity(
            lastWindow,
            lastActivitySave,
            DateTime.Now
        );

        await ApiService.UpdateStatus("Idle");
    }

    // Check every 5 seconds while idle
    double idleMinutes =
        (DateTime.Now - idleStartTime).TotalMinutes;

    if (idleMinutes >= 60 && !idleAlertSent)
    {
        idleAlertSent = true;

        Console.WriteLine(
            $"Idle Alert Triggered ({idleMinutes:F1} min)"
        );

        await ApiService.SendIdleAlert(
            UserContext.UserId,
            idleMinutes * 60
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

    idleAlertSent = false;

    Console.WriteLine(
        "Idle Ended"
    );

    await ApiService.SendIdle(
        idleApp,
        idleStartTime,
        DateTime.Now
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

                await ApiService.SendActivity(
                    lastWindow,
                    lastActivitySave,
                    DateTime.Now
                );

                lastWindow =
                    currentWindow;

                lastActivitySave =
                    DateTime.Now;

                return;
            }

// =====================
// APP / WEBSITE RESTRICTED
// =====================

string matchedApp =
    RestrictedAppService.GetMatchedApp(appName);

string matchedSite =
    RestrictedSiteService.GetMatchedSite(currentWindow);

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
                await ApiService.SendActivity(
                    currentWindow,
                    lastActivitySave,
                    DateTime.Now
                );

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

        if (isIdle)
        {
            await ApiService.SendIdle(
                   idleApp,
                idleStartTime,
                now
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
public static void ResetIdle()
{
    isIdle = false;
    idleAlertSent = false;
    idleApp = "";
    lastActivitySave = DateTime.Now;

    Console.WriteLine("Idle State Reset");
}
}
